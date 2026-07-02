'use client';

export const DELAY_CATEGORIES = [
  { value: 'Coursework incomplete', description: 'Units unfinished or marks missing from the record.' },
  { value: 'Financial blockage', description: 'Fees or finance hold blocking progress or submission.' },
  { value: 'Supervisor support gap', description: 'Slow feedback, unavailable supervisor, or expertise mismatch.' },
  { value: 'Proposal-writing challenge', description: 'Research question, methodology, or literature framing issues.' },
  { value: 'Ethics / permit delay', description: 'Ethics approval or research permit still pending.' },
  { value: 'Data access / fieldwork challenge', description: 'Cannot obtain data or access field sites.' },
  { value: 'Analysis gap', description: 'Needs statistical, qualitative, or computational support.' },
  { value: 'Thesis-writing challenge', description: 'Difficulty completing thesis structure or chapters.' },
  { value: 'Publication delay', description: 'Publication requirement not yet met.' },
  { value: 'Administrative blockage', description: 'Missing forms, scheduling, or clearance steps.' },
];

export const RISK_LEVELS = [
  { value: 'low', label: 'Low', description: 'Minor delay; student likely to recover with routine supervision.' },
  { value: 'medium', label: 'Medium', description: 'Moderate delay; targeted support recommended.' },
  { value: 'high', label: 'High', description: 'Significant delay; departmental attention likely needed.' },
  { value: 'critical', label: 'Critical', description: 'Severe delay; immediate institutional escalation recommended.' },
];

export function isHtmlEmpty(html) {
  if (!html) return true;
  const text = html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
  return !text;
}

export function displayStage(name) {
  if (!name) return '—';
  return name.replace(/^Stage\s+\d+\s*:?\s*/i, '').trim();
}

export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
