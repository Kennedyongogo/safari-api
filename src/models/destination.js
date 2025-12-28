const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const DESTINATION_CATEGORIES = [
    "Wildlife Adventures",
    "Nature Exploration",
    "Cultural Experiences",
  ];

  const Destination = sequelize.define(
    "Destination",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      title: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: "Destination name (e.g., Kenya, Uganda)",
      },
      slug: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        comment: "URL-friendly slug for routing",
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: "Main destination description",
      },
      location: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: "Geographic region (e.g., East Africa)",
      },

      // Media Assets
      hero_image: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: "Main hero image URL",
      },
      hero_image_alt: {
        type: DataTypes.STRING(200),
        allowNull: true,
        comment: "Alt text for hero image accessibility",
      },
      gallery_images: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        comment: "Array of additional gallery image URLs",
      },

      // Travel Information
      duration_min: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "Minimum duration in days",
      },
      duration_max: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "Maximum duration in days",
      },
      duration_display: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: "Human-readable duration (e.g., '5-14 Days')",
      },
      best_visit_months: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        comment: "Array of best months to visit (e.g., ['July', 'August', 'September', 'October'])",
      },

      // Wildlife Information
      wildlife_types: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        comment: "Array of wildlife types (e.g., ['Big Five', 'Great Migration'])",
      },
      featured_species: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        comment: "Key species to highlight",
      },

      // Content Arrays
      key_highlights: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        comment: "Array of key attraction names (e.g., ['Maasai Mara', 'Amboseli'])",
      },
      attractions: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        comment: "Array of attraction objects with name, description, and images",
      },

      // Categories/Tags
      category_tags: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        comment: "Array of category tags (e.g., ['Wildlife Adventures', 'Cultural Experiences'])",
        validate: {
          isValidTags(value) {
            if (!Array.isArray(value)) return;
            const invalid = value.filter(
              (item) => !DESTINATION_CATEGORIES.includes(String(item))
            );
            if (invalid.length) {
              throw new Error(
                `Invalid category_tags entries: ${invalid.join(
                  ", "
                )}. Allowed: ${DESTINATION_CATEGORIES.join(", ")}`
              );
            }
          },
        },
      },

      // Status and Ordering
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: "Whether destination is currently available",
      },
      sort_order: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: "Display order on website",
      },
    },
    {
      tableName: "destinations",
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ["slug"],
        },
        {
          fields: ["location"],
        },
        {
          fields: ["is_active"],
        },
        {
          fields: ["sort_order"],
        },
      ],
    }
  );

  return Destination;
};
