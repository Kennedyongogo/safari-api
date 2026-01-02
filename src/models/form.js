const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Form = sequelize.define(
  "Form",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "Untitled Form",
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    slug: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    success_message: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: "Thank you for your submission!",
    },
    submit_button_text: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "Submit",
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "admin_users",
        key: "id",
      },
    },
    updated_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "admin_users",
        key: "id",
      },
    },
  },
  {
    tableName: "forms",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

  return Form;
};
