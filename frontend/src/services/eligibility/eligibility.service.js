/**
 * Family Eligibility API Service
 * Handles eligibility checks for members and their families
 */

import api from 'lib/api';

const BASE_URL = '/eligibility';

export const eligibilityService = {
  /**
   * Check eligibility for a single member
   */
  checkEligibility: (data) => {
    return api.post(`${BASE_URL}/check`, data);
  },

  /**
   * Check eligibility for a member and all family members
   * @param {number} memberId - Member ID
   * @param {string} serviceDate - Optional service date (YYYY-MM-DD)
   */
  checkFamilyEligibility: (memberId, serviceDate = null) => {
    const params = serviceDate ? { serviceDate } : {};
    return api.get(`${BASE_URL}/family/${memberId}`, { params });
  },

  /**
   * Get eligibility check logs
   */
  getLogs: (params = {}) => {
    return api.get(`${BASE_URL}/logs`, { params });
  },

  /**
   * Get specific eligibility check by request ID
   */
  getLogByRequestId: (requestId) => {
    return api.get(`${BASE_URL}/logs/${requestId}`);
  },

  /**
   * Get active eligibility rules
   */
  getActiveRules: () => {
    return api.get(`${BASE_URL}/rules`);
  },

  /**
   * Health check
   */
  healthCheck: () => {
    return api.get(`${BASE_URL}/health`);
  }
};

export default eligibilityService;
