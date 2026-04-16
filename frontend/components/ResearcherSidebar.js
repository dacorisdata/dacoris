'use client';

import { Box, Typography } from '@mui/material';
import {
  Dashboard as DashIcon, Person as PersonIcon,
  Search as DiscoverIcon, Description as ProposalIcon,
  Assignment as ApplicationIcon, Science as ProjectIcon,
  Gavel as EthicsIcon, CheckCircle as MilestoneIcon,
  LibraryBooks as PublicationsIcon, Storage as DatasetsIcon,
  Summarize as ReportsIcon, DynamicForm as FormsIcon,
  Groups as CollabIcon, PersonAdd as InviteIcon,
  ExitToApp as LogoutIcon,
} from '@mui/icons-material';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { useTheme as useMuiTheme } from '@mui/material/styles';

const NAV_SECTIONS = [
  {
    section: 'Main',
    items: [
      { icon: DashIcon,   label: 'Overview',   path: '/researcher/overview' },
      { icon: PersonIcon, label: 'My Profile', path: '/researcher/profile' },
    ],
  },
  {
    section: 'Grants',
    items: [
      { icon: DiscoverIcon,     label: 'Discover Opportunities', path: '/researcher/grants/discover' },
      { icon: ProposalIcon,     label: 'My Proposals',           path: '/researcher/grants/proposals' },
      { icon: ApplicationIcon,  label: 'My Applications',        path: '/researcher/grants/applications' },
    ],
  },
  {
    section: 'Research Projects',
    items: [
      { icon: ProjectIcon,   label: 'My Projects',         path: '/researcher/projects' },
      { icon: MilestoneIcon, label: 'Milestones & Tasks',  path: '/researcher/projects/milestones' },
      { icon: EthicsIcon,    label: 'Ethics Applications', path: '/researcher/ethics' },
    ],
  },
  {
    section: 'Research Outputs',
    items: [
      { icon: PublicationsIcon, label: 'Publications',  path: '/researcher/publications' },
      { icon: DatasetsIcon,     label: 'My Datasets',   path: '/researcher/data/datasets' },
      { icon: ReportsIcon,      label: 'Reports',       path: '/researcher/data/reports' },
    ],
  },
  {
    section: 'Data Collection',
    items: [
      { icon: FormsIcon,    label: 'Capture Forms',   path: '/researcher/data/forms' },
      { icon: DatasetsIcon, label: 'Submissions',     path: '/researcher/data/submissions' },
    ],
  },
  {
    section: 'Collaboration',
    items: [
      { icon: CollabIcon, label: 'My Teams',    path: '/researcher/collaborations' },
      { icon: InviteIcon, label: 'Invitations', path: '/researcher/collaborations/invitations' },
    ],
  },
];

export default function ResearcherSidebar() {
  const router   = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const theme = useMuiTheme();
  const accent = '#1ca7a1';

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

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'R';

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
            background: `linear-gradient(135deg, ${accent} 0%, #0e7490 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 700, color: '#fff',
          }}>
            {initials}
          </Box>
          <Box sx={{ overflow: 'hidden', minWidth: 0 }}>
            <Typography sx={{ color: 'text.primary', fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.name || 'Researcher'}
            </Typography>
            <Typography sx={{ color: accent, fontSize: 10.5, fontWeight: 600 }}>
              {user?.job_title || 'Researcher'}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', py: 0.5, px: 0.75 }}>
        {NAV_SECTIONS.map(({ section, items }) => (
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
