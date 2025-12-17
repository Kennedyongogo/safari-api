const { Blog } = require("../models");
const { convertToRelativePath } = require("../utils/filePath");
const { Op } = require("sequelize");
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

    const featuredImagePath =
      req.files?.blog_image?.[0] && req.files.blog_image[0].path
        ? convertToRelativePath(req.files.blog_image[0].path)
        : featuredImage;

    const authorImagePath =
      req.files?.author_image?.[0] && req.files.author_image[0].path
        ? convertToRelativePath(req.files.author_image[0].path)
        : authorImage;

    if (!slug || !title || !content) {
      return res.status(400).json({
        success: false,
        message: "Please provide slug, title, and content",
      });
    }

    const blog = await Blog.create({
      slug,
      title,
      excerpt,
      content,
      featuredImage: featuredImagePath,
      heroAltText,
      category,
      tags:
        typeof tags === "string"
          ? tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          : tags ?? [],
      featured: featured ?? false,
      priority: priority ?? 0,
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
      relatedPostIds:
        typeof relatedPostIds === "string"
          ? (() => {
              try {
                return JSON.parse(relatedPostIds);
              } catch (e) {
                return [];
              }
            })()
          : relatedPostIds ?? [],
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
    const { category, featured, limit = 10 } = req.query;
    const where = { status: "published" };

    if (category) where.category = category;
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
    const featuredImagePath =
      req.files?.blog_image?.[0] && req.files.blog_image[0].path
        ? convertToRelativePath(req.files.blog_image[0].path)
        : undefined;
    const authorImagePath =
      req.files?.author_image?.[0] && req.files.author_image[0].path
        ? convertToRelativePath(req.files.author_image[0].path)
        : undefined;

    const updateData = { ...req.body };

    // Normalize booleans/arrays
    if (updateData.featured !== undefined) {
      updateData.featured =
        updateData.featured === true || updateData.featured === "true";
    }
    if (updateData.tags && typeof updateData.tags === "string") {
      try {
        updateData.tags = JSON.parse(updateData.tags);
      } catch (e) {
        updateData.tags = updateData.tags.split(",").map((t) => t.trim());
      }
    }
    if (
      updateData.relatedPostIds &&
      typeof updateData.relatedPostIds === "string"
    ) {
      try {
        updateData.relatedPostIds = JSON.parse(updateData.relatedPostIds);
      } catch (e) {
        updateData.relatedPostIds = [];
      }
    }

    if (featuredImagePath !== undefined) {
      updateData.featuredImage = featuredImagePath;
    }
    if (authorImagePath !== undefined) {
      updateData.authorImage = authorImagePath;
    }

    const oldStatus = blog.status;

    await blog.update(updateData);

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
  updateBlog,
  updateBlogStatus,
  deleteBlog,
};
