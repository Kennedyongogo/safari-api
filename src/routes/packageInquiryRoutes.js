const express = require("express");
const router = express.Router();
const {
  createPackageInquiry,
  getAllInquiries,
  getInquiryById,
  updateInquiry,
  deleteInquiry,
  getInquiryStats,
} = require("../controllers/packageInquiryController");
const {
  authenticateAdmin,
  requireAdminOrHigher,
} = require("../middleware/auth");
const { errorHandler } = require("../middleware/errorHandler");

// Public route (no authentication required)
/**
 * @route   POST /api/package-inquiries
 * @desc    Create new package inquiry (public)
 * @access  Public
 */
router.post("/", createPackageInquiry);

// All routes below require admin authentication
router.use(authenticateAdmin);

/**
 * @route   GET /api/package-inquiries/stats
 * @desc    Get inquiry statistics
 * @access  Admin
 */
router.get("/stats", getInquiryStats);

/**
 * @route   GET /api/package-inquiries
 * @desc    Get all inquiries with pagination and filters
 * @access  Admin
 */
router.get("/", getAllInquiries);

/**
 * @route   GET /api/package-inquiries/:id
 * @desc    Get single inquiry by ID
 * @access  Admin
 */
router.get("/:id", getInquiryById);

/**
 * @route   PUT /api/package-inquiries/:id
 * @desc    Update inquiry (reply, change status)
 * @access  Admin
 */
router.put("/:id", updateInquiry);

/**
 * @route   DELETE /api/package-inquiries/:id
 * @desc    Delete inquiry
 * @access  Admin
 */
router.delete("/:id", requireAdminOrHigher, deleteInquiry);

// Error handling middleware
router.use(errorHandler);

module.exports = router;

