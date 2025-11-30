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

## 3. What Needs to Be Built

### 3.1 Backend Enhancements

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
      checkin?.plannedArrivalTime
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
 * @returns {Object} Cleaning window details
 */
calculateCleaningWindow(checkoutTime, checkinTime) {
  const DEFAULT_CHECKOUT = "11:00";
  const DEFAULT_CHECKIN = "14:00";
  const CRITICAL_THRESHOLD = 120; // minutes

  const checkout = checkoutTime || DEFAULT_CHECKOUT;
  const checkin = checkinTime || DEFAULT_CHECKIN;

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

### 8.1 Backend Tests

**File:** `tests/services/CleaningService.test.js`

```javascript
describe('getTomorrowCheckoutsForDashboard', () => {
  it('should return apartments with checkout tomorrow', async () => {
    // Setup: Create reservations with checkout tomorrow
    // Assert: Returns aggregated data
  });

  it('should include checkin if exists on same day', async () => {
    // Setup: Create checkout + checkin tomorrow
    // Assert: checkinReservation is populated
  });

  it('should include scheduled cleanings', async () => {
    // Setup: Create cleaning for tomorrow
    // Assert: scheduledCleanings array populated
  });

  it('should calculate cleaning window correctly', async () => {
    // Setup: Checkout at 11:00, checkin at 14:00
    // Assert: window is 180 minutes
  });

  it('should mark critical window when < 2 hours', async () => {
    // Setup: Checkout at 13:30, checkin at 14:00
    // Assert: isCritical is true
  });
});
```

### 8.2 Frontend Tests

**File:** `client/src/pages/CheckoutTimelineDashboard/CheckoutTimelineDashboard.test.js`

```javascript
describe('CheckoutTimelineDashboard', () => {
  it('renders timeline header', () => {
    // Assert: TimelineHeader is rendered
  });

  it('renders apartment rows for each checkout', () => {
    // Setup: Mock data with 3 checkouts
    // Assert: 3 ApartmentRow components rendered
  });

  it('opens schedule modal on cleaning window click', () => {
    // Setup: Render dashboard
    // Action: Click on cleaning window
    // Assert: Modal opens with correct apartment data
  });

  it('shows critical warning for tight windows', () => {
    // Setup: Mock data with 1-hour window
    // Assert: "CRITICAL" indicator displayed
  });
});
```

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

## 10. Future Enhancements (Not in MVP)

- Drag-and-drop to reschedule cleanings
- Real-time updates via WebSocket
- Conflict detection (same cleaning lady double-booked)
- Multi-day view (next 7 days)
- Export to PDF
- Filter by apartment or cleaning lady
- Auto-suggest cleaning start time

---

## Related Documents

- [Business Logic](./business-logic.md) - All business rules and user flows
- [UI Message Toast System](../ui-message-toast-system.md)
- [Unit Testing Rules](../unit-testing-rules.md)
