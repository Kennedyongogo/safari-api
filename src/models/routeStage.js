const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const RouteStage = sequelize.define(
    "RouteStage",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      packageId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "packages",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      stage: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: "Stage number in the itinerary (1, 2, 3, etc.)",
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "Name of the stage/location",
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      longitude: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: true,
        comment: "Longitude coordinate",
      },
      latitude: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: true,
        comment: "Latitude coordinate",
      },
      images: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        comment: "Array of image URLs for this stage",
      },
      duration: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      activities: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        comment: "Array of activities available at this stage",
      },
      accommodation: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      meals: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      transportation: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      highlights: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        comment: "Array of key highlights for this stage",
      },
      tips: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Travel tips and recommendations",
      },
      wildlife: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        comment: "Array of wildlife that can be spotted at this location",
      },
    },
    {
      tableName: "route_stages",
      timestamps: true,
      indexes: [
        {
          fields: ["packageId"],
        },
        {
          fields: ["stage"],
        },
        {
          fields: ["packageId", "stage"],
          unique: true,
          comment: "Ensure stage numbers are unique within each package",
        },
      ],
    }
  );

  return RouteStage;
};
