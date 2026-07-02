'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
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

function GateCell({ cleared }) {
  return cleared ? '✓' : '—';
}

export default function PgClearancePage() {
  const router = useRouter();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const accent = theme.palette.primary.main;
  const [items, setItems] = useState([]);
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
    pgApi.listClearances()
      .then((res) => setItems(res.data.clearances || []))
      .catch((err) => setError(err.response?.data?.detail || 'Unable to load clearance data'))
      .finally(() => setLoading(false));
  }, []);

  const statuses = useMemo(
    () => uniqueSorted(items.map((c) => c.status)).map((value) => ({ value, label: value })),
    [items],
  );

  const filterFn = (row, value, key) => {
    if (key === 'search') {
      return `${row.full_name || ''} ${row.student_id} ${row.lead_supervisor || ''} ${row.status} ${row.blockers || ''}`.toLowerCase().includes(value);
    }
    if (key === 'status') return row.status === value;
    if (key === 'coursework') return value === 'cleared' ? row.coursework_cleared : !row.coursework_cleared;
    if (key === 'finance') return value === 'cleared' ? row.finance_cleared : !row.finance_cleared;
    if (key === 'publications') return value === 'cleared' ? row.publication_cleared : !row.publication_cleared;
    return true;
  };

  const filtered = useFilteredRows(items, { search, filters, filterFn });
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
      title="Graduation Clearance"
      subtitle="Track graduation clearance gates across postgraduate students."
    >
      {error && <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>}

      <PgAdminTableToolbar
        search={search}
        onSearchChange={(value) => { setSearch(value); setPage(0); }}
        searchPlaceholder="Search name, ID, supervisor or blockers…"
        filters={filters}
        onFilterChange={setFilter}
        filterFields={[
          { key: 'status', label: 'Status', options: statuses, minWidth: 150 },
          {
            key: 'coursework',
            label: 'Coursework',
            minWidth: 140,
            options: [
              { value: 'cleared', label: 'Cleared' },
              { value: 'pending', label: 'Pending' },
            ],
          },
          {
            key: 'finance',
            label: 'Finance',
            minWidth: 130,
            options: [
              { value: 'cleared', label: 'Cleared' },
              { value: 'pending', label: 'Pending' },
            ],
          },
          {
            key: 'publications',
            label: 'Publications',
            minWidth: 150,
            options: [
              { value: 'cleared', label: 'Cleared' },
              { value: 'pending', label: 'Pending' },
            ],
          },
        ]}
        activeFilterCount={activeFilterCount}
        onClearFilters={() => clearFilters(['status', 'coursework', 'finance', 'publications'])}
        totalCount={items.length}
        filteredCount={filtered.length}
      />

      <Paper elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
              <TableCell sx={{ fontWeight: 700 }}>Student ID</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Student Name</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Supervisor</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Coursework</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Finance</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Publications</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Blockers</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} sx={{ py: 5, textAlign: 'center' }}>
                  <Typography sx={{ color: 'text.secondary' }}>No clearance records match your filters.</Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((c) => (
                <TableRow
                  key={c.student_id}
                  hover
                  sx={{ cursor: 'pointer', '&:hover': { bgcolor: `${accent}08` } }}
                  onClick={() => router.push(`/admin-staff/postgraduate/students/${c.student_id}?from=clearance`)}
                >
                  <TableCell sx={{ fontSize: 13, fontWeight: 600 }}>{c.student_id}</TableCell>
                  <TableCell sx={{ fontSize: 13, fontWeight: 600, color: accent }}>{c.full_name || '—'}</TableCell>
                  <TableCell sx={{ fontSize: 13 }}>{c.lead_supervisor || '—'}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={c.status || '—'}
                      color={c.status === 'cleared' ? 'success' : 'default'}
                      sx={{ fontWeight: 600 }}
                    />
                  </TableCell>
                  <TableCell><GateCell cleared={c.coursework_cleared} /></TableCell>
                  <TableCell><GateCell cleared={c.finance_cleared} /></TableCell>
                  <TableCell><GateCell cleared={c.publication_cleared} /></TableCell>
                  <TableCell sx={{ maxWidth: 240, fontSize: 12 }}>{c.blockers || '—'}</TableCell>
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
