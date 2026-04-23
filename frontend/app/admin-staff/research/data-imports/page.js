'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, Chip, CircularProgress, Button, useTheme,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  TextField, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions,
  Alert, IconButton, Tooltip, Paper,
} from '@mui/material';
import {
  CheckCircle as ApproveIcon, Cancel as RejectIcon,
  Visibility as ViewIcon, FilterList as FilterIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../../../../contexts/AuthContext';

const API    = process.env.NEXT_PUBLIC_API_URL || '/api';
const ACCENT = '#1ca7a1';

const statusColor = s => ({
  approved:'#10b981', pending:'#f59e0b', rejected:'#ef4444', expired:'#64748b',
}[s] || '#64748b');
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '—';

function ReviewDialog({ open, onClose, request, onReviewed }) {
  const [decision, setDecision] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!request) return null;

  const handle = async () => {
    if (!decision) return;
    setSaving(true); setError('');
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/admin/data-import/${request.id}/review`,
        { decision, rejection_reason: decision === 'rejected' ? rejectionReason : null },
        { headers: { Authorization: `Bearer ${token}` } });
      onReviewed();
      onClose();
      setDecision(''); setRejectionReason('');
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to submit review');
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx:{ borderRadius:3 } }}>
      <DialogTitle sx={{ fontWeight:700, pb:1 }}>Review Data Import Request</DialogTitle>
      <DialogContent sx={{ display:'flex', flexDirection:'column', gap:2, pt:'8px !important' }}>
        {error && <Alert severity="error" sx={{ fontSize:12 }}>{error}</Alert>}
        <Box>
          <Typography sx={{ fontSize:12, fontWeight:600, mb:0.5 }}>Project</Typography>
          <Typography sx={{ fontSize:13 }}>{request.project_title}</Typography>
        </Box>
        <Box>
          <Typography sx={{ fontSize:12, fontWeight:600, mb:0.5 }}>Requester</Typography>
          <Typography sx={{ fontSize:13 }}>{request.requester_name} ({request.requester_email})</Typography>
        </Box>
        <Box>
          <Typography sx={{ fontSize:12, fontWeight:600, mb:0.5 }}>Justification</Typography>
          <Typography sx={{ fontSize:13, whiteSpace:'pre-wrap' }}>{request.justification}</Typography>
        </Box>
        <Box>
          <Typography sx={{ fontSize:12, fontWeight:600, mb:0.5 }}>Datasets Requested</Typography>
          {request.requested_datasets?.length ? request.requested_datasets.map((d,i)=>(
            <Typography key={i} sx={{ fontSize:13 }}>• {d}</Typography>
          )) : <Typography sx={{ fontSize:13, color:'text.disabled' }}>—</Typography>}
        </Box>
        <Box>
          <Typography sx={{ fontSize:12, fontWeight:600, mb:0.5 }}>Access Duration</Typography>
          <Typography sx={{ fontSize:13 }}>{request.access_duration_months} month{request.access_duration_months !== 1 ? 's' : ''}</Typography>
        </Box>
        <TextField select fullWidth size="small" label="Decision" value={decision}
          onChange={e => setDecision(e.target.value)}>
          <MenuItem value="approved">Approve</MenuItem>
          <MenuItem value="rejected">Reject</MenuItem>
        </TextField>
        {decision === 'rejected' && (
          <TextField fullWidth size="small" label="Rejection Reason" multiline rows={3} value={rejectionReason}
            onChange={e => setRejectionReason(e.target.value)}
            placeholder="Explain why this request is being rejected…" />
        )}
      </DialogContent>
      <DialogActions sx={{ p:2, pt:0 }}>
        <Button onClick={onClose} sx={{ textTransform:'none' }}>Cancel</Button>
        <Button variant="contained" onClick={handle} disabled={saving || !decision}
          sx={{ bgcolor:ACCENT, textTransform:'none', borderRadius:2, '&:hover':{ bgcolor:'#0e7490' } }}>
          {saving ? 'Submitting…' : 'Submit Review'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function AdminDataImportsPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const dark  = theme.palette.mode === 'dark';
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [reviewOpen, setReviewOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUser().then(u => { if (!u) router.push('/login'); else loadData(); });
  }, [statusFilter]);

  const loadData = async () => {
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const res = await axios.get(`${API}/admin/data-import${statusFilter ? `?status=${statusFilter}` : ''}`, { headers });
      setRequests(res.data || []);
    } catch (e) { setError('Failed to load requests'); }
    finally { setLoading(false); }
  };

  if (loading) return <Box sx={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'100vh' }}><CircularProgress /></Box>;

  const statusCounts = {
    pending: requests.filter(r=>r.status==='pending').length,
    approved: requests.filter(r=>r.status==='approved').length,
    rejected: requests.filter(r=>r.status==='rejected').length,
    expired: requests.filter(r=>r.status==='expired').length,
  };

  return (
    <Box sx={{ p:3 }}>
      <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb:3 }}>
        <Box>
          <Typography sx={{ fontSize:22, fontWeight:700 }}>Data Import Requests</Typography>
          <Typography sx={{ fontSize:13, color:'text.secondary', mt:0.3 }}>Review and approve researcher data import requests</Typography>
        </Box>
        <TextField select size="small" label="Filter by Status" value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)} sx={{ minWidth:160 }}>
          <MenuItem value="">All</MenuItem>
          <MenuItem value="pending">Pending</MenuItem>
          <MenuItem value="approved">Approved</MenuItem>
          <MenuItem value="rejected">Rejected</MenuItem>
          <MenuItem value="expired">Expired</MenuItem>
        </TextField>
      </Box>

      <Box sx={{ display:'flex', gap:1.5, mb:3, flexWrap:'wrap' }}>
        {[
          { label:'Pending', value:statusCounts.pending, color:'#f59e0b' },
          { label:'Approved', value:statusCounts.approved, color:'#10b981' },
          { label:'Rejected', value:statusCounts.rejected, color:'#ef4444' },
          { label:'Expired', value:statusCounts.expired, color:'#64748b' },
        ].map(s => (
          <Box key={s.label} sx={{ flex:'1 1 120px', bgcolor:'background.paper', border:`1px solid ${theme.palette.divider}`, borderRadius:2, p:1.5, textAlign:'center' }}>
            <Typography sx={{ fontSize:20, fontWeight:700, color:s.color }}>{s.value}</Typography>
            <Typography sx={{ fontSize:11, color:'text.secondary', fontWeight:600 }}>{s.label}</Typography>
          </Box>
        ))}
      </Box>

      {error && <Alert severity="error" sx={{ mb:2 }} onClose={() => setError('')}>{error}</Alert>}

      <Paper elevation={0} variant="outlined" sx={{ borderRadius:2.5, overflow:'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead sx={{ '& th':{ bgcolor: dark?'#0f172a':'background.default', color:'text.secondary', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:0.5, borderBottom:`1px solid ${theme.palette.divider}` } }}>
              <TableRow>
                <TableCell>Project</TableCell>
                <TableCell>Requester</TableCell>
                <TableCell>Datasets</TableCell>
                <TableCell>Duration</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Expires</TableCell>
                <TableCell>Submitted</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} sx={{ textAlign:'center', py:4, color:'text.secondary' }}>
                    <FilterIcon sx={{ fontSize:36, mb:1 }} />
                    <Typography sx={{ fontSize:13 }}>No requests found.</Typography>
                  </TableCell>
                </TableRow>
              ) : requests.map(req => (
                <TableRow key={req.id} sx={{ '&:hover':{ bgcolor: dark?'#0f172a':'rgba(0,0,0,0.02)' } }}>
                  <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}` }}>
                    <Box>
                      <Typography sx={{ fontSize:12, fontWeight:600, color:'text.primary' }}>{req.project_title}</Typography>
                      <Typography sx={{ fontSize:10, color:'text.disabled' }}>ID {req.id}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}` }}>
                    <Box>
                      <Typography sx={{ fontSize:12, fontWeight:600 }}>{req.requester_name}</Typography>
                      <Typography sx={{ fontSize:10, color:'text.disabled' }}>{req.requester_email}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}` }}>
                    {req.requested_datasets?.length ? req.requested_datasets.slice(0,2).map((d,i)=>(
                      <Typography key={i} sx={{ fontSize:11, color:'text.secondary' }}>• {d}</Typography>
                    )) : <Typography sx={{ fontSize:11, color:'text.disabled' }}>—</Typography>}
                    {req.requested_datasets?.length > 2 && (
                      <Typography sx={{ fontSize:10, color:'text.disabled' }}>+{req.requested_datasets.length - 2} more</Typography>
                    )}
                  </TableCell>
                  <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}` }}>
                    <Typography sx={{ fontSize:11 }}>{req.access_duration_months} month{req.access_duration_months !== 1 ? 's' : ''}</Typography>
                  </TableCell>
                  <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}` }}>
                    <Chip label={req.status} size="small"
                      sx={{ fontSize:9, fontWeight:700, textTransform:'capitalize',
                        bgcolor:statusColor(req.status)+'22', color:statusColor(req.status) }} />
                  </TableCell>
                  <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}` }}>
                    <Typography sx={{ fontSize:11 }}>{fmtDate(req.expires_at)}</Typography>
                  </TableCell>
                  <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}` }}>
                    <Typography sx={{ fontSize:11 }}>{fmtDate(req.created_at)}</Typography>
                  </TableCell>
                  <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}` }}>
                    {req.status === 'pending' && (
                      <Tooltip title="Review request">
                        <IconButton size="small" onClick={() => { setSelected(req); setReviewOpen(true); }}
                          sx={{ color:ACCENT, '&:hover':{ bgcolor:`${ACCENT}15` } }}>
                          <ViewIcon sx={{ fontSize:16 }} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <ReviewDialog open={reviewOpen} onClose={() => setReviewOpen(false)} request={selected}
        onReviewed={loadData} />
    </Box>
  );
}
