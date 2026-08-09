'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, CircularProgress, useTheme, Chip, Button, Alert, Paper, IconButton,
} from '@mui/material';
import {
  AutoAwesome as SparkleIcon, Close as CloseIcon, Psychology as AIIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useAuth } from '../../../../contexts/AuthContext';
import { useLanguage } from '../../../../contexts/LanguageContext';
import api from '../../../../lib/api';
import { grantsAPI } from '../../../../lib/apiModules';
import OpportunityDiscoverBoard from '../../../../components/grants/OpportunityDiscoverBoard';

const ACCENT = '#16a699';

export default function DiscoverOpportunitiesPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const { t, locale, dir } = useLanguage();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';

  const [loading, setLoading] = useState(true);
  const [opportunities, setOpportunities] = useState([]);
  const [saved, setSaved] = useState([]);
  const [error, setError] = useState('');
  const [myApplications, setMyApplications] = useState({});
  const [aiMatchMap, setAiMatchMap] = useState({});
  const [aiMatches, setAiMatches] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiPanelOpen, setAiPanelOpen] = useState(false);

  useEffect(() => { init(); }, []);

  const init = async () => {
    const u = await fetchUser();
    if (!u) { router.push('/login'); return; }
    await Promise.all([loadOpportunities(u.id), loadAiMatches()]);
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
            appMap[p.opportunity_id] = { id: p.id, status: (p.status || '').toLowerCase(), title: p.title };
          }
        }
      });
      setMyApplications(appMap);
    } catch (e) {
      setError(t('researcher.grantsDiscover.errorLoad'));
      console.error(e);
    }
  };

  const loadAiMatches = async () => {
    try {
      const res = await grantsAPI.matchOpportunities({ limit: 10, includeUpcoming: false });
      const map = {};
      (res.data?.matches || []).forEach(m => {
        map[m.opportunity_id] = {
          score: Math.min(Math.round(m.score * 500), 100),
          match: m,
        };
      });
      setAiMatchMap(map);
    } catch {
      // AI matching is optional enrichment
    }
  };

  const runAiMatch = async () => {
    setAiLoading(true);
    setAiError('');
    setAiPanelOpen(true);
    try {
      const res = await grantsAPI.matchOpportunities({ limit: 3, includeUpcoming: false });
      setAiMatches(res.data);
      const map = { ...aiMatchMap };
      (res.data?.matches || []).forEach(m => {
        map[m.opportunity_id] = { score: Math.min(Math.round(m.score * 500), 100), match: m };
      });
      setAiMatchMap(map);
    } catch (e) {
      setAiError(e.response?.data?.detail || t('researcher.grantsDiscover.ai.failed'));
      setAiPanelOpen(false);
    } finally {
      setAiLoading(false);
    }
  };

  const headerExtra = (
    <>
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
          <Chip label={t('researcher.grantsDiscover.summary.recommended', { count: opportunities.filter(o => o.staff_recommended).length })} sx={{ bgcolor: `${ACCENT}18`, color: ACCENT, fontWeight: 600 }} />
        </Box>
        <Button variant="contained" startIcon={aiLoading ? <CircularProgress size={16} color="inherit" /> : <SparkleIcon />}
          onClick={runAiMatch} disabled={aiLoading}
          sx={{
            background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
            color: '#fff', textTransform: 'none', fontWeight: 700, borderRadius: 2.5,
            px: 2.5, py: 1, boxShadow: '0 4px 14px rgba(79,70,229,0.35)',
          }}>
          {aiLoading ? t('researcher.grantsDiscover.ai.analysing') : t('researcher.grantsDiscover.ai.findMatches')}
        </Button>
      </Box>

      {aiError && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setAiError('')}>{aiError}</Alert>}

      {aiPanelOpen && aiMatches && (
        <Paper elevation={0} sx={{ mb: 3, borderRadius: 3, border: '1px solid rgba(124,58,237,0.3)', overflow: 'hidden' }}>
          <Box sx={{ px: 3, py: 2, display: 'flex', alignItems: 'center', gap: 1.5, borderBottom: '1px solid rgba(124,58,237,0.15)' }}>
            <AIIcon sx={{ color: '#7c3aed' }} />
            <Typography sx={{ fontWeight: 700, flex: 1 }}>{t('researcher.grantsDiscover.ai.topMatches')}</Typography>
            <IconButton size="small" onClick={() => setAiPanelOpen(false)}><CloseIcon /></IconButton>
          </Box>
          <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {aiMatches.matches?.map((match, idx) => (
              <Paper key={match.opportunity_id} elevation={0} sx={{ p: 2, borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}>
                <Typography sx={{ fontWeight: 700, mb: 0.5 }}>{match.title}</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                  {match.reasons?.map((r, i) => (
                    <Chip key={i} icon={<CheckCircleIcon sx={{ fontSize: '13px !important' }} />} label={r} size="small"
                      sx={{ fontSize: 11, bgcolor: 'rgba(16,185,129,0.08)', color: '#10b981' }} />
                  ))}
                </Box>
              </Paper>
            ))}
          </Box>
        </Paper>
      )}
    </>
  );

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}><CircularProgress /></Box>;
  }

  return (
    <Box sx={{ px: { xs: 1.5, md: 2 }, py: { xs: 1.5, md: 2 }, width: '100%' }}>
      <OpportunityDiscoverBoard
        mode="researcher"
        opportunities={opportunities}
        myApplications={myApplications}
        aiMatchMap={aiMatchMap}
        saved={saved}
        onSave={(id) => setSaved(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])}
        onApply={(opp) => {
          const oppData = encodeURIComponent(JSON.stringify({ id: opp.id, title: opp.title, sponsor: opp.sponsor, deadline: opp.deadline }));
          router.push(`/researcher/grants/proposals?new=true&opp=${oppData}`);
        }}
        t={t}
        locale={locale}
        dir={dir}
        theme={theme}
        dark={dark}
        headerExtra={headerExtra}
      />
    </Box>
  );
}
