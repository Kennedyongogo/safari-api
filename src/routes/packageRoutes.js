const express = require("express");
const {
  getPublicPackages,
  getPublicPackageById,
  getPackages,
  getPackageById,
  createPackage,
  updatePackage,
  deletePackage,
} = require("../controllers/packageController");
const { uploadPackageImage } = require("../middleware/upload");
const { authenticateAdmin, requireAdminOrHigher } = require("../middleware/auth");

// Flexible middleware that handles both JSON and multipart for updates
const flexiblePackageUpdate = (req, res, next) => {
  const contentType = req.headers['content-type'] || '';

  if (contentType.includes('multipart/form-data')) {
    // Apply upload middleware for file uploads
    return uploadPackageImage(req, res, next);
  } else {
    // Skip upload middleware for JSON requests
    next();
  }
};

const router = express.Router();

// ==================== PUBLIC ROUTES ====================

// Get all public packages (for frontend consumption)
router.get("/public", getPublicPackages);

// Get public package by ID with full itinerary (for frontend consumption)
router.get("/public/:id", getPublicPackageById);

// ==================== ADMIN ROUTES ====================

// Apply authentication to all admin routes
router.use(authenticateAdmin);

// Get all packages (admin with pagination, filtering, search)
router.get("/", getPackages);

// Get package by ID (admin with full details)
router.get("/:id", getPackageById);

// Create package (admin only)
router.post("/", requireAdminOrHigher, flexiblePackageUpdate, createPackage);

// Update package (admin only)
router.put("/:id", requireAdminOrHigher, flexiblePackageUpdate, updatePackage);

// Delete package (admin only)
router.delete("/:id", requireAdminOrHigher, deletePackage);

module.exports = router;
