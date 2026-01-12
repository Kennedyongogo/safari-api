const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const PackageInquiry = sequelize.define(
    "PackageInquiry",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      // Contact Information
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
          len: [2, 150],
        },
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          isEmail: true,
        },
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          len: [0, 40],
        },
      },
      // Travel Details
      travel_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment: "Preferred travel date",
      },
      number_of_travelers: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          min: 1,
          max: 100,
        },
      },
      budget: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Budget range (e.g., Mid-range, Luxury)",
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Additional message from the inquirer",
      },
      // Package Information (stored as JSON for flexibility)
      package_data: {
        type: DataTypes.JSON,
        allowNull: false,
        comment: "Full package object data at time of inquiry",
      },
      package_title: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "Package title for quick reference",
      },
      package_number: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "Package number if available",
      },
      // Destination Information
      destination_data: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: "Full destination object data at time of inquiry",
      },
      destination_title: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Destination title for quick reference",
      },
      destination_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: "destinations",
          key: "id",
        },
        comment: "Reference to destination if available",
      },
      // Category Information
      category_name: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Package category name",
      },
      // Status and Admin Response
      status: {
        type: DataTypes.ENUM("pending", "replied", "closed"),
        defaultValue: "pending",
        comment: "Inquiry status",
      },
      admin_reply: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Admin's reply to the inquiry",
      },
      replied_by: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: "admin_users",
          key: "id",
        },
        comment: "Admin user who replied",
      },
      replied_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "When the admin replied",
      },
    },
    {
      tableName: "package_inquiries",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return PackageInquiry;
};

