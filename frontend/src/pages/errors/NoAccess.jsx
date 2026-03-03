import { Link } from 'react-router-dom';
import { Box, Button, Container, Typography, Paper } from '@mui/material';
import { Block as BlockIcon, Home as HomeIcon } from '@mui/icons-material';

// ==============================|| ERROR 403 - ACCESS DENIED ||============================== //

const NoAccess = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        bgcolor: 'background.default'
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={3}
          sx={{
            p: 5,
            textAlign: 'center',
            borderRadius: 3
          }}
        >
          {/* Icon */}
          <Box sx={{ mb: 3 }}>
            <BlockIcon
              sx={{
                fontSize: 120,
                color: 'error.main',
                opacity: 0.8
              }}
            />
          </Box>

          {/* Error Code */}
          <Typography
            variant="h1"
            sx={{
              fontSize: '5rem',
              fontWeight: 700,
              color: 'error.main',
              mb: 2
            }}
          >
            403
          </Typography>

          {/* Title */}
          <Typography
            variant="h4"
            sx={{
              fontWeight: 600,
              mb: 2,
              color: 'text.primary'
            }}
          >
            Access Denied
          </Typography>

          {/* Description */}
          <Typography
            variant="body1"
            sx={{
              color: 'text.secondary',
              mb: 4,
              lineHeight: 1.8
            }}
          >
            You don't have permission to access this page.
            <br />
            Please contact your system administrator if you believe this is an error.
          </Typography>

          {/* Action Button */}
          <Button
            component={Link}
            to="/"
            variant="contained"
            size="large"
            startIcon={<HomeIcon />}
            sx={{
              px: 4,
              py: 1.5,
              borderRadius: 2,
              textTransform: 'none',
              fontSize: '1rem'
            }}
          >
            Go to Home
          </Button>

          {/* Additional Info */}
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              mt: 4,
              color: 'text.disabled'
            }}
          >
            Error Code: 403 | Forbidden Access
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
};

export default NoAccess;
