const express = require("express");
const router = express.Router();
const {
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
} = require("../controllers/formController");
const {
  authenticateAdmin,
  requireAdminOrHigher,
} = require("../middleware/auth");
const { errorHandler } = require("../middleware/errorHandler");

// Public routes (no auth required)
router.get("/public", getPublicForms);
router.get("/public/:slug", getPublicForm);
router.post("/public/:slug/submit", submitForm);

// Admin routes (require authentication)
router.use(authenticateAdmin);
router.use(requireAdminOrHigher);

// Form management
router.get("/", getForms);
router.get("/:id", getFormById);
router.post("/", createForm);
router.put("/:id", updateForm);
router.delete("/:id", deleteForm);
router.post("/cleanup-orphaned-fields", cleanupOrphanedFields);

// Submission management
router.get("/:form_id/submissions", getFormSubmissions);
router.put("/submissions/:id/status", updateSubmissionStatus);
router.delete("/submissions/:id", deleteSubmission);

router.use(errorHandler);

module.exports = router;
