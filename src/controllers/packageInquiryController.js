const { PackageInquiry, Destination, AdminUser, sequelize } = require("../models");
const { Op } = require("sequelize");
const {
  logCreate,
  logUpdate,
  logDelete,
} = require("../utils/auditLogger");

// Create package inquiry (public)
const createPackageInquiry = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      travelDate,
      numberOfTravelers,
      budget,
      message,
      package: packageData,
      destination: destinationData,
      categoryName,
      destinationId,
    } = req.body;

    // Validate required fields
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: "Please provide name and email",
      });
    }

    if (!packageData || !packageData.title) {
      return res.status(400).json({
        success: false,
        message: "Package information is required",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }

    // Create inquiry
    const inquiry = await PackageInquiry.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim() || null,
      travel_date: travelDate || null,
      number_of_travelers: numberOfTravelers ? parseInt(numberOfTravelers) : null,
      budget: budget?.trim() || null,
      message: message?.trim() || null,
      package_data: packageData,
      package_title: packageData.title,
      package_number: packageData.number || null,
      destination_data: destinationData || null,
      destination_title: destinationData?.title || null,
      destination_id: destinationId || null,
      category_name: categoryName || null,
      status: "pending",
    });

    // Log audit trail
    await logCreate(
      null, // No user ID for public inquiries
      "package_inquiry",
      inquiry.id,
      { name, email, package_title: packageData.title },
      req,
      `New package inquiry from ${name} for ${packageData.title}`
    );

    res.status(201).json({
      success: true,
      message: "Inquiry submitted successfully. We'll get back to you soon!",
      data: inquiry,
    });
  } catch (error) {
    console.error("Error creating package inquiry:", error);
    res.status(500).json({
      success: false,
      message: "Error submitting inquiry",
      error: error.message,
    });
  }
};

// Get all inquiries with pagination and filters (admin only)
const getAllInquiries = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      search,
      sortBy = "created_at",
      sortOrder = "DESC",
    } = req.query;

    const offset = (page - 1) * limit;

    // Build filter conditions
    const whereClause = {};

    if (status) {
      whereClause.status = status;
    }

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { package_title: { [Op.iLike]: `%${search}%` } },
        { destination_title: { [Op.iLike]: `%${search}%` } },
        { message: { [Op.iLike]: `%${search}%` } },
      ];
    }

    // Get inquiries with associations
    const { count, rows } = await PackageInquiry.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Destination,
          as: "destination",
          attributes: ["id", "title", "slug"],
          required: false,
        },
        {
          model: AdminUser,
          as: "replier",
          attributes: ["id", "full_name", "email"],
          required: false,
        },
      ],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching inquiries:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching inquiries",
      error: error.message,
    });
  }
};

// Get single inquiry by ID (admin only)
const getInquiryById = async (req, res) => {
  try {
    const { id } = req.params;

    const inquiry = await PackageInquiry.findByPk(id, {
      include: [
        {
          model: Destination,
          as: "destination",
          attributes: ["id", "title", "slug"],
          required: false,
        },
        {
          model: AdminUser,
          as: "replier",
          attributes: ["id", "full_name", "email"],
          required: false,
        },
      ],
    });

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: "Inquiry not found",
      });
    }

    res.json({
      success: true,
      data: inquiry,
    });
  } catch (error) {
    console.error("Error fetching inquiry:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching inquiry",
      error: error.message,
    });
  }
};

// Update inquiry (admin only) - mainly for replying
const updateInquiry = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { admin_reply, status } = req.body;
    const adminUserId = req.user?.id;

    const inquiry = await PackageInquiry.findByPk(id, { transaction });

    if (!inquiry) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Inquiry not found",
      });
    }

    // Prepare update data
    const updateData = {};

    if (admin_reply !== undefined) {
      updateData.admin_reply = admin_reply.trim();
      updateData.replied_by = adminUserId;
      updateData.replied_at = new Date();
      // Auto-update status to replied if not already closed
      if (inquiry.status !== "closed") {
        updateData.status = "replied";
      }
    }

    if (status && ["pending", "replied", "closed"].includes(status)) {
      updateData.status = status;
    }

    // Update inquiry
    await inquiry.update(updateData, { transaction });

    // Log audit trail
    await logUpdate(
      adminUserId,
      "package_inquiry",
      inquiry.id,
      updateData,
      req,
      `Updated inquiry from ${inquiry.name}`
    );

    await transaction.commit();

    // Fetch updated inquiry with associations
    const updatedInquiry = await PackageInquiry.findByPk(id, {
      include: [
        {
          model: Destination,
          as: "destination",
          attributes: ["id", "title", "slug"],
          required: false,
        },
        {
          model: AdminUser,
          as: "replier",
          attributes: ["id", "full_name", "email"],
          required: false,
        },
      ],
    });

    res.json({
      success: true,
      message: "Inquiry updated successfully",
      data: updatedInquiry,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error updating inquiry:", error);
    res.status(500).json({
      success: false,
      message: "Error updating inquiry",
      error: error.message,
    });
  }
};

// Delete inquiry (admin only)
const deleteInquiry = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const adminUserId = req.user?.id;

    const inquiry = await PackageInquiry.findByPk(id, { transaction });

    if (!inquiry) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Inquiry not found",
      });
    }

    // Log before deletion
    await logDelete(
      adminUserId,
      "package_inquiry",
      inquiry.id,
      { name: inquiry.name, email: inquiry.email, package_title: inquiry.package_title },
      req,
      `Deleted inquiry from ${inquiry.name}`
    );

    await inquiry.destroy({ transaction });
    await transaction.commit();

    res.json({
      success: true,
      message: "Inquiry deleted successfully",
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error deleting inquiry:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting inquiry",
      error: error.message,
    });
  }
};

// Get inquiry statistics (admin only)
const getInquiryStats = async (req, res) => {
  try {
    const total = await PackageInquiry.count();
    const pending = await PackageInquiry.count({ where: { status: "pending" } });
    const replied = await PackageInquiry.count({ where: { status: "replied" } });
    const closed = await PackageInquiry.count({ where: { status: "closed" } });

    // Get recent inquiries (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recent = await PackageInquiry.count({
      where: {
        created_at: {
          [Op.gte]: sevenDaysAgo,
        },
      },
    });

    res.json({
      success: true,
      data: {
        total,
        pending,
        replied,
        closed,
        recent,
      },
    });
  } catch (error) {
    console.error("Error fetching inquiry stats:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching inquiry statistics",
      error: error.message,
    });
  }
};

module.exports = {
  createPackageInquiry,
  getAllInquiries,
  getInquiryById,
  updateInquiry,
  deleteInquiry,
  getInquiryStats,
};

