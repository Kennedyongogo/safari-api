const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  // Predefined package categories based on TOC structure - using ENUM
  // Includes categories for Uganda, Kenya, Tanzania, and Rwanda destinations
  const PACKAGE_CATEGORIES_ENUM = DataTypes.ENUM(
    // Uganda categories
    "CLASSIC UGANDA SAFARI TOURS",
    "PRIMATE SAFARIS",
    "ADVENTURE & NATURE EXPERIENCES",
    "COMBINED SAFARI & PRIMATE HOLIDAYS",
    "SPECIAL INTEREST & SLOW TRAVEL",
    // Kenya categories
    "SAFARI TOURS",
    "CLIMB MOUNT KENYA PACKAGES",
    "BEACH EXTENSION PACKAGES",
    "COMBINED SAFARI & BEACH HOLIDAYS",
    "SPECIAL INTEREST SAFARI",
    // Tanzania categories
    "NORTHERN CIRCUIT SAFARI TOURS",
    "SOUTHERN & WESTERN CIRCUIT SAFARIS",
    "MOUNT KILIMANJARO CLIMBS",
    "ZANZIBAR BEACH EXTENSIONS",
    "COMBINED SAFARI & BEACH HOLIDAYS",
    // Rwanda categories
    "GORILLA & PRIMATE SAFARIS",
    "WILDLIFE & SCENIC SAFARIS",
    "CULTURE, SCENERY & RELAXATION"
  );

  // Array version for validation and frontend use
  const PACKAGE_CATEGORIES = [
    // Uganda categories
    "CLASSIC UGANDA SAFARI TOURS",
    "PRIMATE SAFARIS",
    "ADVENTURE & NATURE EXPERIENCES",
    "COMBINED SAFARI & PRIMATE HOLIDAYS",
    "SPECIAL INTEREST & SLOW TRAVEL",
    // Kenya categories
    "SAFARI TOURS",
    "CLIMB MOUNT KENYA PACKAGES",
    "BEACH EXTENSION PACKAGES",
    "COMBINED SAFARI & BEACH HOLIDAYS",
    "SPECIAL INTEREST SAFARI",
    // Tanzania categories
    "NORTHERN CIRCUIT SAFARI TOURS",
    "SOUTHERN & WESTERN CIRCUIT SAFARIS",
    "MOUNT KILIMANJARO CLIMBS",
    "ZANZIBAR BEACH EXTENSIONS",
    "COMBINED SAFARI & BEACH HOLIDAYS",
    // Rwanda categories
    "GORILLA & PRIMATE SAFARIS",
    "WILDLIFE & SCENIC SAFARIS",
    "CULTURE, SCENERY & RELAXATION",
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
      subtitle: {
        type: DataTypes.STRING(200),
        allowNull: true,
        comment: "Destination tagline/subtitle (e.g., 'THE PEARL OF AFRICA')",
      },
      slug: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        comment: "URL-friendly slug for routing",
      },
      brief_description: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: "Brief description of the destination/country",
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

      // Packages organized by categories
      // Structure: [
      //   {
      //     category_name: "CLASSIC UGANDA SAFARI TOURS",
      //     category_order: 1,
      //     packages: [
      //       {
      //         number: 1,
      //         title: "3-Day Murchison Falls Wildlife & Nile Safari",
      //         short_description: "Uganda's most iconic park with waterfalls, wildlife, and the Nile.",
      //         highlights: [
      //           "Game drives on the northern bank",
      //           "Boat safari to the base of Murchison Falls",
      //           "Views of the Nile squeezing through a 7-metre gorge"
      //         ],
      //         pricing_tiers: [
      //           { tier: "Mid-range", price_range: "USD 750–1,100 per person" },
      //           { tier: "Luxury", price_range: "USD 1,400–2,200 per person" }
      //         ],
      //         gallery: [
      //           "https://example.com/image1.jpg",
      //           "https://example.com/image2.jpg"
      //         ],
      //         itinerary: [
      //           {
      //             day: 1,
      //             description: "Nairobi to Maasai Mara, afternoon game drive",
      //             start_location: {
      //               latitude: -1.2921,  // Nairobi
      //               longitude: 36.8219
      //             },
      //             end_location: {
      //               latitude: -1.4042,  // Maasai Mara
      //               longitude: 35.0094
      //             }
      //           },
      //           {
      //             day: 2,
      //             description: "Full-day game drive with packed lunch",
      //             start_location: {
      //               latitude: -1.4042,  // Maasai Mara (same location)
      //               longitude: 35.0094
      //             }
      //             // end_location omitted - means same location as start
      //           },
      //           {
      //             day: 3,
      //             description: "Morning game drive, return to Nairobi",
      //             start_location: {
      //               latitude: -1.4042,  // Maasai Mara
      //               longitude: 35.0094
      //             },
      //             end_location: {
      //               latitude: -1.2921,  // Nairobi
      //               longitude: 36.8219
      //             }
      //           }
      //         ]
      //       }
      //     ]
      //   }
      // ]
      packages: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        comment: "Packages/tours organized by categories for this destination",
        validate: {
          isValidPackages(value) {
            if (!value) return; // Allow null/empty
            if (!Array.isArray(value)) {
              throw new Error("packages must be an array");
            }
            value.forEach((category, catIndex) => {
              if (
                !category.category_name ||
                typeof category.category_name !== "string"
              ) {
                throw new Error(
                  `Category at index ${catIndex} must have a valid category_name`
                );
              }
              // Validate category name against predefined categories
              if (!PACKAGE_CATEGORIES.includes(category.category_name)) {
                throw new Error(
                  `Invalid category_name '${
                    category.category_name
                  }' at index ${catIndex}. Allowed categories: ${PACKAGE_CATEGORIES.join(
                    ", "
                  )}`
                );
              }
              if (
                category.category_order === undefined ||
                typeof category.category_order !== "number"
              ) {
                throw new Error(
                  `Category at index ${catIndex} must have a valid category_order`
                );
              }
              if (!Array.isArray(category.packages)) {
                throw new Error(
                  `Category '${category.category_name}' must have a packages array`
                );
              }
              category.packages.forEach((pkg, pkgIndex) => {
                if (
                  pkg.number === undefined ||
                  typeof pkg.number !== "number"
                ) {
                  throw new Error(
                    `Package at index ${pkgIndex} in category '${category.category_name}' must have a number`
                  );
                }
                if (!pkg.title || typeof pkg.title !== "string") {
                  throw new Error(
                    `Package at index ${pkgIndex} in category '${category.category_name}' must have a title`
                  );
                }
                if (
                  !pkg.short_description ||
                  typeof pkg.short_description !== "string"
                ) {
                  throw new Error(
                    `Package at index ${pkgIndex} in category '${category.category_name}' must have a short_description`
                  );
                }
                if (!Array.isArray(pkg.highlights)) {
                  throw new Error(
                    `Package '${pkg.title}' must have a highlights array`
                  );
                }
                if (!Array.isArray(pkg.pricing_tiers)) {
                  throw new Error(
                    `Package '${pkg.title}' must have a pricing_tiers array`
                  );
                }
                // Gallery is optional, but if provided must be an array
                if (pkg.gallery !== undefined && !Array.isArray(pkg.gallery)) {
                  throw new Error(
                    `Package '${pkg.title}' gallery must be an array if provided`
                  );
                }
                // Itinerary is optional, but if provided must be an array with valid day-by-day structure
                if (pkg.itinerary !== undefined) {
                  if (!Array.isArray(pkg.itinerary)) {
                    throw new Error(
                      `Package '${pkg.title}' itinerary must be an array if provided`
                    );
                  }
                  pkg.itinerary.forEach((day, dayIndex) => {
                    if (
                      day.day === undefined ||
                      typeof day.day !== "number" ||
                      day.day < 1
                    ) {
                      throw new Error(
                        `Day at index ${dayIndex} in package '${pkg.title}' itinerary must have a valid day number (>= 1)`
                      );
                    }
                    if (!day.description || typeof day.description !== "string") {
                      throw new Error(
                        `Day ${day.day} in package '${pkg.title}' itinerary must have a description`
                      );
                    }
                    // Start location is required
                    if (!day.start_location || typeof day.start_location !== "object") {
                      throw new Error(
                        `Day ${day.day} in package '${pkg.title}' itinerary must have a start_location object`
                      );
                    }
                    if (day.start_location.latitude === undefined || typeof day.start_location.latitude !== "number") {
                      throw new Error(
                        `Day ${day.day} in package '${pkg.title}' itinerary start_location must have a valid latitude (number)`
                      );
                    }
                    if (
                      day.start_location.latitude < -90 ||
                      day.start_location.latitude > 90
                    ) {
                      throw new Error(
                        `Day ${day.day} in package '${pkg.title}' itinerary start_location latitude must be between -90 and 90`
                      );
                    }
                    if (day.start_location.longitude === undefined || typeof day.start_location.longitude !== "number") {
                      throw new Error(
                        `Day ${day.day} in package '${pkg.title}' itinerary start_location must have a valid longitude (number)`
                      );
                    }
                    if (
                      day.start_location.longitude < -180 ||
                      day.start_location.longitude > 180
                    ) {
                      throw new Error(
                        `Day ${day.day} in package '${pkg.title}' itinerary start_location longitude must be between -180 and 180`
                      );
                    }
                    // End location is optional - if provided, validate it
                    if (day.end_location !== undefined) {
                      if (typeof day.end_location !== "object" || day.end_location === null) {
                        throw new Error(
                          `Day ${day.day} in package '${pkg.title}' itinerary end_location must be an object if provided`
                        );
                      }
                      if (day.end_location.latitude === undefined || typeof day.end_location.latitude !== "number") {
                        throw new Error(
                          `Day ${day.day} in package '${pkg.title}' itinerary end_location must have a valid latitude (number)`
                        );
                      }
                      if (
                        day.end_location.latitude < -90 ||
                        day.end_location.latitude > 90
                      ) {
                        throw new Error(
                          `Day ${day.day} in package '${pkg.title}' itinerary end_location latitude must be between -90 and 90`
                        );
                      }
                      if (day.end_location.longitude === undefined || typeof day.end_location.longitude !== "number") {
                        throw new Error(
                          `Day ${day.day} in package '${pkg.title}' itinerary end_location must have a valid longitude (number)`
                        );
                      }
                      if (
                        day.end_location.longitude < -180 ||
                        day.end_location.longitude > 180
                      ) {
                        throw new Error(
                          `Day ${day.day} in package '${pkg.title}' itinerary end_location longitude must be between -180 and 180`
                        );
                      }
                    }
                  });
                }
                pkg.pricing_tiers.forEach((pricing, pricingIndex) => {
                  if (!pricing.tier || typeof pricing.tier !== "string") {
                    throw new Error(
                      `Pricing tier at index ${pricingIndex} in package '${pkg.title}' must have a tier`
                    );
                  }
                  if (
                    !pricing.price_range ||
                    typeof pricing.price_range !== "string"
                  ) {
                    throw new Error(
                      `Pricing tier at index ${pricingIndex} in package '${pkg.title}' must have a price_range`
                    );
                  }
                });
              });
            });
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

  // Export categories for use in other parts of the application
  Destination.PACKAGE_CATEGORIES = PACKAGE_CATEGORIES;
  Destination.PACKAGE_CATEGORIES_ENUM = PACKAGE_CATEGORIES_ENUM;

  return Destination;
};
