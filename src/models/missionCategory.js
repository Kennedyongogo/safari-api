const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const MissionCategory = sequelize.define(
    "MissionCategory",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      images: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        comment: "Array of image paths for the category",
      },
      category: {
        type: DataTypes.ENUM("educational_support", "mental_health_awareness", "poverty_alleviation", "community_empowerment", "healthcare_access", "youth_development"),
        allowNull: false,
        defaultValue: "educational_support",
        comment: "Mission category type",
      },
      impact: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        comment: "Array of impact statements (e.g., ['Impact 1', 'Impact 2'])",
      },
    },
    {
      tableName: "mission_categories",
      timestamps: true,
    }
  );

  return MissionCategory;
};

