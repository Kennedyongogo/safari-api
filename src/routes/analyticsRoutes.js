const express = require("express");
const router = express.Router();
const {
  getSystemAnalytics,
  getMonthlyTrends,
} = require("../controllers/analyticsController");
const { authenticateAdmin } = require("../middleware/auth");
const { errorHandler } = require("../middleware/errorHandler");

/**
 * @route   GET /api/analytics
 * @desc    Get comprehensive system analytics
 * @access  Admin
 */
router.get("/", authenticateAdmin, getSystemAnalytics);

/**
 * @route   GET /api/analytics/trends
 * @desc    Get monthly trends for charts
 * @query   months (optional, default: 6)
 * @access  Admin
 */
router.get("/trends", authenticateAdmin, getMonthlyTrends);

// Error handling middleware
router.use(errorHandler);

module.exports = router;

