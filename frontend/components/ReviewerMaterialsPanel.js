'use client';

import { useState } from 'react';
import {
  Box, Typography, Paper, Divider, IconButton, Tooltip, CircularProgress,
  Dialog, DialogTitle, DialogContent, Alert,
} from '@mui/material';
import {
  Description as DocIcon,
  Visibility as PreviewIcon,
  Download as DownloadIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useLanguage } from '../contexts/LanguageContext';

function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  return `${Math.round(bytes / 1024)} KB`;
}

function TextBlock({ label, value, accent }) {
  if (!value || !String(value).trim()) return null;
  return (
    <Box sx={{ mb: 2 }}>
      <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: 14, lineHeight: 1.7 }}>{value}</Typography>
    </Box>
  );
}

function DocRow({ doc, assignmentId, accent, dark, t }) {
  const [previewing, setPreviewing] = useState(false);
  const [blobUrl, setBlobUrl] = useState(null);
  const [loadingBlob, setLoadingBlob] = useState(false);

  const filename = doc.original_filename || 'Document';
  const isPdf = doc.mime_type === 'application/pdf' || filename.endsWith('.pdf');
  const isImage = doc.mime_type?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(filename);
  const docUrl = `/api/reviewer/assignments/${assignmentId}/documents/${doc.id}`;
  const docTypeLabel = (doc.label || doc.document_type || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const fetchWithAuth = async (inline = false) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const url = inline ? `${docUrl}?inline=1` : docUrl;
    const resp = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return resp.blob();
  };

  const openPreview = async () => {
    if (blobUrl) {
      setPreviewing(true);
      return;
    }
    setLoadingBlob(true);
    try {
      const blob = await fetchWithAuth(true);
      setBlobUrl(URL.createObjectURL(blob));
      setPreviewing(true);
    } catch (e) {
      console.error('Preview failed', e);
    } finally {
      setLoadingBlob(false);
    }
  };

  const download = async () => {
    try {
      const blob = await fetchWithAuth(false);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Download failed', e);
    }
  };

  return (
    <>
      <Box
        sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          px: 2, py: 1.5, borderRadius: 2, mb: 1,
          border: '1px solid', borderColor: 'divider',
          '&:hover': {
            borderColor: `${accent}66`,
            bgcolor: dark ? 'rgba(22,166,153,0.05)' : 'rgba(22,166,153,0.03)',
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
          <Box
            sx={{
              width: 36, height: 36, borderRadius: 1.5, bgcolor: `${accent}18`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}
          >
            <DocIcon sx={{ fontSize: 18, color: accent }} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 600 }} noWrap>{filename}</Typography>
            <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
              {docTypeLabel}
              {doc.file_size_bytes ? ` · ${formatFileSize(doc.file_size_bytes)}` : ''}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
          {(isPdf || isImage) && (
            <Tooltip title={t('reviewer.detail.preview')}>
              <IconButton size="small" onClick={openPreview} disabled={loadingBlob}
                sx={{ color: accent, '&:hover': { bgcolor: `${accent}18` } }}>
                {loadingBlob
                  ? <CircularProgress size={13} sx={{ color: accent }} />
                  : <PreviewIcon sx={{ fontSize: 17 }} />}
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title={t('reviewer.detail.download')}>
            <IconButton size="small" onClick={download}
              sx={{ color: accent, '&:hover': { bgcolor: `${accent}18` } }}>
              <DownloadIcon sx={{ fontSize: 17 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Dialog open={previewing} onClose={() => setPreviewing(false)} maxWidth="lg" fullWidth
        PaperProps={{ sx: { borderRadius: 3, height: '90vh' } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 15 }}>{filename}</Typography>
          <IconButton size="small" onClick={() => setPreviewing(false)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0, overflow: 'hidden' }}>
          {isPdf && blobUrl && (
            <iframe src={blobUrl} title={filename} style={{ width: '100%', height: '100%', border: 'none' }} />
          )}
          {isImage && blobUrl && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 2, height: '100%' }}>
              <img src={blobUrl} alt={filename} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function DocumentsList({ documents, assignmentId, accent, dark, t }) {
  if (!documents?.length) {
    return (
      <Typography sx={{ fontSize: 13, color: 'text.secondary', fontStyle: 'italic' }}>
        {t('reviewer.detail.noDocuments')}
      </Typography>
    );
  }
  return documents.map((doc) => (
    <DocRow
      key={doc.id}
      doc={doc}
      assignmentId={assignmentId}
      accent={accent}
      dark={dark}
      t={t}
    />
  ));
}

export default function ReviewerMaterialsPanel({
  assignment,
  entity,
  accent,
  dark,
}) {
  const { t } = useLanguage();
  const reviewType = assignment?.review_type;

  if (!entity) {
    return (
      <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Typography sx={{ fontWeight: 700, mb: 2, fontSize: 16 }}>
          {t('reviewer.detail.materialsTitle')}
        </Typography>
        <Alert severity="warning">{t('reviewer.detail.materialsUnavailable')}</Alert>
      </Paper>
    );
  }

  const hasProposalContent = (entity.sections?.length > 0) || (entity.documents?.length > 0)
    || entity.opportunity_title || entity.lead_pi_name;
  const hasProjectContent = [
    entity.project_abstract, entity.description, entity.background_rationale,
    entity.problem_statement, entity.research_methodology, entity.research_design,
    entity.target_population, entity.research_objectives, entity.research_keywords,
    entity.research_area, entity.department, entity.lead_institution, entity.pi_full_name,
  ].some((v) => v && String(v).trim()) || (entity.documents?.length > 0);
  const hasEthicsContent = [
    entity.lay_summary, entity.methodology, entity.risk_assessment, entity.data_handling,
    entity.project_title, entity.submitted_by_name,
  ].some((v) => v && String(v).trim()) || (entity.documents?.length > 0);

  return (
    <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
      <Typography sx={{ fontWeight: 700, mb: 2, fontSize: 16 }}>
        {t('reviewer.detail.materialsTitle')}
      </Typography>

      {entity.status && (
        <Typography sx={{ fontSize: 14, mb: 2 }}>
          <strong>{t('reviewer.detail.statusLabel')}</strong> {entity.status}
        </Typography>
      )}

      {reviewType === 'proposal' && !hasProposalContent && (
        <Alert severity="info" sx={{ mb: 2 }}>{t('reviewer.detail.noContentYet')}</Alert>
      )}
      {reviewType === 'project' && !hasProjectContent && (
        <Alert severity="info" sx={{ mb: 2 }}>{t('reviewer.detail.noContentYet')}</Alert>
      )}
      {reviewType === 'ethics' && !hasEthicsContent && (
        <Alert severity="info" sx={{ mb: 2 }}>{t('reviewer.detail.noContentYet')}</Alert>
      )}

      {reviewType === 'proposal' && (
        <>
          {entity.opportunity_title && (
            <TextBlock label={t('reviewer.detail.opportunity')} value={entity.opportunity_title} />
          )}
          {entity.lead_pi_name && (
            <TextBlock label={t('reviewer.detail.leadPi')} value={entity.lead_pi_name} />
          )}
          {entity.sections?.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography sx={{ fontWeight: 600, fontSize: 14, mb: 2 }}>
                {t('reviewer.detail.proposalSections')}
              </Typography>
              {entity.sections.map((section, idx) => (
                <Box key={section.id} sx={{ mb: 3 }}>
                  <Typography sx={{ fontWeight: 600, fontSize: 14, mb: 1, color: accent }}>
                    {section.title}
                    {section.word_count ? (
                      <Typography component="span" sx={{ fontSize: 12, color: 'text.secondary', ml: 1 }}>
                        ({section.word_count} {t('reviewer.detail.words')})
                      </Typography>
                    ) : null}
                  </Typography>
                  {section.content_html ? (
                    <Box
                      sx={{
                        fontSize: 14, lineHeight: 1.7,
                        '& p': { mb: 1 },
                        '& ul, & ol': { pl: 2, mb: 1 },
                      }}
                      dangerouslySetInnerHTML={{ __html: section.content_html }}
                    />
                  ) : (
                    <Typography sx={{ fontSize: 13, color: 'text.secondary', fontStyle: 'italic' }}>
                      {t('reviewer.detail.emptySection')}
                    </Typography>
                  )}
                  {idx < entity.sections.length - 1 && <Divider sx={{ mt: 2 }} />}
                </Box>
              ))}
            </Box>
          )}
          <Typography sx={{ fontWeight: 600, fontSize: 14, mb: 1 }}>
            {t('reviewer.detail.documents')}
          </Typography>
          <DocumentsList
            documents={entity.documents}
            assignmentId={assignment.id}
            accent={accent}
            dark={dark}
            t={t}
          />
        </>
      )}

      {reviewType === 'project' && (
        <>
          <TextBlock label={t('reviewer.detail.fields.abstract')} value={entity.project_abstract || entity.description} />
          <TextBlock label={t('reviewer.detail.fields.background')} value={entity.background_rationale} />
          <TextBlock label={t('reviewer.detail.fields.problem')} value={entity.problem_statement} />
          <TextBlock label={t('reviewer.detail.fields.methodology')} value={entity.research_methodology} />
          <TextBlock label={t('reviewer.detail.fields.design')} value={entity.research_design} />
          <TextBlock label={t('reviewer.detail.fields.population')} value={entity.target_population} />
          <TextBlock label={t('reviewer.detail.fields.objectives')} value={entity.research_objectives} />
          <TextBlock label={t('reviewer.detail.fields.keywords')} value={entity.research_keywords} />
          <TextBlock label={t('reviewer.detail.fields.researchArea')} value={entity.research_area} />
          <TextBlock label={t('reviewer.detail.fields.department')} value={entity.department} />
          <TextBlock label={t('reviewer.detail.fields.institution')} value={entity.lead_institution} />
          <TextBlock label={t('reviewer.detail.fields.pi')} value={entity.pi_full_name} />
          {(entity.involves_human_subjects || entity.involves_animal_subjects
            || entity.involves_sensitive_data || entity.is_clinical_trial) && (
            <Box sx={{ mb: 2 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>
                {t('reviewer.detail.fields.flags')}
              </Typography>
              <Typography sx={{ fontSize: 14 }}>
                {[
                  entity.involves_human_subjects && t('reviewer.detail.flags.humanSubjects'),
                  entity.involves_animal_subjects && t('reviewer.detail.flags.animalSubjects'),
                  entity.involves_sensitive_data && t('reviewer.detail.flags.sensitiveData'),
                  entity.is_clinical_trial && t('reviewer.detail.flags.clinicalTrial'),
                ].filter(Boolean).join(' · ')}
              </Typography>
            </Box>
          )}
          <Divider sx={{ my: 2 }} />
          <Typography sx={{ fontWeight: 600, fontSize: 14, mb: 1 }}>
            {t('reviewer.detail.documents')}
          </Typography>
          <DocumentsList
            documents={entity.documents}
            assignmentId={assignment.id}
            accent={accent}
            dark={dark}
            t={t}
          />
        </>
      )}

      {reviewType === 'ethics' && (
        <>
          {entity.project_title && (
            <TextBlock label={t('reviewer.detail.linkedProject')} value={entity.project_title} />
          )}
          {entity.submitted_by_name && (
            <TextBlock label={t('reviewer.detail.submittedBy')} value={entity.submitted_by_name} />
          )}
          <TextBlock label={t('reviewer.detail.laySummary')} value={entity.lay_summary} />
          <TextBlock label={t('reviewer.detail.methodology')} value={entity.methodology} />
          <TextBlock label={t('reviewer.detail.riskAssessment')} value={entity.risk_assessment} />
          <TextBlock label={t('reviewer.detail.dataHandling')} value={entity.data_handling} />
          <Divider sx={{ my: 2 }} />
          <Typography sx={{ fontWeight: 600, fontSize: 14, mb: 1 }}>
            {t('reviewer.detail.documents')}
          </Typography>
          <DocumentsList
            documents={entity.documents}
            assignmentId={assignment.id}
            accent={accent}
            dark={dark}
            t={t}
          />
        </>
      )}
    </Paper>
  );
}
