'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, CircularProgress, useTheme, Button, Chip, LinearProgress, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
} from '@mui/material';
import { PlayArrow as RunIcon, Add as AddIcon, Rule as RuleIcon } from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../../../../contexts/AuthContext';

const API = process.env.NEXT_PUBLIC_API_URL || '/api';
const ACCENT = '#1ca7a1';

const RULE_TYPES = [
  { value:'missing_value', label:'Missing Value Check' },
  { value:'range',         label:'Range Validation' },
  { value:'format',        label:'Format / Regex' },
  { value:'duplicate',     label:'Duplicate Detection' },
  { value:'consistency',   label:'Cross-field Consistency' },
];
const OPERATORS = ['not_null','unique','gt','lt','eq','between','regex'];

export default function PipelinesPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const [loading, setLoading] = useState(true);
  const [datasets, setDatasets] = useState([]);
  const [qaStats, setQaStats] = useState({});
  const [rules, setRules] = useState({});
  const [error, setError] = useState('');
  const [runningId, setRunningId] = useState(null);
  const [runResult, setRunResult] = useState(null);
  const [ruleOpen, setRuleOpen] = useState(false);
  const [ruleDs, setRuleDs] = useState(null);
  const [newRule, setNewRule] = useState({ rule_type:'missing_value', field_name:'', operator:'not_null', threshold:'', action:'flag' });
  const [savingRule, setSavingRule] = useState(false);

  useEffect(() => { fetchUser().then(u => { if (!u) router.push('/login'); else loadData(); }); }, []);

  const loadData = async () => {
    const token = localStorage.getItem('token');
    const headers = { Authorization:`Bearer ${token}` };
    try {
      const dsRes = await axios.get(`${API}/data/datasets`, { headers });
      const dsList = dsRes.data || [];
      setDatasets(dsList);
      const statsObj = {}; const rulesObj = {};
      await Promise.all(dsList.map(async ds => {
        try {
          const [statsR, rulesR] = await Promise.all([
            axios.get(`${API}/data/qa/dashboard/${ds.id}`, { headers }).catch(() => ({ data:{} })),
            axios.get(`${API}/data/qa/rules/${ds.id}`, { headers }).catch(() => ({ data:[] })),
          ]);
          statsObj[ds.id] = statsR.data;
          rulesObj[ds.id] = rulesR.data || [];
        } catch { /* skip */ }
      }));
      setQaStats(statsObj); setRules(rulesObj);
    } catch { setError('Failed to load datasets'); }
    setLoading(false);
  };

  const runQA = async (dsId) => {
    setRunningId(dsId); setRunResult(null); setError('');
    const token = localStorage.getItem('token');
    try {
      const res = await axios.post(`${API}/data/qa/run/${dsId}`, {}, { headers:{ Authorization:`Bearer ${token}` } });
      setRunResult({ dsId, ...res.data });
      await loadData();
    } catch (e) { setError(e.response?.data?.detail || 'QA run failed'); }
    setRunningId(null);
  };

  const addRule = async () => {
    if (!newRule.field_name.trim()) return;
    setSavingRule(true); setError('');
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/data/qa/rules`, { ...newRule, dataset_id: ruleDs }, { headers:{ Authorization:`Bearer ${token}` } });
      setRuleOpen(false); setNewRule({ rule_type:'missing_value', field_name:'', operator:'not_null', threshold:'', action:'flag' });
      await loadData();
    } catch (e) { setError(e.response?.data?.detail || 'Failed to add rule'); }
    setSavingRule(false);
  };

  const deleteRule = async (ruleId) => {
    const token = localStorage.getItem('token');
    try {
      await axios.delete(`${API}/data/qa/rules/${ruleId}`, { headers:{ Authorization:`Bearer ${token}` } });
      await loadData();
    } catch { setError('Failed to delete rule'); }
  };

  if (loading) return <Box sx={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'100vh' }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p:3 }}>
      <Box sx={{ mb:3 }}>
        <Typography sx={{ fontSize:22, fontWeight:700 }}>QA Pipeline</Typography>
        <Typography sx={{ fontSize:13, color:'text.secondary', mt:0.3 }}>Configure QA rules, run checks, and monitor quality across datasets</Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb:2 }} onClose={() => setError('')}>{error}</Alert>}
      {runResult && <Alert severity="success" sx={{ mb:2 }} onClose={() => setRunResult(null)}>
        QA run complete: {runResult.processed} processed, {runResult.passed} passed, {runResult.failed} failed ({runResult.rules_applied} rules applied)
      </Alert>}

      {datasets.length === 0 ? (
        <Box sx={{ textAlign:'center', py:6 }}>
          <RuleIcon sx={{ fontSize:48, color:'text.disabled', mb:2 }} />
          <Typography sx={{ color:'text.secondary', fontWeight:600 }}>No datasets to run QA on</Typography>
          <Typography sx={{ color:'text.disabled', fontSize:13 }}>Create a dataset with a linked capture form first.</Typography>
        </Box>
      ) : (
        <Box sx={{ display:'flex', flexDirection:'column', gap:2.5 }}>
          {datasets.map(ds => {
            const st = qaStats[ds.id] || {};
            const rl = rules[ds.id] || [];
            const total = st.total || 0;
            const passRate = total > 0 ? Math.round(((st.passed||0)/total)*100) : 0;
            const healthColor = passRate > 70 ? '#10b981' : passRate > 30 ? '#f59e0b' : total === 0 ? '#64748b' : '#ef4444';

            return (
              <Box key={ds.id} sx={{ bgcolor:'background.paper', border:`1px solid ${theme.palette.divider}`, borderLeft:`3px solid ${healthColor}`, borderRadius:2.5, p:2.5 }}>
                <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', mb:1.5 }}>
                  <Box>
                    <Typography sx={{ fontSize:14, fontWeight:700, mb:0.3 }}>{ds.title}</Typography>
                    <Box sx={{ display:'flex', gap:1, flexWrap:'wrap' }}>
                      <Chip label={ds.source_form_title || 'No source form'} size="small" sx={{ fontSize:9, fontWeight:600, bgcolor:dark?'rgba(255,255,255,0.07)':'rgba(0,0,0,0.05)', color:'text.secondary' }} />
                      <Chip label={`${rl.length} rule${rl.length!==1?'s':''}`} size="small" sx={{ fontSize:9, fontWeight:700, bgcolor:`${ACCENT}18`, color:ACCENT }} />
                    </Box>
                  </Box>
                  <Box sx={{ display:'flex', gap:1 }}>
                    <Button size="small" startIcon={<AddIcon sx={{ fontSize:'13px !important' }} />}
                      onClick={() => { setRuleDs(ds.id); setRuleOpen(true); }}
                      sx={{ color:ACCENT, textTransform:'none', fontSize:11, fontWeight:600 }}>Add Rule</Button>
                    <Button size="small" variant="contained" startIcon={<RunIcon sx={{ fontSize:'13px !important' }} />}
                      disabled={runningId === ds.id || !ds.source_form_id}
                      onClick={() => runQA(ds.id)}
                      sx={{ bgcolor:ACCENT, textTransform:'none', fontSize:11, fontWeight:600, borderRadius:2, '&:hover':{ bgcolor:'#0e7490' } }}>
                      {runningId === ds.id ? 'Running...' : 'Run QA'}
                    </Button>
                  </Box>
                </Box>

                <Box sx={{ display:'flex', gap:1.5, mb:1.5, flexWrap:'wrap' }}>
                  {['staged','passed','failed','quarantined'].map(s => (
                    <Box key={s} sx={{ textAlign:'center', minWidth:60 }}>
                      <Typography sx={{ fontSize:16, fontWeight:700, color:({staged:'#0ea5e9',passed:'#10b981',failed:'#f59e0b',quarantined:'#ef4444'})[s] }}>{st[s]||0}</Typography>
                      <Typography sx={{ fontSize:9, fontWeight:600, color:'text.secondary', textTransform:'capitalize' }}>{s}</Typography>
                    </Box>
                  ))}
                  <Box sx={{ textAlign:'center', minWidth:60 }}>
                    <Typography sx={{ fontSize:16, fontWeight:700, color:healthColor }}>{passRate}%</Typography>
                    <Typography sx={{ fontSize:9, fontWeight:600, color:'text.secondary' }}>Pass Rate</Typography>
                  </Box>
                </Box>

                {total > 0 && (
                  <LinearProgress variant="determinate" value={passRate}
                    sx={{ height:5, borderRadius:3, mb:1.5, bgcolor:'rgba(0,0,0,0.08)', '& .MuiLinearProgress-bar':{ bgcolor:healthColor, borderRadius:3 } }} />
                )}

                {rl.length > 0 && (
                  <Box sx={{ display:'flex', gap:0.75, flexWrap:'wrap' }}>
                    {rl.map(r => (
                      <Chip key={r.id} label={`${r.rule_type}: ${r.field_name} (${r.action})`} size="small"
                        onDelete={() => deleteRule(r.id)}
                        sx={{ fontSize:9, fontWeight:600, bgcolor:'rgba(28,167,161,0.08)', color:ACCENT }} />
                    ))}
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>
      )}

      <Dialog open={ruleOpen} onClose={() => setRuleOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx:{ borderRadius:3 } }}>
        <DialogTitle sx={{ fontWeight:700, pb:1 }}>Add QA Rule</DialogTitle>
        <DialogContent sx={{ display:'flex', flexDirection:'column', gap:2, pt:'8px !important' }}>
          <TextField select fullWidth size="small" label="Rule Type" value={newRule.rule_type} onChange={e => setNewRule(r=>({...r, rule_type:e.target.value}))}>
            {RULE_TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
          </TextField>
          <TextField fullWidth size="small" label="Field Name *" value={newRule.field_name} onChange={e => setNewRule(r=>({...r, field_name:e.target.value}))} placeholder="e.g. age, weight, blood_pressure" />
          <TextField select fullWidth size="small" label="Operator" value={newRule.operator} onChange={e => setNewRule(r=>({...r, operator:e.target.value}))}>
            {OPERATORS.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
          </TextField>
          <TextField fullWidth size="small" label="Threshold" value={newRule.threshold} onChange={e => setNewRule(r=>({...r, threshold:e.target.value}))} placeholder="e.g. 0,200 for range, regex pattern, etc." />
          <TextField select fullWidth size="small" label="Action" value={newRule.action} onChange={e => setNewRule(r=>({...r, action:e.target.value}))}>
            <MenuItem value="flag">Flag</MenuItem>
            <MenuItem value="reject">Reject</MenuItem>
            <MenuItem value="auto_fix">Auto Fix</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions sx={{ p:2, pt:0 }}>
          <Button onClick={() => setRuleOpen(false)} sx={{ textTransform:'none' }}>Cancel</Button>
          <Button variant="contained" onClick={addRule} disabled={savingRule || !newRule.field_name.trim()}
            sx={{ bgcolor:ACCENT, textTransform:'none', borderRadius:2, '&:hover':{ bgcolor:'#0e7490' } }}>
            {savingRule ? 'Adding...' : 'Add Rule'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
