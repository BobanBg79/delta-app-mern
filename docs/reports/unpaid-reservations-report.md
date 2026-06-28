# Unpaid Reservations Report

## Overview

The Unpaid Reservations report lists active reservations whose check-in date has already passed and that are not fully paid. It is shown on the homepage for users who manage money (owner, manager, admin) so they can act on outstanding debts — call the guest, collect payment, etc.

## Table of Contents

To insert a Table of Contents, use Insert → Table of Contents in the Confluence editor.

---

## Business Behavior

- Shows reservations that are **active**, whose **check-in is before today**, and where **totalPaid < totalAmount**.
- Reservations whose debt has been **written off** are excluded — once we stop expecting the money, it should not show as outstanding. See `docs/reservations/debt-write-off.md`.
- Users with `CAN_WRITE_OFF_RESERVATION` can **batch write off** from the report: select rows (or "select all on this page"), click "Write off selected (n)", and confirm in a modal. Without the permission the selection UI is hidden.
- Columns: **Apartment**, **Check-in**, **Check-out**, **Agent** (or "Direct Reservation"), **Contact**, **Total**, **Paid**, **Outstanding (diff)**.
- Clicking a row opens that reservation's details.
- **Default time window**: on load the report filters to check-ins from the **start of the current year** onward (keeps the list recent and bounded). This default is shown as a removable chip, so the user sees it immediately and can change or clear it.

### Column-header filters

- **Apartment** header: a funnel icon opens a multiselect of apartments; check several and press **Apply** (one refetch). Selection applies as `apartmentIds`.
- **Check-in** header: a funnel icon opens a date-range picker (from/to); set a range and press **Apply**.
- Active filters appear as **chips** above the table (e.g. "Check-in: 01.01.2026 – today", "Apartment: Onyx"); each chip has an **x** to remove that one filter immediately. A **Clear all** link appears only when **two or more** chips are active.
- The filter row below the header holds only the **amount-owed** filter (owes more/less than).

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

### Query parameters (all optional)

| Param | Meaning |
|-------|---------|
| `fromDate` | Check-in lower bound (numeric timestamp or ISO) |
| `toDate` | Check-in upper bound (numeric timestamp or ISO); defaults to "before today" |
| `apartmentIds` | Comma-separated apartment ids (one or many → `$in`). Legacy single `apartmentId` still accepted. |
| `minDiff` | Only reservations whose outstanding amount (diff) is >= this |
| `maxDiff` | Only reservations whose outstanding amount (diff) is <= this |
| `page` | Page index (0-based, default 0) |
| `pageSize` | Items per page (default 10) |

### Where filtering happens

- **DB-level** (in the Mongo query): `fromDate`/`toDate` (check-in window), `apartmentIds` (`$in`), plus the always-on `status: 'active'`, `plannedCheckIn < today`, and `debtWrittenOff: { $ne: true }` (exclude written-off).
- **In memory** (after the payments aggregate): `minDiff`/`maxDiff`, because the outstanding amount (diff) is derived from payments and does not exist on the reservation. Sorting and pagination also happen in memory for the same reason.

### Sorting

Results are sorted by check-in date **descending** (newest reservations first).

### The `fromDate` parameter

The endpoint is parameterized so one endpoint can serve different reports. The **caller decides the time window**; the server does not hard-code a business window.

- If `fromDate` is provided: only reservations with `plannedCheckIn >= fromDate` are considered.
- If `fromDate` is omitted: no lower bound — all past-check-in unpaid reservations (future "all debts" report).
- The upper bound (`plannedCheckIn < today`) always applies.

The **homepage** sends `fromDate = start of the current year` (as a numeric timestamp) to keep the list recent and bounded, and surfaces it as a removable chip. As the system accumulates reservations over the years, this prevents the first query from returning an ever-growing list.

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
  ],
  "total": 23,
  "page": 0,
  "pageSize": 10
}
```

`total` is the count after all filters (used by the client to compute the
number of pages); the client derives page count as `ceil(total / pageSize)`
rather than relying on a `hasMore` flag.

---

## Implementation Notes

### Queries (constant, no N+1)

1. Auth middleware — load the requesting user (active check).
2. Permission middleware — load the role with its permissions.
3. `Reservation.find` — active reservations within the window, with apartment and booking agent populated.
4. `AccommodationPaymentService.getTotalPaidForReservations(ids)` — a single aggregate that sums completed payments per reservation (refunds counted as negative), returning a `{ reservationId: totalPaid }` map.

The number of queries does not grow with the number of reservations or payments.

### Frontend

| File | Responsibility |
|------|----------------|
| `components/reports/UnpaidReservationsReport.js` | Fetches with filters + page; renders the table, header filters (apartment + check-in), chips, and pagination |
| `components/reports/UnpaidReservationsFilters.js` | The amount-owed filter row ("owes more/less than"), Search/Clear |

On load the report seeds `fromDate = start of the current year` and page 0.
The table header (columns + apartment/check-in filters) is always rendered;
loading, error, and empty states show as a single full-width row in the table
body. Filters are preserved when changing pages. Page size is 10.

### Why totalPaid is derived

The Reservation document has no payment data (no `totalPaid` field). Paid amounts are always derived by aggregating `AccommodationPayment` records. This is why filtering by "paid vs unpaid" happens in memory after the aggregate, not in the database query.

### Write-off

The per-row `diff` is `totalAmount - totalPaid`. Reservations whose debt is written off are excluded at the DB level (`debtWrittenOff: { $ne: true }`) rather than via a diff adjustment, because write-off is a boolean status (no amount) in this cash-basis system. See `docs/reservations/debt-write-off.md`.

---

## Testing

`tests/routes/reports.test.js` covers:

- Authorization: rejected without the permission (403), allowed with it.
- Report logic: only `totalPaid < totalAmount` rows returned, diff calculation, "Direct Reservation" default, empty list shortcut, sort order.
- Date filtering: always bounded by today; no lower bound without `fromDate`; numeric timestamp parsed into a valid lower bound.
- Search & pagination: single and multiple `apartmentIds` (comma-separated → `$in`); `minDiff`/`maxDiff` filter the outstanding amount; pagination returns `total`/`page`/`pageSize` and slices correctly on the last page; sort is newest-check-in first; written-off reservations excluded.

Frontend: `components/reports/UnpaidReservationsReport.test.js` covers loading/error/empty states (header stays visible), separate check-in/check-out columns, row-click navigation, default `fromDate` = start of current year with its chip, apartment header multiselect (Apply only) and chip removal, check-in date chip, "Clear all" shown only with 2+ chips, and the batch write-off flow (select all, confirm/cancel).

---

## Notes

This report is intentionally scoped to recent, actionable debts. Do not repurpose it for full historical reporting — add a separate report (it can reuse this endpoint by omitting `fromDate`).
