// ==============================|| OVERRIDES - TABLE CELL ||============================== //

export default function TableHead(theme) {
  const varsPalette = (theme.vars && theme.vars.palette) || theme.palette || {};
  return {
    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: varsPalette.grey?.[50] ?? theme.palette.grey?.[50],
          borderTop: '1px solid',
          borderTopColor: varsPalette.divider ?? theme.palette.divider,
          borderBottom: '2px solid',
          borderBottomColor: varsPalette.divider ?? theme.palette.divider
        }
      }
    }
  };
}
