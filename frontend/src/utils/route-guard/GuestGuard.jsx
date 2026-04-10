import PropTypes from 'prop-types';
import { Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';

// project imports
import useAuth from 'hooks/useAuth';
import { AUTH_STATUS } from 'contexts/AuthContext';
import { getDefaultRouteForRole } from 'utils/roleRoutes';

// ==============================|| GUEST GUARD - PUBLIC ROUTES ||============================== //

export default function GuestGuard({ children }) {
  const { authStatus, user } = useAuth();
  const location = useLocation();

  if (authStatus === AUTH_STATUS.INITIALIZING) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (authStatus === AUTH_STATUS.AUTHENTICATED) {
    return <Navigate to={location?.state?.from ? location.state.from : getDefaultRouteForRole(user?.role)} replace />;
  }

  return children;
}

GuestGuard.propTypes = {
  children: PropTypes.node
};
