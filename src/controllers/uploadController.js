const fs = require("fs");
const path = require("path");

// Upload stage images
const uploadStageImages = async (req, res) => {
  try {
    const uploadedFiles = req.files || [];

    if (!uploadedFiles || uploadedFiles.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No files uploaded",
      });
    }

    // Generate URLs for uploaded files
    const imageUrls = uploadedFiles.map(file => {
      // Return the web-accessible URL path
      // file.path is already the full path to the uploaded file
      // We need to extract just the part after /uploads/
      const uploadsIndex = file.path.indexOf('uploads');
      if (uploadsIndex !== -1) {
        const relativePath = file.path.substring(uploadsIndex); // e.g., "uploads/stages/image.jpg"
        return `/${relativePath.replace(/\\/g, "/")}`;
      }
      // Fallback to the old method
      const relativePath = path.relative(
        path.join(__dirname, "..", "..", "uploads"),
        file.path
      );
      return `/uploads/${relativePath.replace(/\\/g, "/")}`;
    });

    res.status(200).json({
      success: true,
      message: `${uploadedFiles.length} image(s) uploaded successfully`,
      data: {
        urls: imageUrls,
        files: uploadedFiles.map(file => ({
          filename: file.filename,
          originalname: file.originalname,
          size: file.size,
          mimetype: file.mimetype,
        })),
      },
    });
  } catch (error) {
    console.error("Error uploading stage images:", error);
    res.status(500).json({
      success: false,
      message: "Error uploading images",
      error: error.message,
    });
  }
};

module.exports = {
  uploadStageImages,
};
