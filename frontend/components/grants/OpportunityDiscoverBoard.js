'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, TextField, MenuItem, Select, FormControl, InputLabel, Chip, Button,
  Alert, Tooltip, IconButton, Divider, Pagination, FormControlLabel, Switch, Paper, Link,
  Dialog, DialogTitle, DialogContent, DialogActions, Autocomplete, Avatar, AvatarGroup, Checkbox,
} from '@mui/material';
import {
  Search as SearchIcon, Bookmark as SaveIcon, BookmarkBorder as SaveOutlineIcon,
  Send as ApplyIcon, FilterList as FilterIcon, CalendarToday as CalendarIcon,
  AccountBalance as SponsorIcon, AttachMoney as MoneyIcon, Category as CategoryIcon,
  Clear as ClearIcon, AutoAwesome as SparkleIcon, Close as CloseIcon,
  CheckCircle as CheckCircleIcon, Psychology as AIIcon, OpenInNew as OpenInNewIcon,
  People as PeopleIcon, Recommend as RecommendIcon, Visibility as ViewIcon,
  Star as StarIcon, TrendingUp as TrendingIcon, FiberNew as NewIcon,
} from '@mui/icons-material';

const ACCENT = '#16a699';
const PAGE_SIZE = 20;
const LOCALE_MAP = { en: 'en-US', fr: 'fr-FR', ar: 'ar', sw: 'sw-KE' };
const NEW_OPPORTUNITY_DAYS = 30;

export const STATUS_COLORS = {
  open: { color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  upcoming: { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  archived: { color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
  closed: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
};

export const categoryColor = c => ({
  Health: '#10b981', Environment: '#0ea5e9', Technology: ACCENT,
  Agriculture: '#f59e0b', 'Multi-disciplinary': '#f97316', STEM: ACCENT,
}[c] || '#64748b');

export const fmtDate = (d, locale) => d
  ? new Date(d).toLocaleDateString(LOCALE_MAP[locale] || 'en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  : '—';

export const fmtMoney = o => {
  if (!o.amount_min && !o.amount_max) return '—';
  const fmt = n => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(0)}K` : n;
  if (o.amount_min && o.amount_max) return `${o.currency || ''} ${fmt(o.amount_min)} – ${fmt(o.amount_max)}`.trim();
  return `${o.currency || ''} ${fmt(o.amount_min || o.amount_max)}`.trim();
};

function getStatusMeta(status, t) {
  const key = (status || '').toLowerCase();
  const colors = STATUS_COLORS[key] || { color: '#64748b', bg: 'rgba(100,116,139,0.12)' };
  const labelKey = `researcher.grantsDiscover.status.${key}`;
  const label = t(labelKey);
  return {
    label: label !== labelKey ? label : (status || t('researcher.grantsDiscover.status.na')),
    ...colors,
  };
}

function translateCategory(category, t) {
  if (!category) return category;
  const key = `researcher.grantsDiscover.categories.${category}`;
  const translated = t(key);
  return translated !== key ? translated : category;
}

function isNewOpportunity(opp) {
  if (!opp.created_at) return false;
  const created = new Date(opp.created_at);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - NEW_OPPORTUNITY_DAYS);
  return created >= cutoff;
}

export function OpportunityCard({
  opp,
  app,
  saved,
  onSave,
  onApply,
  onCompleteDraft,
  onView,
  onRecommend,
  theme,
  dark,
  t,
  locale,
  isRtl,
  mode = 'researcher',
  aiRecommended = false,
  aiScore,
  selected,
  onSelect,
  showSelect = false,
}) {
  const catColor = categoryColor(opp.category);
  const status = getStatusMeta(opp.status, t);
  const urgent = opp.deadline && new Date(opp.deadline) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const isOpen = opp.status?.toLowerCase() === 'open';
  const colleagues = opp.colleague_applications || [];

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, md: 2.5 },
        borderRadius: 3,
        border: `1px solid ${opp.staff_recommended ? `${ACCENT}88` : aiRecommended ? 'rgba(124,58,237,0.35)' : theme.palette.divider}`,
        bgcolor: opp.staff_recommended
          ? (dark ? 'rgba(22,166,153,0.06)' : 'rgba(22,166,153,0.04)')
          : aiRecommended
            ? (dark ? 'rgba(124,58,237,0.06)' : 'rgba(124,58,237,0.03)')
            : 'background.paper',
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
      {showSelect && (
        <Checkbox
          checked={!!selected}
          onChange={(e) => onSelect?.(opp.id, e.target.checked)}
          sx={{ alignSelf: { xs: 'flex-start', md: 'center' }, color: ACCENT, '&.Mui-checked': { color: ACCENT } }}
        />
      )}

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.75 }}>
          {opp.staff_recommended && (
            <Chip
              icon={<StarIcon sx={{ fontSize: '14px !important' }} />}
              label={t('researcher.grantsDiscover.badges.recommended')}
              size="small"
              sx={{ fontSize: 10.5, fontWeight: 700, bgcolor: `${ACCENT}22`, color: ACCENT, height: 22 }}
            />
          )}
          {aiRecommended && (
            <Chip
              icon={<SparkleIcon sx={{ fontSize: '14px !important' }} />}
              label={aiScore != null
                ? t('researcher.grantsDiscover.badges.aiRecommendedScore', { score: Math.round(aiScore) })
                : t('researcher.grantsDiscover.badges.aiRecommended')}
              size="small"
              sx={{ fontSize: 10.5, fontWeight: 700, bgcolor: 'rgba(124,58,237,0.12)', color: '#7c3aed', height: 22 }}
            />
          )}
          <Chip label={status.label} size="small" sx={{ fontSize: 10.5, fontWeight: 700, bgcolor: status.bg, color: status.color, height: 22 }} />
          {opp.category && (
            <Chip label={translateCategory(opp.category, t)} size="small" sx={{ fontSize: 10.5, fontWeight: 600, bgcolor: `${catColor}22`, color: catColor, height: 22 }} />
          )}
          {opp.is_curated && (
            <Chip label={t('researcher.grantsDiscover.published')} size="small" sx={{ fontSize: 10.5, fontWeight: 600, bgcolor: `${ACCENT}18`, color: ACCENT, height: 22 }} />
          )}
          {isNewOpportunity(opp) && (
            <Chip label={t('researcher.grantsDiscover.badges.new')} size="small" sx={{ fontSize: 10.5, fontWeight: 600, bgcolor: 'rgba(59,130,246,0.12)', color: '#3b82f6', height: 22 }} />
          )}
          {(opp.application_count || 0) > 0 && (
            <Chip
              icon={<PeopleIcon sx={{ fontSize: '14px !important' }} />}
              label={t('researcher.grantsDiscover.applicationsCount', { count: opp.application_count })}
              size="small"
              sx={{ fontSize: 10.5, fontWeight: 600, bgcolor: 'rgba(59,130,246,0.1)', color: '#3b82f6', height: 22 }}
            />
          )}
          {app && (
            <Chip label={app.label} size="small" sx={{ fontSize: 10.5, fontWeight: 600, bgcolor: `${app.color}22`, color: app.color, height: 22, maxWidth: 220 }} />
          )}
        </Box>

        <Typography sx={{ fontSize: 16, fontWeight: 700, color: 'text.primary', lineHeight: 1.35, mb: 1, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {opp.title}
        </Typography>

        {opp.description && (
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {opp.description}
          </Typography>
        )}

        {opp.staff_recommended && opp.recommended_by_name && (
          <Typography sx={{ fontSize: 12, color: ACCENT, fontWeight: 600, mb: 1 }}>
            {t('researcher.grantsDiscover.recommendedBy', { name: opp.recommended_by_name })}
            {opp.staff_recommendation_note ? ` — ${opp.staff_recommendation_note}` : ''}
          </Typography>
        )}

        {colleagues.length > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
            <Typography sx={{ fontSize: 12, color: 'text.secondary', fontWeight: 600 }}>
              {t('researcher.grantsDiscover.colleaguesApplied', { count: colleagues.length })}:
            </Typography>
            <AvatarGroup max={4} sx={{ '& .MuiAvatar-root': { width: 24, height: 24, fontSize: 11 } }}>
              {colleagues.map(c => (
                <Tooltip key={c.user_id} title={`${c.name} (${c.status})`} arrow>
                  <Avatar sx={{ bgcolor: '#8b5cf6' }}>{c.name?.charAt(0) || 'R'}</Avatar>
                </Tooltip>
              ))}
            </AvatarGroup>
          </Box>
        )}

        {mode === 'admin' && (opp.recommended_researchers || []).length > 0 && (
          <Box sx={{ mb: 1.5 }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.5 }}>
              {t('researcher.grantsDiscover.recommendedResearchers')}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {opp.recommended_researchers.map(r => (
                <Chip
                  key={r.user_id}
                  label={r.name}
                  size="small"
                  onDelete={onRecommend ? () => onRecommend(opp, 'remove', r) : undefined}
                  sx={{ fontSize: 11, bgcolor: `${ACCENT}14`, color: ACCENT }}
                />
              ))}
            </Box>
          </Box>
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
          {opp.application_url && (
            <Link href={opp.application_url} target="_blank" rel="noopener noreferrer" underline="hover"
              sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: 13, fontWeight: 600, color: ACCENT }}>
              {t('researcher.grantsDiscover.readMore')}
              <OpenInNewIcon sx={{ fontSize: 14, transform: isRtl ? 'scaleX(-1)' : 'none' }} />
            </Link>
          )}
        </Box>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0, alignSelf: { xs: 'flex-end', md: 'center' }, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        {mode === 'researcher' && onSave && (
          <Tooltip title={saved ? t('researcher.grantsDiscover.saved') : t('researcher.grantsDiscover.saveForLater')}>
            <IconButton size="small" onClick={onSave}
              sx={{ color: saved ? ACCENT : 'text.secondary', border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
              {saved ? <SaveIcon sx={{ fontSize: 20 }} /> : <SaveOutlineIcon sx={{ fontSize: 20 }} />}
            </IconButton>
          </Tooltip>
        )}

        {mode === 'admin' && onRecommend && (
          <Button size="small" variant="outlined" startIcon={<RecommendIcon />} onClick={() => onRecommend(opp, 'add')}
            sx={{ textTransform: 'none', borderRadius: 2, borderColor: ACCENT, color: ACCENT, fontWeight: 600 }}>
            {t('researcher.grantsDiscover.recommendResearcher')}
          </Button>
        )}

        {mode === 'admin' && onView && (
          <IconButton size="small" onClick={() => onView(opp)} sx={{ color: ACCENT, border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
            <ViewIcon fontSize="small" />
          </IconButton>
        )}

        {mode === 'researcher' && (
          app?.isDraft ? (
            <Button variant="contained" onClick={onCompleteDraft}
              sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2, bgcolor: '#f59e0b', whiteSpace: 'nowrap', '&:hover': { bgcolor: '#d97706' } }}>
              {t('researcher.grantsDiscover.completeDraft')}
            </Button>
          ) : app && !app.isDraft ? (
            <Button variant="outlined" disabled sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2, whiteSpace: 'nowrap' }}>
              {t('researcher.grantsDiscover.applied')}
            </Button>
          ) : (
            <Tooltip title={!isOpen ? t('researcher.grantsDiscover.applyTooltipClosed', { status: status.label }) : t('researcher.grantsDiscover.applyTooltipOpen')}>
              <span>
                <Button variant="contained" endIcon={<ApplyIcon sx={{ fontSize: 16, transform: isRtl ? 'scaleX(-1)' : 'none' }} />}
                  onClick={onApply} disabled={!isOpen}
                  sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2, bgcolor: ACCENT, whiteSpace: 'nowrap', '&:hover': { bgcolor: '#14958a' } }}>
                  {t('researcher.grantsDiscover.apply')}
                </Button>
              </span>
            </Tooltip>
          )
        )}
      </Box>
    </Paper>
  );
}

function RecommendResearcherDialog({ open, onClose, onSave, opp, api, t }) {
  const [allResearchers, setAllResearchers] = useState([]);
  const [loadingResearchers, setLoadingResearchers] = useState(false);
  const [selected, setSelected] = useState([]);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const alreadyRecommendedIds = useMemo(
    () => new Set((opp?.recommended_researchers || []).map(r => r.user_id)),
    [opp],
  );

  useEffect(() => {
    if (!open) {
      setSelected([]);
      setNote('');
      setError('');
      return;
    }
    const loadResearchers = async () => {
      setLoadingResearchers(true);
      try {
        const res = await api.get('/grants/opportunities/institution-researchers', { params: { limit: 500 } });
        setAllResearchers(res.data || []);
      } catch {
        setAllResearchers([]);
      } finally {
        setLoadingResearchers(false);
      }
    };
    loadResearchers();
  }, [open, api]);

  const availableOptions = useMemo(
    () => allResearchers.filter(r => !alreadyRecommendedIds.has(r.id)),
    [allResearchers, alreadyRecommendedIds],
  );

  const handleSaveSelected = async () => {
    if (!selected.length || !opp?.id) return;
    setSaving(true);
    setError('');
    try {
      await onSave(opp.id, {
        researcherIds: selected.map(s => s.id),
        recommendAll: false,
        note: note.trim(),
      });
      setSelected([]);
      setNote('');
      onClose();
    } catch (e) {
      setError(e.response?.data?.detail || e.message || 'Failed to save recommendation');
    } finally {
      setSaving(false);
    }
  };

  const handleRecommendAll = async () => {
    if (!opp?.id) return;
    if (!confirm(t('researcher.grantsDiscover.recommendDialog.recommendAllConfirm'))) return;
    setSaving(true);
    setError('');
    try {
      await onSave(opp.id, { researcherIds: [], recommendAll: true, note: note.trim() });
      setSelected([]);
      setNote('');
      onClose();
    } catch (e) {
      setError(e.response?.data?.detail || e.message || 'Failed to save recommendation');
    } finally {
      setSaving(false);
    }
  };

  const rd = t('researcher.grantsDiscover.recommendDialog');

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 700 }}>{rd.title}</DialogTitle>
      <DialogContent>
        <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 2 }}>{opp?.title}</Typography>

        {(opp?.recommended_researchers || []).length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', mb: 0.75 }}>
              {rd.alreadyRecommended}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {opp.recommended_researchers.map(r => (
                <Chip key={r.user_id} size="small" label={r.name || r.email} sx={{ fontSize: 11 }} />
              ))}
            </Box>
          </Box>
        )}

        <Autocomplete
          multiple
          options={availableOptions}
          loading={loadingResearchers}
          getOptionLabel={(o) => `${o.name || o.email} (${o.email})`}
          value={selected}
          onChange={(_, v) => setSelected(v)}
          filterSelectedOptions
          renderInput={(params) => (
            <TextField
              {...params}
              label={rd.searchLabel}
              placeholder={rd.searchPlaceholder}
              size="small"
              sx={{ mb: 2 }}
            />
          )}
        />

        <TextField
          fullWidth
          multiline
          rows={2}
          size="small"
          label={rd.noteLabel}
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder={rd.notePlaceholder}
        />

        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </DialogContent>
      <DialogActions sx={{ p: 2, flexWrap: 'wrap', gap: 1 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none' }} disabled={saving}>
          {rd.cancel}
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button
          variant="outlined"
          onClick={handleRecommendAll}
          disabled={saving || availableOptions.length === 0}
          sx={{ textTransform: 'none', borderColor: ACCENT, color: ACCENT }}
        >
          {rd.recommendAll}
        </Button>
        <Button
          variant="contained"
          onClick={handleSaveSelected}
          disabled={!selected.length || saving}
          sx={{ bgcolor: ACCENT, textTransform: 'none', '&:hover': { bgcolor: '#14958a' } }}
        >
          {selected.length > 1
            ? rd.saveMultiple.replace('{count}', String(selected.length))
            : rd.save}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function OpportunityDiscoverBoard({
  mode = 'researcher',
  opportunities = [],
  myApplications = {},
  aiMatchMap = {},
  saved = [],
  onSave,
  onApply,
  onCompleteDraft,
  onView,
  onRecommendSave,
  onRecommendRemove,
  canRecommend = false,
  api,
  t,
  locale,
  dir,
  theme,
  dark,
  headerExtra,
  selectedIds = [],
  onSelect,
  onSelectAll,
  bulkActions,
}) {
  const router = useRouter();
  const isRtl = dir === 'rtl';

  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [curatedOnly, setCuratedOnly] = useState(mode === 'researcher');
  const [viewFilter, setViewFilter] = useState('all');
  const [sortBy, setSortBy] = useState('priority');
  const [sortOrder, setSortOrder] = useState('asc');
  const [page, setPage] = useState(1);
  const [recommendOpp, setRecommendOpp] = useState(null);

  const categories = useMemo(
    () => [...new Set(opportunities.map(o => o.category).filter(Boolean))].sort(),
    [opportunities],
  );
  const statuses = useMemo(
    () => [...new Set(opportunities.map(o => (o.status || '').toLowerCase()).filter(Boolean))].sort(),
    [opportunities],
  );

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
        isDraft: true,
      };
    }
    return { label: t('researcher.grantsDiscover.applied'), color: '#6366f1', proposalId: app.id, isDraft: false };
  };

  const getPriority = (opp) => {
    if (opp.staff_recommended) return 0;
    if (aiMatchMap[opp.id]) return 1;
    return 2;
  };

  const filtered = useMemo(() => {
    const statusOrder = { open: 1, upcoming: 2, archived: 3, closed: 4 };
    const q = search.toLowerCase();

    let items = opportunities.filter(o =>
      (catFilter === 'all' || o.category === catFilter) &&
      (statusFilter === 'all' || (o.status || '').toLowerCase() === statusFilter) &&
      (!curatedOnly || o.is_curated) &&
      (!q || o.title?.toLowerCase().includes(q) || o.sponsor?.toLowerCase().includes(q) || o.description?.toLowerCase().includes(q)),
    );

    if (viewFilter === 'new') {
      items = items.filter(isNewOpportunity);
    } else if (viewFilter === 'most_applied') {
      items = items.filter(o => (o.application_count || 0) > 0);
    } else if (viewFilter === 'recommended_to_me') {
      items = items.filter(o => o.staff_recommended);
    }

    items = [...items].sort((a, b) => {
      if (viewFilter === 'all' && sortBy === 'priority') {
        const pDiff = getPriority(a) - getPriority(b);
        if (pDiff !== 0) return pDiff;
        if (a.staff_recommended && b.staff_recommended) return 0;
        const aiA = aiMatchMap[a.id]?.score || 0;
        const aiB = aiMatchMap[b.id]?.score || 0;
        if (aiA !== aiB) return aiB - aiA;
      }

      let aVal, bVal;
      if (sortBy === 'applications' || viewFilter === 'most_applied') {
        aVal = a.application_count || 0;
        bVal = b.application_count || 0;
      } else if (sortBy === 'created_at' || viewFilter === 'new') {
        aVal = a.created_at ? new Date(a.created_at).getTime() : 0;
        bVal = b.created_at ? new Date(b.created_at).getTime() : 0;
      } else if (sortBy === 'deadline') {
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

      if (viewFilter === 'most_applied' || viewFilter === 'new') {
        return sortOrder === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
      }
      return sortOrder === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
    });

    return items;
  }, [opportunities, search, catFilter, statusFilter, curatedOnly, viewFilter, sortBy, sortOrder, aiMatchMap]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page],
  );

  const clearFilters = () => {
    setSearch('');
    setCatFilter('all');
    setStatusFilter('all');
    setCuratedOnly(mode === 'researcher');
    setViewFilter('all');
    setSortBy('priority');
    setSortOrder('asc');
    setPage(1);
  };

  const hasActiveFilters = search || catFilter !== 'all' || statusFilter !== 'all'
    || (mode === 'researcher' && curatedOnly) || viewFilter !== 'all' || sortBy !== 'priority';

  const showingFrom = filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const showingTo = Math.min(page * PAGE_SIZE, filtered.length);

  const handleRecommend = (opp, action, researcher) => {
    if (action === 'add') setRecommendOpp(opp);
    else if (action === 'remove' && researcher) onRecommendRemove?.(opp.id, researcher.user_id);
  };

  return (
    <>
      {headerExtra}

      {bulkActions}

      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexDirection: { xs: 'column', lg: 'row' } }}>
        <Paper elevation={0} sx={{
          width: { xs: '100%', lg: 260 }, flexShrink: 0, p: 2, borderRadius: 3,
          border: `1px solid ${theme.palette.divider}`, bgcolor: 'background.paper',
          position: { lg: 'sticky' }, top: 24,
        }}>
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

          <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, color: 'text.secondary', mb: 1 }}>
            {t('researcher.grantsDiscover.filters.view')}
          </Typography>
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <Select value={viewFilter} onChange={e => { setViewFilter(e.target.value); setPage(1); }} sx={{ borderRadius: 2 }}>
              <MenuItem value="all">{t('researcher.grantsDiscover.filters.viewAll')}</MenuItem>
              <MenuItem value="new">{t('researcher.grantsDiscover.filters.viewNew')}</MenuItem>
              <MenuItem value="most_applied">{t('researcher.grantsDiscover.filters.viewMostApplied')}</MenuItem>
              {mode === 'researcher' && (
                <MenuItem value="recommended_to_me">{t('researcher.grantsDiscover.filters.viewRecommended')}</MenuItem>
              )}
            </Select>
          </FormControl>

          <TextField fullWidth size="small" placeholder={t('researcher.grantsDiscover.filters.searchPlaceholder')}
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            InputProps={{ startAdornment: <SearchIcon sx={{ fontSize: 18, color: 'text.disabled', mr: 1 }} /> }}
            sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />

          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>{t('researcher.grantsDiscover.filters.category')}</InputLabel>
            <Select value={catFilter} onChange={e => { setCatFilter(e.target.value); setPage(1); }} label={t('researcher.grantsDiscover.filters.category')} sx={{ borderRadius: 2 }}>
              <MenuItem value="all">{t('researcher.grantsDiscover.filters.allCategories')}</MenuItem>
              {categories.map(c => <MenuItem key={c} value={c}>{translateCategory(c, t)}</MenuItem>)}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>{t('researcher.grantsDiscover.filters.status')}</InputLabel>
            <Select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} label={t('researcher.grantsDiscover.filters.status')} sx={{ borderRadius: 2 }}>
              <MenuItem value="all">{t('researcher.grantsDiscover.filters.allStatuses')}</MenuItem>
              {statuses.map(s => <MenuItem key={s} value={s}>{getStatusMeta(s, t).label}</MenuItem>)}
            </Select>
          </FormControl>

          <Divider sx={{ my: 2 }} />

          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>{t('researcher.grantsDiscover.filters.sortField')}</InputLabel>
            <Select value={sortBy} onChange={e => setSortBy(e.target.value)} label={t('researcher.grantsDiscover.filters.sortField')} sx={{ borderRadius: 2 }}>
              <MenuItem value="priority">{t('researcher.grantsDiscover.filters.sortPriority')}</MenuItem>
              <MenuItem value="applications">{t('researcher.grantsDiscover.filters.sortApplications')}</MenuItem>
              <MenuItem value="created_at">{t('researcher.grantsDiscover.filters.sortNewest')}</MenuItem>
              <MenuItem value="deadline">{t('researcher.grantsDiscover.filters.sortDeadline')}</MenuItem>
              <MenuItem value="title">{t('researcher.grantsDiscover.filters.sortTitle')}</MenuItem>
            </Select>
          </FormControl>

          {mode === 'researcher' && (
            <FormControlLabel
              control={<Switch checked={curatedOnly} onChange={e => setCuratedOnly(e.target.checked)} size="small"
                sx={{ '& .Mui-checked': { color: ACCENT }, '& .Mui-checked + .MuiSwitch-track': { bgcolor: ACCENT } }} />}
              label={<Typography sx={{ fontSize: 13 }}>{t('researcher.grantsDiscover.filters.publishedOnly')}</Typography>}
            />
          )}
        </Paper>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
            <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
              {t('researcher.grantsDiscover.results.showing', { from: showingFrom, to: showingTo, total: filtered.length })}
            </Typography>
          </Box>

          {paginated.length === 0 ? (
            <Paper elevation={0} sx={{ p: 6, textAlign: 'center', borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
              <CategoryIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
              <Typography sx={{ color: 'text.primary', fontWeight: 600, mb: 0.5 }}>{t('researcher.grantsDiscover.results.emptyTitle')}</Typography>
              <Typography sx={{ color: 'text.secondary', fontSize: 13, mb: 2 }}>{t('researcher.grantsDiscover.results.emptyBody')}</Typography>
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
                  mode={mode}
                  aiRecommended={!!aiMatchMap[opp.id]}
                  aiScore={aiMatchMap[opp.id]?.score}
                  selected={selectedIds.includes(opp.id)}
                  showSelect={mode === 'admin' && !!onSelect}
                  onSelect={onSelect}
                  onSave={onSave ? () => onSave(opp.id) : undefined}
                  onApply={onApply ? () => onApply(opp) : undefined}
                  onCompleteDraft={() => {
                    const app = getApplicationDisplay(opp.id);
                    if (app?.proposalId) router.push(`/researcher/grants/proposals/${app.proposalId}`);
                  }}
                  onView={onView}
                  onRecommend={canRecommend ? handleRecommend : undefined}
                />
              ))}
            </Box>
          )}

          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Pagination count={totalPages} page={page}
                onChange={(_, p) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                color="primary" shape="rounded" size="large"
                sx={{ '& .MuiPaginationItem-root.Mui-selected': { bgcolor: ACCENT, color: '#fff', '&:hover': { bgcolor: '#14958a' } } }}
              />
            </Box>
          )}
        </Box>
      </Box>

      {canRecommend && (
        <RecommendResearcherDialog
          open={!!recommendOpp}
          onClose={() => setRecommendOpp(null)}
          opp={recommendOpp}
          api={api}
          t={t}
          onSave={onRecommendSave}
        />
      )}
    </>
  );
}
