'use client';

import { Box, Typography } from '@mui/material';
import {
  Dashboard as DashIcon, Person as PersonIcon,
  Search as SearchIcon, Description as ProposalIcon,
  ViewKanban as PipelineIcon, RateReview as ReviewIcon,
  EmojiEvents as AwardIcon, Business as FunderIcon,
  Summarize as ReportIcon, AccountBalance as BudgetIcon,
  Payments as DisbIcon, Receipt as ExpenseIcon,
  Gavel as EthicsIcon, FactCheck as DecisionIcon,
  Science as ProjectIcon, Groups as TeamsIcon,
  LibraryBooks as OutputsIcon, PeopleAlt as DirectoryIcon,
  DynamicForm as FormIcon, TableChart as SubmissionIcon,
  Storage as RepositoryIcon, Hub as PipelineDataIcon,
  Analytics as AnalyticsIcon, ExitToApp as LogoutIcon,
  Star as StarIcon,
} from '@mui/icons-material';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { useTheme as useMuiTheme } from '@mui/material/styles';

const ROLE_META = {
  GRANT_MANAGER:            { label: 'Grant Manager',         color: '#8b5cf6' },
  FINANCE_OFFICER:          { label: 'Finance Officer',        color: '#f59e0b' },
  ETHICS_COMMITTEE_MEMBER:  { label: 'Ethics Committee',       color: '#10b981' },
  DATA_STEWARD:             { label: 'Data Steward',           color: '#0ea5e9' },
  DATA_ENGINEER:            { label: 'Data Engineer',          color: '#06b6d4' },
  INSTITUTIONAL_LEADERSHIP: { label: 'Institutional Lead',     color: '#ef4444' },
  EXTERNAL_REVIEWER:        { label: 'External Reviewer',      color: '#f97316' },
  GUEST_COLLABORATOR:       { label: 'Guest Collaborator',     color: '#64748b' },
  EXTERNAL_FUNDER:          { label: 'External Funder',        color: '#a855f7' },
  ADMIN_STAFF:              { label: 'Admin Staff',            color: '#6366f1' },
};

// roles: 'all' | array of PrimaryAccountType values
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
      { icon: ProposalIcon,  label: 'Proposals',        path: '/admin-staff/grants/proposals',     roles: ['GRANT_MANAGER','INSTITUTIONAL_LEADERSHIP','ADMIN_STAFF'] },
      { icon: PipelineIcon,  label: 'Pipeline',         path: '/admin-staff/grants/pipeline',      roles: ['GRANT_MANAGER','INSTITUTIONAL_LEADERSHIP','ADMIN_STAFF'] },
      { icon: ReviewIcon,    label: 'Reviews',          path: '/admin-staff/grants/reviews',       roles: ['GRANT_MANAGER','INSTITUTIONAL_LEADERSHIP'] },
      { icon: AwardIcon,     label: 'Awards',           path: '/admin-staff/grants/awards',        roles: ['GRANT_MANAGER','FINANCE_OFFICER','INSTITUTIONAL_LEADERSHIP'] },
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
    section: 'Ethics & IRB',
    roles: ['ETHICS_COMMITTEE_MEMBER','INSTITUTIONAL_LEADERSHIP','ADMIN_STAFF'],
    items: [
      { icon: EthicsIcon,   label: 'Applications',     path: '/admin-staff/ethics/applications', roles: ['ETHICS_COMMITTEE_MEMBER','INSTITUTIONAL_LEADERSHIP','ADMIN_STAFF'] },
      { icon: ReviewIcon,   label: 'My Reviews',       path: '/admin-staff/ethics/reviews',      roles: ['ETHICS_COMMITTEE_MEMBER'] },
      { icon: DecisionIcon, label: 'Decisions',        path: '/admin-staff/ethics/decisions',    roles: ['ETHICS_COMMITTEE_MEMBER','INSTITUTIONAL_LEADERSHIP'] },
    ],
  },
  {
    section: 'Research Management',
    roles: ['INSTITUTIONAL_LEADERSHIP','DATA_STEWARD','ETHICS_COMMITTEE_MEMBER','ADMIN_STAFF','GRANT_MANAGER'],
    items: [
      { icon: ProjectIcon,   label: 'Projects',             path: '/admin-staff/research/projects',  roles: ['INSTITUTIONAL_LEADERSHIP','DATA_STEWARD','ETHICS_COMMITTEE_MEMBER','ADMIN_STAFF','GRANT_MANAGER'] },
      { icon: TeamsIcon,     label: 'Teams & Members',      path: '/admin-staff/research/teams',     roles: ['INSTITUTIONAL_LEADERSHIP','ADMIN_STAFF'] },
      { icon: OutputsIcon,   label: 'Research Outputs',     path: '/admin-staff/research/outputs',   roles: ['INSTITUTIONAL_LEADERSHIP','ADMIN_STAFF','GRANT_MANAGER'] },
      { icon: DirectoryIcon, label: 'Researcher Directory', path: '/admin-staff/research/directory', roles: ['INSTITUTIONAL_LEADERSHIP','ADMIN_STAFF'] },
    ],
  },
  {
    section: 'Data Module A',
    roles: ['DATA_STEWARD','DATA_ENGINEER','INSTITUTIONAL_LEADERSHIP','ADMIN_STAFF'],
    items: [
      { icon: FormIcon,       label: 'Capture Forms',    path: '/admin-staff/data/capture',     roles: ['DATA_STEWARD','DATA_ENGINEER','INSTITUTIONAL_LEADERSHIP','ADMIN_STAFF'] },
      { icon: SubmissionIcon, label: 'Submissions & QA', path: '/admin-staff/data/submissions', roles: ['DATA_STEWARD','DATA_ENGINEER','INSTITUTIONAL_LEADERSHIP'] },
      { icon: RepositoryIcon, label: 'Repository',       path: '/admin-staff/data/repository',  roles: ['DATA_STEWARD','INSTITUTIONAL_LEADERSHIP'] },
      { icon: AnalyticsIcon,  label: 'Datasets',         path: '/admin-staff/data/datasets',    roles: ['DATA_STEWARD','DATA_ENGINEER','INSTITUTIONAL_LEADERSHIP'] },
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
      { icon: StarIcon, label: 'Assigned Reviews', path: '/admin-staff/reviews', roles: ['EXTERNAL_REVIEWER'] },
    ],
  },
];

function isVisible(itemRoles, userRole) {
  if (itemRoles === 'all') return true;
  return Array.isArray(itemRoles) && itemRoles.includes(userRole);
}

export default function AdminStaffSidebar() {
  const router   = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const theme = useMuiTheme();

  const role   = user?.primary_account_type || 'ADMIN_STAFF';
  const meta   = ROLE_META[role] || ROLE_META.ADMIN_STAFF;
  const accent = meta.color;

  const handleLogout = () => { logout(); router.push('/login'); };

  const NavItem = ({ icon: Icon, label, path }) => {
    const active = pathname === path || pathname.startsWith(path + '/');
    return (
      <Box onClick={() => router.push(path)} sx={{
        display: 'flex', alignItems: 'center', gap: 1.5,
        px: 1.5, py: 1.1, cursor: 'pointer', borderRadius: 2,
        bgcolor: active ? accent : 'transparent',
        color: active ? '#fff' : 'text.secondary',
        transition: 'all 0.15s',
        '&:hover': { bgcolor: active ? accent : 'action.hover', color: active ? '#fff' : 'text.primary' },
      }}>
        <Icon sx={{ fontSize: 16, flexShrink: 0 }} />
        <Typography sx={{ fontSize: 13, fontWeight: active ? 600 : 500 }}>{label}</Typography>
      </Box>
    );
  };

  const SectionLabel = ({ label }) => (
    <Typography sx={{
      color: 'text.disabled', fontSize: 9.5, fontWeight: 700, letterSpacing: 0.8,
      textTransform: 'uppercase', px: 1.5, pt: 2, pb: 0.3,
    }}>
      {label}
    </Typography>
  );

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'AS';

  const visibleSections = NAV_SECTIONS
    .map(s => ({ ...s, items: s.items.filter(i => isVisible(i.roles, role)) }))
    .filter(s => s.items.length > 0);

  return (
    <Box sx={{
      width: 230, bgcolor: 'background.paper',
      borderRight: 1, borderColor: 'divider',
      display: 'flex', flexDirection: 'column',
      minHeight: '100vh', flexShrink: 0,
    }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{
            width: 38, height: 38, borderRadius: 2, flexShrink: 0,
            background: `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 700, color: '#fff',
          }}>
            {initials}
          </Box>
          <Box sx={{ overflow: 'hidden', minWidth: 0 }}>
            <Typography sx={{ color: 'text.primary', fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.name || 'Staff Member'}
            </Typography>
            <Typography sx={{ color: accent, fontSize: 10.5, fontWeight: 600 }}>{meta.label}</Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', py: 0.5, px: 0.75 }}>
        {visibleSections.map(({ section, items }) => (
          <Box key={section}>
            <SectionLabel label={section} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.2 }}>
              {items.map(item => <NavItem key={item.path} {...item} />)}
            </Box>
          </Box>
        ))}
      </Box>

      <Box sx={{ p: 1.25, borderTop: 1, borderColor: 'divider' }}>
        <Box onClick={handleLogout} sx={{
          display: 'flex', alignItems: 'center', gap: 1.5,
          px: 1.5, py: 1.1, cursor: 'pointer', borderRadius: 2,
          color: 'text.secondary', transition: 'all 0.15s',
          '&:hover': { bgcolor: 'action.hover', color: 'error.main' },
        }}>
          <LogoutIcon sx={{ fontSize: 16 }} />
          <Typography sx={{ fontSize: 13, fontWeight: 500 }}>Logout</Typography>
        </Box>
      </Box>
    </Box>
  );
}
