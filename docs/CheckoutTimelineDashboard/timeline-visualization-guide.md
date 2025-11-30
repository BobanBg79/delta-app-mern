# Timeline Visualization Guide - TomorrowCheckoutsReport

## Overview

This document describes the implementation of the visual timeline component used in the Tomorrow's Checkouts dashboard to display checkout times and cleaning windows.

---

## Components

### 1. TomorrowCheckoutsReport

**Location:** `client/src/components/reports/TomorrowCheckoutsReport.js`

**Purpose:** Main container component that displays tomorrow's checkouts in a tabular format with integrated timeline visualization.

**Features:**
- Fetches tomorrow's checkout data from backend API
- Displays loading/error states with appropriate UI feedback
- Shows apartment details, reservation periods, and guest information
- Integrates TimelineBar component for each apartment
- Highlights late checkouts with "Late check-out!" badge
- Indicates when there's no next reservation

**Usage:**
```jsx
import TomorrowCheckoutsReport from './components/reports/TomorrowCheckoutsReport';

// In Homepage.js or Dashboard
{hasPermission(user?.role?.permissions || [], USER_PERMISSIONS.CAN_VIEW_CLEANING) && (
  <TomorrowCheckoutsReport />
)}
```

**State Management:**
- Local state using React hooks (useState, useEffect)
- No Redux dependency (self-contained)
- Automatic data fetching on component mount

---

### 2. TimelineBar

**Location:** `client/src/components/reports/TimelineBar.js`

**Purpose:** Visual timeline representation showing checkout time marker and cleaning window duration.

**Props:**
```javascript
{
  cleaningWindow: {
    startTime: "11:00",        // Checkout time in HH:MM format
    endTime: "14:00",          // Checkin time (or 23:59 if no next reservation)
    durationMinutes: 180,      // Duration in minutes
    isCritical: false,         // True if < 120 minutes
    isInvalid: false           // True if checkin before checkout
  },
  isLateCheckout: false        // True if checkout after 11:00
}
```

**Visual Elements:**

1. **Timeline Axis**
   - Spans from 00:00 to 23:59 (24 hours - full day)
   - 6 time labels: 00:00, 06:00, 11:00, 14:00, 18:00, 23:59
   - Fixed reference lines at default times (11:00 checkout, 14:00 checkin)

2. **Cleaning Window Bar**
   - Horizontal bar positioned between checkout and checkin times
   - Color-coded based on duration:
     - **Green**: Normal (≥ 2 hours) - Safe cleaning window
     - **Orange**: Critical (< 2 hours) - Tight schedule
     - **Red**: Invalid (negative duration) - Data error
   - Displays time range label (e.g., "11:00 - 14:00")
   - Hover effect for better UX

3. **Checkout Time Marker**
   - Vertical line at checkout time
   - Color-coded:
     - **Blue**: Normal checkout (≤ 11:00)
     - **Red**: Late checkout (> 11:00)
   - Label shows exact time
   - Tooltip on hover

---

## Timeline Positioning Logic

### Configuration

```javascript
const TIMELINE_START = 0 * 60;  // 00:00 = 0 minutes since midnight
const TIMELINE_END = 24 * 60;   // 24:00 = 1440 minutes since midnight
const TIMELINE_DURATION = 1440; // 24 hours in minutes
```

### Position Calculation Formula

```javascript
// Convert "HH:MM" to minutes since midnight
const timeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

// Calculate position as percentage of timeline
const position = ((timeInMinutes - TIMELINE_START) / TIMELINE_DURATION) * 100;
```

### Examples

| Time  | Minutes | Calculation             | Position |
|-------|---------|-------------------------|----------|
| 00:00 | 0       | (0-0)/1440 * 100        | 0%       |
| 06:00 | 360     | (360-0)/1440 * 100      | 25%      |
| 11:00 | 660     | (660-0)/1440 * 100      | 45.83%   |
| 14:00 | 840     | (840-0)/1440 * 100      | 58.33%   |
| 18:00 | 1080    | (1080-0)/1440 * 100     | 75%      |
| 23:59 | 1439    | (1439-0)/1440 * 100     | 99.93%   |

### Cleaning Window Bar Dimensions

```javascript
// Left position = checkout time position
const left = ((checkoutMinutes - 0) / 1440) * 100;

// Width = difference between checkin and checkout positions
const width = ((checkinMinutes - checkoutMinutes) / 1440) * 100;
```

**Example:** Checkout at 11:00, Checkin at 14:00
- Left: 45.83%
- Width: 12.5% (from 45.83% to 58.33%)

---

## Visual Scenarios

### Scenario 1: Normal Checkout with Next Reservation

```
Checkout: 11:00 | Checkin: 14:00 | Duration: 3 hours

Timeline:
00:00    06:00     11:00          14:00      18:00        23:59
|--------|---------|[===GREEN===]|----------|------------|
                   ↑              ↑
                checkout       checkin
```

**Characteristics:**
- Green cleaning window bar
- Blue checkout marker
- 3-hour safe window for cleaning

---

### Scenario 2: Late Checkout with No Next Reservation

```
Checkout: 12:30 | Checkin: N/A (23:59) | Duration: 11h 29min

Timeline:
00:00    06:00     11:00   12:30                        23:59
|--------|---------|-------|[=========GREEN=============]|
                           ↑                            ↑
                       checkout                     end of day
```

**Characteristics:**
- Green cleaning window bar (extends to end of day)
- Red checkout marker (late checkout > 11:00)
- "Late check-out!" badge in table
- "No next reservation" text in checkin column

---

### Scenario 3: Critical Cleaning Window

```
Checkout: 12:30 | Checkin: 14:00 | Duration: 1.5 hours

Timeline:
00:00    06:00     11:00   12:30     14:00      18:00        23:59
|--------|---------|-------|[=ORANGE=]|----------|------------|
                           ↑          ↑
                       checkout    checkin
```

**Characteristics:**
- Orange cleaning window bar (< 2 hours)
- Red checkout marker (late checkout)
- Warning: Tight cleaning schedule requires attention

---

### Scenario 4: Invalid Window (Data Error)

```
Checkout: 14:00 | Checkin: 12:00 | Duration: -2 hours

Timeline:
00:00    06:00     11:00   12:00  14:00      18:00        23:59
|--------|---------|-------|------|[===RED===]|------------|
                                  ↑
                              impossible
```

**Characteristics:**
- Red cleaning window bar (impossible scenario)
- Red checkout marker
- Indicates data integrity issue (checkin before checkout)

---

## Color Palette

### Cleaning Window Bars

| Status   | Gradient Colors                | Hex Codes                |
|----------|--------------------------------|--------------------------|
| Normal   | Green → Teal                   | #28a745 → #20c997        |
| Critical | Orange → Yellow                | #fd7e14 → #ffc107        |
| Invalid  | Red → Darker Red               | #dc3545 → #e74c3c        |

### Checkout Markers

| Status | Color        | Hex Code |
|--------|--------------|----------|
| Normal | Blue         | #007bff  |
| Late   | Red          | #dc3545  |

### Reference Lines

| Element             | Style              | Color     |
|---------------------|--------------------|-----------|
| Default checkout    | Dashed, 1px        | #6c757d   |
| Default checkin     | Dashed, 1px        | #6c757d   |

---

## CSS Styling

**File:** `client/src/components/reports/TimelineBar.css`

### Key CSS Classes

```css
.timeline-bar-container {
  width: 100%;
  padding: 20px 10px;
}

.timeline-track {
  position: relative;
  height: 60px;
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.timeline-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: #666;
}

.cleaning-window-bar {
  position: absolute;
  height: 20px;
  border-radius: 3px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.cleaning-window-bar.normal {
  background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
}

.cleaning-window-bar.critical {
  background: linear-gradient(135deg, #fd7e14 0%, #ffc107 100%);
}

.cleaning-window-bar.invalid {
  background: linear-gradient(135deg, #dc3545 0%, #e74c3c 100%);
}

.checkout-marker {
  position: absolute;
  transform: translateX(-50%);
  z-index: 10;
}

.checkout-marker.late .checkout-marker-line {
  background: #dc3545; /* Red for late checkout */
}
```

### Responsive Breakpoints

**Mobile (≤ 768px):**
```css
@media (max-width: 768px) {
  .timeline-labels {
    font-size: 0.65rem;
  }

  .cleaning-window-label {
    font-size: 0.6rem;
  }
}
```

---

## Backend Integration

### API Endpoint

**Route:** `GET /api/apartment-cleanings/reports/tomorrow-checkouts-dashboard`

**Response Format:**
```json
{
  "date": "2025-12-01",
  "apartments": [
    {
      "apartment": { "_id": "...", "name": "Jorgovan" },
      "checkoutReservation": {
        "_id": "...",
        "plannedCheckOut": "2025-12-01",
        "plannedCheckoutTime": "12:30",
        "guest": { "fname": "John", "lname": "Doe" }
      },
      "checkinReservation": null,
      "scheduledCleanings": [],
      "cleaningWindow": {
        "startTime": "12:30",
        "endTime": "23:59",
        "durationMinutes": 689,
        "isCritical": false,
        "isInvalid": false
      },
      "isLateCheckout": true,
      "isEarlyCheckin": false
    }
  ]
}
```

### Service Method

**File:** `services/CleaningService.js`

```javascript
calculateCleaningWindow(checkoutTime, checkinTime, hasNextReservation = true) {
  const DEFAULT_CHECKOUT = "11:00";
  const DEFAULT_CHECKIN = "14:00";
  const END_OF_DAY = "23:59";
  const CRITICAL_THRESHOLD = 120; // minutes

  const checkout = checkoutTime || DEFAULT_CHECKOUT;

  // If no next reservation, extend to end of day
  const checkin = hasNextReservation
    ? (checkinTime || DEFAULT_CHECKIN)
    : END_OF_DAY;

  // ... calculation logic
}
```

**Key Logic:**
- When `hasNextReservation = false`, cleaning window extends to 23:59
- Critical threshold set at 120 minutes (2 hours)
- Handles edge cases (invalid windows, missing times)

---

## Testing

### Backend Tests

**File:** `tests/services/CleaningService.test.js`

**Coverage:**
- 23 tests for `calculateCleaningWindow()`
- 5 tests specifically for `hasNextReservation = false` scenario
- All tests passing ✅

**Key Tests:**
```javascript
it('should use end of day (23:59) when no next reservation', () => {
  const result = CleaningService.calculateCleaningWindow('11:00', null, false);
  expect(result.endTime).toBe('23:59');
  expect(result.durationMinutes).toBe(779); // 12h 59min
});
```

### Frontend Tests

**File:** `client/src/components/reports/TimelineBar.test.js`

**Coverage:**
- 15 tests for TimelineBar component
- Tests all visual scenarios (normal, critical, invalid, late)
- Tests positioning calculations
- All tests passing ✅

**Key Tests:**
```javascript
it('should display all 6 time axis labels', () => {
  const labels = container.querySelectorAll('.timeline-label');
  expect(labels).toHaveLength(6);
  expect(labels[0].textContent).toBe('00:00');
  expect(labels[5].textContent).toBe('23:59');
});

it('should position cleaning window bar correctly', () => {
  // 11:00-14:00 window
  expect(bar.style.left).toBe('45.83333333333333%');
  expect(bar.style.width).toBe('12.500000000000007%');
});
```

---

## Accessibility

### Features

1. **Semantic HTML:**
   - Proper use of `<div>` containers with meaningful class names
   - Clear hierarchy and structure

2. **Visual Clarity:**
   - High contrast colors (WCAG AA compliant)
   - Clear labels with readable font sizes
   - Tooltips for additional context

3. **Responsive Design:**
   - Adapts to different screen sizes
   - Touch-friendly on mobile devices
   - Maintains readability across breakpoints

4. **Color Independence:**
   - Not solely reliant on color (labels provide context)
   - Text labels complement visual bars
   - Time labels visible regardless of color perception

---

## Performance Considerations

1. **Calculations:**
   - All positioning calculated on render (no expensive re-calculations)
   - Simple mathematical operations (no complex algorithms)

2. **Re-renders:**
   - Component only re-renders when props change
   - No unnecessary state updates

3. **CSS:**
   - Hardware-accelerated transforms (`translateX`)
   - Smooth transitions with GPU rendering
   - Minimal DOM manipulation

4. **Bundle Size:**
   - Small component (~150 lines of code)
   - Minimal dependencies (no external libraries)
   - CSS file ~200 lines (well-structured)

---

## Future Enhancements

1. **Interactivity:**
   - Click on cleaning window to schedule cleaning
   - Drag to adjust times (advanced feature)
   - Tooltip on hover showing detailed info

2. **Visual Enhancements:**
   - Display scheduled cleaning info on timeline
   - Show cleaner avatar/name on scheduled cleanings
   - Animate bar appearance on load

3. **Data Visualization:**
   - Multiple day view (week timeline)
   - Zoom in/out (hourly vs daily granularity)
   - Historical view (past cleanings)

4. **Advanced Features:**
   - Conflict detection (overlapping cleanings)
   - Real-time updates (WebSocket integration)
   - Export timeline as image/PDF

---

## Related Files

**Components:**
- `client/src/components/reports/TomorrowCheckoutsReport.js`
- `client/src/components/reports/TimelineBar.js`
- `client/src/components/reports/TimelineBar.css`

**Tests:**
- `client/src/components/reports/TomorrowCheckoutsReport.test.js`
- `client/src/components/reports/TimelineBar.test.js`
- `tests/services/CleaningService.test.js`

**Backend:**
- `services/CleaningService.js`
- `routes/api/apartment-cleanings.js`

**Documentation:**
- `docs/CheckoutTimelineDashboard/business-logic.md`
- `docs/CheckoutTimelineDashboard/technical-implementation.md`
- `docs/test-coverage.md`

---

## Maintenance Notes

### Common Issues

1. **Timeline appears empty:**
   - Check if `cleaningWindow` prop is null/undefined
   - Component displays "No timeline data" message
   - Verify backend returns correct data structure

2. **Incorrect positioning:**
   - Verify time format is "HH:MM" (not "H:MM")
   - Check TIMELINE_START/END constants match expectations
   - Ensure calculations account for minutes correctly

3. **Colors not showing:**
   - Check CSS file is imported in component
   - Verify class names match between JS and CSS
   - Ensure gradient syntax is browser-compatible

### Debugging Tips

```javascript
// Add console logs to verify calculations
console.log('Checkout position:', checkoutPosition);
console.log('Checkin position:', checkinPosition);
console.log('Bar width:', cleaningWindowWidth);

// Check cleaning window data
console.log('Cleaning window:', cleaningWindow);
```

---

## Summary

The TimelineBar visualization provides an intuitive, color-coded visual representation of checkout times and cleaning windows. It automatically handles various scenarios including normal checkouts, late checkouts, critical time windows, and apartments with no next reservation. The component is fully tested, responsive, and integrates seamlessly with the TomorrowCheckoutsReport table view.
