const { FormField, FieldOption } = require("../models");

// Admin: Get all fields for a form
const getFormFields = async (req, res) => {
  try {
    const { form_id } = req.params;

    const fields = await FormField.findAll({
      where: { form_id },
      include: [
        {
          model: FieldOption,
          as: "options",
          order: [["display_order", "ASC"]],
        },
      ],
      order: [["display_order", "ASC"]],
    });

    res.json({
      success: true,
      data: fields,
    });
  } catch (error) {
    console.error("Error fetching form fields:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching form fields",
      error: error.message,
    });
  }
};

// Admin: Create new field
const createFormField = async (req, res) => {
  try {
    const {
      form_id,
      field_type,
      field_name,
      label,
      placeholder,
      help_text,
      default_value,
      is_required,
      validation_rules,
      display_order,
      css_classes,
      grid_size,
      conditional_logic,
      dynamic_options,
      sub_fields, // For compound fields
    } = req.body;

    // For compound fields, store sub_fields in validation_rules
    const finalValidationRules = field_type === 'compound' && sub_fields
      ? { ...validation_rules, sub_fields }
      : validation_rules;

    const field = await FormField.create({
      form_id,
      field_type,
      field_name,
      label,
      placeholder,
      help_text,
      default_value,
      is_required,
      validation_rules: finalValidationRules,
      display_order,
      css_classes,
      grid_size,
      conditional_logic,
      dynamic_options,
    });

    res.status(201).json({
      success: true,
      data: field,
      message: "Field created successfully",
    });
  } catch (error) {
    console.error("Error creating form field:", error);
    res.status(500).json({
      success: false,
      message: "Error creating form field",
      error: error.message,
    });
  }
};

// Admin: Update field
const updateFormField = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('updateFormField called with id:', id, 'body:', req.body);
    const updateData = req.body;

    const field = await FormField.findByPk(id);
    if (!field) {
      return res.status(404).json({
        success: false,
        message: "Field not found",
      });
    }

    // Handle sub_fields for compound fields
    if (updateData.field_type === 'compound' && updateData.sub_fields) {
      // Merge sub_fields into validation_rules
      const existingValidationRules = field.validation_rules || {};
      updateData.validation_rules = {
        ...existingValidationRules,
        sub_fields: updateData.sub_fields
      };
      // Remove sub_fields from updateData since it's stored in validation_rules
      delete updateData.sub_fields;
    }

    // Only update fields that are provided (not undefined)
    const cleanUpdateData = {};
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        cleanUpdateData[key] = updateData[key];
      }
    });

    await field.update(cleanUpdateData);

    res.json({
      success: true,
      data: field,
      message: "Field updated successfully",
    });
  } catch (error) {
    console.error("Error updating form field:", error);
    res.status(500).json({
      success: false,
      message: "Error updating form field",
      error: error.message,
    });
  }
};

// Admin: Delete field
const deleteFormField = async (req, res) => {
  try {
    const { id } = req.params;

    const field = await FormField.findByPk(id);
    if (!field) {
      return res.status(404).json({
        success: false,
        message: "Field not found",
      });
    }

    // Delete associated field options first to avoid foreign key constraint errors
    await FieldOption.destroy({
      where: { form_field_id: id }
    });

    // Now delete the field
    await field.destroy();

    res.json({
      success: true,
      message: "Field deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting form field:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting form field",
      error: error.message,
    });
  }
};

// Admin: Update field display order
const updateFieldOrder = async (req, res) => {
  try {
    const { fields } = req.body; // Array of { id, display_order }

    const updatePromises = fields.map(({ id, display_order }) =>
      FormField.update(
        { display_order },
        { where: { id } }
      )
    );

    await Promise.all(updatePromises);

    res.json({
      success: true,
      message: "Field order updated successfully",
    });
  } catch (error) {
    console.error("Error updating field order:", error);
    res.status(500).json({
      success: false,
      message: "Error updating field order",
      error: error.message,
    });
  }
};

// Admin: Get all options for a field
const getFieldOptions = async (req, res) => {
  try {
    const { field_id } = req.params;

    const options = await FieldOption.findAll({
      where: { form_field_id: field_id },
      order: [["display_order", "ASC"]],
    });

    res.json({
      success: true,
      data: options,
    });
  } catch (error) {
    console.error("Error fetching field options:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching field options",
      error: error.message,
    });
  }
};

// Admin: Create field option
const createFieldOption = async (req, res) => {
  try {
    console.log('createFieldOption called with body:', req.body);
    const {
      form_field_id,
      option_value,
      option_label,
      description,
      display_order,
      is_default,
    } = req.body;

    const option = await FieldOption.create({
      form_field_id,
      option_value,
      option_label,
      description,
      display_order,
      is_default,
    });

    res.status(201).json({
      success: true,
      data: option,
      message: "Option created successfully",
    });
  } catch (error) {
    console.error("Error creating field option:", error);
    res.status(500).json({
      success: false,
      message: "Error creating field option",
      error: error.message,
    });
  }
};

// Admin: Update field option
const updateFieldOption = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('updateFieldOption called with id:', id, 'body:', req.body);
    const updateData = req.body;

    const option = await FieldOption.findByPk(id);
    if (!option) {
      return res.status(404).json({
        success: false,
        message: "Option not found",
      });
    }

    // Only update fields that are provided (not undefined)
    const cleanUpdateData = {};
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        cleanUpdateData[key] = updateData[key];
      }
    });

    await option.update(cleanUpdateData);

    res.json({
      success: true,
      data: option,
      message: "Option updated successfully",
    });
  } catch (error) {
    console.error("Error updating field option:", error);
    res.status(500).json({
      success: false,
      message: "Error updating field option",
      error: error.message,
    });
  }
};

// Admin: Delete field option
const deleteFieldOption = async (req, res) => {
  try {
    const { id } = req.params;

    const option = await FieldOption.findByPk(id);
    if (!option) {
      return res.status(404).json({
        success: false,
        message: "Option not found",
      });
    }

    await option.destroy();

    res.json({
      success: true,
      message: "Option deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting field option:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting field option",
      error: error.message,
    });
  }
};

module.exports = {
  getFormFields,
  createFormField,
  updateFormField,
  deleteFormField,
  updateFieldOrder,
  getFieldOptions,
  createFieldOption,
  updateFieldOption,
deleteFieldOption,
};
