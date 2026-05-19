'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, Button, Chip, CircularProgress, TextField,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Select, MenuItem, FormControl, InputLabel, useTheme,
  InputAdornment, IconButton, Divider, Alert,
} from '@mui/material';
import {
  Add as AddIcon, Search as SearchIcon, People as PartnersIcon,
  Clear as ClearIcon, Language as WebIcon, LocationOn as LocationIcon,
  Person as ContactIcon,
} from '@mui/icons-material';
import api from '../../../../lib/api';

const ACCENT = '#7c3aed';

const TIER_CONFIG = {
  STRATEGIC: { label: 'Strategic', color: '#7c3aed', bg: 'rgba(124,58,237,0.1)' },
  ACTIVE:    { label: 'Active',    color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  DORMANT:   { label: 'Dormant',   color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
};

const PARTNER_TYPES = [
  'UNIVERSITY', 'RESEARCH_INSTITUTE', 'GOVERNMENT', 'NGO', 'HOSPITAL',
  'INDUSTRY', 'FUNDER', 'INTERNATIONAL_ORG',
];

export default function PartnersPage() {
  const router = useRouter();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';

  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const [createDialog, setCreateDialog] = useState(false);
  const [contactDialog, setContactDialog] = useState({ open: false, partnerId: null, partnerName: '' });
  const [form, setForm] = useState({ organisation_name: '', organisation_type: 'UNIVERSITY', country: '', region: '', city: '', website: '', notes: '' });
  const [contactForm, setContactForm] = useState({ full_name: '', title: '', email: '', phone: '', is_primary: false, role_at_partner: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchPartners(); }, []);

  const fetchPartners = async () => {
    setLoading(true);
    try {
      const params = search ? `?search=${encodeURIComponent(search)}` : '';
      const res = await api.get(`/mou/partners/${params}`);
      setPartners(res.data || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!form.organisation_name.trim()) return;
    setSaving(true);
    try {
      await api.post('/mou/partners/', form);
      setCreateDialog(false);
      setForm({ organisation_name: '', organisation_type: 'UNIVERSITY', country: '', region: '', city: '', website: '', notes: '' });
      await fetchPartners();
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to create partner.');
    }
    setSaving(false);
  };

  const handleAddContact = async () => {
    if (!contactForm.full_name.trim()) return;
    setSaving(true);
    try {
      await api.post(`/mou/partners/${contactDialog.partnerId}/contacts`, contactForm);
      setContactDialog({ open: false, partnerId: null, partnerName: '' });
      setContactForm({ full_name: '', title: '', email: '', phone: '', is_primary: false, role_at_partner: '' });
      await fetchPartners();
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to add contact.');
    }
    setSaving(false);
  };

  const filtered = partners.filter(p =>
    !search || p.organisation_name?.toLowerCase().includes(search.toLowerCase())
  );

  const Card = ({ children, sx = {} }) => (
    <Box sx={{ bgcolor: 'background.paper', borderRadius: 3, p: 2.5,
      border: `1px solid ${theme.palette.divider}`,
      boxShadow: dark ? 'none' : '0 2px 8px rgba(0,0,0,0.05)',
      ...sx }}>
      {children}
    </Box>
  );

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <PartnersIcon sx={{ color: ACCENT }} />
            <Typography sx={{ fontSize: 22, fontWeight: 700, color: 'text.primary' }}>Partner Organisations</Typography>
          </Box>
          <Typography sx={{ color: 'text.secondary', fontSize: 13, mt: 0.3 }}>
            {filtered.length} partner{filtered.length !== 1 ? 's' : ''}
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateDialog(true)}
          sx={{ bgcolor: ACCENT, borderRadius: 2, textTransform: 'none', fontWeight: 600,
            '&:hover': { bgcolor: '#6d28d9' } }}>
          Add Partner
        </Button>
      </Box>

      {/* Search */}
      <Box sx={{ mb: 3 }}>
        <TextField size="small" placeholder="Search partners…"
          value={search} onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && fetchPartners()}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: 'text.disabled' }} /></InputAdornment>,
            endAdornment: search ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => { setSearch(''); fetchPartners(); }}>
                  <ClearIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
          sx={{ minWidth: 280, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
      </Box>

      {/* Partner Grid */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: ACCENT }} />
        </Box>
      ) : filtered.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 10 }}>
          <PartnersIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1.5 }} />
          <Typography color="text.secondary">No partners found. Add your first partner organisation.</Typography>
          <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setCreateDialog(true)}
            sx={{ mt: 2, borderColor: ACCENT, color: ACCENT, textTransform: 'none', borderRadius: 2 }}>
            Add Partner
          </Button>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          {filtered.map(partner => {
            const tier = TIER_CONFIG[partner.partnership_tier] || TIER_CONFIG.ACTIVE;
            return (
              <Card key={partner.id} sx={{ flex: '1 1 300px', maxWidth: 420 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'text.primary', mb: 0.3 }}>
                      {partner.organisation_name}
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                      {partner.organisation_type?.replace(/_/g, ' ')}
                    </Typography>
                  </Box>
                  <Chip label={tier.label} size="small"
                    sx={{ bgcolor: tier.bg, color: tier.color, fontWeight: 700, fontSize: 10, height: 22, ml: 1 }} />
                </Box>

                <Divider sx={{ my: 1 }} />

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  {(partner.city || partner.country) && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <LocationIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
                      <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                        {[partner.city, partner.country].filter(Boolean).join(', ')}
                      </Typography>
                    </Box>
                  )}
                  {partner.website && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <WebIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
                      <Typography sx={{ fontSize: 12, color: ACCENT, cursor: 'pointer',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        onClick={() => window.open(partner.website, '_blank')}>
                        {partner.website}
                      </Typography>
                    </Box>
                  )}
                </Box>

                {/* Contacts */}
                {partner.contacts?.length > 0 && (
                  <Box sx={{ mt: 1.5 }}>
                    <Typography sx={{ fontSize: 11, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.5 }}>Contacts</Typography>
                    {partner.contacts.map(c => (
                      <Box key={c.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.3 }}>
                        <ContactIcon sx={{ fontSize: 12, color: 'text.disabled' }} />
                        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                          {c.full_name}{c.title ? ` · ${c.title}` : ''}
                          {c.is_primary ? <Chip label="Primary" size="small" sx={{ ml: 0.5, fontSize: 9, height: 16, bgcolor: `${ACCENT}15`, color: ACCENT }} /> : null}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                )}

                <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                  <Button size="small" variant="outlined" startIcon={<ContactIcon />}
                    onClick={() => setContactDialog({ open: true, partnerId: partner.id, partnerName: partner.organisation_name })}
                    sx={{ flex: 1, borderColor: ACCENT, color: ACCENT, textTransform: 'none', fontSize: 11, borderRadius: 1.5 }}>
                    Add Contact
                  </Button>
                </Box>
              </Card>
            );
          })}
        </Box>
      )}

      {/* Create Partner Dialog */}
      <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Add Partner Organisation</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <TextField fullWidth size="small" label="Organisation Name *"
            value={form.organisation_name} onChange={e => setForm(p => ({ ...p, organisation_name: e.target.value }))}
            sx={{ mt: 1, mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Organisation Type</InputLabel>
            <Select value={form.organisation_type} label="Organisation Type"
              onChange={e => setForm(p => ({ ...p, organisation_type: e.target.value }))} sx={{ borderRadius: 2 }}>
              {PARTNER_TYPES.map(t => <MenuItem key={t} value={t}>{t.replace(/_/g, ' ')}</MenuItem>)}
            </Select>
          </FormControl>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField size="small" label="Country (ISO)" value={form.country}
              onChange={e => setForm(p => ({ ...p, country: e.target.value }))} fullWidth
              placeholder="e.g. KE"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            <TextField size="small" label="City" value={form.city}
              onChange={e => setForm(p => ({ ...p, city: e.target.value }))} fullWidth
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
          </Box>
          <TextField fullWidth size="small" label="Website" value={form.website}
            onChange={e => setForm(p => ({ ...p, website: e.target.value }))}
            sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
          <TextField fullWidth size="small" multiline rows={2} label="Notes"
            value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCreateDialog(false)} sx={{ textTransform: 'none', color: 'text.secondary' }}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={saving || !form.organisation_name.trim()}
            sx={{ bgcolor: ACCENT, textTransform: 'none', fontWeight: 600, borderRadius: 2,
              '&:hover': { bgcolor: '#6d28d9' } }}>
            {saving ? <CircularProgress size={16} color="inherit" /> : 'Add Partner'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Contact Dialog */}
      <Dialog open={contactDialog.open} onClose={() => setContactDialog({ open: false, partnerId: null, partnerName: '' })}
        maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>
          Add Contact — {contactDialog.partnerName}
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <TextField fullWidth size="small" label="Full Name *"
            value={contactForm.full_name} onChange={e => setContactForm(p => ({ ...p, full_name: e.target.value }))}
            sx={{ mt: 1, mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField size="small" label="Title / Role" value={contactForm.title}
              onChange={e => setContactForm(p => ({ ...p, title: e.target.value }))} fullWidth
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            <TextField size="small" label="Role at Partner" value={contactForm.role_at_partner}
              onChange={e => setContactForm(p => ({ ...p, role_at_partner: e.target.value }))} fullWidth
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
          </Box>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField size="small" label="Email" type="email" value={contactForm.email}
              onChange={e => setContactForm(p => ({ ...p, email: e.target.value }))} fullWidth
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            <TextField size="small" label="Phone" value={contactForm.phone}
              onChange={e => setContactForm(p => ({ ...p, phone: e.target.value }))} fullWidth
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setContactDialog({ open: false, partnerId: null, partnerName: '' })}
            sx={{ textTransform: 'none', color: 'text.secondary' }}>Cancel</Button>
          <Button variant="contained" onClick={handleAddContact} disabled={saving || !contactForm.full_name.trim()}
            sx={{ bgcolor: ACCENT, textTransform: 'none', fontWeight: 600, borderRadius: 2,
              '&:hover': { bgcolor: '#6d28d9' } }}>
            {saving ? <CircularProgress size={16} color="inherit" /> : 'Add Contact'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
