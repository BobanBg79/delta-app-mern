// models/konto/index.js
// Centralized exports for konto module

const Konto = require('./Konto');
const chartOfAccounts = require('./chartOfAccounts');
const kontoBalanceLogic = require('./kontoBalanceLogic');

module.exports = {
  Konto,
  chartOfAccounts,
  kontoBalanceLogic
};
