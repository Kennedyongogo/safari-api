const express = require("express");
const multer = require("multer");
const { uploadStageImages } = require("../controllers/uploadController");
const { authenticateAdmin } = require("../middleware/auth");
const { handleUploadError } = require("../middleware/upload");

// Configure multer for stage images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const path = require("path");
    const fs = require("fs");
    const uploadPath = path.join(__dirname, "..", "..", "uploads", "stages");

    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const extension = require("path").extname(file.originalname);
    const basename = require("path").basename(file.originalname, extension);
    const sanitizedBasename = basename.replace(/[^a-zA-Z0-9]/g, "_");
    const filename = `${sanitizedBasename}-${uniqueSuffix}${extension}`;
    cb(null, filename);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

const router = express.Router();

// Apply authentication to all routes (admin only)
router.use(authenticateAdmin);

// Upload stage images (admin only)
router.post("/stage-images", upload.array("stage_images", 10), handleUploadError, uploadStageImages);

module.exports = router;
