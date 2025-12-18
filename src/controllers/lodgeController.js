const { Lodge } = require("../models");
const { Op } = require("sequelize");

// Normalize helper
const normalizeLodge = (lodge) => {
  if (!lodge) return lodge;
  const plain = lodge.toJSON ? lodge.toJSON() : lodge;
  return {
    ...plain,
    campType: Array.isArray(plain.campType) ? plain.campType : [],
    openMonths: Array.isArray(plain.openMonths) ? plain.openMonths : [],
    images: Array.isArray(plain.images) ? plain.images : [],
    whyYouLoveIt: Array.isArray(plain.whyYouLoveIt) ? plain.whyYouLoveIt : [],
    highlights: Array.isArray(plain.highlights) ? plain.highlights : [],
    dayAtCamp: Array.isArray(plain.dayAtCamp) ? plain.dayAtCamp : [],
    essentials: Array.isArray(plain.essentials) ? plain.essentials : [],
    amenities: Array.isArray(plain.amenities) ? plain.amenities : [],
  };
};

const mapFileToPath = (file) => {
  if (!file || !file.path) return null;
  // store relative path from uploads/ onward
  const normalized = file.path.replace(/\\/g, "/");
  const idx = normalized.lastIndexOf("/uploads/");
  return idx !== -1 ? normalized.slice(idx + 1) : normalized;
};

// Shared list helper (used by public/admin)
const listLodges = async (req, res, { isPublic = false } = {}) => {
  try {
    const { page = 1, limit = 50, destination, campType, month } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    // Base fetch (filter in-memory for JSON fields to keep compatibility)
    const lodges = await Lodge.findAll({
      order: [["createdAt", "DESC"]],
      offset,
      limit: limitNum,
    });

    let filtered = lodges.map(normalizeLodge);

    if (destination) {
      filtered = filtered.filter(
        (l) =>
          l.destination &&
          l.destination.toLowerCase() === destination.toLowerCase()
      );
    }

    if (campType) {
      const campTypesRequested = Array.isArray(campType)
        ? campType
        : `${campType}`
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
      if (campTypesRequested.length) {
        filtered = filtered.filter((l) =>
          l.campType.some((ct) =>
            campTypesRequested.some(
              (reqCt) =>
                (ct || "").toLowerCase() === (reqCt || "").toLowerCase()
            )
          )
        );
      }
    }

    if (month) {
      const monthsRequested = Array.isArray(month)
        ? month
        : `${month}`
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
      if (monthsRequested.length) {
        filtered = filtered.filter((l) =>
          l.openMonths.some((m) =>
            monthsRequested.some(
              (reqM) => (m || "").toLowerCase() === (reqM || "").toLowerCase()
            )
          )
        );
      }
    }

    res.status(200).json({
      success: true,
      data: filtered,
      pagination: {
        page: pageNum,
        limit: limitNum,
        returned: filtered.length,
      },
    });
  } catch (error) {
    console.error("Error fetching lodges:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching lodges",
      error: error.message,
    });
  }
};

// Public: list lodges
const getPublicLodges = (req, res) => listLodges(req, res, { isPublic: true });

// Admin: list lodges
const getLodges = (req, res) => listLodges(req, res, { isPublic: false });

// Public: get lodge by id
const getPublicLodgeById = async (req, res) => {
  try {
    const { id } = req.params;
    const lodge = await Lodge.findByPk(id);
    if (!lodge) {
      return res.status(404).json({
        success: false,
        message: "Lodge not found",
      });
    }
    res.status(200).json({ success: true, data: normalizeLodge(lodge) });
  } catch (error) {
    console.error("Error fetching lodge by id:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching lodge",
      error: error.message,
    });
  }
};

// Admin: get lodge by id
const getLodgeById = async (req, res) => {
  try {
    const { id } = req.params;
    const lodge = await Lodge.findByPk(id);
    if (!lodge) {
      return res.status(404).json({
        success: false,
        message: "Lodge not found",
      });
    }
    res.status(200).json({ success: true, data: normalizeLodge(lodge) });
  } catch (error) {
    console.error("Error fetching lodge by id (admin):", error);
    res.status(500).json({
      success: false,
      message: "Error fetching lodge",
      error: error.message,
    });
  }
};

// Admin: create lodge
const createLodge = async (req, res) => {
  try {
    const {
      name,
      location,
      destination,
      description,
      image,
      images,
      campType,
      openMonths,
      latitude,
      longitude,
      whyYouLoveIt,
      highlights,
      dayAtCamp,
      essentials,
      amenities,
    } = req.body;

    if (!name || !location || !destination || !description) {
      return res.status(400).json({
        success: false,
        message: "name, location, destination, and description are required",
      });
    }

    // file uploads - all images go to the images array
    let imagesFromUploads = [];
    if (req.files && Array.isArray(req.files)) {
      imagesFromUploads = req.files.map(mapFileToPath).filter(Boolean);
    }

    const imagesFromBody = Array.isArray(images) ? images : [];

    const lodge = await Lodge.create({
      name,
      location,
      destination,
      description,
      images: [...imagesFromBody, ...imagesFromUploads],
      campType: Array.isArray(campType) ? campType : [],
      openMonths: Array.isArray(openMonths) ? openMonths : [],
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      whyYouLoveIt: Array.isArray(whyYouLoveIt) ? whyYouLoveIt : [],
      highlights: Array.isArray(highlights) ? highlights : [],
      dayAtCamp: Array.isArray(dayAtCamp) ? dayAtCamp : [],
      essentials: Array.isArray(essentials) ? essentials : [],
      amenities: Array.isArray(amenities) ? amenities : [],
    });

    res.status(201).json({ success: true, data: normalizeLodge(lodge) });
  } catch (error) {
    console.error("Error creating lodge:", error);
    res.status(500).json({
      success: false,
      message: "Error creating lodge",
      error: error.message,
    });
  }
};

// Admin: update lodge
const updateLodge = async (req, res) => {
  try {
    const { id } = req.params;
    const lodge = await Lodge.findByPk(id);
    if (!lodge) {
      return res.status(404).json({
        success: false,
        message: "Lodge not found",
      });
    }

    const payload = { ...req.body };

    // Handle images field - could be JSON string from FormData or array
    if (payload.images) {
      if (typeof payload.images === "string") {
        try {
          payload.images = JSON.parse(payload.images);
        } catch (e) {
          payload.images = [];
        }
      }
      if (!Array.isArray(payload.images)) payload.images = [];
    }

    if (payload.campType && !Array.isArray(payload.campType))
      payload.campType = [];
    if (payload.openMonths && !Array.isArray(payload.openMonths))
      payload.openMonths = [];
    if (payload.whyYouLoveIt && !Array.isArray(payload.whyYouLoveIt))
      payload.whyYouLoveIt = [];
    if (payload.highlights && !Array.isArray(payload.highlights))
      payload.highlights = [];
    if (payload.dayAtCamp && !Array.isArray(payload.dayAtCamp))
      payload.dayAtCamp = [];
    if (payload.essentials && !Array.isArray(payload.essentials))
      payload.essentials = [];
    if (payload.amenities && !Array.isArray(payload.amenities))
      payload.amenities = [];

    // file uploads - all images go to the images array (only if files were uploaded)
    let newImages = [];
    if (req.files && Array.isArray(req.files)) {
      newImages = req.files.map(mapFileToPath).filter(Boolean);
    }

    if (!payload.images) {
      payload.images = normalizeLodge(lodge).images || [];
    }
    if (newImages.length) {
      payload.images = [...payload.images, ...newImages];
    }

    await lodge.update(payload);
    res.status(200).json({ success: true, data: normalizeLodge(lodge) });
  } catch (error) {
    console.error("Error updating lodge:", error);
    res.status(500).json({
      success: false,
      message: "Error updating lodge",
      error: error.message,
    });
  }
};

// Admin: delete lodge
const deleteLodge = async (req, res) => {
  try {
    const { id } = req.params;
    const lodge = await Lodge.findByPk(id);
    if (!lodge) {
      return res.status(404).json({
        success: false,
        message: "Lodge not found",
      });
    }
    await lodge.destroy();
    res.status(200).json({ success: true, message: "Lodge deleted" });
  } catch (error) {
    console.error("Error deleting lodge:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting lodge",
      error: error.message,
    });
  }
};

module.exports = {
  getPublicLodges,
  getPublicLodgeById,
  createLodge,
  updateLodge,
  deleteLodge,
  getLodges,
  getLodgeById,
};
