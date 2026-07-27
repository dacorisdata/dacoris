'use client';

import { useState, useCallback, useMemo } from 'react';
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
  School as PgIcon,
  Timeline as JourneyIcon,
  SupervisedUserCircle as SupervisorIcon,
  ExitToApp as LogoutIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  ImportContacts as ImportIcon,
  ReportProblem as ChallengesIcon,
  RateReview as FeedbackIcon,
  WorkspacePremium as GraduationIcon,
} from '@mui/icons-material';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
  isUniversityInstitution,
  isSupervisorAccount,
  isPgStudentAccount,
} from '../lib/institutionTypes';
import { useTheme as useMuiTheme } from '@mui/material/styles';
import { subtleScrollbarSx } from '../lib/scrollStyles';
import { sidebarTheme, SIDEBAR_FONTS } from '../lib/sidebarTheme';

const STORAGE_KEY = 'dacoris-researcher-sidebar-sections';

function loadSavedOpen() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

const NAV_SECTIONS = [
  {
    sectionKey: 'main',
    collapsible: true,
    items: [
      { icon: DashIcon, labelKey: 'researcher.sidebar.dashboard', path: '/researcher/overview' },
      { icon: PersonIcon, labelKey: 'researcher.sidebar.myProfile', path: '/researcher/profile' },
    ],
  },
  {
    sectionKey: 'grants',
    collapsible: true,
    items: [
      { icon: DiscoverIcon, labelKey: 'researcher.sidebar.discoverOpportunities', path: '/researcher/grants/discover' },
      { icon: ProposalIcon, labelKey: 'researcher.sidebar.myProposals', path: '/researcher/grants/proposals' },
      { icon: AwardIcon, labelKey: 'researcher.sidebar.myAwards', path: '/researcher/grants/awards' },
    ],
  },
  {
    sectionKey: 'research',
    collapsible: true,
    subsections: [
      {
        titleKey: 'researcher.sidebar.subsections.projects',
        items: [
          { icon: ProjectIcon, labelKey: 'researcher.sidebar.myProjects', path: '/researcher/projects' },
          { icon: EthicsIcon, labelKey: 'researcher.sidebar.ethicsApplications', path: '/researcher/ethics' },
          { icon: DmpIcon, labelKey: 'researcher.sidebar.dataMgmtPlans', path: '/researcher/dmp' },
        ],
      },
      {
        titleKey: 'researcher.sidebar.subsections.discovery',
        items: [
          { icon: ImportIcon, labelKey: 'researcher.sidebar.importPublications', path: '/researcher/publications' },
          { icon: PublicationsIcon, labelKey: 'researcher.sidebar.myLibrary', path: '/researcher/publications/library' },
        ],
      },
      {
        titleKey: 'researcher.sidebar.subsections.writing',
        items: [
          { icon: ManuscriptIcon, labelKey: 'researcher.sidebar.manuscripts', path: '/researcher/manuscripts' },
        ],
      },
    ],
  },
  {
    sectionKey: 'data',
    collapsible: true,
    items: [
      { icon: FormsIcon, labelKey: 'researcher.sidebar.dataImport', path: '/researcher/data/import' },
      { icon: Storage, labelKey: 'researcher.sidebar.dataLakes', path: '/researcher/data/lakes' },
    ],
  },
  {
    sectionKey: 'training',
    collapsible: true,
    items: [
      { icon: TrainingIcon, labelKey: 'researcher.sidebar.overview', path: '/researcher/training' },
      { icon: CatalogIcon, labelKey: 'researcher.sidebar.trainingCatalog', path: '/researcher/training/catalog' },
      { icon: CoursesIcon, labelKey: 'researcher.sidebar.myCourses', path: '/researcher/training/my-courses' },
      { icon: CertIcon, labelKey: 'researcher.sidebar.certificatesCpd', path: '/researcher/training/certificates' },
      { icon: SkillsIcon, labelKey: 'researcher.sidebar.skillsInventory', path: '/researcher/training/skills' },
      { icon: NeedsIcon, labelKey: 'researcher.sidebar.trainingNeeds', path: '/researcher/training/needs-assessment' },
    ],
  },
];

function buildPgNavSection(user) {
  if (!isUniversityInstitution(user)) return null;
  const supervisor = isSupervisorAccount(user);
  const student = isPgStudentAccount(user) && !supervisor;
  const items = [];
  if (supervisor) {
    items.push(
      { icon: SupervisorIcon, labelKey: 'researcher.sidebar.supervisorDashboard', path: '/researcher/postgraduate/supervisor' },
      { icon: PgIcon, labelKey: 'researcher.sidebar.myStudents', path: '/researcher/postgraduate/supervisor/students' },
      { icon: NeedsIcon, labelKey: 'researcher.sidebar.delayReports', path: '/researcher/postgraduate/supervisor/delay-reports/new' },
    );
  }
  if (student) {
    items.push(
      { icon: JourneyIcon, labelKey: 'researcher.sidebar.myPgJourney', path: '/researcher/postgraduate/journey' },
      { icon: ChallengesIcon, labelKey: 'researcher.sidebar.reportChallenges', path: '/researcher/postgraduate/challenges' },
      { icon: FeedbackIcon, labelKey: 'researcher.sidebar.supervisionFeedback', path: '/researcher/postgraduate/feedback' },
      { icon: GraduationIcon, labelKey: 'researcher.sidebar.graduationReadiness', path: '/researcher/postgraduate/graduation' },
    );
  }
  if (!items.length) return null;
  return { sectionKey: 'postgraduate', collapsible: true, items };
}

function sectionHasActive(section, isActive) {
  const allPaths = section.items
    ? section.items.map(i => i.path)
    : (section.subsections || []).flatMap(s => s.items.map(i => i.path));
  return allPaths.some(isActive);
}

function findActiveSectionKey(sections, isActive) {
  for (const section of sections) {
    if (sectionHasActive(section, isActive)) return section.sectionKey;
  }
  return null;
}

function buildDefaultExpanded(sections, isActive, saved = {}) {
  const activeKey = findActiveSectionKey(sections, isActive);
  const next = { ...saved };
  sections.forEach(({ sectionKey }) => {
    if (next[sectionKey] === undefined) {
      next[sectionKey] = true;
    }
  });
  if (activeKey) next[activeKey] = true;
  return next;
}

export default function ResearcherSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const theme = useMuiTheme();
  const dark = theme.palette.mode === 'dark';
  const tokens = sidebarTheme(dark);
  const { accent } = tokens;

  const navSections = useMemo(() => {
    const pgSection = buildPgNavSection(user);
    if (isSupervisorAccount(user) && pgSection) {
      const mainSection = NAV_SECTIONS.find((s) => s.sectionKey === 'main');
      return mainSection ? [mainSection, pgSection] : [pgSection];
    }
    if (!pgSection) return NAV_SECTIONS;
    const sections = [...NAV_SECTIONS];
    const grantsIdx = sections.findIndex((s) => s.sectionKey === 'grants');
    const insertAt = grantsIdx >= 0 ? grantsIdx + 1 : sections.length;
    sections.splice(insertAt, 0, pgSection);
    return sections;
  }, [user]);

  const isActive = useCallback(
    (path) => pathname === path || pathname.startsWith(path + '/'),
    [pathname],
  );

  const [userOpen, setUserOpen] = useState(loadSavedOpen);

  const open = useMemo(
    () => buildDefaultExpanded(navSections, isActive, userOpen),
    [navSections, isActive, userOpen],
  );

  const toggleSection = useCallback((key) => {
    setUserOpen(prev => {
      const current = buildDefaultExpanded(navSections, isActive, prev);
      const next = { ...current, [key]: !current[key] };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [navSections, isActive]);

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'R';

  const NavItem = ({ icon: Icon, label, path }) => {
    const active = isActive(path);
    return (
      <Tooltip title={label} placement="right" disableHoverListener enterDelay={600}>
        <Box
          onClick={() => router.push(path)}
          sx={{
            display: 'flex', alignItems: 'center', gap: 1.5,
            px: 1.5, py: 1, mx: 0.5, cursor: 'pointer', borderRadius: '8px',
            bgcolor: active ? tokens.accentSoft : 'transparent',
            color: active ? tokens.navActive : tokens.nav,
            position: 'relative',
            transition: 'all 0.15s ease',
            '&:hover': {
              bgcolor: active ? tokens.accentHover : tokens.itemHoverBg,
              color: active ? tokens.navActive : tokens.navHover,
            },
            '&::before': active ? {
              content: '""',
              position: 'absolute', left: -4, top: '20%', bottom: '20%',
              width: 3, borderRadius: 4,
              bgcolor: accent,
            } : {},
          }}
        >
          <Icon sx={{ fontSize: SIDEBAR_FONTS.itemIcon, flexShrink: 0, opacity: active ? 1 : 0.75 }} />
          <Typography sx={{
            fontSize: SIDEBAR_FONTS.item,
            fontWeight: active ? 650 : 450,
            letterSpacing: 0.1,
            lineHeight: 1.35,
          }}>
            {label}
          </Typography>
          {active && (
            <Box sx={{
              ml: 'auto', width: 5, height: 5, borderRadius: '50%',
              bgcolor: accent, flexShrink: 0,
            }} />
          )}
        </Box>
      </Tooltip>
    );
  };

  const SectionHeader = ({ sectionKey, label, collapsible, isOpen, hasActive }) => (
    <Box
      onClick={collapsible ? () => toggleSection(sectionKey) : undefined}
      sx={{
        display: 'flex', alignItems: 'center', gap: 1,
        px: 2, pt: 2.5, pb: 0.75,
        cursor: collapsible ? 'pointer' : 'default',
        userSelect: 'none',
        '&:hover .section-label': collapsible ? { color: tokens.navHover } : {},
      }}
    >
      <Typography
        className="section-label"
        sx={{
          fontSize: SIDEBAR_FONTS.section,
          fontWeight: 700,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          color: hasActive ? tokens.sectionActive : tokens.section,
          transition: 'color 0.15s',
          flex: 1,
        }}
      >
        {label}
      </Typography>
      {collapsible && (
        isOpen
          ? <CollapseIcon sx={{ fontSize: 16, color: hasActive ? tokens.sectionActive : tokens.muted }} />
          : <ExpandIcon sx={{ fontSize: 16, color: hasActive ? tokens.sectionActive : tokens.muted }} />
      )}
    </Box>
  );

  const SubsectionLabel = ({ title }) => (
    <Typography sx={{
      px: 2, pt: 1.5, pb: 0.5,
      fontSize: SIDEBAR_FONTS.subsection, fontWeight: 600,
      color: tokens.muted,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    }}>
      {title}
    </Typography>
  );

  return (
    <Box sx={{
      width: 300,
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
          <Box sx={{
            display: 'inline-flex', alignItems: 'center',
            px: 1.25, py: 0.4, mb: 1.75, borderRadius: 1.5,
            bgcolor: tokens.accentBadgeBg,
            border: `1px solid ${tokens.accentBorder}`,
          }}>
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: accent, mr: 0.75 }} />
            <Typography sx={{
              fontSize: SIDEBAR_FONTS.badge, fontWeight: 700, color: accent,
              letterSpacing: 0.3,
              maxWidth: 170, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {user.institution_name}
            </Typography>
          </Box>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{
            width: 40, height: 40, borderRadius: '10px', flexShrink: 0,
            background: `linear-gradient(135deg, ${accent} 0%, #0891b2 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: SIDEBAR_FONTS.userName, fontWeight: 700, color: '#fff',
            boxShadow: `0 2px 8px ${accent}40`,
          }}>
            {initials}
          </Box>
          <Box sx={{ overflow: 'hidden', minWidth: 0 }}>
            <Typography sx={{
              fontSize: SIDEBAR_FONTS.userName, fontWeight: 650, color: tokens.name,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              letterSpacing: 0.1,
            }}>
              {user?.name || t('researcher.sidebar.fallbackName')}
            </Typography>
            <Typography sx={{ fontSize: SIDEBAR_FONTS.userRole, color: tokens.role, fontWeight: 500, mt: 0.1 }}>
              {user?.job_title || t('researcher.sidebar.fallbackRole')}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{
        flex: 1, overflowY: 'auto', py: 0.5,
        ...subtleScrollbarSx(dark),
      }}>
        {navSections.map(({ sectionKey, items, subsections, collapsible }) => {
          const hasActive = sectionHasActive({ items, subsections }, isActive);
          const isOpen = !collapsible || open[sectionKey] !== false;
          const sectionLabel = t(`researcher.sidebar.sections.${sectionKey}`);

          return (
            <Box key={sectionKey} sx={{ mb: 0.5 }}>
              <SectionHeader
                sectionKey={sectionKey}
                label={sectionLabel}
                collapsible={collapsible}
                isOpen={isOpen}
                hasActive={hasActive}
              />

              {isOpen && (
                <>
                  {subsections ? (
                    subsections.map((sub, idx) => (
                      <Box key={idx} sx={{ mb: 0.5 }}>
                        <SubsectionLabel title={t(sub.titleKey)} />
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3 }}>
                          {sub.items.map(item => (
                            <NavItem key={item.path} icon={item.icon} label={t(item.labelKey)} path={item.path} />
                          ))}
                        </Box>
                      </Box>
                    ))
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3 }}>
                      {items.map(item => (
                        <NavItem key={item.path} icon={item.icon} label={t(item.labelKey)} path={item.path} />
                      ))}
                    </Box>
                  )}
                </>
              )}
            </Box>
          );
        })}
      </Box>

      <Box sx={{
        px: 1.5, py: 1.25,
        borderTop: 1,
        borderColor: tokens.border,
      }}>
        <Box
          onClick={() => { logout(); router.push('/login'); }}
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
          <Typography sx={{ fontSize: SIDEBAR_FONTS.signOut, fontWeight: 500 }}>{t('researcher.sidebar.signOut')}</Typography>
        </Box>
      </Box>
    </Box>
  );
}
