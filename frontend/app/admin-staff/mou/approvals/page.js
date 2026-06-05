'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, Button, Chip, CircularProgress, useTheme,
  Alert, TextField, Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import {
  Gavel as LegalIcon, CheckCircle as ApproveIcon,
  Reply as ReturnIcon, OpenInNew as OpenIcon, Handshake as MouIcon,
} from '@mui/icons-material';
import api from '../../../../lib/api';

const ACCENT = '#16a699';

const PENDING_STATUSES = ['INTERNAL_REVIEW', 'LEGAL_REVIEW', 'EXEC_APPROVAL', 'PENDING_SIGNING'];

const STATUS_CONFIG = {
  INTERNAL_REVIEW:  { label: 'Internal Review', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  LEGAL_REVIEW:     { label: 'Legal Review',    color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
  EXEC_APPROVAL:    { label: 'Exec Approval',   color: '#0b3c5d', bg: 'rgba(11,60,93,0.12)' },
  PENDING_SIGNING:  { label: 'Pending Signing', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
};

export default function ApprovalsPage() {
  const router = useRouter();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';

  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionDialog, setActionDialog] = useState({ open: false, mou: null, action: '' });
  const [comments, setComments] = useState('');
  const [actioning, setActioning] = useState(false);

  useEffect(() => { fetchPending(); }, []);

  const fetchPending = async () => {
    setLoading(true);
    try {
      const all = [];
      for (const s of PENDING_STATUSES) {
        const res = await api.get(`/mou/?status=${s}`).catch(() => ({ data: [] }));
        (res.data || []).forEach(m => all.push(m));
      }
      setPending(all);
    } catch (e) {
      setError('Failed to load pending MoUs.');
    }
    setLoading(false);
  };

  const doAction = async () => {
    const { mou, action } = actionDialog;
    setActioning(true);
    try {
      await api.post(`/mou/${mou.id}/workflow/${action}`, { comments: comments || undefined });
      setActionDialog({ open: false, mou: null, action: '' });
      setComments('');
      await fetchPending();
    } catch (e) {
      setError(e.response?.data?.detail || 'Action failed.');
    }
    setActioning(false);
  };

  const Card = ({ children, sx = {} }) => (
    <Box sx={{ bgcolor: 'background.paper', borderRadius: 3, p: 2.5,
      border: `1px solid ${theme.palette.divider}`,
      boxShadow: dark ? 'none' : '0 2px 8px rgba(0,0,0,0.05)',
      ...sx }}>
      {children}
    </Box>
  );

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
        <LegalIcon sx={{ color: ACCENT }} />
        <Typography sx={{ fontSize: 22, fontWeight: 700, color: 'text.primary' }}>Approval Console</Typography>
        {pending.length > 0 && (
          <Chip label={`${pending.length} pending`} size="small"
            sx={{ bgcolor: 'rgba(239,68,68,0.1)', color: '#ef4444', fontWeight: 700, fontSize: 11 }} />
        )}
      </Box>
      <Typography sx={{ color: 'text.secondary', fontSize: 13, mb: 3 }}>
        MoUs awaiting your review or action.
      </Typography>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: ACCENT }} />
        </Box>
      ) : pending.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 10 }}>
          <ApproveIcon sx={{ fontSize: 56, color: '#10b981', mb: 1.5 }} />
          <Typography sx={{ fontWeight: 600, color: 'text.primary', mb: 0.5 }}>All clear!</Typography>
          <Typography color="text.secondary" fontSize={13}>No MoUs are currently pending approval.</Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {pending.map(mou => {
            const cfg = STATUS_CONFIG[mou.status] || STATUS_CONFIG.INTERNAL_REVIEW;
            const canSign = mou.status === 'PENDING_SIGNING';
            return (
              <Card key={mou.id}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5 }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                      <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'text.primary' }}>{mou.title}</Typography>
                      <Chip label={cfg.label} size="small"
                        sx={{ bgcolor: cfg.bg, color: cfg.color, fontWeight: 700, fontSize: 10, height: 22 }} />
                    </Box>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                      {mou.mou_number} · {mou.mou_type?.replace(/_/g, ' ')}
                      {mou.lead_department ? ` · ${mou.lead_department}` : ''}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button size="small" startIcon={<OpenIcon />}
                      onClick={() => router.push(`/admin-staff/mou/${mou.id}`)}
                      sx={{ textTransform: 'none', color: ACCENT, fontSize: 12 }}>
                      Open
                    </Button>
                    {!canSign && (
                      <>
                        <Button size="small" variant="outlined" startIcon={<ApproveIcon />}
                          onClick={() => setActionDialog({ open: true, mou, action: 'approve' })}
                          sx={{ color: '#10b981', borderColor: '#10b981', textTransform: 'none', fontSize: 12,
                            '&:hover': { bgcolor: 'rgba(16,185,129,0.08)', borderColor: '#10b981' } }}>
                          Approve
                        </Button>
                        <Button size="small" variant="outlined" startIcon={<ReturnIcon />}
                          onClick={() => setActionDialog({ open: true, mou, action: 'return' })}
                          sx={{ color: '#f59e0b', borderColor: '#f59e0b', textTransform: 'none', fontSize: 12,
                            '&:hover': { bgcolor: 'rgba(245,158,11,0.08)', borderColor: '#f59e0b' } }}>
                          Return
                        </Button>
                      </>
                    )}
                    {canSign && (
                      <Button size="small" variant="contained"
                        onClick={() => router.push(`/admin-staff/mou/${mou.id}`)}
                        sx={{ bgcolor: '#3b82f6', textTransform: 'none', fontSize: 12,
                          '&:hover': { bgcolor: '#2563eb' } }}>
                        Record Signing
                      </Button>
                    )}
                  </Box>
                </Box>
              </Card>
            );
          })}
        </Box>
      )}

      {/* Action Dialog */}
      <Dialog open={actionDialog.open} onClose={() => setActionDialog({ open: false, mou: null, action: '' })}
        maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {actionDialog.action === 'approve' ? 'Approve Stage' : 'Return with Comments'}
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 2 }}>
            MoU: <strong>{actionDialog.mou?.title}</strong>
          </Typography>
          <TextField fullWidth size="small" multiline rows={3}
            label={actionDialog.action === 'return' ? 'Reason for returning *' : 'Comments (optional)'}
            value={comments} onChange={e => setComments(e.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setActionDialog({ open: false, mou: null, action: '' })}
            sx={{ textTransform: 'none', color: 'text.secondary' }}>Cancel</Button>
          <Button variant="contained" onClick={doAction} disabled={actioning}
            sx={{ bgcolor: actionDialog.action === 'approve' ? '#10b981' : '#f59e0b',
              textTransform: 'none', fontWeight: 600, borderRadius: 2,
              '&:hover': { bgcolor: actionDialog.action === 'approve' ? '#059669' : '#d97706' } }}>
            {actioning ? <CircularProgress size={16} color="inherit" /> :
              (actionDialog.action === 'approve' ? 'Approve' : 'Return')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
