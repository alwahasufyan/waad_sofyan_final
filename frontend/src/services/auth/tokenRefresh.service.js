/**
 * Auth Service - Token Refresh Enhancement
 *
 * إضافة دالة لتحديث JWT Token بدون الحاجة لتسجيل خروج/دخول
 *
 * USE CASE:
 * - عند تحديد صلاحيات جديدة للمستخدم من لوحة الإدارة
 * - يمكن استدعاء refreshToken() لتحديث الصلاحيات فوراً
 * - لا حاجة للخروج والدخول مرة أخرى
 */

import { useState } from 'react';
import api from 'lib/api';
import authService from 'services/authService';

/**
 * تحديث JWT Token مع الصلاحيات الجديدة
 *
 * @returns {Promise<Object>} البيانات الجديدة للمستخدم مع Token محدث
 * @throws {Error} إذا فشل التحديث
 */
export const refreshToken = async () => {
  try {
    if (!authService.isAuthenticated()) {
      throw new Error('No token found. Please login first.');
    }

    const response = await api.post('/auth/refresh-token', {});

    const { token, user } = response.data.data;

    authService.setToken(token);

    return { token, user };
  } catch (error) {
    if (error.response?.status === 401) {
      authService.clearToken();
      window.location.href = '/login';
    }

    throw error;
  }
};

/**
 * مثال على استخدام refreshToken في React Component
 */
export const useTokenRefresh = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);

    try {
      const { user } = await refreshToken();

      // Update app state with new user data
      // This depends on your state management (Redux, Context, etc.)
      // Example: dispatch(setUser(user));

      return user;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { refresh, loading, error };
};

/**
 * INTEGRATION EXAMPLES REMOVED FOR BUILD SAFETY
 * The following examples contained JSX which is not allowed in .js files by Vite.
 * Please refer to project documentation for usage examples.
 */

// ProviderEditIntegration example removed

// AutoTokenRefresh example removed

/**
 * TRIGGER EXAMPLE: كيفية إطلاق حدث تغيير الصلاحيات
 */
export const triggerPermissionsChanged = () => {
  const event = new CustomEvent('permissions-changed', {
    detail: {
      timestamp: new Date().toISOString(),
      source: 'admin-panel'
    }
  });

  window.dispatchEvent(event);
  console.log('🔔 Permissions change event triggered');
};

// RefreshTokenButton example removed

export default {
  refreshToken,
  useTokenRefresh,
  triggerPermissionsChanged
};
