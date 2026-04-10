import PropTypes from 'prop-types';
import { Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';

// project imports
import useAuth from 'hooks/useAuth';
import { AUTH_STATUS } from 'contexts/AuthContext';

// ==============================|| AUTH GUARD - PROTECTED ROUTES ||============================== //

export default function AuthGuard({ children }) {
  const { authStatus } = useAuth();
  const location = useLocation();

  // Show loading during initialization
  if (authStatus === AUTH_STATUS.INITIALIZING) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh'
        }}
      >
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (authStatus === AUTH_STATUS.UNAUTHENTICATED) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // Authenticated - render children
  return children;
}

AuthGuard.propTypes = {
  children: PropTypes.node
};
