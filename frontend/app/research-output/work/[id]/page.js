'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box, Typography, Button, CircularProgress, Alert, Chip, Paper, Grid, Divider, Card, CardContent,
  Table, TableBody, TableCell, TableRow, Link as MuiLink,
} from '@mui/material';
import {
  ArrowBack as BackIcon, CalendarToday as CalendarIcon, OpenInNew as OpenIcon,
  Business as BusinessIcon, People as PeopleIcon, AttachMoney as MoneyIcon,
  LockOpen as OpenAccessIcon, FormatQuote as CitationIcon, School as SchoolIcon,
  Info as InfoIcon, Public as PublicIcon,
} from '@mui/icons-material';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const ACCENT = '#8b5cf6';

export default function WorkDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [work, setWork] = useState(null);

  useEffect(() => {
    loadWork();
  }, [params.id]);

  const loadWork = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/public/works/${params.id}`);
      setWork(res.data);
    } catch (e) {
      setError('Failed to load work details');
    } finally {
      setLoading(false);
    }
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress sx={{ color: ACCENT }} />
      </Box>
    );
  }

  if (error || !work) {
    return (
      <Box sx={{ p: 4, maxWidth: 1200, mx: 'auto' }}>
        <Alert severity="error" sx={{ mb: 3 }}>{error || 'Work not found'}</Alert>
        <Button startIcon={<BackIcon />} onClick={() => router.push('/research-output')}>
          Back to Research Output
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4 }}>
      <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, md: 4 } }}>
        {/* Back Button */}
        <Button
          startIcon={<BackIcon />}
          onClick={() => router.push('/research-output')}
          sx={{ mb: 3, textTransform: 'none', color: 'text.secondary' }}
        >
          Back to Research Output
        </Button>

        {/* Main Content */}
        <Paper elevation={0} sx={{ p: 4, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
          {/* Header */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
              {work.is_open_access && (
                <Chip icon={<OpenAccessIcon />} label="Open Access" sx={{ bgcolor: 'rgba(16,185,129,0.1)', color: '#10b981' }} />
              )}
              {work.primary_topic && (
                <Chip label={work.primary_topic} sx={{ bgcolor: `${ACCENT}15`, color: ACCENT }} />
              )}
              {work.work_type && (
                <Chip label={work.work_type} size="small" sx={{ bgcolor: 'rgba(59,130,246,0.1)', color: '#3b82f6' }} />
              )}
            </Box>
            
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
              {work.title}
            </Typography>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Authors Section */}
          <Box sx={{ mb: 3 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', mb: 2, textTransform: 'uppercase', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              <PeopleIcon sx={{ fontSize: 16 }} />
              Authors ({work.authors?.length || 0})
            </Typography>
            <Grid container spacing={1.5}>
              {work.authors?.map((author, idx) => (
                <Grid item xs={12} sm={6} md={4} key={idx}>
                  <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper' }}>
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 0.5 }}>
                        {author.author_position}. {author.author_name}
                        {author.is_corresponding && <Chip label="✉" size="small" sx={{ ml: 0.5, height: 16, fontSize: 10 }} />}
                      </Typography>
                      {author.affiliation_name && (
                        <Typography sx={{ fontSize: 11, color: 'text.secondary', mb: 0.5 }}>
                          {author.affiliation_name}
                        </Typography>
                      )}
                      {author.affiliation_country && (
                        <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>
                          {author.affiliation_country}
                        </Typography>
                      )}
                      {author.orcid && (
                        <Box sx={{ mt: 0.5 }}>
                          <MuiLink href={`https://orcid.org/${author.orcid}`} target="_blank" sx={{ fontSize: 10, color: ACCENT, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <SchoolIcon sx={{ fontSize: 12 }} />
                            {author.orcid}
                          </MuiLink>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Publication Details */}
          <Box sx={{ mb: 3 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', mb: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Publication Details
            </Typography>
            <Table size="small">
              <TableBody>
                {work.venue_name && (
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, width: 200 }}>Venue</TableCell>
                    <TableCell>{work.venue_name}</TableCell>
                  </TableRow>
                )}
                {work.publisher && (
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Publisher</TableCell>
                    <TableCell>{work.publisher}</TableCell>
                  </TableRow>
                )}
                {work.publication_date && (
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Publication Date</TableCell>
                    <TableCell>{fmtDate(work.publication_date)}</TableCell>
                  </TableRow>
                )}
                {work.volume && (
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Volume</TableCell>
                    <TableCell>{work.volume}</TableCell>
                  </TableRow>
                )}
                {work.issue && (
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Issue</TableCell>
                    <TableCell>{work.issue}</TableCell>
                  </TableRow>
                )}
                {work.pages && (
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Pages</TableCell>
                    <TableCell>{work.pages}</TableCell>
                  </TableRow>
                )}
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Citations</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CitationIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                      <Typography sx={{ fontWeight: 600, color: ACCENT }}>{work.cited_by_count}</Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Abstract */}
          {work.abstract && (
            <Box sx={{ mb: 3 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', mb: 1.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Abstract
              </Typography>
              <Typography sx={{ fontSize: 14, lineHeight: 1.8, textAlign: 'justify' }}>
                {work.abstract}
              </Typography>
            </Box>
          )}

          {/* Keywords */}
          {work.keywords && (
            <Box sx={{ mb: 3 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', mb: 1.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Keywords
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {JSON.parse(work.keywords).map((keyword, idx) => (
                  <Chip key={idx} label={keyword} size="small" sx={{ bgcolor: 'rgba(139,92,246,0.08)', color: 'text.secondary' }} />
                ))}
              </Box>
            </Box>
          )}

          <Divider sx={{ my: 3 }} />

          {/* Identifiers */}
          <Box sx={{ mb: 3 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', mb: 1.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Identifiers & Links
            </Typography>
            <Grid container spacing={2}>
              {work.doi && (
                <Grid item xs={12} sm={6}>
                  <Typography sx={{ fontSize: 11, color: 'text.secondary', mb: 0.5 }}>DOI</Typography>
                  <MuiLink href={`https://doi.org/${work.doi}`} target="_blank" sx={{ fontSize: 13, color: ACCENT, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {work.doi} <OpenIcon sx={{ fontSize: 14 }} />
                  </MuiLink>
                </Grid>
              )}
              {work.pmid && (
                <Grid item xs={12} sm={6}>
                  <Typography sx={{ fontSize: 11, color: 'text.secondary', mb: 0.5 }}>PubMed ID</Typography>
                  <MuiLink href={`https://pubmed.ncbi.nlm.nih.gov/${work.pmid}`} target="_blank" sx={{ fontSize: 13, color: ACCENT, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {work.pmid} <OpenIcon sx={{ fontSize: 14 }} />
                  </MuiLink>
                </Grid>
              )}
              {work.open_access_url && (
                <Grid item xs={12}>
                  <Typography sx={{ fontSize: 11, color: 'text.secondary', mb: 0.5 }}>Open Access URL</Typography>
                  <MuiLink href={work.open_access_url} target="_blank" sx={{ fontSize: 13, color: '#10b981', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <OpenAccessIcon sx={{ fontSize: 16 }} />
                    Access Full Text <OpenIcon sx={{ fontSize: 14 }} />
                  </MuiLink>
                </Grid>
              )}
            </Grid>
          </Box>
        </Paper>

        {/* Institutions Section */}
        {work.institutions?.length > 0 && (
          <Paper elevation={0} sx={{ p: 4, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', mb: 2, textTransform: 'uppercase', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              <BusinessIcon sx={{ fontSize: 16 }} />
              Affiliated Institutions ({work.institutions.length})
            </Typography>
            <Grid container spacing={2}>
              {work.institutions.map((inst, idx) => (
                <Grid item xs={12} sm={6} md={4} key={idx}>
                  <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                    <CardContent>
                      <Typography sx={{ fontSize: 14, fontWeight: 600, mb: 0.5 }}>{inst.institution_name}</Typography>
                      {inst.institution_country && (
                        <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 0.5 }}>{inst.institution_country}</Typography>
                      )}
                      {inst.institution_type && (
                        <Chip label={inst.institution_type} size="small" sx={{ fontSize: 10, height: 18, bgcolor: 'rgba(14,165,233,0.1)', color: '#0ea5e9' }} />
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>
        )}

        {/* Funders Section */}
        {work.funders?.length > 0 && (
          <Paper elevation={0} sx={{ p: 4, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', mb: 2, textTransform: 'uppercase', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              <MoneyIcon sx={{ fontSize: 16 }} />
              Funding Sources ({work.funders.length})
            </Typography>
            <Grid container spacing={2}>
              {work.funders.map((funder, idx) => (
                <Grid item xs={12} sm={6} key={idx}>
                  <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                    <CardContent>
                      <Typography sx={{ fontSize: 14, fontWeight: 600, mb: 0.5 }}>{funder.funder_name}</Typography>
                      {funder.funder_country && (
                        <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 0.5 }}>{funder.funder_country}</Typography>
                      )}
                      {funder.grant_number && (
                        <Typography sx={{ fontSize: 11, color: 'text.disabled', mb: 0.5 }}>Grant: {funder.grant_number}</Typography>
                      )}
                      {funder.award_amount && (
                        <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#10b981' }}>
                          {funder.currency} {new Intl.NumberFormat('en-US').format(funder.award_amount)}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>
        )}

        {/* FAIR Metadata Footer */}
        <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, bgcolor: 'rgba(139,92,246,0.02)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <InfoIcon sx={{ fontSize: 16, color: ACCENT }} />
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.primary' }}>
              FAIR Metadata
            </Typography>
          </Box>
          <Typography sx={{ fontSize: 11, color: 'text.secondary', mb: 1 }}>
            This work record follows FAIR principles (Findable, Accessible, Interoperable, Reusable) for scholarly communication.
          </Typography>
          <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>
            Work ID: {work.id} | Type: {work.work_type} | Published: {work.publication_year} | 
            Open Access: {work.is_open_access ? 'Yes' : 'No'} | 
            Last Updated: {fmtDate(work.updated_at || work.created_at)}
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
}
