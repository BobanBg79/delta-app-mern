// services/accounting/KontoService.js

const mongoose = require('mongoose');
const Konto = require('../../models/konto/Konto');
const User = require('../../models/User');
const Transaction = require('../../models/Transaction');
const { CASH_REGISTER_ROLES } = require('../../constants/userRoles');

class KontoService {

  /**
   * Create a cash register konto for a user
   *
   * @param {ObjectId} userId - User ID
   * @param {Object} session - MongoDB session (optional)
   * @returns {Object} Created konto
   */
  async createCashRegisterForUser(userId, session = null) {
    // Validate user exists
    const user = await User.findById(userId).populate('role').session(session);
    if (!user) {
      throw new Error('User not found');
    }

    // Validate user has a role that requires cash register
    const roleName = user.role?.name;
    if (!roleName || !CASH_REGISTER_ROLES.includes(roleName)) {
      throw new Error(`User role ${roleName} does not require a cash register`);
    }

    // Check if user already has a cash register
    const existingCashRegister = await Konto.findOne({
      employeeId: userId,
      isCashRegister: true
    }).session(session);

    if (existingCashRegister) {
      throw new Error(`User ${user.fname} ${user.lname} already has a cash register (${existingCashRegister.code})`);
    }

    // Get next available cash register code
    const nextCode = await this.getNextAvailableCode('10', session);

    // Create cash register konto
    const cashRegisterData = {
      code: nextCode,
      name: `Cash Register - ${user.fname} ${user.lname}`,
      type: 'asset',
      isCashRegister: true,
      employeeId: userId,
      employeeName: `${user.fname} ${user.lname}`,
      currentBalance: 0,
      description: `Cash register for employee ${user.fname} ${user.lname}`,
      isActive: true
    };

    const [cashRegister] = await Konto.create([cashRegisterData], { session });

    console.log(`💰 Created cash register ${nextCode} for ${user.fname} ${user.lname}`);

    return cashRegister;
  }

  /**
   * Create a custom konto
   *
   * @param {Object} kontoData - Konto data
   * @param {Object} session - MongoDB session (optional)
   * @returns {Object} Created konto
   */
  async createCustomKonto(kontoData, session = null) {
    const {
      code,
      name,
      type,
      description,
      apartmentId,
      employeeId,
      isCashRegister = false
    } = kontoData;

    // Validate required fields
    if (!code || !name || !type) {
      throw new Error('code, name, and type are required');
    }

    // Validate type
    const validTypes = ['asset', 'liability', 'revenue', 'expense'];
    if (!validTypes.includes(type)) {
      throw new Error(`Invalid type: ${type}. Must be one of: ${validTypes.join(', ')}`);
    }

    // Check if code already exists
    const existingKonto = await Konto.findOne({ code }).session(session);
    if (existingKonto) {
      throw new Error(`Konto with code ${code} already exists`);
    }

    // Create konto
    const newKontoData = {
      code,
      name,
      type,
      description,
      currentBalance: 0,
      isCashRegister,
      isActive: true
    };

    // Add optional references
    if (apartmentId) {
      newKontoData.apartmentId = apartmentId;
    }

    if (employeeId) {
      newKontoData.employeeId = employeeId;
    }

    const [newKonto] = await Konto.create([newKontoData], { session });

    console.log(`✅ Created custom konto ${code} - ${name}`);

    return newKonto;
  }

  /**
   * Deactivate a konto (only if no transactions exist)
   *
   * @param {String} kontoCode - Konto code
   * @returns {Object} Updated konto
   */
  async deactivateKonto(kontoCode) {
    const konto = await Konto.findOne({ code: kontoCode });
    if (!konto) {
      throw new Error(`Konto ${kontoCode} not found`);
    }

    if (!konto.isActive) {
      throw new Error(`Konto ${kontoCode} is already deactivated`);
    }

    // Check if konto has any transactions
    const transactionCount = await Transaction.countDocuments({ kontoCode });
    if (transactionCount > 0) {
      throw new Error(`Cannot deactivate konto ${kontoCode}. It has ${transactionCount} transactions. Kontos with transactions cannot be deactivated.`);
    }

    // Deactivate konto
    konto.isActive = false;
    await konto.save();

    console.log(`🔒 Deactivated konto ${kontoCode} - ${konto.name}`);

    return konto;
  }

  /**
   * Get next available code with a given prefix
   *
   * @param {String} prefix - Code prefix (e.g., '10' for cash registers)
   * @param {Object} session - MongoDB session (optional)
   * @returns {String} Next available code
   */
  async getNextAvailableCode(prefix, session = null) {
    // Find all kontos with codes starting with prefix
    const kontos = await Konto.find({
      code: new RegExp(`^${prefix}`)
    }).session(session);

    if (kontos.length === 0) {
      return `${prefix}1`; // First code: 101, 201, etc.
    }

    // Extract numeric parts and find max
    const numbers = kontos
      .map(k => parseInt(k.code.replace(prefix, '')))
      .filter(n => !isNaN(n));

    const maxNumber = Math.max(...numbers);
    return `${prefix}${maxNumber + 1}`;
  }

  /**
   * Get all kontos (optionally filter by active status)
   *
   * @param {Boolean} activeOnly - Only return active kontos
   * @returns {Array} Kontos
   */
  async getAllKontos(activeOnly = true) {
    const filter = activeOnly ? { isActive: true } : {};
    return await Konto.find(filter).sort({ code: 1 });
  }

  /**
   * Get konto by code
   *
   * @param {String} kontoCode - Konto code
   * @returns {Object} Konto
   */
  async getKontoByCode(kontoCode) {
    const konto = await Konto.findOne({ code: kontoCode });
    if (!konto) {
      throw new Error(`Konto ${kontoCode} not found`);
    }
    return konto;
  }
}

module.exports = new KontoService();
