'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Alert,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  MenuItem,
  Typography,
  Chip,
  InputAdornment,
  useTheme,
} from '@mui/material';
import { Search as SearchIcon, FilterList as FilterIcon } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import pgApi from '../../../../../lib/postgraduateApi';
import {
  ACCENT,
  ProgressRiskChip,
  ProgressRiskColumnHeader,
  SupervisorPageHeader,
  displayStage,
  normalizeRiskLevel,
} from '../../../../../components/postgraduate/SupervisorUi';

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50];

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

export default function SupervisorStudentsPage() {
  const router = useRouter();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const [students, setStudents] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [programme, setProgramme] = useState('all');
  const [stage, setStage] = useState('all');
  const [risk, setRisk] = useState('all');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    pgApi.supervisorStudents()
      .then((res) => setStudents(res.data.students || []))
      .catch((err) => setError(err.response?.data?.detail || 'Unable to load students'))
      .finally(() => setLoading(false));
  }, []);

  const programmes = useMemo(
    () => uniqueSorted(students.map((s) => s.programme_name)),
    [students],
  );
  const stages = useMemo(
    () => uniqueSorted(students.map((s) => s.current_stage_name)),
    [students],
  );
  const statuses = useMemo(
    () => uniqueSorted(students.map((s) => s.overall_status || s.status)),
    [students],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      if (q) {
        const haystack = `${s.full_name} ${s.student_id} ${s.programme_name}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (programme !== 'all' && s.programme_name !== programme) return false;
      if (stage !== 'all' && s.current_stage_name !== stage) return false;
      if (status !== 'all' && (s.overall_status || s.status) !== status) return false;
      if (risk !== 'all') {
        const level = normalizeRiskLevel(s.risk_level) || 'none';
        if (level !== risk) return false;
      }
      return true;
    });
  }, [students, search, programme, stage, status, risk]);

  const paginated = useMemo(() => {
    const start = page * rowsPerPage;
    return filtered.slice(start, start + rowsPerPage);
  }, [filtered, page, rowsPerPage]);

  const activeFilters = [programme, stage, risk, status].filter((v) => v !== 'all').length + (search ? 1 : 0);

  const clearFilters = () => {
    setSearch('');
    setProgramme('all');
    setStage('all');
    setRisk('all');
    setStatus('all');
    setPage(0);
  };

  if (loading) {
    return (
      <Box sx={{ p: 4, display: 'flex', justifyContent: 'center', width: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', p: { xs: 2, md: 3 }, boxSizing: 'border-box' }}>
      <SupervisorPageHeader
        title="My Students"
        subtitle="Search and filter your supervisees. Progress risk shows milestone delay severity from the student journey record."
        dark={dark}
      />

      {error && <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 2,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="Search name or student ID…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            sx={{ flex: '1 1 220px', minWidth: 200 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                </InputAdornment>
              ),
            }}
          />
          <TextField
            select
            size="small"
            label="Programme"
            value={programme}
            onChange={(e) => { setProgramme(e.target.value); setPage(0); }}
            sx={{ minWidth: 180, flex: '1 1 160px' }}
          >
            <MenuItem value="all">All programmes</MenuItem>
            {programmes.map((p) => (
              <MenuItem key={p} value={p}>{p}</MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Stage"
            value={stage}
            onChange={(e) => { setStage(e.target.value); setPage(0); }}
            sx={{ minWidth: 160, flex: '1 1 140px' }}
          >
            <MenuItem value="all">All stages</MenuItem>
            {stages.map((s) => (
              <MenuItem key={s} value={s}>{displayStage(s)}</MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Progress risk"
            value={risk}
            onChange={(e) => { setRisk(e.target.value); setPage(0); }}
            sx={{ minWidth: 140, flex: '1 1 120px' }}
          >
            <MenuItem value="all">All levels</MenuItem>
            <MenuItem value="low">Low</MenuItem>
            <MenuItem value="medium">Medium</MenuItem>
            <MenuItem value="high">High</MenuItem>
            <MenuItem value="critical">Critical</MenuItem>
            <MenuItem value="none">Not assessed</MenuItem>
          </TextField>
          <TextField
            select
            size="small"
            label="Journey status"
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(0); }}
            sx={{ minWidth: 150, flex: '1 1 130px' }}
          >
            <MenuItem value="all">All statuses</MenuItem>
            {statuses.map((s) => (
              <MenuItem key={s} value={s}>{s}</MenuItem>
            ))}
          </TextField>
          {activeFilters > 0 && (
            <Button size="small" onClick={clearFilters} startIcon={<FilterIcon />}>
              Clear ({activeFilters})
            </Button>
          )}
        </Box>
        <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 1.5 }}>
          Showing {filtered.length} of {students.length} students
        </Typography>
      </Paper>

      <Paper
        elevation={0}
        sx={{
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden',
        }}
      >
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
              <TableCell sx={{ fontWeight: 700 }}>Student</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Programme</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Stage</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Journey status</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>
                <ProgressRiskColumnHeader />
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} sx={{ py: 5, textAlign: 'center' }}>
                  <Typography sx={{ color: 'text.secondary' }}>
                    No students match your filters.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((s) => (
                <TableRow
                  key={s.student_id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => router.push(`/researcher/postgraduate/supervisor/students/${s.student_id}`)}
                >
                  <TableCell>
                    <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{s.full_name}</Typography>
                    <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{s.student_id}</Typography>
                  </TableCell>
                  <TableCell sx={{ fontSize: 13, maxWidth: 220 }}>{s.programme_name}</TableCell>
                  <TableCell sx={{ fontSize: 13 }}>{displayStage(s.current_stage_name)}</TableCell>
                  <TableCell>
                    <Chip size="small" label={s.overall_status || s.status || '—'} sx={{ fontWeight: 600 }} />
                  </TableCell>
                  <TableCell>
                    <ProgressRiskChip riskLevel={s.risk_level} daysOverdue={s.days_overdue} />
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/researcher/postgraduate/supervisor/students/${s.student_id}`);
                      }}
                    >
                      Open
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <TablePagination
          component="div"
          count={filtered.length}
          page={page}
          onPageChange={(_, next) => setPage(next)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
          labelRowsPerPage="Rows per page"
        />
      </Paper>
    </Box>
  );
}
