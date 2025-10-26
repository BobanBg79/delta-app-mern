#!/usr/bin/env node
// scripts/validateAccounts.js
// Script for Heroku Scheduler or manual runs

const mongoose = require('mongoose');
const ValidationService = require('../services/accounting/ValidationService');
require('dotenv').config();

async function validateAccounts() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB\n');

    console.log('Starting account balance validation...\n');
    const result = await ValidationService.validateAndFixAllKontos();

    console.log('\n✅ Validation completed successfully');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error during validation:', error);
    process.exit(1);
  }
}

validateAccounts();
