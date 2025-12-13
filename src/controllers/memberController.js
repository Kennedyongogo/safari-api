const { Member, sequelize } = require("../models");
const { Op } = require("sequelize");
const {
  logCreate,
  logUpdate,
  logDelete,
  logStatusChange,
} = require("../utils/auditLogger");

// Generate unique member number
const generateMemberNumber = async () => {
  const year = new Date().getFullYear();
  const prefix = `MEM${year}`;
  
  // Get the latest member number for this year
  const latestMember = await Member.findOne({
    where: {
      member_number: {
        [Op.like]: `${prefix}%`,
      },
    },
    order: [["createdAt", "DESC"]],
  });

  let sequence = 1;
  if (latestMember && latestMember.member_number) {
    const lastSequence = parseInt(
      latestMember.member_number.replace(prefix, "")
    );
    if (!isNaN(lastSequence)) {
      sequence = lastSequence + 1;
    }
  }

  return `${prefix}${String(sequence).padStart(4, "0")}`;
};

// Create member (public registration)
const createMember = async (req, res) => {
  try {
    const {
      full_name,
      email,
      phone,
      date_of_birth,
      gender,
      national_id,
      physical_address,
      emergency_contact_name,
      emergency_contact_phone,
      membership_type,
      how_heard_about,
      reason_for_joining,
      areas_of_interest,
      skills_contribution,
      preferred_communication,
    } = req.body;

    // Validate required fields
    if (!full_name || !email || !phone || !membership_type) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields (full_name, email, phone, membership_type)",
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

    // Generate member number
    const member_number = await generateMemberNumber();

    // Create member
    const member = await Member.create({
      full_name,
      email,
      phone,
      date_of_birth: date_of_birth || null,
      gender: gender || null,
      national_id: national_id || null,
      physical_address: physical_address || null,
      emergency_contact_name: emergency_contact_name || null,
      emergency_contact_phone: emergency_contact_phone || null,
      membership_type,
      how_heard_about: how_heard_about || null,
      reason_for_joining: reason_for_joining || null,
      areas_of_interest: areas_of_interest || null,
      skills_contribution: skills_contribution || null,
      preferred_communication: preferred_communication || null,
      member_number,
      status: "Pending",
    });

    // Log audit trail
    await logCreate(
      null, // Public registration, no user ID
      "member",
      member.id,
      { full_name, email, membership_type, member_number },
      req,
      `New member registration: ${full_name} (${email}) - ${member_number}`
    );

    res.status(201).json({
      success: true,
      message: "Member registration submitted successfully. Your application is pending review.",
      data: member,
    });
  } catch (error) {
    console.error("Error creating member:", error);
    res.status(500).json({
      success: false,
      message: "Error submitting member registration",
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
      membership_type,
      status,
      search,
      sortBy = "createdAt",
      sortOrder = "DESC",
    } = req.query;

    const offset = (page - 1) * limit;

    // Build filter conditions
    const whereClause = {};

    if (membership_type) {
      whereClause.membership_type = membership_type;
    }

    if (status) {
      whereClause.status = status;
    }

    if (search) {
      whereClause[Op.or] = [
        { full_name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
        { member_number: { [Op.like]: `%${search}%` } },
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
      date_of_birth,
      gender,
      national_id,
      physical_address,
      emergency_contact_name,
      emergency_contact_phone,
      membership_type,
      how_heard_about,
      reason_for_joining,
      areas_of_interest,
      skills_contribution,
      preferred_communication,
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
      membership_type: member.membership_type,
      status: member.status,
    };

    // Prepare update data
    const updateData = {};
    if (full_name) updateData.full_name = full_name;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;
    if (date_of_birth !== undefined) updateData.date_of_birth = date_of_birth;
    if (gender) updateData.gender = gender;
    if (national_id !== undefined) updateData.national_id = national_id;
    if (physical_address !== undefined) updateData.physical_address = physical_address;
    if (emergency_contact_name !== undefined) updateData.emergency_contact_name = emergency_contact_name;
    if (emergency_contact_phone !== undefined) updateData.emergency_contact_phone = emergency_contact_phone;
    if (membership_type) updateData.membership_type = membership_type;
    if (how_heard_about !== undefined) updateData.how_heard_about = how_heard_about;
    if (reason_for_joining !== undefined) updateData.reason_for_joining = reason_for_joining;
    if (areas_of_interest !== undefined) updateData.areas_of_interest = areas_of_interest;
    if (skills_contribution !== undefined) updateData.skills_contribution = skills_contribution;
    if (preferred_communication) updateData.preferred_communication = preferred_communication;
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
      `Updated member: ${member.full_name} (${member.member_number})`
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
      member_number: member.member_number,
      membership_type: member.membership_type,
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
      `Deleted member: ${memberData.full_name} (${memberData.member_number})`
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
    const statsByMembershipType = await Member.findAll({
      attributes: [
        "membership_type",
        [sequelize.fn("COUNT", sequelize.col("id")), "count"],
      ],
      group: ["membership_type"],
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
        byMembershipType: statsByMembershipType,
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

