# Admin Password Change - Business Documentation

## Overview

This feature allows an administrator to set a new password for any user account in the system, including their own. It provides a controlled way to restore access when a user forgets their password or when a password needs to be reset for security reasons.

## Table of Contents

To insert a Table of Contents, use Insert → Table of Contents in the Confluence editor.

---

## Business Need

Before this feature, a user's password could only be set once - at the moment their account was created. There was no way to change a password afterwards through the application. If a user forgot their password, there was no in-app recovery path.

This feature closes that gap by giving administrators a simple, direct way to reset any user's password.

---

## Who Can Use It

Access is controlled by the **`CAN_UPDATE_USER_PASSWORD`** permission, not by role name.

- ADMIN has this permission automatically.
- Any other role (Owner, Manager, Host, Cleaning Lady, Handy Man) can be granted it manually through the role management UI.
- A user who has the permission can change the password of **any** user, including their own.
- A user without the permission cannot change any password and must ask someone who has it.

By default only ADMIN has it, so out of the box this behaves as "admin only" — but it can be delegated to another role without code changes.

---

## How It Works (User Perspective)

1. An admin opens the details page of any user.
2. A **Change password** button is visible (only to admins).
3. Clicking it opens a popup with two fields:
   - New password
   - Re-enter new password
4. The admin enters the new password twice and clicks **Submit**.
5. The system confirms success with an on-screen message, and the user can immediately log in with the new password.

The admin does **not** need to know the user's current (old) password. This is a direct reset, not a verified change.

---

## Password Rules

Every new password must meet these requirements:

- At least 8 characters long
- At least one uppercase letter
- At least one special character

If the password does not meet these rules, or the two fields do not match, the system shows an error and does not save.

---

## Acceptance Criteria

### Admin resets another user's password

- **Given** an admin is viewing a user's details page
- **When** the admin enters a valid new password (twice) and submits
- **Then** the user's password is updated and a success message is shown

### Admin resets their own password

- **Given** an admin is viewing their own details page
- **When** the admin enters a valid new password and submits
- **Then** their password is updated successfully

### Non-admin cannot change passwords

- **Given** a non-admin user is logged in
- **When** they view a user's details page
- **Then** the Change password button is not shown, and the system rejects any direct password-change attempt

### Validation

- **Given** the admin enters a password that is too short, missing an uppercase letter or special character
- **When** they submit
- **Then** the system shows a validation error and does not save

- **Given** the two password fields do not match
- **When** the admin submits
- **Then** the system shows a "passwords do not match" error and does not save

---

## Open Questions

### Should non-admin users be able to change their own password in the future?

Currently they cannot. A future enhancement could allow self-service password change (requiring the current password).

### Should a password reset be logged or audited?

There is currently no audit trail of who changed whose password and when.

---

## Notes

This feature intentionally does not require the old password, because the goal is administrative recovery, not self-service change. Access is restricted to administrators to keep the action controlled.
