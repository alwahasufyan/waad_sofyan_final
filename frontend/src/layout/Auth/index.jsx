import { Outlet, Navigate } from 'react-router-dom';
import useAuth from 'hooks/useAuth';
import { getDefaultRouteForRole } from 'utils/roleRoutes';
import { AUTH_STATUS } from 'contexts/AuthContext';
import { Box, CircularProgress } from '@mui/material';

// ==============================|| LAYOUT - AUTH - SIMPLIFIED ||============================== //

export default function AuthLayout() {
  const { authStatus, user } = useAuth();

  if (authStatus === AUTH_STATUS.INITIALIZING) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  // If already logged in, redirect to dashboard
  if (user) {
    return <Navigate to={getDefaultRouteForRole(user?.role)} replace />;
  }

  // Otherwise show login page
  return <Outlet />;
}
