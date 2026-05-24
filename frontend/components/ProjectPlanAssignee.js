'use client';
import { useState } from 'react';
import {
  Box, Typography, FormControl, InputLabel, Select, MenuItem, ListSubheader,
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
  FormControlLabel, Checkbox, Chip,
} from '@mui/material';
import { GroupAdd as TeamIcon } from '@mui/icons-material';

const ACCENT = '#1ca7a1';
const CREATE_TEAM_VALUE = '__create_team__';

export function parseAssigneeKey(key) {
  if (!key) {
    return {
      assignee_kind: null,
      assignee_user_id: null,
      assignee_member_id: null,
      assignee_team_id: null,
    };
  }
  const [kind, id] = key.split(':');
  if (kind === 'user') {
    return { assignee_kind: 'individual', assignee_user_id: id, assignee_member_id: null, assignee_team_id: null };
  }
  if (kind === 'member') {
    return { assignee_kind: 'individual', assignee_user_id: null, assignee_member_id: id, assignee_team_id: null };
  }
  if (kind === 'team') {
    return { assignee_kind: 'team', assignee_user_id: null, assignee_member_id: null, assignee_team_id: id };
  }
  return {
    assignee_kind: null,
    assignee_user_id: null,
    assignee_member_id: null,
    assignee_team_id: null,
  };
}

export function assigneeKeyFromDeliverable(d) {
  if (!d) return '';
  if (d.assignee_kind === 'team' && d.assignee_team_id) return `team:${d.assignee_team_id}`;
  if (d.assignee_user_id) return `user:${d.assignee_user_id}`;
  if (d.assignee_member_id) return `member:${d.assignee_member_id}`;
  return '';
}

export function buildPlanIndividuals(project, members, piName) {
  const list = [];
  const seenUserIds = new Set();

  if (project?.pi_id) {
    list.push({
      key: `user:${project.pi_id}`,
      user_id: project.pi_id,
      project_member_id: null,
      label: `${piName || project.pi_name || 'Principal Investigator'} (PI)`,
      role_label: 'PI',
    });
    seenUserIds.add(project.pi_id);
  }

  (members || []).forEach(m => {
    if (m.user_id && seenUserIds.has(m.user_id)) return;
    if (m.user_id) seenUserIds.add(m.user_id);
    list.push({
      key: m.user_id ? `user:${m.user_id}` : `member:${m.id}`,
      user_id: m.user_id || null,
      project_member_id: m.user_id ? null : m.id,
      label: `${m.user_name || m.invited_name || m.invited_email || 'Team member'} (${(m.role || 'member').replace(/_/g, ' ')})`,
      role_label: (m.role || 'member').replace(/_/g, ' '),
    });
  });

  return list;
}

function CreateTeamDialog({ open, onClose, individuals, onSave, saving }) {
  const [name, setName] = useState('');
  const [selected, setSelected] = useState({});

  const toggle = (key) => {
    setSelected(prev => {
      const next = { ...prev };
      if (next[key]) delete next[key];
      else next[key] = true;
      return next;
    });
  };

  const handleSave = async () => {
    const members = individuals.filter(p => selected[p.key]).map(p => ({
      user_id: p.user_id,
      project_member_id: p.project_member_id,
      display_name: p.label.replace(/\s*\([^)]*\)\s*$/, '').trim(),
      role_label: p.role_label,
    }));
    await onSave({ name: name.trim(), members });
    setName('');
    setSelected({});
  };

  const handleClose = () => {
    setName('');
    setSelected({});
    onClose();
  };

  const selectedCount = Object.keys(selected).length;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Create Project Team</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
        <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
          Group individuals from your research team. The team and its members will be saved for research managers to review.
        </Typography>
        <TextField
          fullWidth size="small" label="Team Name *" value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Data Collection Team"
        />
        <Box>
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', mb: 1, textTransform: 'uppercase' }}>
            Select Members
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {individuals.map(person => (
              <FormControlLabel
                key={person.key}
                control={
                  <Checkbox
                    checked={!!selected[person.key]}
                    onChange={() => toggle(person.key)}
                    sx={{ color: ACCENT, '&.Mui-checked': { color: ACCENT } }}
                  />
                }
                label={<Typography sx={{ fontSize: 13 }}>{person.label}</Typography>}
              />
            ))}
          </Box>
        </Box>
        {selectedCount > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            {individuals.filter(p => selected[p.key]).map(p => (
              <Chip key={p.key} label={p.label} size="small" sx={{ bgcolor: `${ACCENT}15`, color: ACCENT, fontWeight: 600 }} />
            ))}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2, pt: 0 }}>
        <Button onClick={handleClose} sx={{ textTransform: 'none' }}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving || !name.trim() || selectedCount === 0}
          sx={{ bgcolor: ACCENT, textTransform: 'none', borderRadius: 2, '&:hover': { bgcolor: '#0e8a85' } }}
        >
          {saving ? 'Creating…' : 'Create Team'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function PlanAssigneeSelect({
  label = 'Responsible Person / Team',
  value,
  onChange,
  individuals = [],
  teams = [],
  onCreateTeam,
  size = 'small',
  sx,
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const handleChange = async (e) => {
    const next = e.target.value;
    if (next === CREATE_TEAM_VALUE) {
      setCreateOpen(true);
      return;
    }
    onChange?.(next);
  };

  const handleCreateTeam = async (payload) => {
    setCreating(true);
    try {
      const team = await onCreateTeam(payload);
      if (team?.id) onChange?.(`team:${team.id}`);
      setCreateOpen(false);
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <FormControl fullWidth size={size} sx={sx}>
        <InputLabel>{label}</InputLabel>
        <Select value={value || ''} label={label} onChange={handleChange}>
          <MenuItem value=""><em>Unassigned</em></MenuItem>
          {individuals.length > 0 && (
            <ListSubheader sx={{ fontSize: 11, fontWeight: 700, lineHeight: 2.5 }}>Individuals</ListSubheader>
          )}
          {individuals.map(person => (
            <MenuItem key={person.key} value={person.key}>{person.label}</MenuItem>
          ))}
          {teams.length > 0 && (
            <ListSubheader sx={{ fontSize: 11, fontWeight: 700, lineHeight: 2.5 }}>Teams</ListSubheader>
          )}
          {teams.map(team => (
            <MenuItem key={team.id} value={`team:${team.id}`}>
              {team.name} ({team.members?.length || 0} members)
            </MenuItem>
          ))}
          <MenuItem disabled sx={{ opacity: 1, minHeight: 8, py: 0.5, borderTop: '1px solid', borderColor: 'divider' }} />
          <MenuItem value={CREATE_TEAM_VALUE} sx={{ color: ACCENT, fontWeight: 600 }}>
            <TeamIcon sx={{ fontSize: 16, mr: 1 }} /> Create Team from Members…
          </MenuItem>
        </Select>
      </FormControl>
      <CreateTeamDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        individuals={individuals}
        onSave={handleCreateTeam}
        saving={creating}
      />
    </>
  );
}
