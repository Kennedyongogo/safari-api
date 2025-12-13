const express = require("express");
const router = express.Router();
const {
  createPost,
  getAllPosts,
  getPublicPosts,
  getPostById,
  getPublicPostById,
  updatePost,
  deletePost,
} = require("../controllers/postController");
const {
  authenticateAdmin,
} = require("../middleware/auth");
const {
  uploadPostFiles,
  handleUploadError,
} = require("../middleware/upload");
const { errorHandler } = require("../middleware/errorHandler");

// Public routes (no authentication required)
/**
 * @route   GET /api/posts/public
 * @desc    Get all published posts (public)
 * @access  Public
 */
router.get("/public", getPublicPosts);

/**
 * @route   GET /api/posts/public/:id
 * @desc    Get single published post by ID (public)
 * @access  Public
 */
router.get("/public/:id", getPublicPostById);

// All other routes require admin authentication
router.use(authenticateAdmin);

/**
 * @route   POST /api/posts
 * @desc    Create new post (news or event)
 * @access  Admin
 * @note    Uses flexible upload - accepts both post_images (for news) and post_banner (for events)
 */
router.post("/", uploadPostFiles, handleUploadError, createPost);

/**
 * @route   GET /api/posts
 * @desc    Get all posts with filters
 * @access  Admin
 */
router.get("/", getAllPosts);

/**
 * @route   GET /api/posts/:id
 * @desc    Get single post by ID
 * @access  Admin
 */
router.get("/:id", getPostById);

/**
 * @route   PUT /api/posts/:id
 * @desc    Update post
 * @access  Admin
 * @note    Uses flexible upload - accepts both post_images (for news) and post_banner (for events)
 */
router.put("/:id", uploadPostFiles, handleUploadError, updatePost);

/**
 * @route   DELETE /api/posts/:id
 * @desc    Delete post
 * @access  Admin
 */
router.delete("/:id", deletePost);

// Error handling middleware
router.use(errorHandler);

module.exports = router;

