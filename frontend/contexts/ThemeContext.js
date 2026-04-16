'use client';

import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { createTheme, ThemeProvider as MuiThemeProvider, alpha } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

const ThemeContext = createContext(null);

// ─── Brand Color Palette ────────────────────────────────────────────────────
export const COLORS = {
  blue: {
    50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd',
    400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8',
    800: '#1e3a8a', 900: '#172554',
  },
  teal: {
    50: '#f0fdfa', 100: '#ccfbf1', 200: '#99f6e4', 300: '#5eead4',
    400: '#2dd4bf', 500: '#1ca7a1', 600: '#0d9488', 700: '#0f766e',
    800: '#115e59', 900: '#134e4a',
  },
  slate: {
    50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1',
    400: '#94a3b8', 500: '#2c3035', 600: '#475569', 700: '#334155',
    800: '#1e293b', 900: '#0f172a', 950: '#020617',
  },
  green:  { 400: '#4ade80', 500: '#22c55e', 600: '#059669', 700: '#047857' },
  amber:  { 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#92400e' },
  red:    { 300: '#fca5a5', 400: '#f87171', 500: '#ef4444', 600: '#dc2626', 700: '#991b1b' },
  orange: { 400: '#fb923c', 500: '#f97316', 600: '#ea580c' },
};

// ─── Theme Builder ──────────────────────────────────────────────────────────
function buildTheme(mode) {
  const dark = mode === 'dark';
  const sl   = COLORS.slate;
  const tl   = COLORS.teal;

  // Semantic surface tokens
  const bg          = dark ? sl[900] : sl[50];
  const paper       = dark ? sl[800] : '#ffffff';
  const raised      = dark ? sl[700] : sl[100];
  const border      = dark ? sl[700] : sl[200];
  const borderSt    = dark ? sl[600] : sl[300];

  // Text tokens
  const txP = dark ? sl[50]  : sl[900];
  const txS = dark ? sl[400] : sl[500];
  const txM = dark ? sl[500] : sl[400];

  return createTheme({
    // ── Palette ──────────────────────────────────────────────────────────────
    palette: {
      mode,
      primary:    { main: tl[600],          light: tl[400],          dark: tl[700],          contrastText: '#fff' },
      secondary:  { main: COLORS.blue[700], light: COLORS.blue[500], dark: COLORS.blue[800], contrastText: '#fff' },
      success:    { main: COLORS.green[600], light: COLORS.green[500], dark: COLORS.green[700], contrastText: '#fff' },
      warning:    { main: COLORS.amber[600], light: COLORS.amber[500], dark: COLORS.amber[700], contrastText: '#fff' },
      error:      { main: COLORS.red[600],   light: COLORS.red[500],   dark: COLORS.red[700],   contrastText: '#fff' },
      info:       { main: '#0284c7',         light: '#38bdf8',         dark: '#0369a1',          contrastText: '#fff' },
      background: { default: bg, paper },
      text:       { primary: txP, secondary: txS, disabled: dark ? sl[600] : sl[300] },
      divider:    border,
      // Custom design tokens — accessible via theme.palette.*
      surface:  { bg, paper, raised },
      stroke:   { default: border, strong: borderSt, subtle: dark ? sl[800] : sl[100] },
      content:  { primary: txP, secondary: txS, muted: txM },
    },

    // ── Typography ────────────────────────────────────────────────────────────
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica Neue", Arial, sans-serif',
      fontWeightLight:   300,
      fontWeightRegular: 400,
      fontWeightMedium:  500,
      fontWeightBold:    700,

      h1: { fontSize: '2.25rem',  fontWeight: 700, lineHeight: 1.2,  letterSpacing: '-0.025em' },
      h2: { fontSize: '1.875rem', fontWeight: 700, lineHeight: 1.25, letterSpacing: '-0.02em'  },
      h3: { fontSize: '1.5rem',   fontWeight: 600, lineHeight: 1.3,  letterSpacing: '-0.015em' },
      h4: { fontSize: '1.25rem',  fontWeight: 600, lineHeight: 1.4,  letterSpacing: '-0.01em'  },
      h5: { fontSize: '1.125rem', fontWeight: 600, lineHeight: 1.4  },
      h6: { fontSize: '1rem',     fontWeight: 600, lineHeight: 1.5  },

      subtitle1: { fontSize: '1rem',      fontWeight: 500, lineHeight: 1.5 },
      subtitle2: { fontSize: '0.875rem',  fontWeight: 600, lineHeight: 1.5, letterSpacing: '0.01em' },

      body1:    { fontSize: '0.9375rem', fontWeight: 400, lineHeight: 1.6 },
      body2:    { fontSize: '0.875rem',  fontWeight: 400, lineHeight: 1.6 },
      caption:  { fontSize: '0.75rem',   fontWeight: 400, lineHeight: 1.5, letterSpacing: '0.01em' },
      overline: { fontSize: '0.6875rem', fontWeight: 700, lineHeight: 1.5, letterSpacing: '0.08em', textTransform: 'uppercase' },
      button:   { fontSize: '0.875rem',  fontWeight: 600, lineHeight: 1.5, textTransform: 'none',   letterSpacing: '0.01em' },
    },

    shape: { borderRadius: 8 },

    // ── Component Overrides ───────────────────────────────────────────────────
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: bg,
            color: txP,
            transition: 'background-color 0.2s ease, color 0.2s ease',
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
          },
          '::-webkit-scrollbar': { width: 6, height: 6 },
          '::-webkit-scrollbar-track': { background: 'transparent' },
          '::-webkit-scrollbar-thumb': { background: dark ? sl[700] : sl[300], borderRadius: 3 },
          '::-webkit-scrollbar-thumb:hover': { background: dark ? sl[600] : sl[400] },
        },
      },

      MuiAppBar: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            backgroundColor: paper,
            borderBottom: `1px solid ${border}`,
            color: txP,
            backgroundImage: 'none',
          },
        },
      },

      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            borderRadius: 8,
            padding: '8px 18px',
            fontWeight: 600,
            fontSize: '0.875rem',
            transition: 'all 0.15s ease',
          },
          contained: {
            '&:hover': { filter: 'brightness(1.1)' },
            '&:active': { filter: 'brightness(0.95)' },
          },
          containedPrimary:   { backgroundColor: tl[600],           '&:hover': { backgroundColor: tl[700],          filter: 'none' } },
          containedSecondary: { backgroundColor: COLORS.blue[700], '&:hover': { backgroundColor: COLORS.blue[800], filter: 'none' } },
          outlined: {
            borderColor: border,
            '&:hover': { borderColor: borderSt, backgroundColor: alpha(dark ? '#fff' : '#000', 0.03) },
          },
          text: {
            '&:hover': { backgroundColor: alpha(dark ? '#fff' : '#000', 0.05) },
          },
        },
      },

      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            backgroundColor: paper,
            border: `1px solid ${border}`,
            borderRadius: 12,
            backgroundImage: 'none',
            transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
          },
        },
      },

      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: { backgroundImage: 'none', backgroundColor: paper },
          rounded: { borderRadius: 12 },
          elevation1: {
            border: `1px solid ${border}`,
            boxShadow: dark ? '0 1px 4px rgba(0,0,0,0.35)' : '0 1px 4px rgba(0,0,0,0.06)',
          },
        },
      },

      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            '& .MuiOutlinedInput-notchedOutline': { borderColor: border, transition: 'border-color 0.15s' },
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: borderSt },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: tl[500], borderWidth: '1.5px' },
          },
        },
      },

      MuiInputLabel: {
        styleOverrides: {
          root: { '&.Mui-focused': { color: tl[500] } },
        },
      },

      MuiFormLabel: {
        styleOverrides: {
          root: { '&.Mui-focused': { color: tl[500] } },
        },
      },

      MuiSelect: {
        styleOverrides: {
          root: { borderRadius: 8 },
        },
      },

      MuiChip: {
        styleOverrides: {
          root: { fontWeight: 600, fontSize: '0.75rem', borderRadius: 6 },
        },
      },

      MuiDivider: {
        styleOverrides: {
          root: { borderColor: border },
        },
      },

      MuiTableHead: {
        styleOverrides: {
          root: {
            '& .MuiTableCell-head': {
              fontSize: '0.6875rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              color: txS,
              backgroundColor: raised,
              borderBottom: `1px solid ${border}`,
            },
          },
        },
      },

      MuiTableCell: {
        styleOverrides: {
          root: { borderColor: border, fontSize: '0.875rem', padding: '12px 16px' },
        },
      },

      MuiTableRow: {
        styleOverrides: {
          root: {
            '&:last-child td': { borderBottom: 0 },
            '&:hover': { backgroundColor: alpha(dark ? '#fff' : '#000', 0.025) },
          },
        },
      },

      MuiMenu: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          paper: {
            border: `1px solid ${border}`,
            borderRadius: 10,
            backgroundImage: 'none',
            boxShadow: dark ? '0 8px 32px rgba(0,0,0,0.5)' : '0 8px 32px rgba(0,0,0,0.1)',
            minWidth: 180,
          },
        },
      },

      MuiMenuItem: {
        styleOverrides: {
          root: {
            fontSize: '0.875rem',
            borderRadius: 6,
            margin: '2px 6px',
            '&:hover': { backgroundColor: alpha(dark ? '#fff' : '#000', 0.05) },
            '&.Mui-selected': {
              backgroundColor: alpha(tl[500], 0.12),
              '&:hover': { backgroundColor: alpha(tl[500], 0.18) },
            },
          },
        },
      },

      MuiAlert: {
        styleOverrides: {
          root: { borderRadius: 10, border: '1px solid', fontSize: '0.875rem' },
          standardError: {
            backgroundColor: alpha(COLORS.red[600], dark ? 0.12 : 0.08),
            borderColor: alpha(COLORS.red[600], 0.3),
            color: dark ? COLORS.red[300] : COLORS.red[700],
            '& .MuiAlert-icon': { color: dark ? COLORS.red[400] : COLORS.red[600] },
          },
          standardSuccess: {
            backgroundColor: alpha(COLORS.green[600], dark ? 0.12 : 0.08),
            borderColor: alpha(COLORS.green[600], 0.3),
            color: dark ? COLORS.green[400] : COLORS.green[700],
            '& .MuiAlert-icon': { color: dark ? COLORS.green[400] : COLORS.green[600] },
          },
          standardWarning: {
            backgroundColor: alpha(COLORS.amber[600], dark ? 0.12 : 0.08),
            borderColor: alpha(COLORS.amber[600], 0.3),
            color: dark ? COLORS.amber[400] : COLORS.amber[700],
            '& .MuiAlert-icon': { color: dark ? COLORS.amber[400] : COLORS.amber[600] },
          },
          standardInfo: {
            backgroundColor: alpha('#0284c7', dark ? 0.12 : 0.08),
            borderColor: alpha('#0284c7', 0.3),
            '& .MuiAlert-icon': { color: '#0284c7' },
          },
        },
      },

      MuiDialog: {
        styleOverrides: {
          paper: {
            backgroundImage: 'none',
            border: `1px solid ${border}`,
            borderRadius: 14,
            boxShadow: dark ? '0 24px 48px rgba(0,0,0,0.6)' : '0 24px 48px rgba(0,0,0,0.15)',
          },
        },
      },

      MuiSwitch: {
        styleOverrides: {
          switchBase: {
            '&.Mui-checked': { color: tl[500] },
            '&.Mui-checked + .MuiSwitch-track': { backgroundColor: tl[500] },
          },
        },
      },

      MuiCheckbox: {
        styleOverrides: {
          root: { '&.Mui-checked': { color: tl[500] } },
        },
      },

      MuiStepIcon: {
        styleOverrides: {
          root: {
            '&.Mui-active':    { color: tl[500] },
            '&.Mui-completed': { color: tl[500] },
          },
        },
      },

      MuiStepConnector: {
        styleOverrides: {
          line: { borderColor: border },
        },
      },

      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: dark ? sl[700] : sl[800],
            fontSize: '0.75rem',
            borderRadius: 6,
            padding: '4px 10px',
          },
        },
      },

      MuiLinearProgress: {
        styleOverrides: {
          root: { borderRadius: 99, height: 4, backgroundColor: border },
        },
      },

      MuiSkeleton: {
        styleOverrides: {
          root: { backgroundColor: dark ? sl[700] : sl[200], borderRadius: 6 },
        },
      },

      MuiAvatar: {
        styleOverrides: {
          root: { fontSize: '0.875rem', fontWeight: 600 },
        },
      },
    },
  });
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function ThemeProvider({ children }) {
  const [mode, setMode] = useState('light');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('dacoris-theme') || localStorage.getItem('theme-mode');
      if (saved === 'dark' || saved === 'light') {
        setMode(saved);
      } else if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
        setMode('dark');
      }
    } catch {}
  }, []);

  const toggleTheme = () => {
    const next = mode === 'light' ? 'dark' : 'light';
    setMode(next);
    try { localStorage.setItem('dacoris-theme', next); } catch {}
  };

  const theme = useMemo(() => buildTheme(mode), [mode]);

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme, theme, COLORS }}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
