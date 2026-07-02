'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  CircularProgress,
  Alert,
  Grid,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  useTheme,
} from '@mui/material';
import pgApi from '../../../lib/postgraduateApi';
import PgPageShell from '../../../components/postgraduate/PgPageShell';
import {
  PgAdminTablePagination,
  PgAdminTableToolbar,
  uniqueSorted,
  useFilteredRows,
  usePaginatedRows,
  usePgTableState,
} from '../../../components/postgraduate/PgAdminTable';
import { ProgressRiskChip, displayStage } from '../../../components/postgraduate/SupervisorUi';

export default function PgControlTowerPage() {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const [data, setData] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const {
    search,
    setSearch,
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    filters,
    setFilter,
    clearFilters,
  } = usePgTableState();

  const load = () => {
    pgApi.universityDashboard()
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.detail || 'Unable to load PG dashboard'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const runScan = async () => {
    try {
      const res = await pgApi.runOverdueScan();
      setScanResult(res.data);
      load();
    } catch (err) {
      setError(err.response?.data?.detail || 'Scan failed');
    }
  };

  const atRiskStudents = data?.at_risk_students || [];

  const programmes = useMemo(
    () => uniqueSorted(atRiskStudents.map((s) => s.programme_name)).map((value) => ({ value, label: value })),
    [atRiskStudents],
  );
  const stages = useMemo(
    () => uniqueSorted(atRiskStudents.map((s) => s.current_stage_name)).map((value) => ({ value, label: displayStage(value) })),
    [atRiskStudents],
  );

  const filterFn = (row, value, key) => {
    if (key === 'search') {
      return `${row.full_name} ${row.student_id} ${row.programme_name}`.toLowerCase().includes(value);
    }
    if (key === 'programme') return row.programme_name === value;
    if (key === 'stage') return row.current_stage_name === value;
    if (key === 'risk') {
      const level = (row.risk_level || '').toLowerCase();
      return level.includes(value);
    }
    return true;
  };

  const filtered = useFilteredRows(atRiskStudents, { search, filters, filterFn });
  const paginated = usePaginatedRows(filtered, page, rowsPerPage);
  const activeFilterCount =
    Object.values(filters).filter((v) => v && v !== 'all').length + (search ? 1 : 0);

  if (loading) {
    return (
      <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <PgPageShell
      title="PG Control Tower"
      subtitle="University-wide postgraduate overview and at-risk monitoring."
    >
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button variant="outlined" onClick={runScan}>Run Overdue Scan</Button>
      </Box>

      {error && !data && <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>}
      {scanResult && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Scan complete: {scanResult.overdue_count} overdue, {scanResult.interventions_created} interventions opened
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2 }}>
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Total PG students</Typography>
            <Typography variant="h4">{data?.total_students}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2 }}>
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>At risk</Typography>
            <Typography variant="h4" color="warning.main">{atRiskStudents.length}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2 }}>
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Open interventions</Typography>
            <Typography variant="h4">{data?.open_interventions}</Typography>
          </Paper>
        </Grid>
      </Grid>

      <Typography sx={{ fontWeight: 600, mb: 1 }}>Students by Stage</Typography>
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        {Object.entries(data?.by_stage || {}).map(([stage, count]) => (
          <Typography key={stage} sx={{ fontSize: 13 }}>{stage}: {count}</Typography>
        ))}
      </Paper>

      <Typography sx={{ fontWeight: 600, mb: 1 }}>At-Risk Students</Typography>

      <PgAdminTableToolbar
        search={search}
        onSearchChange={(value) => { setSearch(value); setPage(0); }}
        searchPlaceholder="Search name, ID or programme…"
        filters={filters}
        onFilterChange={setFilter}
        filterFields={[
          { key: 'programme', label: 'Programme', options: programmes, minWidth: 180 },
          { key: 'stage', label: 'Stage', options: stages, minWidth: 160 },
          {
            key: 'risk',
            label: 'Risk',
            minWidth: 130,
            options: [
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' },
              { value: 'critical', label: 'Critical' },
            ],
          },
        ]}
        activeFilterCount={activeFilterCount}
        onClearFilters={() => clearFilters(['programme', 'stage', 'risk'])}
        totalCount={atRiskStudents.length}
        filteredCount={filtered.length}
      />

      <Paper elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
              <TableCell sx={{ fontWeight: 700 }}>Student</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Programme</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Stage</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Progress risk</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Overdue</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} sx={{ py: 5, textAlign: 'center' }}>
                  <Typography sx={{ color: 'text.secondary' }}>No at-risk students match your filters.</Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((s) => (
                <TableRow key={s.student_id} hover>
                  <TableCell>
                    <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{s.full_name}</Typography>
                    <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{s.student_id}</Typography>
                  </TableCell>
                  <TableCell sx={{ fontSize: 13 }}>{s.programme_name}</TableCell>
                  <TableCell sx={{ fontSize: 13 }}>{displayStage(s.current_stage_name)}</TableCell>
                  <TableCell>
                    <ProgressRiskChip riskLevel={s.risk_level} daysOverdue={s.days_overdue} />
                  </TableCell>
                  <TableCell sx={{ fontSize: 13 }}>{s.days_overdue || 0}d</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <PgAdminTablePagination
          count={filtered.length}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={setPage}
          onRowsPerPageChange={setRowsPerPage}
        />
      </Paper>
    </PgPageShell>
  );
}
