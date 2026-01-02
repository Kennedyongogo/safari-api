const express = require("express");
const {
  getPublicLodges,
  getPublicLodgeById,
  getLodgesByCountry,
  getLodges,
  getLodgeById,
  createLodge,
  updateLodge,
  deleteLodge,
} = require("../controllers/lodgeController");
const {
  uploadLodgeImage,
  uploadLodgeImages,
  uploadLodgeGallery,
  handleUploadError,
} = require("../middleware/upload");
const { authenticateAdmin, requireAdminOrHigher } = require("../middleware/auth");

const router = express.Router();

// Public
router.get("/public", getPublicLodges);
router.get("/public/:id", getPublicLodgeById);

// Form integration - get lodges by country for conditional forms
router.get("/country/:country", getLodgesByCountry);

// Upload middleware for lodges (featured + gallery)
const lodgeUploads = [
  uploadLodgeImage,
  uploadLodgeImages,
  uploadLodgeGallery,
  handleUploadError,
];

// Flexible middleware that handles both JSON and multipart for updates
const flexibleLodgeUpdate = (req, res, next) => {
  const contentType = req.headers['content-type'] || '';

  if (contentType.includes('multipart/form-data')) {
    // Apply upload middleware for file uploads
    return uploadLodgeGallery(req, res, next);
  } else {
    // Skip upload middleware for JSON requests
    next();
  }
};

// Admin (add auth middleware if needed)
router.use(authenticateAdmin);
router.get("/", getLodges);
router.get("/:id", getLodgeById);
router.post("/", requireAdminOrHigher, flexibleLodgeUpdate, createLodge);
router.put("/:id", requireAdminOrHigher, flexibleLodgeUpdate, updateLodge);
router.delete("/:id", requireAdminOrHigher, deleteLodge);

module.exports = router;


