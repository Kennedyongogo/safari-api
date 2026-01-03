const express = require("express");
const {
  getPublicGalleryItems,
  getPublicGalleryItem,
  getGalleryItems,
  getGalleryItem,
  createGalleryItem,
  updateGalleryItem,
  deleteGalleryItem,
  uploadGalleryItem,
  getGalleryStats,
} = require("../controllers/galleryController");
const {
  uploadGalleryImage,
  uploadGalleryVideo,
  uploadGalleryMedia,
  uploadGalleryItems,
  handleUploadError
} = require("../middleware/upload");
const { authenticateAdmin, requireAdminOrHigher } = require("../middleware/auth");

// Flexible middleware that handles both JSON and multipart for updates
const flexibleGalleryUpdate = (req, res, next) => {
  const contentType = req.headers['content-type'] || '';

  if (contentType.includes('multipart/form-data')) {
    // Apply upload middleware for file uploads
    return uploadGalleryMedia(req, res, next);
  } else {
    // Skip upload middleware for JSON requests
    next();
  }
};

const router = express.Router();

// ==================== PUBLIC ROUTES ====================

// Get all public gallery items (for frontend consumption)
router.get("/public", getPublicGalleryItems);

// Get public gallery item by ID (for frontend consumption)
router.get("/public/:id", getPublicGalleryItem);

// ==================== ADMIN ROUTES ====================

// Apply authentication to all admin routes
router.use(authenticateAdmin);

// Get gallery statistics
router.get("/stats", requireAdminOrHigher, getGalleryStats);

// Get all gallery items (admin with pagination, filtering, search)
router.get("/", getGalleryItems);

// Get gallery item by ID (admin with full details)
router.get("/:id", getGalleryItem);

// Upload gallery item (supports both images and videos)
router.post("/upload", requireAdminOrHigher, uploadGalleryMedia, handleUploadError, uploadGalleryItem);

// Upload multiple gallery items
router.post("/upload-multiple", requireAdminOrHigher, uploadGalleryItems, handleUploadError, async (req, res) => {
  // This would need additional logic to handle multiple files
  // For now, return a message that this endpoint needs implementation
  res.status(501).json({
    success: false,
    message: "Multiple upload endpoint not yet implemented",
  });
});

// Create gallery item (without file upload)
router.post("/", requireAdminOrHigher, createGalleryItem);

// Update gallery item (supports both JSON updates and file replacement)
router.put("/:id", requireAdminOrHigher, flexibleGalleryUpdate, handleUploadError, updateGalleryItem);

// Delete gallery item (soft delete)
router.delete("/:id", requireAdminOrHigher, deleteGalleryItem);

module.exports = router;
