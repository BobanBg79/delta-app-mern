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
   * Create kontos for a new apartment (Revenue + Rent to Owner)
   *
   * @param {ObjectId} apartmentId - Apartment ID
   * @param {String} apartmentName - Apartment name
   * @param {Object} session - MongoDB session (optional)
   * @returns {Object} { revenueKonto, rentKonto }
   */
  async createKontosForApartment(apartmentId, apartmentName, session = null) {
    // Validate apartment exists
    const Apartment = require('../../models/Apartment');
    const apartment = await Apartment.findById(apartmentId).session(session);
    if (!apartment) {
      throw new Error('Apartment not found');
    }

    // Check if kontos already exist for this apartment
    const existingKontos = await Konto.find({ apartmentId }).session(session);
    if (existingKontos.length > 0) {
      throw new Error(`Apartment ${apartmentName} already has ${existingKontos.length} konto(s)`);
    }

    // Get next codes using existing getNextAvailableCode
    const revenueCode = await this.getNextAvailableCode('601-', session);
    const rentCode = await this.getNextAvailableCode('701-', session);

    // Create both kontos
    const revenueKontoData = {
      code: revenueCode,
      name: `Accommodation Revenue - ${apartmentName}`,
      type: 'revenue',
      apartmentId,
      apartmentName,
      description: `Revenue from accommodation in apartment ${apartmentName}`,
      currentBalance: 0,
      isActive: true
    };

    const rentKontoData = {
      code: rentCode,
      name: `Rent to Owner - ${apartmentName}`,
      type: 'expense',
      apartmentId,
      apartmentName,
      description: `Monthly rent to owner of apartment ${apartmentName}`,
      currentBalance: 0,
      isActive: true
    };

    const [revenueKonto, rentKonto] = await Konto.create([revenueKontoData, rentKontoData], { session });

    console.log(`✅ Created kontos for apartment ${apartmentName}: ${revenueCode}, ${rentCode}`);

    return { revenueKonto, rentKonto };
  }

  /**
   * Sync apartment kontos - ensure all apartments have Revenue and Rent kontos
   * This is a backup/healing function that runs during seed to fix any missing kontos
   *
   * @returns {Object} { syncedCount, errors }
   */
  async syncApartmentKontos() {
    const Apartment = require('../../models/Apartment');
    const apartments = await Apartment.find({});

    let syncedCount = 0;
    const errors = [];

    console.log(`\n🏢 Syncing apartment kontos for ${apartments.length} apartment(s)...`);

    for (const apartment of apartments) {
      try {
        // Check Revenue konto (601-XX)
        const revenueKonto = await Konto.findOne({
          apartmentId: apartment._id,
          type: 'revenue',
          code: /^601-/
        });

        if (!revenueKonto) {
          try {
            const revenueCode = await this.getNextAvailableCode('601-');
            const revenueData = {
              code: revenueCode,
              name: `Accommodation Revenue - ${apartment.name}`,
              type: 'revenue',
              apartmentId: apartment._id,
              apartmentName: apartment.name,
              description: `Revenue from accommodation in apartment ${apartment.name}`,
              currentBalance: 0,
              isActive: true
            };
            await Konto.create(revenueData);
            console.log(`   ✅ Created Revenue konto ${revenueCode} for ${apartment.name}`);
            syncedCount++;
          } catch (revenueError) {
            const errorMsg = `Failed to create Revenue konto for ${apartment.name}: ${revenueError.message}`;
            console.error(`   ⚠️  ${errorMsg}`);
            errors.push(errorMsg);
          }
        }

        // Check Rent konto (701-XX) - independent of Revenue
        const rentKonto = await Konto.findOne({
          apartmentId: apartment._id,
          type: 'expense',
          code: /^701-/
        });

        if (!rentKonto) {
          try {
            const rentCode = await this.getNextAvailableCode('701-');
            const rentData = {
              code: rentCode,
              name: `Rent to Owner - ${apartment.name}`,
              type: 'expense',
              apartmentId: apartment._id,
              apartmentName: apartment.name,
              description: `Monthly rent to owner of apartment ${apartment.name}`,
              currentBalance: 0,
              isActive: true
            };
            await Konto.create(rentData);
            console.log(`   ✅ Created Rent konto ${rentCode} for ${apartment.name}`);
            syncedCount++;
          } catch (rentError) {
            const errorMsg = `Failed to create Rent konto for ${apartment.name}: ${rentError.message}`;
            console.error(`   ⚠️  ${errorMsg}`);
            errors.push(errorMsg);
          }
        }
      } catch (apartmentError) {
        const errorMsg = `Error syncing kontos for apartment ${apartment.name}: ${apartmentError.message}`;
        console.error(`   ⚠️  ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    if (syncedCount > 0) {
      console.log(`✅ Synced ${syncedCount} apartment konto(s)`);
    } else {
      console.log(`✅ All apartment kontos are in sync`);
    }

    if (errors.length > 0) {
      console.warn(`⚠️  ${errors.length} error(s) occurred during sync`);
    }

    return { syncedCount, errors };
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

  /**
   * Get transactions for a specific konto
   *
   * @param {String} kontoCode - Konto code
   * @param {Number} limit - Max number of transactions to return
   * @param {Number} offset - Number of transactions to skip
   * @returns {Object} { transactions, total, hasMore }
   */
  async getKontoTransactions(kontoCode, limit = 50, offset = 0) {
    // Validate konto exists
    const konto = await Konto.findOne({ code: kontoCode });
    if (!konto) {
      throw new Error(`Konto ${kontoCode} not found`);
    }

    // Get total count
    const total = await Transaction.countDocuments({ kontoCode });

    // Get transactions with pagination
    const transactions = await Transaction.find({ kontoCode })
      .sort({ transactionDate: -1, createdAt: -1 }) // Most recent first
      .skip(offset)
      .limit(limit)
      .lean();

    return {
      transactions,
      total,
      hasMore: offset + limit < total,
      limit,
      offset
    };
  }
}

module.exports = new KontoService();
