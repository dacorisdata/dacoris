'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  CircularProgress,
  Alert,
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
import PgControlTowerDashboard from '../../../components/postgraduate/PgControlTowerDashboard';
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
  const [refreshing, setRefreshing] = useState(false);

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

  const load = (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    pgApi.universityDashboard()
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.detail || 'Unable to load PG dashboard'))
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  };

  useEffect(() => { load(); }, []);

  const runScan = async () => {
    try {
      const res = await pgApi.runOverdueScan();
      setScanResult(res.data);
      load(true);
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
      title="Head of Postgraduate Studies Dashboard — Control Tower"
      subtitle="University-wide oversight with drill-down from institution to faculty, school, department, programme, cohort, supervisor and individual student."
    >
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1, gap: 1 }}>
        <Button variant="outlined" size="small" onClick={runScan}>Run Overdue Scan</Button>
      </Box>

      {error && !data && <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>}
      {scanResult && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Scan complete: {scanResult.overdue_count} overdue, {scanResult.interventions_created} interventions opened
        </Alert>
      )}

      {data && (
        <PgControlTowerDashboard
          data={data}
          onRefresh={() => load(true)}
          refreshing={refreshing}
        />
      )}

      <Typography sx={{ fontWeight: 700, mt: 4, mb: 1.5, fontSize: 16 }}>At-Risk Students</Typography>

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
