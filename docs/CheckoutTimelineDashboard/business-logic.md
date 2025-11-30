# Checkout Timeline Dashboard - Business Logic

## Overview

Interactive dashboard that displays tomorrow's check-outs for all apartments, allowing authorized users (ADMIN, OWNER, MANAGER) to schedule and assign cleaning tasks.

**Location:** Home page for ADMIN, OWNER, and MANAGER roles

**Date Range:** Always shows data for **tomorrow** (if today is 29.11, shows 30.11)

**Critical Rule:** Only apartments with **check-out scheduled for tomorrow** are displayed

---

## 1. User Access & Permissions

### Authorized Roles
- **ADMIN** - full access to view and schedule cleanings
- **OWNER** - full access to view and schedule cleanings
- **MANAGER** - full access to view and schedule cleanings

### Unauthorized Roles
- HOST, CLEANING_LADY, HANDY_MAN - no access to this dashboard

---

## 2. Dashboard Display Rules

### 2.1 Apartment Row Visibility
**An apartment row is displayed ONLY if:**
- There is an **active reservation** with `plannedCheckOut` = tomorrow's date

**Why this rule:**
- Dashboard is focused on cleaning after guest departure
- If apartment only has check-in tomorrow (no checkout), cleaning was already done
- We assume cleaning happens between checkout and next checkin

**Example Scenarios:**
- Apartment A: Guest checks out tomorrow → **SHOW**
- Apartment B: Guest checks out tomorrow AND new guest checks in tomorrow → **SHOW**
- Apartment C: Only check-in tomorrow (no checkout) → **HIDE** (cleaning already done)
- Apartment D: Vacant tomorrow → **HIDE**
- Apartment E: Guest staying (no checkout tomorrow) → **HIDE**

### 2.2 Time Grid
- **24-hour format** (0:00 - 24:00)
- **30-minute intervals** (0:00, 0:30, 1:00, 1:30, ...)
- Horizontal timeline across the top

### 2.3 Apartment Row Content
Each displayed row shows:
- **Apartment name** (e.g., Morača, Orange, Nova)
- **Current reservation period** (check-in to check-out dates)
- **Check-out time** (actual or default 11:00)
- **Visual timeline bars** (see section 3)
- **Next guest info** (check-in time, name, contact) - if exists
- **Assigned cleaning lady/ladies** - if scheduled

---

## 3. Visual Timeline Bars - Rendering Rules

### 3.1 Current Reservation (Blue Bar)
**Represents:** Guest currently staying who is checking out tomorrow

**Start Time:** 0:00 (beginning of the day)
**End Time:** Planned check-out time

**Check-out Time Rules:**
- If `plannedCheckoutTime` exists → use that time
- If `plannedCheckoutTime` is NULL → **default to 11:00** (latest allowed check-out)

**Late Check-out Indicator:**
- If `plannedCheckoutTime` > 11:00 → show **"Late check-out"** warning in red
- Late check-outs must be pre-approved by HOST, OWNER, or MANAGER (existing feature)

**Note:** Blue bar is ALWAYS displayed (because row only appears if checkout exists)

---

### 3.2 Next Reservation (Green Bar)
**Represents:** Next guest arriving tomorrow (optional - may not exist)

**Start Time:** Planned check-in time
**End Time:** 24:00 (end of the day, continues into future)

**Check-in Time Rules:**
- If `plannedArrivalTime` exists → use that time
- If `plannedArrivalTime` is NULL → **default to 14:00** (earliest allowed check-in)

**Early Check-in Indicator:**
- If `plannedArrivalTime` < 14:00 → show **"Early check-in"** warning in red
- Early check-ins must be pre-approved and entered into reservation (existing feature)

**When Green Bar is NOT Displayed:**
- No reservation with check-in tomorrow
- Next reservation is on a future date (not tomorrow)
- Apartment will remain vacant after checkout

---

### 3.3 Cleaning Window (White/Empty Space)
**Represents:** Available time for cleaning after guest checkout

**Scenario 1: Checkout tomorrow + Check-in tomorrow (Same-day turnaround)**
- **Start Time:** Check-out time (actual or default 11:00)
- **End Time:** Check-in time (actual or default 14:00)
- **Default Window:** 11:00 - 14:00 (3 hours)
- **Most common scenario** - tight cleaning window

**Scenario 2: Only checkout tomorrow (No next reservation same day)**
- **Start Time:** Check-out time (actual or default 11:00)
- **End Time:** 24:00
- **Extended window** - no immediate pressure
- **Next guest column:** Shows "No next reservation" or next check-in date

**Critical Cleaning Time Warning:**
- If cleaning window < 2 hours → show **"CRITICAL Clean-up time"** in red
- Display exact time available (e.g., "1h 30 min")
- Typically occurs when late checkout + early checkin

**User Interaction:**
- **Clicking on white space** opens modal to schedule cleaning
- User assigns cleaning lady and sets `scheduledStartTime`
- Validate that scheduled time is within available window

---

### 3.4 Scheduled Cleaning Indicator
**Represents:** Cleaning task already scheduled for this apartment

**Display:**
- Show duration/time label (e.g., "2h", "3h", "13h" or exact time "11:30")
- Position at `scheduledStartTime` within cleaning window
- Visual distinction (colored block or icon)
- Show assigned cleaning lady name

**Data Source:**
- `ApartmentCleaning` model with `status: 'scheduled'`
- Filter by `apartmentId` and `scheduledStartTime` on tomorrow's date

**Interaction:**
- Click to view/edit/cancel scheduled cleaning

---

## 4. Business Logic - Time Calculations

### 4.1 Default Times (Constants)
```javascript
const DEFAULT_CHECKOUT_TIME = "11:00";  // Latest checkout without approval
const DEFAULT_CHECKIN_TIME = "14:00";   // Earliest checkin without approval
const CRITICAL_CLEANING_WINDOW = 2;     // Hours (show warning if less)
```

### 4.2 Calculating Cleaning Window
```javascript
function calculateCleaningWindow(checkoutTime, checkinTime) {
  const checkout = checkoutTime || DEFAULT_CHECKOUT_TIME;
  const checkin = checkinTime || DEFAULT_CHECKIN_TIME;

  const diffInMinutes = timeDifferenceInMinutes(checkout, checkin);
  const hours = Math.floor(diffInMinutes / 60);
  const minutes = diffInMinutes % 60;

  return {
    startTime: checkout,
    endTime: checkin,
    duration: `${hours}h ${minutes}min`,
    durationMinutes: diffInMinutes,
    isCritical: diffInMinutes < (CRITICAL_CLEANING_WINDOW * 60)
  };
}
```

### 4.3 Late Check-out Detection
```javascript
function isLateCheckout(plannedCheckoutTime) {
  if (!plannedCheckoutTime) return false;

  const [hours, minutes] = plannedCheckoutTime.split(':').map(Number);
  return hours > 11 || (hours === 11 && minutes > 0);
}
```

### 4.4 Early Check-in Detection
```javascript
function isEarlyCheckin(plannedArrivalTime) {
  if (!plannedArrivalTime) return false;

  const [hours, minutes] = plannedArrivalTime.split(':').map(Number);
  return hours < 14;
}
```

---

## 5. User Interaction Flow

### 5.1 Scheduling a Cleaning
1. **User clicks** on white space (cleaning window) for an apartment row
2. **Modal opens** with pre-filled data:
   - Apartment name
   - Check-out time (guest leaving)
   - Check-in time (next guest arriving, or "No next guest")
   - Cleaning window duration and time range
   - Suggested start time (right after checkout)
3. **User inputs:**
   - Select cleaning lady from dropdown (users with role CLEANING_LADY)
   - Select scheduled start time (time picker or manual entry "HH:MM")
   - Optional notes
4. **System validates:**
   - Scheduled time is within cleaning window (between checkout and checkin)
   - Cleaning lady is not already assigned to another apartment at that time (optional check)
   - User has permission to schedule (ADMIN, OWNER, MANAGER)
5. **System creates:**
   - New `ApartmentCleaning` record:
     - `status: 'scheduled'`
     - `reservationId`: the checkout reservation ID
     - `apartmentId`: selected apartment
     - `assignedTo`: selected cleaning lady
     - `assignedBy`: current user
     - `scheduledStartTime`: selected time
6. **Success feedback:**
   - Toast message: "Cleaning scheduled successfully"
   - Dashboard updates to show scheduled cleaning indicator
   - Modal closes

### 5.2 Viewing/Editing Scheduled Cleaning
1. **User clicks** on scheduled cleaning indicator
2. **Modal opens** showing:
   - Apartment name
   - Assigned cleaning lady name
   - Scheduled start time
   - Cleaning window info
   - Notes (if any)
   - **Action buttons:**
     - "Cancel Cleaning" (changes status to 'cancelled')
     - "Reassign" (change cleaning lady or time)
     - "Close"
3. **If user cancels:**
   - Confirmation dialog: "Are you sure you want to cancel this cleaning?"
   - Update `ApartmentCleaning.status = 'cancelled'`
   - Remove indicator from dashboard
   - Toast: "Cleaning cancelled"

### 5.3 Reassigning Cleaning
1. From view modal, click "Reassign"
2. Same form as scheduling (pre-filled with current values)
3. User changes cleaning lady or time
4. System validates and updates existing record
5. Toast: "Cleaning reassigned successfully"

---

## 6. Edge Cases & Special Scenarios

### 6.1 Only Checkout Tomorrow (No Next Reservation Same Day)
**Scenario:** Guest checks out tomorrow, next reservation is days away or doesn't exist

**Display:**
- Blue bar: 0:00 to check-out time (e.g., 11:00)
- White space: check-out time to 24:00 (extended window)
- No green bar
- "Next guest" column: "No next reservation" or shows future date (e.g., "Check-in: 05.12")

**Business Logic:**
- Cleaning is less urgent (plenty of time)
- Can schedule anytime after checkout
- Cleaning lady has more flexibility

---

### 6.2 Same-Day Turnaround (Most Common)
**Scenario:** Guest checks out tomorrow, new guest checks in same day

**Display:**
- Blue bar: 0:00 to check-out time (e.g., 11:00)
- White space: check-out to check-in (e.g., 11:00 - 14:00)
- Green bar: check-in time to 24:00 (e.g., 14:00 - 24:00)

**Business Logic:**
- **Critical scenario** - limited cleaning window
- Must schedule cleaning to complete before next check-in
- Show warning if window < 2 hours

---

### 6.3 Late Checkout + Early Checkin (Critical Window)
**Scenario:** Guest checks out at 12:30, next guest checks in at 13:00

**Display:**
- Blue bar: 0:00 to 12:30
- White space: 12:30 to 13:00 (only 30 minutes!)
- Green bar: 13:00 to 24:00
- **RED WARNING:** "CRITICAL Clean-up time: 30 min"

**Business Logic:**
- Potentially insufficient time for proper cleaning
- Highlight to user that they need to act or adjust times
- May need to contact guest to adjust times

---

### 6.4 Overlapping Times (Data Error)
**Scenario:** Check-out time >= check-in time (e.g., checkout at 15:00, checkin at 14:00)

**Display:**
- Show error indicator: "⚠️ Invalid time window"
- Disable cleaning scheduling
- Message: "Check-out time must be before check-in time. Please fix reservation data."

**Business Logic:**
- Should not happen if validation works correctly
- Alert ADMIN to fix data

---

### 6.5 Multiple Cleanings Scheduled
**Scenario:** Both deep cleaning and regular cleaning scheduled for same apartment

**Display:**
- Show multiple indicators in timeline
- Each with different time and cleaning lady
- Color-code or label differently

**Business Logic:**
- Allow multiple cleaning records per apartment per day
- Validate that times don't overlap excessively
- Useful for deep cleaning after long-term guests

---

## 7. Related Documents

- [Technical Implementation](./technical-implementation.md) - API endpoints, components, state management
- [UI Message Toast System](../ui-message-toast-system.md) - For user feedback
- [Unit Testing Rules](../unit-testing-rules.md) - For writing tests
- [Apartment Cleaning Accounting](../apartment-cleaning-accounting.md) - For financial transactions
- **Confluence:** "Apartment Cleaning Management - Business Logic" (pageId: 113803266)

---

## Change Log

| Date | Author | Changes |
|------|--------|---------|
| 2025-11-29 | Initial | Created business logic document |
| 2025-11-29 | Update | Split into business-logic.md and technical-implementation.md |
