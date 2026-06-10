'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Box, Typography, CircularProgress, Alert, Paper, Chip, Avatar, Button,
  useTheme, Divider, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Tabs, Tab, IconButton, Tooltip,
} from '@mui/material';
import {
  ArrowBack as BackIcon, Email as EmailIcon, School as ExpertiseIcon,
  CalendarToday as CalIcon, Assignment as AssignmentIcon, Person as PersonIcon,
  Description as ProposalIcon, Science as ProjectIcon, Gavel as EthicsIcon,
  CheckCircle as DoneIcon, Schedule as PendingIcon, PlayArrow as InProgressIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { useAuth } from '../../../../../contexts/AuthContext';
import api from '../../../../../lib/api';

const ACCENT = '#16a699';

const fmtDate = d => d
  ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—';

const STATUS_META = {
  pending_signup: { label: 'Pending Signup', color: '#f59e0b', icon: PendingIcon },
  assigned: { label: 'Assigned', color: '#3b82f6', icon: AssignmentIcon },
  in_progress: { label: 'In Progress', color: '#0ea5e9', icon: InProgressIcon },
  submitted: { label: 'Completed', color: '#10b981', icon: DoneIcon },
};

export default function ReviewerProfilePage() {
  const router = useRouter();
  const params = useParams();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';

  const [loading, setLoading] = useState(true);
  const [reviewer, setReviewer] = useState(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => { init(); }, [params.id]);

  const init = async () => {
    const u = await fetchUser();
    if (!u) { router.push('/login'); return; }
    if (u.is_global_admin) { router.push('/global-admin/dashboard'); return; }
    if (u.is_institution_admin) { router.push('/institution-admin/dashboard'); return; }
    await loadReviewer();
  };

  const loadReviewer = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/admin-staff/reviewers/${params.id}`);
      setReviewer(res.data);
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to load reviewer profile');
      setReviewer(null);
    } finally {
      setLoading(false);
    }
  };

  const headCell = {
    fontWeight: 700,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    color: 'text.secondary',
    whiteSpace: 'nowrap',
  };

  const renderAssignmentTable = (assignments, type) => {
    const typeConfig = {
      proposal: { color: '#3b82f6', path: '/admin-staff/grants/proposals' },
      project: { color: '#10b981', path: '/admin-staff/research/projects' },
      ethics: { color: '#8b5cf6', path: '/admin-staff/ethics/reviews' },
    };
    const config = typeConfig[type];

    return (
      <TableContainer component={Paper} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <Table>
          <TableHead sx={{ bgcolor: dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
            <TableRow>
              <TableCell sx={headCell}>Title</TableCell>
              <TableCell sx={headCell}>Assigned By</TableCell>
              <TableCell sx={headCell}>Assigned Date</TableCell>
              <TableCell sx={headCell}>Status</TableCell>
              <TableCell sx={headCell}>Submitted</TableCell>
              <TableCell sx={headCell} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {assignments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                  <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>
                    No {type} review assignments
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              assignments.map(assignment => {
                const statusInfo = STATUS_META[assignment.status] || STATUS_META.assigned;
                const StatusIcon = statusInfo.icon;

                return (
                  <TableRow key={assignment.id} hover>
                    <TableCell>
                      <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary', maxWidth: 400 }}>
                        {assignment.entity_title || 'Untitled'}
                      </Typography>
                      {assignment.notes && (
                        <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.5 }}>
                          {assignment.notes}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                        {assignment.assigned_by || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                        {fmtDate(assignment.assigned_at)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={<StatusIcon sx={{ fontSize: 14 }} />}
                        label={statusInfo.label}
                        size="small"
                        sx={{
                          bgcolor: `${statusInfo.color}15`,
                          color: statusInfo.color,
                          fontWeight: 600,
                          fontSize: 11,
                          '& .MuiChip-icon': { color: statusInfo.color },
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                        {assignment.submitted_at ? fmtDate(assignment.submitted_at) : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="View Details">
                        <IconButton
                          size="small"
                          onClick={() => router.push(`${config.path}/${assignment.entity_id}`)}
                          sx={{ color: config.color }}
                        >
                          <ViewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress sx={{ color: ACCENT }} />
      </Box>
    );
  }

  if (!reviewer) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">Reviewer not found</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<BackIcon />}
          onClick={() => router.push('/admin-staff/admin/reviewers')}
          sx={{ mb: 2, textTransform: 'none', color: 'text.secondary' }}
        >
          Back to Reviewers
        </Button>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 3 }}>
          <Avatar sx={{ width: 80, height: 80, bgcolor: ACCENT, fontSize: 32, fontWeight: 700 }}>
            {reviewer.name?.charAt(0) || '?'}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontSize: 28, fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
              {reviewer.name || 'Unknown Reviewer'}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <EmailIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
                  {reviewer.email}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <CalIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
                  Joined {fmtDate(reviewer.joined_at)}
                </Typography>
              </Box>
            </Box>
            {reviewer.expertise && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                <ExpertiseIcon sx={{ fontSize: 16, color: ACCENT }} />
                <Typography sx={{ fontSize: 13, color: 'text.primary' }}>
                  {reviewer.expertise}
                </Typography>
              </Box>
            )}
            <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
              {reviewer.roles?.map(role => (
                <Chip
                  key={role}
                  label={role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  size="small"
                  sx={{ bgcolor: 'rgba(22,166,153,0.1)', color: ACCENT, fontWeight: 600, fontSize: 11 }}
                />
              ))}
            </Box>
          </Box>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Stats */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2, mb: 4 }}>
        <Paper sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <AssignmentIcon sx={{ fontSize: 20, color: ACCENT }} />
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Total Reviews
            </Typography>
          </Box>
          <Typography sx={{ fontSize: 28, fontWeight: 800, color: 'text.primary' }}>
            {reviewer.total_assignments || 0}
          </Typography>
        </Paper>

        <Paper sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <ProposalIcon sx={{ fontSize: 20, color: '#3b82f6' }} />
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Proposals
            </Typography>
          </Box>
          <Typography sx={{ fontSize: 28, fontWeight: 800, color: 'text.primary' }}>
            {reviewer.proposal_assignments?.length || 0}
          </Typography>
        </Paper>

        <Paper sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <ProjectIcon sx={{ fontSize: 20, color: '#10b981' }} />
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Projects
            </Typography>
          </Box>
          <Typography sx={{ fontSize: 28, fontWeight: 800, color: 'text.primary' }}>
            {reviewer.project_assignments?.length || 0}
          </Typography>
        </Paper>

        <Paper sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <EthicsIcon sx={{ fontSize: 20, color: '#8b5cf6' }} />
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Ethics
            </Typography>
          </Box>
          <Typography sx={{ fontSize: 28, fontWeight: 800, color: 'text.primary' }}>
            {reviewer.ethics_assignments?.length || 0}
          </Typography>
        </Paper>
      </Box>

      {/* Assignment History Tabs */}
      <Paper sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          sx={{
            borderBottom: '1px solid',
            borderColor: 'divider',
            px: 2,
            '& .MuiTab-root': { textTransform: 'none', fontWeight: 600 },
            '& .Mui-selected': { color: ACCENT },
            '& .MuiTabs-indicator': { bgcolor: ACCENT },
          }}
        >
          <Tab label={`Proposals (${reviewer.proposal_assignments?.length || 0})`} />
          <Tab label={`Projects (${reviewer.project_assignments?.length || 0})`} />
          <Tab label={`Ethics (${reviewer.ethics_assignments?.length || 0})`} />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {activeTab === 0 && renderAssignmentTable(reviewer.proposal_assignments || [], 'proposal')}
          {activeTab === 1 && renderAssignmentTable(reviewer.project_assignments || [], 'project')}
          {activeTab === 2 && renderAssignmentTable(reviewer.ethics_assignments || [], 'ethics')}
        </Box>
      </Paper>
    </Box>
  );
}
