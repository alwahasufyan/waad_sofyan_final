import PropTypes from 'prop-types';
import { Box } from '@mui/material';

const ScrollX = ({ children, ...other }) => {
  return (
    <Box
      sx={{
        overflowX: 'auto',
        width: '100%',
        '&::-webkit-scrollbar': { height: 8 },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: 'rgba(0,0,0,.2)',
          borderRadius: 4
        }
      }}
      {...other}
    >
      {children}
    </Box>
  );
};

ScrollX.propTypes = {
  children: PropTypes.node
};

export default ScrollX;
