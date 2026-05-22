'use client';

import { Box, Typography, Chip } from '@mui/material';
import {
  Dashboard as DashIcon, Person as PersonIcon,
  Search as DiscoverIcon, Description as ProposalIcon,
  Science as ProjectIcon,
  Gavel as EthicsIcon, CheckCircle as MilestoneIcon,
  LibraryBooks as PublicationsIcon, Storage as DatasetsIcon,
  Summarize as ReportsIcon, DynamicForm as FormsIcon,
  Groups as CollabIcon, PersonAdd as InviteIcon,
  ExitToApp as LogoutIcon,
  EmojiEvents as AwardIcon, FolderSpecial as DmpIcon,
  Create as ManuscriptIcon, Storage,
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
      { icon: AwardIcon,        label: 'My Awards',              path: '/researcher/grants/awards' },
    ],
  },
  {
    section: 'Research',
    subsections: [
      {
        title: '1. Projects',
        items: [
          { icon: ProjectIcon, label: 'My Projects',           path: '/researcher/projects' },
          { icon: EthicsIcon,  label: 'Ethics Applications',   path: '/researcher/ethics' },
          { icon: DmpIcon,     label: 'Data Mgmt Plans',       path: '/researcher/dmp' },
        ],
      },
      {
        title: '2. Research Discovery',
        items: [
          { icon: DiscoverIcon,     label: 'Import Publications',  path: '/researcher/publications' },
          { icon: PublicationsIcon, label: 'My Library',           path: '/researcher/publications/library' },
        ],
      },
      {
        title: '3. Writing Phase',
        items: [
          { icon: ManuscriptIcon, label: 'Manuscripts', path: '/researcher/manuscripts' },
        ],
      },
    ],
  },
  {
    section: 'Data Collection',
    items: [
      { icon: FormsIcon,    label: 'Data Import',   path: '/researcher/data/import' },
      { icon: Storage,      label: 'Data Lakes',    path: '/researcher/data/lakes' },
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
    const isActive = pathname === path || pathname.startsWith(path + '/');
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
      <Typography sx={{ color: 'text.disabled', fontSize: 9, fontWeight: 800, letterSpacing: 1.1, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
        {label}
      </Typography>
      <Box sx={{ height: '1px', flex: 1, bgcolor: 'divider' }} />
    </Box>
  );

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'R';

  return (
    <Box sx={{
      width: 230, bgcolor: 'background.paper',
      borderRight: 1, borderColor: 'divider',
      display: 'flex', flexDirection: 'column',
      height: '100vh', position: 'sticky', top: 0,
      flexShrink: 0,
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

      <Box sx={{ 
        flex: 1, 
        overflowY: 'auto', 
        py: 0.5, 
        px: 0.75,
        '&::-webkit-scrollbar': {
          width: '6px',
        },
        '&::-webkit-scrollbar-track': {
          bgcolor: 'transparent',
        },
        '&::-webkit-scrollbar-thumb': {
          bgcolor: 'rgba(0,0,0,0.2)',
          borderRadius: '3px',
          '&:hover': {
            bgcolor: 'rgba(0,0,0,0.3)',
          },
        },
      }}>
        {NAV_SECTIONS.map(({ section, items, subsections }) => (
          <Box key={section}>
            <SectionLabel label={section} />
            {subsections ? (
              // Render subsections
              subsections.map((subsection, idx) => (
                <Box key={idx}>
                  <Typography
                    sx={{
                      px: 1.5,
                      pt: idx === 0 ? 0.5 : 2,
                      pb: 0.5,
                      color: 'text.secondary',
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: 0.5,
                    }}
                  >
                    {subsection.title}
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.2 }}>
                    {subsection.items.map(item => <NavItem key={item.path} {...item} />)}
                  </Box>
                </Box>
              ))
            ) : (
              // Render regular items
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.2 }}>
                {items.map(item => <NavItem key={item.path} {...item} />)}
              </Box>
            )}
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
