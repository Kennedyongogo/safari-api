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

// Get valid package categories from the model
const PACKAGE_CATEGORIES = Destination.PACKAGE_CATEGORIES || [
  // Uganda categories
  "CLASSIC UGANDA SAFARI TOURS",
  "PRIMATE SAFARIS",
  "ADVENTURE & NATURE EXPERIENCES",
  "COMBINED SAFARI & PRIMATE HOLIDAYS",
  "SPECIAL INTEREST & SLOW TRAVEL",
  // Kenya categories
  "SAFARI TOURS",
  "CLIMB MOUNT KENYA PACKAGES",
  "BEACH EXTENSION PACKAGES",
  "COMBINED SAFARI & BEACH HOLIDAYS",
  "SPECIAL INTEREST SAFARI",
  // Tanzania categories
  "NORTHERN CIRCUIT SAFARI TOURS",
  "SOUTHERN & WESTERN CIRCUIT SAFARIS",
  "MOUNT KILIMANJARO CLIMBS",
  "ZANZIBAR BEACH EXTENSIONS",
  "COMBINED SAFARI & BEACH HOLIDAYS",
  // Rwanda categories
  "GORILLA & PRIMATE SAFARIS",
  "WILDLIFE & SCENIC SAFARIS",
  "CULTURE, SCENERY & RELAXATION"
];

// Validate package categories
const validatePackageCategories = (packages) => {
  if (!packages || !Array.isArray(packages)) {
    return { valid: true };
  }

  for (let i = 0; i < packages.length; i++) {
    const category = packages[i];
    if (category.category_name && !PACKAGE_CATEGORIES.includes(category.category_name)) {
      return {
        valid: false,
        error: `Invalid category '${category.category_name}' at index ${i}. Allowed categories: ${PACKAGE_CATEGORIES.join(", ")}`,
      };
    }
  }

  return { valid: true };
};

// Create destination
const createDestination = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      title,
      subtitle,
      slug,
      brief_description,
      location,
      hero_image,
      hero_image_alt,
      gallery_images,
      packages,
      is_active,
      sort_order,
    } = req.body;

    // Validate required fields
    if (!title || !brief_description || !location) {
      return res.status(400).json({
        success: false,
        message: "Please provide title, brief_description, and location",
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

    // Parse packages JSON
    const parsePackages = (packagesData) => {
      if (!packagesData) return [];
      if (Array.isArray(packagesData)) return packagesData;
      if (typeof packagesData === 'string') {
        try {
          return JSON.parse(packagesData);
        } catch (e) {
          return [];
        }
      }
      return [];
    };

    // Handle package gallery images upload
    // Format: package_gallery_<categoryIndex>_<packageIndex>
    const collectPackageGalleryImages = () => {
      const packageImages = {};
      if (req.files) {
        Object.keys(req.files).forEach(key => {
          if (key.startsWith('package_gallery_')) {
            const parts = key.replace('package_gallery_', '').split('_');
            if (parts.length === 2) {
              const catIndex = parseInt(parts[0]);
              const pkgIndex = parseInt(parts[1]);
              if (!packageImages[catIndex]) {
                packageImages[catIndex] = {};
              }
              packageImages[catIndex][pkgIndex] = req.files[key].map(file => 
                convertToRelativePath(file.path)
              );
            }
          }
        });
      }
      return packageImages;
    };

    const packageGalleryImagesByIndex = collectPackageGalleryImages();

    // Process packages to merge uploaded gallery images
    const processPackages = (packagesData) => {
      let parsedPackages = parsePackages(packagesData);
      if (!Array.isArray(parsedPackages)) {
        parsedPackages = [];
      }

      // Validate package categories
      const categoryValidation = validatePackageCategories(parsedPackages);
      if (!categoryValidation.valid) {
        throw new Error(categoryValidation.error);
      }

      // Add uploaded package gallery images to the correct packages
      parsedPackages = parsedPackages.map((category, catIndex) => {
        if (!category.packages || !Array.isArray(category.packages)) {
          return category;
        }

        const categoryImages = packageGalleryImagesByIndex[catIndex] || {};
        const updatedPackages = category.packages.map((pkg, pkgIndex) => {
          const newGalleryImages = categoryImages[pkgIndex] || [];
          const existingGallery = Array.isArray(pkg.gallery) ? pkg.gallery : [];
          return {
            ...pkg,
            gallery: [...existingGallery, ...newGalleryImages]
          };
        });

        return {
          ...category,
          packages: updatedPackages
        };
      });

      return parsedPackages;
    };

    const destination = await Destination.create({
      title,
      subtitle,
      slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      brief_description,
      location,
      hero_image: heroImagePath,
      hero_image_alt: hero_image_alt || `${title} destination`,
      gallery_images: galleryImagesArray,
      packages: processPackages(packages),
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
        { brief_description: { [Op.iLike]: `%${search}%` } },
        { subtitle: { [Op.iLike]: `%${search}%` } },
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

    // Parse JSON objects
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

    // Handle package gallery images upload
    // Format: package_gallery_<categoryIndex>_<packageIndex>
    const collectPackageGalleryImages = () => {
      const packageImages = {};
      if (req.files) {
        Object.keys(req.files).forEach(key => {
          if (key.startsWith('package_gallery_')) {
            const parts = key.replace('package_gallery_', '').split('_');
            if (parts.length === 2) {
              const catIndex = parseInt(parts[0]);
              const pkgIndex = parseInt(parts[1]);
              if (!packageImages[catIndex]) {
                packageImages[catIndex] = {};
              }
              packageImages[catIndex][pkgIndex] = req.files[key].map(file => 
                convertToRelativePath(file.path)
              );
            }
          }
        });
      }
      return packageImages;
    };

    const packageGalleryImagesByIndex = collectPackageGalleryImages();

    // Process packages to merge uploaded gallery images
    const processPackages = (packagesData, existingPackages) => {
      let parsedPackages = parseJsonObject(packagesData);
      if (!Array.isArray(parsedPackages)) {
        // If not provided, use existing packages
        parsedPackages = Array.isArray(existingPackages) ? existingPackages : [];
      }

      // Validate package categories
      const categoryValidation = validatePackageCategories(parsedPackages);
      if (!categoryValidation.valid) {
        throw new Error(categoryValidation.error);
      }

      // Add uploaded package gallery images to the correct packages
      parsedPackages = parsedPackages.map((category, catIndex) => {
        if (!category.packages || !Array.isArray(category.packages)) {
          return category;
        }

        const categoryImages = packageGalleryImagesByIndex[catIndex] || {};
        const updatedPackages = category.packages.map((pkg, pkgIndex) => {
          const newGalleryImages = categoryImages[pkgIndex] || [];
          const existingGallery = Array.isArray(pkg.gallery) ? pkg.gallery : [];
          return {
            ...pkg,
            gallery: [...existingGallery, ...newGalleryImages]
          };
        });

        return {
          ...category,
          packages: updatedPackages
        };
      });

      return parsedPackages;
    };

    // Handle gallery images
    if (updates.gallery_images !== undefined) {
      updates.gallery_images = parseJsonObject(updates.gallery_images);
    }

    // Handle gallery images upload - IMPORTANT: Use the parsed gallery_images from frontend (which includes deletions)
    // Then append new uploaded files to that list
    if (req.files && req.files.gallery_images) {
      const uploadedGalleryImages = req.files.gallery_images.map((file) =>
        convertToRelativePath(file.path)
      );
      // Use the parsed gallery_images from frontend (which already has deletions applied)
      // If not provided, fall back to existing gallery from database
      const currentGallery = Array.isArray(updates.gallery_images) 
        ? updates.gallery_images 
        : (Array.isArray(destination.gallery_images) ? destination.gallery_images : []);
      updates.gallery_images = [...currentGallery, ...uploadedGalleryImages];
    }

    // Auto-populate hero image from first gallery image if hero image is empty and gallery images exist
    if ((!updates.hero_image || updates.hero_image === '') &&
        updates.gallery_images &&
        Array.isArray(updates.gallery_images) &&
        updates.gallery_images.length > 0) {
      updates.hero_image = updates.gallery_images[0];
    }

    // Handle packages separately to merge uploaded gallery images
    if (updates.packages !== undefined) {
      updates.packages = processPackages(updates.packages, destination.packages);
    }

    // Update slug if title changed
    if (updates.title && updates.title !== destination.title) {
      updates.slug = updates.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }

    // Save old values BEFORE updating (needed for file deletion comparison)
    const oldHeroImage = destination.hero_image;
    const oldGalleryImages = Array.isArray(destination.gallery_images) ? destination.gallery_images : [];
    const oldPackages = Array.isArray(destination.packages) ? destination.packages : [];

    await destination.update(updates, { transaction });

    // Handle file deletion for removed images (after successful database update)

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

    // Delete package gallery images that were removed
    if (updates.packages !== undefined && Array.isArray(updates.packages)) {
      const newPackages = Array.isArray(updates.packages) ? updates.packages : [];
      
      // Compare old and new packages to find deleted gallery images
      for (let catIndex = 0; catIndex < Math.max(oldPackages.length, newPackages.length); catIndex++) {
        const oldCategory = oldPackages[catIndex] || {};
        const newCategory = newPackages[catIndex] || {};
        const oldCategoryPackages = Array.isArray(oldCategory.packages) ? oldCategory.packages : [];
        const newCategoryPackages = Array.isArray(newCategory.packages) ? newCategory.packages : [];

        for (let pkgIndex = 0; pkgIndex < Math.max(oldCategoryPackages.length, newCategoryPackages.length); pkgIndex++) {
          const oldPackage = oldCategoryPackages[pkgIndex] || {};
          const newPackage = newCategoryPackages[pkgIndex] || {};
          const oldGallery = Array.isArray(oldPackage.gallery) ? oldPackage.gallery.filter(img => typeof img === 'string') : [];
          const newGallery = Array.isArray(newPackage.gallery) ? newPackage.gallery.filter(img => typeof img === 'string') : [];

          const imagesToDelete = oldGallery.filter(oldImg => !newGallery.includes(oldImg));
          for (const imagePath of imagesToDelete) {
            const fullPath = imagePath.startsWith('uploads/') ? imagePath : `uploads/destinations/${imagePath}`;
            await deleteFile(path.join(__dirname, '..', '..', fullPath));
          }
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

    // Add package gallery images
    if (Array.isArray(destination.packages)) {
      destination.packages.forEach(category => {
        if (Array.isArray(category.packages)) {
          category.packages.forEach(pkg => {
            if (Array.isArray(pkg.gallery)) {
              imagesToDelete.push(...pkg.gallery.filter(img => typeof img === 'string'));
            }
          });
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

// Get all packages from a destination (flattened list)
const getDestinationPackages = async (req, res) => {
  try {
    const { id } = req.params;

    const destination = await Destination.findByPk(id);

    if (!destination) {
      return res.status(404).json({
        success: false,
        message: "Destination not found",
      });
    }

    // Extract all packages from categories and flatten them
    const packagesList = [];
    if (Array.isArray(destination.packages)) {
      destination.packages.forEach((category) => {
        if (Array.isArray(category.packages)) {
          category.packages.forEach((pkg) => {
            packagesList.push({
              ...pkg,
              destinationId: destination.id,
              destinationTitle: destination.title,
              destinationSlug: destination.slug,
              categoryName: category.category_name,
              categoryOrder: category.category_order,
            });
          });
        }
      });
    }

    res.json({
      success: true,
      data: packagesList,
      destination: {
        id: destination.id,
        title: destination.title,
        slug: destination.slug,
        location: destination.location,
      },
    });
  } catch (error) {
    console.error("Error fetching destination packages:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch packages",
      error: error.message,
    });
  }
};

// Get itinerary data for map visualization
// Can fetch itinerary for a specific package or all packages in a destination
const getPackagesItinerary = async (req, res) => {
  try {
    const { id } = req.params; // destination id
    const { packageNumber, categoryName } = req.query; // optional filters

    const destination = await Destination.findByPk(id);

    if (!destination) {
      return res.status(404).json({
        success: false,
        message: "Destination not found",
      });
    }

    // Extract itinerary data from packages
    const itineraries = [];
    
    if (Array.isArray(destination.packages)) {
      destination.packages.forEach((category) => {
        // Filter by category if specified
        if (categoryName && category.category_name !== categoryName) {
          return;
        }

        if (Array.isArray(category.packages)) {
          category.packages.forEach((pkg) => {
            // Filter by package number if specified
            if (packageNumber && pkg.number !== parseInt(packageNumber)) {
              return;
            }

            // Only include packages that have itinerary data
            if (pkg.itinerary && Array.isArray(pkg.itinerary) && pkg.itinerary.length > 0) {
              itineraries.push({
                packageId: `${destination.id}-${category.category_name}-${pkg.number}`,
                packageNumber: pkg.number,
                packageTitle: pkg.title,
                categoryName: category.category_name,
                destinationId: destination.id,
                destinationTitle: destination.title,
                itinerary: pkg.itinerary.map((day) => {
                  const dayData = {
                    day: day.day,
                    description: day.description,
                    start_location: {
                      lat: day.start_location?.latitude || 0,
                      lng: day.start_location?.longitude || 0,
                    },
                  };
                  // Include end_location if it exists
                  if (day.end_location) {
                    dayData.end_location = {
                      lat: day.end_location.latitude || 0,
                      lng: day.end_location.longitude || 0,
                    };
                  }
                  return dayData;
                }),
              });
            }
          });
        }
      });
    }

    res.json({
      success: true,
      data: itineraries,
      destination: {
        id: destination.id,
        title: destination.title,
        slug: destination.slug,
        location: destination.location,
      },
    });
  } catch (error) {
    console.error("Error fetching packages itinerary:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch itinerary data",
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
  getDestinationPackages,
  getPackagesItinerary,
};
