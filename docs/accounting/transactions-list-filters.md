# Transactions List - Filters and Default View

## Overview

The Transactions page (Accounting → Transactions) lists accounting transactions. On load it shows the most recent transactions, and users can narrow the list with filters. This document covers both the business behavior and the technical implementation.

## Table of Contents

To insert a Table of Contents, use Insert → Table of Contents in the Confluence editor.

---

## Business Behavior

### Default view on load

When the page opens, it shows the **latest 10 transactions** (most recent first). It never loads the full history up front.

### Filtering

Users can filter the list by any combination of:

| Filter | Description |
|--------|-------------|
| Konto | A specific account (dropdown of all kontos) |
| Type | Revenue, Expense, or Transfer |
| Source | The business event: Accommodation Payment, Cleaning, Expense, Transfer, Adjustment, Other |
| Date range | Transactions within a start and end date |

All filters are optional and combine with AND logic. A **Search** button applies the filters; a **Clear** button resets them and returns to the latest transactions.

### Pagination

Results (filtered or not) are paginated in pages of 10. Active filters are preserved when moving between pages — paging does not reset the filters.

---

## Technical Implementation

### Backend

Endpoint:

```
GET /api/accounting/transactions
```

Query parameters (all optional):

| Param | Meaning |
|-------|---------|
| `limit` | Page size (frontend sends 10) |
| `offset` | Pagination offset |
| `startDate` | Range start (numeric timestamp or ISO string) |
| `endDate` | Range end (numeric timestamp or ISO string) |
| `kontoCode` | Exact konto code |
| `type` | revenue / expense / transfer |
| `sourceType` | accommodation_payment / cleaning / expense / transfer / adjustment / other |

The handler builds a MongoDB filter from whatever params are present, then queries with sort (newest first), skip, and limit.

Date parsing note: date params may arrive as a numeric timestamp string or an ISO string. A numeric timestamp must be parsed as a Number, otherwise `new Date()` produces an Invalid Date and the filter silently matches nothing.

Response shape:

```
{
  transactions: [...],
  total,      // count matching the filter
  hasMore,    // offset + limit < total
  limit,
  offset
}
```

`hasMore` tells the client whether another page exists after the current one.

### Frontend

| File | Responsibility |
|------|----------------|
| `pages/Accounting/TransactionsList.js` | Page: holds search criteria + pagination state, fetches data, renders the table |
| `pages/Accounting/TransactionFilters.js` | The filter bar (konto/type/source/date range, Search/Clear) |

Behavior details:

- Page size is fixed at 10.
- On mount, the page fetches with no filters (latest 10).
- A new search always starts at page 0; page changes reuse the current criteria.
- The date range is normalized to start-of-day / end-of-day (via the shared `setHoursForSearchReservation` util) so the end date's transactions are fully included. The normalized range is sent as numeric timestamps.

### Tests

`tests/routes/accountingTransactions.test.js` covers the filter route: empty filter, ISO date strings, numeric timestamp parsing (Invalid Date regression guard), combined konto/type/source filter, limit/offset, and hasMore true/false.

---

## Notes

The transaction `type` enum values are `revenue` / `expense` / `transfer` (not debit/credit). The double-entry direction is captured separately in the `debit` and `credit` amount fields.
