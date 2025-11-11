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
   * Create a single apartment-related konto (private helper)
   *
   * @param {ObjectId} apartmentId - Apartment ID
   * @param {String} apartmentName - Apartment name
   * @param {String} type - 'revenue' or 'rent'
   * @param {Object} session - MongoDB session (optional)
   * @returns {Object} Created konto
   */
  async _createApartmentKonto(apartmentId, apartmentName, type, session = null) {
    const kontoConfig = {
      revenue: {
        prefix: '601-',
        nameTemplate: `Accommodation Revenue - ${apartmentName}`,
        type: 'revenue',
        descriptionTemplate: `Revenue from accommodation in apartment ${apartmentName}`
      },
      rent: {
        prefix: '701-',
        nameTemplate: `Rent to Owner - ${apartmentName}`,
        type: 'expense',
        descriptionTemplate: `Monthly rent to owner of apartment ${apartmentName}`
      }
    };

    const config = kontoConfig[type];
    if (!config) {
      throw new Error(`Invalid apartment konto type: ${type}. Must be 'revenue' or 'rent'`);
    }

    // Get next available code
    const code = await this.getNextAvailableCode(config.prefix, session);

    // Create konto data
    const kontoData = {
      code,
      name: config.nameTemplate,
      type: config.type,
      apartmentId,
      apartmentName,
      description: config.descriptionTemplate,
      currentBalance: 0,
      isActive: true
    };

    const [konto] = await Konto.create([kontoData], { session });

    return konto;
  }

  /**
   * Create a single cleaning lady-related konto (private helper)
   *
   * @param {ObjectId} userId - User ID
   * @param {String} userName - User full name (fname + lname)
   * @param {String} type - 'payables' or 'net_salary'
   * @param {Object} session - MongoDB session (optional)
   * @returns {Object} Created konto
   */
  async _createCleaningLadyKonto(userId, userName, type, session = null) {
    const kontoConfig = {
      payables: {
        prefix: '20',
        nameTemplate: `Payables to Cleaner - ${userName}`,
        type: 'liability',
        descriptionTemplate: `Payables to cleaning lady ${userName}`
      },
      net_salary: {
        prefix: '75',
        nameTemplate: `Net Salary - ${userName}`,
        type: 'expense',
        descriptionTemplate: `Net salary expense for cleaning lady ${userName}`
      }
    };

    const config = kontoConfig[type];
    if (!config) {
      throw new Error(`Invalid cleaning lady konto type: ${type}. Must be 'payables' or 'net_salary'`);
    }

    // Get next available code
    const code = await this.getNextAvailableCode(config.prefix, session);

    // Create konto data
    const kontoData = {
      code,
      name: config.nameTemplate,
      type: config.type,
      employeeId: userId,
      employeeName: userName,
      description: config.descriptionTemplate,
      currentBalance: 0,
      isActive: true
    };

    const [konto] = await Konto.create([kontoData], { session });

    return konto;
  }

  /**
   * Create kontos for a cleaning lady (Payables + Net Salary)
   *
   * @param {ObjectId} userId - User ID
   * @param {String} fname - First name
   * @param {String} lname - Last name
   * @param {Object} session - MongoDB session (optional)
   * @returns {Object} { payablesKonto, netSalaryKonto }
   */
  async createKontosForCleaningLady(userId, fname, lname, session = null) {
    const userName = `${fname} ${lname}`;

    // Validate user exists
    const user = await User.findById(userId).populate('role').session(session);
    if (!user) {
      throw new Error('User not found');
    }

    // Validate user is a cleaning lady
    if (user.role?.name !== 'CLEANING_LADY') {
      throw new Error(`User ${userName} is not a cleaning lady (role: ${user.role?.name})`);
    }

    // Check if kontos already exist for this user (excluding Cash Register)
    const existingKontos = await Konto.find({
      employeeId: userId,
      isCashRegister: false,
      $or: [
        { code: /^20/ }, // Payables
        { code: /^75/ }  // Net Salary
      ]
    }).session(session);

    if (existingKontos.length > 0) {
      throw new Error(`Cleaning lady ${userName} already has ${existingKontos.length} konto(s)`);
    }

    // Create both kontos using helper method
    const payablesKonto = await this._createCleaningLadyKonto(userId, userName, 'payables', session);
    const netSalaryKonto = await this._createCleaningLadyKonto(userId, userName, 'net_salary', session);

    console.log(`✅ Created kontos for cleaning lady ${userName}: ${payablesKonto.code}, ${netSalaryKonto.code}`);

    return { payablesKonto, netSalaryKonto };
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

    // Create both kontos using helper method
    const revenueKonto = await this._createApartmentKonto(apartmentId, apartmentName, 'revenue', session);
    const rentKonto = await this._createApartmentKonto(apartmentId, apartmentName, 'rent', session);

    console.log(`✅ Created kontos for apartment ${apartmentName}: ${revenueKonto.code}, ${rentKonto.code}`);

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
            const created = await this._createApartmentKonto(apartment._id, apartment.name, 'revenue');
            console.log(`   ✅ Created Revenue konto ${created.code} for ${apartment.name}`);
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
            const created = await this._createApartmentKonto(apartment._id, apartment.name, 'rent');
            console.log(`   ✅ Created Rent konto ${created.code} for ${apartment.name}`);
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
   * Sync cash registers - ensure all users with CASH_REGISTER_ROLES have cash registers
   * Private helper for syncUserKontos
   *
   * @returns {Object} { syncedCount, errors }
   */
  async _syncCashRegisters() {
    let syncedCount = 0;
    const errors = [];

    try {
      // Get all users with roles that require cash registers
      const users = await User.find({}).populate('role');
      const usersNeedingCashRegister = users.filter(user =>
        user.role && CASH_REGISTER_ROLES.includes(user.role.name)
      );

      console.log(`   💰 Checking ${usersNeedingCashRegister.length} user(s) for Cash Register kontos...`);

      for (const user of usersNeedingCashRegister) {
        try {
          // Check if Cash Register exists
          const cashRegister = await Konto.findOne({
            employeeId: user._id,
            isCashRegister: true
          });

          if (!cashRegister) {
            // Create Cash Register
            try {
              const created = await this.createCashRegisterForUser(user._id);
              console.log(`      ✅ Created Cash Register ${created.code} for ${user.fname} ${user.lname}`);
              syncedCount++;
            } catch (createError) {
              const errorMsg = `Failed to create Cash Register for ${user.fname} ${user.lname}: ${createError.message}`;
              console.error(`      ⚠️  ${errorMsg}`);
              errors.push(errorMsg);
            }
          }
        } catch (userError) {
          const errorMsg = `Error checking Cash Register for user ${user.fname} ${user.lname}: ${userError.message}`;
          console.error(`      ⚠️  ${errorMsg}`);
          errors.push(errorMsg);
        }
      }
    } catch (error) {
      const errorMsg = `Fatal error during Cash Register sync: ${error.message}`;
      console.error(`   ❌ ${errorMsg}`);
      errors.push(errorMsg);
    }

    return { syncedCount, errors };
  }

  /**
   * Sync cleaning lady kontos - ensure all CLEANING_LADY users have Payables and Net Salary kontos
   * Private helper for syncUserKontos
   *
   * @returns {Object} { syncedCount, errors }
   */
  async _syncCleaningLadyKontos() {
    let syncedCount = 0;
    const errors = [];

    try {
      // Get all cleaning ladies
      const users = await User.find({}).populate('role');
      const cleaningLadies = users.filter(user =>
        user.role && user.role.name === 'CLEANING_LADY'
      );

      console.log(`   🧹 Checking ${cleaningLadies.length} cleaning lad${cleaningLadies.length === 1 ? 'y' : 'ies'} for Payables and Net Salary kontos...`);

      for (const user of cleaningLadies) {
        const userName = `${user.fname} ${user.lname}`;

        try {
          // Check Payables konto (20X)
          const payablesKonto = await Konto.findOne({
            employeeId: user._id,
            type: 'liability',
            code: /^20/
          });

          if (!payablesKonto) {
            try {
              const created = await this._createCleaningLadyKonto(user._id, userName, 'payables');
              console.log(`      ✅ Created Payables konto ${created.code} for ${userName}`);
              syncedCount++;
            } catch (payablesError) {
              const errorMsg = `Failed to create Payables konto for ${userName}: ${payablesError.message}`;
              console.error(`      ⚠️  ${errorMsg}`);
              errors.push(errorMsg);
            }
          }

          // Check Net Salary konto (75X) - independent of Payables
          const netSalaryKonto = await Konto.findOne({
            employeeId: user._id,
            type: 'expense',
            code: /^75/
          });

          if (!netSalaryKonto) {
            try {
              const created = await this._createCleaningLadyKonto(user._id, userName, 'net_salary');
              console.log(`      ✅ Created Net Salary konto ${created.code} for ${userName}`);
              syncedCount++;
            } catch (salaryError) {
              const errorMsg = `Failed to create Net Salary konto for ${userName}: ${salaryError.message}`;
              console.error(`      ⚠️  ${errorMsg}`);
              errors.push(errorMsg);
            }
          }
        } catch (userError) {
          const errorMsg = `Error syncing kontos for cleaning lady ${userName}: ${userError.message}`;
          console.error(`      ⚠️  ${errorMsg}`);
          errors.push(errorMsg);
        }
      }
    } catch (error) {
      const errorMsg = `Fatal error during cleaning lady kontos sync: ${error.message}`;
      console.error(`   ❌ ${errorMsg}`);
      errors.push(errorMsg);
    }

    return { syncedCount, errors };
  }

  /**
   * Sync user kontos - ensure all users have required kontos
   * This is a backup/healing function that runs during seed to fix any missing kontos
   *
   * @returns {Object} { syncedCount, errors }
   */
  async syncUserKontos() {
    console.log(`\n👥 Syncing user kontos...`);

    let totalSyncedCount = 0;
    const allErrors = [];

    // Sync Cash Registers
    const cashRegisterResult = await this._syncCashRegisters();
    totalSyncedCount += cashRegisterResult.syncedCount;
    allErrors.push(...cashRegisterResult.errors);

    // Sync CLEANING_LADY kontos
    const cleaningLadyResult = await this._syncCleaningLadyKontos();
    totalSyncedCount += cleaningLadyResult.syncedCount;
    allErrors.push(...cleaningLadyResult.errors);

    if (totalSyncedCount > 0) {
      console.log(`✅ Synced ${totalSyncedCount} user konto(s)`);
    } else {
      console.log(`✅ All user kontos are in sync`);
    }

    if (allErrors.length > 0) {
      console.warn(`⚠️  ${allErrors.length} error(s) occurred during user kontos sync`);
    }

    return { syncedCount: totalSyncedCount, errors: allErrors };
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
