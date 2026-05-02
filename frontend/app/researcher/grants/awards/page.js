'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, Chip, CircularProgress, Button, useTheme,
  Alert, Paper, Divider, LinearProgress, Tooltip, Avatar,
} from '@mui/material';
import {
  EmojiEvents as TrophyIcon,
  CalendarToday as CalIcon,
  AccountBalance as FunderIcon,
  Refresh as RefreshIcon,
  AccountTree as ProjectIcon,
  CheckCircle as CheckIcon,
  PauseCircle as SuspendedIcon,
  Cancel as TerminatedIcon,
  TaskAlt as CompletedIcon,
  OpenInNew as OpenIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../../../../contexts/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
const ACCENT  = '#16a699';
const GOLD    = '#f59e0b';

const STATUS_META = {
  active:     { label: 'Active',     color: '#10b981', bg: '#ecfdf5', Icon: CheckIcon },
  suspended:  { label: 'Suspended',  color: '#f97316', bg: '#fff7ed', Icon: SuspendedIcon },
  completed:  { label: 'Completed',  color: '#64748b', bg: '#f1f5f9', Icon: CompletedIcon },
  terminated: { label: 'Terminated', color: '#ef4444', bg: '#fef2f2', Icon: TerminatedIcon },
};

const fmtDate  = d => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtMoney = (amt, cur) => {
  if (!amt) return '—';
  return `${cur || 'KES'} ${Number(amt).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

function BudgetBar({ lines = [] }) {
  const total  = lines.reduce((s, l) => s + (l.amount || 0), 0);
  const spent  = lines.reduce((s, l) => s + (l.spent_to_date || 0), 0);
  const spentPct = total > 0 ? Math.min(100, Math.round(spent / total * 100)) : 0;
  if (lines.length === 0) return null;

  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 600 }}>Budget utilisation</Typography>
        <Typography sx={{ fontSize: 11, color: spentPct > 80 ? '#ef4444' : 'text.secondary' }}>
          {spentPct}%
        </Typography>
      </Box>
      <LinearProgress variant="determinate" value={spentPct}
        sx={{ height: 5, borderRadius: 3, bgcolor: 'divider',
          '& .MuiLinearProgress-bar': { bgcolor: spentPct > 80 ? '#ef4444' : ACCENT } }} />
      <Box sx={{ display: 'flex', gap: 2, mt: 1.5, flexWrap: 'wrap' }}>
        {lines.map((bl, i) => (
          <Tooltip key={i} title={bl.description || bl.category}
            arrow componentsProps={{ tooltip: { sx: { fontSize: 11 } } }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.2 }}>
              <Typography sx={{ fontSize: 10, color: 'text.secondary', fontWeight: 600 }}>
                {bl.category}
              </Typography>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.primary' }}>
                {fmtMoney(bl.amount)}
              </Typography>
            </Box>
          </Tooltip>
        ))}
      </Box>
    </Box>
  );
}

function AwardCertificate({ award, onOpenProject }) {
  const theme = useTheme();
  const dark  = theme.palette.mode === 'dark';
  const sm    = STATUS_META[award.status] || STATUS_META.active;
  const { Icon: StatusIcon } = sm;

  const duration = award.start_date && award.end_date
    ? Math.round((new Date(award.end_date) - new Date(award.start_date)) / (1000 * 60 * 60 * 24 * 30))
    : null;

  return (
    <Paper elevation={0} variant="outlined" sx={{
      borderRadius: 3,
      overflow: 'hidden',
      borderColor: `${GOLD}55`,
      transition: 'box-shadow 0.15s',
      '&:hover': { boxShadow: dark ? 'none' : '0 6px 24px rgba(0,0,0,0.09)' },
    }}>
      {/* Gold header band */}
      <Box sx={{
        px: 3, py: 2,
        background: dark
          ? 'linear-gradient(135deg, #78350f22, #92400e22)'
          : 'linear-gradient(135deg, #fffbeb, #fef3c7)',
        borderBottom: `1px solid ${GOLD}44`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{
            width: 36, height: 36, borderRadius: '50%',
            bgcolor: `${GOLD}22`, border: `2px solid ${GOLD}55`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <TrophyIcon sx={{ fontSize: 18, color: GOLD }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 11, color: GOLD, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>
              Award Certificate
            </Typography>
            <Typography sx={{ fontSize: 13, fontWeight: 800, color: 'text.primary', mt: 0.1 }}>
              {award.award_number}
            </Typography>
          </Box>
        </Box>
        <Chip
          icon={<StatusIcon sx={{ fontSize: 13, '&&': { color: sm.color } }} />}
          label={sm.label}
          size="small"
          sx={{ bgcolor: sm.bg, color: sm.color, fontWeight: 700, fontSize: 11, height: 24 }}
        />
      </Box>

      <Box sx={{ p: 3 }}>
        {/* Proposal title */}
        <Typography sx={{ fontSize: 16, fontWeight: 800, lineHeight: 1.35, mb: 0.5 }}>
          {award.proposal_title || `Proposal #${award.proposal_id}`}
        </Typography>
        <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mb: 2 }}>
          {award.opportunity_title || award.opportunity_sponsor || award.funder_name || '—'}
        </Typography>

        {/* Key details grid */}
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 2, mb: 2,
        }}>
          {/* Total Amount */}
          <Box sx={{
            p: 2, borderRadius: 2,
            bgcolor: dark ? `${ACCENT}10` : '#f0fdf9',
            border: `1px solid ${ACCENT}30`,
          }}>
            <Typography sx={{ fontSize: 10, color: ACCENT, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.5 }}>
              Total Award
            </Typography>
            <Typography sx={{ fontSize: 20, fontWeight: 800, color: ACCENT, lineHeight: 1 }}>
              {fmtMoney(award.total_amount, award.currency)}
            </Typography>
          </Box>

          {/* Funder */}
          <Box sx={{ p: 2, borderRadius: 2, bgcolor: dark ? 'rgba(255,255,255,0.03)' : '#f8fafc', border: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.7, mb: 0.5 }}>
              <FunderIcon sx={{ fontSize: 11, color: 'text.disabled' }} />
              <Typography sx={{ fontSize: 10, color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Funder
              </Typography>
            </Box>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.primary' }}>
              {award.funder_name || award.opportunity_sponsor || '—'}
            </Typography>
          </Box>

          {/* Period */}
          <Box sx={{ p: 2, borderRadius: 2, bgcolor: dark ? 'rgba(255,255,255,0.03)' : '#f8fafc', border: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.7, mb: 0.5 }}>
              <CalIcon sx={{ fontSize: 11, color: 'text.disabled' }} />
              <Typography sx={{ fontSize: 10, color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Period
              </Typography>
            </Box>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.primary' }}>
              {fmtDate(award.start_date)} → {fmtDate(award.end_date)}
            </Typography>
            {duration !== null && (
              <Typography sx={{ fontSize: 10, color: 'text.disabled', mt: 0.3 }}>
                {duration} months
              </Typography>
            )}
          </Box>

          {/* Issued */}
          <Box sx={{ p: 2, borderRadius: 2, bgcolor: dark ? 'rgba(255,255,255,0.03)' : '#f8fafc', border: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.7, mb: 0.5 }}>
              <CheckIcon sx={{ fontSize: 11, color: 'text.disabled' }} />
              <Typography sx={{ fontSize: 10, color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Date Awarded
              </Typography>
            </Box>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.primary' }}>
              {fmtDate(award.issued_at)}
            </Typography>
          </Box>
        </Box>

        {/* Conditions */}
        {award.conditions && (
          <Box sx={{ mb: 2, p: 1.5, borderRadius: 2, bgcolor: dark ? '#92400e18' : '#fffbeb', border: '1px solid #fcd34d55' }}>
            <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.4 }}>
              Award Conditions
            </Typography>
            <Typography sx={{ fontSize: 12.5, color: dark ? '#fcd34d' : '#78350f', lineHeight: 1.55 }}>
              {award.conditions}
            </Typography>
          </Box>
        )}

        {/* Budget breakdown */}
        <BudgetBar lines={award.budget_lines} />

        <Divider sx={{ my: 2 }} />

        {/* Footer actions */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Box>
            {award.project_id ? (
              <Typography sx={{ fontSize: 12, color: ACCENT, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <ProjectIcon sx={{ fontSize: 14 }} />
                Research project created
              </Typography>
            ) : (
              <Typography sx={{ fontSize: 12, color: 'text.disabled', fontStyle: 'italic' }}>
                No research project linked yet
              </Typography>
            )}
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button size="small" variant="outlined"
              startIcon={<OpenIcon sx={{ fontSize: 13 }} />}
              onClick={() => onOpenProject('proposal', award.proposal_id)}
              sx={{ textTransform: 'none', fontSize: 12, borderRadius: 2, py: 0.5 }}>
              View Proposal
            </Button>
            {award.project_id ? (
              <Button size="small" variant="contained"
                startIcon={<ProjectIcon sx={{ fontSize: 13 }} />}
                onClick={() => onOpenProject('project', award.project_id)}
                sx={{
                  textTransform: 'none', fontSize: 12, borderRadius: 2, py: 0.5,
                  bgcolor: ACCENT, '&:hover': { bgcolor: '#14958a' },
                }}>
                Open Project
              </Button>
            ) : (
              <Button size="small" variant="contained"
                startIcon={<ProjectIcon sx={{ fontSize: 13 }} />}
                onClick={() => onOpenProject('convert', award)}
                sx={{
                  textTransform: 'none', fontSize: 12, borderRadius: 2, py: 0.5,
                  bgcolor: GOLD, '&:hover': { bgcolor: '#d97706' },
                }}>
                Convert to Project
              </Button>
            )}
          </Box>
        </Box>
      </Box>
    </Paper>
  );
}

export default function ResearcherAwardsPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const [loading, setLoading]   = useState(true);
  const [awards, setAwards]     = useState([]);
  const [error, setError]       = useState('');

  useEffect(() => {
    fetchUser().then(u => {
      if (!u) { router.push('/login'); return; }
      loadAwards();
    });
  }, []);

  const loadAwards = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Fetch live proposals from database
      const res = await axios.get(`${API_URL}/grants/proposals`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const proposals = res.data || [];
      
      // Transform proposals into awards for demonstration
      // In production, this would fetch from a real awards endpoint
      const transformedAwards = proposals.map((proposal, index) => {
        // Generate mock award details based on proposal
        const baseAmount = 5000000 + (index * 2500000);
        const totalAmount = baseAmount + Math.floor(Math.random() * 5000000);
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - (index * 3));
        const endDate = new Date(startDate);
        endDate.setFullYear(endDate.getFullYear() + 2);
        
        // Generate budget breakdown
        const personnelAmt = Math.floor(totalAmount * 0.45);
        const equipmentAmt = Math.floor(totalAmount * 0.25);
        const travelAmt = Math.floor(totalAmount * 0.15);
        const materialsAmt = Math.floor(totalAmount * 0.10);
        const otherAmt = totalAmount - (personnelAmt + equipmentAmt + travelAmt + materialsAmt);
        
        return {
          id: proposal.id,
          award_number: `AWD-2026-${String(proposal.id).padStart(3, '0')}`,
          proposal_id: proposal.id,
          proposal_title: proposal.title,
          opportunity_title: proposal.opportunity?.title || 'Research Grant',
          opportunity_sponsor: proposal.opportunity?.sponsor || 'Funding Agency',
          funder_name: proposal.opportunity?.sponsor || 'Funding Agency',
          total_amount: totalAmount,
          currency: 'KES',
          status: index === 0 ? 'active' : (index % 3 === 0 ? 'completed' : 'active'),
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          issued_at: new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          conditions: 'Quarterly progress reports required. Annual financial audits mandatory. All publications must acknowledge funding source.',
          project_id: null,
          // PI / team data from proposal
          pi_name:        proposal.submitted_by?.name  || proposal.lead_pi?.name  || '',
          pi_email:       proposal.submitted_by?.email || proposal.lead_pi?.email || '',
          pi_orcid:       proposal.submitted_by?.orcid || proposal.lead_pi?.orcid || '',
          pi_institution: proposal.submitted_by?.institution_name || '',
          pi_department:  proposal.submitted_by?.department       || '',
          collaborators:  proposal.collaborators || [],
          budget_lines: [
            { 
              category: 'Personnel', 
              amount: personnelAmt, 
              spent_to_date: Math.floor(personnelAmt * 0.2), 
              description: 'Research staff salaries and benefits' 
            },
            { 
              category: 'Equipment', 
              amount: equipmentAmt, 
              spent_to_date: Math.floor(equipmentAmt * 0.6), 
              description: 'Research equipment and infrastructure' 
            },
            { 
              category: 'Travel', 
              amount: travelAmt, 
              spent_to_date: Math.floor(travelAmt * 0.15), 
              description: 'Field research and conference attendance' 
            },
            { 
              category: 'Materials', 
              amount: materialsAmt, 
              spent_to_date: Math.floor(materialsAmt * 0.25), 
              description: 'Research materials and supplies' 
            },
            { 
              category: 'Other', 
              amount: otherAmt, 
              spent_to_date: Math.floor(otherAmt * 0.1), 
              description: 'Miscellaneous project expenses' 
            },
          ],
        };
      });
      
      setAwards(transformedAwards);
    } catch (e) {
      if (e.response?.status === 401) {
        localStorage.removeItem('token');
        router.push('/login');
      } else {
        setError('Failed to load awards');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOpenProject = (type, data) => {
    if (type === 'proposal') {
      router.push(`/researcher/grants/proposals/${data}`);
    } else if (type === 'project') {
      router.push(`/researcher/projects/${data}`);
    } else if (type === 'convert') {
      // Store award data in sessionStorage for the create project form
      sessionStorage.setItem('awardData', JSON.stringify(data));
      router.push('/researcher/projects/create');
    }
  };

  const stats = {
    total:     awards.length,
    active:    awards.filter(a => a.status === 'active').length,
    completed: awards.filter(a => a.status === 'completed').length,
    total_value: awards.reduce((s, a) => s + (a.total_amount || 0), 0),
  };

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <CircularProgress />
    </Box>
  );

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.4 }}>
            <TrophyIcon sx={{ fontSize: 26, color: GOLD }} />
            <Typography sx={{ fontSize: 22, fontWeight: 800 }}>My Awards</Typography>
          </Box>
          <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
            Your awarded grants and linked research projects
          </Typography>
        </Box>
        <Button size="small" variant="outlined" startIcon={<RefreshIcon sx={{ fontSize: 15 }} />}
          onClick={loadAwards} sx={{ textTransform: 'none', borderRadius: 2 }}>
          Refresh
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Summary stats */}
      {awards.length > 0 && (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 1.5, mb: 3 }}>
          {[
            { label: 'Total Awards',   value: stats.total,     color: '#64748b' },
            { label: 'Active',         value: stats.active,    color: ACCENT },
            { label: 'Completed',      value: stats.completed, color: '#10b981' },
            {
              label: 'Total Funded',
              value: stats.total_value > 0 ? `KES ${(stats.total_value / 1e6).toFixed(1)}M` : '—',
              color: GOLD,
            },
          ].map(s => (
            <Paper key={s.label} elevation={0} variant="outlined" sx={{ p: 1.5, borderRadius: 2, textAlign: 'center' }}>
              <Typography sx={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</Typography>
              <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{s.label}</Typography>
            </Paper>
          ))}
        </Box>
      )}

      {/* Award certificates */}
      {awards.length === 0 ? (
        <Paper elevation={0} variant="outlined" sx={{ p: 6, borderRadius: 3, textAlign: 'center' }}>
          <TrophyIcon sx={{ fontSize: 52, color: `${GOLD}55`, mb: 2 }} />
          <Typography sx={{ fontSize: 16, fontWeight: 700, mb: 0.5 }}>No awards yet</Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 3 }}>
            Awards will appear here once your proposals are approved and funded.
          </Typography>
          <Button variant="contained" onClick={() => router.push('/researcher/grants/applications')}
            sx={{ textTransform: 'none', bgcolor: ACCENT, '&:hover': { bgcolor: '#14958a' }, borderRadius: 2 }}>
            View My Applications
          </Button>
        </Paper>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {awards.map(a => (
            <AwardCertificate key={a.id} award={a} onOpenProject={handleOpenProject} />
          ))}
        </Box>
      )}
    </Box>
  );
}
