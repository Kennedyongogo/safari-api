const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const FieldOption = sequelize.define(
  "FieldOption",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    form_field_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "form_fields",
        key: "id",
      },
    },
    option_value: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    option_label: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    display_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    is_default: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    tableName: "field_options",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

  return FieldOption;
};
