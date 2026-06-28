# Reservation Debt Write-Off

## Overview

A reservation's unpaid remainder can be "written off" — marked as money we no longer expect to collect. This is a **business status on the reservation**, not an accounting entry. It removes the reservation from the unpaid-reservations report so it stops appearing as an outstanding debt to chase.

## Table of Contents

To insert a Table of Contents, use Insert → Table of Contents in the Confluence editor.

---

## Business Behavior

- A reservation that is active and not fully paid can have its remaining debt written off.
- Write-off is a **toggle**: it can be set ("Write off debt") and later removed ("Undo write-off").
- A written-off reservation no longer appears in the homepage unpaid-reservations report.
- The action is available on the reservation's payment section, and is restricted by permission (see Access Control).
- The amount is **not** recorded — write-off is a boolean. Whatever the remaining balance is, we have decided to stop expecting it.
- If the guest later pays anyway (in part or in full), that payment is recorded normally through the regular payment flow. The write-off flag does not block or interfere with later payments.

---

## Accounting Treatment (why no transaction)

This is the key design decision, and it follows directly from how the system keeps books.

The system is **cash-basis**: accommodation revenue is recognized **only when the guest pays** (DEBIT cash, CREDIT revenue). Creating a reservation does not touch the books, and there is **no receivable** recorded for amounts owed.

Therefore, an unpaid remainder was **never booked** — not as revenue, not as a receivable. There is nothing in the ledger to reverse or write down. Writing it off is purely a business decision ("don't chase this money"), so it creates **no accounting transaction**.

### Contrast with a refund

A refund **does** create entries, because the opposite is true: the money was actually taken and revenue was recognized. A refund reverses that recognized revenue (DEBIT revenue, CREDIT cash). The asymmetry is the point:

| Case | Was revenue recognized? | Accounting effect |
|------|-------------------------|-------------------|
| Refund (guest paid, we return money) | Yes (cash received) | Reverse revenue (DEBIT revenue, CREDIT cash) |
| Write-off (guest never paid the remainder) | No (cash-basis) | None — nothing to reverse |

### If this were an accrual system

If revenue were recognized at reservation time, the unpaid remainder would sit as a **receivable**, and write-off would have to be an amount booked as bad-debt expense (DEBIT bad-debt expense, CREDIT receivable). That is not our model — hence the boolean flag instead of an amount.

---

## Access Control

Write-off is permission-based: it requires the **`CAN_WRITE_OFF_RESERVATION`** permission. ADMIN gets it automatically; other roles (e.g. OWNER) are granted it manually via the role management UI. The frontend hides the button without the permission, and the backend enforces it on the endpoint (the backend is the real gate). See `docs/rolesAndPermissions/adminRolePermissionSync.md`.

---

## API

```
PUT /api/reservations/:id/write-off
```

| Property | Value |
|----------|-------|
| Auth | Required |
| Permission | `CAN_WRITE_OFF_RESERVATION` |
| Body | `{ "debtWrittenOff": true | false }` |
| Success | `200 { "reservation": { ... } }` |

Setting `true` records `debtWrittenOff: true`, `writtenOffAt`, and `writtenOffBy`. Setting `false` clears all three. No `AccommodationPayment` or `Transaction` records are created.

### Batch write-off

```
PUT /api/reservations/write-off-batch
```

| Property | Value |
|----------|-------|
| Auth | Required |
| Permission | `CAN_WRITE_OFF_RESERVATION` |
| Body | `{ "reservationIds": ["...", "..."] }` (non-empty array of valid ids) |
| Success | `200 { "matched": n, "modified": n }` |

Writes off all given reservations in one `updateMany` (sets `debtWrittenOff: true` + audit fields). Used by the unpaid-reservations report's multi-select. Same permission gate as the single endpoint.

---

## Implementation Notes

### Model (`models/Reservation.js`)

- `debtWrittenOff: Boolean` (default false)
- `writtenOffAt: Date` (audit)
- `writtenOffBy: ObjectId → User` (audit)

### Frontend

The toggle and a "Debt written off" badge live in `client/src/pages/ReservationView/ReservationPaymentSection.js`, gated by `hasPermission(..., CAN_WRITE_OFF_RESERVATION)`. The `setDebtWriteOff` redux thunk (`modules/reservation/operations.js`) calls the endpoint and refreshes the reservation.

The unpaid-reservations report also supports **batch** write-off (same permission): per-row selection checkboxes, a header "select all on this page" checkbox, and a "Write off selected (n)" button that opens a confirmation modal (Cancel / Confirm). On confirm it dispatches `batchWriteOff` and refreshes the list. See `components/reports/UnpaidReservationsReport.js`.

### Report exclusion

The unpaid-reservations report query includes `debtWrittenOff: { $ne: true }`, so written-off reservations drop out. See `docs/reports/unpaid-reservations-report.md`.

---

## Testing

- Backend: `tests/routes/reservationsWriteOff.test.js` (toggle set/clear with audit fields, 404, 400 on non-boolean); `tests/models/Permission.test.js` (permission in list + validator); `tests/routes/reports.test.js` (report excludes written-off).
- Frontend: `client/src/pages/ReservationView/ReservationPaymentSection.test.js` (button hidden without permission, shown with it, dispatch on click, badge + Undo when written off).

---

## Notes

If accounting policy ever changes to accrual (recognizing revenue at reservation time), this feature must be revisited — write-off would then need a real bad-debt entry and an amount, not a boolean.
