const express = require("express");
const router = express.Router();
const {
  createMember,
  getAllMembers,
  getMemberById,
  updateMember,
  updateMemberStatus,
  deleteMember,
  getMemberStats,
} = require("../controllers/memberController");
const { authenticateAdmin } = require("../middleware/auth");
const { errorHandler } = require("../middleware/errorHandler");

/**
 * @route   POST /api/members
 * @desc    Create new agent application (public endpoint)
 * @access  Public
 */
router.post("/", createMember);

/**
 * @route   GET /api/members
 * @desc    Get all agent applications with pagination and filters
 * @access  Admin
 */
router.get("/", authenticateAdmin, getAllMembers);

/**
 * @route   GET /api/members/stats
 * @desc    Get agent application statistics
 * @access  Admin
 */
router.get("/stats", authenticateAdmin, getMemberStats);

/**
 * @route   GET /api/members/:id
 * @desc    Get single agent application by ID
 * @access  Admin
 */
router.get("/:id", authenticateAdmin, getMemberById);

/**
 * @route   PUT /api/members/:id
 * @desc    Update agent application
 * @access  Admin
 */
router.put("/:id", authenticateAdmin, updateMember);

/**
 * @route   PUT /api/members/:id/status
 * @desc    Update agent application status (Pending/Approved/Rejected)
 * @access  Admin
 */
router.put("/:id/status", authenticateAdmin, updateMemberStatus);

/**
 * @route   DELETE /api/members/:id
 * @desc    Delete agent application
 * @access  Admin
 */
router.delete("/:id", authenticateAdmin, deleteMember);

// Error handling middleware
router.use(errorHandler);

module.exports = router;
