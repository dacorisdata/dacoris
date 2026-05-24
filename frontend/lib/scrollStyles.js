const ACCENT = '#1ca7a1';
const ACCENT_DARK = '#0e8a85';

/** Distinct teal scrollbars for primary scroll regions (wizard, editors). */
export function accentScrollbarSx(dark, { size = 10 } = {}) {
  const track = dark ? 'rgba(28, 167, 161, 0.12)' : '#dff5f3';
  const thumb = dark ? ACCENT : ACCENT;
  const thumbHover = ACCENT_DARK;
  const thumbBorder = dark ? 'rgba(15, 23, 42, 0.85)' : track;

  return {
    scrollbarWidth: 'thin',
    scrollbarColor: `${thumb} ${track}`,
    '&::-webkit-scrollbar': { width: size, height: size },
    '&::-webkit-scrollbar-track': {
      background: track,
      borderRadius: size,
    },
    '&::-webkit-scrollbar-thumb': {
      background: `linear-gradient(180deg, ${thumb} 0%, ${ACCENT_DARK} 100%)`,
      borderRadius: size,
      border: `2px solid ${thumbBorder}`,
    },
    '&::-webkit-scrollbar-thumb:hover': {
      background: thumbHover,
    },
    '&::-webkit-scrollbar-corner': {
      background: track,
    },
  };
}

/** Subtle scrollbars for sidebars and secondary panels. */
export function subtleScrollbarSx(dark, { size = 8 } = {}) {
  const track = dark ? 'rgba(148, 163, 184, 0.12)' : '#eef2f6';
  const thumb = dark ? '#64748b' : '#94a3b8';

  return {
    scrollbarWidth: 'thin',
    scrollbarColor: `${thumb} ${track}`,
    '&::-webkit-scrollbar': { width: size, height: size },
    '&::-webkit-scrollbar-track': { background: track, borderRadius: size },
    '&::-webkit-scrollbar-thumb': {
      background: thumb,
      borderRadius: size,
      border: `2px solid ${track}`,
    },
    '&::-webkit-scrollbar-thumb:hover': {
      background: dark ? '#94a3b8' : '#64748b',
    },
  };
}
