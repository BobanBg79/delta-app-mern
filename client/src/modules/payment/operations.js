// client/src/modules/payment/operations.js
import axios from 'axios';

const API_URL = '/api/payments';

/**
 * Create a cash payment for a reservation
 * @param {Object} paymentData
 * @param {string} paymentData.reservationId - Reservation ID
 * @param {number} paymentData.amount - Payment amount
 * @param {string} paymentData.transactionDate - Date of payment (ISO format)
 * @param {string} paymentData.note - Optional note
 * @param {string} paymentData.documentNumber - Optional document number
 * @returns {Promise} Payment response
 */
export const createCashPayment = async (paymentData) => {
  try {
    const response = await axios.post(API_URL, paymentData);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

/**
 * Get all payments for a reservation
 * @param {string} reservationId
 * @returns {Promise} Array of payments
 */
export const getPaymentsByReservation = async (reservationId) => {
  try {
    const response = await axios.get(`${API_URL}/reservation/${reservationId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

/**
 * Get transactions for a payment
 * @param {string} paymentId
 * @returns {Promise} Array of transactions
 */
export const getPaymentTransactions = async (paymentId) => {
  try {
    const response = await axios.get(`${API_URL}/${paymentId}/transactions`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};
