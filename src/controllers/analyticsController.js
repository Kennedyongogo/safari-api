const {
  AdminUser,
  Document,
  AuditTrail,
  Review,
  Blog,
  Member,
  Lodge,
  Package,
  RouteStage,
  Destination,
  Gallery,
  Form,
  FormField,
  FieldOption,
  FormSubmission,
  sequelize,
} = require("../models");
const { Op } = require("sequelize");


// Get comprehensive system analytics
const getSystemAnalytics = async (req, res) => {
  try {
    console.log("Fetching system analytics...");

    // Calculate date ranges
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 1. AdminUser Statistics
    const totalUsers = await AdminUser.count();
    const activeUsers = await AdminUser.count({ where: { isActive: true } });
    const usersByRoleRaw = await AdminUser.findAll({
      attributes: ["role", [sequelize.fn("COUNT", sequelize.col("id")), "count"]],
      group: ["role"],
      raw: true,
    });
    
    // Ensure all roles are included even if count is zero
    const allRoles = ["super-admin", "admin", "regular user"];
    const usersByRole = allRoles.map(role => {
      const found = usersByRoleRaw.find(item => item.role === role);
      return {
        role: role,
        count: found ? found.count : "0"
      };
    });

    // 2. Document Statistics
    const totalDocuments = await Document.count();
    const documentsByTypeRaw = await Document.findAll({
      attributes: ["file_type", [sequelize.fn("COUNT", sequelize.col("id")), "count"]],
      group: ["file_type"],
      raw: true,
    });
    
    // Ensure all document types are included even if count is zero
    const allDocumentTypes = ["image", "pdf", "word", "excel", "powerpoint", "text", "other"];
    const documentsByType = allDocumentTypes.map(fileType => {
      const found = documentsByTypeRaw.find(item => item.file_type === fileType);
      return {
        file_type: fileType,
        count: found ? found.count : "0"
      };
    });
    
    const recentDocuments = await Document.count({
      where: { createdAt: { [Op.gte]: thirtyDaysAgo } },
    });

    // 3. AuditTrail Statistics
    const recentActivities = await AuditTrail.count({
      where: { createdAt: { [Op.gte]: sevenDaysAgo } },
    });
    const activitiesByAction = await AuditTrail.findAll({
      attributes: ["action", [sequelize.fn("COUNT", sequelize.col("id")), "count"]],
      where: { createdAt: { [Op.gte]: sevenDaysAgo } },
      group: ["action"],
      raw: true,
    });

    // 4. Review Statistics
    const totalReviews = await Review.count();
    const reviewsByStatusRaw = await Review.findAll({
      attributes: ["status", [sequelize.fn("COUNT", sequelize.col("id")), "count"]],
      group: ["status"],
      raw: true,
    });
    
    // Ensure all review statuses are included even if count is zero
    const allReviewStatuses = ["pending", "approved", "rejected"];
    const reviewsByStatus = allReviewStatuses.map(status => {
      const found = reviewsByStatusRaw.find(item => item.status === status);
      return {
        status: status,
        count: found ? found.count : "0"
      };
    });
    const reviewsByRating = await Review.findAll({
      attributes: ["rating", [sequelize.fn("COUNT", sequelize.col("id")), "count"]],
      group: ["rating"],
      order: [["rating", "DESC"]],
      raw: true,
    });
    const recentReviews = await Review.count({
      where: { createdAt: { [Op.gte]: thirtyDaysAgo } },
    });
    const avgRating = await Review.findOne({
      attributes: [[sequelize.fn("AVG", sequelize.col("rating")), "average"]],
      raw: true,
    });

    // 5. Blog Statistics
    const totalBlogs = await Blog.count();
    const blogsByStatusRaw = await Blog.findAll({
      attributes: ["status", [sequelize.fn("COUNT", sequelize.col("id")), "count"]],
      group: ["status"],
      raw: true,
    });
    
    // Ensure all blog statuses are included even if count is zero
    const allBlogStatuses = ["draft", "published", "archived"];
    const blogsByStatus = allBlogStatuses.map(status => {
      const found = blogsByStatusRaw.find(item => item.status === status);
      return {
        status: status,
        count: found ? found.count : "0"
      };
    });
    const blogsByCategory = await Blog.findAll({
      attributes: ["category", [sequelize.fn("COUNT", sequelize.col("id")), "count"]],
      where: { category: { [Op.ne]: null } },
      group: ["category"],
      raw: true,
    });
    const featuredBlogs = await Blog.count({ where: { featured: true } });
    const recentBlogs = await Blog.count({
      where: { createdAt: { [Op.gte]: thirtyDaysAgo } },
    });
    const totalBlogViews = await Blog.sum("views");
    const totalBlogLikes = await Blog.sum("likes");

    // 6. Member (Agent Applications) Statistics
    const totalMembers = await Member.count();
    const membersByStatus = await Member.findAll({
      attributes: ["status", [sequelize.fn("COUNT", sequelize.col("id")), "count"]],
      group: ["status"],
      raw: true,
    });
    const membersByBusinessType = await Member.findAll({
      attributes: ["business_type", [sequelize.fn("COUNT", sequelize.col("id")), "count"]],
      where: { business_type: { [Op.ne]: null } },
      group: ["business_type"],
      raw: true,
    });
    const recentMembers = await Member.count({
      where: { createdAt: { [Op.gte]: thirtyDaysAgo } },
    });

    // 7. Lodge Statistics
    const totalLodges = await Lodge.count();
    const lodgesByDestination = await Lodge.findAll({
      attributes: ["destination", [sequelize.fn("COUNT", sequelize.col("id")), "count"]],
      group: ["destination"],
      raw: true,
    });
    const recentLodges = await Lodge.count({
      where: { createdAt: { [Op.gte]: thirtyDaysAgo } },
    });

    // 8. Package Statistics
    const totalPackages = await Package.count();
    const packagesByType = await Package.findAll({
      attributes: ["type", [sequelize.fn("COUNT", sequelize.col("id")), "count"]],
      group: ["type"],
      raw: true,
    });
    const activePackages = await Package.count({ where: { isActive: true } });
    const avgPackageRating = await Package.findOne({
      attributes: [[sequelize.fn("AVG", sequelize.col("rating")), "average"]],
      raw: true,
    });
    const recentPackages = await Package.count({
      where: { createdAt: { [Op.gte]: thirtyDaysAgo } },
    });

    // 9. RouteStage Statistics
    const totalRouteStages = await RouteStage.count();
    const recentRouteStages = await RouteStage.count({
      where: { createdAt: { [Op.gte]: thirtyDaysAgo } },
    });

    // 10. Destination Statistics
    const totalDestinations = await Destination.count();
    const activeDestinations = await Destination.count({ where: { is_active: true } });
    const destinationsByLocation = await Destination.findAll({
      attributes: ["location", [sequelize.fn("COUNT", sequelize.col("id")), "count"]],
      group: ["location"],
      raw: true,
    });
    const recentDestinations = await Destination.count({
      where: { createdAt: { [Op.gte]: thirtyDaysAgo } },
    });

    // 11. Gallery Statistics
    const totalGalleryItems = await Gallery.count();
    const galleryByType = await Gallery.findAll({
      attributes: ["type", [sequelize.fn("COUNT", sequelize.col("id")), "count"]],
      group: ["type"],
      raw: true,
    });
    const galleryByCategory = await Gallery.findAll({
      attributes: ["category", [sequelize.fn("COUNT", sequelize.col("id")), "count"]],
      group: ["category"],
      raw: true,
    });
    const featuredGalleryItems = await Gallery.count({ where: { isFeatured: true } });
    const activeGalleryItems = await Gallery.count({ where: { isActive: true } });
    const recentGalleryItems = await Gallery.count({
      where: { createdAt: { [Op.gte]: thirtyDaysAgo } },
    });

    // 12. Form Statistics
    const totalForms = await Form.count();
    const activeForms = await Form.count({ where: { is_active: true } });
    const recentForms = await Form.count({
      where: { created_at: { [Op.gte]: thirtyDaysAgo } },
    });

    // 13. FormField Statistics
    const totalFormFields = await FormField.count();
    const recentFormFields = await FormField.count({
      where: { created_at: { [Op.gte]: thirtyDaysAgo } },
    });

    // 14. FieldOption Statistics
    const totalFieldOptions = await FieldOption.count();
    const recentFieldOptions = await FieldOption.count({
      where: { created_at: { [Op.gte]: thirtyDaysAgo } },
    });

    // 15. FormSubmission Statistics
    const totalSubmissions = await FormSubmission.count();
    const submissionsByStatus = await FormSubmission.findAll({
      attributes: ["status", [sequelize.fn("COUNT", sequelize.col("id")), "count"]],
      group: ["status"],
      raw: true,
    });
    const recentSubmissions = await FormSubmission.count({
      where: { created_at: { [Op.gte]: thirtyDaysAgo } },
    });

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalUsers,
          activeUsers,
          totalDocuments,
          totalReviews,
          totalBlogs,
          totalMembers,
          totalLodges,
          totalPackages,
          totalRouteStages,
          totalDestinations,
          totalGalleryItems,
          totalForms,
          totalFormFields,
          totalFieldOptions,
          totalSubmissions,
        },
        adminUsers: {
          total: totalUsers,
          active: activeUsers,
          byRole: usersByRole,
        },
        documents: {
          total: totalDocuments,
          byType: documentsByType,
          recent: recentDocuments,
        },
        auditTrail: {
          last7Days: recentActivities,
          byAction: activitiesByAction,
        },
        reviews: {
          total: totalReviews,
          byStatus: reviewsByStatus,
          byRating: reviewsByRating,
          averageRating: parseFloat(avgRating?.average || 0).toFixed(2),
          recent: recentReviews,
        },
        blogs: {
          total: totalBlogs,
          byStatus: blogsByStatus,
          byCategory: blogsByCategory,
          featured: featuredBlogs,
          totalViews: totalBlogViews || 0,
          totalLikes: totalBlogLikes || 0,
          recent: recentBlogs,
        },
        members: {
          total: totalMembers,
          byStatus: membersByStatus,
          byBusinessType: membersByBusinessType,
          recent: recentMembers,
        },
        lodges: {
          total: totalLodges,
          byDestination: lodgesByDestination,
          recent: recentLodges,
        },
        packages: {
          total: totalPackages,
          byType: packagesByType,
          active: activePackages,
          averageRating: parseFloat(avgPackageRating?.average || 0).toFixed(2),
          recent: recentPackages,
        },
        routeStages: {
          total: totalRouteStages,
          recent: recentRouteStages,
        },
        destinations: {
          total: totalDestinations,
          active: activeDestinations,
          byLocation: destinationsByLocation,
          recent: recentDestinations,
        },
        gallery: {
          total: totalGalleryItems,
          byType: galleryByType,
          byCategory: galleryByCategory,
          featured: featuredGalleryItems,
          active: activeGalleryItems,
          recent: recentGalleryItems,
        },
        forms: {
          total: totalForms,
          active: activeForms,
          recent: recentForms,
        },
        formFields: {
          total: totalFormFields,
          recent: recentFormFields,
        },
        fieldOptions: {
          total: totalFieldOptions,
          recent: recentFieldOptions,
        },
        formSubmissions: {
          total: totalSubmissions,
          byStatus: submissionsByStatus,
          recent: recentSubmissions,
        },
        trends: {
          last30Days: {
            documents: recentDocuments,
            reviews: recentReviews,
            blogs: recentBlogs,
            members: recentMembers,
            lodges: recentLodges,
            packages: recentPackages,
            routeStages: recentRouteStages,
            destinations: recentDestinations,
            galleryItems: recentGalleryItems,
            forms: recentForms,
            formFields: recentFormFields,
            fieldOptions: recentFieldOptions,
            submissions: recentSubmissions,
          },
        },
      },
    });
  } catch (error) {
    console.error("Error fetching system analytics:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching system analytics",
      error: error.message,
    });
  }
};


// Get monthly trends for charts
const getMonthlyTrends = async (req, res) => {
  try {
    const { months = 6 } = req.query;

    console.log(`Fetching ${months} months trend data...`);

    const monthsAgo = new Date();
    monthsAgo.setMonth(monthsAgo.getMonth() - parseInt(months));

    // Helper function to group by month
    const groupByMonth = (records) => {
      const grouped = {};
      records.forEach((record) => {
        // Handle both createdAt (Sequelize) and created_at (raw DB) formats
        const dateValue = record.createdAt || record.created_at;
        if (!dateValue) return;
        const date = new Date(dateValue);
        if (isNaN(date.getTime())) return; // Skip invalid dates
        const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        grouped[month] = (grouped[month] || 0) + 1;
      });
      return Object.entries(grouped)
        .map(([month, count]) => ({ month, count }))
        .sort((a, b) => a.month.localeCompare(b.month));
    };

    // Fetch all models for monthly trends
    // Note: Form models use createdAt in Sequelize but created_at in DB
    const [
      documents,
      reviews,
      blogs,
      members,
      lodges,
      packages,
      routeStages,
      destinations,
      galleryItems,
      forms,
      formFields,
      fieldOptions,
      submissions,
    ] = await Promise.all([
      Document.findAll({ attributes: ["createdAt"], where: { createdAt: { [Op.gte]: monthsAgo } }, raw: true }),
      Review.findAll({ attributes: ["createdAt"], where: { createdAt: { [Op.gte]: monthsAgo } }, raw: true }),
      Blog.findAll({ attributes: ["createdAt"], where: { createdAt: { [Op.gte]: monthsAgo } }, raw: true }),
      Member.findAll({ attributes: ["createdAt"], where: { createdAt: { [Op.gte]: monthsAgo } }, raw: true }),
      Lodge.findAll({ attributes: ["createdAt"], where: { createdAt: { [Op.gte]: monthsAgo } }, raw: true }),
      Package.findAll({ attributes: ["createdAt"], where: { createdAt: { [Op.gte]: monthsAgo } }, raw: true }),
      RouteStage.findAll({ attributes: ["createdAt"], where: { createdAt: { [Op.gte]: monthsAgo } }, raw: true }),
      Destination.findAll({ attributes: ["createdAt"], where: { createdAt: { [Op.gte]: monthsAgo } }, raw: true }),
      Gallery.findAll({ attributes: ["createdAt"], where: { createdAt: { [Op.gte]: monthsAgo } }, raw: true }),
      Form.findAll({ attributes: [[sequelize.col("created_at"), "createdAt"]], where: { created_at: { [Op.gte]: monthsAgo } }, raw: true }),
      FormField.findAll({ attributes: [[sequelize.col("created_at"), "createdAt"]], where: { created_at: { [Op.gte]: monthsAgo } }, raw: true }),
      FieldOption.findAll({ attributes: [[sequelize.col("created_at"), "createdAt"]], where: { created_at: { [Op.gte]: monthsAgo } }, raw: true }),
      FormSubmission.findAll({ attributes: [[sequelize.col("created_at"), "createdAt"]], where: { created_at: { [Op.gte]: monthsAgo } }, raw: true }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        documents: groupByMonth(documents),
        reviews: groupByMonth(reviews),
        blogs: groupByMonth(blogs),
        members: groupByMonth(members),
        lodges: groupByMonth(lodges),
        packages: groupByMonth(packages),
        routeStages: groupByMonth(routeStages),
        destinations: groupByMonth(destinations),
        galleryItems: groupByMonth(galleryItems),
        forms: groupByMonth(forms),
        formFields: groupByMonth(formFields),
        fieldOptions: groupByMonth(fieldOptions),
        submissions: groupByMonth(submissions),
      },
    });
  } catch (error) {
    console.error("Error fetching monthly trends:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching monthly trends",
      error: error.message,
    });
  }
};

module.exports = {
  getSystemAnalytics,
  getMonthlyTrends,
};

