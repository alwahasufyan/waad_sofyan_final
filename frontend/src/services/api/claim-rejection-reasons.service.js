import api from 'lib/api';

const BASE_URL = '/claim-rejection-reasons';
const unwrap = (res) => res.data?.data || res.data;

export const claimRejectionReasonsService = {
    getAll: async () => {
        const res = await api.get(BASE_URL);
        return unwrap(res);
    },
    create: async (reasonText) => {
        const res = await api.post(BASE_URL, { reasonText });
        return unwrap(res);
    }
};
