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

/** Shared portal sidebar width — fits longer section labels */
export const SIDEBAR_WIDTH = 340;
/** @deprecated use SIDEBAR_WIDTH */
export const RESEARCHER_SIDEBAR_WIDTH = SIDEBAR_WIDTH;

/** Navy/teal chrome used for portal sidebars in both app light and dark modes */
const NAVY_SIDEBAR = {
  accent: '#00ced1',
  accentSoft: 'rgba(0,206,209,0.14)',
  accentHover: 'rgba(0,206,209,0.2)',
  accentBorder: 'rgba(0,206,209,0.3)',
  accentBadgeBg: 'rgba(0,206,209,0.15)',
  bg: '#0b1426',
  headerBg: 'linear-gradient(160deg, #0f1f35 0%, #0b1426 100%)',
  border: 'rgba(255,255,255,0.07)',
  section: '#718096',
  sectionActive: '#00ced1',
  nav: '#cbd5e1',
  navActive: '#00ced1',
  navHover: '#f1f5f9',
  muted: '#718096',
  name: '#ffffff',
  role: '#00ced1',
  signOut: 'rgba(255,255,255,0.35)',
  itemHoverBg: 'rgba(255,255,255,0.05)',
  badgeText: '#cbd5e1',
  badgeBg: 'rgba(113,128,150,0.18)',
};

/** Always returns navy/teal tokens so sidebars stay consistent across app themes */
export function sidebarTheme(_dark) {
  return { ...NAVY_SIDEBAR };
}
