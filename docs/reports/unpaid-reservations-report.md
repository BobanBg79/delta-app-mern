# Unpaid Reservations Report

## Overview

The Unpaid Reservations report lists active reservations whose check-in date has already passed and that are not fully paid. It is shown on the homepage for users who manage money (owner, manager, admin) so they can act on outstanding debts — call the guest, collect payment, etc.

## Table of Contents

To insert a Table of Contents, use Insert → Table of Contents in the Confluence editor.

---

## Business Behavior

- Shows reservations that are **active**, whose **check-in is before today**, and where **totalPaid < totalAmount**.
- Each row shows the apartment, the reservation period, the booking agent (or "Direct Reservation"), the guest contact, and three amounts: **Total**, **Paid**, **Outstanding (diff)**.
- Clicking a row opens that reservation's details.
- The report is **actionable and recent**: the homepage only looks back **12 months**. Unpaid reservations older than that do not appear here. A separate "all debts" report (future) can show everything.

---

## Access Control

Access is **permission-based**, not role-based:

- Backend route requires the `CAN_VIEW_UNPAID_RESERVATIONS_REPORT` permission.
- ADMIN receives it automatically on server start; other roles are granted it manually via the role management UI.
- The frontend hides the report unless the user has the permission (UI convenience only — the backend is the real gate).

See `docs/rolesAndPermissions/adminRolePermissionSync.md` for how report permissions work.

---

## API

```
GET /api/reports/unpaid-reservations
```

| Property | Value |
|----------|-------|
| Auth | Required |
| Permission | `CAN_VIEW_UNPAID_RESERVATIONS_REPORT` |
| Query param | `fromDate` (optional) — numeric timestamp or ISO string |

### The `fromDate` parameter

The endpoint is parameterized so one endpoint can serve different reports. The **caller decides the time window**; the server does not hard-code a business window.

- If `fromDate` is provided: only reservations with `plannedCheckIn >= fromDate` are considered.
- If `fromDate` is omitted: no lower bound — all past-check-in unpaid reservations (future "all debts" report).
- The upper bound (`plannedCheckIn < today`) always applies.

The **homepage** sends `fromDate = now - 12 months` (as a numeric timestamp) to keep the list recent and bounded. As the system accumulates reservations over the years, this prevents the first query from returning an ever-growing list.

Date parsing: a numeric timestamp string is parsed as a Number; otherwise it is treated as an ISO date string. (A numeric string passed straight to `new Date()` would produce an Invalid Date.)

### Response

```
{
  "reservations": [
    {
      "_id": "...",
      "apartmentName": "Onyx",
      "plannedCheckIn": "...",
      "plannedCheckOut": "...",
      "bookingAgentName": "Direct Reservation",
      "phoneNumber": "...",
      "totalAmount": 100,
      "totalPaid": 40,
      "diff": 60
    }
  ]
}
```

Sorted by check-in date ascending (oldest debt first).

---

## Implementation Notes

### Queries (constant, no N+1)

1. Auth middleware — load the requesting user (active check).
2. Permission middleware — load the role with its permissions.
3. `Reservation.find` — active reservations within the window, with apartment and booking agent populated.
4. `AccommodationPaymentService.getTotalPaidForReservations(ids)` — a single aggregate that sums completed payments per reservation (refunds counted as negative), returning a `{ reservationId: totalPaid }` map.

The number of queries does not grow with the number of reservations or payments.

### Why totalPaid is derived

The Reservation document has no payment data (no `totalPaid` field). Paid amounts are always derived by aggregating `AccommodationPayment` records. This is why filtering by "paid vs unpaid" happens in memory after the aggregate, not in the database query.

### Future: write-off

The per-row `diff` is `totalAmount - totalPaid`. When the write-off feature exists, the formula becomes `totalPaid + writtenOff < totalAmount`, so written-off reservations drop out of the report. A placeholder comment marks where to subtract the written-off amount.

---

## Testing

`tests/routes/reports.test.js` covers:

- Authorization: rejected without the permission (403), allowed with it.
- Report logic: only `totalPaid < totalAmount` rows returned, diff calculation, "Direct Reservation" default, empty list shortcut, sort order.
- Date filtering: always bounded by today; no lower bound without `fromDate`; numeric timestamp parsed into a valid lower bound; a reservation 370 days old falls outside a 12-month window.

---

## Notes

This report is intentionally scoped to recent, actionable debts. Do not repurpose it for full historical reporting — add a separate report (it can reuse this endpoint by omitting `fromDate`).
