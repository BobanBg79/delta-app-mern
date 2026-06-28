# Monthly Income Report

## Overview

The Monthly Income report shows headline stats for the **current month** on the homepage: number of reservations checking in this month, total nights booked, and expected income. It is for users who oversee revenue.

## Access Control

Access is **permission-based**, not role-based:

- The backend route requires the `CAN_VIEW_MONTHLY_INCOME_REPORT` permission.
- ADMIN receives it automatically on server start; other roles are granted it manually via the role management UI.
- The frontend hides the report unless the user has the permission (UI convenience only — the backend is the real gate).

> **Note:** this report was previously gated by a role check (`roleName === 'ADMIN'`) on the homepage and an unprotected (`auth`-only) `/monthly-stats` route. It was migrated to the permission `CAN_VIEW_MONTHLY_INCOME_REPORT` to follow the project's permission-based authorization rule. ADMIN keeps access automatically; no other role had it before, so there is no regression.

## API

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/reservations/monthly-stats` |
| **Permission** | `CAN_VIEW_MONTHLY_INCOME_REPORT` |

Response:

```json
{
  "month": "June 2026",
  "totalReservations": 9,
  "totalNights": 9,
  "totalIncome": 602.00
}
```

- "Current month" is the server's local month (`startOfMonth`..`endOfMonth`), matching reservations whose `plannedCheckIn` falls within it and whose `status` is `active`.

## Implementation

| Layer | File | Change |
|-------|------|--------|
| Backend | `models/Permission.js` | Added `CAN_VIEW_MONTHLY_INCOME_REPORT` to `getAllPermissions()`. |
| Backend | `routes/api/reservations.js` | Added `requirePermission('CAN_VIEW_MONTHLY_INCOME_REPORT')` to `GET /monthly-stats`. |
| Frontend | `client/src/constants.js` | Added the permission constant. |
| Frontend | `client/src/pages/Homepage.js` | Replaced the `isAdmin` gate with `hasPermission(..., CAN_VIEW_MONTHLY_INCOME_REPORT)`. |
| Frontend | `client/src/pages/Homepage.test.js` | MonthlyIncome visibility tests now assert on the permission, not the role. |
| Postman | `postman/reservations.postman_collection.json` | "Monthly Income Stats" request. |
