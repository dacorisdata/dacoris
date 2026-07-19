'use client';

import {
  Box,
  Chip,
  IconButton,
  Paper,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  HelpOutline as HelpIcon,
  People as PeopleIcon,
  RateReview as ReviewIcon,
  WarningAmber as WarningIcon,
} from '@mui/icons-material';
import { useLanguage } from '../../contexts/LanguageContext';

export const ACCENT = '#1ca7a1';
export const HERO_GRADIENT = 'linear-gradient(135deg, #1e3a5f 0%, #243b53 55%, #1a365d 100%)';

const PL = 'researcher.pgJourney';

const RISK_META_KEYS = {
  low: 'low',
  medium: 'medium',
  high: 'high',
  critical: 'critical',
};

const RISK_COLORS = {
  low: { color: '#16a34a', bg: 'rgba(22,163,74,0.12)' },
  medium: { color: '#d97706', bg: 'rgba(217,119,6,0.12)' },
  high: { color: '#ea580c', bg: 'rgba(234,88,12,0.12)' },
  critical: { color: '#dc2626', bg: 'rgba(220,38,38,0.12)' },
};

export function normalizeRiskLevel(value) {
  const text = (value || '').toString().trim().toLowerCase();
  if (!text || text === '—') return null;
  if (text.includes('crit')) return 'critical';
  if (text.includes('high')) return 'high';
  if (text.includes('med')) return 'medium';
  if (text.includes('low')) return 'low';
  return null;
}

export function ProgressRiskChip({ riskLevel, daysOverdue, size = 'small' }) {
  const { t } = useLanguage();
  const key = normalizeRiskLevel(riskLevel);
  const colors = key ? RISK_COLORS[key] : null;
  const label = key
    ? t(`${PL}.risk.${RISK_META_KEYS[key]}`)
    : (riskLevel && riskLevel !== '—' ? riskLevel : t(`${PL}.risk.notAssessed`));

  const tooltip = [
    key
      ? t(`${PL}.risk.progressRisk`, { level: t(`${PL}.risk.${RISK_META_KEYS[key]}`) })
      : t(`${PL}.risk.notAssessedYet`),
    daysOverdue > 0
      ? t(daysOverdue === 1 ? `${PL}.risk.daysOverdue` : `${PL}.risk.daysOverduePlural`, { count: daysOverdue })
      : null,
    t(`${PL}.risk.help`),
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Tooltip title={tooltip} arrow placement="top">
      <Chip
        size={size}
        label={
          daysOverdue > 0 && key
            ? t(`${PL}.risk.late`, { level: label, days: daysOverdue })
            : label
        }
        sx={{
          fontWeight: 700,
          bgcolor: colors?.bg || 'action.hover',
          color: colors?.color || 'text.secondary',
          border: colors ? `1px solid ${colors.color}33` : '1px solid',
          borderColor: colors ? `${colors.color}33` : 'divider',
        }}
      />
    </Tooltip>
  );
}

export function ProgressRiskColumnHeader() {
  const { t } = useLanguage();

  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
      {t(`${PL}.risk.header`)}
      <Tooltip title={t(`${PL}.risk.help`)} arrow placement="top">
        <IconButton size="small" sx={{ p: 0.25 }} aria-label={t(`${PL}.risk.ariaLabel`)}>
          <HelpIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
        </IconButton>
      </Tooltip>
    </Box>
  );
}

export function SupervisorStatCard({ icon: Icon, label, value, sub, color = ACCENT, alert }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: 2,
        border: '1px solid',
        borderColor: alert ? `${color}44` : 'divider',
        bgcolor: alert ? `${color}08` : 'background.paper',
        height: '100%',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: 1.5,
            bgcolor: `${color}14`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon sx={{ fontSize: 22, color }} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.4 }}>
            {label}
          </Typography>
          <Typography sx={{ fontSize: 28, fontWeight: 800, lineHeight: 1.15, mt: 0.25, color: alert ? color : 'text.primary' }}>
            {value}
          </Typography>
          {sub && (
            <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.5 }}>{sub}</Typography>
          )}
        </Box>
      </Box>
    </Paper>
  );
}

export function SupervisorPageHeader({ title, subtitle, actions, dark }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2.5, md: 3 },
        mb: 3,
        borderRadius: 2.5,
        width: '100%',
        boxSizing: 'border-box',
        background: dark ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' : HERO_GRADIENT,
        color: '#fff',
      }}
    >
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: subtitle ? 0.75 : 0 }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography sx={{ fontSize: 14, opacity: 0.85, maxWidth: 640 }}>{subtitle}</Typography>
          )}
        </Box>
        {actions && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>{actions}</Box>
        )}
      </Box>
    </Paper>
  );
}

export function displayStage(name) {
  if (!name) return '—';
  return name.replace(/^Stage\s+\d+\s*:?\s*/i, '').trim();
}

export const STAT_ICONS = {
  students: PeopleIcon,
  validations: ReviewIcon,
  overdue: WarningIcon,
};
