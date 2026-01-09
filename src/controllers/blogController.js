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

// Serve pre-rendered HTML with meta tags for social media crawlers
const getBlogHTML = async (req, res) => {
  try {
    const { slug } = req.params;
    const blog = await Blog.findOne({
      where: { slug, status: "published" },
      attributes: {
        exclude: ["isDeleted", "deletedAt", "updatedBy", "createdBy"],
      },
    });

    if (!blog) {
      return res.status(404).send("Blog post not found");
    }

    // Get origin from headers (considering proxy)
    // CRITICAL: Use the EXACT host that the crawler is accessing to avoid 301 redirects
    // Priority: x-forwarded-host > host header > reconstruct from request
    let host = req.get("x-forwarded-host") || req.get("host");
    
    // If no host header, try to get from the request URL (shouldn't happen in production)
    if (!host && req.get("referer")) {
      try {
        const refererUrl = new URL(req.get("referer"));
        host = refererUrl.hostname;
      } catch (e) {
        // Ignore
      }
    }
    
    // Last resort: use default (shouldn't happen in production with proper proxy setup)
    if (!host) {
      host = "akirasafaris.com";
      console.warn("Warning: No host header found, using default:", host);
    }
    
    // Remove port number if present (use standard ports)
    host = host.replace(/:\d+$/, "");
    
    // Get protocol - use forwarded proto first, then determine from request
    let protocol = req.get("x-forwarded-proto");
    if (!protocol || (protocol !== "http" && protocol !== "https")) {
      protocol = req.secure ? "https" : "http";
      // Default to HTTPS for production (most sites use HTTPS)
      if (process.env.NODE_ENV === "production") {
        protocol = "https";
      }
    }
    protocol = protocol.toLowerCase();
    
    const origin = `${protocol}://${host}`;
    const currentUrl = `${origin}/blog/${slug}`;
    
    // Log for debugging (remove in production if needed)
    console.log("Blog HTML generation:", {
      slug,
      protocol,
      host,
      forwardedHost: req.get("x-forwarded-host"),
      requestHost: req.get("host"),
      currentUrl,
      userAgent: req.get("user-agent")
    });

    // Build meta data - prioritize featured image (what user wants to share most)
    const ogTitle = blog.metaTitle || blog.title || "Akira Safaris Blog";
    
    // Build description from CONTENT field (what user wants to share)
    // Priority: metaDescription > excerpt > content (extracted from blog.content field)
    let ogDescription = blog.metaDescription || "";
    if (!ogDescription && blog.excerpt) {
      ogDescription = blog.excerpt.trim();
    }
    // Extract from blog.content field - the actual blog post content
    if (!ogDescription && blog.content) {
      // Strip HTML tags and get meaningful text from content
      const textContent = blog.content.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
      // Take first 300 characters, but try to end at a sentence for better display
      ogDescription = textContent.substring(0, 300);
      const lastPeriod = ogDescription.lastIndexOf(".");
      if (lastPeriod > 200) {
        ogDescription = ogDescription.substring(0, lastPeriod + 1);
      } else if (textContent.length > 300) {
        ogDescription += "...";
      }
    }

    // Build absolute image URL - PRIORITIZE FEATURED IMAGE (what user wants MOST)
    // Use blog.featuredImage field first, then ogImage as fallback
    let ogImage = null;
    const imagePath = blog.featuredImage || blog.ogImage;
    if (imagePath) {
      if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
        ogImage = imagePath;
      } else {
        const normalizedPath = imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
        ogImage = `${origin}${normalizedPath}`;
      }
    }
    
    // Fallback to placeholder if no image found
    if (!ogImage) {
      ogImage = `${origin}/placeholder.jpg`;
    }
    
    // Ensure image URL is HTTPS for Twitter and LinkedIn (they prefer HTTPS)
    const ogImageHttps = ogImage.replace(/^http:\/\//, "https://");

    // Clean HTML entities
    const escapeHtml = (text) => {
      if (!text) return "";
      return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    };

    // Generate HTML with meta tags
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(ogTitle)}</title>
  <meta name="description" content="${escapeHtml(ogDescription)}" />
  
  <!-- Open Graph / Facebook & LinkedIn -->
  <meta property="og:type" content="article" />
  <meta property="og:url" content="${currentUrl}" />
  <meta property="og:title" content="${escapeHtml(ogTitle)}" />
  <meta property="og:description" content="${escapeHtml(ogDescription)}" />
  <meta property="og:image" content="${ogImageHttps}" />
  <meta property="og:image:secure_url" content="${ogImageHttps}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:type" content="image/jpeg" />
  <meta property="og:site_name" content="Akira Safaris" />
  <meta property="og:locale" content="en_US" />
  
  <!-- Twitter Card (for Twitter sharing) -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:url" content="${currentUrl}" />
  <meta name="twitter:title" content="${escapeHtml(ogTitle)}" />
  <meta name="twitter:description" content="${escapeHtml(ogDescription)}" />
  <meta name="twitter:image" content="${ogImageHttps}" />
  <meta name="twitter:image:alt" content="${escapeHtml(ogTitle)}" />
  
  <!-- Article specific -->
  ${blog.authorName ? `<meta property="article:author" content="${escapeHtml(blog.authorName)}" />` : ""}
  ${blog.publishDate ? `<meta property="article:published_time" content="${new Date(blog.publishDate).toISOString()}" />` : ""}
  ${blog.category ? `<meta property="article:section" content="${escapeHtml(blog.category)}" />` : ""}
  ${blog.tags && Array.isArray(blog.tags) && blog.tags.length > 0
      ? blog.tags.map(tag => `<meta property="article:tag" content="${escapeHtml(tag)}" />`).join("\n  ")
      : ""}
  
  <link rel="canonical" href="${currentUrl}" />
</head>
<body>
  <h1>${escapeHtml(ogTitle)}</h1>
  <p>${escapeHtml(ogDescription)}</p>
  <p><a href="${currentUrl}">Read full article</a></p>
</body>
</html>`;

    // Ensure we return 200 OK (not a redirect)
    res.status(200);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    // Prevent any caching that might cause redirect issues
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.send(html);
  } catch (error) {
    console.error("Error generating blog HTML:", error);
    res.status(500).send("Error generating blog page");
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
  getBlogHTML,
  incrementBlogView,
  incrementBlogLike,
  updateBlog,
  updateBlogStatus,
  deleteBlog,
};
