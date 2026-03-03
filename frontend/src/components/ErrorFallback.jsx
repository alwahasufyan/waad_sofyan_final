// material-ui
import { Box, Button, Typography } from '@mui/material';
import MainCard from './MainCard';

// ==============================|| ERROR FALLBACK ||============================== //

export default function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <MainCard>
      <Box sx={{ textAlign: 'center', py: 5 }}>
        <Typography variant="h3" color="error" gutterBottom>
          Something went wrong
        </Typography>
        <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
          {error?.message || 'An unexpected error occurred'}
        </Typography>
        {resetErrorBoundary && (
          <Button variant="contained" onClick={resetErrorBoundary}>
            Try again
          </Button>
        )}
      </Box>
    </MainCard>
  );
}
