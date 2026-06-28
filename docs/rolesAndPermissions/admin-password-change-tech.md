# Admin Password Change - Technical Documentation

## Overview

This document describes how the admin password change feature is implemented across the backend and frontend of the MERN application. It complements the business documentation.

## Table of Contents

To insert a Table of Contents, use Insert → Table of Contents in the Confluence editor.

---

## Backend

### Endpoint

```
PUT /api/users/:id/password
```

| Property | Value |
|----------|-------|
| Auth | Required (JWT via auth middleware) |
| Authorization | Requires the `CAN_UPDATE_USER_PASSWORD` permission |
| Request body | `{ "password": "<new password>" }` |
| Success response | `200 { "message": "Password updated successfully" }` |

### Authorization Check

Access is **permission-based**, not role-based. The route is protected with
`requirePermission('CAN_UPDATE_USER_PASSWORD')`. ADMIN receives this permission
automatically on server start; other roles can be granted it manually via the
role management UI. (This is a special, workflow-specific permission, like
`CAN_COMPLETE_CLEANING`.)

### Response Codes

| Code | Condition |
|------|-----------|
| 200 | Password updated successfully |
| 400 | Password missing or does not meet complexity rules |
| 403 | Requesting user lacks `CAN_UPDATE_USER_PASSWORD` |
| 404 | Target user does not exist |
| 500 | Unexpected server error |

### Password Update Logic

The password is updated with a targeted field update rather than a full document save:

```
User.findByIdAndUpdate(
  id,
  { $set: { password: hashedPassword } },
  { new: true }
)
```

Using `findByIdAndUpdate` with `$set` avoids re-validating the entire user document. This is important because some legacy user records are missing fields that are now required (for example `createdBy`); a full `.save()` would fail validation on those unrelated fields.

### Password Hashing

Hashing is centralized in a shared utility so every place that stores a password uses the same logic:

```
// utils/passwordUtils.js
const hashPassword = async (plainPassword) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainPassword, salt);
};
```

This utility is used by both the user registration route and the password change route.

### Validation Rule Reuse

The password complexity rule (regex and message) is defined once in `constants/validation.js` and reused across:

- The Mongoose User model validator
- The registration route validator
- The password change route validator

This removes earlier duplication and a mismatch where the registration pattern did not enforce the 8-character minimum.

---

## Frontend

### User Flow Components

| Layer | File | Responsibility |
|-------|------|----------------|
| Page | `UserView/index.js` | Shows the Change password button (has-permission + edit mode), holds modal open/close state |
| Modal | `UserView/ChangePasswordModal.js` | Two password fields, client-side validation, submit |
| Redux op | `modules/users/operations.js` | `changeUserPassword(userId, password)` calls the endpoint |

### Visibility Rule

The Change password button is rendered only when both conditions are true:

- The logged-in user has the `CAN_UPDATE_USER_PASSWORD` permission (`hasPermission`)
- The page is in edit mode (an existing user is open, not the create form)

This is a UI convenience only. The backend remains the authoritative gate via the 403 check.

### Client-Side Validation

Before calling the endpoint, the modal validates:

- The new password matches the shared password rule
- The two fields are identical

If validation fails, an inline error is shown and no request is made. The same password rule constant is shared between the modal and the user form.

### Feedback

Success and error feedback is delivered through the centralized toast system. On success the modal closes automatically.

---

## Testing

| Area | Coverage |
|------|----------|
| Password change route | Changes another user's password, changes own password, target user not found (404), password missing (400), password fails complexity (400). Authorization (CAN_UPDATE_USER_PASSWORD) is enforced by requirePermission and covered by the permission middleware tests. |
| Hashing utility | Generates a cost-10 salt, hashes the plain password with it, returns the hash, and hashes whatever input it receives |

All backend tests run as part of the standard server test suite.

---

## Open Questions

### Should the old password be required when an admin changes their own password?

Currently it is not. This keeps the flow simple but means an open admin session could be used to change the admin's own password without re-verification.

### Should password changes be audited?

There is currently no audit log recording who changed whose password.

---

## Notes

The feature deliberately keeps the backend as the single source of truth for authorization. The frontend visibility rule and client-side validation are conveniences and do not replace server-side enforcement.
