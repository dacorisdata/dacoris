import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#0b3c5d',
      light: '#1fa6a0',
      dark: '#0a1f33',
    },
    secondary: {
      main: '#1fa6a0',
    },
    background: {
      default: '#ffffff',
      paper: '#f8f9fa',
    },
    text: {
      primary: '#0a1f33',
      secondary: '#0b3c5d',
    },
  },
  typography: {
    button: {
      textTransform: 'none',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(11, 60, 93, 0.08)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiInputBase-root': {
            fontSize: '14px',
            fontWeight: 500,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontSize: '10px',
          fontWeight: 700,
          height: 'auto',
          padding: '4px 8px',
        },
      },
    },
  },
});

export default theme;
