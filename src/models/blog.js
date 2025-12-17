const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Blog = sequelize.define(
    "Blog",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      slug: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      excerpt: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      content: {
        type: DataTypes.TEXT("long"),
        allowNull: false,
      },
      featuredImage: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Uploaded featured/hero image path",
      },
      heroAltText: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      category: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      tags: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
        comment: "List of tag strings",
      },
      featured: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      priority: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: "Controls ordering for featured items",
      },
      authorName: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      authorImage: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      authorBio: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      authorId: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Optional FK placeholder to admin users",
      },
      publishDate: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      readTime: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "Estimated minutes to read",
      },
      status: {
        type: DataTypes.ENUM("draft", "published", "archived"),
        allowNull: false,
        defaultValue: "draft",
      },
      views: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      likes: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      shareCountFacebook: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      shareCountTwitter: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      shareCountLinkedIn: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      metaTitle: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      metaDescription: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      ogImage: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      canonicalUrl: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      relatedPostIds: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
        comment: "Array of related blog IDs",
      },
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
      },
    },
    {
      tableName: "blogs",
      timestamps: true,
      paranoid: true,
      indexes: [
        { unique: true, fields: ["slug"] },
        { fields: ["category"] },
        { fields: ["status"] },
        { fields: ["featured"] },
      ],
    }
  );

  return Blog;
};
