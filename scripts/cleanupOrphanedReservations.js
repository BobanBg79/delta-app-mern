/**
 * Database Cleanup Script: Remove Orphaned Reservations
 *
 * This script finds and deletes all reservations that reference
 * apartments that no longer exist in the database.
 *
 * Usage:
 *   npm run cleanup:orphaned-reservations
 *
 * Or directly:
 *   node scripts/cleanupOrphanedReservations.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import models
const Reservation = require('../models/Reservation');
const Apartment = require('../models/Apartment');

const cleanupOrphanedReservations = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');

    // Connect to database
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ MongoDB Connected');
    console.log('🔍 Searching for orphaned reservations...\n');

    // Get all reservations
    const allReservations = await Reservation.find({}).lean();
    console.log(`📊 Total reservations in database: ${allReservations.length}`);

    // Get all valid apartment IDs
    const validApartments = await Apartment.find({}).select('_id').lean();
    const validApartmentIds = new Set(
      validApartments.map(apt => apt._id.toString())
    );
    console.log(`🏢 Total apartments in database: ${validApartments.length}\n`);

    // Find orphaned reservations
    const orphanedReservations = allReservations.filter(reservation => {
      const apartmentId = reservation.apartment?.toString();
      return apartmentId && !validApartmentIds.has(apartmentId);
    });

    console.log(`⚠️  Found ${orphanedReservations.length} orphaned reservation(s)\n`);

    if (orphanedReservations.length === 0) {
      console.log('✨ No orphaned reservations found. Database is clean!');
      await mongoose.connection.close();
      console.log('👋 Database connection closed');
      process.exit(0);
    }

    // Display orphaned reservations details
    console.log('📋 Orphaned Reservations Details:');
    console.log('─'.repeat(80));
    orphanedReservations.forEach((res, index) => {
      console.log(`${index + 1}. Reservation ID: ${res._id}`);
      console.log(`   Apartment ID: ${res.apartment} (DOES NOT EXIST)`);
      console.log(`   Status: ${res.status}`);
      console.log(`   Check-in: ${res.plannedCheckIn}`);
      console.log(`   Check-out: ${res.plannedCheckOut}`);
      console.log(`   Guest: ${res.guest || 'N/A'}`);
      console.log(`   Created: ${res.createdAt}`);
      console.log('─'.repeat(80));
    });

    // Ask for confirmation (for manual runs)
    console.log('\n⚠️  WARNING: This action will permanently delete these reservations!');
    console.log('🔄 Proceeding with deletion in 5 seconds... (Press Ctrl+C to cancel)\n');

    // Wait 5 seconds before deletion
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Delete orphaned reservations
    const orphanedIds = orphanedReservations.map(res => res._id);
    const deleteResult = await Reservation.deleteMany({
      _id: { $in: orphanedIds }
    });

    console.log(`\n✅ Successfully deleted ${deleteResult.deletedCount} orphaned reservation(s)`);
    console.log(`📊 Remaining reservations: ${allReservations.length - deleteResult.deletedCount}\n`);

    // Final statistics
    console.log('📈 Cleanup Statistics:');
    console.log(`   • Total reservations before: ${allReservations.length}`);
    console.log(`   • Orphaned reservations found: ${orphanedReservations.length}`);
    console.log(`   • Reservations deleted: ${deleteResult.deletedCount}`);
    console.log(`   • Total reservations after: ${allReservations.length - deleteResult.deletedCount}`);

    // Close connection
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
    console.log('✨ Cleanup completed successfully!');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error during cleanup:', error.message);
    console.error(error);

    // Close connection on error
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }

    process.exit(1);
  }
};

// Run the cleanup
cleanupOrphanedReservations();
