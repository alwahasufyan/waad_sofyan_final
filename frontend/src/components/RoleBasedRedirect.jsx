import { Navigate } from 'react-router-dom';
import useAuth from 'hooks/useAuth';
import { getDefaultRouteForRole } from 'utils/roleRoutes';
import { AUTH_STATUS } from 'contexts/AuthContext';
import { Box, CircularProgress } from '@mui/material';

/**
 * RoleBasedRedirect Component
 * Phase 5.5: Critical Stabilization
 *
 * Smart root "/" handler that redirects based on authentication status:
 * - Unauthenticated users → /login
 * - Authenticated users → role-specific landing page
 */
export default function RoleBasedRedirect() {
  const { authStatus, isLoggedIn, user } = useAuth();

  if (authStatus === AUTH_STATUS.INITIALIZING) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  // If not logged in, redirect to login
  if (!isLoggedIn || !user) {
    return <Navigate to="/login" replace />;
  }

  // If logged in, redirect to role-specific landing page
  const primaryRole = user?.role || (Array.isArray(user?.roles) ? user.roles[0] : null);
  const landingRoute = getDefaultRouteForRole(primaryRole);
  return <Navigate to={landingRoute} replace />;
}
