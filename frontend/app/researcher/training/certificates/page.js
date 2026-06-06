'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, CircularProgress, Alert, useTheme, Chip, Button,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import { WorkspacePremium as CertIcon, ContentCopy as CopyIcon, Download as DownloadIcon } from '@mui/icons-material';
import { useAuth } from '../../../../contexts/AuthContext';
import { trainingAPI } from '../../../../lib/api';

const ACCENT = '#1ca7a1';

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

export default function CertificatesPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';

  const [loading, setLoading] = useState(true);
  const [certificates, setCertificates] = useState([]);
  const [cpd, setCpd] = useState(null);
  const [error, setError] = useState('');
  const [viewing, setViewing] = useState(null);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(null);

  useEffect(() => { init(); }, []);

  const init = async () => {
    const u = await fetchUser();
    if (!u) { router.push('/login'); return; }
    try {
      const [certRes, cpdRes] = await Promise.all([
        trainingAPI.myCertificates(),
        trainingAPI.myCPD(),
      ]);
      setCertificates(certRes.data || []);
      setCpd(cpdRes.data);
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to load certificates');
    } finally {
      setLoading(false);
    }
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadPdf = async (cert) => {
    setDownloading(cert.id);
    try {
      const res = await trainingAPI.downloadCertificatePdf(cert.id);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${cert.certificate_number}.pdf`.replace(/\s/g, '_');
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to download certificate PDF');
    } finally {
      setDownloading(null);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress sx={{ color: ACCENT }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Box sx={{ mb: 3 }}>
        <Typography sx={{ fontSize: 24, fontWeight: 700 }}>My Certificates & CPD</Typography>
        <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>Earned certificates and continuing professional development record</Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {cpd && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2, mb: 4 }}>
          <Box sx={{ bgcolor: 'background.paper', borderRadius: 3, p: 2.5, border: `1px solid ${theme.palette.divider}` }}>
            <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 600 }}>Total CPD Hours</Typography>
            <Typography sx={{ fontSize: 28, fontWeight: 800, color: ACCENT }}>{cpd.total_hours}</Typography>
          </Box>
          {Object.entries(cpd.by_type || {}).slice(0, 3).map(([type, hours]) => (
            <Box key={type} sx={{ bgcolor: 'background.paper', borderRadius: 3, p: 2.5, border: `1px solid ${theme.palette.divider}` }}>
              <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 600, textTransform: 'capitalize' }}>{type.replace('_', ' ')}</Typography>
              <Typography sx={{ fontSize: 22, fontWeight: 700 }}>{hours} hrs</Typography>
            </Box>
          ))}
        </Box>
      )}

      {certificates.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6, bgcolor: 'background.paper', borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
          <CertIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
          <Typography sx={{ color: 'text.secondary' }}>No certificates yet. Complete a training programme to earn one.</Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
          {certificates.map(c => (
            <Box key={c.id} onClick={() => setViewing(c)} sx={{
              bgcolor: 'background.paper', borderRadius: 3, p: 3, cursor: 'pointer',
              border: `2px solid ${ACCENT}30`,
              background: dark ? 'background.paper' : `linear-gradient(135deg, ${ACCENT}08 0%, #fff 60%)`,
              transition: 'border-color 0.18s',
              '&:hover': { borderColor: ACCENT },
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <CertIcon sx={{ color: '#f59e0b', fontSize: 28 }} />
                <Typography sx={{ fontWeight: 800, fontSize: 13, color: ACCENT }}>{c.certificate_number}</Typography>
              </Box>
              <Typography sx={{ fontWeight: 700, fontSize: 15, mb: 0.5 }}>{c.program_title}</Typography>
              <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 1 }}>{c.recipient_name}</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                <Chip label={fmtDate(c.issue_date)} size="small" sx={{ fontSize: 10 }} />
                <Chip label={`${c.cpd_hours_awarded} CPD hrs`} size="small" sx={{ fontSize: 10, color: ACCENT, bgcolor: `${ACCENT}12` }} />
                <Button
                  size="small" startIcon={<DownloadIcon />}
                  onClick={ev => { ev.stopPropagation(); downloadPdf(c); }}
                  disabled={downloading === c.id}
                  sx={{ fontSize: 10, py: 0, minWidth: 0, color: ACCENT }}
                >
                  PDF
                </Button>
              </Box>
            </Box>
          ))}
        </Box>
      )}

      <Dialog open={!!viewing} onClose={() => setViewing(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ textAlign: 'center' }}>
          <CertIcon sx={{ fontSize: 40, color: '#f59e0b', display: 'block', mx: 'auto', mb: 1 }} />
          Certificate of Completion
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center' }}>
          <Typography sx={{ fontSize: 18, fontWeight: 700, mb: 1 }}>{viewing?.recipient_name}</Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 2 }}>has successfully completed</Typography>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: ACCENT, mb: 2 }}>{viewing?.program_title}</Typography>
          <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 1 }}>Issued: {fmtDate(viewing?.issue_date)}</Typography>
          <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 2 }}>CPD Hours: {viewing?.cpd_hours_awarded}</Typography>
          <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
            <Typography sx={{ fontSize: 11, color: 'text.disabled', mb: 0.5 }}>Certificate Number</Typography>
            <Typography sx={{ fontWeight: 700, fontSize: 13 }}>{viewing?.certificate_number}</Typography>
            <Typography sx={{ fontSize: 11, color: 'text.disabled', mt: 1, mb: 0.5 }}>Verification Code</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
              <Typography sx={{ fontWeight: 600, fontSize: 12, fontFamily: 'monospace' }}>{viewing?.verification_code}</Typography>
              <Button size="small" startIcon={<CopyIcon />} onClick={() => copyCode(viewing?.verification_code)}>
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            startIcon={<DownloadIcon />}
            disabled={downloading === viewing?.id}
            onClick={() => viewing && downloadPdf(viewing)}
            sx={{ color: ACCENT }}
          >
            {downloading === viewing?.id ? 'Generating…' : 'Download PDF'}
          </Button>
          <Button onClick={() => setViewing(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
