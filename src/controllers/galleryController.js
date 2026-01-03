const { Gallery, Package, Destination, AdminUser } = require("../models");
const { Op } = require("sequelize");
const { convertToRelativePath } = require("../utils/filePath");
const fs = require("fs");
const path = require("path");
const {
  logCreate,
  logUpdate,
  logDelete,
} = require("../utils/auditLogger");

// Normalize gallery item to ensure JSON arrays are properly formatted
const normalizeGalleryItem = (item) => {
  if (!item) return item;
  const plain = item.toJSON ? item.toJSON() : item;
  return {
    ...plain,
    tags: Array.isArray(plain.tags) ? plain.tags : [],
  };
};

// Validate gallery data
const validateGalleryData = (data) => {
  const errors = [];

  if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
    errors.push("Title is required and must be a non-empty string");
  }

  if (!data.type || !["image", "video"].includes(data.type)) {
    errors.push("Type must be either 'image' or 'video'");
  }

  if (!data.category || !["wildlife", "landscapes", "safari", "culture", "accommodation", "activities", "general"].includes(data.category)) {
    errors.push("Category must be one of: wildlife, landscapes, safari, culture, accommodation, activities, general");
  }

  if (data.tags) {
    if (Array.isArray(data.tags)) {
      // Tags is already an array, valid
    } else if (typeof data.tags === 'string') {
      try {
        const parsed = JSON.parse(data.tags);
        if (!Array.isArray(parsed)) {
          errors.push("Tags must be an array or a JSON string representing an array");
        }
      } catch (e) {
        errors.push("Tags must be an array or a valid JSON string representing an array");
      }
    } else {
      errors.push("Tags must be an array or a JSON string representing an array");
    }
  }

  if (data.priority !== undefined && data.priority !== null && data.priority !== '' && (isNaN(Number(data.priority)) || Number(data.priority) < 0)) {
    errors.push("Priority must be a non-negative number");
  }

  // Type-specific validations
  if (data.type === "image") {
    if (data.width !== undefined && data.width !== null && data.width !== '' && (isNaN(Number(data.width)) || Number(data.width) <= 0)) {
      errors.push("Width must be a positive number for images");
    }
    if (data.height !== undefined && data.height !== null && data.height !== '' && (isNaN(Number(data.height)) || Number(data.height) <= 0)) {
      errors.push("Height must be a positive number for images");
    }
  }

  if (data.type === "video") {
    if (data.duration !== undefined && data.duration !== null && data.duration !== '' && (isNaN(Number(data.duration)) || Number(data.duration) <= 0)) {
      errors.push("Duration must be a positive number for videos");
    }
  }

  return errors;
};

// Process tags array
const processTags = (tags) => {
  if (!tags) return [];

  if (Array.isArray(tags)) {
    return tags.filter(tag => tag && typeof tag === 'string' && tag.trim()).map(tag => tag.trim());
  }

  if (typeof tags === 'string') {
    try {
      const parsed = JSON.parse(tags);
      if (Array.isArray(parsed)) {
        return parsed.filter(tag => tag && typeof tag === 'string' && tag.trim()).map(tag => tag.trim());
      }
    } catch (e) {
      // Not JSON, treat as single string
      return tags.trim() ? [tags.trim()] : [];
    }
  }

  return [];
};

// ==================== PUBLIC ENDPOINTS ====================

// Get all public gallery items
const getPublicGalleryItems = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      all = "false",
      type,
      category,
      location,
      packageId,
      destinationId,
      featured,
      search,
      sortBy = "priority",
      sortOrder = "DESC",
    } = req.query;

    const returnAll = all === "true";
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    // Build where clause
    const where = { isActive: true, isDeleted: false };

    if (type && ["image", "video"].includes(type)) {
      where.type = type;
    }

    if (category && ["wildlife", "landscapes", "safari", "culture", "accommodation", "activities", "general"].includes(category)) {
      where.category = category;
    }

    if (location) {
      where.location = { [Op.like]: `%${location}%` };
    }

    if (packageId) {
      where.packageId = packageId;
    }

    if (destinationId) {
      where.destinationId = destinationId;
    }

    if (featured === "true") {
      where.isFeatured = true;
    }

    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        { location: { [Op.like]: `%${search}%` } },
        { tags: { [Op.contains]: [search] } },
      ];
    }

    // Build order clause
    let order = [["priority", "DESC"], ["createdAt", "DESC"]];

    if (sortBy === "createdAt" || sortBy === "priority") {
      const orderDirection = sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";
      order = [[sortBy, orderDirection], ["priority", "DESC"], ["createdAt", "DESC"]];
    }

    let items, totalCount;

    if (returnAll) {
      // Return all items without pagination
      const rows = await Gallery.findAll({
        where,
        order,
        include: [
          {
            model: Package,
            as: "package",
            attributes: ["id", "title"],
            required: false,
          },
          {
            model: Destination,
            as: "destination",
            attributes: ["id", "title", "slug"],
            required: false,
          },
        ],
      });
      items = rows.map(normalizeGalleryItem);
      totalCount = rows.length;
    } else {
      // Return paginated results
      const { count, rows } = await Gallery.findAndCountAll({
        where,
        limit: limitNum,
        offset,
        order,
        include: [
          {
            model: Package,
            as: "package",
            attributes: ["id", "title"],
            required: false,
          },
          {
            model: Destination,
            as: "destination",
            attributes: ["id", "title", "slug"],
            required: false,
          },
        ],
      });

      items = rows.map(normalizeGalleryItem);
      totalCount = count;
    }

    const response = {
      success: true,
      data: {
        items,
      },
    };

    // Only include pagination info if not returning all items
    if (!returnAll) {
      const totalPages = Math.ceil(totalCount / limitNum);
      response.data.pagination = {
        currentPage: pageNum,
        totalPages,
        totalItems: totalCount,
        itemsPerPage: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      };
    }

    res.json(response);
  } catch (error) {
    console.error("Error fetching public gallery items:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch gallery items",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Get single gallery item by ID
const getPublicGalleryItem = async (req, res) => {
  try {
    const { id } = req.params;

    const item = await Gallery.findOne({
      where: { id, isActive: true, isDeleted: false },
      include: [
        {
          model: Package,
          as: "package",
          attributes: ["id", "title", "slug", "description"],
          required: false,
        },
        {
          model: Destination,
          as: "destination",
          attributes: ["id", "title", "slug", "description"],
          required: false,
        },
      ],
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Gallery item not found",
      });
    }

    res.json({
      success: true,
      data: normalizeGalleryItem(item),
    });
  } catch (error) {
    console.error("Error fetching gallery item:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch gallery item",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// ==================== ADMIN ENDPOINTS ====================

// Get all gallery items (admin)
const getGalleryItems = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      type,
      category,
      isActive,
      isFeatured,
      search,
      sortBy = "createdAt",
      sortOrder = "DESC",
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    // Build where clause
    const where = { isDeleted: false };

    if (type && ["image", "video"].includes(type)) {
      where.type = type;
    }

    if (category && ["wildlife", "landscapes", "safari", "culture", "accommodation", "activities", "general"].includes(category)) {
      where.category = category;
    }

    if (isActive !== undefined) {
      where.isActive = isActive === "true";
    }

    if (isFeatured !== undefined) {
      where.isFeatured = isFeatured === "true";
    }

    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        { location: { [Op.like]: `%${search}%` } },
        { tags: { [Op.contains]: [search] } },
      ];
    }

    // Build order clause
    let order = [["createdAt", "DESC"]];

    if (["createdAt", "priority", "title", "type", "category"].includes(sortBy)) {
      const orderDirection = sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";
      order = [[sortBy, orderDirection]];
    }

    // Get total count and paginated results
    const { count, rows } = await Gallery.findAndCountAll({
      where,
      limit: limitNum,
      offset,
      order,
      include: [
        // {
        //   model: AdminUser,
        //   as: "creator",
        //   attributes: ["id", "full_name", "email"],
        //   required: false,
        // },
        {
          model: Package,
          as: "package",
          attributes: ["id", "title"],
          required: false,
        },
        {
          model: Destination,
          as: "destination",
          attributes: ["id", "title", "slug"],
          required: false,
        },
      ],
    });

    const totalPages = Math.ceil(count / limitNum);

    res.json({
      success: true,
      data: {
        items: rows.map(normalizeGalleryItem),
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalItems: count,
          itemsPerPage: limitNum,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching gallery items:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch gallery items",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Get single gallery item (admin)
const getGalleryItem = async (req, res) => {
  try {
    const { id } = req.params;

    const item = await Gallery.findOne({
      where: { id, isDeleted: false },
      include: [
        // {
        //   model: AdminUser,
        //   as: "creator",
        //   attributes: ["id", "full_name", "email"],
        //   required: false,
        // },
        {
          model: Package,
          as: "package",
          attributes: ["id", "title"],
          required: false,
        },
        {
          model: Destination,
          as: "destination",
          attributes: ["id", "title", "slug"],
          required: false,
        },
      ],
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Gallery item not found",
      });
    }

    res.json({
      success: true,
      data: normalizeGalleryItem(item),
    });
  } catch (error) {
    console.error("Error fetching gallery item:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch gallery item",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Create gallery item
const createGalleryItem = async (req, res) => {
  try {
    const data = req.body;
    const userId = req.user?.id;

    // Validate data
    const validationErrors = validateGalleryData(data);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationErrors,
      });
    }

    // Process tags
    const processedTags = processTags(data.tags);

    // Create gallery item
    const galleryItem = await Gallery.create({
      ...data,
      tags: processedTags,
      created_by: userId,
      updated_by: userId,
    });

    // Log the creation
    await logCreate(userId, "gallery", galleryItem.id, {
      title: galleryItem.title,
      type: galleryItem.type,
      category: galleryItem.category,
    }, req);

    // Fetch with associations for response
    const createdItem = await Gallery.findByPk(galleryItem.id, {
      include: [
        // {
        //   model: AdminUser,
        //   as: "creator",
        //   attributes: ["id", "full_name", "email"],
        //   required: false,
        // },
        {
          model: Package,
          as: "package",
          attributes: ["id", "title"],
          required: false,
        },
        {
          model: Destination,
          as: "destination",
          attributes: ["id", "title", "slug"],
          required: false,
        },
      ],
    });

    res.status(201).json({
      success: true,
      message: "Gallery item created successfully",
      data: normalizeGalleryItem(createdItem),
    });
  } catch (error) {
    console.error("Error creating gallery item:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create gallery item",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Update gallery item
const updateGalleryItem = async (req, res) => {
  try {
    const { id } = req.params;
    let data = req.body;
    const userId = req.user?.id;


    // Handle multipart form data - convert string values to appropriate types
    if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
      data = {
        ...data,
        isActive: data.isActive === 'true' || data.isActive === true,
        isFeatured: data.isFeatured === 'true' || data.isFeatured === true,
        priority: data.priority ? parseInt(data.priority) : 0,
        width: data.width ? parseInt(data.width) : null,
        height: data.height ? parseInt(data.height) : null,
        duration: data.duration ? parseFloat(data.duration) : null,
        thumbnailPath: data.thumbnailPath || null,
        tags: data.tags ? processTags(data.tags) : [],
        altText: data.altText ? (Array.isArray(data.altText) ? data.altText[0] : data.altText) : null,
      };

      // Clear video-specific fields for images, image-specific fields for videos
      if (data.type === 'image') {
        data.duration = null;
        data.thumbnailPath = null;
      } else if (data.type === 'video') {
        data.width = null;
        data.height = null;
        data.altText = null;
      }
    } else {
      // For JSON requests, process tags if present
      if (data.tags) {
        data.tags = processTags(data.tags);
      }

      // Ensure altText is a string or null
      if (data.altText !== undefined) {
        data.altText = Array.isArray(data.altText) ? data.altText[0] : (data.altText || null);
      }

      // Clear video-specific fields for images, image-specific fields for videos
      if (data.type === 'image') {
        data.duration = null;
        data.thumbnailPath = null;
      } else if (data.type === 'video') {
        data.width = null;
        data.height = null;
        data.altText = null;
      }
    }

    // Find existing item
    const existingItem = await Gallery.findOne({
      where: { id, isDeleted: false },
    });

    if (!existingItem) {
      return res.status(404).json({
        success: false,
        message: "Gallery item not found",
      });
    }

    // Validate data
    const validationErrors = validateGalleryData(data);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationErrors,
      });
    }

    // Process tags
    const processedTags = processTags(data.tags);

    // Handle file upload if a new file is provided
    if (req.file) {
      // Determine file type from uploaded file
      const isVideo = req.file.mimetype.startsWith("video/");
      const newType = isVideo ? "video" : "image";
      
      // Convert file path to relative path
      const relativePath = convertToRelativePath(req.file.path);
      
      // Update file-related fields
      data.filePath = relativePath;
      data.originalName = req.file.originalname;
      data.mimeType = req.file.mimetype;
      data.fileSize = req.file.size;
      data.type = newType;
      
      // Clear type-specific fields based on new type
      if (newType === "image") {
        data.duration = null;
        data.thumbnailPath = null;
        data.width = null;
        data.height = null;
      } else if (newType === "video") {
        data.width = null;
        data.height = null;
        data.altText = null;
        data.duration = null;
        data.thumbnailPath = null;
      }
    } else {
      // If no new file is uploaded, preserve existing filePath and file-related fields
      // Don't overwrite filePath if it's not in the update data
      if (!data.filePath) {
        delete data.filePath; // Remove from update data to preserve existing value
      }
      if (!data.originalName) {
        delete data.originalName;
      }
      if (!data.mimeType) {
        delete data.mimeType;
      }
      if (!data.fileSize) {
        delete data.fileSize;
      }
      if (!data.type) {
        delete data.type; // Preserve existing type
      }
    }

    // Store old values for logging
    const oldValues = {
      title: existingItem.title,
      type: existingItem.type,
      category: existingItem.category,
      isActive: existingItem.isActive,
      isFeatured: existingItem.isFeatured,
    };

    // Update gallery item
    await existingItem.update({
      ...data,
      tags: processedTags,
      updated_by: userId,
    });

    // Log the update
    await logUpdate(userId, "gallery", id, oldValues, {
      title: existingItem.title,
      type: existingItem.type,
      category: existingItem.category,
      isActive: existingItem.isActive,
      isFeatured: existingItem.isFeatured,
    }, req);

    // Fetch updated item with associations
    const updatedItem = await Gallery.findByPk(id, {
      include: [
        // {
        //   model: AdminUser,
        //   as: "creator",
        //   attributes: ["id", "full_name", "email"],
        //   required: false,
        // },
        {
          model: Package,
          as: "package",
          attributes: ["id", "title"],
          required: false,
        },
        {
          model: Destination,
          as: "destination",
          attributes: ["id", "title", "slug"],
          required: false,
        },
      ],
    });

    res.json({
      success: true,
      message: "Gallery item updated successfully",
      data: normalizeGalleryItem(updatedItem),
    });
  } catch (error) {
    console.error("Error updating gallery item:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update gallery item",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Delete gallery item (soft delete)
const deleteGalleryItem = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // Find existing item
    const existingItem = await Gallery.findOne({
      where: { id, isDeleted: false },
    });

    if (!existingItem) {
      return res.status(404).json({
        success: false,
        message: "Gallery item not found",
      });
    }

    // Store old values for logging
    const oldValues = {
      title: existingItem.title,
      type: existingItem.type,
      category: existingItem.category,
      isActive: existingItem.isActive,
    };

    // Soft delete
    await existingItem.update({
      isDeleted: true,
      updated_by: userId,
    });

    // Log the deletion
    await logDelete(userId, "gallery", id, oldValues, req);

    res.json({
      success: true,
      message: "Gallery item deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting gallery item:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete gallery item",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Upload and create gallery item
const uploadGalleryItem = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const file = req.file;
    const { title, description, category, tags, location, packageId, destinationId, altText, isFeatured, priority } = req.body;

    // Determine file type
    const isVideo = file.mimetype.startsWith("video/");
    const type = isVideo ? "video" : "image";

    // Convert file path to relative path
    const relativePath = convertToRelativePath(file.path);

    // Get image dimensions and set video-specific fields
    let width = null;
    let height = null;
    let duration = null;
    let thumbnailPath = null;

    if (type === "image") {
      // For now, we'll set these as null - in production you'd extract actual dimensions
      // You can use libraries like 'sharp' or 'image-size' to get actual dimensions
      width = null;
      height = null;
    } else if (type === "video") {
      // For videos, duration and thumbnail will be set later by a video processing job
      // For now, set them to null
      duration = null;
      thumbnailPath = null;
    }

    // Process tags
    const processedTags = processTags(tags);

    // Create gallery item
    const galleryItem = await Gallery.create({
      title: title || file.originalname,
      description: description || "",
      type,
      filePath: relativePath,
      originalName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
      width,
      height,
      duration,
      thumbnailPath,
      altText: type === "image" ? altText : null,
      category: category || "general",
      tags: processedTags,
      location,
      packageId: packageId || null,
      destinationId: destinationId || null,
      isFeatured: isFeatured === "true",
      priority: priority ? parseInt(priority) : 0,
      created_by: userId,
      updated_by: userId,
    });

    // Log the creation
    await logCreate(userId, "gallery", galleryItem.id, {
      title: galleryItem.title,
      type: galleryItem.type,
      category: galleryItem.category,
      fileSize: galleryItem.fileSize,
    }, req);

    // Fetch with associations for response
    const createdItem = await Gallery.findByPk(galleryItem.id, {
      include: [
        // {
        //   model: AdminUser,
        //   as: "creator",
        //   attributes: ["id", "full_name", "email"],
        //   required: false,
        // },
        {
          model: Package,
          as: "package",
          attributes: ["id", "title"],
          required: false,
        },
        {
          model: Destination,
          as: "destination",
          attributes: ["id", "title", "slug"],
          required: false,
        },
      ],
    });

    res.status(201).json({
      success: true,
      message: "Gallery item uploaded successfully",
      data: normalizeGalleryItem(createdItem),
    });
  } catch (error) {
    console.error("Error uploading gallery item:", error);

    // Clean up uploaded file if gallery item creation failed
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error("Error cleaning up uploaded file:", cleanupError);
      }
    }

    res.status(500).json({
      success: false,
      message: "Failed to upload gallery item",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Get gallery statistics
const getGalleryStats = async (req, res) => {
  try {
    const [totalItems, imageCount, videoCount, activeCount, featuredCount] = await Promise.all([
      Gallery.count({ where: { isDeleted: false } }),
      Gallery.count({ where: { type: "image", isDeleted: false } }),
      Gallery.count({ where: { type: "video", isDeleted: false } }),
      Gallery.count({ where: { isActive: true, isDeleted: false } }),
      Gallery.count({ where: { isFeatured: true, isDeleted: false } }),
    ]);

    const totalSizeResult = await Gallery.sum("fileSize", {
      where: { isDeleted: false },
    });

    // Get category breakdown
    const categoryStats = await Gallery.findAll({
      attributes: [
        "category",
        [Gallery.sequelize.fn("COUNT", Gallery.sequelize.col("category")), "count"],
      ],
      where: { isDeleted: false },
      group: ["category"],
      raw: true,
    });

    res.json({
      success: true,
      data: {
        totalItems,
        imageCount,
        videoCount,
        activeCount,
        featuredCount,
        totalSize: totalSizeResult || 0,
        categoryBreakdown: categoryStats,
      },
    });
  } catch (error) {
    console.error("Error fetching gallery stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch gallery statistics",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = {
  // Public endpoints
  getPublicGalleryItems,
  getPublicGalleryItem,

  // Admin endpoints
  getGalleryItems,
  getGalleryItem,
  createGalleryItem,
  updateGalleryItem,
  deleteGalleryItem,
  uploadGalleryItem,
  getGalleryStats,
};
