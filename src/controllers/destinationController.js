const { Destination, sequelize } = require("../models");
const { Op } = require("sequelize");
const { convertToRelativePath } = require("../utils/filePath");
const {
  logCreate,
  logUpdate,
  logDelete,
} = require("../utils/auditLogger");

// Create destination
const createDestination = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      title,
      slug,
      description,
      location,
      hero_image,
      hero_image_alt,
      gallery_images,
      duration_min,
      duration_max,
      duration_display,
      wildlife_types,
      featured_species,
      key_highlights,
      attractions,
      category_tags,
      best_visit_months,
      is_active,
      sort_order,
    } = req.body;

    // Validate required fields
    if (!title || !description || !location) {
      return res.status(400).json({
        success: false,
        message: "Please provide title, description, and location",
      });
    }

    // Handle hero image upload
    let heroImagePath = hero_image;
    if (req.files && req.files.hero_image && req.files.hero_image[0]) {
      heroImagePath = convertToRelativePath(req.files.hero_image[0].path);
    }

    // Handle gallery images upload
    let galleryImagesArray = [];
    if (gallery_images) {
      if (Array.isArray(gallery_images)) {
        galleryImagesArray = gallery_images;
      } else {
        try {
          galleryImagesArray = JSON.parse(gallery_images);
        } catch (e) {
          galleryImagesArray = [gallery_images];
        }
      }
    }

    // Handle multiple gallery image uploads
    if (req.files && req.files.gallery_images) {
      const uploadedGalleryImages = req.files.gallery_images.map((file) =>
        convertToRelativePath(file.path)
      );
      galleryImagesArray = [...galleryImagesArray, ...uploadedGalleryImages];
    }

    // Handle JSON arrays - convert to arrays if needed
    const parseJsonArray = (value) => {
      if (!value) return [];
      if (Array.isArray(value)) return value.filter(item => item && item.toString().trim());
      if (typeof value === 'string') {
        try {
          return JSON.parse(value).filter(item => item && item.toString().trim());
        } catch (e) {
          return value.split(',').map(item => item.trim()).filter(item => item);
        }
      }
      return [];
    };

    // Parse complex JSON objects
    const parseJsonObject = (value) => {
      if (!value) return [];
      if (Array.isArray(value)) return value;
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch (e) {
          return [];
        }
      }
      return [];
    };

    const destination = await Destination.create({
      title,
      slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      description,
      location,
      hero_image: heroImagePath,
      hero_image_alt: hero_image_alt || `${title} destination`,
      gallery_images: galleryImagesArray,
      duration_min: duration_min ? parseInt(duration_min) : null,
      duration_max: duration_max ? parseInt(duration_max) : null,
      duration_display,
      wildlife_types: parseJsonArray(wildlife_types),
      featured_species: parseJsonArray(featured_species),
      key_highlights: parseJsonArray(key_highlights),
      attractions: parseJsonObject(attractions),
      category_tags: parseJsonArray(category_tags),
      best_visit_months: parseJsonArray(best_visit_months),
      is_active: is_active !== undefined ? is_active : true,
      sort_order: sort_order ? parseInt(sort_order) : 0,
    }, { transaction });

    // Log the creation
    await logCreate(req.user?.id, 'Destination', destination.id, {
      title: destination.title,
      location: destination.location,
    }, transaction);

    await transaction.commit();

    res.status(201).json({
      success: true,
      message: "Destination created successfully",
      data: destination,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error creating destination:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create destination",
      error: error.message,
    });
  }
};

// Get all destinations
const getAllDestinations = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      location,
      is_active,
      sort_by = 'sort_order',
      sort_order = 'ASC',
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const whereClause = {};

    // Add filters
    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { location: { [Op.iLike]: `%${search}%` } },
      ];
    }

    if (location) {
      whereClause.location = { [Op.iLike]: `%${location}%` };
    }

    if (is_active !== undefined) {
      whereClause.is_active = is_active === 'true';
    }

    const { count, rows: destinations } = await Destination.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset,
      order: [[sort_by, sort_order.toUpperCase()]],
    });

    res.json({
      success: true,
      data: destinations,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching destinations:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch destinations",
      error: error.message,
    });
  }
};

// Get destination by ID
const getDestinationById = async (req, res) => {
  try {
    const { id } = req.params;

    const destination = await Destination.findByPk(id);

    if (!destination) {
      return res.status(404).json({
        success: false,
        message: "Destination not found",
      });
    }

    res.json({
      success: true,
      data: destination,
    });
  } catch (error) {
    console.error("Error fetching destination:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch destination",
      error: error.message,
    });
  }
};

// Get destination by slug
const getDestinationBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const destination = await Destination.findOne({
      where: { slug, is_active: true },
    });

    if (!destination) {
      return res.status(404).json({
        success: false,
        message: "Destination not found",
      });
    }

    res.json({
      success: true,
      data: destination,
    });
  } catch (error) {
    console.error("Error fetching destination:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch destination",
      error: error.message,
    });
  }
};

// Update destination
const updateDestination = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const updates = req.body;

    const destination = await Destination.findByPk(id, { transaction });

    if (!destination) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Destination not found",
      });
    }

    // Handle hero image upload
    if (req.files && req.files.hero_image && req.files.hero_image[0]) {
      updates.hero_image = convertToRelativePath(req.files.hero_image[0].path);
    }

    // Handle gallery images upload
    if (req.files && req.files.gallery_images) {
      const uploadedGalleryImages = req.files.gallery_images.map((file) =>
        convertToRelativePath(file.path)
      );
      const existingGallery = Array.isArray(destination.gallery_images)
        ? destination.gallery_images
        : [];
      updates.gallery_images = [...existingGallery, ...uploadedGalleryImages];
    }

    // Parse JSON arrays if they're strings
    const parseJsonArray = (value) => {
      if (!value) return undefined;
      if (Array.isArray(value)) return value.filter(item => item && item.toString().trim());
      if (typeof value === 'string') {
        try {
          return JSON.parse(value).filter(item => item && item.toString().trim());
        } catch (e) {
          return value.split(',').map(item => item.trim()).filter(item => item);
        }
      }
      return undefined;
    };

    const parseJsonObject = (value) => {
      if (!value) return undefined;
      if (Array.isArray(value)) return value;
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch (e) {
          return undefined;
        }
      }
      return undefined;
    };

    // Apply parsing to array/object fields
    const arrayFields = ['wildlife_types', 'featured_species', 'key_highlights', 'category_tags', 'best_visit_months'];
    const objectFields = ['attractions', 'gallery_images'];

    arrayFields.forEach(field => {
      if (updates[field] !== undefined) {
        updates[field] = parseJsonArray(updates[field]);
      }
    });

    objectFields.forEach(field => {
      if (updates[field] !== undefined) {
        updates[field] = parseJsonObject(updates[field]);
      }
    });

    // Update slug if title changed
    if (updates.title && updates.title !== destination.title) {
      updates.slug = updates.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }

    await destination.update(updates, { transaction });

    // Log the update
    await logUpdate(req.user?.id, 'Destination', destination.id, updates, transaction);

    await transaction.commit();

    res.json({
      success: true,
      message: "Destination updated successfully",
      data: destination,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error updating destination:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update destination",
      error: error.message,
    });
  }
};

// Delete destination
const deleteDestination = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;

    const destination = await Destination.findByPk(id, { transaction });

    if (!destination) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Destination not found",
      });
    }

    // Log the deletion before destroying
    await logDelete(req.user?.id, 'Destination', destination.id, {
      title: destination.title,
      location: destination.location,
    }, transaction);

    await destination.destroy({ transaction });

    await transaction.commit();

    res.json({
      success: true,
      message: "Destination deleted successfully",
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error deleting destination:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete destination",
      error: error.message,
    });
  }
};

// Get public destinations (active only, for frontend)
const getPublicDestinations = async (req, res) => {
  try {
    const destinations = await Destination.findAll({
      where: { is_active: true },
      order: [['sort_order', 'ASC'], ['createdAt', 'DESC']],
    });

    res.json({
      success: true,
      data: destinations,
    });
  } catch (error) {
    console.error("Error fetching public destinations:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch destinations",
      error: error.message,
    });
  }
};

module.exports = {
  createDestination,
  getAllDestinations,
  getDestinationById,
  getDestinationBySlug,
  updateDestination,
  deleteDestination,
  getPublicDestinations,
};
