'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, CircularProgress, Alert, Button, IconButton,
} from '@mui/material';
import { ArrowBack as BackIcon, OpenInNew as OpenIcon } from '@mui/icons-material';
import { trainingAPI } from '../../lib/api';

const ACCENT = '#16a699';

const PREVIEWABLE = {
  pdf: 'application/pdf',
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  text: ['text/plain', 'text/csv'],
};

function isPreviewable(mime, filename) {
  const m = (mime || '').toLowerCase();
  const ext = (filename || '').split('.').pop()?.toLowerCase();
  if (m === 'application/pdf' || ext === 'pdf') return 'pdf';
  if (PREVIEWABLE.image.some(t => m.startsWith(t)) || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image';
  if (PREVIEWABLE.text.includes(m) || ['txt', 'csv'].includes(ext)) return 'text';
  return null;
}

export default function MaterialPreviewView({ materialId, backHref, backLabel = 'Back' }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [blobUrl, setBlobUrl] = useState(null);
  const [meta, setMeta] = useState(null);
  const [textContent, setTextContent] = useState('');
  const blobRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await trainingAPI.previewMaterial(materialId);
        if (cancelled) return;
        const blob = res.data;
        const disposition = res.headers['content-disposition'] || '';
        const nameMatch = disposition.match(/filename="?([^"]+)"?/i);
        const filename = nameMatch?.[1] || 'material';
        const mime = blob.type || res.headers['content-type'] || '';
        const kind = isPreviewable(mime, filename);
        const url = URL.createObjectURL(blob);
        blobRef.current = url;
        setBlobUrl(url);
        setMeta({ filename, mime, kind });

        if (kind === 'text') {
          const text = await blob.text();
          if (!cancelled) setTextContent(text);
        }
      } catch (e) {
        if (!cancelled) setError(e.response?.data?.detail || 'Failed to load material');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      if (blobRef.current) {
        URL.revokeObjectURL(blobRef.current);
        blobRef.current = null;
      }
    };
  }, [materialId]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress sx={{ color: ACCENT }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        {backHref && (
          <Button size="small" startIcon={<BackIcon />} onClick={() => router.push(backHref)} sx={{ mb: 2, color: 'text.secondary' }}>
            {backLabel}
          </Button>
        )}
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  const { filename, kind } = meta || {};

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)', p: { xs: 1, md: 2 } }}>
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, px: 1,
        borderBottom: '1px solid', borderColor: 'divider', pb: 1,
      }}>
        {backHref && (
          <IconButton size="small" onClick={() => router.push(backHref)}>
            <BackIcon fontSize="small" />
          </IconButton>
        )}
        <Typography sx={{ fontWeight: 700, fontSize: 15, flex: 1 }} noWrap>{filename}</Typography>
        {blobUrl && (
          <IconButton size="small" href={blobUrl} target="_blank" rel="noopener noreferrer" title="Open in new tab">
            <OpenIcon fontSize="small" />
          </IconButton>
        )}
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, bgcolor: 'background.paper', borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
        {kind === 'pdf' && blobUrl && (
          <iframe
            src={blobUrl}
            title={filename}
            style={{ width: '100%', height: '100%', border: 'none' }}
          />
        )}
        {kind === 'image' && blobUrl && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', p: 2 }}>
            <img src={blobUrl} alt={filename} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          </Box>
        )}
        {kind === 'text' && (
          <Box component="pre" sx={{
            m: 0, p: 2, height: '100%', overflow: 'auto', fontSize: 13,
            fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}>
            {textContent}
          </Box>
        )}
        {!kind && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', p: 4, textAlign: 'center' }}>
            <Typography sx={{ color: 'text.secondary', mb: 2 }}>
              In-browser preview is not available for this file type.
            </Typography>
            <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>{filename}</Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
