// jobs/accountBalanceValidation.js

const cron = require('node-cron');
const ValidationService = require('../services/accounting/ValidationService');

/**
 * Cron job for validating and fixing konto balances
 * Runs every Sunday at 23:59
 */
const startAccountBalanceValidation = () => {
  // Schedule: Every Sunday at 23:59
  // Cron format: minute hour day month weekday
  // '59 23 * * 0' = At 23:59 every Sunday (0 = Sunday)

  cron.schedule('59 23 * * 0', async () => {
    console.log('\n=================================');
    console.log('🕐 Running weekly account balance validation...');
    console.log('Time:', new Date().toLocaleString());
    console.log('=================================\n');

    try {
      const result = await ValidationService.validateAndFixAllKontos();

      if (result.fixed > 0) {
        console.log(`\n⚠️  Warning: ${result.fixed} konto balances were corrected`);
        // TODO: Send notification email/Slack if balances were fixed
      } else {
        console.log('\n✅ All konto balances are correct');
      }

      console.log('\n=================================');
      console.log('Weekly validation completed');
      console.log('=================================\n');

    } catch (error) {
      console.error('\n❌ Error during weekly validation:', error);
      // TODO: Send error notification
    }
  });

  console.log('✅ Account balance validation cron job started (runs weekly on Sunday at 23:59)');
};

/**
 * Manual validation trigger (for testing or manual runs)
 */
const runManualValidation = async () => {
  console.log('🔧 Running manual account balance validation...\n');

  try {
    const result = await ValidationService.validateAndFixAllKontos();
    return result;
  } catch (error) {
    console.error('❌ Error during manual validation:', error);
    throw error;
  }
};

module.exports = {
  startAccountBalanceValidation,
  runManualValidation
};
