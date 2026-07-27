'use client';

import { useCallback, useState, Fragment } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableHead, TableRow,
  Select, MenuItem, FormControl, CircularProgress, Collapse, IconButton,
  Chip, Alert, useTheme,
} from '@mui/material';
import {
  Flag as MilestoneIcon,
  CloudUpload as UploadIcon,
  ExpandMore as ExpandIcon,
  InsertDriveFile as FileIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL || '/api';
const ACCENT = '#1ca7a1';

const MILESTONE_STATUSES = [
  { value: 'planned', label: 'Planned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'overdue', label: 'Overdue' },
];

const DELIVERABLE_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'overdue', label: 'Overdue' },
];

function SectionCard({ icon: Icon, title, children, action }) {
  return (
    <Box
      sx={{
        p: { xs: 2, md: 2.5 },
        mb: 2.5,
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Icon sx={{ fontSize: 18, color: ACCENT }} />
          <Typography sx={{ fontSize: 15, fontWeight: 700 }}>{title}</Typography>
        </Box>
        {action}
      </Box>
      {children}
    </Box>
  );
}

function EvidenceDropzone({ onUpload, uploading, label }) {
  const theme = useTheme();
  const onDrop = useCallback((accepted) => {
    if (accepted[0]) onUpload(accepted[0]);
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    disabled: uploading,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-powerpoint': ['.ppt'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'text/csv': ['.csv'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'application/zip': ['.zip'],
    },
  });

  return (
    <Box
      {...getRootProps()}
      sx={{
        border: `2px dashed ${isDragActive ? ACCENT : theme.palette.divider}`,
        borderRadius: 2,
        p: 1.75,
        textAlign: 'center',
        cursor: uploading ? 'wait' : 'pointer',
        bgcolor: isDragActive ? `${ACCENT}08` : 'transparent',
        opacity: uploading ? 0.7 : 1,
        transition: 'all 0.15s',
        '&:hover': { borderColor: ACCENT, bgcolor: `${ACCENT}06` },
      }}
    >
      <input {...getInputProps()} />
      {uploading ? (
        <CircularProgress size={18} sx={{ color: ACCENT }} />
      ) : (
        <>
          <UploadIcon sx={{ fontSize: 20, color: 'text.disabled', mb: 0.25 }} />
          <Typography sx={{ fontSize: 12, color: isDragActive ? ACCENT : 'text.secondary', fontWeight: 600 }}>
            {isDragActive ? 'Drop file here' : (label || 'Drag & drop report or document, or click')}
          </Typography>
        </>
      )}
    </Box>
  );
}

function DocList({ docs, onDownload, fmtDate, locale }) {
  if (!docs?.length) {
    return (
      <Typography sx={{ fontSize: 12, color: 'text.secondary', py: 0.5 }}>
        No files uploaded yet.
      </Typography>
    );
  }
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mb: 1.5 }}>
      {docs.map((d) => (
        <Box
          key={d.id}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            py: 0.5,
            px: 1,
            borderRadius: 1.5,
            bgcolor: 'action.hover',
          }}
        >
          <FileIcon sx={{ fontSize: 16, color: ACCENT }} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {d.original_filename}
            </Typography>
            <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>
              {fmtDate(d.uploaded_at, locale)}
              {d.uploaded_by_name ? ` · ${d.uploaded_by_name}` : ''}
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => onDownload(d)} title="Download">
            <DownloadIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      ))}
    </Box>
  );
}

export default function ProjectPlanTab({
  project,
  projectId,
  t,
  locale,
  fmtDate,
  onRefresh,
  SectionCard: ExternalSectionCard,
}) {
  const Card = ExternalSectionCard || SectionCard;
  const [busyId, setBusyId] = useState(null);
  const [uploadBusyId, setUploadBusyId] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

  const flash = (msg, isError = false) => {
    if (isError) {
      setError(msg);
      setSuccess('');
    } else {
      setSuccess(msg);
      setError('');
    }
    setTimeout(() => {
      setError('');
      setSuccess('');
    }, 3500);
  };

  const updateMilestoneStatus = async (milestoneId, status) => {
    setBusyId(milestoneId);
    try {
      await axios.patch(
        `${API}/research/projects/${projectId}/milestones/${milestoneId}`,
        { status },
        { headers: authHeaders() },
      );
      await onRefresh();
      flash('Milestone status updated.');
    } catch (err) {
      flash(err.response?.data?.detail || 'Failed to update milestone status.', true);
    } finally {
      setBusyId(null);
    }
  };

  const updateDeliverableStatus = async (deliverableId, status) => {
    setBusyId(deliverableId);
    try {
      await axios.patch(
        `${API}/research/projects/${projectId}/deliverables/${deliverableId}`,
        { status },
        { headers: authHeaders() },
      );
      await onRefresh();
      flash('Deliverable status updated.');
    } catch (err) {
      flash(err.response?.data?.detail || 'Failed to update deliverable status.', true);
    } finally {
      setBusyId(null);
    }
  };

  const uploadEvidence = async (file, { milestoneId, deliverableId }) => {
    const key = deliverableId || milestoneId;
    setUploadBusyId(key);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('document_type', deliverableId ? 'deliverable_report' : 'milestone_report');
      if (milestoneId) fd.append('milestone_id', milestoneId);
      if (deliverableId) fd.append('deliverable_id', deliverableId);
      await axios.post(`${API}/research/projects/${projectId}/documents`, fd, {
        headers: { ...authHeaders(), 'Content-Type': 'multipart/form-data' },
      });
      await onRefresh();
      flash('Document uploaded.');
    } catch (err) {
      flash(err.response?.data?.detail || 'Upload failed.', true);
    } finally {
      setUploadBusyId(null);
    }
  };

  const downloadDoc = async (doc) => {
    try {
      const res = await axios.get(`${API}/research/projects/documents/${doc.id}/download`, {
        headers: authHeaders(),
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.original_filename || 'document';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      flash('Download failed.', true);
    }
  };

  const toggleExpand = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const milestones = project.milestones || [];
  const deliverables = project.deliverables || [];
  const milestoneTitle = (id) => milestones.find((m) => m.id === id)?.title;

  return (
    <>
      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>{success}</Alert>}

      <Card icon={MilestoneIcon} title={t('researcher.projectDetail.sections.milestones')}>
        <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 2 }}>
          Update milestone progress and attach reports. Deliverable evidence is preferred when a deliverable is linked to the milestone.
        </Typography>
        {milestones.length === 0 ? (
          <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
            {t('researcher.projectDetail.empty.noMilestones')}
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, width: 40 }} />
                <TableCell sx={{ fontWeight: 700 }}>{t('researcher.projectDetail.table.title')}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{t('researcher.projectDetail.table.due')}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{t('researcher.projectDetail.table.status')}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{t('researcher.projectDetail.table.assignee')}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{t('researcher.projectDetail.table.tasks')}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Files</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {milestones.map((m) => {
                const open = !!expanded[`m-${m.id}`];
                const docs = m.documents || [];
                return (
                  <Fragment key={m.id}>
                    <TableRow hover>
                      <TableCell>
                        <IconButton size="small" onClick={() => toggleExpand(`m-${m.id}`)}>
                          <ExpandIcon
                            sx={{
                              fontSize: 18,
                              transform: open ? 'rotate(180deg)' : 'none',
                              transition: 'transform 0.15s',
                            }}
                          />
                        </IconButton>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{m.title}</TableCell>
                      <TableCell>{fmtDate(m.due_date, locale)}</TableCell>
                      <TableCell>
                        <FormControl size="small" sx={{ minWidth: 140 }}>
                          <Select
                            value={m.status || 'planned'}
                            disabled={busyId === m.id}
                            onChange={(e) => updateMilestoneStatus(m.id, e.target.value)}
                            sx={{ fontSize: 13, borderRadius: 2 }}
                          >
                            {MILESTONE_STATUSES.map((s) => (
                              <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </TableCell>
                      <TableCell>{m.assigned_to_name || '—'}</TableCell>
                      <TableCell>{m.done_count}/{m.task_count}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={docs.length}
                          sx={{ fontWeight: 700, bgcolor: `${ACCENT}14`, color: ACCENT }}
                        />
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={7} sx={{ py: 0, border: open ? undefined : 'none' }}>
                        <Collapse in={open} timeout="auto" unmountOnExit>
                          <Box sx={{ py: 2, px: 1 }}>
                            <Typography sx={{ fontSize: 12, fontWeight: 700, mb: 1 }}>
                              Milestone evidence (optional)
                            </Typography>
                            <DocList docs={docs} onDownload={downloadDoc} fmtDate={fmtDate} locale={locale} />
                            <EvidenceDropzone
                              uploading={uploadBusyId === m.id}
                              onUpload={(file) => uploadEvidence(file, { milestoneId: m.id })}
                              label="Upload milestone report or supporting document"
                            />
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      <Card icon={MilestoneIcon} title={t('researcher.projectDetail.sections.deliverables')}>
        <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 2 }}>
          Upload reports and documents against each deliverable. Files are linked to the parent milestone automatically when one is set.
        </Typography>
        {deliverables.length === 0 ? (
          <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
            {t('researcher.projectDetail.empty.noDeliverables')}
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, width: 40 }} />
                <TableCell sx={{ fontWeight: 700 }}>{t('researcher.projectDetail.table.deliverableName')}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{t('researcher.projectDetail.table.deliverableType')}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Milestone</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{t('researcher.projectDetail.table.due')}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{t('researcher.projectDetail.table.status')}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{t('researcher.projectDetail.table.responsible')}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Files</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {deliverables.map((d) => {
                const open = !!expanded[`d-${d.id}`];
                const docs = d.documents || [];
                return (
                  <Fragment key={d.id}>
                    <TableRow hover>
                      <TableCell>
                        <IconButton size="small" onClick={() => toggleExpand(`d-${d.id}`)}>
                          <ExpandIcon
                            sx={{
                              fontSize: 18,
                              transform: open ? 'rotate(180deg)' : 'none',
                              transition: 'transform 0.15s',
                            }}
                          />
                        </IconButton>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{d.name}</TableCell>
                      <TableCell>{d.deliverable_type || '—'}</TableCell>
                      <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>
                        {d.milestone_id ? (milestoneTitle(d.milestone_id) || '—') : '—'}
                      </TableCell>
                      <TableCell>{fmtDate(d.due_date, locale)}</TableCell>
                      <TableCell>
                        <FormControl size="small" sx={{ minWidth: 140 }}>
                          <Select
                            value={d.status || 'pending'}
                            disabled={busyId === d.id}
                            onChange={(e) => updateDeliverableStatus(d.id, e.target.value)}
                            sx={{ fontSize: 13, borderRadius: 2 }}
                          >
                            {DELIVERABLE_STATUSES.map((s) => (
                              <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </TableCell>
                      <TableCell>{d.responsible_label || '—'}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={docs.length}
                          sx={{ fontWeight: 700, bgcolor: `${ACCENT}14`, color: ACCENT }}
                        />
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={8} sx={{ py: 0, border: open ? undefined : 'none' }}>
                        <Collapse in={open} timeout="auto" unmountOnExit>
                          <Box sx={{ py: 2, px: 1 }}>
                            <Typography sx={{ fontSize: 12, fontWeight: 700, mb: 1 }}>
                              Deliverable reports & documents
                            </Typography>
                            <DocList docs={docs} onDownload={downloadDoc} fmtDate={fmtDate} locale={locale} />
                            <EvidenceDropzone
                              uploading={uploadBusyId === d.id}
                              onUpload={(file) => uploadEvidence(file, {
                                deliverableId: d.id,
                                milestoneId: d.milestone_id || undefined,
                              })}
                              label="Drag & drop report or document against this deliverable"
                            />
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </>
  );
}
