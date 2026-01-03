const { Form, FormField, FieldOption, FormSubmission } = require("../models");
const { Op } = require("sequelize");

// Admin: Clean up orphaned form fields (fields that belong to non-existent forms)
const cleanupOrphanedFields = async (req, res) => {
  try {
    // Find all form fields
    const allFields = await FormField.findAll({
      attributes: ['id', 'form_id'],
    });

    // Get all existing form IDs
    const existingForms = await Form.findAll({
      attributes: ['id'],
    });

    const existingFormIds = new Set(existingForms.map(form => form.id));

    // Find orphaned fields (fields whose form_id doesn't exist)
    const orphanedFields = allFields.filter(field => !existingFormIds.has(field.form_id));

    if (orphanedFields.length === 0) {
      return res.json({
        success: true,
        message: "No orphaned fields found",
      });
    }

    // Delete orphaned fields (this will also cascade delete their options)
    const orphanedFieldIds = orphanedFields.map(field => field.id);
    await FormField.destroy({
      where: {
        id: { [Op.in]: orphanedFieldIds }
      }
    });

    res.json({
      success: true,
      message: `Cleaned up ${orphanedFields.length} orphaned form fields`,
      cleanedFields: orphanedFieldIds,
    });
  } catch (error) {
    console.error("Error cleaning up orphaned fields:", error);
    res.status(500).json({
      success: false,
      message: "Error cleaning up orphaned fields",
      error: error.message,
    });
  }
};

// Admin: Get all forms
const getForms = async (req, res) => {
  try {
    const { page = 1, limit = 10, sortOrder = "DESC" } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    // Get accurate count of all forms
    const totalCount = await Form.count();

    // Get forms with their fields using include for proper ordering
    const formsWithFields = await Form.findAll({
      include: [
        {
          model: FormField,
          as: "fields",
          where: { is_active: true },
          required: false,
          include: [
            {
              model: FieldOption,
              as: "options",
              where: { is_active: true },
              required: false,
              order: [["display_order", "ASC"]],
            },
          ],
          order: [["display_order", "ASC"]],
        },
      ],
      order: [["created_at", sortOrder.toUpperCase()]],
      limit: limitNum,
      offset,
    });

    res.json({
      success: true,
      data: formsWithFields,
      pagination: {
        total: totalCount,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalCount / limitNum),
      },
    });
  } catch (error) {
    console.error("Error fetching forms:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching forms",
      error: error.message,
    });
  }
};

// Admin: Get single form by ID
const getFormById = async (req, res) => {
  try {
    const { id } = req.params;

    const form = await Form.findByPk(id, {
      include: [
        {
          model: FormField,
          as: "fields",
          where: { is_active: true }, // Only get active fields
          required: false, // Allow forms with no fields
          include: [
            {
              model: FieldOption,
              as: "options",
              where: { is_active: true }, // Only get active options
              required: false,
              order: [["display_order", "ASC"]],
            },
          ],
          order: [["display_order", "ASC"]],
        },
      ],
    });

    if (!form) {
      return res.status(404).json({
        success: false,
        message: "Form not found",
      });
    }

    res.json({
      success: true,
      data: form,
    });
  } catch (error) {
    console.error("Error fetching form:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching form",
      error: error.message,
    });
  }
};

// Admin: Create new form
const createForm = async (req, res) => {
  try {
    const { title, description, slug, success_message, submit_button_text, is_active } = req.body;
    const created_by = req.user?.id;

    // Auto-generate title if not provided
    const formTitle = title || `Form ${Date.now()}`;

    const formActive = is_active !== undefined ? is_active : true;

    // Ensure only one form exists at a time - delete all existing forms
    // The cascade relationships should handle deleting fields and options automatically
    await Form.destroy({
      where: {},
      cascade: true
    });

    const form = await Form.create({
      title: formTitle,
      description: description || null,
      slug: slug || formTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      success_message: success_message || "Thank you for your submission!",
      submit_button_text: submit_button_text || "Submit",
      is_active: formActive,
      created_by,
      updated_by: created_by,
    });

    res.status(201).json({
      success: true,
      data: form,
      message: "Form created successfully",
    });
  } catch (error) {
    console.error("Error creating form:", error);
    res.status(500).json({
      success: false,
      message: "Error creating form",
      error: error.message,
    });
  }
};

// Admin: Update form
const updateForm = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, slug, is_active, success_message, submit_button_text } = req.body;
    const updated_by = req.user?.id;

    const form = await Form.findByPk(id);
    if (!form) {
      return res.status(404).json({
        success: false,
        message: "Form not found",
      });
    }

    // If the form is being set to active, deactivate all other forms
    if (is_active === true) {
      await Form.update(
        { is_active: false },
        {
          where: {
            is_active: true,
            id: { [Op.ne]: id } // Don't deactivate the form we're updating
          }
        }
      );
    }

    // Only update fields that are provided
    const updateData = { updated_by };
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (slug !== undefined) updateData.slug = slug;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (success_message !== undefined) updateData.success_message = success_message;
    if (submit_button_text !== undefined) updateData.submit_button_text = submit_button_text;

    await form.update(updateData);

    res.json({
      success: true,
      data: form,
      message: "Form updated successfully",
    });
  } catch (error) {
    console.error("Error updating form:", error);
    res.status(500).json({
      success: false,
      message: "Error updating form",
      error: error.message,
    });
  }
};

// Admin: Delete form
const deleteForm = async (req, res) => {
  try {
    const { id } = req.params;

    const form = await Form.findByPk(id);
    if (!form) {
      return res.status(404).json({
        success: false,
        message: "Form not found",
      });
    }

    // Delete in correct order to avoid foreign key constraint violations
    // 1. Delete field options first
    const formFields = await FormField.findAll({
      where: { form_id: id },
      attributes: ['id']
    });

    await FieldOption.destroy({
      where: {
        form_field_id: {
          [Op.in]: formFields.map(field => field.id)
        }
      }
    });

    // 2. Delete form fields
    await FormField.destroy({
      where: { form_id: id }
    });

    // 3. Delete form submissions
    await FormSubmission.destroy({
      where: { form_id: id }
    });

    // 4. Finally delete the form itself
    await form.destroy();

    res.json({
      success: true,
      message: "Form deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting form:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting form",
      error: error.message,
    });
  }
};

// Admin: Get form submissions
const getFormSubmissions = async (req, res) => {
  try {
    const { form_id } = req.params;
    const { page = 1, limit = 10, status } = req.query;

    const offset = (page - 1) * limit;

    const whereCondition = { form_id };
    if (status) {
      whereCondition.status = status;
    }

    const submissions = await FormSubmission.findAndCountAll({
      where: whereCondition,
      include: [
        {
          model: Form,
          as: "form",
          attributes: ["title", "slug"],
        },
      ],
      order: [["created_at", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      data: submissions.rows,
      pagination: {
        total: submissions.count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(submissions.count / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching form submissions:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching form submissions",
      error: error.message,
    });
  }
};

// Admin: Update submission status
const updateSubmissionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_notes } = req.body;
    const reviewed_by = req.user?.id;

    const submission = await FormSubmission.findByPk(id);
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: "Submission not found",
      });
    }

    await submission.update({
      status,
      admin_notes,
      reviewed_by,
      reviewed_at: new Date(),
    });

    res.json({
      success: true,
      data: submission,
      message: "Submission status updated successfully",
    });
  } catch (error) {
    console.error("Error updating submission status:", error);
    res.status(500).json({
      success: false,
      message: "Error updating submission status",
      error: error.message,
    });
  }
};

// Admin: Delete submission
const deleteSubmission = async (req, res) => {
  try {
    const { id } = req.params;

    const submission = await FormSubmission.findByPk(id);
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: "Submission not found",
      });
    }

    await submission.destroy();

    res.json({
      success: true,
      message: "Submission deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting submission:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting submission",
      error: error.message,
    });
  }
};

// Public: Get all active forms
const getPublicForms = async (req, res) => {
  try {
    const { page = 1, limit = 10, sortOrder = "DESC" } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    // Get accurate count of active forms
    const totalCount = await Form.count({
      where: {
        is_active: true,
      },
    });

    // Get forms with their fields using include for proper ordering
    const formsWithFields = await Form.findAll({
      where: {
        is_active: true,
      },
      include: [
        {
          model: FormField,
          as: "fields",
          where: { is_active: true },
          required: false,
          include: [
            {
              model: FieldOption,
              as: "options",
              where: { is_active: true },
              required: false,
              order: [["display_order", "ASC"]],
            },
          ],
          order: [["display_order", "ASC"]],
        },
      ],
      order: [["created_at", sortOrder.toUpperCase()]],
      limit: limitNum,
      offset,
    });

    res.json({
      success: true,
      data: formsWithFields,
      pagination: {
        total: totalCount,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalCount / limitNum),
      },
    });
  } catch (error) {
    console.error("Error fetching public forms:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching forms",
      error: error.message,
    });
  }
};

// Public: Get form configuration by slug
const getPublicForm = async (req, res) => {
  try {
    const { slug } = req.params;

    const form = await Form.findOne({
      where: {
        slug,
        is_active: true,
      },
      include: [
        {
          model: FormField,
          as: "fields",
          where: { is_active: true },
          required: false,
          include: [
            {
              model: FieldOption,
              as: "options",
              where: { is_active: true },
              required: false,
              order: [["display_order", "ASC"]],
            },
          ],
          order: [["display_order", "ASC"]],
        },
      ],
    });

    if (!form) {
      return res.status(404).json({
        success: false,
        message: "Form not found",
      });
    }

    res.json({
      success: true,
      data: form,
    });
  } catch (error) {
    console.error("Error fetching public form:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching form",
      error: error.message,
    });
  }
};


// Public: Submit form
const submitForm = async (req, res) => {
  try {
    const { slug } = req.params;
    const submissionData = req.body;

    const form = await Form.findOne({
      where: {
        slug,
        is_active: true,
      },
    });

    if (!form) {
      return res.status(404).json({
        success: false,
        message: "Form not found",
      });
    }

    const submission = await FormSubmission.create({
      form_id: form.id,
      submission_data: submissionData,
      ip_address: req.ip,
      user_agent: req.get("User-Agent"),
    });

    res.status(201).json({
      success: true,
      data: {
        id: submission.id,
        message: form.success_message || "Thank you for your submission!",
      },
    });
  } catch (error) {
    console.error("Error submitting form:", error);
    res.status(500).json({
      success: false,
      message: "Error submitting form",
      error: error.message,
    });
  }
};

module.exports = {
  getForms,
  getFormById,
  createForm,
  updateForm,
  deleteForm,
  getFormSubmissions,
  updateSubmissionStatus,
  deleteSubmission,
  getPublicForm,
  getPublicForms,
  submitForm,
  cleanupOrphanedFields,
};
