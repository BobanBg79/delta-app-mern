// scripts/deleteKontos.js
// Manual script to delete all kontos ONLY if no transactions exist

const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const deleteKontos = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected...\n');

    const Konto = require('../models/konto/Konto');
    const Transaction = require('../models/Transaction');

    // Check if any transactions exist
    const transactionCount = await Transaction.countDocuments();

    if (transactionCount > 0) {
      console.log('❌ Cannot delete kontos!');
      console.log(`   Found ${transactionCount} transactions in the database.`);
      console.log('   Deleting kontos would break transaction references.');
      console.log('\n⚠️  You must delete all transactions first, or this operation is not allowed.\n');
      process.exit(1);
    }

    // Safe to delete - no transactions exist
    const kontoCount = await Konto.countDocuments();

    if (kontoCount === 0) {
      console.log('ℹ️  No kontos found in database. Nothing to delete.\n');
      process.exit(0);
    }

    console.log(`🔍 Found ${kontoCount} kontos in database`);
    console.log('✅ No transactions found - safe to delete');
    console.log('🗑️  Deleting all kontos...\n');

    const result = await Konto.deleteMany({});

    console.log(`✅ Successfully deleted ${result.deletedCount} kontos`);
    console.log('\n💡 Restart your server to re-seed kontos with apartmentId references.\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

deleteKontos();
