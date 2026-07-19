'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, CircularProgress, useTheme, TextField, MenuItem, Select,
  FormControl, InputLabel, Chip, Button, Alert, Tooltip, IconButton, Divider,
  Pagination, FormControlLabel, Switch, Paper,
} from '@mui/material';
import {
  Search as SearchIcon, Bookmark as SaveIcon, BookmarkBorder as SaveOutlineIcon,
  Send as ApplyIcon, FilterList as FilterIcon, CalendarToday as CalendarIcon,
  AccountBalance as SponsorIcon, AttachMoney as MoneyIcon, Category as CategoryIcon,
  Clear as ClearIcon, AutoAwesome as SparkleIcon, Close as CloseIcon,
  CheckCircle as CheckCircleIcon, Psychology as AIIcon,
} from '@mui/icons-material';
import { useAuth } from '../../../../contexts/AuthContext';
import { useLanguage } from '../../../../contexts/LanguageContext';
import api from '../../../../lib/api';
import { grantsAPI } from '../../../../lib/apiModules';

const ACCENT = '#16a699';
const PAGE_SIZE = 20;
const LOCALE_MAP = { en: 'en-US', fr: 'fr-FR', ar: 'ar', sw: 'sw-KE' };

const STATUS_COLORS = {
  open: { color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  upcoming: { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  archived: { color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
  closed: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
};

const categoryColor = c => ({
  Health: '#10b981', Environment: '#0ea5e9', Technology: ACCENT,
  Agriculture: '#f59e0b', 'Multi-disciplinary': '#f97316', STEM: ACCENT,
}[c] || '#64748b');

const getStatusMeta = (status, t) => {
  const key = (status || '').toLowerCase();
  const colors = STATUS_COLORS[key] || { color: '#64748b', bg: 'rgba(100,116,139,0.12)' };
  const labelKey = `researcher.grantsDiscover.status.${key}`;
  const label = t(labelKey);
  return {
    label: label !== labelKey ? label : (status || t('researcher.grantsDiscover.status.na')),
    ...colors,
  };
};

const translateCategory = (category, t) => {
  if (!category) return category;
  const key = `researcher.grantsDiscover.categories.${category}`;
  const translated = t(key);
  return translated !== key ? translated : category;
};

const fmtDate = (d, locale) => d
  ? new Date(d).toLocaleDateString(LOCALE_MAP[locale] || 'en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  : '—';

const fmtMoney = o => {
  if (!o.amount_min && !o.amount_max) return '—';
  const fmt = n => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(0)}K` : n;
  if (o.amount_min && o.amount_max) return `${o.currency || ''} ${fmt(o.amount_min)} – ${fmt(o.amount_max)}`.trim();
  return `${o.currency || ''} ${fmt(o.amount_min || o.amount_max)}`.trim();
};

function OpportunityCard({ opp, app, saved, onSave, onApply, onCompleteDraft, theme, dark, t, locale, isRtl }) {
  const catColor = categoryColor(opp.category);
  const status = getStatusMeta(opp.status, t);
  const urgent = opp.deadline && new Date(opp.deadline) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const isOpen = opp.status?.toLowerCase() === 'open';

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, md: 2.5 },
        borderRadius: 3,
        border: `1px solid ${theme.palette.divider}`,
        bgcolor: 'background.paper',
        boxShadow: dark ? 'none' : '0 1px 3px rgba(15,23,42,0.04)',
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        alignItems: { xs: 'stretch', md: 'center' },
        gap: { xs: 2, md: 3 },
        transition: 'border-color 0.18s ease, box-shadow 0.18s ease',
        '&:hover': {
          borderColor: `${ACCENT}55`,
          boxShadow: dark ? 'none' : '0 4px 16px rgba(22,166,153,0.08)',
        },
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.75 }}>
          <Chip label={status.label} size="small" sx={{ fontSize: 10.5, fontWeight: 700, bgcolor: status.bg, color: status.color, height: 22 }} />
          {opp.category && (
            <Chip label={translateCategory(opp.category, t)} size="small" sx={{ fontSize: 10.5, fontWeight: 600, bgcolor: `${catColor}22`, color: catColor, height: 22 }} />
          )}
          {opp.is_curated && (
            <Chip label={t('researcher.grantsDiscover.published')} size="small" sx={{ fontSize: 10.5, fontWeight: 600, bgcolor: `${ACCENT}18`, color: ACCENT, height: 22 }} />
          )}
          {app && (
            <Chip label={app.label} size="small" sx={{ fontSize: 10.5, fontWeight: 600, bgcolor: `${app.color}22`, color: app.color, height: 22, maxWidth: 220 }} />
          )}
        </Box>

        <Tooltip title={opp.description || ''} arrow disableHoverListener={!opp.description}>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: 'text.primary', lineHeight: 1.35, mb: 1, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {opp.title}
          </Typography>
        </Tooltip>

        {opp.description && (
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {opp.description}
          </Typography>
        )}

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 1.5, md: 3 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <SponsorIcon sx={{ fontSize: 16, color: ACCENT }} />
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: ACCENT }}>{opp.sponsor || '—'}</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <MoneyIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{fmtMoney(opp)}</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <CalendarIcon sx={{ fontSize: 16, color: urgent ? '#ef4444' : 'text.secondary' }} />
            <Typography sx={{ fontSize: 13, color: urgent ? '#ef4444' : 'text.secondary', fontWeight: urgent ? 600 : 400 }}>
              {t('researcher.grantsDiscover.deadline', { date: fmtDate(opp.deadline, locale) })}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0, alignSelf: { xs: 'flex-end', md: 'center' } }}>
        <Tooltip title={saved ? t('researcher.grantsDiscover.saved') : t('researcher.grantsDiscover.saveForLater')}>
          <IconButton
            size="small"
            onClick={onSave}
            sx={{ color: saved ? ACCENT : 'text.secondary', border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}
          >
            {saved ? <SaveIcon sx={{ fontSize: 20 }} /> : <SaveOutlineIcon sx={{ fontSize: 20 }} />}
          </IconButton>
        </Tooltip>

        {app?.isDraft ? (
          <Button
            variant="contained"
            onClick={onCompleteDraft}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2, bgcolor: '#f59e0b', whiteSpace: 'nowrap', '&:hover': { bgcolor: '#d97706' } }}
          >
            {t('researcher.grantsDiscover.completeDraft')}
          </Button>
        ) : app && !app.isDraft ? (
          <Button variant="outlined" disabled sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2, whiteSpace: 'nowrap' }}>
            {t('researcher.grantsDiscover.applied')}
          </Button>
        ) : (
          <Tooltip title={!isOpen
            ? t('researcher.grantsDiscover.applyTooltipClosed', { status: getStatusMeta(opp.status, t).label })
            : t('researcher.grantsDiscover.applyTooltipOpen')}>
            <span>
              <Button
                variant="contained"
                endIcon={<ApplyIcon sx={{ fontSize: 16, transform: isRtl ? 'scaleX(-1)' : 'none' }} />}
                onClick={onApply}
                disabled={!isOpen}
                sx={{
                  textTransform: 'none', fontWeight: 600, borderRadius: 2, bgcolor: ACCENT, whiteSpace: 'nowrap',
                  '&:hover': { bgcolor: '#14958a' },
                  '&.Mui-disabled': { bgcolor: 'rgba(100,116,139,0.12)', color: 'rgba(100,116,139,0.5)' },
                }}
              >
                {t('researcher.grantsDiscover.apply')}
              </Button>
            </span>
          </Tooltip>
        )}
      </Box>
    </Paper>
  );
}

export default function DiscoverOpportunitiesPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const { t, locale, dir } = useLanguage();
  const isRtl = dir === 'rtl';
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';

  const [loading, setLoading] = useState(true);
  const [opportunities, setOpportunities] = useState([]);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [curatedOnly, setCuratedOnly] = useState(false);
  const [saved, setSaved] = useState([]);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState('status');
  const [sortOrder, setSortOrder] = useState('asc');
  const [myApplications, setMyApplications] = useState({});
  const [page, setPage] = useState(1);

  const [aiMatches, setAiMatches] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiPanelOpen, setAiPanelOpen] = useState(false);

  useEffect(() => { init(); }, []);

  useEffect(() => { setPage(1); }, [search, catFilter, statusFilter, curatedOnly, sortBy, sortOrder]);

  const init = async () => {
    const u = await fetchUser();
    if (!u) { router.push('/login'); return; }
    await loadOpportunities(u.id);
    setLoading(false);
  };

  const loadOpportunities = async (userId) => {
    try {
      const [oppRes, propRes] = await Promise.all([
        api.get('/grants/opportunities'),
        api.get('/grants/proposals'),
      ]);
      setOpportunities(oppRes.data || []);

      const appMap = {};
      (propRes.data || []).forEach(p => {
        if (p.lead_pi_id === userId && p.opportunity_id) {
          const existing = appMap[p.opportunity_id];
          if (!existing || new Date(p.created_at) > new Date(existing.created_at)) {
            appMap[p.opportunity_id] = {
              id: p.id,
              status: (p.status || '').toLowerCase(),
              title: p.title,
            };
          }
        }
      });
      setMyApplications(appMap);
    } catch (e) {
      setError(t('researcher.grantsDiscover.errorLoad'));
      console.error('Error loading opportunities:', e);
    }
  };

  const runAiMatch = async () => {
    setAiLoading(true);
    setAiError('');
    setAiPanelOpen(true);
    try {
      const res = await grantsAPI.matchOpportunities({ limit: 3, includeUpcoming: false });
      setAiMatches(res.data);
    } catch (e) {
      setAiError(e.response?.data?.detail || t('researcher.grantsDiscover.ai.failed'));
      setAiPanelOpen(false);
    } finally {
      setAiLoading(false);
    }
  };

  const getApplicationDisplay = (oppId) => {
    const app = myApplications[oppId];
    if (!app) return null;
    if (app.status === 'draft' || app.status === 'returned') {
      return {
        label: app.status === 'returned'
          ? t('researcher.grantsDiscover.application.returnedDraft')
          : t('researcher.grantsDiscover.application.draft'),
        color: '#f59e0b',
        proposalId: app.id,
        canApply: false,
        isDraft: true,
      };
    }
    return { label: t('researcher.grantsDiscover.applied'), color: '#6366f1', proposalId: app.id, canApply: false, isDraft: false };
  };

  const categories = useMemo(
    () => [...new Set(opportunities.map(o => o.category).filter(Boolean))].sort(),
    [opportunities],
  );

  const statuses = useMemo(
    () => [...new Set(opportunities.map(o => (o.status || '').toLowerCase()).filter(Boolean))].sort(),
    [opportunities],
  );

  const filtered = useMemo(() => {
    const statusOrder = { open: 1, upcoming: 2, archived: 3, closed: 4 };
    const q = search.toLowerCase();

    let items = opportunities.filter(o =>
      (catFilter === 'all' || o.category === catFilter) &&
      (statusFilter === 'all' || (o.status || '').toLowerCase() === statusFilter) &&
      (!curatedOnly || o.is_curated) &&
      (!q || o.title?.toLowerCase().includes(q) || o.sponsor?.toLowerCase().includes(q) || o.description?.toLowerCase().includes(q)),
    );

    items = [...items].sort((a, b) => {
      let aVal, bVal;
      if (sortBy === 'deadline') {
        aVal = a.deadline ? new Date(a.deadline).getTime() : 0;
        bVal = b.deadline ? new Date(b.deadline).getTime() : 0;
      } else if (sortBy === 'title') {
        aVal = a.title?.toLowerCase() || '';
        bVal = b.title?.toLowerCase() || '';
      } else if (sortBy === 'sponsor') {
        aVal = a.sponsor?.toLowerCase() || '';
        bVal = b.sponsor?.toLowerCase() || '';
      } else {
        aVal = statusOrder[(a.status || '').toLowerCase()] || 999;
        bVal = statusOrder[(b.status || '').toLowerCase()] || 999;
      }
      return sortOrder === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
    });

    return items;
  }, [opportunities, search, catFilter, statusFilter, curatedOnly, sortBy, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page],
  );

  const clearFilters = () => {
    setSearch('');
    setCatFilter('all');
    setStatusFilter('all');
    setCuratedOnly(false);
    setSortBy('status');
    setSortOrder('asc');
  };

  const hasActiveFilters = search || catFilter !== 'all' || statusFilter !== 'all' || curatedOnly || sortBy !== 'status' || sortOrder !== 'asc';

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}><CircularProgress /></Box>;
  }

  const showingFrom = filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const showingTo = Math.min(page * PAGE_SIZE, filtered.length);

  return (
    <Box sx={{ px: { xs: 1.5, md: 2 }, py: { xs: 1.5, md: 2 }, width: '100%' }}>
      <Box sx={{ mb: 3 }}>
        <Typography sx={{ fontSize: 24, fontWeight: 800, color: 'text.primary', letterSpacing: -0.3 }}>
          {t('researcher.grantsDiscover.title')}
        </Typography>
        <Typography sx={{ fontSize: 14, color: 'text.secondary', mt: 0.4 }}>
          {t('researcher.grantsDiscover.subtitle')}
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <Chip label={t('researcher.grantsDiscover.summary.total', { count: opportunities.length })} sx={{ bgcolor: `${ACCENT}18`, color: ACCENT, fontWeight: 600 }} />
          <Chip label={t('researcher.grantsDiscover.summary.published', { count: opportunities.filter(o => o.is_curated).length })} sx={{ bgcolor: 'rgba(16,185,129,0.12)', color: '#10b981', fontWeight: 600 }} />
          <Chip label={t('researcher.grantsDiscover.summary.open', { count: opportunities.filter(o => o.status === 'open').length })} sx={{ bgcolor: 'rgba(59,130,246,0.12)', color: '#3b82f6', fontWeight: 600 }} />
          <Chip label={t('researcher.grantsDiscover.summary.matching', { count: filtered.length })} sx={{ bgcolor: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', color: 'text.secondary', fontWeight: 600 }} />
        </Box>
        <Button
          variant="contained"
          startIcon={aiLoading ? <CircularProgress size={16} color="inherit" /> : <SparkleIcon />}
          onClick={runAiMatch}
          disabled={aiLoading}
          sx={{
            background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
            color: '#fff', textTransform: 'none', fontWeight: 700, borderRadius: 2.5,
            px: 2.5, py: 1, boxShadow: '0 4px 14px rgba(79,70,229,0.35)',
            '&:hover': { background: 'linear-gradient(135deg, #6d28d9 0%, #4338ca 100%)', boxShadow: '0 6px 20px rgba(79,70,229,0.45)' },
            '&.Mui-disabled': { background: 'rgba(100,116,139,0.12)', color: 'rgba(100,116,139,0.5)', boxShadow: 'none' },
          }}
        >
          {aiLoading ? t('researcher.grantsDiscover.ai.analysing') : t('researcher.grantsDiscover.ai.findMatches')}
        </Button>
      </Box>

      {aiError && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setAiError('')}>{aiError}</Alert>}

      {aiPanelOpen && (
        <Paper
          elevation={0}
          sx={{
            mb: 3, borderRadius: 3,
            border: '1px solid rgba(124,58,237,0.3)',
            background: dark
              ? 'linear-gradient(135deg, rgba(124,58,237,0.12) 0%, rgba(79,70,229,0.08) 100%)'
              : 'linear-gradient(135deg, rgba(124,58,237,0.05) 0%, rgba(79,70,229,0.03) 100%)',
            overflow: 'hidden',
          }}
        >
          <Box sx={{ px: 3, py: 2.5, display: 'flex', alignItems: 'center', gap: 1.5, borderBottom: '1px solid rgba(124,58,237,0.15)' }}>
            <Box sx={{ width: 38, height: 38, borderRadius: 2, background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <AIIcon sx={{ fontSize: 22, color: '#fff' }} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontWeight: 700, fontSize: 16, color: 'text.primary' }}>
                {t('researcher.grantsDiscover.ai.topMatches')}
                {aiMatches?.ai_enhanced && (
                  <Chip label="GPT-4o-mini" size="small" sx={{ ml: 1.5, fontSize: 10, fontWeight: 700, bgcolor: 'rgba(124,58,237,0.12)', color: '#7c3aed' }} />
                )}
                {aiMatches && !aiMatches.ai_enhanced && (
                  <Chip label={t('researcher.grantsDiscover.ai.keywordMatch')} size="small" sx={{ ml: 1.5, fontSize: 10, fontWeight: 700, bgcolor: 'rgba(100,116,139,0.1)', color: 'text.secondary' }} />
                )}
              </Typography>
              {aiMatches && (
                <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mt: 0.3 }}>
                  {t('researcher.grantsDiscover.ai.rankedFrom', {
                    count: aiMatches.total_candidates,
                    signals: aiMatches.signals_used?.join(', ') || t('researcher.grantsDiscover.ai.yourProfile'),
                  })}
                </Typography>
              )}
            </Box>
            <Tooltip title={t('researcher.grantsDiscover.ai.closePanel')}>
              <IconButton size="small" onClick={() => setAiPanelOpen(false)} sx={{ color: 'text.secondary' }}>
                <CloseIcon sx={{ fontSize: 20 }} />
              </IconButton>
            </Tooltip>
          </Box>

          <Box sx={{ p: 2.5 }}>
            {aiLoading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
                <CircularProgress size={24} sx={{ color: '#7c3aed' }} />
                <Box>
                  <Typography sx={{ fontWeight: 600, fontSize: 14 }}>{t('researcher.grantsDiscover.ai.analysingProfile')}</Typography>
                  <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>{t('researcher.grantsDiscover.ai.analysingDetail')}</Typography>
                </Box>
              </Box>
            ) : aiMatches?.matches?.length === 0 ? (
              <Typography sx={{ color: 'text.secondary', fontSize: 14, py: 1 }}>{t('researcher.grantsDiscover.ai.noMatches')}</Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {aiMatches?.matches?.map((match, idx) => {
                  const pct = Math.round(Math.min(match.score * 500, 100));
                  const scoreColor = pct >= 70 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#64748b';
                  const app = getApplicationDisplay(match.opportunity_id);
                  const statusInfo = getStatusMeta(match.status, t);
                  return (
                    <Paper
                      key={match.opportunity_id}
                      elevation={0}
                      sx={{
                        p: 2.25, borderRadius: 2.5,
                        border: `1px solid ${theme.palette.divider}`,
                        bgcolor: 'background.paper',
                        display: 'flex', gap: 2, alignItems: 'flex-start',
                        flexDirection: { xs: 'column', md: 'row' },
                      }}
                    >
                      <Box sx={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, minWidth: 60 }}>
                        <Box sx={{ width: 52, height: 52, borderRadius: '50%', border: `3px solid ${scoreColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                          <Typography sx={{ fontSize: 13, fontWeight: 800, color: scoreColor }}>{pct}%</Typography>
                        </Box>
                        <Typography sx={{ fontSize: 10, color: 'text.secondary', fontWeight: 600, textAlign: 'center' }}>{t('researcher.grantsDiscover.ai.match')}</Typography>
                        <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary' }}>#{idx + 1}</Typography>
                      </Box>

                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 0.75 }}>
                          <Chip label={statusInfo.label} size="small" sx={{ fontSize: 10, fontWeight: 700, bgcolor: statusInfo.bg, color: statusInfo.color, height: 22 }} />
                          {match.category && (
                            <Chip label={translateCategory(match.category, t)} size="small" sx={{ fontSize: 10, fontWeight: 600, bgcolor: `${categoryColor(match.category)}22`, color: categoryColor(match.category), height: 22 }} />
                          )}
                          {app && <Chip label={app.label} size="small" sx={{ fontSize: 10, fontWeight: 600, bgcolor: `${app.color}22`, color: app.color, height: 22 }} />}
                        </Box>
                        <Typography sx={{ fontSize: 15, fontWeight: 700, mb: 0.75, lineHeight: 1.35 }}>{match.title}</Typography>

                        {match.match_explanation && (
                          <Box sx={{ p: 1.25, borderRadius: 1.5, bgcolor: 'rgba(124,58,237,0.07)', border: '1px solid rgba(124,58,237,0.15)', mb: 1.25, display: 'flex', gap: 1 }}>
                            <SparkleIcon sx={{ fontSize: 16, color: '#7c3aed', flexShrink: 0, mt: 0.2 }} />
                            <Typography sx={{ fontSize: 13, color: dark ? 'rgba(255,255,255,0.85)' : '#3b1f6e', fontStyle: 'italic', lineHeight: 1.5 }}>
                              {match.match_explanation}
                            </Typography>
                          </Box>
                        )}

                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1 }}>
                          {match.reasons.map((r, i) => (
                            <Chip key={i} icon={<CheckCircleIcon sx={{ fontSize: '13px !important' }} />} label={r} size="small"
                              sx={{ fontSize: 11, bgcolor: 'rgba(16,185,129,0.08)', color: '#10b981', '& .MuiChip-icon': { color: '#10b981' } }} />
                          ))}
                        </Box>

                        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                          {match.sponsor && (
                            <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center' }}>
                              <SponsorIcon sx={{ fontSize: 15, color: ACCENT }} />
                              <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: ACCENT }}>{match.sponsor}</Typography>
                            </Box>
                          )}
                          {(match.amount_min || match.amount_max) && (
                            <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center' }}>
                              <MoneyIcon sx={{ fontSize: 15, color: 'text.secondary' }} />
                              <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
                                {match.currency} {match.amount_min && match.amount_max
                                  ? `${match.amount_min >= 1000000 ? `${(match.amount_min / 1000000).toFixed(1)}M` : match.amount_min >= 1000 ? `${(match.amount_min / 1000).toFixed(0)}K` : match.amount_min} – ${match.amount_max >= 1000000 ? `${(match.amount_max / 1000000).toFixed(1)}M` : match.amount_max >= 1000 ? `${(match.amount_max / 1000).toFixed(0)}K` : match.amount_max}`
                                  : (match.amount_min || match.amount_max)}
                              </Typography>
                            </Box>
                          )}
                          {match.deadline && (
                            <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center' }}>
                              <CalendarIcon sx={{ fontSize: 15, color: 'text.secondary' }} />
                              <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
                                {fmtDate(match.deadline, locale)}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      </Box>

                      <Box sx={{ flexShrink: 0, alignSelf: { xs: 'flex-end', md: 'center' } }}>
                        {app?.isDraft ? (
                          <Button variant="contained" onClick={() => router.push(`/researcher/grants/proposals/${app.proposalId}`)}
                            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2, bgcolor: '#f59e0b', whiteSpace: 'nowrap', '&:hover': { bgcolor: '#d97706' } }}>
                            {t('researcher.grantsDiscover.completeDraft')}
                          </Button>
                        ) : app && !app.isDraft ? (
                          <Button variant="outlined" disabled sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}>
                            {t('researcher.grantsDiscover.applied')}
                          </Button>
                        ) : (
                          <Tooltip title={match.status?.toLowerCase() !== 'open'
                            ? t('researcher.grantsDiscover.ai.statusTooltip', { status: statusInfo.label })
                            : ''}>
                            <span>
                              <Button
                                variant="contained"
                                endIcon={<ApplyIcon sx={{ fontSize: 16, transform: isRtl ? 'scaleX(-1)' : 'none' }} />}
                                disabled={match.status?.toLowerCase() !== 'open'}
                                onClick={() => {
                                  const oppData = encodeURIComponent(JSON.stringify({ id: match.opportunity_id, title: match.title, sponsor: match.sponsor, deadline: match.deadline }));
                                  router.push(`/researcher/grants/proposals?new=true&opp=${oppData}`);
                                }}
                                sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2, bgcolor: ACCENT, whiteSpace: 'nowrap', '&:hover': { bgcolor: '#14958a' }, '&.Mui-disabled': { bgcolor: 'rgba(100,116,139,0.12)', color: 'rgba(100,116,139,0.5)' } }}
                              >
                                {t('researcher.grantsDiscover.apply')}
                              </Button>
                            </span>
                          </Tooltip>
                        )}
                      </Box>
                    </Paper>
                  );
                })}
              </Box>
            )}
          </Box>
        </Paper>
      )}

      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexDirection: { xs: 'column', lg: 'row' } }}>
        <Paper
          elevation={0}
          sx={{
            width: { xs: '100%', lg: 260 },
            flexShrink: 0,
            p: 2,
            borderRadius: 3,
            border: `1px solid ${theme.palette.divider}`,
            bgcolor: 'background.paper',
            position: { lg: 'sticky' },
            top: 24,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FilterIcon sx={{ fontSize: 20, color: ACCENT }} />
              <Typography sx={{ fontSize: 15, fontWeight: 700 }}>{t('researcher.grantsDiscover.filters.title')}</Typography>
            </Box>
            {hasActiveFilters && (
              <Button size="small" startIcon={<ClearIcon sx={{ fontSize: 16 }} />} onClick={clearFilters}
                sx={{ textTransform: 'none', fontSize: 12, fontWeight: 600, color: 'text.secondary' }}>
                {t('researcher.grantsDiscover.filters.clear')}
              </Button>
            )}
          </Box>

          <TextField
            fullWidth
            size="small"
            placeholder={t('researcher.grantsDiscover.filters.searchPlaceholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            InputProps={{ startAdornment: <SearchIcon sx={{ fontSize: 18, color: 'text.disabled', mr: 1 }} /> }}
            sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />

          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>{t('researcher.grantsDiscover.filters.category')}</InputLabel>
            <Select value={catFilter} onChange={e => setCatFilter(e.target.value)} label={t('researcher.grantsDiscover.filters.category')} sx={{ borderRadius: 2 }}>
              <MenuItem value="all">{t('researcher.grantsDiscover.filters.allCategories')}</MenuItem>
              {categories.map(c => (
                <MenuItem key={c} value={c}>{translateCategory(c, t)}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>{t('researcher.grantsDiscover.filters.status')}</InputLabel>
            <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} label={t('researcher.grantsDiscover.filters.status')} sx={{ borderRadius: 2 }}>
              <MenuItem value="all">{t('researcher.grantsDiscover.filters.allStatuses')}</MenuItem>
              {statuses.map(s => (
                <MenuItem key={s} value={s}>{getStatusMeta(s, t).label}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <Divider sx={{ my: 2 }} />

          <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, color: 'text.secondary', mb: 1.5 }}>
            {t('researcher.grantsDiscover.filters.sortBy')}
          </Typography>

          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>{t('researcher.grantsDiscover.filters.sortField')}</InputLabel>
            <Select value={sortBy} onChange={e => setSortBy(e.target.value)} label={t('researcher.grantsDiscover.filters.sortField')} sx={{ borderRadius: 2 }}>
              <MenuItem value="status">{t('researcher.grantsDiscover.filters.sortStatus')}</MenuItem>
              <MenuItem value="deadline">{t('researcher.grantsDiscover.filters.sortDeadline')}</MenuItem>
              <MenuItem value="title">{t('researcher.grantsDiscover.filters.sortTitle')}</MenuItem>
              <MenuItem value="sponsor">{t('researcher.grantsDiscover.filters.sortSponsor')}</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>{t('researcher.grantsDiscover.filters.order')}</InputLabel>
            <Select value={sortOrder} onChange={e => setSortOrder(e.target.value)} label={t('researcher.grantsDiscover.filters.order')} sx={{ borderRadius: 2 }}>
              <MenuItem value="asc">{t('researcher.grantsDiscover.filters.ascending')}</MenuItem>
              <MenuItem value="desc">{t('researcher.grantsDiscover.filters.descending')}</MenuItem>
            </Select>
          </FormControl>

          <FormControlLabel
            control={<Switch checked={curatedOnly} onChange={e => setCuratedOnly(e.target.checked)} size="small" sx={{ '& .Mui-checked': { color: ACCENT }, '& .Mui-checked + .MuiSwitch-track': { bgcolor: ACCENT } }} />}
            label={<Typography sx={{ fontSize: 13 }}>{t('researcher.grantsDiscover.filters.publishedOnly')}</Typography>}
          />
        </Paper>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
            <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
              {t('researcher.grantsDiscover.results.showing', { from: showingFrom, to: showingTo, total: filtered.length })}
            </Typography>
            {totalPages > 1 && (
              <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
                {t('researcher.grantsDiscover.results.pageOf', { page, total: totalPages })}
              </Typography>
            )}
          </Box>

          {paginated.length === 0 ? (
            <Paper elevation={0} sx={{ p: 6, textAlign: 'center', borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
              <CategoryIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
              <Typography sx={{ color: 'text.primary', fontWeight: 600, mb: 0.5 }}>{t('researcher.grantsDiscover.results.emptyTitle')}</Typography>
              <Typography sx={{ color: 'text.secondary', fontSize: 13, mb: 2 }}>
                {t('researcher.grantsDiscover.results.emptyBody')}
              </Typography>
              {hasActiveFilters && (
                <Button variant="outlined" onClick={clearFilters} sx={{ textTransform: 'none', borderRadius: 2 }}>
                  {t('researcher.grantsDiscover.results.clearAllFilters')}
                </Button>
              )}
            </Paper>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {paginated.map(opp => (
                <OpportunityCard
                  key={opp.id}
                  opp={opp}
                  app={getApplicationDisplay(opp.id)}
                  saved={saved.includes(opp.id)}
                  theme={theme}
                  dark={dark}
                  t={t}
                  locale={locale}
                  isRtl={isRtl}
                  onSave={() => setSaved(s => s.includes(opp.id) ? s.filter(x => x !== opp.id) : [...s, opp.id])}
                  onApply={() => {
                    const oppData = encodeURIComponent(JSON.stringify({
                      id: opp.id, title: opp.title, sponsor: opp.sponsor, deadline: opp.deadline,
                    }));
                    router.push(`/researcher/grants/proposals?new=true&opp=${oppData}`);
                  }}
                  onCompleteDraft={() => {
                    const app = getApplicationDisplay(opp.id);
                    if (app?.proposalId) router.push(`/researcher/grants/proposals/${app.proposalId}`);
                  }}
                />
              ))}
            </Box>
          )}

          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, p) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                color="primary"
                shape="rounded"
                size="large"
                sx={{
                  '& .MuiPaginationItem-root.Mui-selected': { bgcolor: ACCENT, color: '#fff', '&:hover': { bgcolor: '#14958a' } },
                }}
              />
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
