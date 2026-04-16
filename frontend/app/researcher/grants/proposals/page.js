'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, Chip, CircularProgress, Button, useTheme,
  LinearProgress, Alert, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControl, InputLabel, Select, MenuItem,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Send as SubmitIcon } from '@mui/icons-material';
import { useAuth } from '../../../../contexts/AuthContext';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const statusColor = s => ({ DRAFT:'#f59e0b','UNDER_REVIEW':'#0ea5e9','SUBMITTED':'#8b5cf6', AWARDED:'#10b981', REJECTED:'#ef4444', RETURNED:'#f97316' }[s] || '#64748b');

export default function MyProposalsPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const [loading, setLoading] = useState(true);
  const [proposals, setProposals] = useState([]);
  const [error, setError] = useState('');
  const [createDialog, setCreateDialog] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [selectedOppId, setSelectedOppId] = useState('');

  useEffect(() => {
    fetchUser().then(u => { 
      if (!u) router.push('/login'); 
      else loadProposals(); 
    });
  }, []);

  const loadProposals = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/grants/proposals`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProposals(res.data);
    } catch (e) {
      setError('Failed to load proposals');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const createProposal = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `${API_URL}/api/grants/proposals`,
        { title: newTitle, opportunity_id: parseInt(selectedOppId) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCreateDialog(false);
      setNewTitle('');
      setSelectedOppId('');
      router.push(`/researcher/grants/proposals/${res.data.id}`);
    } catch (e) {
      setError('Failed to create proposal');
    }
  };

  if (loading) return <Box sx={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'100vh' }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb: 3 }}>
        <Box>
          <Typography sx={{ fontSize: 22, fontWeight: 700, color: 'text.primary' }}>My Proposals</Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.3 }}>Track your grant proposals across all stages of the application lifecycle</Typography>
        </Box>
        <Button variant="contained" size="small" startIcon={<AddIcon />}
          onClick={() => setCreateDialog(true)}
          sx={{ bgcolor:'#1ca7a1', textTransform:'none', fontWeight:600, borderRadius:2, '&:hover':{ bgcolor:'#0e7490' } }}>
          New Proposal
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {proposals.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography sx={{ color: 'text.secondary', mb: 2 }}>No proposals yet</Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateDialog(true)}>
            Create Your First Proposal
          </Button>
        </Box>
      ) : (
        <Box sx={{ display:'flex', flexDirection:'column', gap:2.5 }}>
          {proposals.map(p => (
            <Box key={p.id} sx={{ bgcolor:'background.paper', border:`1px solid ${theme.palette.divider}`, borderRadius:2.5, p:3 }}>
              <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', mb:1.5 }}>
                <Box sx={{ flex:1, mr:2 }}>
                  <Typography sx={{ fontSize:15, fontWeight:700, color:'text.primary', lineHeight:1.4, mb:0.5 }}>{p.title}</Typography>
                  <Typography sx={{ fontSize:12, color:'text.secondary' }}>Opportunity ID: {p.opportunity_id}</Typography>
                </Box>
                <Box sx={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:0.5, flexShrink:0 }}>
                  <Chip label={p.status} size="small" sx={{ fontSize:11, fontWeight:700, bgcolor: statusColor(p.status)+'22', color: statusColor(p.status) }} />
                </Box>
              </Box>

              <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mt: 2 }}>
                <Typography sx={{ fontSize:11, color:'text.disabled' }}>
                  Created {new Date(p.created_at).toLocaleDateString('en-GB')}
                  {p.submitted_at ? ` · Submitted ${new Date(p.submitted_at).toLocaleDateString('en-GB')}` : ''}
                </Typography>
                <Box sx={{ display:'flex', gap:1 }}>
                  <Button size="small" startIcon={<EditIcon />}
                    onClick={() => router.push(`/researcher/grants/proposals/${p.id}`)}
                    sx={{ color:'#1ca7a1', textTransform:'none', fontSize:12, fontWeight:600, '&:hover':{ bgcolor:'rgba(28,167,161,0.1)' } }}>
                    {p.status === 'DRAFT' ? 'Continue Editing' : 'View'}
                  </Button>
                </Box>
              </Box>
            </Box>
          ))}
        </Box>
      )}

      {/* Create Proposal Dialog */}
      <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Proposal</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Proposal Title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            sx={{ mt: 2, mb: 2 }}
          />
          <TextField
            fullWidth
            label="Opportunity ID"
            type="number"
            value={selectedOppId}
            onChange={(e) => setSelectedOppId(e.target.value)}
            helperText="Enter the ID of the grant opportunity you're applying for"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialog(false)}>Cancel</Button>
          <Button onClick={createProposal} variant="contained" disabled={!newTitle || !selectedOppId}>
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
