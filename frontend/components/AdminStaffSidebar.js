'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Box, Typography, Chip, Collapse } from '@mui/material';
import {
  Dashboard as DashIcon, Person as PersonIcon,
  Search as SearchIcon, Description as ProposalIcon,
  ViewKanban as PipelineIcon, RateReview as ReviewIcon,
  EmojiEvents as AwardIcon, Business as FunderIcon,
  Summarize as ReportIcon, AccountBalance as BudgetIcon,
  Payments as DisbIcon, Receipt as ExpenseIcon,
  Science as ProjectIcon, PeopleAlt as DirectoryIcon,
  Hub as PipelineDataIcon, Analytics as AnalyticsIcon,
  ExitToApp as LogoutIcon, Star as StarIcon,
  Grading as ProjectReviewIcon,
  Handshake as MouIcon, Groups as MouPartnersIcon,
  BarChart as MouAnalyticsIcon, NoteAdd as NewMouIcon,
  FormatListBulleted as MouListIcon,
  PendingActions as MouQueueIcon, AccountTree as WorkflowIcon,
  School as TrainingIcon, MenuBook as ProgramsIcon,
  Groups as EnrollmentsIcon, Assignment as NeedsIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { useTheme as useMuiTheme } from '@mui/material/styles';
import { subtleScrollbarSx } from '../lib/scrollStyles';

const ACCENT = '#16a699';
const STORAGE_KEY = 'dacoris-admin-sidebar-sections';
const ALWAYS_EXPANDED = new Set(['Main']);

/** High-contrast sidebar text tokens for light and dark mode */
function sidebarTokens(dark) {
  return {
    accent:       dark ? '#2dd4bf' : '#0d9488',
    accentSoft:   dark ? 'rgba(45,212,191,0.14)' : 'rgba(22,166,153,0.12)',
    accentHover:  dark ? 'rgba(45,212,191,0.2)' : 'rgba(22,166,153,0.16)',
    section:      dark ? '#cbd5e1' : '#475569',
    sectionActive: dark ? '#5eead4' : '#0d9488',
    nav:          dark ? '#e2e8f0' : '#334155',
    navActive:    dark ? '#5eead4' : '#0d9488',
    navHover:     dark ? '#f8fafc' : '#0f172a',
    muted:        dark ? '#94a3b8' : '#64748b',
    badgeBg:      dark ? 'rgba(148,163,184,0.18)' : 'rgba(100,116,139,0.1)',
    badgeText:    dark ? '#cbd5e1' : '#475569',
    name:         dark ? '#f8fafc' : '#0f172a',
    role:         dark ? '#5eead4' : '#0d9488',
  };
}

const ROLE_META = {
  GRANT_MANAGER:            { label: 'Grant Manager',         color: ACCENT },
  FINANCE_OFFICER:          { label: 'Finance Officer',        color: ACCENT },
  ETHICS_COMMITTEE_MEMBER:  { label: 'Ethics Committee',       color: ACCENT },
  DATA_STEWARD:             { label: 'Data Steward',           color: ACCENT },
  DATA_ENGINEER:            { label: 'Data Engineer',          color: ACCENT },
  INSTITUTIONAL_LEADERSHIP: { label: 'Institutional Lead',     color: ACCENT },
  EXTERNAL_REVIEWER:        { label: 'External Reviewer',      color: ACCENT },
  GUEST_COLLABORATOR:       { label: 'Guest Collaborator',     color: ACCENT },
  EXTERNAL_FUNDER:          { label: 'External Funder',        color: ACCENT },
  ADMIN_STAFF:              { label: 'Admin Staff',            color: ACCENT },
  MOU_ADMIN:                { label: 'MoU Administrator',      color: ACCENT },
  LEGAL_OFFICER:            { label: 'Legal Officer',           color: ACCENT },
  PARTNERSHIP_COORDINATOR:  { label: 'Partnership Coordinator', color: ACCENT },
};

const NAV_SECTIONS = [
  {
    section: 'Main',
    items: [
      { icon: DashIcon,    label: 'Overview',    path: '/admin-staff/overview', roles: 'all' },
      { icon: PersonIcon,  label: 'My Profile',  path: '/admin-staff/profile',  roles: 'all' },
    ],
  },
  {
    section: 'Grant Management',
    roles: ['GRANT_MANAGER','INSTITUTIONAL_LEADERSHIP','FINANCE_OFFICER','ADMIN_STAFF','EXTERNAL_FUNDER'],
    items: [
      { icon: SearchIcon,    label: 'Opportunities',    path: '/admin-staff/grants/opportunities', roles: ['GRANT_MANAGER','INSTITUTIONAL_LEADERSHIP','FINANCE_OFFICER','ADMIN_STAFF','EXTERNAL_FUNDER'] },
      { icon: ProposalIcon,  label: 'All Proposals',    path: '/admin-staff/grants/proposals',     roles: ['GRANT_MANAGER','INSTITUTIONAL_LEADERSHIP','ADMIN_STAFF'] },
      { icon: PipelineIcon,  label: 'Pipeline',         path: '/admin-staff/grants/pipeline',      roles: ['GRANT_MANAGER','INSTITUTIONAL_LEADERSHIP','ADMIN_STAFF'] },
      { icon: AwardIcon,     label: 'Awards',           path: '/admin-staff/grants/awards',        roles: ['GRANT_MANAGER','FINANCE_OFFICER','INSTITUTIONAL_LEADERSHIP','ADMIN_STAFF'] },
      { icon: FunderIcon,    label: 'Funder CRM',       path: '/admin-staff/grants/funders',       roles: ['GRANT_MANAGER','INSTITUTIONAL_LEADERSHIP'] },
      { icon: ReportIcon,    label: 'Reports & Compliance', path: '/admin-staff/grants/reports',   roles: ['GRANT_MANAGER','INSTITUTIONAL_LEADERSHIP','FINANCE_OFFICER'] },
    ],
  },
  {
    section: 'Post-Award Finance',
    roles: ['FINANCE_OFFICER','INSTITUTIONAL_LEADERSHIP','ADMIN_STAFF'],
    items: [
      { icon: BudgetIcon,  label: 'Budgets',        path: '/admin-staff/finance/budgets',       roles: ['FINANCE_OFFICER','INSTITUTIONAL_LEADERSHIP'] },
      { icon: DisbIcon,    label: 'Disbursements',  path: '/admin-staff/finance/disbursements', roles: ['FINANCE_OFFICER','INSTITUTIONAL_LEADERSHIP'] },
      { icon: ExpenseIcon, label: 'Expense Reports',path: '/admin-staff/finance/expenses',      roles: ['FINANCE_OFFICER','INSTITUTIONAL_LEADERSHIP'] },
    ],
  },
  {
    section: 'Project Management',
    roles: ['INSTITUTIONAL_LEADERSHIP','DATA_STEWARD','ETHICS_COMMITTEE_MEMBER','ADMIN_STAFF','GRANT_MANAGER'],
    items: [
      { icon: ProjectReviewIcon, label: 'Project Review',       path: '/admin-staff/research/projects/review', roles: ['INSTITUTIONAL_LEADERSHIP','ADMIN_STAFF','GRANT_MANAGER'] },
      { icon: ProjectIcon,       label: 'Projects Tracking',    path: '/admin-staff/research/projects',        roles: ['INSTITUTIONAL_LEADERSHIP','DATA_STEWARD','ETHICS_COMMITTEE_MEMBER','ADMIN_STAFF','GRANT_MANAGER'] },
      { icon: ReviewIcon,        label: 'Ethics Review',        path: '/admin-staff/ethics/reviews',           roles: ['ETHICS_COMMITTEE_MEMBER','ADMIN_STAFF','INSTITUTIONAL_LEADERSHIP'] },
    ],
  },
  {
    section: 'Administration',
    roles: ['INSTITUTIONAL_LEADERSHIP','ADMIN_STAFF'],
    items: [
      { icon: DirectoryIcon,     label: 'Researcher Directory', path: '/admin-staff/research/directory',       roles: ['INSTITUTIONAL_LEADERSHIP','ADMIN_STAFF'] },
      { icon: WorkflowIcon,      label: 'Workflows',            path: '/admin-staff/admin/workflows',          roles: ['INSTITUTIONAL_LEADERSHIP','ADMIN_STAFF'] },
    ],
  },
  {
    section: 'Capacity Building',
    roles: ['INSTITUTIONAL_LEADERSHIP','ADMIN_STAFF','GRANT_MANAGER','DATA_STEWARD','ETHICS_COMMITTEE_MEMBER'],
    items: [
      { icon: TrainingIcon,      label: 'Overview',             path: '/admin-staff/training',                          roles: ['INSTITUTIONAL_LEADERSHIP','ADMIN_STAFF','GRANT_MANAGER','DATA_STEWARD','ETHICS_COMMITTEE_MEMBER'] },
      { icon: ProgramsIcon,      label: 'Training Programmes',  path: '/admin-staff/training/programs',                 roles: ['INSTITUTIONAL_LEADERSHIP','ADMIN_STAFF','GRANT_MANAGER'] },
      { icon: EnrollmentsIcon,   label: 'Enrollments',          path: '/admin-staff/training/enrollments',              roles: ['INSTITUTIONAL_LEADERSHIP','ADMIN_STAFF','GRANT_MANAGER'] },
      { icon: NeedsIcon,         label: 'Needs Assessments',    path: '/admin-staff/training/needs-assessment',         roles: ['INSTITUTIONAL_LEADERSHIP','ADMIN_STAFF'] },
    ],
  },
  {
    section: 'MoU Management',
    roles: ['MOU_ADMIN','LEGAL_OFFICER','PARTNERSHIP_COORDINATOR','INSTITUTIONAL_LEADERSHIP','GRANT_MANAGER','ADMIN_STAFF'],
    items: [
      { icon: MouIcon,           label: 'MoU Overview',         path: '/admin-staff/mou',                      roles: ['MOU_ADMIN','LEGAL_OFFICER','PARTNERSHIP_COORDINATOR','INSTITUTIONAL_LEADERSHIP','GRANT_MANAGER','ADMIN_STAFF'] },
      { icon: NewMouIcon,        label: 'New Agreement',        path: '/admin-staff/mou/create',               roles: ['MOU_ADMIN','PARTNERSHIP_COORDINATOR','INSTITUTIONAL_LEADERSHIP','GRANT_MANAGER','ADMIN_STAFF'] },
      { icon: MouListIcon,       label: 'All Agreements',       path: '/admin-staff/mou/list',                 roles: ['MOU_ADMIN','LEGAL_OFFICER','PARTNERSHIP_COORDINATOR','INSTITUTIONAL_LEADERSHIP','GRANT_MANAGER','ADMIN_STAFF'] },
      { icon: MouPartnersIcon,   label: 'Partner Registry',     path: '/admin-staff/mou/partners',             roles: ['MOU_ADMIN','PARTNERSHIP_COORDINATOR','INSTITUTIONAL_LEADERSHIP','GRANT_MANAGER','ADMIN_STAFF'] },
      { icon: MouQueueIcon,      label: 'Approval Queue',       path: '/admin-staff/mou/approvals',            roles: ['MOU_ADMIN','LEGAL_OFFICER','INSTITUTIONAL_LEADERSHIP'] },
      { icon: MouAnalyticsIcon,  label: 'Analytics & Reports',  path: '/admin-staff/mou/analytics',            roles: ['MOU_ADMIN','PARTNERSHIP_COORDINATOR','INSTITUTIONAL_LEADERSHIP','GRANT_MANAGER'] },
    ],
  },
  {
    section: 'Data Module B',
    roles: ['DATA_ENGINEER','INSTITUTIONAL_LEADERSHIP'],
    items: [
      { icon: PipelineDataIcon, label: 'ETL Pipelines',         path: '/admin-staff/data/pipelines',  roles: ['DATA_ENGINEER'] },
      { icon: AnalyticsIcon,    label: 'Analytics Workspace',   path: '/admin-staff/analytics',       roles: ['DATA_ENGINEER','INSTITUTIONAL_LEADERSHIP'] },
    ],
  },
  {
    section: 'External Reviews',
    roles: ['EXTERNAL_REVIEWER'],
    items: [
      { icon: StarIcon, label: 'Assigned Reviews', path: '/reviewer/tasks', roles: ['EXTERNAL_REVIEWER'] },
    ],
  },
];

function isVisible(itemRoles, userRole) {
  if (itemRoles === 'all') return true;
  return Array.isArray(itemRoles) && itemRoles.includes(userRole);
}

function isPathActive(pathname, path) {
  return pathname === path
    || (path !== '/admin-staff/research/projects' && pathname.startsWith(path + '/'));
}

function findActiveSection(sections, pathname) {
  for (const { section, items } of sections) {
    if (items.some(item => isPathActive(pathname, item.path))) return section;
  }
  return null;
}

function buildDefaultExpanded(sections, pathname, saved = {}) {
  const active = findActiveSection(sections, pathname);
  const next = { ...saved };
  sections.forEach(({ section }) => {
    if (ALWAYS_EXPANDED.has(section)) {
      next[section] = true;
    } else if (next[section] === undefined) {
      next[section] = section === active;
    }
  });
  if (active) next[active] = true;
  return next;
}

export default function AdminStaffSidebar() {
  const router   = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const theme = useMuiTheme();
  const dark = theme.palette.mode === 'dark';

  const role   = user?.primary_account_type || 'ADMIN_STAFF';
  const meta   = ROLE_META[role] || ROLE_META.ADMIN_STAFF;
  const tokens = sidebarTokens(dark);
  const accent = tokens.accent;

  const visibleSections = useMemo(
    () => NAV_SECTIONS
      .map(s => ({ ...s, items: s.items.filter(i => isVisible(i.roles, role)) }))
      .filter(s => s.items.length > 0),
    [role],
  );

  const [expanded, setExpanded] = useState({ Main: true });

  useEffect(() => {
    let saved = {};
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) saved = JSON.parse(raw);
    } catch {}
    setExpanded(buildDefaultExpanded(visibleSections, pathname, saved));
  }, [visibleSections, pathname]);

  const toggleSection = useCallback((section) => {
    if (ALWAYS_EXPANDED.has(section)) return;
    setExpanded(prev => {
      if (!prev) return prev;
      const next = { ...prev, [section]: !prev[section] };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const handleLogout = () => { logout(); router.push('/login'); };

  const NavItem = ({ icon: Icon, label, path }) => {
    const isActive = isPathActive(pathname, path);
    return (
      <Box
        onClick={() => router.push(path)}
        sx={{
          display: 'flex', alignItems: 'center', gap: 1.25,
          pl: 2.25, pr: 1.5, py: 0.9, cursor: 'pointer', borderRadius: 1.5,
          bgcolor: isActive ? tokens.accentSoft : 'transparent',
          color: isActive ? tokens.navActive : tokens.nav,
          transition: 'all 0.15s ease',
          WebkitFontSmoothing: 'antialiased',
          '&:hover': {
            bgcolor: isActive ? tokens.accentHover : 'action.hover',
            color: isActive ? tokens.navActive : tokens.navHover,
          },
        }}
      >
        <Icon sx={{ fontSize: 17, flexShrink: 0, color: 'inherit' }} />
        <Typography sx={{
          fontSize: 13, fontWeight: isActive ? 600 : 500,
          lineHeight: 1.35, letterSpacing: '0.01em',
        }}>
          {label}
        </Typography>
      </Box>
    );
  };

  const NavSection = ({ section, items }) => {
    const isMain = ALWAYS_EXPANDED.has(section);
    const isOpen = expanded?.[section] ?? isMain;
    const hasActiveChild = items.some(item => isPathActive(pathname, item.path));
    const collapsible = !isMain;

    return (
      <Box sx={{ mb: 0.25 }}>
        <Box
          onClick={() => collapsible && toggleSection(section)}
          onKeyDown={(e) => {
            if (collapsible && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              toggleSection(section);
            }
          }}
          role={collapsible ? 'button' : undefined}
          tabIndex={collapsible ? 0 : undefined}
          aria-expanded={collapsible ? isOpen : undefined}
          sx={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            px: 1.25, py: 0.9, mx: 0.5, mt: 1.25, borderRadius: 1.5,
            cursor: collapsible ? 'pointer' : 'default',
            userSelect: 'none',
            bgcolor: hasActiveChild && !isOpen ? tokens.accentSoft : 'transparent',
            transition: 'background-color 0.15s ease',
            '&:hover': collapsible ? { bgcolor: hasActiveChild ? tokens.accentHover : 'action.hover' } : {},
            '&:focus-visible': collapsible ? { outline: `2px solid ${tokens.accent}`, outlineOffset: 1 } : {},
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
            <Typography sx={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: hasActiveChild ? tokens.sectionActive : tokens.section,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              WebkitFontSmoothing: 'antialiased',
            }}>
              {section}
            </Typography>
            {collapsible && !isOpen && (
              <Typography component="span" sx={{
                fontSize: 10, fontWeight: 700, color: tokens.badgeText,
                bgcolor: tokens.badgeBg,
                px: 0.75, py: 0.2, borderRadius: 1, flexShrink: 0,
                lineHeight: 1.2,
              }}>
                {items.length}
              </Typography>
            )}
          </Box>
          {collapsible && (
            <ExpandMoreIcon sx={{
              fontSize: 18, color: hasActiveChild ? tokens.sectionActive : tokens.muted, flexShrink: 0,
              transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
              transition: 'transform 0.22s ease',
            }} />
          )}
        </Box>

        <Collapse in={isOpen} timeout={220} easing={{ enter: 'cubic-bezier(0.4, 0, 0.2, 1)', exit: 'cubic-bezier(0.4, 0, 0.2, 1)' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.15, pb: 0.5, pt: 0.15 }}>
            {items.map(item => <NavItem key={item.path} {...item} />)}
          </Box>
        </Collapse>
      </Box>
    );
  };

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'AS';

  return (
    <Box sx={{
      width: 236, bgcolor: 'background.paper',
      borderRight: 1, borderColor: 'divider',
      display: 'flex', flexDirection: 'column',
      height: '100vh', position: 'sticky', top: 0,
      flexShrink: 0,
    }}>
      <Box sx={{ px: 1.75, py: 1.75, borderBottom: 1, borderColor: 'divider' }}>
        {user?.institution_name && (
          <Box sx={{ mb: 1.25 }}>
            <Chip
              label={user.institution_name}
              size="small"
              sx={{
                width: '100%',
                bgcolor: dark ? '#0d9488' : ACCENT,
                color: '#fff',
                fontWeight: 700,
                fontSize: 11.5,
                height: 28,
                borderRadius: 1.5,
                '& .MuiChip-label': {
                  px: 1.25,
                  whiteSpace: 'normal',
                  textAlign: 'center',
                  lineHeight: 1.35,
                  letterSpacing: '0.01em',
                },
              }}
            />
          </Box>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Box sx={{
            width: 36, height: 36, borderRadius: 1.75, flexShrink: 0,
            background: `linear-gradient(145deg, ${accent} 0%, #0d9488 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, color: '#fff',
            boxShadow: `0 2px 8px ${accent}30`,
          }}>
            {initials}
          </Box>
          <Box sx={{ overflow: 'hidden', minWidth: 0 }}>
            <Typography sx={{
              color: tokens.name, fontSize: 13.5, fontWeight: 700,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              lineHeight: 1.3, letterSpacing: '0.01em',
              WebkitFontSmoothing: 'antialiased',
            }}>
              {user?.name || 'Staff Member'}
            </Typography>
            <Typography sx={{
              color: tokens.role, fontSize: 11.5, fontWeight: 600, mt: 0.15,
              lineHeight: 1.3, letterSpacing: '0.02em',
            }}>
              {meta.label}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{
        flex: 1,
        overflowY: 'auto',
        py: 0.5,
        px: 0.5,
        ...subtleScrollbarSx(dark),
      }}>
        {visibleSections.map(({ section, items }) => (
          <NavSection key={section} section={section} items={items} />
        ))}
      </Box>

      <Box sx={{ p: 1.25, borderTop: 1, borderColor: 'divider' }}>
        <Box onClick={handleLogout} sx={{
          display: 'flex', alignItems: 'center', gap: 1.25,
          px: 1.5, py: 1, cursor: 'pointer', borderRadius: 1.5,
          color: tokens.nav, transition: 'all 0.15s',
          '&:hover': { bgcolor: 'action.hover', color: 'error.main' },
        }}>
          <LogoutIcon sx={{ fontSize: 17 }} />
          <Typography sx={{ fontSize: 13, fontWeight: 500, letterSpacing: '0.01em' }}>Logout</Typography>
        </Box>
      </Box>
    </Box>
  );
}
