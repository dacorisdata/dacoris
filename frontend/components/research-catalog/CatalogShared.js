'use client';

import Link from 'next/link';
import { Box, Typography, Chip, alpha } from '@mui/material';
import { COLORS } from '@/contexts/ThemeContext';

export const TL = COLORS.teal;

export function EntityLink({ href, children, sx = {} }) {
  return (
    <Typography
      component={Link}
      href={href}
      sx={{
        color: TL[600],
        textDecoration: 'none',
        fontWeight: 600,
        '&:hover': { textDecoration: 'underline', color: TL[700] },
        ...sx,
      }}
    >
      {children}
    </Typography>
  );
}

export function MetaChip({ label, color = TL[600] }) {
  return (
    <Chip
      label={label}
      size="small"
      sx={{ fontSize: 10, height: 20, fontWeight: 600, bgcolor: alpha(color, 0.1), color }}
    />
  );
}

export function ScholarRow({ work, onNavigate }) {
  const authors = work.authors?.slice(0, 4) || [];
  const more = (work.authors?.length || 0) - authors.length;

  return (
    <Box
      sx={{
        py: 2.5,
        px: { xs: 2, md: 3 },
        borderBottom: '1px solid',
        borderColor: 'divider',
        '&:hover': { bgcolor: alpha(TL[600], 0.03) },
        cursor: 'pointer',
      }}
      onClick={() => onNavigate(`/research-output/work/${work.id}`)}
    >
      <Typography sx={{ fontSize: 16, fontWeight: 700, color: TL[700], mb: 0.5, lineHeight: 1.35 }}>
        {work.title}
      </Typography>
      {authors.length > 0 && (
        <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 0.5 }}>
          {authors.map((a, i) => (
            <span key={a.id || i}>
              {a.id ? (
                <EntityLink
                  href={`/research-output/researcher/${a.id}`}
                  sx={{ fontSize: 13, fontWeight: 500 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {a.name}
                </EntityLink>
              ) : (
                a.name
              )}
              {i < authors.length - 1 ? ', ' : ''}
            </span>
          ))}
          {more > 0 && <span> et al.</span>}
        </Typography>
      )}
      <Typography sx={{ fontSize: 12, color: 'text.disabled', fontStyle: 'italic', mb: 1 }}>
        {[work.venue_name, work.publication_year].filter(Boolean).join(' · ')}
        {work.doi && ` · DOI: ${work.doi}`}
      </Typography>
      {work.abstract && (
        <Typography sx={{ fontSize: 13, color: 'text.secondary', lineHeight: 1.6, mb: 1 }}>
          {work.abstract.length > 280 ? `${work.abstract.slice(0, 280)}…` : work.abstract}
        </Typography>
      )}
      <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', alignItems: 'center' }}>
        {work.status && work.status !== 'published' && (
          <MetaChip label={work.status.replace(/_/g, ' ')} color={COLORS.amber[700]} />
        )}
        {work.is_open_access && <MetaChip label="Open Access" color={COLORS.green[600]} />}
        {work.primary_topic && <MetaChip label={work.primary_topic} />}
        {work.cited_by_count > 0 && <MetaChip label={`${work.cited_by_count} citations`} color={COLORS.amber[600]} />}
        {work.source === 'output' && <MetaChip label="Project output" color={COLORS.blue[600]} />}
        {work.source === 'manuscript' && <MetaChip label="Manuscript" color={COLORS.purple?.[600] || '#7c3aed'} />}
        {work.source === 'publication' && <MetaChip label="Publication library" color="#6366f1" />}
        {work.project_title && (
          <EntityLink
            href={`/research-output/project/${work.project_id}`}
            sx={{ fontSize: 11 }}
            onClick={(e) => e.stopPropagation()}
          >
            Project: {work.project_title}
          </EntityLink>
        )}
      </Box>
    </Box>
  );
}

export function ListRow({ title, subtitle, meta, chips = [], href, onClick }) {
  const inner = (
    <Box
      sx={{
        py: 2, px: { xs: 2, md: 3 },
        borderBottom: '1px solid', borderColor: 'divider',
        display: 'flex', alignItems: 'flex-start', gap: 2,
        '&:hover': { bgcolor: alpha(TL[600], 0.03) },
        cursor: href || onClick ? 'pointer' : 'default',
      }}
      onClick={onClick}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 15, fontWeight: 700, color: 'text.primary', mb: 0.3 }}>{title}</Typography>
        {subtitle && <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{subtitle}</Typography>}
        {meta && <Typography sx={{ fontSize: 12, color: 'text.disabled', mt: 0.3 }}>{meta}</Typography>}
        {chips.length > 0 && (
          <Box sx={{ display: 'flex', gap: 0.75, mt: 1, flexWrap: 'wrap' }}>
            {chips.map((c) => <MetaChip key={c} label={c} />)}
          </Box>
        )}
      </Box>
    </Box>
  );
  if (href) {
    return <Link href={href} style={{ textDecoration: 'none', color: 'inherit' }}>{inner}</Link>;
  }
  return inner;
}

export function DetailSection({ title, icon: Icon, children }) {
  return (
    <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 3, p: 3, mb: 3 }}>
      <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', mb: 2, textTransform: 'uppercase', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
        {Icon && <Icon sx={{ fontSize: 16 }} />}
        {title}
      </Typography>
      {children}
    </Box>
  );
}
