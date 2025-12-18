const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const CAMP_TYPES = [
    "Remote",
    "Family Friendly",
    "Romantic",
    "Private",
    "Spa & Wellness",
  ];

  const Lodge = sequelize.define(
    "Lodge",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      location: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      destination: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      images: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
        comment: "Array of all lodge images (gallery images)",
      },
      campType: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        comment: "Array of camp type strings (enumerated)",
        validate: {
          isValidTypes(value) {
            if (!Array.isArray(value)) return;
            const invalid = value.filter(
              (item) => !CAMP_TYPES.includes(String(item))
            );
            if (invalid.length) {
              throw new Error(
                `Invalid campType entries: ${invalid.join(
                  ", "
                )}. Allowed: ${CAMP_TYPES.join(", ")}`
              );
            }
          },
        },
      },
      openMonths: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        comment: "Array of month names when the lodge is open",
      },
      whyYouLoveIt: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        comment: "Array of bullet points for why you'll love it",
      },
      highlights: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        comment: "Key experience highlights (array of strings)",
      },
      dayAtCamp: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        comment: "Array of bullet points describing a day at camp",
      },
      essentials: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        comment: "Array of essentials bullet points",
      },
      amenities: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        comment: "Array of amenities bullet points",
      },
      latitude: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: true,
      },
      longitude: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: true,
      },
    },
    {
      tableName: "lodges",
      timestamps: true,
    }
  );

  return Lodge;
};
