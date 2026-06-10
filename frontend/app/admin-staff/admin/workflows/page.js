'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, Button, CircularProgress, Card, CardContent,
  Chip, useTheme, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Select, MenuItem, FormControl, InputLabel, IconButton,
  Stepper, Step, StepLabel, Alert, Table, TableBody, TableCell, TableHead, TableRow,
  Checkbox, ListItemText, OutlinedInput,
} from '@mui/material';
import {
  AccountTree as WorkflowIcon, Add as AddIcon, Edit as EditIcon,
  Delete as DeleteIcon, PlayArrow as ActiveIcon, Pause as InactiveIcon,
  DragIndicator as DragIcon, Close as CloseIcon,
} from '@mui/icons-material';
import { useAuth } from '../../../../contexts/AuthContext';
import api from '../../../../lib/api';

const WORKFLOW_TYPES = [
  { id: 'proposal_review', label: 'Proposal Review', color: '#8b5cf6' },
  { id: 'project_review', label: 'Project Review', color: '#0ea5e9' },
  { id: 'ethics_review', label: 'Ethics Review', color: '#10b981' },
  { id: 'dmp_review', label: 'DMP Review', color: '#f59e0b' },
];

const AVAILABLE_ROLES = [
  { value: 'GRANT_MANAGER', label: 'Grant Manager' },
  { value: 'EXTERNAL_REVIEWER', label: 'External Reviewer' },
  { value: 'FINANCE_OFFICER', label: 'Finance Officer' },
  { value: 'INSTITUTIONAL_LEADERSHIP', label: 'Institutional Leadership' },
  { value: 'ADMIN_STAFF', label: 'Admin Staff' },
  { value: 'ETHICS_COMMITTEE_MEMBER', label: 'Ethics Committee Member' },
  { value: 'DATA_STEWARD', label: 'Data Steward' },
  { value: 'DATA_ENGINEER', label: 'Data Engineer' },
  { value: 'LEGAL_OFFICER', label: 'Legal Officer' },
  { value: 'PARTNERSHIP_COORDINATOR', label: 'Partnership Coordinator' },
];

const ROLE_LABELS = {
  GRANT_MANAGER: 'Grant Manager',
  EXTERNAL_REVIEWER: 'External Reviewer',
  FINANCE_OFFICER: 'Finance Officer',
  INSTITUTIONAL_LEADERSHIP: 'Institutional Leadership',
  ADMIN_STAFF: 'Admin Staff',
  ETHICS_COMMITTEE_MEMBER: 'Ethics Committee Member',
  DATA_STEWARD: 'Data Steward',
  DATA_ENGINEER: 'Data Engineer',
};

export default function WorkflowsPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [workflows, setWorkflows] = useState([]);
  const [selectedType, setSelectedType] = useState('all');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    workflow_type: 'proposal_review',
    description: '',
    status: 'active',
    stages: [{ stage_order: 1, stage_name: '', assigned_role: ['GRANT_MANAGER'], approvals_required: 1, duration_days: 7 }],
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchUser().then(u => {
      if (!u) router.push('/login');
      else loadWorkflows();
    }).catch(() => {
      setLoading(false);
    });
  }, []);

  const loadWorkflows = async () => {
    try {
      const res = await api.get('/workflows');
      setWorkflows(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Failed to load workflows:', error);
      setWorkflows([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const filtered = selectedType === 'all'
    ? workflows
    : workflows.filter(w => w.type === selectedType);

  const handleCreateWorkflow = () => {
    setEditingWorkflow(null);
    setFormData({
      name: '',
      workflow_type: 'proposal_review',
      description: '',
      status: 'active',
      stages: [{ stage_order: 1, stage_name: '', assigned_role: ['GRANT_MANAGER'], approvals_required: 1, duration_days: 7 }],
    });
    setOpenDialog(true);
  };

  const handleEditWorkflow = (workflow) => {
    setEditingWorkflow(workflow);
    setFormData({
      name: workflow.name,
      workflow_type: workflow.type,
      description: workflow.description || '',
      status: workflow.status,
      stages: workflow.stages.map(s => ({
        stage_order: s.order,
        stage_name: s.name,
        assigned_role: Array.isArray(s.role) ? s.role : [s.role],
        approvals_required: s.approvalRequired,
        duration_days: s.durationDays || 7,
      })),
    });
    setOpenDialog(true);
  };

  const handleToggleStatus = async (workflowId) => {
    try {
      await api.post(`/workflows/${workflowId}/toggle-status`);
      await loadWorkflows();
    } catch (error) {
      console.error('Failed to toggle status:', error);
    }
  };

  const handleDeleteWorkflow = async (workflowId) => {
    if (!confirm('Are you sure you want to delete this workflow?')) return;
    try {
      await api.delete(`/workflows/${workflowId}`);
      await loadWorkflows();
    } catch (error) {
      console.error('Failed to delete workflow:', error);
    }
  };

  const handleSaveWorkflow = async () => {
    setSaving(true);
    try {
      if (editingWorkflow) {
        await api.put(`/workflows/${editingWorkflow.id}`, formData);
      } else {
        await api.post('/workflows', formData);
      }
      await loadWorkflows();
      setOpenDialog(false);
    } catch (error) {
      console.error('Failed to save workflow:', error);
      alert('Failed to save workflow');
    } finally {
      setSaving(false);
    }
  };

  const addStage = () => {
    setFormData({
      ...formData,
      stages: [...formData.stages, {
        stage_order: formData.stages.length + 1,
        stage_name: '',
        assigned_role: ['GRANT_MANAGER'],
        approvals_required: 1,
        duration_days: 7,
      }],
    });
  };

  const removeStage = (index) => {
    const newStages = formData.stages.filter((_, i) => i !== index);
    newStages.forEach((s, i) => s.stage_order = i + 1);
    setFormData({ ...formData, stages: newStages });
  };

  const updateStage = (index, field, value) => {
    const newStages = [...formData.stages];
    newStages[index][field] = value;
    setFormData({ ...formData, stages: newStages });
  };

  const workflowTypeInfo = (typeId) => WORKFLOW_TYPES.find(t => t.id === typeId);

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography sx={{ fontSize: 22, fontWeight: 700, color: 'text.primary' }}>
            Institutional Workflows
          </Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.3 }}>
            Configure dynamic review workflows for proposals, projects, ethics, and DMPs
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateWorkflow}
          sx={{ bgcolor: '#16a699', '&:hover': { bgcolor: '#138f82' } }}
        >
          Create Workflow
        </Button>
      </Box>

      {/* Workflow Type Stats */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Box
          onClick={() => setSelectedType('all')}
          sx={{
            flex: '1 1 120px',
            bgcolor: selectedType === 'all' ? '#16a69918' : 'background.paper',
            border: `1px solid ${selectedType === 'all' ? '#16a699' : theme.palette.divider}`,
            borderRadius: 2,
            p: 1.5,
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s',
            '&:hover': { borderColor: '#16a699' },
          }}
        >
          <Typography sx={{ fontSize: 20, fontWeight: 700, color: '#16a699' }}>
            {workflows.length}
          </Typography>
          <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 600 }}>
            All Workflows
          </Typography>
        </Box>
        {WORKFLOW_TYPES.map(type => {
          const count = workflows.filter(w => w.type === type.id).length;
          const isSelected = selectedType === type.id;
          return (
            <Box
              key={type.id}
              onClick={() => setSelectedType(type.id)}
              sx={{
                flex: '1 1 140px',
                bgcolor: isSelected ? `${type.color}18` : 'background.paper',
                border: `1px solid ${isSelected ? type.color : theme.palette.divider}`,
                borderRadius: 2,
                p: 1.5,
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': { borderColor: type.color },
              }}
            >
              <Typography sx={{ fontSize: 18, fontWeight: 700, color: type.color, mt: 1 }}>
                {count}
              </Typography>
              <Typography sx={{ fontSize: 10, color: 'text.secondary', fontWeight: 600 }}>
                {type.label}
              </Typography>
            </Box>
          );
        })}
      </Box>

      {/* Info Alert */}
      <Alert severity="info" sx={{ mb: 3 }}>
        Workflows define the review stages and approval requirements for different types of submissions. 
        Active workflows are automatically applied to new submissions of their type.
      </Alert>

      {/* Workflows List */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {filtered.map(workflow => {
          const typeInfo = workflowTypeInfo(workflow.type) || { label: workflow.type, color: '#64748b' };
          return (
            <Card
              key={workflow.id}
              elevation={0}
              sx={{
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2.5,
                transition: 'all 0.2s',
                '&:hover': {
                  boxShadow: theme.palette.mode === 'dark' ? 'none' : '0 4px 16px rgba(0,0,0,0.08)',
                },
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box>
                      <Typography sx={{ fontSize: 16, fontWeight: 700, color: 'text.primary' }}>
                        {workflow.name}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <Chip
                          label={typeInfo.label}
                          size="small"
                          sx={{
                            fontSize: 9,
                            fontWeight: 700,
                            bgcolor: `${typeInfo.color}18`,
                            color: typeInfo.color,
                          }}
                        />
                        <Chip
                          icon={workflow.status === 'active' ? <ActiveIcon /> : <InactiveIcon />}
                          label={workflow.status === 'active' ? 'Active' : 'Inactive'}
                          size="small"
                          sx={{
                            fontSize: 9,
                            fontWeight: 700,
                            bgcolor: workflow.status === 'active' ? '#10b98118' : '#64748b18',
                            color: workflow.status === 'active' ? '#10b981' : '#64748b',
                          }}
                        />
                        <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>
                          {workflow.stages.length} stages
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <IconButton
                      size="small"
                      onClick={() => handleToggleStatus(workflow.id)}
                      sx={{ color: 'text.secondary' }}
                    >
                      {workflow.status === 'active' ? <InactiveIcon /> : <ActiveIcon />}
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleEditWorkflow(workflow)}
                      sx={{ color: 'text.secondary' }}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteWorkflow(workflow.id)}
                      sx={{ color: 'text.secondary' }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Box>

                {/* Workflow Stages Stepper */}
                <Stepper activeStep={-1} sx={{ mt: 2 }}>
                  {workflow.stages.map((stage, idx) => (
                    <Step key={stage.id} completed={false}>
                      <StepLabel>
                        <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.primary' }}>
                          {stage.name}
                        </Typography>
                        <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>
                          {ROLE_LABELS[stage.role]} ({stage.approvalRequired} approval{stage.approvalRequired > 1 ? 's' : ''})
                        </Typography>
                      </StepLabel>
                    </Step>
                  ))}
                </Stepper>
              </CardContent>
            </Card>
          );
        })}
      </Box>

      {filtered.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <WorkflowIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography sx={{ fontSize: 16, fontWeight: 600, color: 'text.secondary', mb: 1 }}>
            No workflows found
          </Typography>
          <Typography sx={{ fontSize: 13, color: 'text.disabled', mb: 3 }}>
            {selectedType === 'all'
              ? 'Create your first workflow to get started'
              : `No workflows configured for ${workflowTypeInfo(selectedType).label}`}
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateWorkflow}
            sx={{ bgcolor: '#16a699', '&:hover': { bgcolor: '#138f82' } }}
          >
            Create Workflow
          </Button>
        </Box>
      )}

      {/* Create/Edit Dialog */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography sx={{ fontSize: 18, fontWeight: 700 }}>
            {editingWorkflow ? 'Edit Workflow' : 'Create New Workflow'}
          </Typography>
          <IconButton onClick={() => setOpenDialog(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
            <TextField
              label="Workflow Name"
              fullWidth
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            
            <FormControl fullWidth>
              <InputLabel>Workflow Type</InputLabel>
              <Select
                value={formData.workflow_type}
                label="Workflow Type"
                onChange={(e) => setFormData({ ...formData, workflow_type: e.target.value })}
                disabled={!!editingWorkflow}
              >
                {WORKFLOW_TYPES.map(type => (
                  <MenuItem key={type.id} value={type.id}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Description"
              fullWidth
              multiline
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />

            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography sx={{ fontSize: 15, fontWeight: 700 }}>Workflow Stages</Typography>
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={addStage}
                  sx={{ fontSize: 12 }}
                >
                  Add Stage
                </Button>
              </Box>

              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Order</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Stage Name</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Assigned Role</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Approvals</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Days</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 11 }}></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {formData.stages.map((stage, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{stage.stage_order}</Typography>
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          fullWidth
                          value={stage.stage_name}
                          onChange={(e) => updateStage(index, 'stage_name', e.target.value)}
                          placeholder="e.g., Initial Screening"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          size="small"
                          fullWidth
                          multiple
                          value={stage.assigned_role}
                          onChange={(e) => updateStage(index, 'assigned_role', e.target.value)}
                          input={<OutlinedInput />}
                          renderValue={(selected) => selected.map(val => 
                            AVAILABLE_ROLES.find(r => r.value === val)?.label || val
                          ).join(', ')}
                        >
                          {AVAILABLE_ROLES.map(role => (
                            <MenuItem key={role.value} value={role.value}>
                              <Checkbox checked={stage.assigned_role.indexOf(role.value) > -1} />
                              <ListItemText primary={role.label} />
                            </MenuItem>
                          ))}
                        </Select>
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          type="number"
                          value={stage.approvals_required}
                          onChange={(e) => updateStage(index, 'approvals_required', parseInt(e.target.value) || 1)}
                          sx={{ width: 70 }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          type="number"
                          value={stage.duration_days}
                          onChange={(e) => updateStage(index, 'duration_days', parseInt(e.target.value) || 7)}
                          sx={{ width: 70 }}
                        />
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => removeStage(index)}
                          disabled={formData.stages.length === 1}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenDialog(false)} disabled={saving}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveWorkflow}
            disabled={saving || !formData.name || formData.stages.some(s => !s.stage_name)}
            sx={{ bgcolor: '#16a699', '&:hover': { bgcolor: '#138f82' } }}
          >
            {saving ? 'Saving...' : (editingWorkflow ? 'Save Changes' : 'Create Workflow')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
