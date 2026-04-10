import api from 'lib/api';
import authService from 'services/authService';

/**
 * Login with username/password
 */
export const login = async (credentials) => {
  const response = await api.post('/auth/login', credentials);
  const data = response.data;
  const token = data?.data?.token;

  if (token) {
    authService.setToken(token);
  }

  return {
    status: data.status,
    data: data.data?.user || data.data,
    message: data.message
  };
};

/**
 * Register a new user and persist the returned token.
 */
export const register = async (payload) => {
  const response = await api.post('/auth/register', payload);
  const data = response.data;
  const token = data?.data?.token;

  if (token) {
    authService.setToken(token);
  }

  return {
    status: data.status,
    data: data.data?.user || data.data,
    message: data.message
  };
};

/**
 * Get current authenticated user.
 */
export const me = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

/**
 * Logout and clear local token state.
 */
export const logout = async () => {
  try {
    const response = await api.post('/auth/session/logout');
    return response.data;
  } catch {
    return { status: 'success', message: 'Logged out' };
  } finally {
    authService.clearToken();
  }
};

/**
 * Check if a token exists locally.
 */
export const isAuthenticated = () => authService.isAuthenticated();

/**
 * Get public password reset config.
 * Returns: { method: 'TOKEN' | 'OTP', tokenExpiryMinutes, otpExpiryMinutes, otpLength }
 */
export const getPasswordResetConfig = async () => {
  const response = await api.get('/auth/password-reset-config');
  return response.data?.data || { method: 'TOKEN', tokenExpiryMinutes: 60, otpExpiryMinutes: 10, otpLength: 6 };
};

/**
 * Request password reset link (token flow).
 */
export const requestPasswordResetToken = async (email) => {
  const response = await api.post('/auth/token/forgot-password', { email });
  return response.data;
};

/**
 * Reset password using secure token flow.
 */
export const resetPasswordWithToken = async (token, newPassword, confirmPassword) => {
  const response = await api.post('/auth/token/reset-password', {
    token,
    newPassword,
    confirmPassword
  });
  return response.data;
};

/**
 * Request OTP for password reset (legacy flow).
 */
export const requestPasswordResetOtp = async (email) => {
  const response = await api.post('/auth/forgot-password', { email });
  return response.data;
};

/**
 * Reset password using OTP flow.
 */
export const resetPasswordWithOtp = async (email, otp, newPassword) => {
  const response = await api.post('/auth/reset-password', {
    email,
    otp,
    newPassword
  });
  return response.data;
};

// Export as default for backward compatibility
export default {
  login,
  register,
  me,
  logout,
  isAuthenticated,
  getPasswordResetConfig,
  requestPasswordResetToken,
  resetPasswordWithToken,
  requestPasswordResetOtp,
  resetPasswordWithOtp
};
