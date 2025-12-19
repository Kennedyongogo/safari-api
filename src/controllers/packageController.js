const { Package, RouteStage } = require("../models");
const { Op } = require("sequelize");
const { convertToRelativePath } = require("../utils/filePath");
const {
  logCreate,
  logUpdate,
  logDelete,
} = require("../utils/auditLogger");

// Normalize helper to ensure JSON arrays are properly formatted
const normalizePackage = (pkg) => {
  if (!pkg) return pkg;
  const plain = pkg.toJSON ? pkg.toJSON() : pkg;
  return {
    ...plain,
    highlights: Array.isArray(plain.highlights) ? plain.highlights : [],
    included: Array.isArray(plain.included) ? plain.included : [],
  };
};

// Validate package data
const validatePackageData = (data) => {
  const errors = [];

  if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
    errors.push("Title is required and must be a non-empty string");
  }

  if (!data.description || typeof data.description !== 'string' || data.description.trim().length === 0) {
    errors.push("Description is required and must be a non-empty string");
  }

  if (!data.duration || typeof data.duration !== 'string' || data.duration.trim().length === 0) {
    errors.push("Duration is required and must be a non-empty string");
  }

  if (!data.price || typeof data.price !== 'string' || data.price.trim().length === 0) {
    errors.push("Price is required and must be a non-empty string");
  }

  if (!data.groupSize || typeof data.groupSize !== 'string' || data.groupSize.trim().length === 0) {
    errors.push("Group size is required and must be a non-empty string");
  }

  const validTypes = ["All-inclusive", "Full board", "Half board", "Bed & breakfast"];
  if (!data.type || !validTypes.includes(data.type)) {
    errors.push(`Type must be one of: ${validTypes.join(", ")}`);
  }

  if (data.rating !== undefined && (typeof data.rating !== 'number' || data.rating < 0 || data.rating > 5)) {
    errors.push("Rating must be a number between 0 and 5");
  }

  return errors;
};

// Handle highlights array
const processHighlights = (highlights) => {
  if (!highlights) return [];

  if (Array.isArray(highlights)) {
    return highlights.filter(h => h && typeof h === 'string' && h.trim()).map(h => h.trim());
  }

  if (typeof highlights === 'string') {
    try {
      const parsed = JSON.parse(highlights);
      if (Array.isArray(parsed)) {
        return parsed.filter(h => h && typeof h === 'string' && h.trim()).map(h => h.trim());
      }
    } catch (e) {
      // Not JSON, treat as single string
      return highlights.trim() ? [highlights.trim()] : [];
    }
  }

  return [];
};

// Handle included array
const processIncluded = (included) => {
  if (!included) return [];

  if (Array.isArray(included)) {
    return included.filter(i => i && typeof i === 'string' && i.trim()).map(i => i.trim());
  }

  if (typeof included === 'string') {
    try {
      const parsed = JSON.parse(included);
      if (Array.isArray(parsed)) {
        return parsed.filter(i => i && typeof i === 'string' && i.trim()).map(i => i.trim());
      }
    } catch (e) {
      // Not JSON, treat as single string
      return included.trim() ? [included.trim()] : [];
    }
  }

  return [];
};

// ==================== PUBLIC ENDPOINTS ====================

// Get all public packages (for frontend)
const getPublicPackages = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      type,
      minRating,
      maxPrice,
      search,
      sortBy = "rating",
      sortOrder = "DESC",
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    // Build where clause
    const where = { isActive: true };

    if (type) {
      where.type = type;
    }

    if (minRating) {
      where.rating = { [Op.gte]: parseFloat(minRating) };
    }

    if (maxPrice) {
      // This is a simple string comparison - in production you might want to parse prices
      where.price = { [Op.like]: `%${maxPrice}%` };
    }

    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        { highlights: { [Op.contains]: [search] } },
      ];
    }

    // Get total count and paginated results
    const { count, rows } = await Package.findAndCountAll({
      where,
      limit: limitNum,
      offset,
      order: [[sortBy, sortOrder]],
      attributes: [
        "id",
        "title",
        "description",
        "image",
        "duration",
        "price",
        "pricePerPerson",
        "groupSize",
        "rating",
        "highlights",
        "included",
        "type",
        "createdAt",
        "updatedAt",
      ],
    });

    const normalizedPackages = rows.map(normalizePackage);

    res.status(200).json({
      success: true,
      data: normalizedPackages,
      pagination: {
        total: count,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(count / limitNum),
      },
    });
  } catch (error) {
    console.error("Error fetching public packages:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching packages",
      error: error.message,
    });
  }
};

// Get public package by ID with full route details (for frontend)
const getPublicPackageById = async (req, res) => {
  try {
    const { id } = req.params;

    const packageData = await Package.findOne({
      where: { id, isActive: true },
      include: [
        {
          model: RouteStage,
          as: "routeStages",
          order: [["stage", "ASC"]],
        },
      ],
    });

    if (!packageData) {
      return res.status(404).json({
        success: false,
        message: "Package not found",
      });
    }

    const normalizedPackage = normalizePackage(packageData);

    res.status(200).json({
      success: true,
      data: normalizedPackage,
    });
  } catch (error) {
    console.error("Error fetching public package:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching package",
      error: error.message,
    });
  }
};

// ==================== ADMIN ENDPOINTS ====================

// Get all packages (admin)
const getPackages = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      type,
      isActive,
      search,
      sortBy = "createdAt",
      sortOrder = "DESC",
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    // Build where clause
    const where = {};

    if (type) {
      where.type = type;
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        { highlights: { [Op.contains]: [search] } },
      ];
    }

    // Get total count and paginated results
    const { count, rows } = await Package.findAndCountAll({
      where,
      limit: limitNum,
      offset,
      order: [[sortBy, sortOrder]],
      include: [
        {
          model: RouteStage,
          as: "routeStages",
          attributes: ["id", "stage", "name", "duration"],
          order: [["stage", "ASC"]],
        },
      ],
    });

    const normalizedPackages = rows.map(normalizePackage);

    res.status(200).json({
      success: true,
      data: normalizedPackages,
      pagination: {
        total: count,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(count / limitNum),
      },
    });
  } catch (error) {
    console.error("Error fetching packages:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching packages",
      error: error.message,
    });
  }
};

// Get package by ID (admin)
const getPackageById = async (req, res) => {
  try {
    const { id } = req.params;

    const packageData = await Package.findByPk(id, {
      include: [
        {
          model: RouteStage,
          as: "routeStages",
          order: [["stage", "ASC"]],
        },
      ],
    });

    if (!packageData) {
      return res.status(404).json({
        success: false,
        message: "Package not found",
      });
    }

    const normalizedPackage = normalizePackage(packageData);

    res.status(200).json({
      success: true,
      data: normalizedPackage,
    });
  } catch (error) {
    console.error("Error fetching package:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching package",
      error: error.message,
    });
  }
};

// Create package (admin)
const createPackage = async (req, res) => {
  try {
    const {
      title,
      description,
      image,
      duration,
      price,
      pricePerPerson,
      groupSize,
      rating,
      highlights,
      included,
      type,
      isActive,
    } = req.body;

    // Validate required fields
    const validationErrors = validatePackageData({
      title,
      description,
      duration,
      price,
      groupSize,
      type,
      rating,
    });

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationErrors,
      });
    }

    // Handle image upload
    let imagePath = image;
    if (req.file) {
      imagePath = convertToRelativePath(req.file.path);
    }

    // Process arrays
    const highlightsArray = processHighlights(highlights);
    const includedArray = processIncluded(included);

    // Create package
    const packageData = await Package.create({
      title: title.trim(),
      description: description.trim(),
      image: imagePath,
      duration: duration.trim(),
      price: price.trim(),
      pricePerPerson: pricePerPerson || "per person",
      groupSize: groupSize.trim(),
      rating: rating || 0,
      highlights: highlightsArray,
      included: includedArray,
      type,
      isActive: isActive !== undefined ? isActive : true,
    });

    const normalizedPackage = normalizePackage(packageData);

    // Log audit trail
    if (req.user) {
      await logCreate(
        req.user.id,
        "package",
        packageData.id,
        {
          title: packageData.title,
          type: packageData.type,
        },
        req
      );
    }

    res.status(201).json({
      success: true,
      message: "Package created successfully",
      data: normalizedPackage,
    });
  } catch (error) {
    console.error("Error creating package:", error);
    res.status(500).json({
      success: false,
      message: "Error creating package",
      error: error.message,
    });
  }
};

// Update package (admin)
const updatePackage = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      image,
      duration,
      price,
      pricePerPerson,
      groupSize,
      rating,
      highlights,
      included,
      type,
      isActive,
    } = req.body;

    const packageData = await Package.findByPk(id);

    if (!packageData) {
      return res.status(404).json({
        success: false,
        message: "Package not found",
      });
    }

    // Store old values for audit logging
    const oldValues = {
      title: packageData.title,
      type: packageData.type,
      isActive: packageData.isActive,
    };

    // Validate fields if provided
    if (title || description || duration || price || groupSize || type || rating !== undefined) {
      const validationErrors = validatePackageData({
        title: title || packageData.title,
        description: description || packageData.description,
        duration: duration || packageData.duration,
        price: price || packageData.price,
        groupSize: groupSize || packageData.groupSize,
        type: type || packageData.type,
        rating: rating !== undefined ? rating : packageData.rating,
      });

      if (validationErrors.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: validationErrors,
        });
      }
    }

    // Handle image upload
    let imagePath = packageData.image;
    if (req.file) {
      imagePath = convertToRelativePath(req.file.path);
    } else if (image !== undefined) {
      imagePath = image;
    }

    // Process arrays
    const highlightsArray = highlights !== undefined ? processHighlights(highlights) : packageData.highlights;
    const includedArray = included !== undefined ? processIncluded(included) : packageData.included;

    // Update fields
    const updateData = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (imagePath !== undefined) updateData.image = imagePath;
    if (duration !== undefined) updateData.duration = duration.trim();
    if (price !== undefined) updateData.price = price.trim();
    if (pricePerPerson !== undefined) updateData.pricePerPerson = pricePerPerson;
    if (groupSize !== undefined) updateData.groupSize = groupSize.trim();
    if (rating !== undefined) updateData.rating = rating;
    if (highlights !== undefined) updateData.highlights = highlightsArray;
    if (included !== undefined) updateData.included = includedArray;
    if (type !== undefined) updateData.type = type;
    if (isActive !== undefined) updateData.isActive = isActive;

    await packageData.update(updateData);

    // Reload to get updated values
    await packageData.reload();

    const normalizedPackage = normalizePackage(packageData);

    // Log audit trail
    if (req.user) {
      await logUpdate(
        req.user.id,
        "package",
        id,
        oldValues,
        {
          title: packageData.title,
          type: packageData.type,
          isActive: packageData.isActive,
        },
        req
      );
    }

    res.status(200).json({
      success: true,
      message: "Package updated successfully",
      data: normalizedPackage,
    });
  } catch (error) {
    console.error("Error updating package:", error);
    res.status(500).json({
      success: false,
      message: "Error updating package",
      error: error.message,
    });
  }
};

// Delete package (admin)
const deletePackage = async (req, res) => {
  try {
    const { id } = req.params;

    const packageData = await Package.findByPk(id, {
      include: [
        {
          model: RouteStage,
          as: "routeStages",
        },
      ],
    });

    if (!packageData) {
      return res.status(404).json({
        success: false,
        message: "Package not found",
      });
    }

    // Log audit trail before deletion
    if (req.user) {
      await logDelete(
        req.user.id,
        "package",
        id,
        {
          title: packageData.title,
          type: packageData.type,
          routeStagesCount: packageData.routeStages?.length || 0,
        },
        req
      );
    }

    // Delete associated route stages (cascade delete should handle this, but being explicit)
    if (packageData.routeStages && packageData.routeStages.length > 0) {
      await RouteStage.destroy({
        where: { packageId: id },
      });
    }

    // Delete package image if exists
    if (packageData.image) {
      const fs = require("fs");
      const path = require("path");
      const fullPath = path.join(__dirname, "..", "..", packageData.image);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }

    await packageData.destroy();

    res.status(200).json({
      success: true,
      message: "Package deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting package:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting package",
      error: error.message,
    });
  }
};

module.exports = {
  // Public endpoints
  getPublicPackages,
  getPublicPackageById,

  // Admin endpoints
  getPackages,
  getPackageById,
  createPackage,
  updatePackage,
  deletePackage,
};
