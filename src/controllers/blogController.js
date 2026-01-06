const { Blog } = require("../models");
const { convertToRelativePath } = require("../utils/filePath");
const { Op } = require("sequelize");
const path = require("path");
const { deleteFile } = require("../middleware/upload");
const {
  logCreate,
  logUpdate,
  logDelete,
  logStatusChange,
} = require("../utils/auditLogger");

// Create blog
const createBlog = async (req, res) => {
  try {
    const {
      slug,
      title,
      excerpt,
      content,
      featuredImage,
      heroAltText,
      category,
      tags,
      featured,
      priority,
      authorName,
      authorImage,
      authorBio,
      authorId,
      publishDate,
      readTime,
      status,
      views,
      likes,
      shareCountFacebook,
      shareCountTwitter,
      shareCountLinkedIn,
      metaTitle,
      metaDescription,
      ogImage,
      canonicalUrl,
      relatedPostIds,
    } = req.body;

    // Validate required fields
    if (!slug || !title || !content) {
      return res.status(400).json({
        success: false,
        message: "Please provide slug, title, and content",
      });
    }

    // Handle featured image upload
    let featuredImagePath = null;
    if (req.files && req.files.blog_image && req.files.blog_image[0]) {
      featuredImagePath = convertToRelativePath(req.files.blog_image[0].path);
    } else if (featuredImage) {
      featuredImagePath = featuredImage;
    }

    // Handle author image upload
    let authorImagePath = null;
    if (req.files && req.files.author_image && req.files.author_image[0]) {
      authorImagePath = convertToRelativePath(req.files.author_image[0].path);
    } else if (authorImage) {
      authorImagePath = authorImage;
    }

    // Parse tags
    let tagsArray = [];
    if (tags) {
      if (Array.isArray(tags)) {
        tagsArray = tags;
      } else if (typeof tags === "string") {
        try {
          tagsArray = JSON.parse(tags);
        } catch (e) {
          tagsArray = tags.split(",").map((t) => t.trim()).filter(Boolean);
        }
      }
    }

    // Parse relatedPostIds
    let relatedPostIdsArray = [];
    if (relatedPostIds) {
      if (Array.isArray(relatedPostIds)) {
        relatedPostIdsArray = relatedPostIds;
      } else if (typeof relatedPostIds === "string") {
        try {
          relatedPostIdsArray = JSON.parse(relatedPostIds);
        } catch (e) {
          relatedPostIdsArray = [];
        }
      }
    }

    const blog = await Blog.create({
      slug,
      title,
      excerpt,
      content,
      featuredImage: featuredImagePath,
      heroAltText,
      category,
      tags: tagsArray,
      featured: featured !== undefined ? (featured === true || featured === "true") : false,
      priority: priority ? parseInt(priority) : 0,
      authorName,
      authorImage: authorImagePath,
      authorBio,
      authorId,
      publishDate,
      readTime,
      status: status ?? "draft",
      views: views ?? 0,
      likes: likes ?? 0,
      shareCountFacebook: shareCountFacebook ?? 0,
      shareCountTwitter: shareCountTwitter ?? 0,
      shareCountLinkedIn: shareCountLinkedIn ?? 0,
      metaTitle,
      metaDescription,
      ogImage,
      canonicalUrl,
      relatedPostIds: relatedPostIdsArray,
      created_by: req.user?.id || null,
      updated_by: req.user?.id || null,
    });

    if (req.user) {
      await logCreate(
        req.user.id,
        "blog",
        blog.id,
        { slug, title, status: blog.status },
        req
      );
    }

    res.status(201).json({
      success: true,
      message: "Blog created successfully",
      data: blog,
    });
  } catch (error) {
    console.error("Error creating blog:", error);
    res.status(500).json({
      success: false,
      message: "Error creating blog",
      error: error.message,
    });
  }
};

// Get all blogs (admin) with filters
const getAllBlogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      category,
      status,
      featured,
      sortBy = "createdAt",
      sortOrder = "DESC",
      categories,
    } = req.query;

    const where = {};

    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { excerpt: { [Op.like]: `%${search}%` } },
        { content: { [Op.like]: `%${search}%` } },
        { tags: { [Op.like]: `%${search}%` } },
      ];
    }

    if (category) {
      where.category = category;
    } else if (categories) {
      const list = categories
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);
      if (list.length) {
        where.category = { [Op.in]: list };
      }
    }

    if (status) {
      where.status = status;
    }

    if (featured !== undefined) {
      where.featured = featured === "true";
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await Blog.findAndCountAll({
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
    console.error("Error fetching blogs:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching blogs",
      error: error.message,
    });
  }
};

// Get blog by ID (admin)
const getBlogById = async (req, res) => {
  try {
    const { id } = req.params;
    const blog = await Blog.findByPk(id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    res.status(200).json({
      success: true,
      data: blog,
    });
  } catch (error) {
    console.error("Error fetching blog:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching blog",
      error: error.message,
    });
  }
};

// Get public blogs (published)
const getPublicBlogs = async (req, res) => {
  try {
    const { category, categories, featured, limit = 10 } = req.query;
    const where = { status: "published" };

    if (category) where.category = category;
    else if (categories) {
      const list = categories
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);
      if (list.length) where.category = { [Op.in]: list };
    }
    if (featured !== undefined) where.featured = featured === "true";

    const blogs = await Blog.findAll({
      where,
      limit: parseInt(limit),
      order: [
        ["featured", "DESC"],
        ["priority", "DESC"],
        ["publishDate", "DESC"],
        ["createdAt", "DESC"],
      ],
      attributes: {
        exclude: ["isDeleted", "deletedAt", "updatedBy", "createdBy"],
      },
    });

    res.status(200).json({
      success: true,
      count: blogs.length,
      data: blogs,
    });
  } catch (error) {
    console.error("Error fetching public blogs:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching blogs",
      error: error.message,
    });
  }
};

// Get public blog by slug (published)
const getPublicBlogBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const blog = await Blog.findOne({
      where: { slug, status: "published" },
      attributes: {
        exclude: ["isDeleted", "deletedAt", "updatedBy", "createdBy"],
      },
    });

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    res.status(200).json({
      success: true,
      data: blog,
    });
  } catch (error) {
    console.error("Error fetching blog by slug:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching blog",
      error: error.message,
    });
  }
};

// Increment view count (public)
const incrementBlogView = async (req, res) => {
  try {
    const { slug } = req.params;
    const blog = await Blog.findOne({ where: { slug, status: "published" } });
    if (!blog) {
      return res
        .status(404)
        .json({ success: false, message: "Blog not found" });
    }
    await blog.increment("views");
    await blog.reload({ attributes: ["views"] });

    return res.status(200).json({
      success: true,
      message: "View count incremented",
      data: { views: blog.views },
    });
  } catch (error) {
    console.error("Error incrementing blog view:", error);
    res.status(500).json({
      success: false,
      message: "Error incrementing view count",
      error: error.message,
    });
  }
};

// Increment like count (public)
const incrementBlogLike = async (req, res) => {
  try {
    const { slug } = req.params;
    const blog = await Blog.findOne({ where: { slug, status: "published" } });
    if (!blog) {
      return res
        .status(404)
        .json({ success: false, message: "Blog not found" });
    }
    await blog.increment("likes");
    await blog.reload({ attributes: ["likes"] });

    return res.status(200).json({
      success: true,
      message: "Like count incremented",
      data: { likes: blog.likes },
    });
  } catch (error) {
    console.error("Error incrementing blog like:", error);
    res.status(500).json({
      success: false,
      message: "Error incrementing like count",
      error: error.message,
    });
  }
};

// Update blog
const updateBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const blog = await Blog.findByPk(id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    const oldValues = blog.toJSON();
    const oldFeaturedImage = blog.featuredImage;
    const oldAuthorImage = blog.authorImage;
    
    // Handle featured image upload
    let featuredImagePath = undefined;
    if (req.files && req.files.blog_image && req.files.blog_image[0]) {
      featuredImagePath = convertToRelativePath(req.files.blog_image[0].path);
    }

    // Handle author image upload
    let authorImagePath = undefined;
    if (req.files && req.files.author_image && req.files.author_image[0]) {
      authorImagePath = convertToRelativePath(req.files.author_image[0].path);
    }

    const updateData = { ...req.body };

    // Normalize booleans
    if (updateData.featured !== undefined) {
      updateData.featured = updateData.featured === true || updateData.featured === "true";
    }

    // Parse tags
    if (updateData.tags !== undefined) {
      if (Array.isArray(updateData.tags)) {
        updateData.tags = updateData.tags.filter(item => item && item.toString().trim());
      } else if (typeof updateData.tags === "string") {
        try {
          updateData.tags = JSON.parse(updateData.tags).filter(item => item && item.toString().trim());
        } catch (e) {
          updateData.tags = updateData.tags.split(",").map((t) => t.trim()).filter(Boolean);
        }
      }
    }

    // Parse relatedPostIds
    if (updateData.relatedPostIds !== undefined && typeof updateData.relatedPostIds === "string") {
      try {
        updateData.relatedPostIds = JSON.parse(updateData.relatedPostIds);
      } catch (e) {
        updateData.relatedPostIds = [];
      }
    }

    // Handle featured image - check if it's being explicitly set (including empty string for deletion)
    if (updateData.delete_featured_image === "true" || updateData.delete_featured_image === true) {
      updateData.featuredImage = null;
    } else if (featuredImagePath !== undefined) {
      // New file uploaded
      updateData.featuredImage = featuredImagePath;
    }
    // If neither condition is true, featuredImage is not in updateData, so existing value is preserved

    // Handle author image - check if it's being explicitly set (including empty string for deletion)
    if (updateData.delete_author_image === "true" || updateData.delete_author_image === true) {
      updateData.authorImage = null;
    } else if (authorImagePath !== undefined) {
      // New file uploaded
      updateData.authorImage = authorImagePath;
    }
    // If neither condition is true, authorImage is not in updateData, so existing value is preserved

    const oldStatus = blog.status;

    await blog.update(updateData);

    // Delete old image files if they were changed or removed (after successful database update)
    if (oldFeaturedImage && updateData.featuredImage !== undefined && updateData.featuredImage !== oldFeaturedImage) {
      const fullPath = oldFeaturedImage.startsWith('uploads/') 
        ? oldFeaturedImage 
        : `uploads/posts/${oldFeaturedImage}`;
      await deleteFile(path.join(__dirname, '..', '..', fullPath));
    }

    if (oldAuthorImage && updateData.authorImage !== undefined && updateData.authorImage !== oldAuthorImage) {
      const fullPath = oldAuthorImage.startsWith('uploads/') 
        ? oldAuthorImage 
        : `uploads/authors/${oldAuthorImage}`;
      await deleteFile(path.join(__dirname, '..', '..', fullPath));
    }

    if (req.user) {
      await logUpdate(
        req.user.id,
        "blog",
        id,
        oldValues,
        updateData,
        req,
        `Updated blog ${id}`
      );

      if (updateData.status && updateData.status !== oldStatus) {
        await logStatusChange(
          req.user.id,
          "blog",
          id,
          oldStatus,
          updateData.status,
          req,
          `Changed blog status from ${oldStatus} to ${updateData.status}`
        );
      }
    }

    // Reload to get updated data
    await blog.reload();

    res.status(200).json({
      success: true,
      message: "Blog updated successfully",
      data: blog,
    });
  } catch (error) {
    console.error("Error updating blog:", error);
    res.status(500).json({
      success: false,
      message: "Error updating blog",
      error: error.message,
    });
  }
};

// Update blog status
const updateBlogStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["draft", "published", "archived"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be draft, published, or archived",
      });
    }

    const blog = await Blog.findByPk(id);
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    const oldStatus = blog.status;
    await blog.update({ status });

    if (req.user) {
      await logStatusChange(
        req.user.id,
        "blog",
        id,
        oldStatus,
        status,
        req,
        `Changed blog status from ${oldStatus} to ${status}`
      );
    }

    res.status(200).json({
      success: true,
      message: "Blog status updated successfully",
      data: blog,
    });
  } catch (error) {
    console.error("Error updating blog status:", error);
    res.status(500).json({
      success: false,
      message: "Error updating blog status",
      error: error.message,
    });
  }
};

// Delete blog
const deleteBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const blog = await Blog.findByPk(id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    const blogData = {
      slug: blog.slug,
      title: blog.title,
      status: blog.status,
    };

    await blog.destroy();

    if (req.user) {
      await logDelete(
        req.user.id,
        "blog",
        id,
        blogData,
        req,
        `Deleted blog ${blog.slug}`
      );
    }

    res.status(200).json({
      success: true,
      message: "Blog deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting blog:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting blog",
      error: error.message,
    });
  }
};

module.exports = {
  createBlog,
  getAllBlogs,
  getBlogById,
  getPublicBlogs,
  getPublicBlogBySlug,
  incrementBlogView,
  incrementBlogLike,
  updateBlog,
  updateBlogStatus,
  deleteBlog,
};
