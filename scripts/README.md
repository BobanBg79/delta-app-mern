# Database Maintenance Scripts

This directory contains database maintenance and cleanup scripts for the Delta App MERN project.

## Available Scripts

### 1. Cleanup Orphaned Reservations

**File:** `cleanupOrphanedReservations.js`

**Purpose:** Removes reservations that reference apartments that no longer exist in the database (orphaned reservations).

**When to use:**
- After discovering that apartments were deleted but their reservations remained
- As part of regular database maintenance
- Before/after major data migrations

**How to run:**

```bash
# Using npm script (recommended)
npm run cleanup:orphaned-reservations

# Or directly with node
node scripts/cleanupOrphanedReservations.js
```

**What it does:**
1. Connects to your MongoDB database (using MONGO_URI from .env)
2. Fetches all reservations and apartments
3. Identifies reservations pointing to non-existent apartments
4. Displays detailed information about orphaned reservations
5. Waits 5 seconds for confirmation
6. Deletes the orphaned reservations
7. Shows cleanup statistics

**Safety features:**
- Shows detailed information before deletion
- 5-second delay to allow cancellation (Ctrl+C)
- Displays statistics before and after cleanup
- No modifications to valid data

**Example output:**

```
🔌 Connecting to MongoDB...
✅ MongoDB Connected
🔍 Searching for orphaned reservations...

📊 Total reservations in database: 150
🏢 Total apartments in database: 45

⚠️  Found 3 orphaned reservation(s)

📋 Orphaned Reservations Details:
────────────────────────────────────────────────────────────────────────────────
1. Reservation ID: 64f1a2b3c4d5e6f7g8h9i0j1
   Apartment ID: 64e1b2c3d4e5f6g7h8i9j0k1 (DOES NOT EXIST)
   Status: active
   Check-in: 2025-10-25T00:00:00.000Z
   Check-out: 2025-10-28T00:00:00.000Z
   Guest: 64d1c2d3e4f5g6h7i8j9k0l1
   Created: 2025-10-20T10:30:00.000Z
────────────────────────────────────────────────────────────────────────────────

⚠️  WARNING: This action will permanently delete these reservations!
🔄 Proceeding with deletion in 5 seconds... (Press Ctrl+C to cancel)

✅ Successfully deleted 3 orphaned reservation(s)
📊 Remaining reservations: 147

📈 Cleanup Statistics:
   • Total reservations before: 150
   • Orphaned reservations found: 3
   • Reservations deleted: 3
   • Total reservations after: 147

👋 Database connection closed
✨ Cleanup completed successfully!
```

**To cancel:**
- Press `Ctrl+C` during the 5-second countdown

---

## MongoDB Atlas Scheduled Triggers (Optional)

If you want to run this cleanup automatically on MongoDB Atlas, you can create a scheduled trigger:

### Setting up Atlas Scheduled Trigger:

1. Go to your MongoDB Atlas Dashboard
2. Navigate to **Triggers** in the left sidebar
3. Click **Add Trigger**
4. Configure the trigger:
   - **Trigger Type:** Scheduled
   - **Name:** `cleanup-orphaned-reservations`
   - **Schedule Type:** Choose your preference (e.g., Weekly, Monthly)
   - **Function:** Create a new function with the cleanup logic

### Example Atlas Function:

```javascript
exports = async function() {
  const mongodb = context.services.get("mongodb-atlas");
  const reservationsCollection = mongodb.db("your_db_name").collection("reservations");
  const apartmentsCollection = mongodb.db("your_db_name").collection("apartments");

  try {
    // Get all apartment IDs
    const apartments = await apartmentsCollection.find({}).toArray();
    const validApartmentIds = apartments.map(apt => apt._id.toString());

    // Find orphaned reservations
    const allReservations = await reservationsCollection.find({}).toArray();
    const orphanedIds = allReservations
      .filter(res => !validApartmentIds.includes(res.apartment.toString()))
      .map(res => res._id);

    if (orphanedIds.length > 0) {
      const result = await reservationsCollection.deleteMany({
        _id: { $in: orphanedIds }
      });

      console.log(`Deleted ${result.deletedCount} orphaned reservations`);
      return { deleted: result.deletedCount };
    }

    console.log("No orphaned reservations found");
    return { deleted: 0 };

  } catch (error) {
    console.error("Error cleaning up orphaned reservations:", error);
    throw error;
  }
};
```

---

## Notes

- **Always backup your database** before running cleanup scripts in production
- Test scripts in a development/staging environment first
- Review the output carefully before allowing deletion to proceed
- Keep logs of cleanup operations for audit purposes

## Adding New Scripts

When adding new maintenance scripts to this directory:
1. Create the script file with clear documentation
2. Add corresponding npm script to `package.json`
3. Update this README with usage instructions
4. Include safety features (confirmations, dry-run options, etc.)
