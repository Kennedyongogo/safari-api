const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Member = sequelize.define(
    "Member",
    {
      // Step 1: Personal Information (all required)
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      full_name: {
        type: DataTypes.STRING,
        allowNull: false, // captured as "Full Name"
        validate: {
          notEmpty: true,
          len: [2, 150],
        },
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
          len: [5, 40],
        },
      },

      // Step 2: Business Information (optional)
      company_name: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          len: [0, 150],
        },
      },
      business_type: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          len: [0, 100],
        },
      },
      years_of_experience: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          min: 0,
          max: 120,
        },
      },

      // Step 3: Additional Details
      motivation: {
        // "Why do you want to become an agent?"
        type: DataTypes.TEXT,
        allowNull: true,
      },
      target_market: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      status: {
        type: DataTypes.ENUM("Pending", "Approved", "Rejected"),
        defaultValue: "Pending",
      },
    },
    {
      tableName: "members",
      timestamps: true,
    }
  );

  return Member;
};
