const { MissionCategory, sequelize } = require("../models");
const { Op } = require("sequelize");
const { convertToRelativePath } = require("../utils/filePath");
const {
  logCreate,
  logUpdate,
  logDelete,
} = require("../utils/auditLogger");

// Create mission category
const createMissionCategory = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      impact,
    } = req.body;

    // Validate required fields
    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: "Please provide title and description",
      });
    }

    // Handle image uploads (multiple images)
    let imagesArray = [];
    if (req.files && req.files.length > 0) {
      imagesArray = req.files.map((file) => ({
        path: convertToRelativePath(file.path),
        timestamp: new Date(),
      }));
    } else if (req.file) {
      // Support single file upload for backward compatibility
      imagesArray = [{
        path: convertToRelativePath(req.file.path),
        timestamp: new Date(),
      }];
    }

    // Handle impacts - convert to array if needed (backward compatibility)
    let impactsArray = [];
    if (impact) {
      if (Array.isArray(impact)) {
        impactsArray = impact.filter(imp => imp && imp.trim()); // Filter out empty strings
      } else if (typeof impact === 'string') {
        // Try to parse as JSON first (for FormData JSON strings)
        try {
          const parsed = JSON.parse(impact);
          if (Array.isArray(parsed)) {
            impactsArray = parsed.filter(imp => imp && imp.trim());
          } else {
            impactsArray = [impact]; // Fallback to single string
          }
        } catch (e) {
          // Not JSON, treat as single string (backward compatibility)
          impactsArray = [impact];
        }
      }
    }

    // Create mission category
    const missionCategory = await MissionCategory.create({
      title,
      description,
      category: category || "educational_support",
      images: imagesArray,
      impact: impactsArray,
    });

    // Log audit trail
    if (req.user) {
      await logCreate(
        req.user.id,
        "mission_category",
        missionCategory.id,
        {
          title: missionCategory.title,
        },
        req
      );
    }

    res.status(201).json({
      success: true,
      message: "Mission category created successfully",
      data: missionCategory,
    });
  } catch (error) {
    console.error("Error creating mission category:", error);
    res.status(500).json({
      success: false,
      message: "Error creating mission category",
      error: error.message,
    });
  }
};

// Get all mission categories
const getAllMissionCategories = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      sortBy = "createdAt",
      sortOrder = "DESC",
    } = req.query;

    // Build where clause
    const where = {};
    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
      ];
    }

    // Calculate offset
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Get total count and paginated results
    const { count, rows } = await MissionCategory.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sortBy, sortOrder]],
    });

    res.status(200).json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching mission categories:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching mission categories",
      error: error.message,
    });
  }
};

// Get public mission categories (for public portal)
const getPublicMissionCategories = async (req, res) => {
  try {
    const missionCategories = await MissionCategory.findAll({
      order: [["createdAt", "DESC"]],
      attributes: [
        "id",
        "title",
        "description",
        "category",
        "images",
        "impact",
      ],
    });

    res.status(200).json({
      success: true,
      count: missionCategories.length,
      data: missionCategories,
    });
  } catch (error) {
    console.error("Error fetching public mission categories:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching mission categories",
      error: error.message,
    });
  }
};

// Get public mission category by ID
const getPublicMissionCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const missionCategory = await MissionCategory.findByPk(id);

    if (!missionCategory) {
      return res.status(404).json({
        success: false,
        message: "Mission category not found",
      });
    }

    res.status(200).json({
      success: true,
      data: missionCategory,
    });
  } catch (error) {
    console.error("Error fetching mission category:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching mission category",
      error: error.message,
    });
  }
};

// Get mission category by ID
const getMissionCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const missionCategory = await MissionCategory.findByPk(id);

    if (!missionCategory) {
      return res.status(404).json({
        success: false,
        message: "Mission category not found",
      });
    }

    res.status(200).json({
      success: true,
      data: missionCategory,
    });
  } catch (error) {
    console.error("Error fetching mission category:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching mission category",
      error: error.message,
    });
  }
};

// Update mission category
const updateMissionCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      category,
      impact,
    } = req.body;

    const missionCategory = await MissionCategory.findByPk(id);

    if (!missionCategory) {
      return res.status(404).json({
        success: false,
        message: "Mission category not found",
      });
    }

    // Store old values for audit logging
    const oldValues = {
      title: missionCategory.title,
      description: missionCategory.description,
    };

    // Handle image uploads (multiple images)
    let imagesArray = Array.isArray(missionCategory.images) 
      ? [...missionCategory.images] 
      : [];
    
    // Handle existing images (keep them if provided)
    if (req.body.existing_images) {
      const existingImages = Array.isArray(req.body.existing_images)
        ? req.body.existing_images
        : [req.body.existing_images];
      imagesArray = existingImages.map((path) => {
        // Find existing image object or create new one
        const existing = imagesArray.find((img) => 
          typeof img === 'object' ? img.path === path : img === path
        );
        return existing || { path, timestamp: new Date() };
      });
    }

    // Add new uploaded images
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map((file) => ({
        path: convertToRelativePath(file.path),
        timestamp: new Date(),
      }));
      imagesArray = [...imagesArray, ...newImages];
    } else if (req.file) {
      // Support single file upload for backward compatibility
      const newImage = {
        path: convertToRelativePath(req.file.path),
        timestamp: new Date(),
      };
      imagesArray = [...imagesArray, newImage];
    }

    // Handle impacts - convert to array if needed (backward compatibility)
    let impactsArray = undefined;
    if (impact !== undefined) {
      if (Array.isArray(impact)) {
        impactsArray = impact.filter(imp => imp && imp.trim()); // Filter out empty strings
      } else if (typeof impact === 'string') {
        // Try to parse as JSON first (for FormData JSON strings)
        try {
          const parsed = JSON.parse(impact);
          if (Array.isArray(parsed)) {
            impactsArray = parsed.filter(imp => imp && imp.trim());
          } else {
            impactsArray = [impact]; // Fallback to single string
          }
        } catch (e) {
          // Not JSON, treat as single string (backward compatibility)
          impactsArray = [impact];
        }
      } else {
        impactsArray = [];
      }
    }

    // Update fields
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (impactsArray !== undefined) updateData.impact = impactsArray;
    if (imagesArray.length > 0 || req.body.existing_images !== undefined) {
      updateData.images = imagesArray;
    }

    await missionCategory.update(updateData);

    // Reload to get updated values
    await missionCategory.reload();

    // Log audit trail
    if (req.user) {
      await logUpdate(
        req.user.id,
        "mission_category",
        id,
        oldValues,
        {
          title: missionCategory.title,
          description: missionCategory.description,
        },
        req
      );
    }

    res.status(200).json({
      success: true,
      message: "Mission category updated successfully",
      data: missionCategory,
    });
  } catch (error) {
    console.error("Error updating mission category:", error);
    res.status(500).json({
      success: false,
      message: "Error updating mission category",
      error: error.message,
    });
  }
};

// Delete mission category
const deleteMissionCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const missionCategory = await MissionCategory.findByPk(id);

    if (!missionCategory) {
      return res.status(404).json({
        success: false,
        message: "Mission category not found",
      });
    }

    // Delete images if exist
    if (missionCategory.images && Array.isArray(missionCategory.images)) {
      const fs = require("fs");
      const path = require("path");
      missionCategory.images.forEach((imageObj) => {
        const imagePath = typeof imageObj === 'object' 
          ? imageObj.path 
          : imageObj;
        const fullPath = path.join(__dirname, "..", "..", imagePath);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      });
    }

    // Log audit trail before deletion
    if (req.user) {
      await logDelete(
        req.user.id,
        "mission_category",
        id,
        {
          title: missionCategory.title,
        },
        req
      );
    }

    await missionCategory.destroy();

    res.status(200).json({
      success: true,
      message: "Mission category deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting mission category:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting mission category",
      error: error.message,
    });
  }
};

module.exports = {
  createMissionCategory,
  getAllMissionCategories,
  getPublicMissionCategories,
  getPublicMissionCategoryById,
  getMissionCategoryById,
  updateMissionCategory,
  deleteMissionCategory,
};

