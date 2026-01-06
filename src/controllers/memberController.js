const { Member, sequelize } = require("../models");
const { Op } = require("sequelize");
const {
  logCreate,
  logUpdate,
  logDelete,
  logStatusChange,
} = require("../utils/auditLogger");

// Create member (public registration - Agent Application)
const createMember = async (req, res) => {
  try {
    const {
      full_name,
      email,
      phone,
      company_name,
      business_type,
      years_of_experience,
      motivation,
      target_market,
    } = req.body;

    // Validate required fields
    if (!full_name || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields (full_name, email, phone)",
      });
    }

    // Check if member already exists
    const existingMember = await Member.findOne({ where: { email } });
    if (existingMember) {
      return res.status(400).json({
        success: false,
        message: "Member with this email already exists",
      });
    }

    // Create member
    const member = await Member.create({
      full_name,
      email,
      phone,
      company_name: company_name || null,
      business_type: business_type || null,
      years_of_experience: years_of_experience || null,
      motivation: motivation || null,
      target_market: target_market || null,
      status: "Pending",
    });

    // Log audit trail
    await logCreate(
      null, // Public registration, no user ID
      "member",
      member.id,
      { full_name, email, business_type: business_type || "N/A" },
      req,
      `New agent application: ${full_name} (${email})`
    );

    res.status(201).json({
      success: true,
      message: "Agent application submitted successfully. Your application is pending review.",
      data: member,
    });
  } catch (error) {
    console.error("Error creating member:", error);
    res.status(500).json({
      success: false,
      message: "Error submitting agent application",
      error: error.message,
    });
  }
};

// Get all members with pagination and filters
const getAllMembers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      business_type,
      status,
      search,
      sortBy = "createdAt",
      sortOrder = "DESC",
    } = req.query;

    const offset = (page - 1) * limit;

    // Build filter conditions
    const whereClause = {};

    if (business_type) {
      whereClause.business_type = business_type;
    }

    if (status) {
      whereClause.status = status;
    }

    if (search) {
      whereClause[Op.or] = [
        { full_name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
        { company_name: { [Op.like]: `%${search}%` } },
        { business_type: { [Op.like]: `%${search}%` } },
        { target_market: { [Op.like]: `%${search}%` } },
      ];
    }

    const { count, rows } = await Member.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sortBy, sortOrder]],
    });

    res.status(200).json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching members:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching members",
      error: error.message,
    });
  }
};

// Get single member by ID
const getMemberById = async (req, res) => {
  try {
    const { id } = req.params;

    const member = await Member.findByPk(id);

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found",
      });
    }

    res.status(200).json({
      success: true,
      data: member,
    });
  } catch (error) {
    console.error("Error fetching member:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching member",
      error: error.message,
    });
  }
};

// Update member
const updateMember = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      full_name,
      email,
      phone,
      company_name,
      business_type,
      years_of_experience,
      motivation,
      target_market,
      status,
    } = req.body;

    const member = await Member.findByPk(id);

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found",
      });
    }

    const updated_by_user_id = req.user?.id;
    const oldData = {
      full_name: member.full_name,
      email: member.email,
      phone: member.phone,
      business_type: member.business_type,
      status: member.status,
    };

    // Prepare update data
    const updateData = {};
    if (full_name) updateData.full_name = full_name;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;
    if (company_name !== undefined) updateData.company_name = company_name;
    if (business_type !== undefined) updateData.business_type = business_type;
    if (years_of_experience !== undefined) updateData.years_of_experience = years_of_experience;
    if (motivation !== undefined) updateData.motivation = motivation;
    if (target_market !== undefined) updateData.target_market = target_market;
    if (status) updateData.status = status;

    // Update member
    await member.update(updateData);

    // Log audit trail
    await logUpdate(
      updated_by_user_id,
      "member",
      id,
      oldData,
      updateData,
      req,
      `Updated member: ${member.full_name} (${member.email})`
    );

    res.status(200).json({
      success: true,
      message: "Member updated successfully",
      data: member,
    });
  } catch (error) {
    console.error("Error updating member:", error);
    res.status(500).json({
      success: false,
      message: "Error updating member",
      error: error.message,
    });
  }
};

// Update member status
const updateMemberStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    const member = await Member.findByPk(id);

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found",
      });
    }

    const updated_by_user_id = req.user?.id;
    const oldStatus = member.status;

    // Update member status
    await member.update({ status });

    // Log audit trail
    await logStatusChange(
      updated_by_user_id,
      "member",
      id,
      oldStatus,
      status,
      req,
      `Changed member status from ${oldStatus} to ${status} for: ${member.full_name} (${member.member_number})`
    );

    res.status(200).json({
      success: true,
      message: "Member status updated successfully",
      data: member,
    });
  } catch (error) {
    console.error("Error updating member status:", error);
    res.status(500).json({
      success: false,
      message: "Error updating member status",
      error: error.message,
    });
  }
};

// Delete member
const deleteMember = async (req, res) => {
  try {
    const { id } = req.params;

    const member = await Member.findByPk(id);

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found",
      });
    }

    // Store member data for audit log
    const memberData = {
      full_name: member.full_name,
      email: member.email,
      business_type: member.business_type,
      status: member.status,
    };

    await member.destroy();

    // Log audit trail
    await logDelete(
      req.user?.id,
      "member",
      id,
      memberData,
      req,
      `Deleted member: ${memberData.full_name} (${memberData.email})`
    );

    res.status(200).json({
      success: true,
      message: "Member deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting member:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting member",
      error: error.message,
    });
  }
};

// Get member statistics
const getMemberStats = async (req, res) => {
  try {
    const statsByBusinessType = await Member.findAll({
      attributes: [
        "business_type",
        [sequelize.fn("COUNT", sequelize.col("id")), "count"],
      ],
      where: {
        business_type: {
          [Op.ne]: null,
        },
      },
      group: ["business_type"],
    });

    const statsByStatus = await Member.findAll({
      attributes: [
        "status",
        [sequelize.fn("COUNT", sequelize.col("id")), "count"],
      ],
      group: ["status"],
    });

    const totalMembers = await Member.count();

    res.status(200).json({
      success: true,
      data: {
        total: totalMembers,
        byBusinessType: statsByBusinessType,
        byStatus: statsByStatus,
      },
    });
  } catch (error) {
    console.error("Error fetching member stats:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching member statistics",
      error: error.message,
    });
  }
};

module.exports = {
  createMember,
  getAllMembers,
  getMemberById,
  updateMember,
  updateMemberStatus,
  deleteMember,
  getMemberStats,
};

