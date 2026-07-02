'use client';

import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Paper,
  TablePagination,
  TextField,
  MenuItem,
  Typography,
  InputAdornment,
} from '@mui/material';
import { Search as SearchIcon, FilterList as FilterIcon } from '@mui/icons-material';

export const ROWS_PER_PAGE_OPTIONS = [10, 25, 50];

export function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

export function usePgTableState(defaultRowsPerPage = 10) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage);
  const [filters, setFilters] = useState({});

  const setFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(0);
  };

  const clearFilters = (keys) => {
    setSearch('');
    setFilters(Object.fromEntries(keys.map((key) => [key, 'all'])));
    setPage(0);
  };

  return {
    search,
    setSearch,
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    filters,
    setFilter,
    clearFilters,
  };
}

export function useFilteredRows(rows, { search, filters, filterFn }) {
  return useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (q && !filterFn(row, q, 'search')) return false;
      return Object.entries(filters).every(([key, value]) => {
        if (!value || value === 'all') return true;
        return filterFn(row, value, key);
      });
    });
  }, [rows, search, filters, filterFn]);
}

export function usePaginatedRows(filtered, page, rowsPerPage) {
  return useMemo(() => {
    const start = page * rowsPerPage;
    return filtered.slice(start, start + rowsPerPage);
  }, [filtered, page, rowsPerPage]);
}

export function PgAdminTableToolbar({
  search,
  onSearchChange,
  searchPlaceholder = 'Search…',
  filterFields = [],
  filters = {},
  onFilterChange,
  activeFilterCount = 0,
  onClearFilters,
  totalCount,
  filteredCount,
}) {
  return (
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
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          sx={{ flex: '1 1 220px', minWidth: 200 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
              </InputAdornment>
            ),
          }}
        />
        {filterFields.map((field) => (
          <TextField
            key={field.key}
            select
            size="small"
            label={field.label}
            value={filters[field.key] || 'all'}
            onChange={(e) => onFilterChange(field.key, e.target.value)}
            sx={{ minWidth: field.minWidth || 160, flex: `1 1 ${field.minWidth || 140}px` }}
          >
            <MenuItem value="all">{field.allLabel || `All ${field.label.toLowerCase()}`}</MenuItem>
            {field.options.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        ))}
        {activeFilterCount > 0 && onClearFilters && (
          <Button size="small" onClick={onClearFilters} startIcon={<FilterIcon />}>
            Clear ({activeFilterCount})
          </Button>
        )}
      </Box>
      {typeof filteredCount === 'number' && typeof totalCount === 'number' && (
        <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 1.5 }}>
          Showing {filteredCount} of {totalCount} records
        </Typography>
      )}
    </Paper>
  );
}

export function PgAdminTablePagination({
  count,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
}) {
  return (
    <TablePagination
      component="div"
      count={count}
      page={page}
      onPageChange={(_, next) => onPageChange(next)}
      rowsPerPage={rowsPerPage}
      onRowsPerPageChange={(e) => {
        onRowsPerPageChange(parseInt(e.target.value, 10));
        onPageChange(0);
      }}
      rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
      labelRowsPerPage="Rows per page"
    />
  );
}
