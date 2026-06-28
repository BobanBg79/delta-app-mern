# Today's Check-ins Report

## Overview

The Today's Check-ins report lists active reservations whose planned check-in is **today**. It is shown on the homepage for users who can view reservations, so the front desk / host sees at a glance who is arriving today.

It is intentionally minimal: a typical day has only a handful of check-ins, so the report has **no filters, no chips, and no pagination** — just a single table.

---

## Business Behavior

- Shows reservations that are **active** and whose **planned check-in is today** (the whole local day, midnight to midnight).
- Columns: **Apartment**, **Arrival time** (`plannedArrivalTime`, or "—"), **Check-out**, **Guest** (or "—"), **Contact** (guest phone, falling back to the reservation `phoneNumber`), **Agent** (or "Direct Reservation").
- Clicking a row opens that reservation's details.
- Empty state: "No check-ins today."

### "Today" timezone

"Today" is computed in the **user's (browser) local timezone**. The frontend builds the range `[00:00 today, 23:59:59.999 today]` in local time and sends each bound as a **numeric UTC millisecond timestamp** (`Date.getTime()`). Because `getTime()` is timezone-agnostic (absolute ms since the epoch), the server interprets the window unambiguously and the result does **not** depend on the server's timezone — it compares two absolute instants against the `plannedCheckIn` UTC `Date` stored in Mongo.

---

## Access Control

Access is **permission-based**, not role-based:

- The backend route requires the `CAN_VIEW_RESERVATION` permission.
- ADMIN receives it automatically on server start; other roles are granted it manually via the role management UI.
- The frontend hides the report unless the user has the permission (UI convenience only — the backend is the real gate).

---

## API

The report **reuses the existing reservations list endpoint** — there is no dedicated report endpoint.

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/reservations` |
| **Query params** | `plannedCheckInFrom`, `plannedCheckInTo` (both optional, numeric UTC ms timestamps) |
| **Permission** | `CAN_VIEW_RESERVATION` |

- With neither bound, the endpoint returns **all** reservations (newest created first) — unchanged from before.
- The bounds build `plannedCheckIn: { $gte: from, $lte: to }`; either bound may be omitted.
- For "Today's Check-ins" the frontend sends `from` = start of today and `to` = end of today (local), as `Date.getTime()` UTC ms.

> **Note:** adding `requirePermission('CAN_VIEW_RESERVATION')` to `GET /api/reservations` also closed a pre-existing gap where the list was protected by `auth` only (any logged-in user could read all reservations). No frontend caller of the unfiltered list existed, so this did not break any screen.

---

## Implementation

| Layer | File | Change |
|-------|------|--------|
| Backend | `routes/api/reservations.js` | Added `requirePermission('CAN_VIEW_RESERVATION')` and the optional `plannedCheckInFrom`/`plannedCheckInTo` window filter to `GET /`. |
| Frontend | `client/src/components/reports/TodayCheckinsReport.js` | New component: fetches `/api/reservations` with today's `plannedCheckInFrom`/`plannedCheckInTo` and renders the table. |
| Frontend | `client/src/pages/Homepage.js` | Renders the report behind `hasPermission(..., CAN_VIEW_RESERVATION)`. |
| Tests | `tests/routes/reservationsList.test.js` | Permission enforcement (403/200) + the `plannedCheckIn` window query. |
| Postman | `postman/reservations.postman_collection.json` | "List All Reservations" and "List Today's Check-ins" requests. |
