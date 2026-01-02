const express = require("express");
const router = express.Router();
const {
  getFormFields,
  createFormField,
  updateFormField,
  deleteFormField,
  updateFieldOrder,
  getFieldOptions,
  createFieldOption,
  updateFieldOption,
  deleteFieldOption,
} = require("../controllers/formFieldController");
const {
  authenticateAdmin,
  requireAdminOrHigher,
} = require("../middleware/auth");
const { errorHandler } = require("../middleware/errorHandler");

// All routes require admin authentication
router.use(authenticateAdmin);
router.use(requireAdminOrHigher);

// Debug middleware for form-fields routes
router.use((req, res, next) => {
  console.log(`🔍 FormFields Route: ${req.method} ${req.path} - Body:`, JSON.stringify(req.body, null, 2));
  next();
});

// Field management (specific routes first)
router.get("/form/:form_id", getFormFields);
router.post("/", createFormField);
router.put("/order/update", updateFieldOrder);

// Field options management (more specific than :id)
router.get("/:field_id/options", getFieldOptions);
router.post("/options", createFieldOption);
router.put("/options", createFieldOption); // Handle PUT requests for creating options (frontend bug)
router.put("/options/:id", updateFieldOption);
router.delete("/options/:id", deleteFieldOption);

// Generic field routes (must come last)
router.put("/:id", (req, res, next) => {
  // Only allow numeric IDs to prevent conflicts with other routes
  if (!/^\d+$/.test(req.params.id)) {
    return next(); // Pass to next middleware/route
  }
  updateFormField(req, res);
});
router.delete("/:id", (req, res, next) => {
  // Only allow numeric IDs to prevent conflicts with other routes
  if (!/^\d+$/.test(req.params.id)) {
    return next(); // Pass to next middleware/route
  }
  deleteFormField(req, res);
});

router.use(errorHandler);

module.exports = router;
