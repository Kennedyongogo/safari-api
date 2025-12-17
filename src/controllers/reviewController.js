const { Review } = require("../models");
const { Op } = require("sequelize");
const {
  logCreate,
  logUpdate,
  logDelete,
  logStatusChange,
} = require("../utils/auditLogger");

// Create review
const createReview = async (req, res) => {
  try {
    const { name, email, phone, location, rating, comment, recommend, status } =
      req.body;

    // Validate required fields
    if (!name || !email || !rating || !comment) {
      return res.status(400).json({
        success: false,
        message:
          "Please provide all required fields (name, email, rating, comment)",
      });
    }

    // Validate rating range
    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5",
      });
    }

    // Create review
    const review = await Review.create({
      name,
      email,
      phone,
      location,
      rating,
      comment,
      recommend: recommend ?? false,
      status: status || "pending",
    });

    // Log audit trail
    await logCreate(
      null, // No user ID for public reviews
      "review",
      review.id,
      { name, email, rating, status: review.status },
      req,
      `Created new review from ${name} with rating ${rating}`
    );

    res.status(201).json({
      success: true,
      message: "Review created successfully",
      data: review,
    });
  } catch (error) {
    console.error("Error creating review:", error);
    res.status(500).json({
      success: false,
      message: "Error creating review",
      error: error.message,
    });
  }
};

// Get all reviews with pagination and filters
const getAllReviews = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      rating,
      search,
      sortBy = "createdAt",
      sortOrder = "DESC",
    } = req.query;

    const offset = (page - 1) * limit;

    // Build filter conditions
    const whereClause = {};

    if (status) {
      whereClause.status = status;
    }

    if (rating) {
      whereClause.rating = rating;
    }

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { comment: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { location: { [Op.like]: `%${search}%` } },
      ];
    }

    const { count, rows } = await Review.findAndCountAll({
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
    console.error("Error fetching reviews:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching reviews",
      error: error.message,
    });
  }
};

// Get single review by ID
const getReviewById = async (req, res) => {
  try {
    const { id } = req.params;

    const review = await Review.findByPk(id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    res.status(200).json({
      success: true,
      data: review,
    });
  } catch (error) {
    console.error("Error fetching review:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching review",
      error: error.message,
    });
  }
};

// Update review
const updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, location, rating, comment, status, recommend } =
      req.body;

    const review = await Review.findByPk(id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    // Store old values for audit
    const oldValues = {
      name: review.name,
      email: review.email,
      phone: review.phone,
      location: review.location,
      rating: review.rating,
      comment: review.comment,
      status: review.status,
      recommend: review.recommend,
    };

    // Prepare update data - only include fields that are provided
    const updateData = {};

    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (location !== undefined) updateData.location = location;
    if (rating !== undefined) {
      if (rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: "Rating must be between 1 and 5",
        });
      }
      updateData.rating = rating;
    }
    if (comment !== undefined) updateData.comment = comment;
    if (status !== undefined) updateData.status = status;
    if (recommend !== undefined) updateData.recommend = recommend;

    // Update review
    await review.update(updateData);

    // Log audit trail
    await logUpdate(
      req.user?.id,
      "review",
      id,
      oldValues,
      updateData,
      req,
      `Updated review with ID: ${id}`
    );

    res.status(200).json({
      success: true,
      message: "Review updated successfully",
      data: review,
    });
  } catch (error) {
    console.error("Error updating review:", error);
    res.status(500).json({
      success: false,
      message: "Error updating review",
      error: error.message,
    });
  }
};

// Update review status
const updateReviewStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const review = await Review.findByPk(id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    const oldStatus = review.status;

    // Validate status
    const validStatuses = ["pending", "approved", "rejected"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be one of: pending, approved, rejected",
      });
    }

    // Update review status
    await review.update({ status });

    // Log audit trail
    await logStatusChange(
      req.user?.id,
      "review",
      id,
      oldStatus,
      status,
      req,
      `Changed review status from ${oldStatus} to ${status}`
    );

    res.status(200).json({
      success: true,
      message: "Review status updated successfully",
      data: review,
    });
  } catch (error) {
    console.error("Error updating review status:", error);
    res.status(500).json({
      success: false,
      message: "Error updating review status",
      error: error.message,
    });
  }
};

// Delete review
const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;

    const review = await Review.findByPk(id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    // Store review data for audit log
    const reviewData = {
      name: review.name,
      email: review.email,
      rating: review.rating,
      status: review.status,
    };

    await review.destroy();

    // Log audit trail
    await logDelete(
      req.user?.id,
      "review",
      id,
      reviewData,
      req,
      `Deleted review from ${reviewData.name} with rating ${reviewData.rating}`
    );

    res.status(200).json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting review:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting review",
      error: error.message,
    });
  }
};

// Get approved reviews for public display
const getApprovedReviews = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      rating,
      search,
      sortBy = "createdAt",
      sortOrder = "DESC",
    } = req.query;

    const offset = (page - 1) * limit;

    // Build filter conditions - only approved reviews
    const whereClause = { status: "approved" };

    if (rating) {
      whereClause.rating = rating;
    }

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { comment: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { location: { [Op.like]: `%${search}%` } },
      ];
    }

    const { count, rows } = await Review.findAndCountAll({
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
    console.error("Error fetching approved reviews:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching reviews",
      error: error.message,
    });
  }
};

// Get single approved review by ID (public)
const getApprovedReviewById = async (req, res) => {
  try {
    const { id } = req.params;

    const review = await Review.findOne({
      where: {
        id: id,
        status: "approved",
      },
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found or not approved",
      });
    }

    res.status(200).json({
      success: true,
      data: review,
    });
  } catch (error) {
    console.error("Error fetching review:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching review",
      error: error.message,
    });
  }
};

module.exports = {
  createReview,
  getAllReviews,
  getReviewById,
  updateReview,
  updateReviewStatus,
  deleteReview,
  getApprovedReviews,
  getApprovedReviewById,
};
