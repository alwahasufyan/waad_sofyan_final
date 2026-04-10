import api from 'lib/api';

const BASE_URL = '/admin/medical-reviewers';

const unwrap = (response) => response?.data?.data || response?.data;

const medicalReviewersService = {
  getMyProviders: async () => {
    const response = await api.get('/reviewers/my-providers');
    return unwrap(response);
  },

  getReviewerAssignments: async (reviewerId) => {
    const response = await api.get(`${BASE_URL}/${reviewerId}/providers`);
    return unwrap(response);
  },

  updateReviewerAssignments: async (reviewerId, providerIds = []) => {
    const response = await api.put(`${BASE_URL}/${reviewerId}/providers`, { providerIds });
    return unwrap(response);
  }
};

export default medicalReviewersService;
