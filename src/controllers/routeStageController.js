const { RouteStage, Package } = require("../models");
const { Op } = require("sequelize");
const {
  logCreate,
  logUpdate,
  logDelete,
} = require("../utils/auditLogger");

// Normalize helper to ensure JSON arrays are properly formatted
const normalizeRouteStage = (stage) => {
  if (!stage) return stage;
  const plain = stage.toJSON ? stage.toJSON() : stage;
  return {
    ...plain,
    images: Array.isArray(plain.images) ? plain.images : [],
    activities: Array.isArray(plain.activities) ? plain.activities : [],
    highlights: Array.isArray(plain.highlights) ? plain.highlights : [],
  };
};

// Validate route stage data
const validateRouteStageData = (data) => {
  const errors = [];

  if (!data.packageId) {
    errors.push("Package ID is required");
  }

  if (!data.stage || typeof data.stage !== 'number' || data.stage < 1) {
    errors.push("Stage must be a positive integer starting from 1");
  }

  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    errors.push("Name is required and must be a non-empty string");
  }

  if (!data.description || typeof data.description !== 'string' || data.description.trim().length === 0) {
    errors.push("Description is required and must be a non-empty string");
  }

  if (!data.duration || typeof data.duration !== 'string' || data.duration.trim().length === 0) {
    errors.push("Duration is required and must be a non-empty string");
  }

  if (data.longitude !== undefined && (typeof data.longitude !== 'number' || data.longitude < -180 || data.longitude > 180)) {
    errors.push("Longitude must be a number between -180 and 180");
  }

  if (data.latitude !== undefined && (typeof data.latitude !== 'number' || data.latitude < -90 || data.latitude > 90)) {
    errors.push("Latitude must be a number between -90 and 90");
  }

  return errors;
};

// Process arrays
const processArray = (data, fieldName) => {
  if (!data) return [];

  if (Array.isArray(data)) {
    return data.filter(item => item && typeof item === 'string' && item.trim()).map(item => item.trim());
  }

  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed.filter(item => item && typeof item === 'string' && item.trim()).map(item => item.trim());
      }
    } catch (e) {
      // Not JSON, treat as single string
      return data.trim() ? [data.trim()] : [];
    }
  }

  return [];
};

// ==================== ADMIN ENDPOINTS ====================

// Get all route stages (admin) - can filter by packageId
const getRouteStages = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      packageId,
      search,
      sortBy = "stage",
      sortOrder = "ASC",
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    // Build where clause
    const where = {};

    if (packageId) {
      where.packageId = packageId;
    }

    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        { activities: { [Op.contains]: [search] } },
        { highlights: { [Op.contains]: [search] } },
      ];
    }

    // Get total count and paginated results
    const { count, rows } = await RouteStage.findAndCountAll({
      where,
      limit: limitNum,
      offset,
      order: [[sortBy, sortOrder]],
      include: [
        {
          model: Package,
          as: "package",
          attributes: ["id", "title", "type"],
        },
      ],
    });

    const normalizedStages = rows.map(normalizeRouteStage);

    res.status(200).json({
      success: true,
      data: normalizedStages,
      pagination: {
        total: count,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(count / limitNum),
      },
    });
  } catch (error) {
    console.error("Error fetching route stages:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching route stages",
      error: error.message,
    });
  }
};

// Get route stage by ID (admin)
const getRouteStageById = async (req, res) => {
  try {
    const { id } = req.params;

    const routeStage = await RouteStage.findByPk(id, {
      include: [
        {
          model: Package,
          as: "package",
          attributes: ["id", "title", "type", "image"],
        },
      ],
    });

    if (!routeStage) {
      return res.status(404).json({
        success: false,
        message: "Route stage not found",
      });
    }

    const normalizedStage = normalizeRouteStage(routeStage);

    res.status(200).json({
      success: true,
      data: normalizedStage,
    });
  } catch (error) {
    console.error("Error fetching route stage:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching route stage",
      error: error.message,
    });
  }
};

// Create route stage (admin)
const createRouteStage = async (req, res) => {
  try {
    const {
      packageId,
      stage,
      name,
      description,
      longitude,
      latitude,
      images,
      duration,
      activities,
      accommodation,
      meals,
      transportation,
      highlights,
      tips,
      wildlife,
    } = req.body;

    // Validate required fields
    const validationErrors = validateRouteStageData({
      packageId,
      stage: parseInt(stage),
      name,
      description,
      duration,
      longitude: longitude ? parseFloat(longitude) : undefined,
      latitude: latitude ? parseFloat(latitude) : undefined,
    });

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationErrors,
      });
    }

    // Check if package exists
    const packageExists = await Package.findByPk(packageId);
    if (!packageExists) {
      return res.status(404).json({
        success: false,
        message: "Package not found",
      });
    }

    // Check if stage number already exists for this package
    const existingStage = await RouteStage.findOne({
      where: { packageId, stage: parseInt(stage) },
    });

    if (existingStage) {
      return res.status(400).json({
        success: false,
        message: `Stage ${stage} already exists for this package`,
      });
    }

    // Process arrays
    const imagesArray = processArray(images, 'images');
    const activitiesArray = processArray(activities, 'activities');
    const highlightsArray = processArray(highlights, 'highlights');
    const wildlifeArray = processArray(wildlife, 'wildlife');

    // Create route stage
    const routeStage = await RouteStage.create({
      packageId,
      stage: parseInt(stage),
      name: name.trim(),
      description: description.trim(),
      longitude: longitude ? parseFloat(longitude) : null,
      latitude: latitude ? parseFloat(latitude) : null,
      images: imagesArray,
      duration: duration.trim(),
      activities: activitiesArray,
      accommodation: accommodation ? accommodation.trim() : null,
      meals: meals ? meals.trim() : null,
      transportation: transportation ? transportation.trim() : null,
      highlights: highlightsArray,
      tips: tips ? tips.trim() : null,
      wildlife: wildlifeArray,
    });

    const normalizedStage = normalizeRouteStage(routeStage);

    // Log audit trail
    if (req.user) {
      await logCreate(
        req.user.id,
        "route_stage",
        routeStage.id,
        {
          packageId,
          stage: routeStage.stage,
          name: routeStage.name,
        },
        req
      );
    }

    res.status(201).json({
      success: true,
      message: "Route stage created successfully",
      data: normalizedStage,
    });
  } catch (error) {
    console.error("Error creating route stage:", error);
    res.status(500).json({
      success: false,
      message: "Error creating route stage",
      error: error.message,
    });
  }
};

// Update route stage (admin)
const updateRouteStage = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      packageId,
      stage,
      name,
      description,
      longitude,
      latitude,
      images,
      duration,
      activities,
      accommodation,
      meals,
      transportation,
      highlights,
      tips,
      wildlife,
    } = req.body;

    const routeStage = await RouteStage.findByPk(id);

    if (!routeStage) {
      return res.status(404).json({
        success: false,
        message: "Route stage not found",
      });
    }

    // Store old values for audit logging
    const oldValues = {
      packageId: routeStage.packageId,
      stage: routeStage.stage,
      name: routeStage.name,
    };

    // Validate fields if provided
    const validationData = {
      packageId: packageId || routeStage.packageId,
      stage: stage !== undefined ? parseInt(stage) : routeStage.stage,
      name: name || routeStage.name,
      description: description || routeStage.description,
      duration: duration || routeStage.duration,
      longitude: longitude !== undefined ? parseFloat(longitude) : routeStage.longitude,
      latitude: latitude !== undefined ? parseFloat(latitude) : routeStage.latitude,
    };

    const validationErrors = validateRouteStageData(validationData);

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationErrors,
      });
    }

    // Check if package exists (if packageId is being changed)
    if (packageId && packageId !== routeStage.packageId) {
      const packageExists = await Package.findByPk(packageId);
      if (!packageExists) {
        return res.status(404).json({
          success: false,
          message: "Package not found",
        });
      }
    }

    // Check if stage number conflicts (if stage or packageId is being changed)
    if ((stage !== undefined && parseInt(stage) !== routeStage.stage) ||
        (packageId && packageId !== routeStage.packageId)) {
      const targetPackageId = packageId || routeStage.packageId;
      const targetStage = stage !== undefined ? parseInt(stage) : routeStage.stage;

      const existingStage = await RouteStage.findOne({
        where: {
          packageId: targetPackageId,
          stage: targetStage,
          id: { [Op.ne]: id }, // Exclude current record
        },
      });

      if (existingStage) {
        return res.status(400).json({
          success: false,
          message: `Stage ${targetStage} already exists for this package`,
        });
      }
    }

    // Process arrays
    const imagesArray = images !== undefined ? processArray(images, 'images') : routeStage.images;
    const activitiesArray = activities !== undefined ? processArray(activities, 'activities') : routeStage.activities;
    const highlightsArray = highlights !== undefined ? processArray(highlights, 'highlights') : routeStage.highlights;
    const wildlifeArray = wildlife !== undefined ? processArray(wildlife, 'wildlife') : routeStage.wildlife;

    // Update fields
    const updateData = {};
    if (packageId !== undefined) updateData.packageId = packageId;
    if (stage !== undefined) updateData.stage = parseInt(stage);
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (longitude !== undefined) updateData.longitude = longitude ? parseFloat(longitude) : null;
    if (latitude !== undefined) updateData.latitude = latitude ? parseFloat(latitude) : null;
    if (images !== undefined) updateData.images = imagesArray;
    if (duration !== undefined) updateData.duration = duration.trim();
    if (activities !== undefined) updateData.activities = activitiesArray;
    if (accommodation !== undefined) updateData.accommodation = accommodation ? accommodation.trim() : null;
    if (meals !== undefined) updateData.meals = meals ? meals.trim() : null;
    if (transportation !== undefined) updateData.transportation = transportation ? transportation.trim() : null;
    if (highlights !== undefined) updateData.highlights = highlightsArray;
    if (tips !== undefined) updateData.tips = tips ? tips.trim() : null;
    if (wildlife !== undefined) updateData.wildlife = wildlifeArray;

    await routeStage.update(updateData);

    // Reload to get updated values
    await routeStage.reload();

    const normalizedStage = normalizeRouteStage(routeStage);

    // Log audit trail
    if (req.user) {
      await logUpdate(
        req.user.id,
        "route_stage",
        id,
        oldValues,
        {
          packageId: routeStage.packageId,
          stage: routeStage.stage,
          name: routeStage.name,
        },
        req
      );
    }

    res.status(200).json({
      success: true,
      message: "Route stage updated successfully",
      data: normalizedStage,
    });
  } catch (error) {
    console.error("Error updating route stage:", error);
    res.status(500).json({
      success: false,
      message: "Error updating route stage",
      error: error.message,
    });
  }
};

// Delete route stage (admin)
const deleteRouteStage = async (req, res) => {
  try {
    const { id } = req.params;

    const routeStage = await RouteStage.findByPk(id, {
      include: [
        {
          model: Package,
          as: "package",
          attributes: ["title"],
        },
      ],
    });

    if (!routeStage) {
      return res.status(404).json({
        success: false,
        message: "Route stage not found",
      });
    }

    // Log audit trail before deletion
    if (req.user) {
      await logDelete(
        req.user.id,
        "route_stage",
        id,
        {
          packageId: routeStage.packageId,
          stage: routeStage.stage,
          name: routeStage.name,
        },
        req
      );
    }

    await routeStage.destroy();

    res.status(200).json({
      success: true,
      message: "Route stage deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting route stage:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting route stage",
      error: error.message,
    });
  }
};

// Bulk create route stages for a package (admin)
const bulkCreateRouteStages = async (req, res) => {
  try {
    const { packageId, stages } = req.body;

    if (!packageId) {
      return res.status(400).json({
        success: false,
        message: "Package ID is required",
      });
    }

    if (!Array.isArray(stages) || stages.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Stages array is required and must not be empty",
      });
    }

    // Check if package exists
    const packageExists = await Package.findByPk(packageId);
    if (!packageExists) {
      return res.status(404).json({
        success: false,
        message: "Package not found",
      });
    }

    const createdStages = [];
    const errors = [];

    // Process each stage
    for (let i = 0; i < stages.length; i++) {
      const stageData = stages[i];

      try {
        // Validate stage data
        const validationErrors = validateRouteStageData({
          packageId,
          stage: parseInt(stageData.stage),
          name: stageData.name,
          description: stageData.description,
          duration: stageData.duration,
          longitude: stageData.longitude ? parseFloat(stageData.longitude) : undefined,
          latitude: stageData.latitude ? parseFloat(stageData.latitude) : undefined,
        });

        if (validationErrors.length > 0) {
          errors.push({
            stage: stageData.stage || i + 1,
            errors: validationErrors,
          });
          continue;
        }

        // Check for duplicate stage numbers
        const existingStage = await RouteStage.findOne({
          where: { packageId, stage: parseInt(stageData.stage) },
        });

        if (existingStage) {
          errors.push({
            stage: stageData.stage,
            errors: [`Stage ${stageData.stage} already exists for this package`],
          });
          continue;
        }

        // Process arrays
        const imagesArray = processArray(stageData.images, 'images');
        const activitiesArray = processArray(stageData.activities, 'activities');
        const highlightsArray = processArray(stageData.highlights, 'highlights');
        const wildlifeArray = processArray(stageData.wildlife, 'wildlife');

        // Create stage
        const routeStage = await RouteStage.create({
          packageId,
          stage: parseInt(stageData.stage),
          name: stageData.name.trim(),
          description: stageData.description.trim(),
          longitude: stageData.longitude ? parseFloat(stageData.longitude) : null,
          latitude: stageData.latitude ? parseFloat(stageData.latitude) : null,
          images: imagesArray,
          duration: stageData.duration.trim(),
          activities: activitiesArray,
          accommodation: stageData.accommodation ? stageData.accommodation.trim() : null,
          meals: stageData.meals ? stageData.meals.trim() : null,
          transportation: stageData.transportation ? stageData.transportation.trim() : null,
          highlights: highlightsArray,
          tips: stageData.tips ? stageData.tips.trim() : null,
          wildlife: wildlifeArray,
        });

        createdStages.push(normalizeRouteStage(routeStage));
      } catch (error) {
        errors.push({
          stage: stageData.stage || i + 1,
          errors: [error.message],
        });
      }
    }

    // Log audit trail
    if (req.user && createdStages.length > 0) {
      await logCreate(
        req.user.id,
        "route_stage",
        null, // No single ID for bulk operation
        {
          packageId,
          stagesCreated: createdStages.length,
          stagesAttempted: stages.length,
        },
        req
      );
    }

    res.status(201).json({
      success: true,
      message: `Successfully created ${createdStages.length} of ${stages.length} route stages`,
      data: createdStages,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Error bulk creating route stages:", error);
    res.status(500).json({
      success: false,
      message: "Error creating route stages",
      error: error.message,
    });
  }
};

module.exports = {
  getRouteStages,
  getRouteStageById,
  createRouteStage,
  updateRouteStage,
  deleteRouteStage,
  bulkCreateRouteStages,
};
