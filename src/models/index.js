const { sequelize } = require("../config/database");

// Import all models
const AdminUser = require("./adminUser")(sequelize);
const Document = require("./document")(sequelize);
const AuditTrail = require("./auditTrail")(sequelize);
const Review = require("./review")(sequelize);
const Blog = require("./blog")(sequelize);
const Member = require("./member")(sequelize);
const Lodge = require("./lodge")(sequelize);
const Package = require("./package")(sequelize);
const RouteStage = require("./routeStage")(sequelize);
const Destination = require("./destination")(sequelize);
const Gallery = require("./gallery")(sequelize);
const TravellerGallery = require("./travellerGallery")(sequelize);
const InterestGallery = require("./interestGallery")(sequelize);
const PackageInquiry = require("./packageInquiry")(sequelize);

// Dynamic Form Models
const Form = require("./form")(sequelize);
const FormField = require("./formField")(sequelize);
const FieldOption = require("./fieldOption")(sequelize);
const FormSubmission = require("./formSubmission")(sequelize);

const models = {
  AdminUser,
  Document,
  AuditTrail,
  Review,
  Blog,
  Member,
  Lodge,
  Package,
  RouteStage,
  Destination,
  Gallery,
  TravellerGallery,
  InterestGallery,
  PackageInquiry,
  // Dynamic Form Models
  Form,
  FormField,
  FieldOption,
  FormSubmission,
};

// Initialize models in correct order (parent tables first)
const initializeModels = async () => {
  try {
    console.log("🔄 Creating/updating tables...");

    // Use alter: false to prevent schema conflicts in production
    console.log("📋 Syncing tables...");
    await AdminUser.sync({ force: false, alter: false });
    await Document.sync({ force: false, alter: false });
    await AuditTrail.sync({ force: false, alter: false }); // Allow schema changes for enum updates
    await Review.sync({ force: false, alter: false });
    await Blog.sync({ force: false, alter: false });
    await Member.sync({ force: false, alter: false });
    await Lodge.sync({ force: false, alter: false });
    await Package.sync({ force: false, alter: false });
    await RouteStage.sync({ force: false, alter: false });
    await Destination.sync({ force: false, alter: false });
    await Gallery.sync({ force: false, alter: false });
    await TravellerGallery.sync({ force: false, alter: false });
    await InterestGallery.sync({ force: false, alter: false });
    await PackageInquiry.sync({ force: false, alter: false });

    // Dynamic Form Models
    await Form.sync({ force: false, alter: false });
    await FormField.sync({ force: false, alter: false }); // Allow schema changes for conditional logic
    await FieldOption.sync({ force: false, alter: false });
    await FormSubmission.sync({ force: false, alter: false });

    console.log("✅ All models synced successfully");
  } catch (error) {
    console.error("❌ Error syncing models:", error);
    console.error("❌ Error details:", {
      name: error.name,
      message: error.message,
      parent: error.parent?.message,
      original: error.original?.message,
      sql: error.sql,
    });
    throw error;
  }
};

const setupAssociations = () => {
  try {
    // AdminUser → Document (1:Many for uploaded_by)
    models.AdminUser.hasMany(models.Document, {
      foreignKey: "uploaded_by",
      as: "uploadedDocuments",
    });
    models.Document.belongsTo(models.AdminUser, {
      foreignKey: "uploaded_by",
      as: "uploader",
    });

    // AdminUser → AuditTrail (1:Many)
    models.AdminUser.hasMany(models.AuditTrail, {
      foreignKey: "user_id",
      as: "auditLogs",
    });
    models.AuditTrail.belongsTo(models.AdminUser, {
      foreignKey: "user_id",
      as: "user",
    });

    // AdminUser → Blog (1:Many)
    models.AdminUser.hasMany(models.Blog, {
      foreignKey: "created_by",
      as: "createdBlogs",
    });
    models.Blog.belongsTo(models.AdminUser, {
      foreignKey: "created_by",
      as: "creator",
    });

    // Package → RouteStage (1:Many)
    models.Package.hasMany(models.RouteStage, {
      foreignKey: "packageId",
      as: "routeStages",
      onDelete: "CASCADE",
    });
    models.RouteStage.belongsTo(models.Package, {
      foreignKey: "packageId",
      as: "package",
    });

    // Gallery Associations
    models.AdminUser.hasMany(models.Gallery, {
      foreignKey: "created_by",
      as: "createdGalleryItems",
    });
    models.Gallery.belongsTo(models.AdminUser, {
      foreignKey: "created_by",
      as: "creator",
    });

    models.AdminUser.hasMany(models.Gallery, {
      foreignKey: "updated_by",
      as: "updatedGalleryItems",
    });
    models.Gallery.belongsTo(models.AdminUser, {
      foreignKey: "updated_by",
      as: "updater",
    });

    // TravellerGallery Associations
    models.AdminUser.hasMany(models.TravellerGallery, {
      foreignKey: "created_by",
      as: "createdTravellerGalleryItems",
    });
    models.TravellerGallery.belongsTo(models.AdminUser, {
      foreignKey: "created_by",
      as: "creator",
    });

    models.AdminUser.hasMany(models.TravellerGallery, {
      foreignKey: "updated_by",
      as: "updatedTravellerGalleryItems",
    });
    models.TravellerGallery.belongsTo(models.AdminUser, {
      foreignKey: "updated_by",
      as: "updater",
    });

    // InterestGallery Associations
    models.AdminUser.hasMany(models.InterestGallery, {
      foreignKey: "created_by",
      as: "createdInterestGalleryItems",
    });
    models.InterestGallery.belongsTo(models.AdminUser, {
      foreignKey: "created_by",
      as: "creator",
    });

    models.AdminUser.hasMany(models.InterestGallery, {
      foreignKey: "updated_by",
      as: "updatedInterestGalleryItems",
    });
    models.InterestGallery.belongsTo(models.AdminUser, {
      foreignKey: "updated_by",
      as: "updater",
    });

    // Gallery → Package (optional)
    models.Package.hasMany(models.Gallery, {
      foreignKey: "packageId",
      as: "galleryItems",
    });
    models.Gallery.belongsTo(models.Package, {
      foreignKey: "packageId",
      as: "package",
    });

    // Gallery → Destination (optional)
    models.Destination.hasMany(models.Gallery, {
      foreignKey: "destinationId",
      as: "galleryItems",
    });
    models.Gallery.belongsTo(models.Destination, {
      foreignKey: "destinationId",
      as: "destination",
    });

    // Dynamic Form Associations
    // Form → FormField (1:Many)
    models.Form.hasMany(models.FormField, {
      foreignKey: "form_id",
      as: "fields",
      onDelete: "CASCADE",
    });
    models.FormField.belongsTo(models.Form, {
      foreignKey: "form_id",
      as: "form",
    });

    // FormField → FieldOption (1:Many)
    models.FormField.hasMany(models.FieldOption, {
      foreignKey: "form_field_id",
      as: "options",
      onDelete: "CASCADE",
    });
    models.FieldOption.belongsTo(models.FormField, {
      foreignKey: "form_field_id",
      as: "field",
    });

    // Form → FormSubmission (1:Many)
    models.Form.hasMany(models.FormSubmission, {
      foreignKey: "form_id",
      as: "submissions",
      onDelete: "CASCADE",
    });
    models.FormSubmission.belongsTo(models.Form, {
      foreignKey: "form_id",
      as: "form",
    });

    // AdminUser → Form (created_by/updated_by)
    models.AdminUser.hasMany(models.Form, {
      foreignKey: "created_by",
      as: "createdForms",
    });
    models.Form.belongsTo(models.AdminUser, {
      foreignKey: "created_by",
      as: "creator",
    });

    models.AdminUser.hasMany(models.Form, {
      foreignKey: "updated_by",
      as: "updatedForms",
    });
    models.Form.belongsTo(models.AdminUser, {
      foreignKey: "updated_by",
      as: "updater",
    });

    // AdminUser → FormSubmission (reviewed_by)
    models.AdminUser.hasMany(models.FormSubmission, {
      foreignKey: "reviewed_by",
      as: "reviewedSubmissions",
    });
    models.FormSubmission.belongsTo(models.AdminUser, {
      foreignKey: "reviewed_by",
      as: "reviewer",
    });

    // PackageInquiry → Destination
    models.PackageInquiry.belongsTo(models.Destination, {
      foreignKey: "destination_id",
      as: "destination",
    });
    models.Destination.hasMany(models.PackageInquiry, {
      foreignKey: "destination_id",
      as: "inquiries",
    });

    // PackageInquiry → AdminUser (replied_by)
    models.PackageInquiry.belongsTo(models.AdminUser, {
      foreignKey: "replied_by",
      as: "replier",
    });
    models.AdminUser.hasMany(models.PackageInquiry, {
      foreignKey: "replied_by",
      as: "repliedInquiries",
    });

    console.log("✅ All associations set up successfully");
  } catch (error) {
    console.error("❌ Error during setupAssociations:", error);
  }
};

module.exports = { ...models, initializeModels, setupAssociations, sequelize };
