const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Post = sequelize.define(
    "Post",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      type: {
        type: DataTypes.ENUM("news", "event"),
        allowNull: false,
        comment: "Type of post: news or event",
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      images: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        comment: "Array of image paths (for news posts)",
      },
      banner: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Banner image path (for event posts)",
      },
      start_date: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "Event start date (for event posts)",
      },
      end_date: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "Event end date (for event posts)",
      },
      location: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Event location (for event posts)",
      },
      status: {
        type: DataTypes.ENUM("draft", "published", "archived", "upcoming", "ongoing", "completed", "cancelled"),
        defaultValue: "draft",
        allowNull: false,
        comment: "Status: draft/published/archived for news, upcoming/ongoing/completed/cancelled for events",
      },
      created_by: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: "admin_users",
          key: "id",
        },
      },
    },
    {
      tableName: "posts",
      timestamps: true,
    }
  );

  return Post;
};

