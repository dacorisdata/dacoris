'use client';

import { useMemo, useState } from 'react';
import {
  Box,
  Chip,
  Divider,
  Paper,
  Typography,
  useTheme,
} from '@mui/material';
import {
  CheckCircle as CompleteIcon,
  RadioButtonUnchecked as PendingIcon,
  PlayCircle as ActiveIcon,
  Warning as OverdueIcon,
  Lock as BlockedIcon,
} from '@mui/icons-material';

const ACCENT = '#1ca7a1';

const STATUS_COLOR = {
  Complete: 'success',
  Completed: 'success',
  'In Progress': 'info',
  'Not Started': 'default',
  Overdue: 'error',
  Blocked: 'warning',
};

const STAGE_GATES = {
  2: 'gate_a_coursework',
  3: 'gate_b_supervisor',
  4: 'gate_c_proposal',
  5: 'gate_c_proposal',
  6: 'gate_d_research_cleared',
  7: 'gate_f_thesis_ready',
  9: 'gate_g_defense',
  10: 'gate_h_graduation',
};

function resolveStatus(stage) {
  return stage.orchestration_status || stage.excel_status || 'Not Started';
}

function statusMeta(status, isOverdue) {
  if (isOverdue || status === 'Overdue') {
    return { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', icon: OverdueIcon, label: 'Overdue' };
  }
  const normalized = (status || '').toLowerCase();
  if (normalized.includes('complete')) {
    return { color: '#16a34a', bg: 'rgba(22,163,74,0.12)', icon: CompleteIcon, label: status };
  }
  if (normalized.includes('progress')) {
    return { color: ACCENT, bg: `${ACCENT}18`, icon: ActiveIcon, label: status };
  }
  if (normalized.includes('block')) {
    return { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: BlockedIcon, label: status };
  }
  return { color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', icon: PendingIcon, label: status || 'Not Started' };
}

function formatDate(value) {
  if (!value) return null;
  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return value;
  }
}

function displayStageName(name) {
  if (!name) return '';
  return name.replace(/^Stage\s+\d+\s*:?\s*/i, '').trim();
}

export function StageGateBadge({ label, passed, detail }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 0.75, gap: 1 }}>
      <Typography sx={{ fontSize: 13 }}>{label}</Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {detail && <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{detail}</Typography>}
        <Chip size="small" label={passed ? 'Passed' : 'Pending'} color={passed ? 'success' : 'default'} />
      </Box>
    </Box>
  );
}

export function JourneyStageChip({ status }) {
  const color = STATUS_COLOR[status] || 'default';
  return <Chip size="small" label={status || 'Unknown'} color={color} variant={color === 'default' ? 'outlined' : 'filled'} />;
}

function StageDetailPanel({ stage, gates }) {
  const status = resolveStatus(stage);
  const meta = statusMeta(status, stage.is_overdue);
  const gateKey = STAGE_GATES[stage.stage_no];
  const gate = gateKey ? gates?.[gateKey] : null;

  const detailRows = [
    { label: 'SIS status', value: stage.excel_status },
    { label: 'Orchestration status', value: stage.orchestration_status },
    { label: 'Date recorded', value: formatDate(stage.excel_date) },
    { label: 'Units completed', value: stage.extra?.units_done },
    { label: 'Publications', value: stage.extra?.pub_count != null ? String(stage.extra.pub_count) : null },
  ].filter((row) => row.value);

  return (
    <Paper
      elevation={0}
      sx={{
        mt: 3,
        p: { xs: 2, md: 3 },
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: { xs: 18, md: 20 } }}>
          {displayStageName(stage.stage_name)}
        </Typography>
        <Chip
          icon={<meta.icon sx={{ fontSize: 16 }} />}
          label={meta.label}
          sx={{
            bgcolor: meta.bg,
            color: meta.color,
            fontWeight: 600,
            '& .MuiChip-icon': { color: meta.color },
          }}
        />
      </Box>

      {stage.is_overdue && (
        <Typography sx={{ fontSize: 13, color: 'error.main', mb: 2 }}>
          This stage is flagged as overdue in the postgraduate workflow.
        </Typography>
      )}

      {detailRows.length > 0 && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5, mb: gate ? 2 : 0 }}>
          {detailRows.map((row) => (
            <Box key={row.label}>
              <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {row.label}
              </Typography>
              <Typography sx={{ fontSize: 14, fontWeight: 500, mt: 0.25 }}>{row.value}</Typography>
            </Box>
          ))}
        </Box>
      )}

      {gate && (
        <>
          <Divider sx={{ my: 2 }} />
          <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 1 }}>Stage gate</Typography>
          <StageGateBadge
            label={gateKey.replace(/_/g, ' ').replace(/^gate /, 'Gate ').toUpperCase()}
            passed={gate.passed}
            detail={
              gate.completed_units != null
                ? `${gate.completed_units}/${gate.required_units || 0} units`
                : gate.lead_supervisor || gate.status || gate.outcome || null
            }
          />
          {gate.ethics_status && (
            <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.5 }}>
              Ethics: {gate.ethics_status}
            </Typography>
          )}
          {gate.finance_cleared != null && (
            <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.5 }}>
              Finance cleared: {gate.finance_cleared ? 'Yes' : 'No'}
            </Typography>
          )}
        </>
      )}

      {!detailRows.length && !gate && (
        <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
          No additional details recorded for this stage yet.
        </Typography>
      )}
    </Paper>
  );
}

export function JourneyCanvas({ stages = [], gates = {}, showGateSummary = true }) {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';

  const sortedStages = useMemo(
    () => [...stages].sort((a, b) => a.stage_no - b.stage_no),
    [stages],
  );

  const defaultStage = useMemo(() => {
    const inProgress = sortedStages.find((s) => resolveStatus(s).toLowerCase().includes('progress'));
    if (inProgress) return inProgress.stage_no;
    const lastComplete = [...sortedStages].reverse().find((s) => resolveStatus(s).toLowerCase().includes('complete'));
    return lastComplete?.stage_no ?? sortedStages[0]?.stage_no ?? null;
  }, [sortedStages]);

  const [selectedStageNo, setSelectedStageNo] = useState(null);
  const activeStageNo = selectedStageNo ?? defaultStage;
  const selectedStage = sortedStages.find((s) => s.stage_no === activeStageNo);

  if (!sortedStages.length) {
    return (
      <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>
        No journey stages available yet.
      </Typography>
    );
  }

  return (
    <Box>
      {showGateSummary && (
        <Typography sx={{ fontWeight: 600, fontSize: 15, mb: 2 }}>Academic Journey</Typography>
      )}

      <Box sx={{ width: '100%', overflowX: 'auto', pb: 1 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            width: '100%',
            minWidth: { xs: 720, md: '100%' },
            py: 1,
          }}
        >
          {sortedStages.map((stage, index) => {
            const status = resolveStatus(stage);
            const meta = statusMeta(status, stage.is_overdue);
            const isSelected = stage.stage_no === activeStageNo;
            const isComplete = status.toLowerCase().includes('complete');
            const Icon = meta.icon;
            const isLast = index === sortedStages.length - 1;
            const prevComplete = index > 0 && resolveStatus(sortedStages[index - 1]).toLowerCase().includes('complete');

            return (
              <Box
                key={stage.stage_no}
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  flex: isLast ? '0 0 auto' : '1 1 0',
                  minWidth: 0,
                }}
              >
                {index > 0 && (
                  <Box
                    sx={{
                      flex: 1,
                      height: 3,
                      mt: '22px',
                      borderRadius: 2,
                      minWidth: 8,
                      bgcolor: prevComplete || isComplete
                        ? '#16a34a'
                        : dark
                          ? 'rgba(255,255,255,0.12)'
                          : 'rgba(0,0,0,0.1)',
                    }}
                  />
                )}
                <Box
                  onClick={() => setSelectedStageNo(stage.stage_no)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedStageNo(stage.stage_no);
                    }
                  }}
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    flex: '1 1 auto',
                    minWidth: 72,
                    maxWidth: 120,
                    px: 0.5,
                    cursor: 'pointer',
                    userSelect: 'none',
                    outline: 'none',
                    '&:focus-visible .journey-node': {
                      boxShadow: `0 0 0 3px ${ACCENT}55`,
                    },
                  }}
                >
                  <Box
                    className="journey-node"
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: isSelected ? meta.color : meta.bg,
                      color: isSelected ? '#fff' : meta.color,
                      border: '2px solid',
                      borderColor: isSelected ? meta.color : `${meta.color}55`,
                      transition: 'all 0.2s ease',
                      transform: isSelected ? 'scale(1.08)' : 'scale(1)',
                      boxShadow: isSelected ? `0 4px 14px ${meta.color}40` : 'none',
                      '&:hover': {
                        transform: 'scale(1.06)',
                        boxShadow: `0 4px 12px ${meta.color}35`,
                      },
                    }}
                  >
                    {isComplete ? (
                      <CompleteIcon sx={{ fontSize: 24 }} />
                    ) : (
                      <Icon sx={{ fontSize: 22 }} />
                    )}
                  </Box>

                  <Typography
                    sx={{
                      mt: 1,
                      fontSize: 11,
                      fontWeight: isSelected ? 650 : 500,
                      color: isSelected ? 'text.primary' : 'text.secondary',
                      textAlign: 'center',
                      lineHeight: 1.35,
                      px: 0.5,
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {displayStageName(stage.stage_name)}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>

      <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.5 }}>
        Click any stage to view details
      </Typography>

      {selectedStage && (
        <Box sx={{ width: '100%' }}>
          <StageDetailPanel stage={selectedStage} gates={gates} />
        </Box>
      )}

      {showGateSummary && gates && Object.keys(gates).length > 0 && (
        <Box sx={{ mt: 3, p: 2, borderRadius: 2, border: '1px dashed', borderColor: 'divider' }}>
          <Typography sx={{ fontWeight: 600, mb: 1 }}>All Stage Gates</Typography>
          <StageGateBadge label="Gate A — Coursework" passed={gates.gate_a_coursework?.passed} detail={`${gates.gate_a_coursework?.completed_units || 0}/${gates.gate_a_coursework?.required_units || 0} units`} />
          <StageGateBadge label="Gate B — Supervisor" passed={gates.gate_b_supervisor?.passed} />
          <StageGateBadge label="Gate C — Proposal" passed={gates.gate_c_proposal?.passed} />
          <StageGateBadge label="Gate D — Ethics/DMP" passed={gates.gate_d_research_cleared?.passed} />
          <StageGateBadge label="Gate H — Graduation" passed={gates.gate_h_graduation?.passed} />
        </Box>
      )}
    </Box>
  );
}
