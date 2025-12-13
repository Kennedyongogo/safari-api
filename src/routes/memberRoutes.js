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
 * @desc    Create new member registration (public endpoint)
 * @access  Public
 */
router.post("/", createMember);

/**
 * @route   GET /api/members
 * @desc    Get all members with pagination and filters
 * @access  Admin
 */
router.get("/", authenticateAdmin, getAllMembers);

/**
 * @route   GET /api/members/stats
 * @desc    Get member statistics
 * @access  Admin
 */
router.get("/stats", authenticateAdmin, getMemberStats);

/**
 * @route   GET /api/members/:id
 * @desc    Get single member by ID
 * @access  Admin
 */
router.get("/:id", authenticateAdmin, getMemberById);

/**
 * @route   PUT /api/members/:id
 * @desc    Update member
 * @access  Admin
 */
router.put("/:id", authenticateAdmin, updateMember);

/**
 * @route   PUT /api/members/:id/status
 * @desc    Update member status
 * @access  Admin
 */
router.put("/:id/status", authenticateAdmin, updateMemberStatus);

/**
 * @route   DELETE /api/members/:id
 * @desc    Delete member
 * @access  Admin
 */
router.delete("/:id", authenticateAdmin, deleteMember);

// Error handling middleware
router.use(errorHandler);

module.exports = router;

