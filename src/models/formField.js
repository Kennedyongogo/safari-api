const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const FormField = sequelize.define(
  "FormField",
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
    field_type: {
      type: DataTypes.ENUM(
        "text",
        "email",
        "tel",
        "number",
        "date",
        "textarea",
        "select",
        "radio",
        "checkbox",
        "checkbox_group",
        "file",
        "compound"
      ),
      allowNull: false,
    },
    field_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    label: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    placeholder: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    help_text: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    default_value: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    is_required: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    validation_rules: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
    },
    display_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    css_classes: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    grid_size: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: { xs: 12, sm: 6 },
    },
    conditional_logic: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: "Conditional logic rules for showing/hiding this field based on other field values",
      defaultValue: null,
    },
    dynamic_options: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: "Configuration for dynamic options that change based on other field values",
      defaultValue: null,
    },
  },
  {
    tableName: "form_fields",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

  return FormField;
};
