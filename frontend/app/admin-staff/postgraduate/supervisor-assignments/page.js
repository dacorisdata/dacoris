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
  Button,
  TextField,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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

const EMPTY_FORM = {
  student_id: '',
  lead_supervisor_id: '',
  co_supervisor_id: '',
  notes: '',
};

export default function PgSupervisorAssignmentsPage() {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const [assignments, setAssignments] = useState([]);
  const [students, setStudents] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

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

  const load = async () => {
    setLoading(true);
    try {
      const [assignRes, studentRes, supervisorRes] = await Promise.all([
        pgApi.listSupervisorAssignments(),
        pgApi.listStudents(),
        pgApi.listSupervisors(),
      ]);
      setAssignments(assignRes.data.assignments || []);
      setStudents(studentRes.data.students || []);
      setSupervisors(supervisorRes.data.supervisors || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to load supervisor assignments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const statuses = useMemo(
    () => uniqueSorted(assignments.map((a) => a.status)).map((value) => ({ value, label: value })),
    [assignments],
  );
  const leadSupervisors = useMemo(
    () => uniqueSorted(assignments.map((a) => a.lead_supervisor_name)).map((value) => ({ value, label: value })),
    [assignments],
  );
  const sources = useMemo(
    () => uniqueSorted(assignments.map((a) => a.source)).map((value) => ({ value, label: value })),
    [assignments],
  );

  const filterFn = (row, value, key) => {
    if (key === 'search') {
      return `${row.student_id} ${row.student_name || ''} ${row.lead_supervisor_name} ${row.co_supervisor_name}`.toLowerCase().includes(value);
    }
    if (key === 'status') return row.status === value;
    if (key === 'lead_supervisor') return row.lead_supervisor_name === value;
    if (key === 'source') return row.source === value;
    return true;
  };

  const filtered = useFilteredRows(assignments, { search, filters, filterFn });
  const paginated = usePaginatedRows(filtered, page, rowsPerPage);
  const activeFilterCount =
    Object.values(filters).filter((v) => v && v !== 'all').length + (search ? 1 : 0);

  const handleAssign = async () => {
    if (!form.student_id || !form.lead_supervisor_id) {
      setError('Student and lead supervisor are required');
      return;
    }
    setSaving(true);
    try {
      await pgApi.assignSupervisor({
        student_id: form.student_id,
        lead_supervisor_id: form.lead_supervisor_id,
        co_supervisor_id: form.co_supervisor_id || undefined,
        notes: form.notes || undefined,
      });
      setDialogOpen(false);
      setForm(EMPTY_FORM);
      setError('');
      load();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to assign supervisor');
    } finally {
      setSaving(false);
    }
  };

  const handleEndAssignment = async (row) => {
    if (row.source !== 'dacoris') {
      setError('Excel-sourced assignments must be updated in the HR system');
      return;
    }
    try {
      await pgApi.updateSupervisorAssignment(row.id, {
        status: 'ended',
        end_reason: 'Ended by admin staff',
      });
      load();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update assignment');
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <PgPageShell
      title="Supervisor Assignments"
      subtitle="Assign or reassign lead and co-supervisors for postgraduate students."
    >
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button variant="contained" onClick={() => setDialogOpen(true)}>
          Assign Supervisor
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <PgAdminTableToolbar
        search={search}
        onSearchChange={(value) => { setSearch(value); setPage(0); }}
        searchPlaceholder="Search student ID, supervisor name…"
        filters={filters}
        onFilterChange={setFilter}
        filterFields={[
          { key: 'status', label: 'Status', options: statuses, minWidth: 140 },
          { key: 'lead_supervisor', label: 'Lead supervisor', options: leadSupervisors, minWidth: 180 },
          { key: 'source', label: 'Source', options: sources, minWidth: 130 },
        ]}
        activeFilterCount={activeFilterCount}
        onClearFilters={() => clearFilters(['status', 'lead_supervisor', 'source'])}
        totalCount={assignments.length}
        filteredCount={filtered.length}
      />

      <Paper elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
              <TableCell sx={{ fontWeight: 700 }}>Student</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Lead supervisor</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Co-supervisor</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Source</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} sx={{ py: 5, textAlign: 'center' }}>
                  <Typography sx={{ color: 'text.secondary' }}>No assignments match your filters.</Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((row) => (
                <TableRow key={`${row.id}-${row.student_id}`} hover>
                  <TableCell>
                    <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{row.student_name || row.student_id}</Typography>
                    <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{row.student_id}</Typography>
                  </TableCell>
                  <TableCell sx={{ fontSize: 13 }}>{row.lead_supervisor_name || '—'}</TableCell>
                  <TableCell sx={{ fontSize: 13 }}>{row.co_supervisor_name || '—'}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={row.status || '—'}
                      color={(row.status || '').toLowerCase() === 'active' ? 'success' : 'default'}
                      sx={{ fontWeight: 600 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={row.source || 'excel'} variant="outlined" />
                  </TableCell>
                  <TableCell align="right">
                    {(row.status || '').toLowerCase() === 'active' && row.source === 'dacoris' && (
                      <Button size="small" color="warning" onClick={() => handleEndAssignment(row)}>
                        End
                      </Button>
                    )}
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

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Assign Supervisor</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            select
            label="Student"
            size="small"
            value={form.student_id}
            onChange={(e) => setForm({ ...form, student_id: e.target.value })}
          >
            {students.map((s) => (
              <MenuItem key={s.student_id} value={s.student_id}>
                {s.full_name} ({s.student_id})
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Lead supervisor"
            size="small"
            value={form.lead_supervisor_id}
            onChange={(e) => setForm({ ...form, lead_supervisor_id: e.target.value })}
          >
            {supervisors.map((s) => (
              <MenuItem key={s.staff_id} value={s.staff_id}>
                {s.full_name} ({s.staff_id})
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Co-supervisor (optional)"
            size="small"
            value={form.co_supervisor_id}
            onChange={(e) => setForm({ ...form, co_supervisor_id: e.target.value })}
          >
            <MenuItem value="">None</MenuItem>
            {supervisors.map((s) => (
              <MenuItem key={s.staff_id} value={s.staff_id}>
                {s.full_name} ({s.staff_id})
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Notes"
            size="small"
            multiline
            rows={2}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAssign} disabled={saving}>
            {saving ? 'Saving…' : 'Assign'}
          </Button>
        </DialogActions>
      </Dialog>
    </PgPageShell>
  );
}
