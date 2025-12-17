const express = require("express");
const router = express.Router();
const {
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
} = require("../controllers/blogController");
const {
  authenticateAdmin,
  requireAdminOrHigher,
} = require("../middleware/auth");
const { uploadBlogAssets, handleUploadError } = require("../middleware/upload");
const { errorHandler } = require("../middleware/errorHandler");

// Public routes
router.get("/public", getPublicBlogs);
router.get("/public/:slug", getPublicBlogBySlug);
router.post("/public/:slug/view", incrementBlogView);
router.post("/public/:slug/like", incrementBlogLike);

// Admin routes
router.use(authenticateAdmin);
router.use(requireAdminOrHigher);

router.post("/", uploadBlogAssets, handleUploadError, createBlog);
router.get("/", getAllBlogs);
router.get("/:id", getBlogById);
router.put("/:id", uploadBlogAssets, handleUploadError, updateBlog);
router.put("/:id/status", updateBlogStatus);
router.delete("/:id", deleteBlog);

router.use(errorHandler);

module.exports = router;

