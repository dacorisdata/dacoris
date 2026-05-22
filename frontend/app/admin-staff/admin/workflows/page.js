'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, Button, CircularProgress, Card, CardContent,
  Chip, useTheme, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Select, MenuItem, FormControl, InputLabel, IconButton,
  Stepper, Step, StepLabel, Alert,
} from '@mui/material';
import {
  AccountTree as WorkflowIcon, Add as AddIcon, Edit as EditIcon,
  Delete as DeleteIcon, PlayArrow as ActiveIcon, Pause as InactiveIcon,
  DragIndicator as DragIcon,
} from '@mui/icons-material';
import { useAuth } from '../../../../contexts/AuthContext';

const WORKFLOW_TYPES = [
  { id: 'proposal_review', label: 'Proposal Review', color: '#8b5cf6', icon: '📝' },
  { id: 'project_review', label: 'Project Review', color: '#0ea5e9', icon: '🔬' },
  { id: 'ethics_review', label: 'Ethics Review', color: '#10b981', icon: '⚖️' },
  { id: 'dmp_review', label: 'DMP Review', color: '#f59e0b', icon: '📊' },
];

const MOCK_WORKFLOWS = [
  {
    id: 1,
    name: 'Standard Proposal Review',
    type: 'proposal_review',
    status: 'active',
    stages: [
      { id: 1, name: 'Initial Screening', role: 'GRANT_MANAGER', approvalRequired: 1 },
      { id: 2, name: 'Technical Review', role: 'EXTERNAL_REVIEWER', approvalRequired: 2 },
      { id: 3, name: 'Budget Review', role: 'FINANCE_OFFICER', approvalRequired: 1 },
      { id: 4, name: 'Final Approval', role: 'INSTITUTIONAL_LEADERSHIP', approvalRequired: 1 },
    ],
  },
  {
    id: 2,
    name: 'Expedited Ethics Review',
    type: 'ethics_review',
    status: 'active',
    stages: [
      { id: 1, name: 'Administrative Check', role: 'ADMIN_STAFF', approvalRequired: 1 },
      { id: 2, name: 'Ethics Committee Review', role: 'ETHICS_COMMITTEE_MEMBER', approvalRequired: 1 },
    ],
  },
  {
    id: 3,
    name: 'Full Ethics Board Review',
    type: 'ethics_review',
    status: 'inactive',
    stages: [
      { id: 1, name: 'Administrative Check', role: 'ADMIN_STAFF', approvalRequired: 1 },
      { id: 2, name: 'Primary Review', role: 'ETHICS_COMMITTEE_MEMBER', approvalRequired: 2 },
      { id: 3, name: 'Board Discussion', role: 'ETHICS_COMMITTEE_MEMBER', approvalRequired: 3 },
      { id: 4, name: 'Chair Approval', role: 'INSTITUTIONAL_LEADERSHIP', approvalRequired: 1 },
    ],
  },
  {
    id: 4,
    name: 'DMP Standard Review',
    type: 'dmp_review',
    status: 'active',
    stages: [
      { id: 1, name: 'Data Steward Review', role: 'DATA_STEWARD', approvalRequired: 1 },
      { id: 2, name: 'Technical Validation', role: 'DATA_ENGINEER', approvalRequired: 1 },
    ],
  },
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
  const [workflows, setWorkflows] = useState(MOCK_WORKFLOWS);
  const [selectedType, setSelectedType] = useState('all');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState(null);

  useEffect(() => {
    fetchUser().then(u => {
      if (!u) router.push('/login');
      else setLoading(false);
    });
  }, []);

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
    setOpenDialog(true);
  };

  const handleEditWorkflow = (workflow) => {
    setEditingWorkflow(workflow);
    setOpenDialog(true);
  };

  const handleToggleStatus = (workflowId) => {
    setWorkflows(workflows.map(w =>
      w.id === workflowId
        ? { ...w, status: w.status === 'active' ? 'inactive' : 'active' }
        : w
    ));
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
              <Box sx={{ fontSize: 20, mb: 0.5 }}>{type.icon}</Box>
              <Typography sx={{ fontSize: 18, fontWeight: 700, color: type.color }}>
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
          const typeInfo = workflowTypeInfo(workflow.type);
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
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 2,
                        bgcolor: `${typeInfo.color}18`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 22,
                      }}
                    >
                      {typeInfo.icon}
                    </Box>
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
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingWorkflow ? 'Edit Workflow' : 'Create New Workflow'}
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            This feature will allow you to configure multi-stage approval workflows with role-based reviewers.
            Implementation is in progress.
          </Alert>
          <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
            Workflow configuration UI coming soon...
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button variant="contained" sx={{ bgcolor: '#16a699' }}>
            {editingWorkflow ? 'Save Changes' : 'Create Workflow'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
