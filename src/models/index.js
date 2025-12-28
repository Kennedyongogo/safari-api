const { sequelize } = require("../config/database");

// Import all models
const AdminUser = require("./adminUser")(sequelize);
const Inquiry = require("./inquiry")(sequelize);
const Project = require("./project")(sequelize);
const Document = require("./document")(sequelize);
const AuditTrail = require("./auditTrail")(sequelize);
const Review = require("./review")(sequelize);
const Blog = require("./blog")(sequelize);
const MissionCategory = require("./missionCategory")(sequelize);
const Post = require("./post")(sequelize);
const Member = require("./member")(sequelize);
const Lodge = require("./lodge")(sequelize);
const Package = require("./package")(sequelize);
const RouteStage = require("./routeStage")(sequelize);
const Destination = require("./destination")(sequelize);

const models = {
  AdminUser,
  Inquiry,
  Project,
  Document,
  AuditTrail,
  Review,
  Blog,
  MissionCategory,
  Post,
  Member,
  Lodge,
  Package,
  RouteStage,
  Destination,
};

// Initialize models in correct order (parent tables first)
const initializeModels = async () => {
  try {
    console.log("🔄 Creating/updating tables...");

    // Use alter: false to prevent schema conflicts in production
    console.log("📋 Syncing tables...");
    await AdminUser.sync({ force: false, alter: false });
    await Inquiry.sync({ force: false, alter: false });
    await Project.sync({ force: false, alter: false });
    await Document.sync({ force: false, alter: false });
    await AuditTrail.sync({ force: false, alter: false }); // Allow enum additions
    await Review.sync({ force: false, alter: false });
    await Blog.sync({ force: false, alter: false });
    await MissionCategory.sync({ force: false, alter: false });
    await Post.sync({ force: false, alter: false });
    await Member.sync({ force: false, alter: false });
    await Lodge.sync({ force: false, alter: false });
    await Package.sync({ force: false, alter: false });
    await RouteStage.sync({ force: false, alter: false });
    await Destination.sync({ force: false, alter: false });

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
    // AdminUser → Project (1:Many for created_by)
    models.AdminUser.hasMany(models.Project, {
      foreignKey: "created_by",
      as: "createdProjects",
    });
    models.Project.belongsTo(models.AdminUser, {
      foreignKey: "created_by",
      as: "creator",
    });

    // AdminUser → Project (1:Many for assigned_by)
    models.AdminUser.hasMany(models.Project, {
      foreignKey: "assigned_by",
      as: "assignedProjects",
    });
    models.Project.belongsTo(models.AdminUser, {
      foreignKey: "assigned_by",
      as: "assigner",
    });

    // AdminUser → Project (1:Many for assigned_to)
    models.AdminUser.hasMany(models.Project, {
      foreignKey: "assigned_to",
      as: "assignedToProjects",
    });
    models.Project.belongsTo(models.AdminUser, {
      foreignKey: "assigned_to",
      as: "assignee",
    });

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

    // AdminUser → Post (1:Many)
    models.AdminUser.hasMany(models.Post, {
      foreignKey: "created_by",
      as: "createdPosts",
    });
    models.Post.belongsTo(models.AdminUser, {
      foreignKey: "created_by",
      as: "creator",
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

    console.log("✅ All associations set up successfully");
  } catch (error) {
    console.error("❌ Error during setupAssociations:", error);
  }
};

module.exports = { ...models, initializeModels, setupAssociations, sequelize };
