// services/CleaningService.js

const mongoose = require('mongoose');
const ApartmentCleaning = require('../models/ApartmentCleaning');
const User = require('../models/User');
const Reservation = require('../models/Reservation');
const { USER_ROLES } = require('../constants/userRoles');
const { RESERVATION_STATUSES } = require('../constants/reservationStatuses');

class CleaningService {

  /**
   * Create a new cleaning assignment
   * Only OWNER/MANAGER can create
   *
   * @param {Object} cleaningData
   * @param {ObjectId} cleaningData.reservationId - Reservation ID
   * @param {ObjectId} cleaningData.apartmentId - Apartment ID
   * @param {ObjectId} cleaningData.assignedTo - User ID to assign (CLEANING_LADY role)
   * @param {ObjectId} cleaningData.assignedBy - User ID who is assigning
   * @param {Date} cleaningData.scheduledStartTime - When cleaning should start
   * @param {Number} cleaningData.hourlyRate - Optional hourly rate (defaults to config)
   * @param {String} cleaningData.notes - Optional notes
   * @returns {Object} Created cleaning
   */
  async createCleaning(cleaningData) {
    const {
      reservationId,
      apartmentId,
      assignedTo,
      assignedBy,
      scheduledStartTime,
      hourlyRate,
      notes
    } = cleaningData;

    // Validate required fields
    if (!reservationId || !apartmentId || !assignedTo || !assignedBy || !scheduledStartTime) {
      throw new Error('Missing required fields: reservationId, apartmentId, assignedTo, assignedBy, scheduledStartTime');
    }

    // Validate reservation exists
    const reservation = await Reservation.findById(reservationId);
    if (!reservation) {
      throw new Error('Reservation not found');
    }

    // Cannot create cleaning for non-active reservations (noshow or canceled)
    if (reservation.status === RESERVATION_STATUSES.NO_SHOW || reservation.status === RESERVATION_STATUSES.CANCELED) {
      throw new Error('Cannot create cleaning for no-show or canceled reservations');
    }

    // Validate assigned user exists
    const assignedUser = await User.findById(assignedTo).populate('role');
    if (!assignedUser) {
      throw new Error('Assigned user not found');
    }

    // Validate assignedBy user exists
    const assigningUser = await User.findById(assignedBy).populate('role');
    if (!assigningUser) {
      throw new Error('Assigning user not found');
    }

    // Create cleaning data object
    const cleaningToCreate = {
      reservationId,
      apartmentId,
      assignedTo,
      assignedBy,
      scheduledStartTime,
      status: 'scheduled',
      notes
    };

    if (hourlyRate !== undefined) {
      cleaningToCreate.hourlyRate = hourlyRate;
    }

    const cleaning = await ApartmentCleaning.create(cleaningToCreate);

    // Populate and return
    return await ApartmentCleaning.findById(cleaning._id)
      .populate('reservationId', '_id status plannedCheckIn plannedCheckOut plannedCheckoutTime')
      .populate('apartmentId', '_id name')
      .populate('assignedTo', 'fname lname role')
      .populate('assignedBy', 'fname lname')
      .populate('completedBy', 'fname lname');
  }

  /**
   * Update a scheduled cleaning
   * Only OWNER/MANAGER can update
   * Can only update scheduled cleanings (not completed or cancelled)
   * If changing status to cancelled, no other fields can be updated
   *
   * @param {ObjectId} cleaningId - Cleaning ID
   * @param {Object} updateData - Fields to update
   * @param {ObjectId} updatedBy - User ID performing the update
   * @returns {Object} Updated cleaning
   */
  async updateCleaning(cleaningId, updateData, updatedBy) {
    const cleaning = await ApartmentCleaning.findById(cleaningId);

    if (!cleaning) {
      throw new Error('Cleaning not found');
    }

    // Cannot update cancelled cleanings
    if (cleaning.status === 'cancelled') {
      throw new Error('Cannot update cancelled cleaning');
    }

    // Can only update scheduled cleanings
    if (cleaning.status !== 'scheduled') {
      throw new Error('Can only update scheduled cleanings');
    }

    // If changing status to cancelled, no other fields can be updated
    if (updateData.status === 'cancelled') {
      const otherFields = Object.keys(updateData).filter(key => key !== 'status');
      if (otherFields.length > 0) {
        throw new Error('When cancelling, cannot update other fields simultaneously');
      }
      cleaning.status = 'cancelled';
      await cleaning.save();

      // Populate and return
      return await ApartmentCleaning.findById(cleaning._id)
        .populate('reservationId', '_id status plannedCheckIn plannedCheckOut plannedCheckoutTime')
        .populate('apartmentId', '_id name')
        .populate('assignedTo', 'fname lname role')
        .populate('assignedBy', 'fname lname')
        .populate('completedBy', 'fname lname');
    }

    // Update allowed fields
    const allowedFields = ['assignedTo', 'scheduledStartTime', 'hourlyRate', 'notes'];

    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        cleaning[field] = updateData[field];
      }
    }

    // If assignedTo changed, update assignedBy
    if (updateData.assignedTo && updateData.assignedTo.toString() !== cleaning.assignedTo.toString()) {
      cleaning.assignedBy = updatedBy;
    }

    await cleaning.save();

    // Populate and return
    return await ApartmentCleaning.findById(cleaning._id)
      .populate('reservationId', '_id status plannedCheckIn plannedCheckOut plannedCheckoutTime')
      .populate('apartmentId', '_id name')
      .populate('assignedTo', 'fname lname role')
      .populate('assignedBy', 'fname lname')
      .populate('completedBy', 'fname lname');
  }

  /**
   * Complete a cleaning
   * CLEANING_LADY can complete own assignments
   * OWNER/MANAGER can complete any cleaning and set any CLEANING_LADY as completedBy
   * Creates accounting transactions (expense + liability) atomically
   *
   * @param {ObjectId} cleaningId - Cleaning ID
   * @param {Object} completionData
   * @param {Number} completionData.hoursSpent - Hours spent on cleaning
   * @param {ObjectId} completionData.completedBy - User ID completing (must be CLEANING_LADY)
   * @param {Date} completionData.actualEndTime - When cleaning ended
   * @param {String} completionData.notes - Optional notes
   * @param {ObjectId} requestingUserId - User ID making the request (can be OWNER/MANAGER/CLEANING_LADY)
   * @returns {Object} Populated cleaning document
   */
  async completeCleaning(cleaningId, completionData, requestingUserId) {
    const { hoursSpent, completedBy, actualEndTime, notes } = completionData;

    // Validations (before starting transaction)
    if (!hoursSpent || hoursSpent <= 0) {
      throw new Error('Hours spent must be greater than 0');
    }

    if (!completedBy) {
      throw new Error('completedBy is required');
    }

    if (!actualEndTime) {
      throw new Error('actualEndTime is required');
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Load and validate cleaning
      const cleaning = await ApartmentCleaning.findById(cleaningId)
        .populate('reservationId')
        .populate('apartmentId')
        .session(session);

      if (!cleaning) {
        throw new Error('Cleaning not found');
      }

      // Can only complete scheduled cleanings
      if (cleaning.status !== 'scheduled') {
        throw new Error('Can only complete scheduled cleanings');
      }

      // 2. Validate completedBy user exists and has CLEANING_LADY role
      const completedByUser = await User.findById(completedBy).populate('role').session(session);
      if (!completedByUser) {
        throw new Error('Completed by user not found');
      }

      if (completedByUser.role.name !== USER_ROLES.CLEANING_LADY) {
        throw new Error('completedBy must be a user with CLEANING_LADY role');
      }

      // 3. Validate requesting user
      const requestingUser = await User.findById(requestingUserId).populate('role').session(session);
      if (!requestingUser) {
        throw new Error('Requesting user not found');
      }

      // Permission check: CLEANING_LADY can only complete own assignments
      if (requestingUser.role.name === USER_ROLES.CLEANING_LADY) {
        if (requestingUserId.toString() !== cleaning.assignedTo.toString()) {
          throw new Error('Cleaning lady can only complete own assignments');
        }
        // For CLEANING_LADY, completedBy must be themselves
        if (completedBy.toString() !== requestingUserId.toString()) {
          throw new Error('Cleaning lady must set completedBy to themselves');
        }
      }

      // 4. Update cleaning
      cleaning.status = 'completed';
      cleaning.actualEndTime = actualEndTime;
      cleaning.completedBy = completedBy;
      cleaning.hoursSpent = hoursSpent;
      cleaning.totalCost = cleaning.hourlyRate * hoursSpent;

      if (notes) {
        cleaning.notes = notes;
      }

      await cleaning.save({ session });

      // 5. Find cleaning lady's kontos (for completedBy user, not requesting user!)
      const Konto = require('../models/konto/Konto');

      const payablesKonto = await Konto.findOne({
        employeeId: completedBy,  // Use completedBy (the cleaning lady)
        type: 'liability',
        code: /^20/,
        isActive: true
      }).session(session);

      if (!payablesKonto) {
        throw new Error(`Payables konto not found for cleaning lady ${completedByUser.fname} ${completedByUser.lname} (ID: ${completedBy})`);
      }

      const netSalaryKonto = await Konto.findOne({
        employeeId: completedBy,  // Use completedBy (the cleaning lady)
        type: 'expense',
        code: /^75/,
        isActive: true
      }).session(session);

      if (!netSalaryKonto) {
        throw new Error(`Net Salary konto not found for cleaning lady ${completedByUser.fname} ${completedByUser.lname} (ID: ${completedBy})`);
      }

      // 6. Create accounting transactions
      const TransactionService = require('./accounting/TransactionService');

      await TransactionService.createCleaningCompletionTransactions({
        cleaning,
        netSalaryKonto,
        payablesKonto,
        apartmentName: cleaning.apartmentId.name,
        reservationCheckIn: cleaning.reservationId.plannedCheckIn,
        reservationCheckOut: cleaning.reservationId.plannedCheckOut,
        session
      });

      // 7. Commit transaction
      await session.commitTransaction();

      // 8. Populate and return
      const populatedCleaning = await ApartmentCleaning.findById(cleaning._id)
        .populate('reservationId', '_id status plannedCheckIn plannedCheckOut plannedCheckoutTime')
        .populate('apartmentId', '_id name')
        .populate('assignedTo', 'fname lname role')
        .populate('assignedBy', 'fname lname')
        .populate('completedBy', 'fname lname');

      return populatedCleaning;

    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Cancel a completed cleaning
   * Only OWNER/MANAGER can cancel completed cleanings
   * Reverses accounting transactions (expense + liability) atomically
   *
   * @param {ObjectId} cleaningId - Cleaning ID
   * @param {ObjectId} cancelledBy - User ID who is cancelling
   * @returns {Object} Populated cleaning document
   */
  async cancelCompletedCleaning(cleaningId, cancelledBy) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Load and validate cleaning
      const cleaning = await ApartmentCleaning.findById(cleaningId)
        .populate('reservationId')
        .populate('apartmentId')
        .populate('completedBy')
        .session(session);

      if (!cleaning) {
        throw new Error('Cleaning not found');
      }

      // Can only cancel completed cleanings
      if (cleaning.status !== 'completed') {
        throw new Error('Can only cancel completed cleanings');
      }

      // 2. Find original transactions
      const TransactionService = require('./accounting/TransactionService');
      const originalTransactions = await TransactionService.getTransactionsByCleaning(cleaningId);

      if (!originalTransactions || originalTransactions.length === 0) {
        throw new Error('Cannot cancel cleaning: no original transactions found');
      }

      // 3. Find cleaning lady's kontos (completedBy is the cleaning lady)
      const Konto = require('../models/konto/Konto');

      const payablesKonto = await Konto.findOne({
        employeeId: cleaning.completedBy._id,
        type: 'liability',
        code: /^20/,
        isActive: true
      }).session(session);

      if (!payablesKonto) {
        throw new Error(`Payables konto not found for cleaning lady ${cleaning.completedBy.fname} ${cleaning.completedBy.lname}`);
      }

      const netSalaryKonto = await Konto.findOne({
        employeeId: cleaning.completedBy._id,
        type: 'expense',
        code: /^75/,
        isActive: true
      }).session(session);

      if (!netSalaryKonto) {
        throw new Error(`Net Salary konto not found for cleaning lady ${cleaning.completedBy.fname} ${cleaning.completedBy.lname}`);
      }

      // 4. Create reversal transactions
      await TransactionService.createCleaningCancellationTransactions({
        cleaning,
        originalTransactions,
        netSalaryKonto,
        payablesKonto,
        apartmentName: cleaning.apartmentId.name,
        reservationCheckIn: cleaning.reservationId.plannedCheckIn,
        reservationCheckOut: cleaning.reservationId.plannedCheckOut,
        cancelledBy,
        session
      });

      // 5. Update cleaning status
      cleaning.status = 'cancelled';
      await cleaning.save({ session });

      // 6. Commit transaction
      await session.commitTransaction();

      // 7. Populate and return
      const populatedCleaning = await ApartmentCleaning.findById(cleaning._id)
        .populate('reservationId', '_id status plannedCheckIn plannedCheckOut plannedCheckoutTime')
        .populate('apartmentId', '_id name')
        .populate('assignedTo', 'fname lname role')
        .populate('assignedBy', 'fname lname')
        .populate('completedBy', 'fname lname');

      return populatedCleaning;

    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Get cleaning by ID
   *
   * @param {ObjectId} cleaningId
   * @returns {Object} Cleaning
   */
  async getCleaningById(cleaningId) {
    const cleaning = await ApartmentCleaning.findById(cleaningId)
      .populate('reservationId', '_id status plannedCheckIn plannedCheckOut plannedCheckoutTime')
      .populate('apartmentId', '_id name')
      .populate('assignedTo', 'fname lname role')
      .populate('assignedBy', 'fname lname')
      .populate('completedBy', 'fname lname');

    if (!cleaning) {
      throw new Error('Cleaning not found');
    }

    return cleaning;
  }

  /**
   * Get cleanings with filters
   *
   * @param {Object} filters
   * @param {ObjectId} filters.reservationId - Filter by reservation
   * @param {ObjectId} filters.apartmentId - Filter by apartment
   * @param {ObjectId} filters.assignedTo - Filter by assigned user
   * @param {String} filters.status - Filter by status (scheduled, completed, cancelled)
   * @param {Date} filters.startDate - Filter by scheduledStartTime >= startDate
   * @param {Date} filters.endDate - Filter by scheduledStartTime <= endDate
   * @returns {Array} Cleanings
   */
  async getCleanings(filters = {}) {
    const query = {};

    if (filters.reservationId) {
      query.reservationId = filters.reservationId;
    }

    if (filters.apartmentId) {
      query.apartmentId = filters.apartmentId;
    }

    if (filters.assignedTo) {
      query.assignedTo = filters.assignedTo;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.startDate || filters.endDate) {
      query.scheduledStartTime = {};
      if (filters.startDate) {
        query.scheduledStartTime.$gte = filters.startDate;
      }
      if (filters.endDate) {
        query.scheduledStartTime.$lte = filters.endDate;
      }
    }

    const cleanings = await ApartmentCleaning.find(query)
      .populate('reservationId', '_id status plannedCheckIn plannedCheckOut plannedCheckoutTime')
      .populate('apartmentId', '_id name')
      .populate('assignedTo', 'fname lname role')
      .populate('assignedBy', 'fname lname')
      .populate('completedBy', 'fname lname')
      .sort({ scheduledStartTime: -1 });

    return cleanings;
  }

  /**
   * Check if checkout time is late (after 11:00)
   * @param {String} checkoutTime - "HH:MM" format
   * @returns {Boolean} True if checkout is after 11:00
   */
  isLateCheckout(checkoutTime) {
    const DEFAULT_CHECKOUT = "11:00";
    const checkout = checkoutTime || DEFAULT_CHECKOUT;

    const [hours, minutes] = checkout.split(':').map(Number);
    const checkoutMinutes = hours * 60 + minutes;
    const defaultMinutes = 11 * 60; // 11:00

    return checkoutMinutes > defaultMinutes;
  }

  /**
   * Check if checkin time is early (before 14:00)
   * @param {String} checkinTime - "HH:MM" format
   * @returns {Boolean} True if checkin is before 14:00
   */
  isEarlyCheckin(checkinTime) {
    const DEFAULT_CHECKIN = "14:00";
    const checkin = checkinTime || DEFAULT_CHECKIN;

    const [hours, minutes] = checkin.split(':').map(Number);
    const checkinMinutes = hours * 60 + minutes;
    const defaultMinutes = 14 * 60; // 14:00

    return checkinMinutes < defaultMinutes;
  }

  /**
   * Format duration in minutes to human-readable string
   * @param {Number} minutes - Duration in minutes
   * @returns {String} Formatted duration (e.g., "3h", "2h 30min", "45 min")
   */
  formatDuration(minutes) {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  }

  /**
   * Calculate cleaning window between checkout and checkin
   * @param {String} checkoutTime - "HH:MM" format
   * @param {String} checkinTime - "HH:MM" format
   * @returns {Object} Cleaning window details
   */
  calculateCleaningWindow(checkoutTime, checkinTime, hasNextReservation = true) {
    const DEFAULT_CHECKOUT = "11:00";
    const DEFAULT_CHECKIN = "14:00";
    const END_OF_DAY = "23:59";
    const CRITICAL_THRESHOLD = 120; // minutes

    const checkout = checkoutTime || DEFAULT_CHECKOUT;

    // If no next reservation, use end of day instead of default checkin time
    const checkin = hasNextReservation
      ? (checkinTime || DEFAULT_CHECKIN)
      : END_OF_DAY;

    // Parse times
    const [ch, cm] = checkout.split(':').map(Number);
    const [cih, cim] = checkin.split(':').map(Number);

    // Calculate duration in minutes
    const checkoutMinutes = ch * 60 + cm;
    const checkinMinutes = cih * 60 + cim;
    const diffMinutes = checkinMinutes - checkoutMinutes;

    // Handle edge case: checkin before checkout (data error)
    if (diffMinutes < 0) {
      return {
        startTime: checkout,
        endTime: checkin,
        durationMinutes: diffMinutes,
        durationFormatted: this.formatDuration(Math.abs(diffMinutes)),
        isCritical: true,
        isInvalid: true
      };
    }

    return {
      startTime: checkout,
      endTime: checkin,
      durationMinutes: diffMinutes,
      durationFormatted: this.formatDuration(diffMinutes),
      isCritical: diffMinutes < CRITICAL_THRESHOLD,
      isInvalid: false
    };
  }

  /**
   * Get tomorrow's checkouts aggregated with checkins and scheduled cleanings
   * For dashboard visualization
   * @returns {Array} Aggregated apartment data
   */
  async getTomorrowCheckoutsForDashboard() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    // 1. Find all active checkouts for tomorrow - select only needed fields
    const checkoutReservations = await Reservation.find({
      status: 'active',
      plannedCheckOut: { $gte: tomorrow, $lt: dayAfterTomorrow }
    })
      .select('_id apartment plannedCheckIn plannedCheckOut plannedCheckoutTime guest')
      .populate('apartment', 'name') // Only apartment name
      .populate('guest', 'fname lname contactPhone') // Only guest basic info
      .sort({ 'apartment.name': 1 });

    if (checkoutReservations.length === 0) {
      return []; // No checkouts tomorrow
    }

    // 2. Extract apartment IDs
    const apartmentIds = checkoutReservations.map(r => r.apartment._id);

    // 3. Find check-ins for same apartments on same date - select only needed fields
    const checkinReservations = await Reservation.find({
      status: 'active',
      plannedCheckIn: { $gte: tomorrow, $lt: dayAfterTomorrow },
      apartment: { $in: apartmentIds }
    })
      .select('_id apartment plannedCheckIn plannedArrivalTime guest')
      .populate('guest', 'fname lname'); // Only guest name for checkin

    // 4. Find scheduled cleanings for tomorrow
    const scheduledCleanings = await ApartmentCleaning.find({
      status: 'scheduled',
      apartmentId: { $in: apartmentIds },
      scheduledStartTime: { $gte: tomorrow, $lt: dayAfterTomorrow }
    }).populate('assignedTo', 'fname lname');

    // 5. Aggregate by apartment
    return checkoutReservations.map(checkout => {
      const aptId = checkout.apartment._id.toString();

      const checkin = checkinReservations.find(
        c => c.apartment._id.toString() === aptId
      );

      const aptCleanings = scheduledCleanings.filter(
        cl => cl.apartmentId.toString() === aptId
      );

      const cleaningWindow = this.calculateCleaningWindow(
        checkout.plannedCheckoutTime,
        checkin?.plannedArrivalTime,
        !!checkin // hasNextReservation = true if checkin exists, false otherwise
      );

      const isLateCheckout = this.isLateCheckout(checkout.plannedCheckoutTime);
      const isEarlyCheckin = checkin ? this.isEarlyCheckin(checkin.plannedArrivalTime) : false;

      return {
        apartment: {
          _id: checkout.apartment._id,
          name: checkout.apartment.name
        },
        checkoutReservation: {
          _id: checkout._id,
          plannedCheckIn: checkout.plannedCheckIn,
          plannedCheckOut: checkout.plannedCheckOut,
          plannedCheckoutTime: checkout.plannedCheckoutTime,
          guest: checkout.guest ? {
            fname: checkout.guest.fname,
            lname: checkout.guest.lname,
            contactPhone: checkout.guest.contactPhone
          } : null
        },
        checkinReservation: checkin ? {
          _id: checkin._id,
          plannedCheckIn: checkin.plannedCheckIn,
          plannedArrivalTime: checkin.plannedArrivalTime,
          guest: checkin.guest ? {
            fname: checkin.guest.fname,
            lname: checkin.guest.lname
          } : null
        } : null,
        scheduledCleanings: aptCleanings,
        cleaningWindow,
        isLateCheckout,
        isEarlyCheckin
      };
    });
  }
}

module.exports = new CleaningService();
