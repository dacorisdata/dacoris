'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, Chip, CircularProgress, Button, useTheme,
  LinearProgress, Avatar, Alert, TextField, InputAdornment,
} from '@mui/material';
import {
  Groups as TeamIcon, CheckCircle as MilestoneIcon,
  Search as SearchIcon, Science as ScienceIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../../../contexts/AuthContext';

const API = process.env.NEXT_PUBLIC_API_URL || '/api';
const ACCENT = '#1ca7a1';
const COLORS = ['#1ca7a1','#8b5cf6','#0ea5e9','#10b981','#f97316','#ef4444'];

export const SAMPLE_PROJECTS = [
  {
    id: 1,
    title: 'Genomic Analysis of Antibiotic Resistance in Kenyan Hospitals',
    short_title: 'Antibiotic Resistance Genomics',
    project_type: 'funded',
    status: 'active',
    start_date: '2026-01-15',
    end_date: '2028-01-14',
    pi_name: 'Dr. Amina Odhiambo',
    pi_orcid: '0000-0002-1234-5678',
    pi_email: 'a.odhiambo@uon.ac.ke',
    pi_institution: 'University of Nairobi',
    pi_department: 'Microbiology & Immunology',
    funder_name: 'Wellcome Trust',
    award_id: 'WT-2025-KE-0042',
    total_amount: 4800000,
    currency: 'KES',
    abstract: 'This study investigates the molecular epidemiology of antibiotic-resistant pathogens across five major Kenyan referral hospitals using whole-genome sequencing. The research aims to characterise resistance mechanisms, trace transmission pathways, and inform national antimicrobial stewardship programmes.',
    methodology: 'Whole-genome sequencing of bacterial isolates collected prospectively from clinical samples. Bioinformatic analysis using standard pipelines (ARIBA, MLST). Phylogenetic reconstruction and transmission network analysis.',
    ethics_status: 'under_review',
    involves_human_subjects: true,
    milestone_count: 6,
    done_milestone_count: 2,
    member_count: 5,
    research_area: 'Health Sciences',
    keywords: ['antibiotic resistance', 'genomics', 'Kenya', 'infection control'],
    milestones: [
      { id: 1, title: 'Ethics approval secured', status: 'completed', due_date: '2026-02-28', priority: 'critical', description: 'Full board IRB approval from UoN and KNH' },
      { id: 2, title: 'Site initiation & staff training', status: 'completed', due_date: '2026-03-31', priority: 'high', description: 'Training research nurses at all 5 sites' },
      { id: 3, title: 'Baseline sample collection (n=300)', status: 'in_progress', due_date: '2026-07-31', priority: 'high', description: 'First wave of clinical isolate collection' },
      { id: 4, title: 'WGS library preparation & sequencing', status: 'pending', due_date: '2026-10-31', priority: 'high', description: 'Illumina NovaSeq sequencing run' },
      { id: 5, title: 'Bioinformatic analysis', status: 'pending', due_date: '2027-02-28', priority: 'medium', description: 'Resistance gene identification and phylogenetics' },
      { id: 6, title: 'Final report & manuscript', status: 'pending', due_date: '2027-12-31', priority: 'medium', description: 'Peer-reviewed publication submission' },
    ],
    team: [
      { id: 1, name: 'Dr. Amina Odhiambo', role: 'Principal Investigator', institution: 'University of Nairobi', orcid: '0000-0002-1234-5678' },
      { id: 2, name: 'Prof. James Mwangi', role: 'Co-Investigator', institution: 'Kenyatta National Hospital', orcid: '0000-0001-9876-5432' },
      { id: 3, name: 'Dr. Grace Njoroge', role: 'Data Analyst', institution: 'KEMRI', orcid: '' },
      { id: 4, name: 'Mr. Brian Otieno', role: 'Research Assistant', institution: 'University of Nairobi', orcid: '' },
      { id: 5, name: 'Ms. Fatuma Hassan', role: 'Field Coordinator', institution: 'Coast General Hospital', orcid: '' },
    ],
  },
];

const statusColor = s => ({
  active:'#10b981', proposed:'#f59e0b', completed:'#0ea5e9',
  suspended:'#ef4444', archived:'#64748b',
}[s?.toLowerCase()] || '#64748b');

const typeColor = t => ({
  funded:'#8b5cf6', internal:'#1ca7a1', unfunded:'#64748b',
  collaborative:'#f97316', independent:'#64748b',
}[t?.toLowerCase()] || '#64748b');

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '—';

const ethicsColor = s => ({
  approved:'#10b981', rejected:'#ef4444',
  under_review:'#0ea5e9', submitted:'#f59e0b',
}[s] || '#64748b');

export default function ResearcherProjects() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchUser().then(u => { if (!u) router.push('/login'); else loadProjects(); });
  }, []);

  const loadProjects = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/research/projects`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const live = res.data || [];
      
      // Filter to show only projects converted from awards and in draft/proposed status
      const filteredProjects = live.filter(p => 
        p.award_id && (p.status === 'proposed' || p.status === 'draft')
      );
      
      setProjects(filteredProjects);
    } catch (e) {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = projects.filter(p =>
    !search || p.title?.toLowerCase().includes(search.toLowerCase())
  );

  const totalMilestones = projects.reduce((a, p) => a + (p.milestone_count || 0), 0);
  const doneMilestones  = projects.reduce((a, p) => a + (p.done_milestone_count || 0), 0);
  const progress = p => totalMilestones > 0
    ? Math.round((p.done_milestone_count / Math.max(p.milestone_count, 1)) * 100)
    : 0;

  if (loading) return (
    <Box sx={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'100vh' }}>
      <CircularProgress />
    </Box>
  );

  return (
    <Box sx={{ p:3 }}>
      <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb:3, gap:2, flexWrap:'wrap' }}>
        <Box>
          <Typography sx={{ fontSize:22, fontWeight:700 }}>My Projects</Typography>
          <Typography sx={{ fontSize:13, color:'text.secondary', mt:0.3 }}>
            Projects converted from awards — drafts and proposals in review
          </Typography>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb:2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Summary stats */}
      {projects.length > 0 && (
        <Box sx={{ display:'flex', gap:1.5, mb:3, flexWrap:'wrap' }}>
          {[
            { label:'Total Projects',  value: projects.length, color: '#1ca7a1' },
            { label:'Draft',          value: projects.filter(p => p.status === 'draft').length,    color: '#64748b' },
            { label:'Proposed',       value: projects.filter(p => p.status === 'proposed').length,  color: '#f59e0b' },
            { label:'Milestones Done', value:`${doneMilestones}/${totalMilestones}`, color:'#8b5cf6' },
          ].map(s => (
            <Box key={s.label} sx={{ flex:'1 1 120px', bgcolor:'background.paper', border:`1px solid ${theme.palette.divider}`, borderRadius:2, p:1.5, textAlign:'center' }}>
              <Typography sx={{ fontSize:20, fontWeight:700, color:s.color }}>{s.value}</Typography>
              <Typography sx={{ fontSize:11, color:'text.secondary', fontWeight:600 }}>{s.label}</Typography>
            </Box>
          ))}
        </Box>
      )}

      {/* Search */}
      <TextField size="small" placeholder="Search projects…" value={search} onChange={e => setSearch(e.target.value)}
        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize:16, color:'text.disabled' }} /></InputAdornment> }}
        sx={{ mb:2.5, width:320, '& .MuiOutlinedInput-root':{ borderRadius:2 } }} />

      {filtered.length === 0 ? (
        <Box sx={{ textAlign:'center', py:8 }}>
          <ScienceIcon sx={{ fontSize:52, color:'text.disabled', mb:2 }} />
          <Typography sx={{ fontWeight:700, mb:0.5 }}>
            {projects.length === 0 ? 'No projects in draft/proposed status' : 'No results found'}
          </Typography>
          <Typography sx={{ fontSize:13, color:'text.secondary' }}>
            {projects.length === 0 
              ? 'Projects converted from awards will appear here when they are in draft or proposed status.' 
              : 'Try a different search.'}
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display:'flex', flexDirection:'column', gap:2 }}>
          {filtered.map((p, i) => {
            const pct = progress(p);
            const accentCol = COLORS[i % COLORS.length];
            return (
              <Box key={p.id} onClick={() => router.push(`/researcher/projects/${p.id}`)}
                sx={{ bgcolor:'background.paper', border:`1px solid ${theme.palette.divider}`,
                  borderLeft:`4px solid ${accentCol}`, borderRadius:2.5, p:2.5,
                  cursor:'pointer', transition:'all 0.15s',
                  '&:hover':{ boxShadow: dark?'none':'0 4px 16px rgba(0,0,0,0.08)', transform:'translateY(-1px)' } }}>

                <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', mb:1.5 }}>
                  <Box sx={{ flex:1, mr:2 }}>
                    <Typography sx={{ fontSize:14, fontWeight:700, lineHeight:1.4, mb:0.5 }}>{p.title}</Typography>
                    <Box sx={{ display:'flex', gap:0.75, flexWrap:'wrap' }}>
                      <Chip label={p.project_type} size="small"
                        sx={{ fontSize:10, fontWeight:700, bgcolor:typeColor(p.project_type)+'22', color:typeColor(p.project_type) }} />
                      {p.award_id && (
                        <Chip label="Funded" size="small"
                          sx={{ fontSize:10, fontWeight:600, bgcolor:'rgba(28,167,161,0.1)', color:ACCENT }} />
                      )}
                    </Box>
                    <Typography sx={{ fontSize:11, color:'text.disabled', mt:0.5 }}>
                      {fmtDate(p.start_date)} → {fmtDate(p.end_date)}
                    </Typography>
                  </Box>
                  <Chip label={p.status} size="small"
                    sx={{ fontSize:11, fontWeight:700, bgcolor:statusColor(p.status)+'22', color:statusColor(p.status), textTransform:'capitalize', flexShrink:0 }} />
                </Box>

                <Box sx={{ mb:1.5 }}>
                  <Box sx={{ display:'flex', justifyContent:'space-between', mb:0.5 }}>
                    <Typography sx={{ fontSize:11, color:'text.secondary' }}>Milestones</Typography>
                    <Typography sx={{ fontSize:11, fontWeight:700, color:accentCol }}>
                      {p.done_milestone_count}/{p.milestone_count}
                    </Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={pct}
                    sx={{ height:5, borderRadius:3, bgcolor:'rgba(0,0,0,0.08)',
                      '& .MuiLinearProgress-bar':{ bgcolor:accentCol, borderRadius:3 } }} />
                </Box>

                <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <Box sx={{ display:'flex', gap:1.5, alignItems:'center', flexWrap:'wrap' }}>
                    <Box sx={{ display:'flex', alignItems:'center', gap:0.5 }}>
                      <TeamIcon sx={{ fontSize:13, color:'text.disabled' }} />
                      <Typography sx={{ fontSize:11, color:'text.secondary' }}>{p.member_count} member{p.member_count !== 1 ? 's' : ''}</Typography>
                    </Box>
                    {p.ethics_status && (
                      <Chip label={`Ethics: ${p.ethics_status.replace(/_/g,' ')}`} size="small"
                        sx={{ fontSize:10, fontWeight:600, height:20,
                          bgcolor:ethicsColor(p.ethics_status)+'22', color:ethicsColor(p.ethics_status), textTransform:'capitalize' }} />
                    )}
                    {p.involves_human_subjects && (
                      <Chip label="Human subjects" size="small"
                        sx={{ fontSize:10, bgcolor:'rgba(239,68,68,0.08)', color:'#ef4444', height:20 }} />
                    )}
                  </Box>
                  <Typography sx={{ fontSize:11, color:'text.disabled' }}>
                    {p.pi_name || '—'}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}

