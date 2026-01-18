const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const InterestGallery = sequelize.define(
    "InterestGallery",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      title: {
        type: DataTypes.STRING(200),
        allowNull: false,
        comment: "Gallery item title/description",
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Optional detailed description",
      },
      type: {
        type: DataTypes.ENUM("image", "video"),
        allowNull: false,
        comment: "Media type: image or video",
      },
      filePath: {
        type: DataTypes.STRING(500),
        allowNull: false,
        comment:
          "Relative path to the uploaded file (e.g., uploads/interest-gallery/filename.jpg)",
      },
      originalName: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: "Original filename before upload",
      },
      mimeType: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: "File MIME type (e.g., image/jpeg, video/mp4)",
      },
      fileSize: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: "File size in bytes",
      },
      // Image-specific fields
      width: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "Image width in pixels (null for videos)",
      },
      height: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "Image height in pixels (null for videos)",
      },
      altText: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: "Alt text for accessibility (images only)",
      },
      // Video-specific fields
      duration: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "Video duration in seconds (null for images)",
      },
      thumbnailPath: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: "Path to video thumbnail image (videos only)",
      },
      // Categorization
      category: {
        type: DataTypes.ENUM(
          "adventure",
          "classic",
          "meaningful",
          "retreats",
          "special_interest",
          "general"
        ),
        allowNull: false,
        defaultValue: "general",
        comment: "By Interest category for organization",
      },
      tags: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
        comment: "Array of tag strings for filtering/searching",
      },
      // Display options
      isFeatured: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: "Whether to feature this item prominently",
      },
      priority: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: "Display priority/order (higher numbers = higher priority)",
      },
      // Status
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: "Whether the interest gallery item is active/visible",
      },
      // Audit fields
      created_by: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: "admin_users",
          key: "id",
        },
      },
      updated_by: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: "admin_users",
          key: "id",
        },
      },
      isDeleted: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: "Soft delete flag",
      },
    },
    {
      tableName: "interest_galleries",
      timestamps: true,
      paranoid: true,
      indexes: [
        { fields: ["type"] },
        { fields: ["category"] },
        { fields: ["isFeatured"] },
        { fields: ["isActive"] },
        { fields: ["priority"] },
        { fields: ["createdAt"] },
      ],
      validate: {
        videoFieldsOnlyForVideos() {
          if (this.type === "image") {
            if (this.duration !== null) {
              throw new Error("Duration can only be set for videos");
            }
            if (this.thumbnailPath !== null) {
              throw new Error("Thumbnail path can only be set for videos");
            }
          }
        },
        imageFieldsOnlyForImages() {
          if (this.type === "video") {
            if (this.width !== null || this.height !== null) {
              throw new Error("Width and height can only be set for images");
            }
            if (this.altText !== null) {
              throw new Error("Alt text can only be set for images");
            }
          }
        },
      },
    }
  );

  return InterestGallery;
};

