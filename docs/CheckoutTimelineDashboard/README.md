# Checkout Timeline Dashboard

Visual dashboard for managing tomorrow's apartment checkouts and cleaning schedules.

---

## Quick Links

- **[Business Logic](./business-logic.md)** - All business rules, user flows, and requirements
- **[Technical Implementation](./technical-implementation.md)** - Complete implementation guide with code examples
- **[Timeline Visualization Guide](./timeline-visualization-guide.md)** - Detailed documentation of the TimelineBar component

---

## Overview

This feature provides property managers with a visual timeline of tomorrow's apartment checkouts, helping them efficiently manage cleaning schedules and identify potential time conflicts.

### Key Features

✅ **Visual Timeline** - See all checkouts on a 00:00-23:59 timeline (full 24-hour day)
✅ **Color-Coded Windows** - Instant identification of critical time windows
✅ **Late Checkout Detection** - Automatic flagging of checkouts after 11:00
✅ **No Next Reservation Handling** - Cleaning windows extend to end of day when no same-day checkin
✅ **Comprehensive Testing** - 114 tests (81 backend + 33 frontend) all passing

---

## Components

### Backend

| Component | File | Purpose |
|-----------|------|---------|
| **CleaningService** | `services/CleaningService.js` | Business logic for cleaning calculations |
| **API Route** | `routes/api/apartment-cleanings.js` | REST endpoint for dashboard data |

**Helper Methods:**
- `getTomorrowCheckoutsForDashboard()` - Aggregates checkout/checkin/cleaning data
- `calculateCleaningWindow()` - Computes cleaning window duration and flags
- `isLateCheckout()` - Detects late checkouts (> 11:00)
- `isEarlyCheckin()` - Detects early checkins (< 14:00)

### Frontend

| Component | File | Purpose |
|-----------|------|---------|
| **TomorrowCheckoutsReport** | `client/src/components/reports/TomorrowCheckoutsReport.js` | Main container with table display |
| **TimelineBar** | `client/src/components/reports/TimelineBar.js` | Visual timeline component |
| **CSS** | `client/src/components/reports/TimelineBar.css` | Styling and responsive design |

---

## Timeline Visualization

### Normal Checkout with Next Reservation
```
00:00    06:00     11:00          14:00      18:00        23:59
|--------|---------|[===GREEN===]|----------|------------|
                   ↑              ↑
                checkout       checkin
               (normal)      (3h window)
```

### Late Checkout with No Next Reservation
```
00:00    06:00     11:00   12:30                        23:59
|--------|---------|-------|[=========GREEN=============]|
                           ↑                            ↑
                       checkout                     end of day
                        (LATE!)                  (11h 29m window)
```

### Critical Window (< 2 hours)
```
00:00    06:00     11:00   12:30     14:00      18:00        23:59
|--------|---------|-------|[=ORANGE=]|----------|------------|
                           ↑          ↑
                       checkout    checkin
                        (LATE!)   (90 min - CRITICAL!)
```

---

## Color Coding

| Color  | Meaning | Duration |
|--------|---------|----------|
| 🟢 Green | Normal - Safe cleaning window | ≥ 2 hours |
| 🟠 Orange | Critical - Tight schedule | < 2 hours |
| 🔴 Red | Invalid - Data error | Negative (checkin before checkout) |

**Checkout Markers:**
- 🔵 Blue = Normal checkout (≤ 11:00)
- 🔴 Red = Late checkout (> 11:00)

---

## API Endpoint

### Get Tomorrow's Checkouts Dashboard

**Endpoint:** `GET /api/apartment-cleanings/reports/tomorrow-checkouts-dashboard`

**Authentication:** Required (JWT)

**Permissions:** `CAN_VIEW_CLEANING`

**Response:**
```json
{
  "date": "2025-12-01",
  "apartments": [
    {
      "apartment": { "_id": "...", "name": "Jorgovan" },
      "checkoutReservation": { ... },
      "checkinReservation": { ... } | null,
      "scheduledCleanings": [ ... ],
      "cleaningWindow": {
        "startTime": "11:00",
        "endTime": "14:00",
        "durationMinutes": 180,
        "isCritical": false,
        "isInvalid": false
      },
      "isLateCheckout": false,
      "isEarlyCheckin": false
    }
  ]
}
```

---

## Usage

### Display in Homepage

```jsx
import TomorrowCheckoutsReport from './components/reports/TomorrowCheckoutsReport';
import { hasPermission } from './utils/permissions';
import { USER_PERMISSIONS } from './constants';

function Homepage() {
  const { user } = useSelector(state => state.auth);

  const canViewCleaning = hasPermission(
    user?.role?.permissions || [],
    USER_PERMISSIONS.CAN_VIEW_CLEANING
  );

  return (
    <Container>
      <h2>Dashboard</h2>
      {canViewCleaning && <TomorrowCheckoutsReport />}
    </Container>
  );
}
```

### Standalone Usage

```jsx
import TimelineBar from './components/reports/TimelineBar';

const cleaningWindow = {
  startTime: "11:00",
  endTime: "14:00",
  durationMinutes: 180,
  isCritical: false,
  isInvalid: false
};

<TimelineBar
  cleaningWindow={cleaningWindow}
  isLateCheckout={false}
/>
```

---

## Testing

### Backend Tests
**File:** `tests/services/CleaningService.test.js`
**Total:** 81 tests ✅

- 6 tests for `isLateCheckout()`
- 6 tests for `isEarlyCheckin()`
- 23 tests for `calculateCleaningWindow()` (including 5 for no-next-reservation scenario)
- 8 tests for `getTomorrowCheckoutsForDashboard()`
- 38 tests for `completeCleaning()` and `cancelCompletedCleaning()`

### Frontend Tests
**Files:**
- `client/src/components/reports/TomorrowCheckoutsReport.test.js` (16 tests ✅)
- `client/src/components/reports/TimelineBar.test.js` (17 tests ✅)

**Total:** 33 tests ✅ (17 TimelineBar + 16 TomorrowCheckoutsReport)

---

## Run Tests

```bash
# Backend tests
npm test -- CleaningService

# Frontend tests
cd client && npm test -- TimelineBar
cd client && npm test -- TomorrowCheckoutsReport

# All tests with coverage
npm run test:coverage          # Backend
cd client && npm run test:coverage  # Frontend
```

---

## Implementation Status

### ✅ Completed

- [x] Backend service methods (calculateCleaningWindow, isLateCheckout, isEarlyCheckin)
- [x] Backend aggregation method (getTomorrowCheckoutsForDashboard)
- [x] API endpoint with permissions
- [x] Frontend operations (getCheckoutTimelineDashboardData)
- [x] TomorrowCheckoutsReport component
- [x] TimelineBar visualization component
- [x] CSS styling with responsive design
- [x] Comprehensive backend tests (81 tests)
- [x] Comprehensive frontend tests (33 tests)
- [x] Complete documentation (3 docs)
- [x] No next reservation handling (cleaning window extends to 23:59)

### 🔜 Future Enhancements

- [ ] Click on cleaning window to schedule cleaning
- [ ] Display scheduled cleaning info on timeline
- [ ] Real-time updates via WebSocket
- [ ] Multi-day view (next 7 days)
- [ ] Export to PDF
- [ ] Conflict detection (cleaning lady double-booked)

---

## Business Rules

### Default Times
- **Default Checkout:** 11:00
- **Default Checkin:** 14:00
- **Late Checkout Threshold:** > 11:00
- **Early Checkin Threshold:** < 14:00
- **Critical Window Threshold:** < 120 minutes (2 hours)

### Cleaning Window Calculation
- **With next reservation:** Start = checkout time, End = checkin time
- **Without next reservation:** Start = checkout time, End = 23:59 (end of day)
- **Default values:** If times not specified, use defaults
- **Invalid window:** Checkin before checkout (data error)

### Visibility Rules
- Only active reservations shown
- Only checkouts for tomorrow's date
- Sorted by apartment name
- Permission required: `CAN_VIEW_CLEANING`

---

## File Structure

```
docs/CheckoutTimelineDashboard/
├── README.md                           # This file - Quick reference
├── business-logic.md                   # Business rules and user flows
├── technical-implementation.md         # Complete implementation guide
└── timeline-visualization-guide.md     # TimelineBar component guide

client/src/components/reports/
├── TomorrowCheckoutsReport.js          # Main report component
├── TomorrowCheckoutsReport.test.js     # Component tests (18)
├── TimelineBar.js                      # Timeline visualization
├── TimelineBar.test.js                 # Timeline tests (15)
└── TimelineBar.css                     # Styling

services/
└── CleaningService.js                  # Backend business logic

tests/services/
└── CleaningService.test.js             # Backend tests (81)

routes/api/
└── apartment-cleanings.js              # API endpoints
```

---

## Related Documentation

- [UI Message Toast System](../ui-message-toast-system.md) - User feedback system
- [Unit Testing Rules](../unit-testing-rules.md) - Testing standards
- [Test Coverage Guide](../test-coverage.md) - Coverage setup and usage

---

## Support

For questions or issues related to this feature, refer to:
1. This README for quick answers
2. Technical Implementation doc for detailed code examples
3. Business Logic doc for requirements and rules
4. Timeline Visualization Guide for component-specific details

---

**Last Updated:** 2025-12-01
**Status:** ✅ Production Ready
**Test Coverage:** 114 tests passing (81 backend + 33 frontend)
