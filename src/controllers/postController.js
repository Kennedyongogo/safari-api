const { Post, AdminUser, sequelize } = require("../models");
const { Op } = require("sequelize");
const { convertToRelativePath } = require("../utils/filePath");
const {
  logCreate,
  logUpdate,
  logDelete,
  logStatusChange,
} = require("../utils/auditLogger");

// Create post
const createPost = async (req, res) => {
  try {
    const {
      type,
      title,
      content,
      banner,
      start_date,
      end_date,
      location,
      status,
    } = req.body;

    // Validate required fields
    if (!type || !title || !content) {
      return res.status(400).json({
        success: false,
        message: "Please provide type, title, and content",
      });
    }

    if (type !== "news" && type !== "event") {
      return res.status(400).json({
        success: false,
        message: "Type must be either 'news' or 'event'",
      });
    }

    // Validate event-specific fields
    if (type === "event" && !start_date) {
      return res.status(400).json({
        success: false,
        message: "Start date is required for events",
      });
    }

    const created_by = req.user?.id;

    // Handle image uploads based on type
    let imagesArray = [];
    let bannerPath = null;

    // Handle uploads from multer.fields() format
    if (req.files) {
      if (req.files.post_images && req.files.post_images.length > 0) {
        // Multiple images for news
        imagesArray = req.files.post_images.map((file) => ({
          path: convertToRelativePath(file.path),
          timestamp: new Date(),
        }));
      }
      if (req.files.post_banner && req.files.post_banner.length > 0) {
        // Single banner for events
        bannerPath = convertToRelativePath(req.files.post_banner[0].path);
      }
    } else if (req.file) {
      // Fallback for single file upload
      if (type === "news") {
        imagesArray = [{
          path: convertToRelativePath(req.file.path),
          timestamp: new Date(),
        }];
      } else if (type === "event") {
        bannerPath = convertToRelativePath(req.file.path);
      }
    }

    // Allow banner to be passed in body if not uploaded
    if (type === "event" && !bannerPath && banner) {
      bannerPath = banner;
    }

    // Determine default status based on type
    let defaultStatus = status;
    if (!defaultStatus) {
      defaultStatus = type === "news" ? "draft" : "upcoming";
    }

    // Create post
    const post = await Post.create({
      type,
      title,
      content,
      images: type === "news" ? imagesArray : [],
      banner: type === "event" ? bannerPath : null,
      start_date: type === "event" ? start_date : null,
      end_date: type === "event" ? end_date : null,
      location: type === "event" ? location : null,
      status: defaultStatus,
      created_by,
    });

    // Log audit trail
    if (req.user) {
      await logCreate(
        req.user.id,
        "post",
        post.id,
        {
          type: post.type,
          title: post.title,
        },
        req
      );
    }

    res.status(201).json({
      success: true,
      message: `${type === "news" ? "News" : "Event"} created successfully`,
      data: post,
    });
  } catch (error) {
    console.error("Error creating post:", error);
    res.status(500).json({
      success: false,
      message: "Error creating post",
      error: error.message,
    });
  }
};

// Get all posts with filters
const getAllPosts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      type,
      status,
      sortBy = "createdAt",
      sortOrder = "DESC",
    } = req.query;

    // Build where clause
    const where = {};
    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { content: { [Op.like]: `%${search}%` } },
      ];
    }
    if (type) {
      where.type = type;
    }
    if (status) {
      where.status = status;
    }

    // Calculate offset
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Get total count and paginated results
    const { count, rows } = await Post.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sortBy, sortOrder]],
      include: [
        {
          model: AdminUser,
          as: "creator",
          attributes: ["id", "full_name", "email"],
          required: false,
        },
      ],
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
    console.error("Error fetching posts:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching posts",
      error: error.message,
    });
  }
};

// Get public posts (for public website)
const getPublicPosts = async (req, res) => {
  try {
    const { type, limit = 10 } = req.query;

    // Public should only see:
    // - News: "published" status only
    // - Events: "upcoming" and "ongoing" statuses only
    let where = {};

    if (type) {
      // If type is specified, filter by type and appropriate status
      where.type = type;
      where.status = {
        [Op.in]: type === "event" 
          ? ["upcoming", "ongoing"]
          : ["published"],
      };
    } else {
      // If no type specified, return both news (published) and events (upcoming, ongoing)
      where[Op.or] = [
        {
          type: "news",
          status: "published",
        },
        {
          type: "event",
          status: {
            [Op.in]: ["upcoming", "ongoing"],
          },
        },
      ];
    }

    const posts = await Post.findAll({
      where,
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      attributes: [
        "id",
        "type",
        "title",
        "content",
        "images",
        "banner",
        "start_date",
        "end_date",
        "location",
        "status",
        "createdAt",
        "updatedAt",
      ],
    });

    res.status(200).json({
      success: true,
      count: posts.length,
      data: posts,
    });
  } catch (error) {
    console.error("Error fetching public posts:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching posts",
      error: error.message,
    });
  }
};

// Get post by ID
const getPostById = async (req, res) => {
  try {
    const { id } = req.params;

    const post = await Post.findByPk(id, {
      include: [
        {
          model: AdminUser,
          as: "creator",
          attributes: ["id", "full_name", "email"],
          required: false,
        },
      ],
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    res.status(200).json({
      success: true,
      data: post,
    });
  } catch (error) {
    console.error("Error fetching post:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching post",
      error: error.message,
    });
  }
};

// Get public post by ID (only published posts)
const getPublicPostById = async (req, res) => {
  try {
    const { id } = req.params;

    // First get the post to check its type
    const post = await Post.findByPk(id);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    // Check if post is visible to public based on type and status
    const isPublic = 
      (post.type === "news" && post.status === "published") ||
      (post.type === "event" && ["upcoming", "ongoing"].includes(post.status));

    if (!isPublic) {
      return res.status(404).json({
        success: false,
        message: "Post not found or not available to public",
      });
    }

    // Return the post with limited attributes
    res.status(200).json({
      success: true,
      data: {
        id: post.id,
        type: post.type,
        title: post.title,
        content: post.content,
        images: post.images,
        banner: post.banner,
        start_date: post.start_date,
        end_date: post.end_date,
        location: post.location,
        status: post.status,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error fetching public post:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching post",
      error: error.message,
    });
  }
};

// Update post
const updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      content,
      banner,
      start_date,
      end_date,
      location,
      status,
    } = req.body;

    const post = await Post.findByPk(id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    // Store old values for audit logging
    const oldValues = {
      title: post.title,
      content: post.content,
      status: post.status,
    };

    // Handle image uploads based on type
    let updateData = {};

    if (post.type === "news") {
      // For news: handle multiple images
      let imagesArray = Array.isArray(post.images) 
        ? [...post.images] 
        : [];
      
      // Handle existing images (keep them if provided)
      if (req.body.existing_images) {
        const existingImages = Array.isArray(req.body.existing_images)
          ? req.body.existing_images
          : [req.body.existing_images];
        imagesArray = existingImages.map((path) => {
          const existing = imagesArray.find((img) => 
            typeof img === 'object' ? img.path === path : img === path
          );
          return existing || { path, timestamp: new Date() };
        });
      }

      // Add new uploaded images from multer.fields() format
      if (req.files && req.files.post_images && req.files.post_images.length > 0) {
        const newImages = req.files.post_images.map((file) => ({
          path: convertToRelativePath(file.path),
          timestamp: new Date(),
        }));
        imagesArray = [...imagesArray, ...newImages];
      } else if (req.files && req.files.length > 0) {
        // Fallback for array format
        const newImages = req.files.map((file) => ({
          path: convertToRelativePath(file.path),
          timestamp: new Date(),
        }));
        imagesArray = [...imagesArray, ...newImages];
      } else if (req.file) {
        const newImage = {
          path: convertToRelativePath(req.file.path),
          timestamp: new Date(),
        };
        imagesArray = [...imagesArray, newImage];
      }

      if (imagesArray.length > 0 || req.body.existing_images !== undefined) {
        updateData.images = imagesArray;
      }
    } else if (post.type === "event") {
      // For events: handle banner
      if (req.files && req.files.post_banner && req.files.post_banner.length > 0) {
        updateData.banner = convertToRelativePath(req.files.post_banner[0].path);
      } else if (req.file) {
        updateData.banner = convertToRelativePath(req.file.path);
      } else if (banner !== undefined) {
        updateData.banner = banner;
      }
    }

    // Update other fields
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (start_date !== undefined) updateData.start_date = start_date;
    if (end_date !== undefined) updateData.end_date = end_date;
    if (location !== undefined) updateData.location = location;
    if (status !== undefined) updateData.status = status;

    await post.update(updateData);

    // Reload to get updated values
    await post.reload();

    // Log status change if status was updated
    if (status && status !== oldValues.status && req.user) {
      await logStatusChange(
        req.user.id,
        "post",
        id,
        oldValues.status,
        status,
        req
      );
    }

    // Log audit trail
    if (req.user) {
      await logUpdate(
        req.user.id,
        "post",
        id,
        oldValues,
        {
          title: post.title,
          content: post.content,
          status: post.status,
        },
        req
      );
    }

    res.status(200).json({
      success: true,
      message: "Post updated successfully",
      data: post,
    });
  } catch (error) {
    console.error("Error updating post:", error);
    res.status(500).json({
      success: false,
      message: "Error updating post",
      error: error.message,
    });
  }
};

// Delete post
const deletePost = async (req, res) => {
  try {
    const { id } = req.params;

    const post = await Post.findByPk(id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    // Delete images if exist
    const fs = require("fs");
    const path = require("path");

    if (post.type === "news" && post.images && Array.isArray(post.images)) {
      post.images.forEach((imageObj) => {
        const imagePath = typeof imageObj === 'object' 
          ? imageObj.path 
          : imageObj;
        const fullPath = path.join(__dirname, "..", "..", imagePath);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      });
    } else if (post.type === "event" && post.banner) {
      const fullPath = path.join(__dirname, "..", "..", post.banner);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }

    // Log audit trail before deletion
    if (req.user) {
      await logDelete(
        req.user.id,
        "post",
        id,
        {
          type: post.type,
          title: post.title,
        },
        req
      );
    }

    await post.destroy();

    res.status(200).json({
      success: true,
      message: "Post deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting post:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting post",
      error: error.message,
    });
  }
};

module.exports = {
  createPost,
  getAllPosts,
  getPublicPosts,
  getPostById,
  getPublicPostById,
  updatePost,
  deletePost,
};

