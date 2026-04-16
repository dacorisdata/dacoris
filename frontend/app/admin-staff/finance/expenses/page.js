'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, CircularProgress, useTheme, Button, Chip, Alert,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer, LinearProgress,
} from '@mui/material';
import { Add as AddIcon, CheckCircle as ApproveIcon, Cancel as RejectIcon } from '@mui/icons-material';
import { useAuth } from '../../../../contexts/AuthContext';

const EXPENSES = [
  { id:1, award:'WA-2023-001', submittedBy:'Dr. Aisha Wambua', category:'Personnel', description:'Research Assistant salary – February 2024', amount:'USD 2,400', date:'2024-03-05', status:'Pending Review', budgetLine:'Salaries & Wages', receipts:2 },
  { id:2, award:'WA-2023-002', submittedBy:'Prof. David Kiprotich', category:'Field Work', description:'Kisumu field data collection – transport & allowances', amount:'USD 1,800', date:'2024-03-08', status:'Approved', budgetLine:'Travel & Field Work', receipts:5 },
  { id:3, award:'WA-2022-005', submittedBy:'KEMRI Lab Sciences', category:'Laboratory', description:'PCR reagents and consumables batch order', amount:'KES 320,000', date:'2024-03-01', status:'Approved', budgetLine:'Lab Supplies & Reagents', receipts:3 },
  { id:4, award:'WA-2023-001', submittedBy:'Dr. Aisha Wambua', category:'Equipment', description:'Portable ultrasound device for field diagnostics', amount:'USD 4,200', date:'2024-02-20', status:'Flagged', budgetLine:'Equipment', receipts:1 },
  { id:5, award:'WA-2023-004', submittedBy:'Agri-Research Consortium', category:'Consultancy', description:'GIS data analysis consulting – 10 days', amount:'KES 150,000', date:'2024-03-10', status:'Pending Review', budgetLine:'Consultancy & Professional Fees', receipts:1 },
];

const sColor = s => ({ 'Pending Review':'#f59e0b', Approved:'#10b981', Flagged:'#ef4444', Rejected:'#ef4444', Paid:'#0ea5e9' }[s] || '#64748b');
const cColor  = c => ({ Personnel:'#8b5cf6', 'Field Work':'#f97316', Laboratory:'#0ea5e9', Equipment:'#1ca7a1', Consultancy:'#f59e0b' }[c] || '#64748b');

export default function ExpensesPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchUser().then(u => { if (!u) router.push('/login'); else setLoading(false); }); }, []);

  if (loading) return <Box sx={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'100vh' }}><CircularProgress /></Box>;

  const pending = EXPENSES.filter(e => e.status === 'Pending Review').length;
  const flagged = EXPENSES.filter(e => e.status === 'Flagged').length;

  return (
    <Box sx={{ p:3 }}>
      <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb:3 }}>
        <Box>
          <Typography sx={{ fontSize:22, fontWeight:700, color:'text.primary' }}>Expense Reports</Typography>
          <Typography sx={{ fontSize:13, color:'text.secondary', mt:0.3 }}>Review, approve, and reconcile grantee expense claims against award budget lines</Typography>
        </Box>
        <Button variant="contained" size="small" startIcon={<AddIcon />}
          sx={{ bgcolor:'#10b981', textTransform:'none', fontWeight:600, borderRadius:2, '&:hover':{ bgcolor:'#059669' } }}>
          Submit Expense
        </Button>
      </Box>

      {pending > 0 && <Alert severity="warning" sx={{ mb:2 }}>⚠ {pending} expense report(s) pending review.</Alert>}
      {flagged > 0 && <Alert severity="error" sx={{ mb:3 }}>🚩 {flagged} flagged expense(s) require investigation.</Alert>}

      <Box sx={{ display:'flex', gap:2, mb:3, flexWrap:'wrap' }}>
        {[{ label:'Pending Review', value: pending, color:'#f59e0b' },
          { label:'Approved', value: EXPENSES.filter(e => e.status==='Approved').length, color:'#10b981' },
          { label:'Flagged', value: flagged, color:'#ef4444' },
        ].map(k => (
          <Box key={k.label} sx={{ flex:'1 1 130px', bgcolor:'background.paper', border:`1px solid ${theme.palette.divider}`, borderRadius:2.5, p:2 }}>
            <Typography sx={{ fontSize:11, color:'text.secondary', fontWeight:600, textTransform:'uppercase', letterSpacing:0.5 }}>{k.label}</Typography>
            <Typography sx={{ fontSize:24, fontWeight:700, color: k.color, mt:0.5 }}>{k.value}</Typography>
          </Box>
        ))}
      </Box>

      <Box sx={{ bgcolor:'background.paper', border:`1px solid ${theme.palette.divider}`, borderRadius:3, overflow:'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ '& th':{ bgcolor: dark?'#0f172a':'background.default', color:'text.secondary', fontSize:11, fontWeight:700, textTransform:'uppercase', borderBottom:`1px solid ${theme.palette.divider}` } }}>
                <TableCell>Award</TableCell><TableCell>Description</TableCell><TableCell>Category</TableCell>
                <TableCell>Amount</TableCell><TableCell>Date</TableCell><TableCell>Receipts</TableCell>
                <TableCell>Status</TableCell><TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {EXPENSES.map(e => (
                <TableRow key={e.id} sx={{ '&:hover':{ bgcolor: dark?'#0f172a':'rgba(0,0,0,0.02)' } }}>
                  <TableCell sx={{ fontSize:12, fontWeight:600, color:'text.primary', borderBottom:`1px solid ${theme.palette.divider}` }}>{e.award}</TableCell>
                  <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}`, maxWidth:200 }}>
                    <Typography sx={{ fontSize:12, color:'text.primary', lineHeight:1.4 }}>{e.description}</Typography>
                    <Typography sx={{ fontSize:10, color:'text.disabled' }}>{e.submittedBy}</Typography>
                  </TableCell>
                  <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}` }}>
                    <Chip label={e.category} size="small" sx={{ fontSize:10, fontWeight:600, bgcolor: cColor(e.category)+'22', color: cColor(e.category) }} />
                  </TableCell>
                  <TableCell sx={{ fontSize:13, fontWeight:700, color:'text.primary', borderBottom:`1px solid ${theme.palette.divider}` }}>{e.amount}</TableCell>
                  <TableCell sx={{ fontSize:12, color:'text.secondary', borderBottom:`1px solid ${theme.palette.divider}` }}>{new Date(e.date).toLocaleDateString('en-GB')}</TableCell>
                  <TableCell sx={{ fontSize:12, color:'text.secondary', borderBottom:`1px solid ${theme.palette.divider}` }}>{e.receipts} file(s)</TableCell>
                  <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}` }}>
                    <Chip label={e.status} size="small" sx={{ fontSize:10, fontWeight:600, bgcolor: sColor(e.status)+'22', color: sColor(e.status) }} />
                  </TableCell>
                  <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}` }}>
                    {e.status === 'Pending Review' ? (
                      <Box sx={{ display:'flex', gap:0.5 }}>
                        <Button size="small" startIcon={<ApproveIcon sx={{ fontSize:'12px !important' }} />} sx={{ color:'#10b981', textTransform:'none', fontSize:11, fontWeight:600 }}>Approve</Button>
                        <Button size="small" startIcon={<RejectIcon sx={{ fontSize:'12px !important' }} />} sx={{ color:'#ef4444', textTransform:'none', fontSize:11 }}>Flag</Button>
                      </Box>
                    ) : <Button size="small" sx={{ color:'#10b981', textTransform:'none', fontSize:11, fontWeight:600 }}>View</Button>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Box>
  );
}
