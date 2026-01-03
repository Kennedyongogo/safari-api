const { Destination, sequelize } = require("../models");
const { Op } = require("sequelize");
const path = require("path");
const { convertToRelativePath } = require("../utils/filePath");
const { deleteFile } = require("../middleware/upload");
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
    let heroImagePath = null;
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

    // Handle attraction images upload - new format with indexed fields
    const collectAttractionImages = () => {
      const attractionImages = {};
      if (req.files) {
        Object.keys(req.files).forEach(key => {
          if (key.startsWith('attraction_images_')) {
            const index = parseInt(key.replace('attraction_images_', ''));
            attractionImages[index] = req.files[key].map(file => convertToRelativePath(file.path));
          }
        });
      }
      return attractionImages;
    };
    const attractionImagesByIndex = collectAttractionImages();

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

    // Process attractions to merge uploaded images
    const processAttractions = (attractionsData) => {
      let parsedAttractions = parseJsonObject(attractionsData);
      if (!Array.isArray(parsedAttractions)) {
        parsedAttractions = [];
      }

      // Add uploaded attraction images to the correct attractions based on index
      parsedAttractions = parsedAttractions.map((attraction, index) => {
        const newImages = attractionImagesByIndex[index] || [];
        return {
          ...attraction,
          images: [...(attraction.images || []), ...newImages]
        };
      });

      return parsedAttractions;
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
      attractions: processAttractions(attractions),
      category_tags: parseJsonArray(category_tags),
      best_visit_months: parseJsonArray(best_visit_months),
      is_active: is_active !== undefined ? is_active : true,
      sort_order: sort_order ? parseInt(sort_order) : 0,
    }, { transaction });

    // Log the creation
    await logCreate(req.user?.id, 'destination', destination.id, {
      title: destination.title,
      location: destination.location,
    }, req);

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

    // Handle hero image - check if it's being explicitly set (including empty string for deletion)
    if (updates.hero_image !== undefined) {
      // If there's a new file upload, use that
      if (req.files && req.files.hero_image && req.files.hero_image[0]) {
        updates.hero_image = convertToRelativePath(req.files.hero_image[0].path);
      }
      // If hero_image is sent as empty string, keep it as empty (for deletion)
      // If hero_image has a value, keep the existing value
    }

    // Auto-populate hero image from first gallery image if hero image is empty and gallery images exist
    if ((!updates.hero_image || updates.hero_image === '') &&
        updates.gallery_images &&
        Array.isArray(updates.gallery_images) &&
        updates.gallery_images.length > 0) {
      updates.hero_image = updates.gallery_images[0];
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

    // Handle attraction images upload - new format with indexed fields
    const collectAttractionImages = () => {
      const attractionImages = {};
      if (req.files) {
        Object.keys(req.files).forEach(key => {
          if (key.startsWith('attraction_images_')) {
            const index = parseInt(key.replace('attraction_images_', ''));
            attractionImages[index] = req.files[key].map(file => convertToRelativePath(file.path));
          }
        });
      }
      return attractionImages;
    };
    const attractionImagesByIndex = collectAttractionImages();

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

    // Process attractions to merge uploaded images
    const processAttractions = (attractionsData) => {
      let parsedAttractions = parseJsonObject(attractionsData);
      if (!Array.isArray(parsedAttractions)) {
        parsedAttractions = [];
      }

      // Add uploaded attraction images to the correct attractions based on index
      parsedAttractions = parsedAttractions.map((attraction, index) => {
        const newImages = attractionImagesByIndex[index] || [];
        return {
          ...attraction,
          images: [...(attraction.images || []), ...newImages]
        };
      });

      return parsedAttractions;
    };

    // Apply parsing to array/object fields
    const arrayFields = ['wildlife_types', 'featured_species', 'key_highlights', 'category_tags', 'best_visit_months'];
    const objectFields = ['gallery_images'];

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

    // Handle attractions separately to merge uploaded images
    if (updates.attractions !== undefined) {
      updates.attractions = processAttractions(updates.attractions);
    }

    // Update slug if title changed
    if (updates.title && updates.title !== destination.title) {
      updates.slug = updates.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }

    await destination.update(updates, { transaction });

    // Handle file deletion for removed images (after successful database update)
    const oldHeroImage = destination.hero_image;
    const oldGalleryImages = Array.isArray(destination.gallery_images) ? destination.gallery_images : [];
    const oldAttractions = Array.isArray(destination.attractions) ? destination.attractions : [];

    // Delete hero image if it was changed or removed
    if (oldHeroImage && (!updates.hero_image || updates.hero_image !== oldHeroImage)) {
      const fullPath = oldHeroImage.startsWith('uploads/') ? oldHeroImage : `uploads/destinations/${oldHeroImage}`;
      await deleteFile(path.join(__dirname, '..', '..', fullPath));
    }

    // Delete gallery images that were removed
    if (updates.gallery_images !== undefined) {
      const newGalleryImages = Array.isArray(updates.gallery_images) ? updates.gallery_images : [];
      const imagesToDelete = oldGalleryImages.filter(oldImg => !newGalleryImages.includes(oldImg));
      for (const imagePath of imagesToDelete) {
        const fullPath = imagePath.startsWith('uploads/') ? imagePath : `uploads/destinations/${imagePath}`;
        await deleteFile(path.join(__dirname, '..', '..', fullPath));
      }
    }

    // Delete attraction images that were removed
    if (updates.attractions !== undefined && Array.isArray(updates.attractions)) {
      for (let i = 0; i < Math.max(oldAttractions.length, updates.attractions.length); i++) {
        const oldAttraction = oldAttractions[i] || {};
        const newAttraction = updates.attractions[i] || {};

        const oldImages = Array.isArray(oldAttraction.images) ? oldAttraction.images.filter(img => typeof img === 'string') : [];
        const newImages = Array.isArray(newAttraction.images) ? newAttraction.images.filter(img => typeof img === 'string') : [];

        const imagesToDelete = oldImages.filter(oldImg => !newImages.includes(oldImg));
        for (const imagePath of imagesToDelete) {
          const fullPath = imagePath.startsWith('uploads/') ? imagePath : `uploads/destinations/${imagePath}`;
          await deleteFile(path.join(__dirname, '..', '..', fullPath));
        }
      }
    }

    // Log the update
    await logUpdate(req.user?.id, 'destination', destination.id, null, updates, req);

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

// Get single destination by ID (public access)
const getPublicDestinationById = async (req, res) => {
  try {
    const { id } = req.params;

    const destination = await Destination.findOne({
      where: { id, is_active: true },
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
    console.error("Error fetching destination by ID:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch destination",
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

    // Delete all associated image files before destroying the record
    const imagesToDelete = [];

    // Add hero image
    if (destination.hero_image) {
      imagesToDelete.push(destination.hero_image);
    }

    // Add gallery images
    if (Array.isArray(destination.gallery_images)) {
      imagesToDelete.push(...destination.gallery_images);
    }

    // Add attraction images
    if (Array.isArray(destination.attractions)) {
      destination.attractions.forEach(attraction => {
        if (Array.isArray(attraction.images)) {
          imagesToDelete.push(...attraction.images.filter(img => typeof img === 'string'));
        }
      });
    }

    // Delete all image files
    for (const imagePath of imagesToDelete) {
      const fullPath = imagePath.startsWith('uploads/') ? imagePath : `uploads/destinations/${imagePath}`;
      await deleteFile(path.join(__dirname, '..', '..', fullPath));
    }

    // Log the deletion before destroying
    await logDelete(req.user?.id, 'destination', destination.id, {
      title: destination.title,
      location: destination.location,
    }, req);

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
  getPublicDestinationById,
  updateDestination,
  deleteDestination,
  getPublicDestinations,
};
