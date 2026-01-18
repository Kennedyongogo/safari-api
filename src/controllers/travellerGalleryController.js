const { TravellerGallery } = require("../models");
const { Op } = require("sequelize");
const { convertToRelativePath } = require("../utils/filePath");
const fs = require("fs");
const path = require("path");
const { logCreate, logUpdate, logDelete } = require("../utils/auditLogger");

const VALID_CATEGORIES = [
  "family",
  "honeymoon",
  "couples",
  "friends",
  "women",
  "general",
];

// Normalize gallery item to ensure JSON arrays are properly formatted
const normalizeItem = (item) => {
  if (!item) return item;
  const plain = item.toJSON ? item.toJSON() : item;
  return {
    ...plain,
    tags: Array.isArray(plain.tags) ? plain.tags : [],
  };
};

const processTags = (tags) => {
  if (!tags) return [];

  if (Array.isArray(tags)) {
    return tags
      .filter((tag) => tag && typeof tag === "string" && tag.trim())
      .map((tag) => tag.trim());
  }

  if (typeof tags === "string") {
    try {
      const parsed = JSON.parse(tags);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((tag) => tag && typeof tag === "string" && tag.trim())
          .map((tag) => tag.trim());
      }
    } catch (e) {
      return tags.trim() ? [tags.trim()] : [];
    }
  }

  return [];
};

const validateTravellerGalleryData = (data) => {
  const errors = [];

  if (!data.title || typeof data.title !== "string" || !data.title.trim()) {
    errors.push("Title is required and must be a non-empty string");
  }

  if (!data.type || !["image", "video"].includes(data.type)) {
    errors.push("Type must be either 'image' or 'video'");
  }

  if (!data.category || !VALID_CATEGORIES.includes(data.category)) {
    errors.push(
      `Category must be one of: ${VALID_CATEGORIES.filter(
        (c) => c !== "general"
      ).join(", ")}, general`
    );
  }

  if (
    data.priority !== undefined &&
    data.priority !== null &&
    data.priority !== "" &&
    (isNaN(Number(data.priority)) || Number(data.priority) < 0)
  ) {
    errors.push("Priority must be a non-negative number");
  }

  return errors;
};

// ==================== PUBLIC ENDPOINTS ====================

const getPublicTravellerGalleryItems = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      all = "false",
      type,
      category,
      featured,
      search,
      sortBy = "priority",
      sortOrder = "DESC",
    } = req.query;

    const returnAll = all === "true";
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    const where = { isActive: true, isDeleted: false };

    if (type && ["image", "video"].includes(type)) {
      where.type = type;
    }

    if (category && VALID_CATEGORIES.includes(category)) {
      where.category = category;
    }

    if (featured === "true") {
      where.isFeatured = true;
    }

    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        { tags: { [Op.contains]: [search] } },
      ];
    }

    let order = [
      ["priority", "DESC"],
      ["createdAt", "DESC"],
    ];
    if (sortBy === "createdAt" || sortBy === "priority") {
      const direction = sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";
      order = [
        [sortBy, direction],
        ["priority", "DESC"],
        ["createdAt", "DESC"],
      ];
    }

    if (returnAll) {
      const rows = await TravellerGallery.findAll({ where, order });
      return res.json({
        success: true,
        data: { items: rows.map(normalizeItem) },
      });
    }

    const { count, rows } = await TravellerGallery.findAndCountAll({
      where,
      limit: limitNum,
      offset,
      order,
    });

    const totalPages = Math.ceil(count / limitNum);

    res.json({
      success: true,
      data: {
        items: rows.map(normalizeItem),
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
    console.error("Error fetching public traveller gallery items:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch traveller gallery items",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const getPublicTravellerGalleryItem = async (req, res) => {
  try {
    const { id } = req.params;

    const item = await TravellerGallery.findOne({
      where: { id, isActive: true, isDeleted: false },
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Traveller gallery item not found",
      });
    }

    res.json({
      success: true,
      data: normalizeItem(item),
    });
  } catch (error) {
    console.error("Error fetching public traveller gallery item:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch traveller gallery item",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// ==================== ADMIN ENDPOINTS ====================

const getTravellerGalleryItems = async (req, res) => {
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

    const where = { isDeleted: false };

    if (type && ["image", "video"].includes(type)) {
      where.type = type;
    }
    if (category && VALID_CATEGORIES.includes(category)) {
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
        { tags: { [Op.contains]: [search] } },
      ];
    }

    let order = [["createdAt", "DESC"]];
    if (["createdAt", "priority", "title", "type", "category"].includes(sortBy)) {
      const direction = sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";
      order = [[sortBy, direction]];
    }

    const { count, rows } = await TravellerGallery.findAndCountAll({
      where,
      limit: limitNum,
      offset,
      order,
    });

    const totalPages = Math.ceil(count / limitNum);

    res.json({
      success: true,
      data: {
        items: rows.map(normalizeItem),
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
    console.error("Error fetching traveller gallery items:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch traveller gallery items",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const getTravellerGalleryItem = async (req, res) => {
  try {
    const { id } = req.params;

    const item = await TravellerGallery.findOne({
      where: { id, isDeleted: false },
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Traveller gallery item not found",
      });
    }

    res.json({
      success: true,
      data: normalizeItem(item),
    });
  } catch (error) {
    console.error("Error fetching traveller gallery item:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch traveller gallery item",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const createTravellerGalleryItem = async (req, res) => {
  try {
    const data = req.body;
    const userId = req.user?.id;

    const validationErrors = validateTravellerGalleryData(data);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationErrors,
      });
    }

    const processedTags = processTags(data.tags);

    const item = await TravellerGallery.create({
      ...data,
      tags: processedTags,
      created_by: userId,
      updated_by: userId,
    });

    await logCreate(
      userId,
      "traveller_gallery",
      item.id,
      { title: item.title, type: item.type, category: item.category },
      req
    );

    res.status(201).json({
      success: true,
      message: "Traveller gallery item created successfully",
      data: normalizeItem(item),
    });
  } catch (error) {
    console.error("Error creating traveller gallery item:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create traveller gallery item",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const updateTravellerGalleryItem = async (req, res) => {
  try {
    const { id } = req.params;
    let data = req.body;
    const userId = req.user?.id;

    // Handle multipart form data - convert string values to appropriate types
    if (
      req.headers["content-type"] &&
      req.headers["content-type"].includes("multipart/form-data")
    ) {
      data = {
        ...data,
        isActive: data.isActive === "true" || data.isActive === true,
        isFeatured: data.isFeatured === "true" || data.isFeatured === true,
        priority: data.priority ? parseInt(data.priority) : 0,
        width: data.width ? parseInt(data.width) : null,
        height: data.height ? parseInt(data.height) : null,
        duration: data.duration ? parseFloat(data.duration) : null,
        thumbnailPath: data.thumbnailPath || null,
        tags: data.tags ? processTags(data.tags) : [],
        altText: data.altText
          ? Array.isArray(data.altText)
            ? data.altText[0]
            : data.altText
          : null,
      };

      if (data.type === "image") {
        data.duration = null;
        data.thumbnailPath = null;
      } else if (data.type === "video") {
        data.width = null;
        data.height = null;
        data.altText = null;
      }
    } else {
      if (data.tags) {
        data.tags = processTags(data.tags);
      }
      if (data.altText !== undefined) {
        data.altText = Array.isArray(data.altText)
          ? data.altText[0]
          : data.altText || null;
      }
      if (data.type === "image") {
        data.duration = null;
        data.thumbnailPath = null;
      } else if (data.type === "video") {
        data.width = null;
        data.height = null;
        data.altText = null;
      }
    }

    const existing = await TravellerGallery.findOne({
      where: { id, isDeleted: false },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Traveller gallery item not found",
      });
    }

    // Handle file upload if a new file is provided
    if (req.file) {
      const isVideo = req.file.mimetype.startsWith("video/");
      const newType = isVideo ? "video" : "image";
      const relativePath = convertToRelativePath(req.file.path);

      data.filePath = relativePath;
      data.originalName = req.file.originalname;
      data.mimeType = req.file.mimetype;
      data.fileSize = req.file.size;
      data.type = newType;

      if (newType === "image") {
        data.duration = null;
        data.thumbnailPath = null;
      } else {
        data.width = null;
        data.height = null;
        data.altText = null;
        data.duration = null;
        data.thumbnailPath = null;
      }
    } else {
      if (!data.filePath) delete data.filePath;
      if (!data.originalName) delete data.originalName;
      if (!data.mimeType) delete data.mimeType;
      if (!data.fileSize) delete data.fileSize;
      if (!data.type) delete data.type;
    }

    const validationErrors = validateTravellerGalleryData({
      ...existing.toJSON(),
      ...data,
      // allow title/type/category to be inherited from existing if not provided
      title: data.title ?? existing.title,
      type: data.type ?? existing.type,
      category: data.category ?? existing.category,
    });
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationErrors,
      });
    }

    const oldValues = {
      title: existing.title,
      type: existing.type,
      category: existing.category,
      isActive: existing.isActive,
      isFeatured: existing.isFeatured,
    };

    await existing.update({
      ...data,
      tags: data.tags ? processTags(data.tags) : existing.tags,
      updated_by: userId,
    });

    await logUpdate(
      userId,
      "traveller_gallery",
      id,
      oldValues,
      {
        title: existing.title,
        type: existing.type,
        category: existing.category,
        isActive: existing.isActive,
        isFeatured: existing.isFeatured,
      },
      req
    );

    res.json({
      success: true,
      message: "Traveller gallery item updated successfully",
      data: normalizeItem(existing),
    });
  } catch (error) {
    console.error("Error updating traveller gallery item:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update traveller gallery item",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const deleteTravellerGalleryItem = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const existing = await TravellerGallery.findOne({
      where: { id, isDeleted: false },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Traveller gallery item not found",
      });
    }

    const oldValues = {
      title: existing.title,
      type: existing.type,
      category: existing.category,
      isActive: existing.isActive,
    };

    await existing.update({
      isDeleted: true,
      updated_by: userId,
    });

    await logDelete(userId, "traveller_gallery", id, oldValues, req);

    res.json({
      success: true,
      message: "Traveller gallery item deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting traveller gallery item:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete traveller gallery item",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const uploadTravellerGalleryItem = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const file = req.file;
    const {
      title,
      description,
      category,
      tags,
      altText,
      isFeatured,
      priority,
      isActive,
    } = req.body;

    const isVideo = file.mimetype.startsWith("video/");
    const type = isVideo ? "video" : "image";
    const relativePath = convertToRelativePath(file.path);

    const processedTags = processTags(tags);

    const item = await TravellerGallery.create({
      title: title || file.originalname,
      description: description || "",
      type,
      filePath: relativePath,
      originalName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
      width: null,
      height: null,
      duration: null,
      thumbnailPath: null,
      altText: type === "image" ? altText : null,
      category: category || "general",
      tags: processedTags,
      isFeatured: isFeatured === "true",
      priority: priority ? parseInt(priority) : 0,
      isActive: isActive === undefined ? true : isActive === "true",
      created_by: userId,
      updated_by: userId,
    });

    await logCreate(
      userId,
      "traveller_gallery",
      item.id,
      {
        title: item.title,
        type: item.type,
        category: item.category,
        fileSize: item.fileSize,
      },
      req
    );

    res.status(201).json({
      success: true,
      message: "Traveller gallery item uploaded successfully",
      data: normalizeItem(item),
    });
  } catch (error) {
    console.error("Error uploading traveller gallery item:", error);

    // Clean up uploaded file if DB write failed
    if (req.file?.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error("Error cleaning up uploaded file:", cleanupError);
      }
    }

    res.status(500).json({
      success: false,
      message: "Failed to upload traveller gallery item",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Simple categories endpoint for UI tabs/cards
const getTravellerGalleryCategories = async (req, res) => {
  res.json({
    success: true,
    data: {
      categories: VALID_CATEGORIES.filter((c) => c !== "general"),
    },
  });
};

module.exports = {
  // Public
  getPublicTravellerGalleryItems,
  getPublicTravellerGalleryItem,
  getTravellerGalleryCategories,

  // Admin
  getTravellerGalleryItems,
  getTravellerGalleryItem,
  createTravellerGalleryItem,
  updateTravellerGalleryItem,
  deleteTravellerGalleryItem,
  uploadTravellerGalleryItem,
};

