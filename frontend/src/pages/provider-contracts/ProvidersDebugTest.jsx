import { useQuery } from '@tanstack/react-query';
import { getProviders } from 'services/api/providers.service';
import { Box, Paper, Typography, CircularProgress, Alert } from '@mui/material';

/**
 * TEMPORARY DEBUG PAGE
 * Used to diagnose provider list loading issue
 * Can be removed after issue is resolved
 */
const ProvidersDebugTest = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['providers-debug'],
    queryFn: async () => {
      const response = await getProviders({ page: 0, size: 1000 });
      return response;
    }
  });

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Provider API Debug Test
        </Typography>

        {isLoading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, my: 2 }}>
            <CircularProgress size={20} />
            <Typography>Loading providers...</Typography>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ my: 2 }}>
            Error: {error.message}
          </Alert>
        )}

        {data && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Raw API Response:
            </Typography>
            <Paper sx={{ p: 2, bgcolor: '#f5f5f5', maxHeight: 400, overflow: 'auto' }}>
              <pre>{JSON.stringify(data, null, 2)}</pre>
            </Paper>

            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
              Analysis:
            </Typography>
            <Paper sx={{ p: 2 }}>
              <Typography>• Type: {Array.isArray(data) ? 'Array' : typeof data}</Typography>
              <Typography>• Is Array: {Array.isArray(data) ? 'Yes ✅' : 'No ❌'}</Typography>
              <Typography>• Has 'content': {data?.content ? 'Yes ✅' : 'No ❌'}</Typography>
              <Typography>• Has 'data': {data?.data ? 'Yes ✅' : 'No ❌'}</Typography>

              {Array.isArray(data) && <Typography>• Array Length: {data.length}</Typography>}

              {data?.content && <Typography>• content.length: {data.content.length}</Typography>}

              {data?.data && <Typography>• data.length: {Array.isArray(data.data) ? data.data.length : 'Not an array'}</Typography>}

              <Typography variant="h6" sx={{ mt: 2 }}>
                Extracted Providers:
              </Typography>
              {(() => {
                const providers = Array.isArray(data) ? data : data?.content || data?.data || [];

                return (
                  <>
                    <Typography>• Count: {providers.length}</Typography>
                    {providers.length > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2">First Provider:</Typography>
                        <pre style={{ fontSize: '12px' }}>{JSON.stringify(providers[0], null, 2)}</pre>
                      </Box>
                    )}
                  </>
                );
              })()}
            </Paper>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default ProvidersDebugTest;
