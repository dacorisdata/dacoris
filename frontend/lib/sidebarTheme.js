/** Shared sidebar color tokens and typography for dark and light mode */
export const SIDEBAR_FONTS = {
  section: 12,
  subsection: 11.5,
  item: 14,
  itemIcon: 18,
  userName: 14.5,
  userRole: 12.5,
  badge: 11.5,
  signOut: 14,
};

export function sidebarTheme(dark) {
  const accent = dark ? '#00ced1' : '#00a8ab';

  return {
    accent,
    accentSoft: dark ? 'rgba(0,206,209,0.14)' : 'rgba(0,168,171,0.12)',
    accentHover: dark ? 'rgba(0,206,209,0.2)' : 'rgba(0,168,171,0.16)',
    accentBorder: dark ? 'rgba(0,206,209,0.3)' : 'rgba(0,168,171,0.28)',
    accentBadgeBg: dark ? 'rgba(0,206,209,0.15)' : 'rgba(0,168,171,0.1)',
    bg: dark ? '#0b1426' : '#f7fafc',
    headerBg: dark
      ? 'linear-gradient(160deg, #0f1f35 0%, #0b1426 100%)'
      : 'linear-gradient(160deg, rgba(0,206,209,0.06) 0%, transparent 100%)',
    border: dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)',
    section: dark ? '#718096' : '#a0aec0',
    sectionActive: accent,
    nav: dark ? '#cbd5e1' : '#475569',
    navActive: accent,
    navHover: dark ? '#f1f5f9' : '#1a202c',
    muted: dark ? '#718096' : '#a0aec0',
    name: dark ? '#ffffff' : '#1a202c',
    role: accent,
    signOut: dark ? 'rgba(255,255,255,0.35)' : '#94a3b8',
    itemHoverBg: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
    badgeText: dark ? '#cbd5e1' : '#475569',
    badgeBg: dark ? 'rgba(113,128,150,0.18)' : 'rgba(160,174,192,0.15)',
  };
}
