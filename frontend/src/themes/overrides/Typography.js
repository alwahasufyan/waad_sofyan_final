// ==============================|| OVERRIDES - TYPOGRAPHY ||============================== //

export default function Typography() {
  return {
    MuiTypography: {
      styleOverrides: {
        gutterBottom: {
          marginBottom: 12
        }
      },
      defaultProps: {
        // Improve text rendering for better readability
        variantMapping: {
          h1: 'h1',
          h2: 'h2',
          h3: 'h3',
          h4: 'h4',
          h5: 'h5',
          h6: 'h6',
          subtitle1: 'h6',
          subtitle2: 'h6',
          body1: 'p',
          body2: 'p'
        }
      }
    }
  };
}
