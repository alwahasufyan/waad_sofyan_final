import PropTypes from 'prop-types';
// material-ui
import { useColorScheme } from '@mui/material/styles';

// project imports
import { ThemeMode } from 'config';

// ==============================|| CODE HIGHLIGHTER ||============================== //

export default function SyntaxHighlight({ children }) {
  const { colorScheme } = useColorScheme();

  const style = {
    background: colorScheme === ThemeMode.DARK ? '#0b1226' : '#f8f8f8',
    color: colorScheme === ThemeMode.DARK ? '#dbeafe' : '#1f2937',
    padding: 12,
    borderRadius: 6,
    fontFamily: 'monospace',
    fontSize: 13,
    overflowX: 'auto'
  };

  return (
    <pre style={style}>
      <code>{children}</code>
    </pre>
  );
}

SyntaxHighlight.propTypes = { children: PropTypes.string };
