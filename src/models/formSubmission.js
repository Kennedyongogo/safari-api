const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const FormSubmission = sequelize.define(
  "FormSubmission",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    form_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "forms",
        key: "id",
      },
    },
    submission_data: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {},
    },
    ip_address: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("pending", "reviewed", "contacted", "completed"),
      defaultValue: "pending",
    },
    admin_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    reviewed_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "admin_users",
        key: "id",
      },
    },
    reviewed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "form_submissions",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

  return FormSubmission;
};
