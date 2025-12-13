const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Member = sequelize.define(
    "Member",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      full_name: {
        type: DataTypes.STRING,
        allowNull: false,
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
      },
      date_of_birth: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      gender: {
        type: DataTypes.ENUM("Male", "Female", "Other", "Prefer not to say"),
        allowNull: true,
      },
      national_id: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      physical_address: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      emergency_contact_name: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      emergency_contact_phone: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      membership_type: {
        type: DataTypes.ENUM("Regular", "Lifetime", "Student", "Corporate"),
        allowNull: false,
        defaultValue: "Regular",
      },
      how_heard_about: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      reason_for_joining: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      areas_of_interest: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      skills_contribution: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      preferred_communication: {
        type: DataTypes.ENUM("Email", "Phone", "SMS", "WhatsApp", "Postal Mail"),
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM("Pending", "Active", "Inactive", "Rejected"),
        defaultValue: "Pending",
      },
      member_number: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
      },
    },
    {
      tableName: "members",
      timestamps: true,
    }
  );

  return Member;
};

