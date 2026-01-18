const express = require("express");
const {
  getPublicInterestGalleryItems,
  getPublicInterestGalleryItem,
  getInterestGalleryCategories,
  getInterestGalleryItems,
  getInterestGalleryItem,
  createInterestGalleryItem,
  updateInterestGalleryItem,
  deleteInterestGalleryItem,
  uploadInterestGalleryItem,
} = require("../controllers/interestGalleryController");
const { uploadInterestGalleryMedia, handleUploadError } = require("../middleware/upload");
const { authenticateAdmin, requireAdminOrHigher } = require("../middleware/auth");

const flexibleUpdate = (req, res, next) => {
  const contentType = req.headers["content-type"] || "";
  if (contentType.includes("multipart/form-data")) {
    return uploadInterestGalleryMedia(req, res, next);
  }
  next();
};

const router = express.Router();

// ==================== PUBLIC ROUTES ====================
router.get("/public", getPublicInterestGalleryItems);
router.get("/public/categories", getInterestGalleryCategories);
router.get("/public/:id", getPublicInterestGalleryItem);

// ==================== ADMIN ROUTES ====================
router.use(authenticateAdmin);

router.get("/", getInterestGalleryItems);
router.get("/:id", getInterestGalleryItem);

router.post(
  "/upload",
  requireAdminOrHigher,
  uploadInterestGalleryMedia,
  handleUploadError,
  uploadInterestGalleryItem
);

router.post("/", requireAdminOrHigher, createInterestGalleryItem);

router.put(
  "/:id",
  requireAdminOrHigher,
  flexibleUpdate,
  handleUploadError,
  updateInterestGalleryItem
);

router.delete("/:id", requireAdminOrHigher, deleteInterestGalleryItem);

module.exports = router;

