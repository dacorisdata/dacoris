'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, CircularProgress, Alert, Chip, useTheme,
  LinearProgress, Button, TextField, Collapse, IconButton,
} from '@mui/material';
import {
  WorkspacePremium as CertIcon, EventAvailable as AttendIcon,
  CheckCircle as ConfirmedIcon, HourglassEmpty as PendingIcon, Cancel as RejectedIcon,
  MenuBook as MaterialsIcon, ExpandMore as ExpandIcon, Visibility as PreviewIcon,
  Description as FileIcon, PauseCircle as SuspendIcon, Cancel as CancelIcon,
} from '@mui/icons-material';
import { useAuth } from '../../../../contexts/AuthContext';
import { trainingAPI } from '../../../../lib/api';

const ACCENT = '#1ca7a1';

const STATUS_META = {
  active:    { label: 'In Progress', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  completed: { label: 'Completed',   color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  dropped:   { label: 'Cancelled',   color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
  suspended: { label: 'Suspended',   color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
};

const ATTEND_META = {
  pending:   { label: 'Awaiting confirmation', color: '#f59e0b', icon: PendingIcon },
  confirmed: { label: 'Confirmed', color: '#10b981', icon: ConfirmedIcon },
  rejected:  { label: 'Rejected — resubmit', color: '#ef4444', icon: RejectedIcon },
};

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const todayISO = () => new Date().toISOString().slice(0, 10);

export default function MyCoursesPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();

  const [loading, setLoading] = useState(true);
  const [enrollments, setEnrollments] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [sessionDates, setSessionDates] = useState({});
  const [submitting, setSubmitting] = useState(null);
  const [expandedMaterials, setExpandedMaterials] = useState({});
  const [materialsCache, setMaterialsCache] = useState({});
  const [materialsLoading, setMaterialsLoading] = useState({});

  useEffect(() => { init(); }, []);

  const init = async () => {
    const u = await fetchUser();
    if (!u) { router.push('/login'); return; }
    try {
      const res = await trainingAPI.myEnrollments();
      setEnrollments(res.data || []);
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const nextSessionNumber = (e) => {
    const total = e.attendance_summary?.session_count || 0;
    const records = e.attendance || [];
    for (let n = 1; n <= total; n++) {
      const rec = records.find(r => r.session_number === n);
      if (!rec || rec.status === 'rejected') return n;
    }
    return null;
  };

  const toggleMaterials = async (programId) => {
    const open = !expandedMaterials[programId];
    setExpandedMaterials(s => ({ ...s, [programId]: open }));
    if (open && !materialsCache[programId]) {
      setMaterialsLoading(s => ({ ...s, [programId]: true }));
      try {
        const res = await trainingAPI.getProgramContent(programId);
        setMaterialsCache(s => ({ ...s, [programId]: res.data }));
      } catch (e) {
        setError(e.response?.data?.detail || 'Failed to load materials');
      } finally {
        setMaterialsLoading(s => ({ ...s, [programId]: false }));
      }
    }
  };

  const previewMaterial = (mat) => {
    router.push(`/researcher/training/materials/${mat.id}`);
  };

  const changeEnrollmentStatus = async (enrollmentId, status, label) => {
    const msg = status === 'dropped'
      ? 'Cancel this enrollment? You can re-enrol from the training catalog afterwards.'
      : 'Suspend this enrollment? Your research manager can reactivate it when you are ready to continue.';
    if (!confirm(msg)) return;
    setError('');
    try {
      await trainingAPI.updateEnrollment(enrollmentId, { status });
      setSuccess(`Enrollment ${label.toLowerCase()}`);
      await init();
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e.response?.data?.detail || `Failed to ${label.toLowerCase()} enrollment`);
    }
  };

  const markAttendance = async (enrollmentId, sessionNumber) => {
    const dateKey = `${enrollmentId}-${sessionNumber}`;
    const attendanceDate = sessionDates[dateKey] || todayISO();
    setSubmitting(dateKey);
    setError('');
    try {
      await trainingAPI.markAttendance(enrollmentId, {
        session_number: sessionNumber,
        attendance_date: attendanceDate,
      });
      setSuccess(`Attendance submitted for session ${sessionNumber} — awaiting manager confirmation`);
      await init();
      setTimeout(() => setSuccess(''), 4000);
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to mark attendance');
    } finally {
      setSubmitting(null);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress sx={{ color: ACCENT }} />
      </Box>
    );
  }

  const active = enrollments.filter(e => e.status === 'active');
  const suspended = enrollments.filter(e => e.status === 'suspended');
  const cancelled = enrollments.filter(e => e.status === 'dropped');
  const completed = enrollments.filter(e => e.status === 'completed');

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography sx={{ fontSize: 24, fontWeight: 700 }}>My Courses</Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
            Mark attendance per session. Your research manager confirms each session before progress counts.
          </Typography>
        </Box>
        <Button size="small" variant="outlined" onClick={() => router.push('/researcher/training/catalog')}
          sx={{ borderColor: ACCENT, color: ACCENT }}>
          Browse Catalog
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {enrollments.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6, bgcolor: 'background.paper', borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
          <Typography sx={{ color: 'text.secondary', mb: 2 }}>You haven't enrolled in any courses yet.</Typography>
          <Button variant="contained" onClick={() => router.push('/researcher/training/catalog')}
            sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#15968f' } }}>
            Browse Training Catalog
          </Button>
        </Box>
      ) : (
        <>
          {active.length > 0 && (
            <Box sx={{ mb: 4 }}>
              <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 2 }}>In Progress ({active.length})</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {active.map(e => {
                  const sm = STATUS_META[e.status] || STATUS_META.active;
                  const summary = e.attendance_summary || {};
                  const next = nextSessionNumber(e);
                  const dateKey = next ? `${e.id}-${next}` : null;
                  return (
                    <Box key={e.id} sx={{
                      bgcolor: 'background.paper', borderRadius: 3, p: 3,
                      border: `1px solid ${theme.palette.divider}`,
                    }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                        <Box>
                          <Typography sx={{ fontWeight: 700, fontSize: 15 }}>{e.program_title}</Typography>
                          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                            {e.program_category} · {e.cpd_hours} CPD hrs · {summary.confirmed || 0}/{summary.session_count || 0} sessions confirmed
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                          <Chip label={sm.label} size="small" sx={{ bgcolor: sm.bg, color: sm.color, fontWeight: 600 }} />
                          <Button size="small" variant="outlined" startIcon={<SuspendIcon />}
                            onClick={() => changeEnrollmentStatus(e.id, 'suspended', 'Suspend')}
                            sx={{ fontSize: 11, borderColor: '#f59e0b', color: '#f59e0b', py: 0.25 }}>
                            Suspend
                          </Button>
                          <Button size="small" variant="outlined" startIcon={<CancelIcon />}
                            onClick={() => changeEnrollmentStatus(e.id, 'dropped', 'Cancel')}
                            sx={{ fontSize: 11, borderColor: 'error.main', color: 'error.main', py: 0.25 }}>
                            Cancel
                          </Button>
                        </Box>
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <LinearProgress variant="determinate" value={e.progress_percentage || 0}
                          sx={{ flex: 1, height: 8, borderRadius: 4, bgcolor: 'action.hover',
                            '& .MuiLinearProgress-bar': { bgcolor: ACCENT } }} />
                        <Typography sx={{ fontSize: 12, fontWeight: 700, minWidth: 36 }}>
                          {Math.round(e.progress_percentage || 0)}%
                        </Typography>
                      </Box>

                      {(e.attendance || []).length > 0 && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mb: 2 }}>
                          {(e.attendance || []).map(rec => {
                            const am = ATTEND_META[rec.status] || ATTEND_META.pending;
                            const Icon = am.icon;
                            return (
                              <Box key={rec.id} sx={{
                                display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.75,
                                borderRadius: 1.5, bgcolor: 'action.hover',
                              }}>
                                <Icon sx={{ fontSize: 16, color: am.color }} />
                                <Typography sx={{ fontSize: 12, flex: 1 }}>
                                  Session {rec.session_number} · {fmtDate(rec.attendance_date)}
                                </Typography>
                                <Chip label={am.label} size="small"
                                  sx={{ fontSize: 10, height: 20, color: am.color, bgcolor: `${am.color}18` }} />
                              </Box>
                            );
                          })}
                        </Box>
                      )}

                      {next ? (
                        <Box sx={{
                          display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap',
                          p: 1.5, borderRadius: 2, border: `1px dashed ${ACCENT}50`, bgcolor: `${ACCENT}06`,
                        }}>
                          <AttendIcon sx={{ color: ACCENT, fontSize: 20 }} />
                          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>Mark Session {next}</Typography>
                          <TextField
                            type="date" size="small"
                            value={sessionDates[dateKey] || todayISO()}
                            onChange={ev => setSessionDates(s => ({ ...s, [dateKey]: ev.target.value }))}
                            sx={{ width: 160 }}
                            InputLabelProps={{ shrink: true }}
                          />
                          <Button
                            size="small" variant="contained"
                            disabled={submitting === dateKey}
                            onClick={() => markAttendance(e.id, next)}
                            sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#15968f' } }}>
                            {submitting === dateKey ? 'Submitting…' : 'Submit Attendance'}
                          </Button>
                        </Box>
                      ) : summary.pending > 0 ? (
                        <Alert severity="info" sx={{ py: 0.5 }}>
                          All sessions submitted — {summary.pending} awaiting manager confirmation.
                        </Alert>
                      ) : null}

                      <Box sx={{ mt: 2, borderTop: `1px solid ${theme.palette.divider}`, pt: 1.5 }}>
                        <Button
                          size="small"
                          startIcon={<MaterialsIcon />}
                          endIcon={
                            <ExpandIcon sx={{
                              transform: expandedMaterials[e.program_id] ? 'rotate(180deg)' : 'rotate(0deg)',
                              transition: 'transform 0.2s',
                            }} />
                          }
                          onClick={() => toggleMaterials(e.program_id)}
                          sx={{ color: ACCENT, textTransform: 'none', fontWeight: 600 }}
                        >
                          Learning Materials
                        </Button>
                        <Collapse in={!!expandedMaterials[e.program_id]}>
                          {materialsLoading[e.program_id] ? (
                            <Box sx={{ py: 2, display: 'flex', justifyContent: 'center' }}>
                              <CircularProgress size={22} sx={{ color: ACCENT }} />
                            </Box>
                          ) : (
                            <MaterialsList
                              content={materialsCache[e.program_id]}
                              onPreview={previewMaterial}
                            />
                          )}
                        </Collapse>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          )}

          {suspended.length > 0 && (
            <Box sx={{ mb: 4 }}>
              <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 2 }}>Suspended ({suspended.length})</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {suspended.map(e => (
                  <Box key={e.id} sx={{
                    bgcolor: 'background.paper', borderRadius: 2, p: 2.5,
                    border: `1px solid ${theme.palette.divider}`,
                  }}>
                    <Typography sx={{ fontWeight: 600, fontSize: 14 }}>{e.program_title}</Typography>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.5 }}>
                      Suspended by you or your research manager. Contact your manager to reactivate.
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {cancelled.length > 0 && (
            <Box sx={{ mb: 4 }}>
              <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 2 }}>Cancelled ({cancelled.length})</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {cancelled.map(e => (
                  <Box key={e.id} sx={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    bgcolor: 'background.paper', borderRadius: 2, p: 2.5,
                    border: `1px solid ${theme.palette.divider}`,
                  }}>
                    <Typography sx={{ fontWeight: 600, fontSize: 14 }}>{e.program_title}</Typography>
                    <Button size="small" onClick={() => router.push('/researcher/training/catalog')}
                      sx={{ color: ACCENT }}>
                      Re-enrol
                    </Button>
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {completed.length > 0 && (
            <Box>
              <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 2 }}>Completed ({completed.length})</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {completed.map(e => (
                  <Box key={e.id} sx={{
                    bgcolor: 'background.paper', borderRadius: 2, p: 2.5,
                    border: `1px solid ${theme.palette.divider}`,
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                      <Box>
                        <Typography sx={{ fontWeight: 600, fontSize: 14 }}>{e.program_title}</Typography>
                        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                          Completed {fmtDate(e.completed_at)} · {e.cpd_hours} CPD hrs · All sessions confirmed
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button size="small" startIcon={<MaterialsIcon />}
                          onClick={() => toggleMaterials(e.program_id)}
                          sx={{ color: ACCENT }}>
                          Materials
                        </Button>
                        {e.has_certificate && (
                          <Button size="small" startIcon={<CertIcon />} onClick={() => router.push('/researcher/training/certificates')}
                            sx={{ color: '#10b981' }}>
                            Certificate
                          </Button>
                        )}
                      </Box>
                    </Box>
                    <Collapse in={!!expandedMaterials[e.program_id]}>
                      <Box sx={{ mt: 1.5, pt: 1.5, borderTop: `1px solid ${theme.palette.divider}` }}>
                        <MaterialsList
                          content={materialsCache[e.program_id]}
                          onPreview={previewMaterial}
                          loading={materialsLoading[e.program_id]}
                        />
                      </Box>
                    </Collapse>
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </>
      )}
    </Box>
  );
}

function MaterialsList({ content, onPreview, loading }) {
  if (loading) {
    return (
      <Box sx={{ py: 2, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress size={22} sx={{ color: ACCENT }} />
      </Box>
    );
  }
  if (!content) return null;

  const modules = content.modules || [];
  const programMaterials = content.program_materials || [];
  const hasAny = programMaterials.length > 0 || modules.some(m => (m.materials || []).length > 0);

  if (!hasAny) {
    return (
      <Typography sx={{ fontSize: 12, color: 'text.secondary', py: 1, fontStyle: 'italic' }}>
        No materials uploaded yet for this programme.
      </Typography>
    );
  }

  return (
    <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {programMaterials.length > 0 && (
        <Box>
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', mb: 0.5 }}>GENERAL</Typography>
          {programMaterials.map(mat => (
            <MaterialItem key={mat.id} mat={mat} onPreview={onPreview} canView={content.can_download} />
          ))}
        </Box>
      )}
      {modules.map(mod => (mod.materials || []).length > 0 && (
        <Box key={mod.id}>
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', mb: 0.5 }}>{mod.title.toUpperCase()}</Typography>
          {mod.materials.map(mat => (
            <MaterialItem key={mat.id} mat={mat} onPreview={onPreview} canView={content.can_download} />
          ))}
        </Box>
      ))}
    </Box>
  );
}

function MaterialItem({ mat, onPreview, canView }) {
  return (
    <Box
      sx={{
        display: 'flex', alignItems: 'center', gap: 1, py: 0.5, px: 0.5, borderRadius: 1,
        cursor: canView ? 'pointer' : 'default',
        '&:hover': canView ? { bgcolor: 'action.hover' } : {},
      }}
      onClick={() => canView && onPreview(mat)}
    >
      <FileIcon sx={{ fontSize: 16, color: '#64748b' }} />
      <Typography sx={{ fontSize: 12, flex: 1 }}>{mat.title}</Typography>
      {canView ? (
        <IconButton size="small" onClick={(e) => { e.stopPropagation(); onPreview(mat); }} title="Preview">
          <PreviewIcon sx={{ fontSize: 16, color: ACCENT }} />
        </IconButton>
      ) : (
        <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>Enroll to view</Typography>
      )}
    </Box>
  );
}
