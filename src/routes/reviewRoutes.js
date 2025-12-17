const express = require("express");
const router = express.Router();
const {
  createReview,
  getAllReviews,
  getReviewById,
  updateReview,
  updateReviewStatus,
  deleteReview,
  getApprovedReviews,
  getApprovedReviewById,
} = require("../controllers/reviewController");
const {
  authenticateAdmin,
  requireAdminOrHigher,
} = require("../middleware/auth");
const { errorHandler } = require("../middleware/errorHandler");

/**
 * @route   POST /api/reviews
 * @desc    Create new review (public)
 * @access  Public
 */
router.post("/", createReview);

/**
 * @route   GET /api/reviews/approved
 * @desc    Get approved reviews for public display
 * @access  Public
 */
router.get("/approved", getApprovedReviews);

/**
 * @route   GET /api/reviews/public/:id
 * @desc    Get single approved review by ID (public)
 * @access  Public
 */
router.get("/public/:id", getApprovedReviewById);

// All routes below require admin authentication
router.use(authenticateAdmin);

/**
 * @route   GET /api/reviews
 * @desc    Get all reviews with pagination and filters
 * @access  Admin
 */
router.get("/", getAllReviews);

/**
 * @route   GET /api/reviews/:id
 * @desc    Get single review by ID
 * @access  Admin
 */
router.get("/:id", getReviewById);

/**
 * @route   PUT /api/reviews/:id
 * @desc    Update review
 * @access  Admin
 */
router.put("/:id", updateReview);

/**
 * @route   PUT /api/reviews/:id/status
 * @desc    Update review status (approve/reject)
 * @access  Admin
 */
router.put("/:id/status", updateReviewStatus);

/**
 * @route   DELETE /api/reviews/:id
 * @desc    Delete review
 * @access  Admin
 */
router.delete("/:id", deleteReview);

// Error handling middleware
router.use(errorHandler);

module.exports = router;
