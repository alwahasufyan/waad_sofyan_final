import authService from 'services/authService';

export const getToken = authService.getToken;
export const setToken = authService.setToken;
export const clearToken = authService.clearToken;
export const hasToken = authService.isAuthenticated;
