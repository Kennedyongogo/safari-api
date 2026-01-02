# Dynamic Forms System

This system allows you to create, manage, and serve dynamic forms through a database-driven approach. No more hardcoded forms - everything is configurable through an admin interface.

## Architecture Overview

### Database Tables
- `forms` - Form definitions (title, description, slug, etc.)
- `form_fields` - Individual form fields (type, label, validation, etc.)
- `field_options` - Options for select/radio/checkbox fields
- `form_submissions` - User form submissions with status tracking

### API Endpoints

#### Admin Endpoints (require authentication)
```
GET    /api/forms                    # List all forms
GET    /api/forms/:id               # Get single form
POST   /api/forms                   # Create form
PUT    /api/forms/:id               # Update form
DELETE /api/forms/:id               # Delete form

GET    /api/form-fields/form/:form_id    # Get fields for a form
POST   /api/form-fields             # Create field
PUT    /api/form-fields/:id         # Update field
DELETE /api/form-fields/:id         # Delete field

GET    /api/form-fields/:field_id/options    # Get field options
POST   /api/form-fields/options     # Create option
PUT    /api/form-fields/options/:id # Update option
DELETE /api/form-fields/options/:id # Delete option

GET    /api/forms/:form_id/submissions       # Get form submissions
PUT    /api/forms/submissions/:id/status     # Update submission status
```

#### Public Endpoints
```
GET  /api/forms/public/:slug         # Get form configuration
POST /api/forms/public/:slug/submit  # Submit form
```

## Setup Instructions

### 1. Run Database Migrations
The models will auto-create tables when the server starts due to `sync()` calls in `models/index.js`.

### 2. Seed Initial Form Data
```bash
cd foundation-api
node src/scripts/seedForms.js
```

This will create the "Trip Quote Form" with all the fields from your original Plan.jsx.

### 3. Test the System

#### Start Backend
```bash
cd foundation-api
npm start
```

#### Start Frontend
```bash
cd safaris-public-new
npm start
```

#### Test Endpoints
- **Form Configuration**: `GET http://localhost:4000/api/forms/public/trip-quote`
- **Submit Form**: `POST http://localhost:4000/api/forms/public/trip-quote/submit`

### 4. Admin Panel Integration
You'll need to add form management components to your admin panel (`foundation-admin`) to:
- Create/edit forms
- Add/edit/remove fields and options
- View/manage submissions

## Form Field Types Supported

- `text` - Single line text input
- `email` - Email input with validation
- `tel` - Telephone input
- `number` - Number input
- `date` - Date picker
- `textarea` - Multi-line text input
- `select` - Dropdown select
- `radio` - Radio button group
- `checkbox` - Single checkbox
- `checkbox_group` - Multiple checkboxes

## Validation Rules

Fields can have validation rules defined in the `validation_rules` JSON field:
```json
{
  "min": 1,
  "max": 100,
  "pattern": "^[A-Za-z]+$",
  "custom_message": "Please enter a valid value"
}
```

## Submission Status Tracking

Submissions have status tracking:
- `pending` - New submission (default)
- `reviewed` - Admin has reviewed
- `contacted` - Admin has contacted the user
- `completed` - Successfully processed

## Benefits

1. **No Hardcoded Data** - Everything stored in database
2. **Dynamic Form Rendering** - Forms built from API responses
3. **Admin Control** - Full CRUD operations through admin panel
4. **Version Control** - Track changes and form versions
5. **Analytics** - Track submission rates and patterns
6. **Multi-form Support** - Create multiple forms easily
7. **Validation** - Server-side validation with custom rules
8. **Status Tracking** - Follow up with submissions effectively

## Next Steps

1. **Admin Interface**: Build form builder in admin panel
2. **Submission Viewer**: Create interface to view/manage submissions
3. **Form Analytics**: Add reporting on form performance
4. **A/B Testing**: Support multiple form versions
5. **Conditional Logic**: Show/hide fields based on other responses
6. **File Uploads**: Support file attachments in forms

## Example Form Creation

```javascript
// Create a form
const form = await Form.create({
  title: "Contact Us",
  slug: "contact",
  description: "Get in touch with us",
  submit_button_text: "Send Message"
});

// Add fields
const nameField = await FormField.create({
  form_id: form.id,
  field_type: "text",
  field_name: "name",
  label: "Full Name",
  is_required: true,
  display_order: 1
});

const emailField = await FormField.create({
  form_id: form.id,
  field_type: "email",
  field_name: "email",
  label: "Email Address",
  is_required: true,
  display_order: 2
});
```

This system gives you complete control over your forms without touching code!
