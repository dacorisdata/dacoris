'use client';

import { useState, useMemo, useCallback } from 'react';
import { Box, Typography, Tooltip, Collapse } from '@mui/material';
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
  ExpandMore as ExpandIcon, RateReview as ReviewersIcon,
  Assessment as ReportsAnalyticsIcon,
  Storage as StorageIcon,
  School as PgIcon,
  Groups as PgStudentsIcon,
  Warning as InterventionIcon,
  CheckCircle as ClearanceIcon,
  AssignmentInd as SupervisorAssignIcon,
} from '@mui/icons-material';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { isUniversityInstitution } from '../lib/institutionTypes';
import { subtleScrollbarSx } from '../lib/scrollStyles';
import { sidebarTheme, SIDEBAR_FONTS, SIDEBAR_WIDTH } from '../lib/sidebarTheme';

const STORAGE_KEY = 'dacoris-admin-sidebar-sections';

function loadSavedExpanded() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

const LEADERSHIP_ROLES = new Set([
  'INSTITUTIONAL_LEADERSHIP',
  'DVC_RESEARCH',
  'DIRECTOR_RESEARCH',
  'HEAD_OF_PG_STUDIES',
]);

const ROLE_META = {
  GRANT_MANAGER:            { label: 'Grant Manager' },
  FINANCE_OFFICER:          { label: 'Finance Officer' },
  ETHICS_COMMITTEE_MEMBER:  { label: 'Ethics Committee' },
  DATA_STEWARD:             { label: 'Data Steward' },
  DATA_ENGINEER:            { label: 'Data Engineer' },
  INSTITUTIONAL_LEADERSHIP: { label: 'Institutional Lead' },
  DVC_RESEARCH:             { label: 'DVC (Research)' },
  DIRECTOR_RESEARCH:        { label: 'Director of Research' },
  RESEARCH_ADMINISTRATOR:   { label: 'Research Administrator' },
  LIBRARIAN:                { label: 'Librarian' },
  EXTERNAL_REVIEWER:        { label: 'External Reviewer' },
  GUEST_COLLABORATOR:       { label: 'Guest Collaborator' },
  EXTERNAL_FUNDER:          { label: 'External Funder' },
  ADMIN_STAFF:              { label: 'Admin Staff' },
  HEAD_OF_PG_STUDIES:       { label: 'Head of PG Studies' },
  PG_COORDINATOR:           { label: 'PG Coordinator' },
  SUPERVISOR:               { label: 'Supervisor' },
  EXTERNAL_SUPERVISOR:      { label: 'External Supervisor' },
  POSTGRADUATE_STUDENT:     { label: 'Postgraduate Student' },
  MOU_ADMIN:                { label: 'MoU Administrator' },
  LEGAL_OFFICER:            { label: 'Legal Officer' },
  PARTNERSHIP_COORDINATOR:  { label: 'Partnership Coordinator' },
};

const NAV_SECTIONS = [
  {
    section: 'Main',
    items: [
      { icon: DashIcon,    label: 'Overview',    path: '/admin-staff/overview', roles: 'all' },
      { icon: ReportsAnalyticsIcon, label: 'Reports & Analytics', path: '/admin-staff/reports', roles: ['INSTITUTIONAL_LEADERSHIP','ADMIN_STAFF','GRANT_MANAGER','FINANCE_OFFICER','ETHICS_COMMITTEE_MEMBER','DATA_STEWARD'] },
    ],
  },
  {
    section: 'Grants Management',
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
    section: 'Post Graduate Supervision',
    universityOnly: true,
    roles: ['INSTITUTIONAL_LEADERSHIP', 'ADMIN_STAFF', 'PG_COORDINATOR', 'HEAD_OF_PG_STUDIES'],
    items: [
      { icon: PgIcon, label: 'PG Control Tower', path: '/admin-staff/postgraduate', roles: ['INSTITUTIONAL_LEADERSHIP', 'ADMIN_STAFF', 'PG_COORDINATOR', 'HEAD_OF_PG_STUDIES'] },
      { icon: PgStudentsIcon, label: 'Students & Stages', path: '/admin-staff/postgraduate/students', roles: ['INSTITUTIONAL_LEADERSHIP', 'ADMIN_STAFF', 'PG_COORDINATOR', 'HEAD_OF_PG_STUDIES'] },
      { icon: SupervisorAssignIcon, label: 'Supervisor Assignments', path: '/admin-staff/postgraduate/supervisor-assignments', roles: ['INSTITUTIONAL_LEADERSHIP', 'ADMIN_STAFF', 'PG_COORDINATOR', 'HEAD_OF_PG_STUDIES'] },
      { icon: InterventionIcon, label: 'Interventions', path: '/admin-staff/postgraduate/interventions', roles: ['INSTITUTIONAL_LEADERSHIP', 'ADMIN_STAFF', 'PG_COORDINATOR', 'HEAD_OF_PG_STUDIES'] },
      { icon: ClearanceIcon, label: 'Graduation Clearance', path: '/admin-staff/postgraduate/clearance', roles: ['INSTITUTIONAL_LEADERSHIP', 'ADMIN_STAFF', 'PG_COORDINATOR', 'HEAD_OF_PG_STUDIES'] },
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
    section: 'Projects Management',
    roles: ['INSTITUTIONAL_LEADERSHIP','DATA_STEWARD','ETHICS_COMMITTEE_MEMBER','ADMIN_STAFF','GRANT_MANAGER'],
    items: [
      { icon: ProjectReviewIcon, label: 'Project Review',       path: '/admin-staff/research/projects/review', roles: ['INSTITUTIONAL_LEADERSHIP','ADMIN_STAFF','GRANT_MANAGER'] },
      { icon: ProjectIcon,       label: 'Projects Tracking',    path: '/admin-staff/research/projects',        roles: ['INSTITUTIONAL_LEADERSHIP','DATA_STEWARD','ETHICS_COMMITTEE_MEMBER','ADMIN_STAFF','GRANT_MANAGER'] },
      { icon: ReviewIcon,        label: 'Ethics Review',        path: '/admin-staff/ethics/reviews',           roles: ['ETHICS_COMMITTEE_MEMBER','ADMIN_STAFF','INSTITUTIONAL_LEADERSHIP'] },
      { icon: StorageIcon,       label: 'Imported Data',        path: '/admin-staff/data/imports',             roles: ['INSTITUTIONAL_LEADERSHIP','ADMIN_STAFF','DATA_STEWARD','GRANT_MANAGER'] },
    ],
  },
  {
    section: 'Administration',
    roles: ['INSTITUTIONAL_LEADERSHIP','ADMIN_STAFF'],
    items: [
      { icon: DirectoryIcon,     label: 'Researcher Directory', path: '/admin-staff/research/directory',       roles: ['INSTITUTIONAL_LEADERSHIP','ADMIN_STAFF'] },
      { icon: ReviewersIcon,     label: 'Reviewers',            path: '/admin-staff/admin/reviewers',          roles: ['INSTITUTIONAL_LEADERSHIP','ADMIN_STAFF'] },
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
    section: 'Partnerships and Collaborations',
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
  if (!Array.isArray(itemRoles)) return false;
  if (itemRoles.includes(userRole)) return true;
  if (LEADERSHIP_ROLES.has(userRole) && itemRoles.includes('INSTITUTIONAL_LEADERSHIP')) return true;
  if (userRole === 'RESEARCH_ADMINISTRATOR' && itemRoles.includes('ADMIN_STAFF')) return true;
  if (userRole === 'LIBRARIAN' && itemRoles.includes('DATA_STEWARD')) return true;
  return false;
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
    if (next[section] === undefined) {
      next[section] = true;
    }
  });
  if (active) next[active] = true;
  return next;
}

export default function AdminStaffSidebar() {
  const router   = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const dark = true;
  const tokens = sidebarTheme(true);
  const accent = tokens.accent;

  const role   = user?.primary_account_type || 'ADMIN_STAFF';
  const meta   = ROLE_META[role] || ROLE_META.ADMIN_STAFF || { label: 'Staff' };

  const visibleSections = useMemo(
    () => NAV_SECTIONS
      .filter(s => !s.universityOnly || isUniversityInstitution(user))
      .map(s => ({ ...s, items: s.items.filter(i => isVisible(i.roles, role)) }))
      .filter(s => s.items.length > 0),
    [role, user],
  );

  const [userExpanded, setUserExpanded] = useState(loadSavedExpanded);

  const expanded = useMemo(
    () => buildDefaultExpanded(visibleSections, pathname, userExpanded),
    [visibleSections, pathname, userExpanded],
  );

  const toggleSection = useCallback((section) => {
    setUserExpanded(prev => {
      const current = buildDefaultExpanded(visibleSections, pathname, prev);
      const next = { ...current, [section]: !current[section] };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [visibleSections, pathname]);

  const handleLogout = () => { logout(); router.push('/login'); };

  const NavItem = ({ icon: Icon, label, path }) => {
    const isActive = isPathActive(pathname, path);
    return (
      <Tooltip title={label} placement="right" disableHoverListener enterDelay={600}>
        <Box
          onClick={() => router.push(path)}
          sx={{
            display: 'flex', alignItems: 'center', gap: 1.5,
            px: 1.5, py: 1, mx: 0.5, cursor: 'pointer', borderRadius: '8px',
            bgcolor: isActive ? tokens.accentSoft : 'transparent',
            color: isActive ? tokens.navActive : tokens.nav,
            position: 'relative',
            transition: 'all 0.15s ease',
            '&:hover': {
              bgcolor: isActive ? tokens.accentHover : tokens.itemHoverBg,
              color: isActive ? tokens.navActive : tokens.navHover,
            },
            '&::before': isActive ? {
              content: '""',
              position: 'absolute', left: -4, top: '20%', bottom: '20%',
              width: 3, borderRadius: 4,
              bgcolor: accent,
            } : {},
          }}
        >
          <Icon sx={{ fontSize: SIDEBAR_FONTS.itemIcon, flexShrink: 0, opacity: isActive ? 1 : 0.75 }} />
          <Typography sx={{
            fontSize: SIDEBAR_FONTS.item,
            fontWeight: isActive ? 650 : 450,
            letterSpacing: 0.1,
            lineHeight: 1.35,
          }}>
            {label}
          </Typography>
          {isActive && (
            <Box sx={{
              ml: 'auto', width: 5, height: 5, borderRadius: '50%',
              bgcolor: accent, flexShrink: 0,
            }} />
          )}
        </Box>
      </Tooltip>
    );
  };

  const NavSection = ({ section, items }) => {
    const isOpen = expanded?.[section] ?? true;
    const hasActiveChild = items.some(item => isPathActive(pathname, item.path));

    return (
      <Box sx={{ mb: 0.5 }}>
        <Box
          onClick={() => toggleSection(section)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggleSection(section);
            }
          }}
          role="button"
          tabIndex={0}
          aria-expanded={isOpen}
          sx={{
            display: 'flex', alignItems: 'center', gap: 1,
            px: 2, pt: 2.5, pb: 0.75,
            cursor: 'pointer',
            userSelect: 'none',
            '&:hover .section-label': { color: tokens.navHover },
          }}
        >
          <Typography
            className="section-label"
            sx={{
              fontSize: SIDEBAR_FONTS.section,
              fontWeight: 700,
              letterSpacing: 0.8,
              textTransform: 'uppercase',
              color: hasActiveChild ? tokens.sectionActive : tokens.section,
              transition: 'color 0.15s',
              flex: 1,
              lineHeight: 1.35,
              pr: 0.5,
            }}
          >
            {section}
          </Typography>
          <ExpandIcon
            sx={{
              fontSize: 16,
              color: hasActiveChild ? tokens.sectionActive : tokens.muted,
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />
        </Box>

        <Collapse
          in={isOpen}
          timeout={280}
          easing={{
            enter: 'cubic-bezier(0.4, 0, 0.2, 1)',
            exit: 'cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          unmountOnExit={false}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3 }}>
            {items.map(item => <NavItem key={item.path} {...item} />)}
          </Box>
        </Collapse>
      </Box>
    );
  };

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'AS';

  return (
    <Box sx={{
      width: SIDEBAR_WIDTH,
      bgcolor: tokens.bg,
      borderRight: 1,
      borderColor: tokens.border,
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'sticky',
      top: 0,
      flexShrink: 0,
    }}>
      <Box sx={{
        px: 2, pt: 2.5, pb: 2,
        borderBottom: 1,
        borderColor: tokens.border,
        background: tokens.headerBg,
      }}>
        {user?.institution_name && (
          <Box sx={{ mb: 1.75 }}>
            <Typography sx={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 0.8,
              textTransform: 'uppercase',
              color: tokens.muted,
              mb: 0.6,
              px: 0.25,
            }}>
              {t('navbar.institution')}
            </Typography>
            <Box sx={{
              display: 'inline-flex', alignItems: 'center',
              px: 1.25, py: 0.4, borderRadius: 1.5,
              bgcolor: tokens.accentBadgeBg,
              border: `1px solid ${tokens.accentBorder}`,
              maxWidth: '100%',
            }}>
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: accent, mr: 0.75, flexShrink: 0 }} />
              <Typography sx={{
                fontSize: SIDEBAR_FONTS.badge, fontWeight: 700, color: accent,
                letterSpacing: 0.3,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {user.institution_name}
              </Typography>
            </Box>
          </Box>
        )}

        <Box
          onClick={() => router.push('/admin-staff/profile')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') router.push('/admin-staff/profile'); }}
          sx={{
            display: 'flex', alignItems: 'center', gap: 1.5,
            mx: -0.75, px: 0.75, py: 0.75, borderRadius: 2,
            cursor: 'pointer',
            transition: 'background 0.15s ease',
            '&:hover': { bgcolor: tokens.itemHoverBg },
            '&:hover .profile-hint': { opacity: 1 },
          }}
        >
          <Box sx={{
            width: 40, height: 40, borderRadius: '10px', flexShrink: 0,
            background: `linear-gradient(135deg, ${accent} 0%, #0891b2 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: SIDEBAR_FONTS.userName, fontWeight: 700, color: '#fff',
            boxShadow: `0 2px 8px ${accent}40`,
          }}>
            {initials}
          </Box>
          <Box sx={{ overflow: 'hidden', minWidth: 0, flex: 1 }}>
            <Typography sx={{
              fontSize: SIDEBAR_FONTS.userName, fontWeight: 650, color: tokens.name,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              letterSpacing: 0.1,
            }}>
              {user?.name || 'Staff Member'}
            </Typography>
            <Typography sx={{ fontSize: SIDEBAR_FONTS.userRole, color: tokens.role, fontWeight: 500, mt: 0.1 }}>
              {user?.job_title || meta.label}
            </Typography>
            <Typography
              className="profile-hint"
              sx={{
                fontSize: 10.5,
                fontWeight: 600,
                color: tokens.muted,
                mt: 0.35,
                opacity: 0.85,
                transition: 'opacity 0.15s',
              }}
            >
              {t('navbar.profile')}
            </Typography>
          </Box>
          <PersonIcon sx={{ fontSize: 16, color: tokens.muted, flexShrink: 0, opacity: 0.7 }} />
        </Box>
      </Box>

      <Box sx={{
        flex: 1,
        overflowY: 'auto',
        py: 0.5,
        ...subtleScrollbarSx(dark),
      }}>
        {visibleSections.map(({ section, items }) => (
          <NavSection key={section} section={section} items={items} />
        ))}
      </Box>

      <Box sx={{
        px: 1.5, py: 1.25,
        borderTop: 1,
        borderColor: tokens.border,
      }}>
        <Box
          onClick={handleLogout}
          sx={{
            display: 'flex', alignItems: 'center', gap: 1.5,
            px: 1.5, py: 1, cursor: 'pointer', borderRadius: '8px',
            color: tokens.signOut,
            transition: 'all 0.15s ease',
            '&:hover': {
              bgcolor: 'rgba(239,68,68,0.08)',
              color: '#ef4444',
            },
          }}
        >
          <LogoutIcon sx={{ fontSize: SIDEBAR_FONTS.itemIcon }} />
          <Typography sx={{ fontSize: SIDEBAR_FONTS.signOut, fontWeight: 500 }}>
            {t('navbar.logout')}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
