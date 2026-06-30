'use client';

import { useState } from 'react';
import { Box, Typography, Tooltip } from '@mui/material';
import {
  Dashboard as DashIcon,
  Person as PersonIcon,
  Search as DiscoverIcon,
  Description as ProposalIcon,
  Science as ProjectIcon,
  Gavel as EthicsIcon,
  LibraryBooks as PublicationsIcon,
  Storage,
  EmojiEvents as AwardIcon,
  FolderSpecial as DmpIcon,
  Create as ManuscriptIcon,
  School as TrainingIcon,
  MenuBook as CatalogIcon,
  PlayLesson as CoursesIcon,
  WorkspacePremium as CertIcon,
  Psychology as SkillsIcon,
  Assignment as NeedsIcon,
  DynamicForm as FormsIcon,
  ExitToApp as LogoutIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  ImportContacts as ImportIcon,
} from '@mui/icons-material';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { useTheme as useMuiTheme } from '@mui/material/styles';
import { subtleScrollbarSx } from '../lib/scrollStyles';

const ACCENT = '#1ca7a1';

// ─── Nav structure ────────────────────────────────────────────────────────────
const NAV_SECTIONS = [
  {
    section: 'Main',
    items: [
      { icon: DashIcon,   label: 'Dashboard',  path: '/researcher/overview' },
      { icon: PersonIcon, label: 'My Profile', path: '/researcher/profile' },
    ],
  },
  {
    section: 'Grants',
    items: [
      { icon: DiscoverIcon, label: 'Discover Opportunities', path: '/researcher/grants/discover' },
      { icon: ProposalIcon, label: 'My Proposals',           path: '/researcher/grants/proposals' },
      { icon: AwardIcon,    label: 'My Awards',              path: '/researcher/grants/awards' },
    ],
  },
  {
    section: 'Research',
    collapsible: true,
    subsections: [
      {
        title: 'Projects',
        items: [
          { icon: ProjectIcon,      label: 'My Projects',         path: '/researcher/projects' },
          { icon: EthicsIcon,       label: 'Ethics Applications', path: '/researcher/ethics' },
          { icon: DmpIcon,          label: 'Data Mgmt Plans',     path: '/researcher/dmp' },
        ],
      },
      {
        title: 'Discovery',
        items: [
          { icon: ImportIcon,        label: 'Import Publications', path: '/researcher/publications' },
          { icon: PublicationsIcon,  label: 'My Library',          path: '/researcher/publications/library' },
        ],
      },
      {
        title: 'Writing',
        items: [
          { icon: ManuscriptIcon, label: 'Manuscripts', path: '/researcher/manuscripts' },
        ],
      },
    ],
  },
  {
    section: 'Data',
    items: [
      { icon: FormsIcon, label: 'Data Import', path: '/researcher/data/import' },
      { icon: Storage,   label: 'Data Lakes',  path: '/researcher/data/lakes' },
    ],
  },
  {
    section: 'Training',
    collapsible: true,
    items: [
      { icon: TrainingIcon, label: 'Overview',           path: '/researcher/training' },
      { icon: CatalogIcon,  label: 'Training Catalog',   path: '/researcher/training/catalog' },
      { icon: CoursesIcon,  label: 'My Courses',         path: '/researcher/training/my-courses' },
      { icon: CertIcon,     label: 'Certificates & CPD', path: '/researcher/training/certificates' },
      { icon: SkillsIcon,   label: 'Skills Inventory',   path: '/researcher/training/skills' },
      { icon: NeedsIcon,    label: 'Training Needs',     path: '/researcher/training/needs-assessment' },
    ],
  },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function ResearcherSidebar() {
  const router   = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const theme = useMuiTheme();
  const dark = theme.palette.mode === 'dark';

  // sections open by default
  const [open, setOpen] = useState({ Research: true, Training: true });
  const toggleSection = (name) => setOpen(prev => ({ ...prev, [name]: !prev[name] }));

  const isActive = (path) => pathname === path || pathname.startsWith(path + '/');
  const sectionHasActive = (section) => {
    const allPaths = section.items
      ? section.items.map(i => i.path)
      : (section.subsections || []).flatMap(s => s.items.map(i => i.path));
    return allPaths.some(isActive);
  };

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'R';

  // ── Sub-components ──────────────────────────────────────────────────────────

  const NavItem = ({ icon: Icon, label, path }) => {
    const active = isActive(path);
    return (
      <Tooltip title={label} placement="right" disableHoverListener enterDelay={600}>
        <Box
          onClick={() => router.push(path)}
          sx={{
            display: 'flex', alignItems: 'center', gap: 1.5,
            px: 1.5, py: 0.85, mx: 0.5, cursor: 'pointer', borderRadius: '8px',
            bgcolor: active ? `${ACCENT}16` : 'transparent',
            color: active ? ACCENT : dark ? 'text.secondary' : '#64748b',
            position: 'relative',
            transition: 'all 0.15s ease',
            '&:hover': {
              bgcolor: active ? `${ACCENT}20` : dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
              color: active ? ACCENT : 'text.primary',
            },
            // left accent bar for active item
            '&::before': active ? {
              content: '""',
              position: 'absolute', left: -4, top: '20%', bottom: '20%',
              width: 3, borderRadius: 4,
              bgcolor: ACCENT,
            } : {},
          }}
        >
          <Icon sx={{ fontSize: 17, flexShrink: 0, opacity: active ? 1 : 0.7 }} />
          <Typography sx={{
            fontSize: 12.5,
            fontWeight: active ? 650 : 450,
            letterSpacing: 0.1,
            lineHeight: 1.3,
          }}>
            {label}
          </Typography>
          {active && (
            <Box sx={{
              ml: 'auto', width: 5, height: 5, borderRadius: '50%',
              bgcolor: ACCENT, flexShrink: 0,
            }} />
          )}
        </Box>
      </Tooltip>
    );
  };

  const SectionHeader = ({ label, collapsible, isOpen, hasActive }) => (
    <Box
      onClick={collapsible ? () => toggleSection(label) : undefined}
      sx={{
        display: 'flex', alignItems: 'center', gap: 1,
        px: 2, pt: 2.5, pb: 0.75,
        cursor: collapsible ? 'pointer' : 'default',
        userSelect: 'none',
        '&:hover .section-label': collapsible ? { color: 'text.primary' } : {},
      }}
    >
      <Typography
        className="section-label"
        sx={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          color: hasActive ? ACCENT : 'text.disabled',
          transition: 'color 0.15s',
          flex: 1,
        }}
      >
        {label}
      </Typography>
      {collapsible && (
        isOpen
          ? <CollapseIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
          : <ExpandIcon   sx={{ fontSize: 14, color: 'text.disabled' }} />
      )}
    </Box>
  );

  const SubsectionLabel = ({ title }) => (
    <Typography sx={{
      px: 2, pt: 1.5, pb: 0.5,
      fontSize: 10.5, fontWeight: 600,
      color: dark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    }}>
      {title}
    </Typography>
  );

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <Box sx={{
      width: 234,
      bgcolor: dark ? '#0f172a' : '#ffffff',
      borderRight: 1,
      borderColor: dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'sticky',
      top: 0,
      flexShrink: 0,
    }}>

      {/* ── Header ── */}
      <Box sx={{
        px: 2, pt: 2.5, pb: 2,
        borderBottom: 1,
        borderColor: dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)',
        background: dark
          ? 'linear-gradient(160deg, #0f1f2e 0%, #0f172a 100%)'
          : `linear-gradient(160deg, ${ACCENT}0d 0%, transparent 100%)`,
      }}>
        {/* Institution badge */}
        {user?.institution_name && (
          <Box sx={{
            display: 'inline-flex', alignItems: 'center',
            px: 1.25, py: 0.4, mb: 1.75, borderRadius: 1.5,
            bgcolor: `${ACCENT}18`,
            border: `1px solid ${ACCENT}30`,
          }}>
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: ACCENT, mr: 0.75 }} />
            <Typography sx={{
              fontSize: 10, fontWeight: 700, color: ACCENT,
              letterSpacing: 0.3,
              maxWidth: 170, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {user.institution_name}
            </Typography>
          </Box>
        )}

        {/* Avatar + Name */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{
            width: 40, height: 40, borderRadius: '10px', flexShrink: 0,
            background: `linear-gradient(135deg, ${ACCENT} 0%, #0891b2 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 700, color: '#fff',
            boxShadow: `0 2px 8px ${ACCENT}40`,
          }}>
            {initials}
          </Box>
          <Box sx={{ overflow: 'hidden', minWidth: 0 }}>
            <Typography sx={{
              fontSize: 13, fontWeight: 650, color: 'text.primary',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              letterSpacing: 0.1,
            }}>
              {user?.name || 'Researcher'}
            </Typography>
            <Typography sx={{ fontSize: 11, color: ACCENT, fontWeight: 500, mt: 0.1 }}>
              {user?.job_title || 'Researcher'}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* ── Nav ── */}
      <Box sx={{
        flex: 1, overflowY: 'auto', py: 0.5,
        ...subtleScrollbarSx(dark),
      }}>
        {NAV_SECTIONS.map(({ section, items, subsections, collapsible }) => {
          const hasActive = sectionHasActive({ items, subsections });
          const isOpen = !collapsible || open[section] !== false;

          return (
            <Box key={section} sx={{ mb: 0.5 }}>
              <SectionHeader
                label={section}
                collapsible={collapsible}
                isOpen={isOpen}
                hasActive={hasActive}
              />

              {isOpen && (
                <>
                  {subsections ? (
                    subsections.map((sub, idx) => (
                      <Box key={idx} sx={{ mb: 0.5 }}>
                        <SubsectionLabel title={sub.title} />
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3 }}>
                          {sub.items.map(item => <NavItem key={item.path} {...item} />)}
                        </Box>
                      </Box>
                    ))
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3 }}>
                      {items.map(item => <NavItem key={item.path} {...item} />)}
                    </Box>
                  )}
                </>
              )}
            </Box>
          );
        })}
      </Box>

      {/* ── Footer ── */}
      <Box sx={{
        px: 1.5, py: 1.25,
        borderTop: 1,
        borderColor: dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)',
      }}>
        <Box
          onClick={() => { logout(); router.push('/login'); }}
          sx={{
            display: 'flex', alignItems: 'center', gap: 1.5,
            px: 1.5, py: 1, cursor: 'pointer', borderRadius: '8px',
            color: dark ? 'rgba(255,255,255,0.35)' : '#94a3b8',
            transition: 'all 0.15s ease',
            '&:hover': {
              bgcolor: 'rgba(239,68,68,0.08)',
              color: '#ef4444',
            },
          }}
        >
          <LogoutIcon sx={{ fontSize: 16 }} />
          <Typography sx={{ fontSize: 12.5, fontWeight: 500 }}>Sign Out</Typography>
        </Box>
      </Box>
    </Box>
  );
}
