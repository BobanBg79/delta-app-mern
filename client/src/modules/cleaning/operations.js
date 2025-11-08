import axios from 'axios';

/**
 * Create a new cleaning assignment
 * @param {Object} cleaningData
 * @param {string} cleaningData.reservationId - Reservation ID (required)
 * @param {string} cleaningData.apartmentId - Apartment ID (required)
 * @param {string} cleaningData.assignedTo - User ID of cleaning lady (required)
 * @param {string|Date} cleaningData.scheduledStartTime - When cleaning should start (required)
 * @param {number} cleaningData.hourlyRate - Hourly rate (optional, defaults to 5)
 * @param {string} cleaningData.notes - Additional notes (optional)
 * @returns {Promise<Object>} Created cleaning object
 */
export const createCleaning = async (cleaningData) => {
  try {
    const transformedData = {
      ...cleaningData,
      scheduledStartTime: cleaningData.scheduledStartTime
        ? new Date(cleaningData.scheduledStartTime).toISOString()
        : null,
    };

    // Remove empty fields
    if (transformedData.notes === '') {
      delete transformedData.notes;
    }

    const response = await axios.post('/api/apartment-cleanings', transformedData);
    return response.data;
  } catch (error) {
    const errorMessage = error.response?.data?.errors?.[0]?.msg || error.response?.data?.msg || 'Failed to create cleaning';
    throw new Error(errorMessage);
  }
};

/**
 * Update a scheduled cleaning
 * @param {string} cleaningId - Cleaning ID
 * @param {Object} updateData
 * @param {string} updateData.assignedTo - User ID of cleaning lady (optional)
 * @param {string|Date} updateData.scheduledStartTime - When cleaning should start (optional)
 * @param {number} updateData.hourlyRate - Hourly rate (optional)
 * @param {string} updateData.notes - Additional notes (optional)
 * @returns {Promise<Object>} Updated cleaning object
 */
export const updateCleaning = async (cleaningId, updateData) => {
  try {
    const transformedData = { ...updateData };

    if (updateData.scheduledStartTime) {
      transformedData.scheduledStartTime = new Date(updateData.scheduledStartTime).toISOString();
    }

    // Remove empty fields
    if (transformedData.notes === '') {
      delete transformedData.notes;
    }

    const response = await axios.put(`/api/apartment-cleanings/${cleaningId}`, transformedData);
    return response.data;
  } catch (error) {
    const errorMessage = error.response?.data?.errors?.[0]?.msg || error.response?.data?.msg || 'Failed to update cleaning';
    throw new Error(errorMessage);
  }
};

/**
 * Cancel a scheduled cleaning
 * @param {string} cleaningId - Cleaning ID
 * @returns {Promise<Object>} Cancelled cleaning object
 */
export const cancelScheduledCleaning = async (cleaningId) => {
  try {
    const response = await axios.put(`/api/apartment-cleanings/${cleaningId}`, {
      status: 'cancelled',
    });
    return response.data;
  } catch (error) {
    const errorMessage = error.response?.data?.errors?.[0]?.msg || error.response?.data?.msg || 'Failed to cancel cleaning';
    throw new Error(errorMessage);
  }
};

/**
 * Complete a cleaning
 * @param {string} cleaningId - Cleaning ID
 * @param {Object} completionData
 * @param {number} completionData.hoursSpent - Hours spent on cleaning (required, > 0)
 * @param {string} completionData.completedBy - User ID who completed (required, must be CLEANING_LADY)
 * @param {string|Date} completionData.actualEndTime - When cleaning ended (required)
 * @param {string} completionData.notes - Additional notes (optional)
 * @returns {Promise<Object>} Completed cleaning object
 */
export const completeCleaning = async (cleaningId, completionData) => {
  try {
    const transformedData = {
      ...completionData,
      actualEndTime: completionData.actualEndTime
        ? new Date(completionData.actualEndTime).toISOString()
        : null,
    };

    // Remove empty fields
    if (transformedData.notes === '') {
      delete transformedData.notes;
    }

    const response = await axios.post(`/api/apartment-cleanings/${cleaningId}/complete`, transformedData);
    return response.data;
  } catch (error) {
    const errorMessage = error.response?.data?.errors?.[0]?.msg || error.response?.data?.msg || 'Failed to complete cleaning';
    throw new Error(errorMessage);
  }
};

/**
 * Cancel a completed cleaning (deactivation)
 * @param {string} cleaningId - Cleaning ID
 * @returns {Promise<Object>} Cancelled cleaning object
 */
export const cancelCompletedCleaning = async (cleaningId) => {
  try {
    const response = await axios.post(`/api/apartment-cleanings/${cleaningId}/cancel-completed`);
    return response.data;
  } catch (error) {
    const errorMessage = error.response?.data?.errors?.[0]?.msg || error.response?.data?.msg || 'Failed to cancel completed cleaning';
    throw new Error(errorMessage);
  }
};

/**
 * Get cleaning by ID
 * @param {string} cleaningId - Cleaning ID
 * @returns {Promise<Object>} Cleaning object
 */
export const getCleaningById = async (cleaningId) => {
  try {
    const response = await axios.get(`/api/apartment-cleanings/${cleaningId}`);
    return response.data;
  } catch (error) {
    const errorMessage = error.response?.data?.errors?.[0]?.msg || error.response?.data?.msg || 'Failed to fetch cleaning';
    throw new Error(errorMessage);
  }
};

/**
 * Get cleanings with filters
 * @param {Object} filters
 * @param {string} filters.reservationId - Filter by reservation (optional)
 * @param {string} filters.apartmentId - Filter by apartment (optional)
 * @param {string} filters.assignedTo - Filter by assigned cleaning lady (optional)
 * @param {string} filters.status - Filter by status: scheduled, completed, cancelled (optional)
 * @param {string|Date} filters.startDate - Filter by scheduledStartTime >= startDate (optional)
 * @param {string|Date} filters.endDate - Filter by scheduledStartTime <= endDate (optional)
 * @returns {Promise<Array>} Array of cleaning objects
 */
export const getCleanings = async (filters = {}) => {
  try {
    const params = {};

    if (filters.reservationId) {
      params.reservationId = filters.reservationId;
    }

    if (filters.apartmentId) {
      params.apartmentId = filters.apartmentId;
    }

    if (filters.assignedTo) {
      params.assignedTo = filters.assignedTo;
    }

    if (filters.status) {
      params.status = filters.status;
    }

    if (filters.startDate) {
      params.startDate = new Date(filters.startDate).toISOString();
    }

    if (filters.endDate) {
      params.endDate = new Date(filters.endDate).toISOString();
    }

    const response = await axios.get('/api/apartment-cleanings', { params });
    return response.data.cleanings || [];
  } catch (error) {
    const errorMessage = error.response?.data?.errors?.[0]?.msg || error.response?.data?.msg || 'Failed to fetch cleanings';
    throw new Error(errorMessage);
  }
};

/**
 * Get cleanings for a specific reservation
 * @param {string} reservationId - Reservation ID
 * @returns {Promise<Array>} Array of cleaning objects for the reservation
 */
export const getCleaningsByReservation = async (reservationId) => {
  try {
    const response = await axios.get('/api/apartment-cleanings', {
      params: { reservationId }
    });
    return response.data.cleanings || [];
  } catch (error) {
    const errorMessage = error.response?.data?.errors?.[0]?.msg || error.response?.data?.msg || 'Failed to fetch cleanings for reservation';
    throw new Error(errorMessage);
  }
};

/**
 * Get report of tomorrow's checkouts (for scheduling cleanings)
 * @returns {Promise<Array>} Array of reservations with checkouts tomorrow
 */
export const getTomorrowCheckouts = async () => {
  try {
    const response = await axios.get('/api/apartment-cleanings/reports/tomorrow-checkouts');
    return response.data;
  } catch (error) {
    const errorMessage = error.response?.data?.errors?.[0]?.msg || error.response?.data?.msg || 'Failed to fetch tomorrow checkouts';
    throw new Error(errorMessage);
  }
};

const cleaningOperations = {
  createCleaning,
  updateCleaning,
  cancelScheduledCleaning,
  completeCleaning,
  cancelCompletedCleaning,
  getCleaningById,
  getCleanings,
  getCleaningsByReservation,
  getTomorrowCheckouts,
};

export default cleaningOperations;
