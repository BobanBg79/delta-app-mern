// client/src/modules/accounting/kontoOperations.js
import axios from 'axios';

const API_URL = '/api/accounting/konto';

/**
 * Get all kontos
 * @param {boolean} includeInactive - Include deactivated kontos
 * @returns {Promise} Array of kontos
 */
export const getAllKontos = async (includeInactive = false) => {
  try {
    const params = includeInactive ? { includeInactive: 'true' } : {};
    const response = await axios.get(API_URL, { params });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

/**
 * Get konto by code
 * @param {string} code - Konto code
 * @returns {Promise} Konto object
 */
export const getKontoByCode = async (code) => {
  try {
    const response = await axios.get(`${API_URL}/${code}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

/**
 * Create cash register for user
 * @param {string} userId - User ID
 * @returns {Promise} Created konto
 */
export const createCashRegister = async (userId) => {
  try {
    const response = await axios.post(`${API_URL}/cash-register`, { userId });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

/**
 * Create custom konto
 * @param {Object} kontoData - Konto data
 * @returns {Promise} Created konto
 */
export const createKonto = async (kontoData) => {
  try {
    const response = await axios.post(API_URL, kontoData);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

/**
 * Get transactions for a konto
 * @param {string} code - Konto code
 * @param {number} limit - Max number of transactions to return
 * @param {number} offset - Number of transactions to skip
 * @returns {Promise} Transactions data
 */
export const getKontoTransactions = async (code, limit = 50, offset = 0) => {
  try {
    const params = { limit, offset };
    const response = await axios.get(`${API_URL}/${code}/transactions`, { params });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

/**
 * Deactivate konto
 * @param {string} code - Konto code
 * @returns {Promise} Deactivated konto
 */
export const deactivateKonto = async (code) => {
  try {
    const response = await axios.patch(`${API_URL}/${code}/deactivate`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};
