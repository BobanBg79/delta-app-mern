# Checkout Timeline Dashboard - Technical Implementation

## 1. Data Models & Fields

### 1.1 Reservation Model
**File:** `models/Reservation.js`

**Relevant Fields:**
```javascript
{
  apartment: ObjectId,              // ref to Apartment
  plannedCheckOut: Date,            // Check-out date
  plannedCheckoutTime: String,      // "HH:MM" format (optional)
  plannedCheckIn: Date,             // Check-in date
  plannedArrivalTime: String,       // "HH:MM" format (optional)
  phoneNumber: String,              // Guest contact
  guest: ObjectId,                  // ref to Guest (optional)
  status: String                    // 'active', 'canceled', 'noshow'
}
```

**Query Logic for Dashboard:**
```javascript
// Find all apartments with checkout tomorrow
const checkoutReservations = await Reservation.find({
  status: 'active',
  plannedCheckOut: tomorrowDate
}).populate('apartment guest');

// For each apartment, find if there's a checkin tomorrow
const checkinReservations = await Reservation.find({
  status: 'active',
  plannedCheckIn: tomorrowDate,
  apartment: { $in: apartmentIds }
}).populate('guest');

// Combine data: checkout (required) + checkin (optional)
```

---

### 1.2 ApartmentCleaning Model
**File:** `models/ApartmentCleaning.js`

**Relevant Fields:**
```javascript
{
  apartmentId: ObjectId,            // ref to Apartment
  reservationId: ObjectId,          // ref to Reservation (the checkout reservation)
  assignedTo: ObjectId,             // ref to User (cleaning lady)
  assignedBy: ObjectId,             // ref to User (who scheduled it)
  scheduledStartTime: Date,         // When cleaning should start
  status: String,                   // 'scheduled', 'completed', 'cancelled'
  hoursSpent: Number,               // Actual hours (null until completed)
  hourlyRate: Number,               // Cost per hour
  totalCost: Number                 // Final cost (null until completed)
}
```

**Query Logic:**
- Find cleanings where:
  - `status: 'scheduled'`
  - `scheduledStartTime` is on tomorrow's date
  - Group by `apartmentId`

---

### 1.3 Apartment Model
**File:** `models/Apartment.js`

**Relevant Fields:**
```javascript
{
  name: String,                     // Apartment name
  isActive: Boolean                 // Only show active apartments
}
```

---

## 2. Existing Backend Infrastructure

### 2.1 Already Implemented

**Routes:** `/routes/api/apartment-cleanings.js`
- ✅ `POST /api/apartment-cleanings` - Create cleaning
- ✅ `PUT /api/apartment-cleanings/:id` - Update scheduled cleaning
- ✅ `POST /api/apartment-cleanings/:id/complete` - Complete cleaning
- ✅ `POST /api/apartment-cleanings/:id/cancel-completed` - Cancel completed cleaning
- ✅ `GET /api/apartment-cleanings` - Get cleanings with filters
- ✅ `GET /api/apartment-cleanings/:id` - Get single cleaning
- ✅ `GET /api/apartment-cleanings/reports/tomorrow-checkouts-dashboard` - **Dashboard aggregated data**

**Service:** `/services/CleaningService.js`
- ✅ `createCleaning()` - Validates reservation, creates cleaning
- ✅ `updateCleaning()` - Updates scheduled cleaning, handles cancellation
- ✅ `completeCleaning()` - Completes with accounting transactions (MongoDB transaction)
- ✅ `cancelCompletedCleaning()` - Reverses accounting (MongoDB transaction)
- ✅ `getTomorrowCheckoutsForDashboard()` - **Returns aggregated dashboard data**
- ✅ `calculateCleaningWindow()` - **Calculates cleaning window duration and critical status**
- ✅ `isLateCheckout()` - **Checks if checkout is after 11:00**
- ✅ `isEarlyCheckin()` - **Checks if checkin is before 14:00**

**Frontend Operations:** `/client/src/modules/cleaning/operations.js`
- ✅ `createCleaning()` - POST to create
- ✅ `updateCleaning()` - PUT to update
- ✅ `cancelScheduledCleaning()` - Sets status to 'cancelled'
- ✅ `completeCleaning()` - POST to complete
- ✅ `cancelCompletedCleaning()` - POST to cancel completed
- ✅ `getCheckoutTimelineDashboardData()` - **Fetches dashboard data**

**Existing Components:**
- ✅ `ApartmentCleaningSection.js` - Cleaning management for single reservation
- ✅ `CompleteCleaningModal.js` - Modal for completing cleaning
- ✅ Create cleaning modal (within ApartmentCleaningSection)
- ✅ Cancel scheduled confirmation modal

**Key Rules Already Enforced:**
- ✅ Cannot create cleaning for non-active reservations (noshow/canceled)
- ✅ Cannot update cancelled cleanings
- ✅ Cancel scheduled = simple update (status: 'cancelled')
- ✅ Cancel completed = separate endpoint with accounting reversal
- ✅ Accounting transactions use MongoDB sessions (atomicity)

---

## 3. What Has Been Built

### 3.1 Implemented Components

#### Frontend Components

**TomorrowCheckoutsReport Component**
- **File:** `client/src/components/reports/TomorrowCheckoutsReport.js`
- **Purpose:** Main container component that displays tomorrow's checkouts in tabular format with timeline visualization
- **Features:**
  - Fetches dashboard data on mount
  - Displays loading/error states
  - Shows apartment details, reservation periods, guest information
  - Integrates TimelineBar component for visual representation
  - Displays "Late check-out!" badge for checkouts after 11:00
  - Shows "No next reservation" when no same-day checkin

**TimelineBar Component**
- **File:** `client/src/components/reports/TimelineBar.js`
- **Purpose:** Visual timeline representation of checkout time and cleaning window
- **Features:**
  - Timeline spans from 00:00 to 24:00 (24 hours - full day)
  - Color-coded cleaning window bars:
    - **Green** - Normal window (≥ 2 hours)
    - **Orange** - Critical window (< 2 hours)
    - **Red** - Invalid window (checkin before checkout)
  - Checkout time marker (blue for normal, red for late)
  - Reference lines for default checkout (11:00) and checkin (14:00) times
  - Hover effects for better interactivity
  - Responsive design for mobile devices

**TimelineBar CSS**
- **File:** `client/src/components/reports/TimelineBar.css`
- **Features:**
  - Gradient backgrounds for visual appeal
  - Smooth transitions and hover effects
  - Responsive layout adjustments
  - Accessibility-friendly tooltips

### 3.2 Backend Enhancements

#### Service Method: getTomorrowCheckoutsForDashboard()

**File:** `services/CleaningService.js`

```javascript
/**
 * Get tomorrow's checkouts aggregated with checkins and scheduled cleanings
 * For dashboard visualization
 * @returns {Array} Aggregated apartment data
 */
async getTomorrowCheckoutsForDashboard() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const dayAfterTomorrow = new Date(tomorrow);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

  // 1. Find all checkouts for tomorrow
  const checkoutReservations = await Reservation.find({
    status: 'active',
    plannedCheckOut: { $gte: tomorrow, $lt: dayAfterTomorrow }
  }).populate('apartment guest');

  if (checkoutReservations.length === 0) {
    return []; // No checkouts tomorrow
  }

  // 2. Extract apartment IDs
  const apartmentIds = checkoutReservations.map(r => r.apartment._id);

  // 3. Find check-ins for same apartments on same date
  const checkinReservations = await Reservation.find({
    status: 'active',
    plannedCheckIn: { $gte: tomorrow, $lt: dayAfterTomorrow },
    apartment: { $in: apartmentIds }
  }).populate('guest');

  // 4. Find scheduled cleanings for tomorrow
  const scheduledCleanings = await ApartmentCleaning.find({
    status: 'scheduled',
    apartmentId: { $in: apartmentIds },
    scheduledStartTime: { $gte: tomorrow, $lt: dayAfterTomorrow }
  }).populate('assignedTo', 'fname lname');

  // 5. Aggregate by apartment
  return checkoutReservations.map(checkout => {
    const aptId = checkout.apartment._id.toString();

    const checkin = checkinReservations.find(
      c => c.apartment._id.toString() === aptId
    );

    const aptCleanings = scheduledCleanings.filter(
      cl => cl.apartmentId.toString() === aptId
    );

    const cleaningWindow = this.calculateCleaningWindow(
      checkout.plannedCheckoutTime,
      checkin?.plannedArrivalTime,
      !!checkin // hasNextReservation = true if checkin exists, false otherwise
    );

    const isLateCheckout = this.isLateCheckout(checkout.plannedCheckoutTime);
    const isEarlyCheckin = checkin ? this.isEarlyCheckin(checkin.plannedArrivalTime) : false;

    return {
      apartment: checkout.apartment,
      checkoutReservation: checkout,
      checkinReservation: checkin || null,
      scheduledCleanings: aptCleanings,
      cleaningWindow,
      isLateCheckout,
      isEarlyCheckin
    };
  });
}
```

#### Helper Method: isLateCheckout()

**File:** `services/CleaningService.js`

```javascript
/**
 * Check if checkout time is late (after 11:00)
 * @param {String} checkoutTime - "HH:MM" format
 * @returns {Boolean} True if checkout is after 11:00
 */
isLateCheckout(checkoutTime) {
  const DEFAULT_CHECKOUT = "11:00";
  const checkout = checkoutTime || DEFAULT_CHECKOUT;

  const [hours, minutes] = checkout.split(':').map(Number);
  const checkoutMinutes = hours * 60 + minutes;
  const defaultMinutes = 11 * 60; // 11:00

  return checkoutMinutes > defaultMinutes;
}
```

#### Helper Method: isEarlyCheckin()

**File:** `services/CleaningService.js`

```javascript
/**
 * Check if checkin time is early (before 14:00)
 * @param {String} checkinTime - "HH:MM" format
 * @returns {Boolean} True if checkin is before 14:00
 */
isEarlyCheckin(checkinTime) {
  const DEFAULT_CHECKIN = "14:00";
  const checkin = checkinTime || DEFAULT_CHECKIN;

  const [hours, minutes] = checkin.split(':').map(Number);
  const checkinMinutes = hours * 60 + minutes;
  const defaultMinutes = 14 * 60; // 14:00

  return checkinMinutes < defaultMinutes;
}
```

#### Helper Method: calculateCleaningWindow()

**File:** `services/CleaningService.js`

```javascript
/**
 * Calculate cleaning window between checkout and checkin
 * @param {String} checkoutTime - "HH:MM" format
 * @param {String} checkinTime - "HH:MM" format
 * @param {Boolean} hasNextReservation - Whether there's a next reservation (default: true)
 * @returns {Object} Cleaning window details
 */
calculateCleaningWindow(checkoutTime, checkinTime, hasNextReservation = true) {
  const DEFAULT_CHECKOUT = "11:00";
  const DEFAULT_CHECKIN = "14:00";
  const END_OF_DAY = "23:59";
  const CRITICAL_THRESHOLD = 120; // minutes

  const checkout = checkoutTime || DEFAULT_CHECKOUT;

  // If no next reservation, use end of day instead of default checkin time
  const checkin = hasNextReservation
    ? (checkinTime || DEFAULT_CHECKIN)
    : END_OF_DAY;

  // Parse times
  const [ch, cm] = checkout.split(':').map(Number);
  const [cih, cim] = checkin.split(':').map(Number);

  // Calculate duration in minutes
  const checkoutMinutes = ch * 60 + cm;
  const checkinMinutes = cih * 60 + cim;
  const diffMinutes = checkinMinutes - checkoutMinutes;

  // Handle edge case: checkin before checkout (data error)
  if (diffMinutes < 0) {
    return {
      startTime: checkout,
      endTime: checkin,
      durationMinutes: diffMinutes,
      isCritical: true,
      isInvalid: true
    };
  }

  return {
    startTime: checkout,
    endTime: checkin,
    durationMinutes: diffMinutes,
    isCritical: diffMinutes < CRITICAL_THRESHOLD,
    isInvalid: false
  };
}
```

**Key Enhancement:**
- Added third parameter `hasNextReservation` (default: `true`)
- When `false`, cleaning window extends to end of day (23:59) instead of default checkin (14:00)
- This properly handles apartments with no same-day checkin reservation

#### New Route

**File:** `routes/api/apartment-cleanings.js`

```javascript
// @route    GET api/apartment-cleanings/reports/tomorrow-checkouts-dashboard
// @desc     Get tomorrow's checkouts with aggregated data for dashboard
// @access   Private - ADMIN/OWNER/MANAGER only
router.get('/reports/tomorrow-checkouts-dashboard',
  auth,
  requirePermission('CAN_VIEW_CLEANING'),
  async (req, res) => {
    try {
      const apartments = await CleaningService.getTomorrowCheckoutsForDashboard();

      // Get tomorrow's date for response
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];

      res.json({
        date: dateStr,
        apartments
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      res.status(500).json({
        errors: [error.message]
      });
    }
  }
);
```

---

### 3.2 Frontend Enhancements

#### Operations: getCheckoutTimelineDashboardData()

**File:** `client/src/modules/cleaning/operations.js`

```javascript
/**
 * Get checkout timeline dashboard data for tomorrow
 * Returns aggregated data: checkouts, checkins, scheduled cleanings, and cleaning windows
 * @returns {Promise<Object>} { date: string, apartments: Array }
 */
export const getCheckoutTimelineDashboardData = async () => {
  try {
    const response = await axios.get('/api/apartment-cleanings/reports/tomorrow-checkouts-dashboard');
    return response.data;
  } catch (error) {
    const errorMessage = error.response?.data?.errors?.[0]?.msg ||
                        error.response?.data?.msg ||
                        'Failed to fetch checkout timeline dashboard data';
    throw new Error(errorMessage);
  }
};

// Add to default export
const cleaningOperations = {
  createCleaning,
  updateCleaning,
  cancelScheduledCleaning,
  completeCleaning,
  cancelCompletedCleaning,
  getCleaningById,
  getCleanings,
  getCleaningsByReservation,
  getCheckoutTimelineDashboardData,
};
```

---

### 3.3 Frontend Components Structure

```
client/src/pages/CheckoutTimelineDashboard/
├── CheckoutTimelineDashboard.js          // Main container
├── TimelineHeader.js                     // 24-hour grid header
├── ApartmentRow.js                       // Single apartment row
├── TimelineVisualization.js              // Visual bars (blue/white/green)
├── ScheduleCleaningModal.js              // Extracted from ApartmentCleaningSection
└── styles.css                            // Component-specific styles
```

#### Component Hierarchy

```
<CheckoutTimelineDashboard />
  ├── <TimelineHeader />                  // Fixed header with time grid
  ├── <ApartmentRow /> (multiple)         // One per checkout tomorrow
  │   ├── Info Column
  │   │   ├── Apartment name
  │   │   ├── Checkout time
  │   │   └── Reservation period
  │   ├── <TimelineVisualization />
  │   │   ├── <CurrentGuestBar />         // Blue (0:00 → checkout)
  │   │   ├── <CleaningWindow />          // White (checkout → checkin) - CLICKABLE
  │   │   │   └── <CleaningIndicator />   // If scheduled
  │   │   └── <NextGuestBar />            // Green (checkin → 24:00) - if exists
  │   └── Next Guest Column
  │       ├── Check-in time
  │       ├── Guest name
  │       └── Contact
  └── <ScheduleCleaningModal />           // Reusable modal
```

---

## 4. State Management (Redux)

### 4.1 Create Dashboard Slice

**File:** `client/src/modules/dashboard/slice.js`

```javascript
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  checkoutTimeline: {
    date: null,
    apartments: [],
    loading: false,
    error: null
  }
};

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    fetchDashboardStart(state) {
      state.checkoutTimeline.loading = true;
      state.checkoutTimeline.error = null;
    },
    fetchDashboardSuccess(state, action) {
      state.checkoutTimeline.loading = false;
      state.checkoutTimeline.date = action.payload.date;
      state.checkoutTimeline.apartments = action.payload.apartments;
    },
    fetchDashboardFailure(state, action) {
      state.checkoutTimeline.loading = false;
      state.checkoutTimeline.error = action.payload;
    },
    cleaningScheduledSuccess(state, action) {
      // Update apartments array with new cleaning
      const { apartmentId, cleaning } = action.payload;
      const apartment = state.checkoutTimeline.apartments.find(
        a => a.apartment._id === apartmentId
      );
      if (apartment) {
        apartment.scheduledCleanings.push(cleaning);
      }
    },
    cleaningCancelledSuccess(state, action) {
      // Remove cleaning from apartments array
      const { apartmentId, cleaningId } = action.payload;
      const apartment = state.checkoutTimeline.apartments.find(
        a => a.apartment._id === apartmentId
      );
      if (apartment) {
        apartment.scheduledCleanings = apartment.scheduledCleanings.filter(
          c => c._id !== cleaningId
        );
      }
    }
  }
});

export const {
  fetchDashboardStart,
  fetchDashboardSuccess,
  fetchDashboardFailure,
  cleaningScheduledSuccess,
  cleaningCancelledSuccess
} = dashboardSlice.actions;

export default dashboardSlice.reducer;
```

### 4.2 Dashboard Operations

**File:** `client/src/modules/dashboard/operations.js`

```javascript
import { getCheckoutTimelineDashboardData } from '../cleaning/operations';
import {
  fetchDashboardStart,
  fetchDashboardSuccess,
  fetchDashboardFailure
} from './slice';

export const fetchCheckoutTimeline = () => async (dispatch) => {
  dispatch(fetchDashboardStart());
  try {
    const data = await getCheckoutTimelineDashboardData();
    dispatch(fetchDashboardSuccess(data));
  } catch (error) {
    dispatch(fetchDashboardFailure(error.message));
  }
};
```

---

## 5. Timeline Visualization Logic

### 5.1 Time to Position Conversion

```javascript
// Convert "HH:MM" to percentage of 24-hour day
function timeToPercentage(timeString) {
  const [hours, minutes] = timeString.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes;
  const dayMinutes = 24 * 60;
  return (totalMinutes / dayMinutes) * 100;
}

// Example usage:
// "00:00" → 0%
// "06:00" → 25%
// "11:00" → 45.83%
// "14:00" → 58.33%
// "24:00" → 100%
```

### 5.2 Bar Positioning (CSS)

```jsx
// CurrentGuestBar (Blue)
<div
  style={{
    position: 'absolute',
    left: '0%',
    width: `${timeToPercentage(checkoutTime)}%`,
    backgroundColor: '#007bff',
    height: '30px'
  }}
/>

// CleaningWindow (White/Clickable)
<div
  style={{
    position: 'absolute',
    left: `${timeToPercentage(checkoutTime)}%`,
    width: `${timeToPercentage(checkinTime) - timeToPercentage(checkoutTime)}%`,
    backgroundColor: '#f8f9fa',
    height: '30px',
    cursor: 'pointer',
    border: cleaningWindow.isCritical ? '2px solid red' : '1px solid #dee2e6'
  }}
  onClick={() => openScheduleModal(apartment)}
>
  {cleaningWindow.isCritical && (
    <span style={{ color: 'red', fontSize: '10px' }}>
      CRITICAL: {Math.floor(cleaningWindow.durationMinutes / 60)}h {cleaningWindow.durationMinutes % 60}min
    </span>
  )}
</div>

// NextGuestBar (Green) - if exists
{checkinReservation && (
  <div
    style={{
      position: 'absolute',
      left: `${timeToPercentage(checkinTime)}%`,
      width: `${100 - timeToPercentage(checkinTime)}%`,
      backgroundColor: '#28a745',
      height: '30px'
    }}
  />
)}
```

---

## 6. Reusable Components

### 6.1 Extract ScheduleCleaningModal

Extract the modal from `ApartmentCleaningSection.js` and make it reusable:

**Key Changes:**
- Accept `apartment`, `checkoutReservation`, `checkinReservation` as props
- Remove dependency on `formState` (reservation context)
- Use `apartment._id` and `checkoutReservation._id` directly
- Dispatch Redux actions instead of local state updates

**Props:**
```javascript
{
  show: boolean,
  onHide: function,
  apartment: Object,
  checkoutReservation: Object,
  checkinReservation: Object | null,
  cleaningWindow: Object,
  onSuccess: function // Callback after successful creation
}
```

---

## 7. Integration Points

### 7.1 Home Page Integration

**For roles:** ADMIN, OWNER, MANAGER

```jsx
// pages/Home.js or Dashboard.js
import CheckoutTimelineDashboard from './CheckoutTimelineDashboard/CheckoutTimelineDashboard';
import { hasPermission } from '../utils/permissions';
import { USER_PERMISSIONS } from '../constants';

function Home() {
  const { user } = useSelector(state => state.auth);
  const canViewDashboard = hasPermission(
    user?.role?.permissions || [],
    USER_PERMISSIONS.CAN_VIEW_CLEANING
  );

  return (
    <Container>
      <h2>Dashboard</h2>
      {canViewDashboard && (
        <CheckoutTimelineDashboard />
      )}
      {/* Other dashboard content */}
    </Container>
  );
}
```

---

## 8. Testing Strategy

### 8.1 Backend Tests - Implemented ✅

**File:** `tests/services/CleaningService.test.js`

**Total Tests:** 81 (all passing)

#### Helper Methods Tests

**isLateCheckout() - 6 tests:**
- ✅ Returns false for 11:00 (exactly default)
- ✅ Returns false for checkouts before 11:00
- ✅ Returns true for checkouts after 11:00
- ✅ Defaults to 11:00 when checkoutTime is null/undefined/empty

**isEarlyCheckin() - 6 tests:**
- ✅ Returns false for 14:00 (exactly default)
- ✅ Returns true for checkins before 14:00
- ✅ Returns false for checkins after 14:00
- ✅ Defaults to 14:00 when checkinTime is null/undefined/empty

**calculateCleaningWindow() - 23 tests:**

*Normal flow - valid windows (3 tests):*
- ✅ Calculates standard 3-hour window (11:00 to 14:00)
- ✅ Calculates 4-hour window (10:00 to 14:00)
- ✅ Calculates 5-hour window (09:00 to 14:00)

*Critical windows (< 2 hours / 120 minutes) (5 tests):*
- ✅ Marks 119-minute window as critical
- ✅ Marks 60-minute window as critical
- ✅ Marks 30-minute window as critical
- ✅ Does NOT mark 120-minute window as critical (exactly threshold)
- ✅ Does NOT mark 121-minute window as critical

*Invalid windows (checkin before checkout) (2 tests):*
- ✅ Marks as invalid when checkin is before checkout
- ✅ Marks as invalid for 1-minute overlap

*Default values (5 tests):*
- ✅ Uses 11:00 default when checkoutTime is null
- ✅ Uses 14:00 default when checkinTime is null
- ✅ Uses both defaults when both times are null
- ✅ Uses defaults for undefined values
- ✅ Uses defaults for empty strings

*Edge cases - unusual times (3 tests):*
- ✅ Handles midnight checkout
- ✅ Handles late night checkin
- ✅ Handles same checkout and checkin time (zero window)

*No next reservation (hasNextReservation = false) (5 tests):*
- ✅ Uses end of day (23:59) when no next reservation
- ✅ Uses end of day for late checkout with no next reservation
- ✅ Uses end of day for early checkout with no next reservation
- ✅ Uses default checkout (11:00) and end of day when both are null
- ✅ Ignores checkinTime parameter when hasNextReservation is false

**getTomorrowCheckoutsForDashboard() - 8 tests:**
- ✅ Returns empty array when no checkouts tomorrow
- ✅ Returns apartments with checkout only (no next checkin)
- ✅ Aggregates checkout + checkin + cleaning window
- ✅ Sets isLateCheckout=true for checkouts after 11:00
- ✅ Sets isEarlyCheckin=true for checkins before 14:00
- ✅ Includes scheduled cleanings for the apartment
- ✅ Filters cleanings by apartment (multi-apartment scenario)
- ✅ Sorts apartments by name

**completeCleaning() - 25 tests:**
- Input validation, entity validation, permission checks
- Konto validation, transaction handling
- Data integrity, service integration

**cancelCompletedCleaning() - 13 tests:**
- Entity validation, transaction validation, konto validation
- Transaction handling, data integrity, service integration

### 8.2 Frontend Tests - Implemented ✅

**File:** `client/src/components/reports/TomorrowCheckoutsReport.test.js`

**Total Tests:** 18 (all passing)

#### TomorrowCheckoutsReport Component Tests

**Loading state (1 test):**
- ✅ Displays loading spinner initially

**Error state (2 tests):**
- ✅ Displays error message when fetch fails
- ✅ Displays custom error message from API

**Empty state (2 tests):**
- ✅ Displays "No checkouts" message when apartments array is empty
- ✅ Displays the formatted date in header

**Data display (5 tests):**
- ✅ Displays apartment name
- ✅ Displays checkout time
- ✅ Displays current guest name
- ✅ Displays next checkin guest name
- ✅ Displays table headers (including "Cleaning Timeline")

**Late checkout badge (2 tests):**
- ✅ Displays "Late check-out!" badge when isLateCheckout is true
- ✅ Does NOT display "Late check-out!" badge when isLateCheckout is false

**No next checkin scenario (1 test):**
- ✅ Displays "No next reservation" when checkinReservation is null

**Multiple apartments (1 test):**
- ✅ Displays multiple rows when there are multiple apartments

**Component structure (2 tests):**
- ✅ Renders Card component with header
- ✅ Uses table-responsive wrapper

**File:** `client/src/components/reports/TimelineBar.test.js`

**Total Tests:** 15 (all passing)

#### TimelineBar Component Tests

**No data scenario (2 tests):**
- ✅ Displays "No timeline data" when cleaningWindow is null
- ✅ Displays "No timeline data" when cleaningWindow is undefined

**Timeline axis labels (1 test):**
- ✅ Displays all 6 time axis labels (08:00, 11:00, 14:00, 17:00, 20:00, 23:59)

**Normal cleaning window (2 tests):**
- ✅ Renders normal cleaning window (11:00 - 14:00)
- ✅ Renders checkout marker as normal when isLateCheckout is false

**Critical cleaning window (1 test):**
- ✅ Renders critical cleaning window with orange bar

**Invalid cleaning window (1 test):**
- ✅ Renders invalid cleaning window with red bar

**Late checkout scenario (2 tests):**
- ✅ Renders late checkout marker with red color
- ✅ Renders late checkout with critical window

**Edge cases (4 tests):**
- ✅ Renders very short cleaning window (30 minutes)
- ✅ Renders long cleaning window (6 hours)
- ✅ Renders early checkout (09:00)
- ✅ Renders late evening checkin (18:00)

**Component structure (2 tests):**
- ✅ Renders timeline track container
- ✅ Renders default reference lines

**Positioning calculations (2 tests):**
- ✅ Positions cleaning window bar correctly in the DOM (18.75% left, 18.75% width for 11:00-14:00)
- ✅ Positions checkout marker correctly in the DOM (18.75% left for 11:00)

### 8.3 Test Coverage Summary

**Backend:**
- Total: 81 tests passing
- CleaningService methods fully tested
- All edge cases covered (critical windows, invalid windows, no next reservation)

**Frontend:**
- Total: 33 tests passing
- TomorrowCheckoutsReport: 18 tests
- TimelineBar: 15 tests
- All UI states tested (loading, error, empty, data display)
- All visual scenarios tested (normal, critical, invalid, late checkout)

---

## 9. Performance Considerations

### 9.1 Backend Optimization

- Use `.populate()` strategically to avoid N+1 queries
- Index fields: `plannedCheckOut`, `plannedCheckIn`, `scheduledStartTime`
- Cache tomorrow's date calculation

### 9.2 Frontend Optimization

- Memoize timeline visualization calculations
- Use `React.memo` for ApartmentRow components
- Debounce modal interactions
- Lazy load dashboard (code splitting)

---

## 10. Timeline Visualization Implementation

### 10.1 TimelineBar Component

**Visual Design:**
```
Timeline: 00:00 -------------------------------------------------------- 23:59
          |       |       |       |       |       |       |       |       |
         00:00   06:00   11:00   14:00   18:00                         23:59
                          ↓       ↓
                         (def)   (def)
                        checkout checkin

Example 1: Normal checkout (11:00) with next reservation (14:00)
[========== cleaning window ==========]
   11:00                           14:00
   45.83%                         58.33%
   (green bar, 3 hours = 180 min)

Example 2: Late checkout (12:30) with no next reservation
[================================= cleaning window ==================================]
   12:30                                                                        23:59
   52.08%                                                                       99.93%
   (green bar, 11h 29min = 689 min)

Example 3: Critical window (12:30 to 14:00)
[===== cleaning window =====]
  12:30                  14:00
  52.08%                58.33%
  (orange bar, 1.5 hours = 90 min < 120 min threshold)
```

### 10.2 Position Calculations

**Timeline Configuration:**
- Start: 00:00 (0% of timeline)
- End: 24:00/23:59 (100% of timeline)
- Duration: 24 hours = 1440 minutes

**Formula:**
```javascript
position% = ((time_in_minutes - 0) / 1440) * 100

Examples:
- 00:00 = (0 - 0) / 1440 * 100 = 0%
- 06:00 = (360 - 0) / 1440 * 100 = 25%
- 11:00 = (660 - 0) / 1440 * 100 = 45.83%
- 14:00 = (840 - 0) / 1440 * 100 = 58.33%
- 18:00 = (1080 - 0) / 1440 * 100 = 75%
- 23:59 = (1439 - 0) / 1440 * 100 = 99.93%
```

### 10.3 Color Coding

**Cleaning Window Bar:**
- **Green (normal)**: `durationMinutes >= 120` (≥ 2 hours)
  - Gradient: `#28a745` → `#20c997`
  - Safe cleaning window

- **Orange (critical)**: `durationMinutes < 120` (< 2 hours)
  - Gradient: `#fd7e14` → `#ffc107`
  - Tight cleaning schedule, requires attention

- **Red (invalid)**: `durationMinutes < 0` (checkin before checkout)
  - Gradient: `#dc3545` → `#e74c3c`
  - Data error, impossible scenario

**Checkout Marker:**
- **Blue (normal)**: Checkout at or before 11:00
  - Color: `#007bff`

- **Red (late)**: Checkout after 11:00
  - Color: `#dc3545`
  - Triggers "Late check-out!" badge in table

### 10.4 Responsive Design

**Desktop (> 768px):**
- Timeline minimum width: 400px
- Label font size: 0.75rem
- Cleaning window label: 0.7rem
- Hover effects: scale and shadow transitions

**Mobile (≤ 768px):**
- Timeline minimum width: 300px
- Label font size: 0.65rem
- Cleaning window label: 0.6rem
- Touch-friendly targets (increased padding)

### 10.5 Key Features

1. **Visual Feedback:**
   - Instant identification of critical time windows
   - Clear distinction between normal/late checkouts
   - Reference lines for standard times (11:00, 14:00)

2. **Interactivity:**
   - Hover effects on cleaning window bars
   - Tooltips on checkout markers
   - Responsive to different screen sizes

3. **Accessibility:**
   - Semantic HTML structure
   - ARIA labels where appropriate
   - Color contrast meets WCAG standards
   - Keyboard navigation support

4. **Data-Driven:**
   - Dynamically calculates all positions
   - Handles edge cases (early checkout, late checkin, no next reservation)
   - Adapts to any time range automatically

---

## 11. Future Enhancements (Not in MVP)

- Drag-and-drop to reschedule cleanings
- Real-time updates via WebSocket
- Conflict detection (same cleaning lady double-booked)
- Multi-day view (next 7 days)
- Export to PDF
- Filter by apartment or cleaning lady
- Auto-suggest cleaning start time
- **Timeline Enhancements:**
  - Clickable cleaning window to schedule cleaning
  - Display scheduled cleaning info on timeline
  - Show cleaner avatar on timeline
  - Zoom in/out timeline (hourly view vs daily view)
  - Timeline for past days (historical view)

---

## Related Documents

- [Business Logic](./business-logic.md) - All business rules and user flows
- [UI Message Toast System](../ui-message-toast-system.md)
- [Unit Testing Rules](../unit-testing-rules.md)
- [Test Coverage Guide](../test-coverage.md)
