import api from 'lib/api';

/**
 * Medical Specialties API Service
 * Provides CRUD + toggle for Medical Specialties
 * Backend: MedicalSpecialtyController.java
 */
const BASE_URL = '/medical-specialties';

const unwrap = (response) => response.data?.data ?? response.data;

/** List all active specialties (optionally filtered by categoryId) */
export const getMedicalSpecialties = async (params = {}) => {
  const response = await api.get(BASE_URL, { params });
  return unwrap(response);
};

/** List specialties for a specific category */
export const getMedicalSpecialtiesByCategory = async (categoryId) => {
  const response = await api.get(BASE_URL, { params: { categoryId } });
  return unwrap(response);
};

/** Create a new specialty */
export const createMedicalSpecialty = async (payload) => {
  const response = await api.post(BASE_URL, payload);
  return unwrap(response);
};

/** Update an existing specialty */
export const updateMedicalSpecialty = async (id, payload) => {
  const response = await api.put(`${BASE_URL}/${id}`, payload);
  return unwrap(response);
};

/** Toggle specialty active/deleted state */
export const toggleMedicalSpecialty = async (id) => {
  const response = await api.patch(`${BASE_URL}/${id}/toggle`);
  return unwrap(response);
};
