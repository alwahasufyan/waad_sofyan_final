/**
 * AuthContext - Centralized JWT authentication state.
 */

import PropTypes from 'prop-types';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

// Project imports
import authService from 'services/api/auth.service';
import tokenService from 'services/authService';
import { useRBACStore } from 'api/rbac';
import { openSnackbar } from 'api/snackbar';

// ==============================|| AUTH STATUS ENUM ||============================== //

/**
 * Authentication status states
 * Used by AuthGuard and GuestGuard for proper lifecycle handling
 */
export const AUTH_STATUS = {
  INITIALIZING: 'INITIALIZING',
  AUTHENTICATED: 'AUTHENTICATED',
  UNAUTHENTICATED: 'UNAUTHENTICATED'
};

// Context
const AuthContext = createContext(null);

// Provider
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [authStatus, setAuthStatus] = useState(AUTH_STATUS.INITIALIZING);

  const clearAuthState = useCallback(() => {
    setUser(null);
    setAuthStatus(AUTH_STATUS.UNAUTHENTICATED);
    useRBACStore.getState().clear();
  }, []);

  const applyAuthenticatedUser = useCallback((userData) => {
    setUser(userData);
    setAuthStatus(AUTH_STATUS.AUTHENTICATED);
    useRBACStore.getState().initialize(userData);
  }, []);

  const redirectToLogin = useCallback(() => {
    if (window.location.pathname !== '/login') {
      window.location.assign('/login');
    }
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      tokenService.clearToken();
      clearAuthState();
      openSnackbar({
        message: 'انتهت الجلسة، يرجى تسجيل الدخول مرة أخرى',
        alert: { color: 'error' }
      });
      redirectToLogin();
    };

    window.addEventListener('auth:session-expired', handleUnauthorized);
    return () => window.removeEventListener('auth:session-expired', handleUnauthorized);
  }, [clearAuthState, redirectToLogin]);

  useEffect(() => {
    const syncTokenRemoval = () => {
      if (!tokenService.isAuthenticated()) {
        clearAuthState();
        redirectToLogin();
      }
    };

    const intervalId = window.setInterval(() => {
      if (authStatus === AUTH_STATUS.AUTHENTICATED) {
        syncTokenRemoval();
      }
    }, 1000);

    const handleStorage = (event) => {
      if (event.key === tokenService.AUTH_TOKEN_KEY && !event.newValue) {
        syncTokenRemoval();
      }
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('storage', handleStorage);
    };
  }, [authStatus, clearAuthState, redirectToLogin]);

  /**
   * Initialize auth state on app startup.
   */
  useEffect(() => {
    const init = async () => {
      try {
        if (!tokenService.isAuthenticated()) {
          setAuthStatus(AUTH_STATUS.UNAUTHENTICATED);
          return;
        }

        const response = await authService.me();

        if (response.status === 'success' && response.data) {
          applyAuthenticatedUser(response.data);
        } else {
          tokenService.clearToken();
          clearAuthState();
        }
      } catch {
        tokenService.clearToken();
        clearAuthState();
      }
    };

    init();
  }, [applyAuthenticatedUser, clearAuthState]);

  /**
   * Login
   */
  const login = useCallback(async (credentials) => {
    const response = await authService.login(credentials);

    if (response.status === 'success' && response.data) {
      applyAuthenticatedUser(response.data);
      return response.data;
    }

    throw new Error(response.message || 'Login failed');
  }, [applyAuthenticatedUser]);

  const register = useCallback(async (payload) => {
    const response = await authService.register(payload);

    if (response.status === 'success' && response.data) {
      applyAuthenticatedUser(response.data);
      return response.data;
    }

    throw new Error(response.message || 'Registration failed');
  }, [applyAuthenticatedUser]);

  /**
   * Logout
   */
  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      clearAuthState();
      redirectToLogin();
    }
  }, [clearAuthState, redirectToLogin]);

  /**
   * Refresh user data
   */
  const refreshUser = useCallback(async () => {
    try {
      if (!tokenService.isAuthenticated()) {
        clearAuthState();
        return null;
      }

      const response = await authService.me();

      if (response.status === 'success' && response.data) {
        applyAuthenticatedUser(response.data);
        return response.data;
      } else {
        tokenService.clearToken();
        clearAuthState();
      }
    } catch {
      tokenService.clearToken();
      clearAuthState();
    }

    return null;
  }, [applyAuthenticatedUser, clearAuthState]);

  const value = useMemo(
    () => ({
      user,
      authStatus,
      isAuthenticated: authStatus === AUTH_STATUS.AUTHENTICATED,
      isLoggedIn: authStatus === AUTH_STATUS.AUTHENTICATED,
      login,
      register,
      logout,
      refreshUser
    }),
    [authStatus, login, logout, refreshUser, register, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

AuthProvider.propTypes = {
  children: PropTypes.node
};

export default AuthContext;
export { AuthContext };

// ==============================|| HOOK ||============================== //

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
