'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  CircularProgress,
  Alert,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  useTheme,
} from '@mui/material';
import pgApi from '../../../../lib/postgraduateApi';
import PgPageShell from '../../../../components/postgraduate/PgPageShell';
import {
  PgAdminTablePagination,
  PgAdminTableToolbar,
  uniqueSorted,
  useFilteredRows,
  usePaginatedRows,
  usePgTableState,
} from '../../../../components/postgraduate/PgAdminTable';
import {
  ProgressRiskChip,
  ProgressRiskColumnHeader,
  displayStage,
  normalizeRiskLevel,
} from '../../../../components/postgraduate/SupervisorUi';

export default function PgStudentsPage() {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const [students, setStudents] = useState([]);
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

  useEffect(() => {
    pgApi.listStudents()
      .then((res) => setStudents(res.data.students || []))
      .catch((err) => setError(err.response?.data?.detail || 'Unable to load students'))
      .finally(() => setLoading(false));
  }, []);

  const programmes = useMemo(
    () => uniqueSorted(students.map((s) => s.programme_name)).map((value) => ({ value, label: value })),
    [students],
  );
  const departments = useMemo(
    () => uniqueSorted(students.map((s) => s.department)).map((value) => ({ value, label: value })),
    [students],
  );
  const stages = useMemo(
    () => uniqueSorted(students.map((s) => s.current_stage_name)).map((value) => ({ value, label: displayStage(value) })),
    [students],
  );
  const supervisors = useMemo(
    () => uniqueSorted(students.map((s) => s.lead_supervisor)).map((value) => ({ value, label: value })),
    [students],
  );

  const filterFn = (row, value, key) => {
    if (key === 'search') {
      return `${row.full_name} ${row.student_id} ${row.programme_name} ${row.department}`.toLowerCase().includes(value);
    }
    if (key === 'programme') return row.programme_name === value;
    if (key === 'department') return row.department === value;
    if (key === 'stage') return row.current_stage_name === value;
    if (key === 'supervisor') return row.lead_supervisor === value;
    if (key === 'risk') {
      const level = normalizeRiskLevel(row.risk_level) || 'none';
      return level === value;
    }
    return true;
  };

  const filtered = useFilteredRows(students, { search, filters, filterFn });
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
      title="Students & Stages"
      subtitle="Search and filter postgraduate students across the institution."
    >
      {error && <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>}

      <PgAdminTableToolbar
        search={search}
        onSearchChange={(value) => { setSearch(value); setPage(0); }}
        searchPlaceholder="Search name, ID, programme or department…"
        filters={filters}
        onFilterChange={setFilter}
        filterFields={[
          { key: 'programme', label: 'Programme', options: programmes, minWidth: 180 },
          { key: 'department', label: 'Department', options: departments, minWidth: 170 },
          { key: 'stage', label: 'Stage', options: stages, minWidth: 160 },
          { key: 'supervisor', label: 'Supervisor', options: supervisors, minWidth: 180 },
          {
            key: 'risk',
            label: 'Progress risk',
            minWidth: 140,
            options: [
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' },
              { value: 'critical', label: 'Critical' },
              { value: 'none', label: 'Not assessed' },
            ],
          },
        ]}
        activeFilterCount={activeFilterCount}
        onClearFilters={() => clearFilters(['programme', 'department', 'stage', 'supervisor', 'risk'])}
        totalCount={students.length}
        filteredCount={filtered.length}
      />

      <Paper
        elevation={0}
        sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}
      >
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
              <TableCell sx={{ fontWeight: 700 }}>Student</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Programme</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Department</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Stage</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Supervisor</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>
                <ProgressRiskColumnHeader />
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} sx={{ py: 5, textAlign: 'center' }}>
                  <Typography sx={{ color: 'text.secondary' }}>No students match your filters.</Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((s) => (
                <TableRow key={s.student_id} hover>
                  <TableCell>
                    <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{s.full_name}</Typography>
                    <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{s.student_id}</Typography>
                  </TableCell>
                  <TableCell sx={{ fontSize: 13, maxWidth: 220 }}>{s.programme_name}</TableCell>
                  <TableCell sx={{ fontSize: 13 }}>{s.department}</TableCell>
                  <TableCell sx={{ fontSize: 13 }}>{displayStage(s.current_stage_name)}</TableCell>
                  <TableCell sx={{ fontSize: 13 }}>{s.lead_supervisor || '—'}</TableCell>
                  <TableCell>
                    <ProgressRiskChip riskLevel={s.risk_level} daysOverdue={s.days_overdue} />
                  </TableCell>
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
