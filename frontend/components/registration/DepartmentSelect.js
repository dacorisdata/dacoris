'use client';

import React from 'react';
import {
  FormControl,
  Select,
  MenuItem,
  FormHelperText,
  CircularProgress,
  ListSubheader,
} from '@mui/material';
import { useLanguage } from '../../contexts/LanguageContext';
import { getInstitutionTypeLabel } from '../../lib/institutionTypes';

export default function DepartmentSelect({
  institutionId,
  value,
  onChange,
  disabled = false,
  error = false,
  helperText = '',
  required = true,
}) {
  const { t } = useLanguage();
  const [departments, setDepartments] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!institutionId) {
      setDepartments([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/registration/departments?institution_id=${institutionId}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setDepartments(data.departments || []);
      })
      .catch(() => {
        if (!cancelled) setDepartments([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [institutionId]);

  const grouped = React.useMemo(() => {
    const general = [];
    const byType = {};
    departments.forEach((dept) => {
      if (!dept.institution_type) {
        general.push(dept);
      } else {
        if (!byType[dept.institution_type]) byType[dept.institution_type] = [];
        byType[dept.institution_type].push(dept);
      }
    });
    return { general, byType };
  }, [departments]);

  const isDisabled = disabled || !institutionId || loading;
  const placeholder = !institutionId
    ? t('registerAdminStaff.departmentVerifyEmailFirst')
    : loading
      ? t('registerAdminStaff.departmentLoading')
      : departments.length === 0
        ? t('registerAdminStaff.departmentEmpty')
        : t('registerAdminStaff.departmentPlaceholder');

  const renderGroup = (label, items) => {
    if (!items.length) return null;
    return [
      <ListSubheader key={`header-${label}`} sx={{ fontWeight: 700, color: 'text.secondary', lineHeight: 2.5 }}>
        {label}
      </ListSubheader>,
      ...items.map((dept) => (
        <MenuItem key={dept.id} value={dept.name}>
          {dept.name}
        </MenuItem>
      )),
    ];
  };

  return (
    <FormControl fullWidth error={error}>
      <Select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        displayEmpty
        disabled={isDisabled}
        MenuProps={{ PaperProps: { sx: { maxHeight: 360 } } }}
        sx={{
          bgcolor: 'background.paper',
          '& .MuiSelect-select': {
            fontStyle: !value ? 'italic' : 'normal',
          },
        }}
      >
        <MenuItem value="" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
          {placeholder}
        </MenuItem>
        {renderGroup(t('registerAdminStaff.departmentGroupGeneral'), grouped.general)}
        {Object.entries(grouped.byType).flatMap(([type, items]) =>
          renderGroup(getInstitutionTypeLabel(type) || type, items)
        )}
      </Select>
      <FormHelperText>
        {helperText || t('registerAdminStaff.departmentHelper')}
      </FormHelperText>
      {loading && (
        <CircularProgress size={16} sx={{ position: 'absolute', right: 36, top: 14 }} />
      )}
    </FormControl>
  );
}
