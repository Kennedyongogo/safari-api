const express = require("express");
const router = express.Router();
const {
  createDestination,
  getAllDestinations,
  getDestinationById,
  getDestinationBySlug,
  getPublicDestinationById,
  updateDestination,
  deleteDestination,
  getPublicDestinations,
  getDestinationPackages,
  getPackagesItinerary,
} = require("../controllers/destinationController");
const {
  authenticateAdmin,
  requireAdminOrHigher,
} = require("../middleware/auth");
const {
  uploadDestinationImages,
  handleUploadError,
} = require("../middleware/upload");
const { errorHandler } = require("../middleware/errorHandler");

// Public routes (no authentication required)
/**
 * @route   GET /api/destinations/public
 * @desc    Get all active destinations (public)
 * @access  Public
 */
router.get("/public", getPublicDestinations);

/**
 * @route   GET /api/destinations/public/:slug
 * @desc    Get single destination by slug (public)
 * @access  Public
 */
router.get("/public/:slug", getDestinationBySlug);

/**
 * @route   GET /api/destinations/public/id/:id
 * @desc    Get single destination by ID (public)
 * @access  Public
 */
router.get("/public/id/:id", getPublicDestinationById);

/**
 * @route   GET /api/destinations/public/:id/packages
 * @desc    Get all packages from a destination (public)
 * @access  Public
 */
router.get("/public/:id/packages", getDestinationPackages);

/**
 * @route   GET /api/destinations/public/:id/itineraries
 * @desc    Get itinerary data for map visualization (public)
 * @query   packageNumber - optional, filter by package number
 * @query   categoryName - optional, filter by category name
 * @access  Public
 */
router.get("/public/:id/itineraries", getPackagesItinerary);

// All other routes require admin authentication
router.use(authenticateAdmin);

/**
 * @route   POST /api/destinations
 * @desc    Create new destination
 * @access  Admin
 */
router.post("/", uploadDestinationImages, handleUploadError, createDestination);

/**
 * @route   GET /api/destinations
 * @desc    Get all destinations with filters
 * @access  Admin
 */
router.get("/", getAllDestinations);

/**
 * @route   GET /api/destinations/:id
 * @desc    Get single destination by ID
 * @access  Admin
 */
router.get("/:id", getDestinationById);

/**
 * @route   PUT /api/destinations/:id
 * @desc    Update destination
 * @access  Admin
 */
router.put("/:id", uploadDestinationImages, handleUploadError, updateDestination);

/**
 * @route   DELETE /api/destinations/:id
 * @desc    Delete destination
 * @access  Admin
 */
router.delete("/:id", requireAdminOrHigher, deleteDestination);

// Apply error handler to all routes
router.use(errorHandler);

module.exports = router;
