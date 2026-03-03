import PropTypes from 'prop-types';
import { Box, Typography, Stack } from '@mui/material';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';

const EmptyState = ({ title = 'No data available', description = 'No records found', icon: Icon = InboxOutlinedIcon, action = null }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 400,
        textAlign: 'center',
        p: 3
      }}
    >
      <Stack spacing={2} alignItems="center">
        <Icon sx={{ fontSize: 80, color: 'text.disabled' }} />
        <Typography variant="h5" color="text.secondary">
          {title}
        </Typography>
        <Typography variant="body2" color="text.disabled" sx={{ maxWidth: 400 }}>
          {description}
        </Typography>
        {action && <Box sx={{ mt: 2 }}>{action}</Box>}
      </Stack>
    </Box>
  );
};

EmptyState.propTypes = {
  title: PropTypes.string,
  description: PropTypes.string,
  icon: PropTypes.elementType,
  action: PropTypes.node
};

export default EmptyState;
