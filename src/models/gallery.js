const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Gallery = sequelize.define(
    "Gallery",
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
        comment: "Relative path to the uploaded file (e.g., uploads/gallery/filename.jpg)",
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
          "wildlife",
          "landscapes",
          "safari",
          "culture",
          "accommodation",
          "activities",
          "general"
        ),
        allowNull: false,
        defaultValue: "general",
        comment: "Content category for organization",
      },
      tags: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
        comment: "Array of tag strings for filtering/searching",
      },
      // Location/Association
      location: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: "Location where the media was captured (e.g., 'Maasai Mara')",
      },
      packageId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: "packages",
          key: "id",
        },
        comment: "Associated package ID if media is for a specific tour",
      },
      destinationId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: "destinations",
          key: "id",
        },
        comment: "Associated destination ID if media is for a specific location",
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
        comment: "Whether the gallery item is active/visible",
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
      tableName: "galleries",
      timestamps: true,
      paranoid: true, // Enable soft deletes
      indexes: [
        {
          fields: ["type"],
        },
        {
          fields: ["category"],
        },
        {
          fields: ["isFeatured"],
        },
        {
          fields: ["isActive"],
        },
        {
          fields: ["priority"],
        },
        {
          fields: ["packageId"],
        },
        {
          fields: ["destinationId"],
        },
        {
          fields: ["createdAt"],
        },
      ],
      // Custom validation
      validate: {
        // Ensure video-specific fields are only set for videos
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
        // Ensure image-specific fields are only set for images
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

  return Gallery;
};
