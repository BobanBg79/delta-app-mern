# UI Message Toast System

## Overview

The Delta Apartmani application uses a centralized Redux-based message toast system for displaying user feedback messages. This ensures consistent styling, behavior, and user experience across the entire application.

---

## Why Use the Toast System?

**Benefits:**
- ✅ Centralized message handling
- ✅ Automatic 4.5s timeout
- ✅ Consistent styling across the app
- ✅ No need for local `error`/`success` state
- ✅ No manual `setTimeout` cleanup

**Avoid:**
- ❌ Local `useState` for error/success messages
- ❌ Manual `setTimeout` for message cleanup
- ❌ Inconsistent message display patterns

---

## Location

**Module Location:** `/client/src/modules/message/`

**Key Files:**
- `operations.js` - Main `showMessageToast()` function
- `constants.js` - Message types (SUCCESS, ERROR, WARNING)
- `actions.js` - Redux actions
- `reducers.js` - Redux reducer
- `types.js` - Action type constants

---

## How to Use

### 1. Import Required Dependencies

```javascript
import { useDispatch } from 'react-redux';
import { msgOperations, messageConstants } from '../../modules/message';

const { showMessageToast } = msgOperations;
const { SUCCESS, ERROR, WARNING } = messageConstants;
```

### 2. Get Dispatch Function

```javascript
const MyComponent = () => {
  const dispatch = useDispatch();

  // ... rest of component
};
```

### 3. Display Messages

```javascript
// Success message
dispatch(showMessageToast('Operation completed successfully', SUCCESS));

// Error message
dispatch(showMessageToast('Operation failed', ERROR));

// Warning message
dispatch(showMessageToast('Please check your input', WARNING));
```

---

## Message Types

| Type | Constant | Usage | Color |
|------|----------|-------|-------|
| Success | `SUCCESS` | Operation completed successfully | Green |
| Error | `ERROR` | Operation failed or validation error | Red (danger) |
| Warning | `WARNING` | Advisory message or caution | Yellow |

**Constant values:**
```javascript
// client/src/modules/message/constants.js
const MESSAGE_TYPES = {
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'danger',  // Note: 'danger' for Bootstrap compatibility
};
```

---

## Complete Example

```javascript
import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { msgOperations, messageConstants } from '../../modules/message';
import { someApiOperation } from '../../modules/some-module/operations';

const { showMessageToast } = msgOperations;
const { SUCCESS, ERROR } = messageConstants;

const MyComponent = () => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      await someApiOperation(data);
      dispatch(showMessageToast('Item created successfully', SUCCESS));

      // Refresh data, close modal, etc.

    } catch (err) {
      dispatch(showMessageToast(err.message || 'Failed to create item', ERROR));
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handleSubmit} disabled={loading}>
      Submit
    </button>
  );
};
```

---

## Real-World Examples in Codebase

### Example 1: Apartment Operations
**File:** `/client/src/modules/apartment/operations.js`

```javascript
export const createApartment = (data) => async (dispatch) => {
  try {
    dispatch(setApartmentFetchStart());
    await axios.post('/api/apartments', data);
    dispatch(showMessageToast('Apartment is successfully created!', SUCCESS));
  } catch (error) {
    dispatch(showMessageToast('Apartment could not be created', ERROR));
    dispatch(setApartmentError(error.message));
  } finally {
    dispatch(setApartmentFetchEnd());
  }
};
```

### Example 2: Cleaning Cancellation
**File:** `/client/src/pages/ReservationView/ApartmentCleaningSection.js`

```javascript
const handleCancelCompleted = async (cleaningId) => {
  try {
    await cancelCompletedCleaning(cleaningId);
    dispatch(showMessageToast('Cleaning cancelled successfully', SUCCESS));

    // Refresh cleanings list
    const updatedCleanings = await getCleaningsByReservation(reservationId);
    setCleanings(updatedCleanings);
  } catch (err) {
    dispatch(showMessageToast(err.message || 'Failed to cancel completed cleaning', ERROR));
  }
};
```

---

## Implementation Details

### Toast Timeout

Messages automatically disappear after **4.5 seconds** (4500ms):

```javascript
// client/src/modules/message/operations.js
const showMessageToast = (originalMessage, type) => async (dispatch) => {
  // ... show message logic

  setTimeout(() => dispatch(messageActions.clearMessage()), 4500);
};
```

### Message Format

The function accepts either:
1. **String:** Single message
2. **Array:** Multiple messages (e.g., validation errors)

```javascript
// Single message
dispatch(showMessageToast('Item saved', SUCCESS));

// Multiple messages (array format)
const errors = [
  { msg: 'Name is required' },
  { msg: 'Email is invalid' }
];
dispatch(showMessageToast(errors, ERROR));
```

---

## Best Practices

### ✅ DO

```javascript
// Use toast for operation feedback
dispatch(showMessageToast('Cleaning completed successfully', SUCCESS));

// Use descriptive error messages
dispatch(showMessageToast(err.message || 'Failed to complete cleaning', ERROR));

// Extract error messages from API responses
const errorMessage = error.response?.data?.errors?.[0]?.msg ||
                     error.response?.data?.msg ||
                     'Operation failed';
dispatch(showMessageToast(errorMessage, ERROR));
```

### ❌ DON'T

```javascript
// Don't use local state for messages
const [error, setError] = useState(null);
const [success, setSuccess] = useState(null);
setTimeout(() => setSuccess(null), 3000); // ❌ Don't do this

// Don't use generic messages without context
dispatch(showMessageToast('Success', SUCCESS)); // ❌ Not descriptive

// Don't ignore error messages
dispatch(showMessageToast('Error', ERROR)); // ❌ Lost error details
```

---

## Migration Guide

### Old Pattern (Local State)

```javascript
// ❌ OLD - Don't use this pattern
const [error, setError] = useState(null);
const [success, setSuccess] = useState(null);

const handleAction = async () => {
  try {
    await someOperation();
    setSuccess('Operation successful');
    setTimeout(() => setSuccess(null), 3000);
  } catch (err) {
    setError(err.message);
    setTimeout(() => setError(null), 5000);
  }
};

return (
  <>
    {error && <Alert variant="danger">{error}</Alert>}
    {success && <Alert variant="success">{success}</Alert>}
  </>
);
```

### New Pattern (Toast System)

```javascript
// ✅ NEW - Use this pattern
import { useDispatch } from 'react-redux';
import { msgOperations, messageConstants } from '../../modules/message';

const { showMessageToast } = msgOperations;
const { SUCCESS, ERROR } = messageConstants;

const MyComponent = () => {
  const dispatch = useDispatch();

  const handleAction = async () => {
    try {
      await someOperation();
      dispatch(showMessageToast('Operation successful', SUCCESS));
    } catch (err) {
      dispatch(showMessageToast(err.message || 'Operation failed', ERROR));
    }
  };

  // No need for error/success state or Alert components
  return <button onClick={handleAction}>Action</button>;
};
```

---

## Notes

- The toast system is **global** - messages appear in a centralized toast container (usually top-right corner)
- Messages are **non-blocking** - users can continue interacting with the app while messages are displayed
- Only **one message** is displayed at a time - new messages replace old ones
- The system uses **Bootstrap variants** for styling consistency (`success`, `danger`, `warning`)
