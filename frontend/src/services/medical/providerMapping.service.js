/**
 * Provider Mapping Center API Service
 * Backend: /api/v1/provider-mapping
 */
import axiosClient from 'utils/axios';

const BASE = '/provider-mapping';

export const providerMappingService = {
  /**
   * GET /raw?providerId=X&status=PENDING
   * Returns raw services for a provider filtered by status.
   */
  getRawServices: async (providerId, status = 'PENDING') => {
    const response = await axiosClient.get(`${BASE}/raw`, {
      params: { providerId, status }
    });
    return response.data?.data ?? [];
  },

  /**
   * POST /auto-match/{rawId}
   */
  autoMatch: async (rawId) => {
    const response = await axiosClient.post(`${BASE}/auto-match/${rawId}`);
    return response.data?.data;
  },

  /**
   * POST /manual-map
   * Body: { rawId, medicalServiceId }
   */
  manualMap: async (rawId, medicalServiceId) => {
    const response = await axiosClient.post(`${BASE}/manual-map`, {
      rawId,
      medicalServiceId
    });
    return response.data?.data;
  },

  /**
   * POST /reject/{rawId}
   */
  reject: async (rawId) => {
    const response = await axiosClient.post(`${BASE}/reject/${rawId}`);
    return response.data?.data;
  }
};

export default providerMappingService;
