const express = require("express");
const path = require("path");
const cors = require("cors");
const fs = require("fs");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");

const { initializeModels, setupAssociations } = require("./models");
const { AdminUser } = require("./models");
const { errorHandler } = require("./middleware/errorHandler");
const { initializeChatbot } = require("./controllers/chatbotController");

// Import all routes
const adminUserRoutes = require("./routes/adminUserRoutes");
const documentRoutes = require("./routes/documentRoutes");
const auditTrailRoutes = require("./routes/auditTrailRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const chatbotRoutes = require("./routes/chatbotRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const blogRoutes = require("./routes/blogRoutes");
const memberRoutes = require("./routes/memberRoutes");
const lodgeRoutes = require("./routes/lodgeRoutes");
const packageRoutes = require("./routes/packageRoutes");
const routeStageRoutes = require("./routes/routeStageRoutes");
const destinationRoutes = require("./routes/destinationRoutes");
const galleryRoutes = require("./routes/galleryRoutes");
const travellerGalleryRoutes = require("./routes/travellerGalleryRoutes");
const interestGalleryRoutes = require("./routes/interestGalleryRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const formRoutes = require("./routes/formRoutes");
const formFieldRoutes = require("./routes/formFieldRoutes");
const packageInquiryRoutes = require("./routes/packageInquiryRoutes");

const app = express();

// Middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cors());

// Static file serving
const profilesUploadPath = path.join(__dirname, "..", "uploads", "profiles");
const documentsUploadPath = path.join(__dirname, "..", "uploads", "documents");
const authorsUploadPath = path.join(__dirname, "..", "uploads", "authors");
const lodgesUploadPath = path.join(__dirname, "..", "uploads", "lodges");
const packagesUploadPath = path.join(__dirname, "..", "uploads", "packages");
const stagesUploadPath = path.join(__dirname, "..", "uploads", "stages");
const destinationsUploadPath = path.join(__dirname, "..", "uploads", "destinations");
const galleryUploadPath = path.join(__dirname, "..", "uploads", "gallery");
const travellerGalleryUploadPath = path.join(__dirname, "..", "uploads", "traveller-gallery");
const interestGalleryUploadPath = path.join(__dirname, "..", "uploads", "interest-gallery");
const miscUploadPath = path.join(__dirname, "..", "uploads", "misc");
const postsUploadPath = path.join(__dirname, "..", "uploads", "posts");

console.log("📁 Upload Paths:");
console.log(
  "  - Profiles:",
  profilesUploadPath,
  "- Exists:",
  fs.existsSync(profilesUploadPath)
);
console.log(
  "  - Documents:",
  documentsUploadPath,
  "- Exists:",
  fs.existsSync(documentsUploadPath)
);
console.log(
  "  - Authors:",
  authorsUploadPath,
  "- Exists:",
  fs.existsSync(authorsUploadPath)
);
console.log(
  "  - Lodges:",
  lodgesUploadPath,
  "- Exists:",
  fs.existsSync(lodgesUploadPath)
);
console.log(
  "  - Gallery:",
  galleryUploadPath,
  "- Exists:",
  fs.existsSync(galleryUploadPath)
);
console.log(
  "  - Traveller Gallery:",
  travellerGalleryUploadPath,
  "- Exists:",
  fs.existsSync(travellerGalleryUploadPath)
);
console.log(
  "  - Interest Gallery:",
  interestGalleryUploadPath,
  "- Exists:",
  fs.existsSync(interestGalleryUploadPath)
);
console.log(
  "  - Misc:",
  miscUploadPath,
  "- Exists:",
  fs.existsSync(miscUploadPath)
);
console.log(
  "  - Posts:",
  postsUploadPath,
  "- Exists:",
  fs.existsSync(postsUploadPath)
);

// Serve static files
app.use("/uploads/profiles", express.static(profilesUploadPath));
app.use("/uploads/documents", express.static(documentsUploadPath));
app.use("/uploads/authors", express.static(authorsUploadPath));
app.use("/uploads/lodges", express.static(lodgesUploadPath));
app.use("/uploads/packages", express.static(packagesUploadPath));
app.use("/uploads/stages", express.static(stagesUploadPath));
app.use("/uploads/destinations", express.static(destinationsUploadPath));
app.use("/uploads/gallery", express.static(galleryUploadPath));
app.use("/uploads/traveller-gallery", express.static(travellerGalleryUploadPath));
app.use("/uploads/interest-gallery", express.static(interestGalleryUploadPath));
app.use("/uploads/misc", express.static(miscUploadPath));
app.use("/uploads/posts", express.static(postsUploadPath));

// API routes
console.log("🔗 Registering API routes...");

app.use("/api/reviews", reviewRoutes);
console.log("✅ /api/reviews route registered");

app.use("/api/blogs", blogRoutes);
console.log("✅ /api/blogs route registered");

app.use("/api/admin-users", adminUserRoutes);
console.log("✅ /api/admin-users route registered");

app.use("/api/documents", documentRoutes);
console.log("✅ /api/documents route registered");

app.use("/api/audit-trail", auditTrailRoutes);
console.log("✅ /api/audit-trail route registered");

app.use("/api/analytics", analyticsRoutes);
console.log("✅ /api/analytics route registered");

app.use("/api/chatbot", chatbotRoutes);
console.log("✅ /api/chatbot route registered");

app.use("/api/members", memberRoutes);
console.log("✅ /api/members route registered");

app.use("/api/lodges", lodgeRoutes);
app.use("/api/packages", packageRoutes);
app.use("/api/route-stages", routeStageRoutes);
app.use("/api/destinations", destinationRoutes);
app.use("/api/gallery", galleryRoutes);
app.use("/api/traveller-gallery", travellerGalleryRoutes);
app.use("/api/interest-gallery", interestGalleryRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/forms", formRoutes);
app.use("/api/form-fields", formFieldRoutes);
app.use("/api/package-inquiries", packageInquiryRoutes);
console.log("✅ /api/lodges route registered");
console.log("✅ /api/uploads route registered");
console.log("✅ /api/package-inquiries route registered");

// Forgot password endpoint
app.post("/api/auth/forgot", async (req, res) => {
  try {
    const { Email } = req.body;

    if (!Email) {
      return res.status(400).json({
        success: false,
        error: "Email is required",
      });
    }

    // Find admin by email
    const admin = await AdminUser.findOne({ where: { email: Email } });
    if (!admin) {
      return res.status(404).json({
        success: false,
        error: "No account found with this email address",
      });
    }

    // Generate a new random password (8 characters)
    const newPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update admin password
    await admin.update({ password: hashedPassword });

    // Send email with new password
    try {
      // Create transporter (using Gmail SMTP)
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: "ongogokennedy89@gmail.com", // Your Gmail
          pass: "mnfj zxio cgxw zefv", // Your Gmail App Password
        },
      });

      // Email content
      const mailOptions = {
        from: "ongogokennedy89@gmail.com", // Your Gmail
        to: Email,
        subject: "Password Reset - Mwalimu Hope Foundation Admin Portal",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Password Reset Request</h2>
            <p>Hello ${admin.full_name},</p>
            <p>Your password has been reset for the Mwalimu Hope Foundation Admin Portal.</p>
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3 style="color: #666; margin-top: 0;">Your New Login Credentials:</h3>
              <p><strong>Email:</strong> ${Email}</p>
              <p><strong>New Password:</strong> <code style="background-color: #e9e9e9; padding: 2px 6px; border-radius: 3px;">${newPassword}</code></p>
            </div>
            <p>Please login with these credentials and change your password immediately for security reasons.</p>
            <p>If you did not request this password reset, please contact the administrator immediately.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #666; font-size: 12px;">This is an automated message from Mwalimu Hope Foundation Admin Portal.</p>
          </div>
        `,
      };

      // Send email
      await transporter.sendMail(mailOptions);
    } catch (emailError) {
      // Don't fail the request if email fails, just log it silently
    }

    res.status(200).json({
      success: true,
      message: "Password reset email sent",
    });
  } catch (error) {
    console.error("Error in forgot password:", error);
    res.status(500).json({
      success: false,
      error: "Error processing password reset",
    });
  }
});
console.log("✅ /api/auth/forgot route registered");

console.log("✅ All API routes registered");

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API is running",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

// 404 handler for API routes (must be after all other routes)
app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({
      success: false,
      message: "API endpoint not found",
      path: req.originalUrl,
    });
  }
  next();
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Create upload directories if they don't exist
const createUploadDirectories = () => {
  const uploadDirs = [
    path.join(__dirname, "..", "uploads"),
    path.join(__dirname, "..", "uploads", "profiles"),
    path.join(__dirname, "..", "uploads", "documents"),
    path.join(__dirname, "..", "uploads", "lodges"),
    path.join(__dirname, "..", "uploads", "stages"),
    path.join(__dirname, "..", "uploads", "gallery"),
    path.join(__dirname, "..", "uploads", "traveller-gallery"),
    path.join(__dirname, "..", "uploads", "interest-gallery"),
    path.join(__dirname, "..", "uploads", "misc"),
  ];

  uploadDirs.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Created upload directory: ${dir}`);
    }
  });
};

// Initialize models and associations
const initializeApp = async () => {
  try {
    console.log("🚀 Initializing application...");

    // Create upload directories
    createUploadDirectories();
    console.log("✅ Upload directories ready");

    // Initialize database models
    await initializeModels();
    console.log("✅ Database models initialized");

    // Setup model associations
    setupAssociations();
    console.log("✅ Model associations configured");

    // Initialize chatbot
    initializeChatbot();
    console.log("✅ Chatbot initialized");

    console.log("✅ Application initialized successfully");
    return true;
  } catch (error) {
    console.error("❌ Error initializing application:", error);
    console.error("❌ Full error details:", {
      name: error.name,
      message: error.message,
      stack: error.stack,
      parent: error.parent?.message,
      original: error.original?.message,
    });
    throw error;
  }
};

// Export the initialization promise
const appInitialized = initializeApp();

module.exports = { app, appInitialized };
