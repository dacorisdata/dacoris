'use client';

import { Box, Typography, Chip } from '@mui/material';
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
  Star as StarIcon, Inbox as InboxIcon, CheckCircle as EligibilityIcon,
  Biotech as TechIcon, AttachMoney as BudgetStageIcon,
  Groups2 as PanelIcon, Verified as FinalIcon,
  UploadFile as DataImportIcon, Grading as ProjectReviewIcon,
  FolderSpecial as DmpReviewIcon,
  Handshake as MouIcon, Groups as MouPartnersIcon,
  BarChart as MouAnalyticsIcon, NoteAdd as NewMouIcon,
  Gavel as LegalIcon, FormatListBulleted as MouListIcon,
  PendingActions as MouQueueIcon, AccountTree as WorkflowIcon,
} from '@mui/icons-material';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { useTheme as useMuiTheme } from '@mui/material/styles';

const ROLE_META = {
  GRANT_MANAGER:            { label: 'Grant Manager',         color: '#16a699' },
  FINANCE_OFFICER:          { label: 'Finance Officer',        color: '#16a699' },
  ETHICS_COMMITTEE_MEMBER:  { label: 'Ethics Committee',       color: '#16a699' },
  DATA_STEWARD:             { label: 'Data Steward',           color: '#16a699' },
  DATA_ENGINEER:            { label: 'Data Engineer',          color: '#16a699' },
  INSTITUTIONAL_LEADERSHIP: { label: 'Institutional Lead',     color: '#16a699' },
  EXTERNAL_REVIEWER:        { label: 'External Reviewer',      color: '#16a699' },
  GUEST_COLLABORATOR:       { label: 'Guest Collaborator',     color: '#16a699' },
  EXTERNAL_FUNDER:          { label: 'External Funder',        color: '#16a699' },
  ADMIN_STAFF:              { label: 'Admin Staff',            color: '#16a699' },
  MOU_ADMIN:                { label: 'MoU Administrator',      color: '#7c3aed' },
  LEGAL_OFFICER:            { label: 'Legal Officer',           color: '#7c3aed' },
  PARTNERSHIP_COORDINATOR:  { label: 'Partnership Coordinator', color: '#7c3aed' },
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
      { icon: DmpReviewIcon,     label: 'DMP Review',           path: '/admin-staff/dmp/reviews',              roles: ['DATA_STEWARD','INSTITUTIONAL_LEADERSHIP','ADMIN_STAFF','GRANT_MANAGER'] },
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
    const active = pathname === path || (path !== '/admin-staff/research/projects' && pathname.startsWith(path + '/'));
    const exactActive = pathname === path;
    const isActive = active || exactActive;
    return (
      <Box onClick={() => router.push(path)} sx={{
        display: 'flex', alignItems: 'center', gap: 1.5,
        px: 1.5, py: 1, cursor: 'pointer', borderRadius: 2,
        bgcolor: isActive ? `${accent}18` : 'transparent',
        borderLeft: isActive ? `3px solid ${accent}` : '3px solid transparent',
        color: isActive ? accent : 'text.secondary',
        transition: 'all 0.15s',
        '&:hover': { bgcolor: isActive ? `${accent}18` : 'action.hover', color: isActive ? accent : 'text.primary' },
      }}>
        <Icon sx={{ fontSize: 15, flexShrink: 0 }} />
        <Typography sx={{ fontSize: 12.5, fontWeight: isActive ? 700 : 500 }}>{label}</Typography>
      </Box>
    );
  };

  const SectionLabel = ({ label }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, pt: 2.5, pb: 0.5 }}>
      <Box sx={{ height: '1px', flex: 1, bgcolor: 'divider' }} />
      <Typography sx={{
        color: 'text.disabled', fontSize: 9, fontWeight: 800, letterSpacing: 1.1,
        textTransform: 'uppercase', whiteSpace: 'nowrap',
      }}>
        {label}
      </Typography>
      <Box sx={{ height: '1px', flex: 1, bgcolor: 'divider' }} />
    </Box>
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
        {/* Institution Name Badge */}
        {user?.institution_name && (
          <Box sx={{ mb: 1.5 }}>
            <Chip
              label={user.institution_name}
              size="small"
              sx={{
                width: '100%',
                bgcolor: accent,
                color: '#fff',
                fontWeight: 600,
                fontSize: 11,
                height: 24,
                '& .MuiChip-label': {
                  px: 1.5,
                  whiteSpace: 'normal',
                  textAlign: 'center',
                },
              }}
            />
          </Box>
        )}
        
        {/* User Info */}
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
