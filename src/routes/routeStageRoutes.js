const express = require("express");
const {
  getRouteStages,
  getRouteStageById,
  createRouteStage,
  updateRouteStage,
  deleteRouteStage,
  bulkCreateRouteStages,
} = require("../controllers/routeStageController");
const { authenticateAdmin, requireAdminOrHigher } = require("../middleware/auth");

const router = express.Router();

// Apply authentication to all routes (admin only)
router.use(authenticateAdmin);

// Get all route stages (can filter by packageId)
router.get("/", getRouteStages);

// Get route stage by ID
router.get("/:id", getRouteStageById);

// Create single route stage (admin only)
router.post("/", requireAdminOrHigher, createRouteStage);

// Bulk create route stages for a package (admin only)
router.post("/bulk", requireAdminOrHigher, bulkCreateRouteStages);

// Update route stage (admin only)
router.put("/:id", requireAdminOrHigher, updateRouteStage);

// Delete route stage (admin only)
router.delete("/:id", requireAdminOrHigher, deleteRouteStage);

module.exports = router;
