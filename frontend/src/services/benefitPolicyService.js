import api from 'utils/axios';

/**
 * Benefit Policy Service
 *
 * Handles all API calls related to benefit policies (employer contracts).
 * Used for managing employer insurance contracts and their lifecycle.
 *
 * Note: BenefitPolicy is used as "Employer Contracts" in the UI.
 */
const benefitPolicyService = {
  /**
   * List all benefit policies with pagination and filtering
   * @param {Object} params - Query parameters
   * @param {number} params.page - Page number (0-based)
   * @param {number} params.size - Page size
   * @param {string} params.sortBy - Sort field
   * @param {string} params.sortDir - Sort direction (ASC/DESC)
   * @param {number} params.employerId - Filter by employer ID
   * @returns {Promise<ApiResponse<Page<BenefitPolicyResponseDto>>>}
   */
  list: async (params = {}) => {
    try {
      const response = await api.get('/benefit-policies', { params });
      return response;
    } catch (error) {
      console.error('Error fetching benefit policies:', error);
      throw error;
    }
  },

  /**
   * Get benefit policy by ID
   * @param {number} id - Policy ID
   * @returns {Promise<ApiResponse<BenefitPolicyResponseDto>>}
   */
  getById: async (id) => {
    try {
      const response = await api.get(`/benefit-policies/${id}`);
      return response;
    } catch (error) {
      console.error(`Error fetching benefit policy ${id}:`, error);
      throw error;
    }
  },

  /**
   * Get benefit policy by policy code
   * @param {string} policyCode - Policy code
   * @returns {Promise<ApiResponse<BenefitPolicyResponseDto>>}
   */
  getByCode: async (policyCode) => {
    try {
      const response = await api.get(`/benefit-policies/code/${policyCode}`);
      return response;
    } catch (error) {
      console.error(`Error fetching benefit policy by code ${policyCode}:`, error);
      throw error;
    }
  },

  /**
   * Get all benefit policies for a specific employer
   * @param {number} employerId - Employer organization ID
   * @returns {Promise<ApiResponse<BenefitPolicyResponseDto[]>>}
   */
  getByEmployer: async (employerId) => {
    try {
      const response = await api.get(`/benefit-policies/employer/${employerId}`);
      return response;
    } catch (error) {
      console.error(`Error fetching benefit policies for employer ${employerId}:`, error);
      throw error;
    }
  },

  /**
   * Get paginated benefit policies for a specific employer
   * @param {number} employerId - Employer organization ID
   * @param {Object} params - Query parameters
   * @param {number} params.page - Page number (0-based)
   * @param {number} params.size - Page size
   * @returns {Promise<ApiResponse<Page<BenefitPolicyResponseDto>>>}
   */
  getByEmployerPaged: async (employerId, params = {}) => {
    try {
      const response = await api.get(`/benefit-policies/employer/${employerId}/paged`, { params });
      return response;
    } catch (error) {
      console.error(`Error fetching paged benefit policies for employer ${employerId}:`, error);
      throw error;
    }
  },

  /**
   * Get benefit policies by status
   * @param {string} status - Policy status (DRAFT, ACTIVE, EXPIRED, SUSPENDED, CANCELLED)
   * @returns {Promise<ApiResponse<BenefitPolicyResponseDto[]>>}
   */
  getByStatus: async (status) => {
    try {
      const response = await api.get(`/benefit-policies/status/${status}`);
      return response;
    } catch (error) {
      console.error(`Error fetching benefit policies by status ${status}:`, error);
      throw error;
    }
  },

  /**
   * Get effective (currently active) policy for an employer on a specific date
   * @param {number} employerId - Employer organization ID
   * @param {string} date - Date to check (ISO format, optional - defaults to today)
   * @returns {Promise<ApiResponse<BenefitPolicyResponseDto>>}
   */
  getEffective: async (employerId, date = null) => {
    try {
      const params = { employerOrgId: employerId };
      if (date) {
        params.date = date;
      }
      const response = await api.get('/benefit-policies/effective', { params });
      return response;
    } catch (error) {
      console.error(`Error fetching effective policy for employer ${employerId}:`, error);
      throw error;
    }
  },

  /**
   * Get selector list (simplified list for dropdowns)
   * @returns {Promise<ApiResponse<BenefitPolicySelectorDto[]>>}
   */
  getSelector: async () => {
    try {
      const response = await api.get('/benefit-policies/selector');
      return response;
    } catch (error) {
      console.error('Error fetching benefit policies selector:', error);
      throw error;
    }
  },

  /**
   * Get policies expiring soon
   * @param {number} days - Number of days to check (default 30)
   * @returns {Promise<ApiResponse<BenefitPolicyResponseDto[]>>}
   */
  getExpiring: async (days = 30) => {
    try {
      const response = await api.get('/benefit-policies/expiring', { params: { days } });
      return response;
    } catch (error) {
      console.error('Error fetching expiring benefit policies:', error);
      throw error;
    }
  },

  /**
   * Create a new benefit policy
   * @param {BenefitPolicyCreateDto} data - Policy data
   * @returns {Promise<ApiResponse<BenefitPolicyResponseDto>>}
   */
  create: async (data) => {
    try {
      const response = await api.post('/benefit-policies', data);
      return response;
    } catch (error) {
      console.error('Error creating benefit policy:', error);
      throw error;
    }
  },

  /**
   * Update an existing benefit policy
   * @param {number} id - Policy ID
   * @param {BenefitPolicyUpdateDto} data - Updated policy data
   * @returns {Promise<ApiResponse<BenefitPolicyResponseDto>>}
   */
  update: async (id, data) => {
    try {
      const response = await api.put(`/benefit-policies/${id}`, data);
      return response;
    } catch (error) {
      console.error(`Error updating benefit policy ${id}:`, error);
      throw error;
    }
  },

  /**
   * Activate a benefit policy
   * @param {number} id - Policy ID
   * @returns {Promise<ApiResponse<BenefitPolicyResponseDto>>}
   */
  activate: async (id) => {
    try {
      const response = await api.post(`/benefit-policies/${id}/activate`);
      return response;
    } catch (error) {
      console.error(`Error activating benefit policy ${id}:`, error);
      throw error;
    }
  },

  /**
   * Deactivate (expire) a benefit policy
   * @param {number} id - Policy ID
   * @returns {Promise<ApiResponse<BenefitPolicyResponseDto>>}
   */
  deactivate: async (id) => {
    try {
      const response = await api.post(`/benefit-policies/${id}/deactivate`);
      return response;
    } catch (error) {
      console.error(`Error deactivating benefit policy ${id}:`, error);
      throw error;
    }
  },

  /**
   * Suspend a benefit policy temporarily
   * @param {number} id - Policy ID
   * @returns {Promise<ApiResponse<BenefitPolicyResponseDto>>}
   */
  suspend: async (id) => {
    try {
      const response = await api.post(`/benefit-policies/${id}/suspend`);
      return response;
    } catch (error) {
      console.error(`Error suspending benefit policy ${id}:`, error);
      throw error;
    }
  },

  /**
   * Cancel a benefit policy
   * @param {number} id - Policy ID
   * @returns {Promise<ApiResponse<BenefitPolicyResponseDto>>}
   */
  cancel: async (id) => {
    try {
      const response = await api.post(`/benefit-policies/${id}/cancel`);
      return response;
    } catch (error) {
      console.error(`Error cancelling benefit policy ${id}:`, error);
      throw error;
    }
  },

  /**
   * Soft delete a benefit policy
   * @param {number} id - Policy ID
   * @returns {Promise<ApiResponse<void>>}
   */
  delete: async (id) => {
    try {
      const response = await api.delete(`/benefit-policies/${id}`);
      return response;
    } catch (error) {
      console.error(`Error deleting benefit policy ${id}:`, error);
      throw error;
    }
  },

  /**
   * Auto-expire old policies (maintenance)
   * @returns {Promise<ApiResponse<number>>}
   */
  expireOldPolicies: async () => {
    try {
      const response = await api.post('/benefit-policies/maintenance/expire-old');
      return response;
    } catch (error) {
      console.error('Error expiring old policies:', error);
      throw error;
    }
  }
};

export default benefitPolicyService;
