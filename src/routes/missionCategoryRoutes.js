const express = require("express");
const router = express.Router();
const {
  createMissionCategory,
  getAllMissionCategories,
  getPublicMissionCategories,
  getPublicMissionCategoryById,
  getMissionCategoryById,
  updateMissionCategory,
  deleteMissionCategory,
} = require("../controllers/missionCategoryController");
const {
  authenticateAdmin,
  requireAdminOrHigher,
} = require("../middleware/auth");
const {
  uploadMissionCategoryImage,
  uploadMissionCategoryImages,
  handleUploadError,
} = require("../middleware/upload");
const { errorHandler } = require("../middleware/errorHandler");

// Public routes (no authentication required)
/**
 * @route   GET /api/mission-categories/public
 * @desc    Get all active mission categories (public)
 * @access  Public
 */
router.get("/public", getPublicMissionCategories);

/**
 * @route   GET /api/mission-categories/public/:id
 * @desc    Get single mission category by ID (public)
 * @access  Public
 */
router.get("/public/:id", getPublicMissionCategoryById);

// All other routes require admin authentication
router.use(authenticateAdmin);

/**
 * @route   POST /api/mission-categories
 * @desc    Create new mission category
 * @access  Admin
 */
router.post("/", uploadMissionCategoryImages, handleUploadError, createMissionCategory);

/**
 * @route   GET /api/mission-categories
 * @desc    Get all mission categories with filters
 * @access  Admin
 */
router.get("/", getAllMissionCategories);

/**
 * @route   GET /api/mission-categories/:id
 * @desc    Get single mission category by ID
 * @access  Admin
 */
router.get("/:id", getMissionCategoryById);

/**
 * @route   PUT /api/mission-categories/:id
 * @desc    Update mission category
 * @access  Admin
 */
router.put("/:id", uploadMissionCategoryImages, handleUploadError, updateMissionCategory);

/**
 * @route   DELETE /api/mission-categories/:id
 * @desc    Delete mission category
 * @access  Admin
 */
router.delete("/:id", deleteMissionCategory);

// Error handling middleware
router.use(errorHandler);

module.exports = router;

