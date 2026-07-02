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
  TextField,
  Button,
  MenuItem,
  Typography,
  Chip,
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

export default function PgInterventionsPage() {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ student_id: '', category: '', required_action: '', stage_name: '' });
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
    setLoading(true);
    pgApi.listInterventions()
      .then((res) => setItems(res.data.interventions || []))
      .catch((err) => setError(err.response?.data?.detail || 'Unable to load interventions'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    try {
      await pgApi.createIntervention(form);
      setForm({ student_id: '', category: '', required_action: '', stage_name: '' });
      load();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create intervention');
    }
  };

  const categories = useMemo(
    () => uniqueSorted(items.map((c) => c.category)).map((value) => ({ value, label: value })),
    [items],
  );
  const statuses = useMemo(
    () => uniqueSorted(items.map((c) => c.status)).map((value) => ({ value, label: value })),
    [items],
  );
  const stages = useMemo(
    () => uniqueSorted(items.map((c) => c.stage_name)).map((value) => ({ value, label: value })),
    [items],
  );

  const filterFn = (row, value, key) => {
    if (key === 'search') {
      return `${row.student_id} ${row.category} ${row.stage_name} ${row.required_action} ${row.status}`.toLowerCase().includes(value);
    }
    if (key === 'category') return row.category === value;
    if (key === 'status') return row.status === value;
    if (key === 'stage') return row.stage_name === value;
    return true;
  };

  const filtered = useFilteredRows(items, { search, filters, filterFn });
  const paginated = usePaginatedRows(filtered, page, rowsPerPage);
  const activeFilterCount =
    Object.values(filters).filter((v) => v && v !== 'all').length + (search ? 1 : 0);

  if (loading && items.length === 0) {
    return (
      <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <PgPageShell
      title="Intervention Cases"
      subtitle="Open and track postgraduate intervention cases."
    >
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper variant="outlined" sx={{ p: 2, mb: 3, display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 640 }}>
        <Typography sx={{ fontWeight: 600 }}>Open new intervention</Typography>
        <TextField label="Student ID" value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })} size="small" />
        <TextField label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} size="small" />
        <TextField label="Stage" value={form.stage_name} onChange={(e) => setForm({ ...form, stage_name: e.target.value })} size="small" />
        <TextField label="Required action" value={form.required_action} onChange={(e) => setForm({ ...form, required_action: e.target.value })} multiline rows={2} size="small" />
        <Button variant="contained" onClick={handleCreate}>Open Intervention</Button>
      </Paper>

      <PgAdminTableToolbar
        search={search}
        onSearchChange={(value) => { setSearch(value); setPage(0); }}
        searchPlaceholder="Search student ID, category, stage or action…"
        filters={filters}
        onFilterChange={setFilter}
        filterFields={[
          { key: 'category', label: 'Category', options: categories, minWidth: 170 },
          { key: 'status', label: 'Status', options: statuses, minWidth: 140 },
          { key: 'stage', label: 'Stage', options: stages, minWidth: 160 },
        ]}
        activeFilterCount={activeFilterCount}
        onClearFilters={() => clearFilters(['category', 'status', 'stage'])}
        totalCount={items.length}
        filteredCount={filtered.length}
      />

      <Paper elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
              <TableCell sx={{ fontWeight: 700 }}>Student</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Stage</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Required action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} sx={{ py: 5, textAlign: 'center' }}>
                  <Typography sx={{ color: 'text.secondary' }}>No interventions match your filters.</Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((c) => (
                <TableRow key={c.id} hover>
                  <TableCell sx={{ fontSize: 13, fontWeight: 600 }}>{c.student_id}</TableCell>
                  <TableCell sx={{ fontSize: 13 }}>{c.category}</TableCell>
                  <TableCell sx={{ fontSize: 13 }}>{c.stage_name || '—'}</TableCell>
                  <TableCell>
                    <Chip size="small" label={c.status || '—'} sx={{ fontWeight: 600 }} />
                  </TableCell>
                  <TableCell sx={{ fontSize: 13, maxWidth: 320 }}>{c.required_action || '—'}</TableCell>
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
