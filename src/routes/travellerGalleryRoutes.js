const express = require("express");
const {
  getPublicTravellerGalleryItems,
  getPublicTravellerGalleryItem,
  getTravellerGalleryCategories,
  getTravellerGalleryItems,
  getTravellerGalleryItem,
  createTravellerGalleryItem,
  updateTravellerGalleryItem,
  deleteTravellerGalleryItem,
  uploadTravellerGalleryItem,
} = require("../controllers/travellerGalleryController");
const {
  uploadTravellerGalleryMedia,
  handleUploadError,
} = require("../middleware/upload");
const { authenticateAdmin, requireAdminOrHigher } = require("../middleware/auth");

// Flexible middleware that handles both JSON and multipart for updates
const flexibleUpdate = (req, res, next) => {
  const contentType = req.headers["content-type"] || "";
  if (contentType.includes("multipart/form-data")) {
    return uploadTravellerGalleryMedia(req, res, next);
  }
  next();
};

const router = express.Router();

// ==================== PUBLIC ROUTES ====================
router.get("/public", getPublicTravellerGalleryItems);
router.get("/public/categories", getTravellerGalleryCategories);
router.get("/public/:id", getPublicTravellerGalleryItem);

// ==================== ADMIN ROUTES ====================
router.use(authenticateAdmin);

router.get("/", getTravellerGalleryItems);
router.get("/:id", getTravellerGalleryItem);

router.post(
  "/upload",
  requireAdminOrHigher,
  uploadTravellerGalleryMedia,
  handleUploadError,
  uploadTravellerGalleryItem
);

router.post("/", requireAdminOrHigher, createTravellerGalleryItem);

router.put(
  "/:id",
  requireAdminOrHigher,
  flexibleUpdate,
  handleUploadError,
  updateTravellerGalleryItem
);

router.delete("/:id", requireAdminOrHigher, deleteTravellerGalleryItem);

module.exports = router;

