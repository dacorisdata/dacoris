'use client';
import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, Button, Paper, TextField, CircularProgress, Alert,
  Divider, Chip, useTheme, MenuItem, Select, FormControl, InputLabel,
  FormControlLabel, Checkbox, LinearProgress, Switch,
} from '@mui/material';
import {
  ArrowBack as BackIcon, Save as SaveIcon, CheckCircle as CheckIcon,
  FolderSpecial as DmpIcon, Storage as StorageIcon, Shield as SecurityIcon,
  MenuBook as DocIcon, Gavel as LegalIcon, Cloud as RepositoryIcon,
  Assessment as ReviewIcon, WorkspacePremium as OrcidIcon,
  Science as ProjectIcon, UploadFile as UploadIcon, Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { useAuth } from '../../../../contexts/AuthContext';
import api from '../../../../lib/api';
import { SAMPLE_PROJECTS } from '../../projects/page';

const RichTextField = dynamic(() => import('../../../../components/RichTextField'), { ssr: false });

const ACCENT = '#1ca7a1';

const STEPS = [
  { label: 'Administrative',    Icon: DmpIcon        },
  { label: 'Data Collection',   Icon: StorageIcon    },
  { label: 'Storage & Security',Icon: SecurityIcon   },
  { label: 'Documentation',     Icon: DocIcon        },
  { label: 'Ethics, Legal & IP',Icon: LegalIcon      },
  { label: 'Preservation',      Icon: RepositoryIcon },
  { label: 'Review & Resources',Icon: ReviewIcon     },
];

const inp = { '& .MuiOutlinedInput-root': { borderRadius: 2 } };

function FieldRow({ children }) {
  return <Box sx={{ display: 'flex', gap: 2.5, flexWrap: 'wrap', mb: 2.5 }}>{children}</Box>;
}

function SectionHeader({ icon: Icon, title, subtitle }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, pb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
      <Box sx={{ width: 38, height: 38, borderRadius: 2, bgcolor: `${ACCENT}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon sx={{ fontSize: 19, color: ACCENT }} />
      </Box>
      <Box>
        <Typography sx={{ fontSize: 17, fontWeight: 800, lineHeight: 1.2 }}>{title}</Typography>
        {subtitle && <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.2 }}>{subtitle}</Typography>}
      </Box>
    </Box>
  );
}

function SubLabel({ label }) {
  return (
    <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.7, mb: 1.5 }}>
      {label}
    </Typography>
  );
}

const DATA_FORMATS = ['.csv', '.json', '.xlsx', '.tiff', '.jpg', '.png', '.fasta', '.vcf', '.bam', '.pdf', '.xml', '.hdf5', '.nc'];
const DATA_SOURCE_TYPES = ['Experimental', 'Observational', 'Simulation', 'Derived / Compiled', 'Administrative Records', 'Survey / Questionnaire'];
const STORAGE_LOCATIONS = ['Institutional Network Drive', 'Managed Cloud (AWS / Azure / GCP)', 'Encrypted Physical Drive', 'University HPC Cluster', 'Personal Computer (not recommended)', 'External Hard Drive'];
const METADATA_SCHEMAS = ['Dublin Core', 'DDI', 'DataCite', 'ISO 19115', 'Darwin Core', 'PREMIS', 'Other'];
const REPOSITORIES = ['Zenodo', 'Figshare', 'DRYAD', 'Harvard Dataverse', 'PANGAEA', 'Open Science Framework (OSF)', 'Institutional Repository', 'Other'];
const FUNDERS = ['NIH', 'Horizon Europe', 'Wellcome Trust', 'Bill & Melinda Gates Foundation', 'CGIAR', 'USAID', 'UK Research & Innovation', 'Other'];
const CC_LICENSES = ['CC BY 4.0', 'CC BY-SA 4.0', 'CC BY-NC 4.0', 'CC BY-ND 4.0', 'CC0 (Public Domain)', 'All Rights Reserved', 'Embargo – specify below'];

export default function NewDmpPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';

  const [loading,    setLoading]    = useState(true);
  const [activeStep, setActiveStep] = useState(0);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState('');
  const [projects,   setProjects]   = useState([]);
  const [customDataSource, setCustomDataSource] = useState('');
  const [customDataFormat, setCustomDataFormat] = useState('');
  const [customStorageLocation, setCustomStorageLocation] = useState('');

  const [formData, setFormData] = useState({
    // Step 1
    linkToProject:       false,
    projectId:           '',
    projectTitle:        '',
    piName:              '',
    piOrcid:             '',
    fundingSource:       '',
    awardId:             '',
    startDate:           '',
    endDate:             '',
    dataSteward:         '',
    dataStewardEmail:    '',
    funderRequirement:   '',
    funderOther:         '',
    institutionalPolicy: false,

    // Step 2
    dataSources:       [],    // experimental / observational / simulation / derived
    dataFormats:       [],
    estimatedVolume:   '',
    volumeUnit:        'GB',
    validationMethods: '',

    // Step 3
    storageLocations:  [],
    backupFrequency:   'daily',
    accessList:        '',
    encryptionUsed:    false,
    twoFactorAuth:     false,
    physicalSecurity:  false,
    securityNotes:     '',

    // Step 4
    metadataSchema:     '',
    metadataSchemaOther: '',
    documentationContent: '',

    // Step 5
    dataOwnership:     'institutional',
    license:           '',
    embargoDetails:    '',
    containsPii:       false,
    containsSpi:       false,
    sensitivityNotes:  '',

    // Step 6
    repository:        '',
    repositoryOther:   '',
    doiPlan:           '',
    retentionYears:    '10',
    destructionPlan:   '',

    // Step 7
    storageCosts:      '',
    curationCosts:     '',
    hardwareCosts:     '',
    additionalNotes:   '',
    piDeclaration:     false,
  });

  const set = (f, v) => setFormData(p => ({ ...p, [f]: v }));

  const toggleArr = (field, val) => setFormData(p => ({
    ...p,
    [field]: p[field].includes(val) ? p[field].filter(x => x !== val) : [...p[field], val],
  }));

  const accentChipSx = (selected) => ({
    fontSize: 11,
    borderRadius: 1.5,
    bgcolor: selected ? `${ACCENT}20` : dark ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
    color: selected ? ACCENT : 'text.secondary',
    border: selected ? `1px solid ${ACCENT}50` : '1px solid transparent',
    fontWeight: selected ? 700 : 400,
  });

  const customDataSources = formData.dataSources.filter(s => !DATA_SOURCE_TYPES.includes(s));
  const customDataFormats = formData.dataFormats.filter(f => !DATA_FORMATS.includes(f));
  const customStorageLocations = formData.storageLocations.filter(s => !STORAGE_LOCATIONS.includes(s));

  const addCustomChip = (field, value, clear) => {
    const trimmed = value.trim();
    if (!trimmed || formData[field].includes(trimmed)) {
      clear('');
      return;
    }
    setFormData(p => ({ ...p, [field]: [...p[field], trimmed] }));
    clear('');
  };

  const renderCustomChipGroup = ({
    label, helperText, predefined, field, customItems, inputValue, setInputValue, addLabel,
  }) => (
    <Box sx={{ mb: 2.5 }}>
      <Typography sx={{ fontSize: 12.5, fontWeight: 600, mb: helperText ? 0.5 : 1 }}>{label}</Typography>
      {helperText && (
        <Typography sx={{ fontSize: 11, color: 'text.secondary', mb: 1 }}>{helperText}</Typography>
      )}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
        {predefined.map(item => (
          <Chip key={item} label={item} size="small" clickable
            onClick={() => toggleArr(field, item)}
            sx={accentChipSx(formData[field].includes(item))} />
        ))}
        {customItems.map(item => (
          <Chip key={item} label={item} size="small"
            onDelete={() => toggleArr(field, item)}
            sx={accentChipSx(true)} />
        ))}
      </Box>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField size="small" placeholder={`Add custom ${addLabel}…`}
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addCustomChip(field, inputValue, setInputValue);
            }
          }}
          sx={{ flex: '1 1 240px', maxWidth: 420, ...inp }} />
        <Button size="small" variant="outlined" startIcon={<AddIcon sx={{ fontSize: 16 }} />}
          onClick={() => addCustomChip(field, inputValue, setInputValue)}
          disabled={!inputValue.trim()}
          sx={{ textTransform: 'none', borderRadius: 2, fontSize: 12, flexShrink: 0 }}>
          Add {addLabel}
        </Button>
      </Box>
    </Box>
  );

  useEffect(() => {
    fetchUser().then(async u => {
      if (!u) { router.push('/login'); return; }
      try {
        const res = await api.get('/research/projects');
        const live = res.data || [];
        setProjects(live.length > 0 ? live : SAMPLE_PROJECTS);
      } catch { setProjects(SAMPLE_PROJECTS); }
      setLoading(false);
    });
  }, []);

  const handleProjectSelect = (projectId) => {
    set('projectId', projectId);
    const proj = projects.find(p => String(p.id) === String(projectId));
    if (proj) {
      setFormData(p => ({
        ...p,
        projectId,
        projectTitle:  proj.title        || '',
        piName:        proj.pi_name      || proj.submitted_by?.name || '',
        piOrcid:       proj.pi_orcid     || '',
        fundingSource: proj.funder_name  || '',
        awardId:       proj.award_id     || '',
        startDate:     proj.start_date   || '',
        endDate:       proj.end_date     || '',
      }));
    }
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    setSuccess('Draft saved');
    setSaving(false);
  };

  const handleSubmit = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 800));
    setSuccess('DMP submitted for review successfully');
    setTimeout(() => router.push('/researcher/dmp'), 1500);
    setSaving(false);
  };

  const progress = Math.round(((activeStep + 1) / STEPS.length) * 100);

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <CircularProgress sx={{ color: ACCENT }} />
    </Box>
  );

  // ── STEP RENDERS ──────────────────────────────────────────────────────────

  const step1 = (
    <Box>
      <SectionHeader icon={DmpIcon} title="Data Administrative Details"
        subtitle="Establish project linkage, ownership, and policy context for this DMP." />

      <SubLabel label="1.1 Project Linkage" />
      <FieldRow>
        <FormControlLabel
          control={<Switch checked={formData.linkToProject} onChange={e => set('linkToProject', e.target.checked)}
            sx={{ '& .Mui-checked + .MuiSwitch-track': { bgcolor: ACCENT } }} />}
          label={<Typography sx={{ fontSize: 13 }}>Associate with an existing Research Project</Typography>}
        />
      </FieldRow>

      {formData.linkToProject && (
        <FieldRow>
          <FormControl sx={{ flex: '2 1 300px', ...inp }}>
            <InputLabel size="small">Select Project *</InputLabel>
            <Select size="small" value={formData.projectId} label="Select Project *"
              onChange={e => handleProjectSelect(e.target.value)}>
              {projects.length === 0
                ? <MenuItem disabled value="">No projects found</MenuItem>
                : projects.map(p => <MenuItem key={p.id} value={p.id}>{p.title}</MenuItem>)}
            </Select>
          </FormControl>
        </FieldRow>
      )}

      {formData.projectTitle && (
        <Paper elevation={0} sx={{ mb: 2.5, p: 2, borderRadius: 2, bgcolor: `${ACCENT}08`, border: `1px solid ${ACCENT}30` }}>
          <Typography sx={{ fontSize: 11, color: ACCENT, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.3 }}>Linked Project</Typography>
          <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{formData.projectTitle}</Typography>
          <Box sx={{ display: 'flex', gap: 3, mt: 0.5, flexWrap: 'wrap' }}>
            {formData.fundingSource && <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>Funder: {formData.fundingSource}</Typography>}
            {formData.awardId && <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>Award: {formData.awardId}</Typography>}
            {formData.startDate && <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{formData.startDate} → {formData.endDate}</Typography>}
          </Box>
        </Paper>
      )}

      <FieldRow>
        <TextField size="small" label="Principal Investigator" value={formData.piName}
          onChange={e => set('piName', e.target.value)}
          disabled={formData.linkToProject && !!formData.projectId}
          sx={{ flex: '2 1 240px', ...inp }} />
        <TextField size="small" label="PI ORCID" value={formData.piOrcid}
          onChange={e => set('piOrcid', e.target.value)}
          disabled={formData.linkToProject && !!formData.projectId}
          InputProps={{ startAdornment: <OrcidIcon sx={{ fontSize: 14, color: 'text.disabled', mr: 0.5 }} /> }}
          sx={{ flex: '1 1 180px', ...inp }} />
      </FieldRow>

      <FieldRow>
        <TextField size="small" label="Data Steward Name" value={formData.dataSteward}
          onChange={e => set('dataSteward', e.target.value)} sx={{ flex: '2 1 240px', ...inp }}
          helperText="Person responsible for the data lifecycle" />
        <TextField size="small" label="Data Steward Email" value={formData.dataStewardEmail}
          onChange={e => set('dataStewardEmail', e.target.value)} sx={{ flex: '2 1 240px', ...inp }} />
      </FieldRow>

      <Divider sx={{ my: 2.5 }} />
      <SubLabel label="1.2 Policy Context" />
      <FieldRow>
        <FormControl sx={{ flex: '1 1 220px', ...inp }}>
          <InputLabel size="small">Primary Funder</InputLabel>
          <Select size="small" value={formData.funderRequirement} label="Primary Funder"
            onChange={e => set('funderRequirement', e.target.value)}>
            {FUNDERS.map(f => <MenuItem key={f} value={f}>{f}</MenuItem>)}
          </Select>
        </FormControl>
        {formData.funderRequirement === 'Other' && (
          <TextField size="small" label="Specify Funder" value={formData.funderOther}
            onChange={e => set('funderOther', e.target.value)} sx={{ flex: '1 1 220px', ...inp }} />
        )}
      </FieldRow>
      <FormControlLabel
        control={<Checkbox checked={formData.institutionalPolicy}
          onChange={e => set('institutionalPolicy', e.target.checked)}
          sx={{ color: ACCENT, '&.Mui-checked': { color: ACCENT } }} />}
        label={<Typography sx={{ fontSize: 13 }}>I acknowledge and agree to comply with the institutional Research Data Management (RDM) policy</Typography>}
      />
    </Box>
  );

  const step2 = (
    <Box>
      <SectionHeader icon={StorageIcon} title="Data Collection & Generation"
        subtitle="Define the scope, volume, and quality control approach for your data." />

      <SubLabel label="2.1 Data Types & Formats" />
      {renderCustomChipGroup({
        label: 'Data Source Types',
        predefined: DATA_SOURCE_TYPES,
        field: 'dataSources',
        customItems: customDataSources,
        inputValue: customDataSource,
        setInputValue: setCustomDataSource,
        addLabel: 'Source',
      })}

      {renderCustomChipGroup({
        label: 'File Formats (select all that apply)',
        helperText: 'Non-proprietary open formats are recommended for long-term preservation.',
        predefined: DATA_FORMATS,
        field: 'dataFormats',
        customItems: customDataFormats,
        inputValue: customDataFormat,
        setInputValue: setCustomDataFormat,
        addLabel: 'Format',
      })}

      <FieldRow>
        <TextField size="small" label="Estimated Data Volume" type="number" value={formData.estimatedVolume}
          onChange={e => set('estimatedVolume', e.target.value)} sx={{ flex: '1 1 160px', ...inp }} />
        <FormControl sx={{ flex: '0 0 100px', ...inp }}>
          <InputLabel size="small">Unit</InputLabel>
          <Select size="small" value={formData.volumeUnit} label="Unit"
            onChange={e => set('volumeUnit', e.target.value)}>
            {['MB','GB','TB','PB'].map(u => <MenuItem key={u} value={u}>{u}</MenuItem>)}
          </Select>
        </FormControl>
      </FieldRow>

      <Divider sx={{ my: 2.5 }} />
      <SubLabel label="2.2 Quality Control" />
      <RichTextField
        label="Validation & QC Procedures"
        value={formData.validationMethods}
        onChange={v => set('validationMethods', v)}
        placeholder="Describe methods for ensuring data integrity (e.g., double data entry, instrument calibration, range checks)…"
        minRows={3}
      />
    </Box>
  );

  const step3 = (
    <Box>
      <SectionHeader icon={SecurityIcon} title="Storage, Backup & Security"
        subtitle="Protection of data during the active research phase." />

      <SubLabel label="3.1 Storage Infrastructure" />
      {renderCustomChipGroup({
        label: 'Storage Location(s)',
        predefined: STORAGE_LOCATIONS,
        field: 'storageLocations',
        customItems: customStorageLocations,
        inputValue: customStorageLocation,
        setInputValue: setCustomStorageLocation,
        addLabel: 'Location',
      })}

      <FieldRow>
        <FormControl sx={{ flex: '1 1 180px', ...inp }}>
          <InputLabel size="small">Backup Frequency</InputLabel>
          <Select size="small" value={formData.backupFrequency} label="Backup Frequency"
            onChange={e => set('backupFrequency', e.target.value)}>
            <MenuItem value="realtime">Real-time / Continuous</MenuItem>
            <MenuItem value="daily">Daily Automated</MenuItem>
            <MenuItem value="weekly">Weekly Automated</MenuItem>
            <MenuItem value="manual">Manual (ad-hoc)</MenuItem>
          </Select>
        </FormControl>
      </FieldRow>

      <Divider sx={{ my: 2.5 }} />
      <SubLabel label="3.2 Access Control & Security" />
      <RichTextField
        label="Access List — Roles / Individuals"
        value={formData.accessList}
        onChange={v => set('accessList', v)}
        placeholder="List roles or named individuals permitted to view/edit raw data…"
        minRows={3}
        sx={{ mb: 2.5 }}
      />

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
        {[
          { field: 'encryptionUsed',   label: 'Data encryption at rest and in transit' },
          { field: 'twoFactorAuth',    label: 'Two-factor authentication enforced' },
          { field: 'physicalSecurity', label: 'Physical access controls for hardware' },
        ].map(({ field, label }) => (
          <FormControlLabel key={field}
            control={<Checkbox checked={formData[field]} onChange={e => set(field, e.target.checked)}
              sx={{ color: ACCENT, '&.Mui-checked': { color: ACCENT } }} size="small" />}
            label={<Typography sx={{ fontSize: 12.5 }}>{label}</Typography>}
          />
        ))}
      </Box>

      <RichTextField
        label="Additional Security Measures"
        value={formData.securityNotes}
        onChange={v => set('securityNotes', v)}
        placeholder="Describe any additional security controls…"
        minRows={3}
      />
    </Box>
  );

  const step4 = (
    <Box>
      <SectionHeader icon={DocIcon} title="Documentation & Metadata"
        subtitle="Ensure the data is understandable, discoverable, and reusable by others." />

      <SubLabel label="4.1 Metadata Standards" />
      <FieldRow>
        <FormControl sx={{ flex: '1 1 220px', ...inp }}>
          <InputLabel size="small">Metadata Schema</InputLabel>
          <Select size="small" value={formData.metadataSchema} label="Metadata Schema"
            onChange={e => set('metadataSchema', e.target.value)}>
            {METADATA_SCHEMAS.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
          </Select>
        </FormControl>
        {formData.metadataSchema === 'Other' && (
          <TextField size="small" label="Specify Metadata Schema" value={formData.metadataSchemaOther}
            onChange={e => set('metadataSchemaOther', e.target.value)} sx={{ flex: '1 1 220px', ...inp }} />
        )}
      </FieldRow>

      <RichTextField
        label="Documentation Content Description"
        value={formData.documentationContent}
        onChange={v => set('documentationContent', v)}
        placeholder="Describe the ReadMe files, codebooks, variable dictionaries, lab notebooks, or instrument logs that will accompany the dataset. Include naming conventions and directory structure…"
        minRows={5}
      />
    </Box>
  );

  const step5 = (
    <Box>
      <SectionHeader icon={LegalIcon} title="Ethics, Legal & Intellectual Property"
        subtitle="Clarify rights, restrictions, and sensitivity classifications." />

      <SubLabel label="5.1 Intellectual Property & Ownership" />
      <FieldRow>
        <FormControl sx={{ flex: '1 1 200px', ...inp }}>
          <InputLabel size="small">Data Ownership</InputLabel>
          <Select size="small" value={formData.dataOwnership} label="Data Ownership"
            onChange={e => set('dataOwnership', e.target.value)}>
            <MenuItem value="institutional">Institutional</MenuItem>
            <MenuItem value="individual">Individual Researcher</MenuItem>
            <MenuItem value="funder">Funder-owned</MenuItem>
            <MenuItem value="shared">Shared (specify below)</MenuItem>
          </Select>
        </FormControl>
        <FormControl sx={{ flex: '1 1 200px', ...inp }}>
          <InputLabel size="small">Sharing License</InputLabel>
          <Select size="small" value={formData.license} label="Sharing License"
            onChange={e => set('license', e.target.value)}>
            {CC_LICENSES.map(l => <MenuItem key={l} value={l}>{l}</MenuItem>)}
          </Select>
        </FormControl>
      </FieldRow>

      {(formData.license === 'Embargo – specify below') && (
        <RichTextField
          label="Embargo / Delayed Release Details"
          value={formData.embargoDetails}
          onChange={v => set('embargoDetails', v)}
          placeholder="Specify the embargo period and reason (e.g., pending patent, publication, commercial exploitation)…"
          minRows={3}
          sx={{ mb: 2.5 }}
        />
      )}

      <Divider sx={{ my: 2.5 }} />
      <SubLabel label="5.2 Ethical Restrictions & Sensitivity" />

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
        <FormControlLabel
          control={<Checkbox checked={formData.containsPii} onChange={e => set('containsPii', e.target.checked)}
            sx={{ color: '#ef4444', '&.Mui-checked': { color: '#ef4444' } }} size="small" />}
          label={<Typography sx={{ fontSize: 12.5 }}>Contains Personally Identifiable Information (PII)</Typography>}
        />
        <FormControlLabel
          control={<Checkbox checked={formData.containsSpi} onChange={e => set('containsSpi', e.target.checked)}
            sx={{ color: '#ef4444', '&.Mui-checked': { color: '#ef4444' } }} size="small" />}
          label={<Typography sx={{ fontSize: 12.5 }}>Contains Sensitive Personal Information (SPI)</Typography>}
        />
      </Box>

      {(formData.containsPii || formData.containsSpi) && (
        <RichTextField
          label="Sensitivity Management Notes"
          value={formData.sensitivityNotes}
          onChange={v => set('sensitivityNotes', v)}
          placeholder="Describe how PII/SPI will be protected, anonymised, or access-controlled…"
          minRows={3}
        />
      )}
    </Box>
  );

  const step6 = (
    <Box>
      <SectionHeader icon={RepositoryIcon} title="Preservation & Sharing"
        subtitle="Plan for the long-term lifecycle and discoverability of your data." />

      <SubLabel label="6.1 Repository Selection" />
      <FieldRow>
        <FormControl sx={{ flex: '1 1 220px', ...inp }}>
          <InputLabel size="small">Long-term Repository</InputLabel>
          <Select size="small" value={formData.repository} label="Long-term Repository"
            onChange={e => set('repository', e.target.value)}>
            {REPOSITORIES.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
          </Select>
        </FormControl>
        {formData.repository === 'Other' && (
          <TextField size="small" label="Specify Repository" value={formData.repositoryOther}
            onChange={e => set('repositoryOther', e.target.value)} sx={{ flex: '1 1 200px', ...inp }} />
        )}
      </FieldRow>

      <RichTextField
        label="Persistent Identifier / DOI Plan"
        value={formData.doiPlan}
        onChange={v => set('doiPlan', v)}
        placeholder="Describe the plan for obtaining a DOI for the dataset upon deposit…"
        minRows={3}
        sx={{ mb: 2.5 }}
      />

      <Divider sx={{ my: 2.5 }} />
      <SubLabel label="6.2 Data Retention & Destruction" />
      <FieldRow>
        <TextField size="small" label="Retention Duration (years)" type="number"
          value={formData.retentionYears} onChange={e => set('retentionYears', e.target.value)}
          helperText="Years to preserve data post-project" sx={{ flex: '1 1 160px', ...inp }} />
      </FieldRow>
      <RichTextField
        label="Secure Destruction Plan"
        value={formData.destructionPlan}
        onChange={v => set('destructionPlan', v)}
        placeholder="Procedures for secure deletion of data that cannot be preserved…"
        minRows={3}
      />
    </Box>
  );

  const step7 = (
    <Box>
      <SectionHeader icon={ReviewIcon} title="Review & Resources"
        subtitle="Budget for data management and submit for Library / RDM office review." />

      <SubLabel label="DMP Costs" />
      <FieldRow>
        <TextField size="small" label="Storage Costs" value={formData.storageCosts}
          onChange={e => set('storageCosts', e.target.value)}
          placeholder="e.g. KES 50,000 / year" sx={{ flex: '1 1 180px', ...inp }} />
        <TextField size="small" label="Curation / Preservation Costs" value={formData.curationCosts}
          onChange={e => set('curationCosts', e.target.value)}
          placeholder="e.g. Repository deposit fee" sx={{ flex: '1 1 180px', ...inp }} />
        <TextField size="small" label="Hardware / Infrastructure" value={formData.hardwareCosts}
          onChange={e => set('hardwareCosts', e.target.value)}
          placeholder="e.g. External drives, servers" sx={{ flex: '1 1 180px', ...inp }} />
      </FieldRow>

      <RichTextField
        label="Additional Notes for Reviewer"
        value={formData.additionalNotes}
        onChange={v => set('additionalNotes', v)}
        placeholder="Provide any context or special considerations for the RDM office reviewer…"
        minRows={3}
        sx={{ mb: 2.5 }}
      />

      <Divider sx={{ mb: 2.5 }} />

      <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2.5, bgcolor: dark ? `${ACCENT}08` : `${ACCENT}06`, border: `1px solid ${ACCENT}30` }}>
        <FormControlLabel
          control={<Checkbox checked={formData.piDeclaration} onChange={e => set('piDeclaration', e.target.checked)}
            sx={{ color: ACCENT, '&.Mui-checked': { color: ACCENT } }} />}
          label={
            <Typography sx={{ fontSize: 13, lineHeight: 1.5 }}>
              I confirm that this Data Management Plan is accurate and complete. I commit to implementing the described practices throughout the research project lifecycle, and to updating this plan whenever significant changes occur to data collection, storage, or sharing arrangements.
            </Typography>
          }
        />
      </Paper>
    </Box>
  );

  const STEP_CONTENT = [step1, step2, step3, step4, step5, step6, step7];

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>

      {/* Top bar */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Button size="small" startIcon={<BackIcon sx={{ fontSize: 15 }} />}
            onClick={() => router.push('/researcher/dmp')}
            sx={{ textTransform: 'none', color: 'text.secondary', borderRadius: 2 }}>
            Back to DMPs
          </Button>
          <Typography sx={{ color: 'divider' }}>|</Typography>
          <Box>
            <Typography sx={{ fontSize: 20, fontWeight: 800, lineHeight: 1.2 }}>New Data Management Plan</Typography>
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Formal DMP submission for Library / RDM office review</Typography>
          </Box>
        </Box>
        <Button size="small" variant="outlined"
          startIcon={saving ? <CircularProgress size={13} /> : <SaveIcon sx={{ fontSize: 14 }} />}
          onClick={handleSaveDraft} disabled={saving}
          sx={{ textTransform: 'none', borderRadius: 2, fontSize: 12 }}>
          Save Draft
        </Button>
      </Box>

      {error   && <Alert severity="error"   sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>{success}</Alert>}

      {/* Two-col layout */}
      <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start' }}>

        {/* Sidebar stepper */}
        <Paper elevation={0} variant="outlined" sx={{
          width: 220, flexShrink: 0, borderRadius: 3, overflow: 'hidden',
          display: { xs: 'none', lg: 'block' },
          position: 'sticky', top: 24,
        }}>
          <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.7, mb: 1 }}>Progress</Typography>
            <LinearProgress variant="determinate" value={progress}
              sx={{ height: 5, borderRadius: 3, bgcolor: 'divider', '& .MuiLinearProgress-bar': { bgcolor: ACCENT } }} />
            <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.5 }}>{progress}% complete</Typography>
          </Box>
          <Box sx={{ py: 1 }}>
            {STEPS.map((s, i) => {
              const done   = i < activeStep;
              const active = i === activeStep;
              return (
                <Box key={i} onClick={() => setActiveStep(i)} sx={{
                  display: 'flex', alignItems: 'center', gap: 1.5,
                  px: 2, py: 1.2, cursor: 'pointer',
                  borderLeft: active ? `3px solid ${ACCENT}` : '3px solid transparent',
                  bgcolor: active ? `${ACCENT}10` : 'transparent',
                  transition: 'all 0.15s',
                  '&:hover': { bgcolor: `${ACCENT}08` },
                }}>
                  <Box sx={{
                    width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    bgcolor: done ? '#10b981' : active ? ACCENT : dark ? 'rgba(255,255,255,0.08)' : '#f1f5f9',
                  }}>
                    {done
                      ? <CheckIcon sx={{ fontSize: 13, color: '#fff' }} />
                      : <s.Icon sx={{ fontSize: 12, color: active ? '#fff' : 'text.disabled' }} />}
                  </Box>
                  <Typography sx={{ fontSize: 12, fontWeight: active ? 700 : 500, color: active ? ACCENT : done ? 'text.primary' : 'text.secondary' }}>
                    {s.label}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </Paper>

        {/* Form content */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Paper elevation={0} variant="outlined" sx={{ borderRadius: 3, p: { xs: 2.5, md: 3.5 }, mb: 2.5 }}>
            {STEP_CONTENT[activeStep]}
          </Paper>

          {/* Navigation footer */}
          <Paper elevation={0} variant="outlined" sx={{ borderRadius: 3, px: 3, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Button variant="outlined" size="small"
              disabled={activeStep === 0}
              onClick={() => setActiveStep(s => s - 1)}
              startIcon={<BackIcon sx={{ fontSize: 15 }} />}
              sx={{ textTransform: 'none', borderRadius: 2, fontSize: 13 }}>
              Previous
            </Button>

            <Box sx={{ display: 'flex', gap: 0.75 }}>
              {STEPS.map((_, i) => (
                <Box key={i} onClick={() => setActiveStep(i)} sx={{
                  width: i === activeStep ? 20 : 7, height: 7, borderRadius: 4,
                  bgcolor: i === activeStep ? ACCENT : i < activeStep ? `${ACCENT}60` : dark ? 'rgba(255,255,255,0.15)' : '#e2e8f0',
                  cursor: 'pointer', transition: 'all 0.2s',
                }} />
              ))}
            </Box>

            {activeStep < STEPS.length - 1 ? (
              <Button variant="contained" size="small"
                onClick={() => setActiveStep(s => s + 1)}
                sx={{ textTransform: 'none', borderRadius: 2, fontSize: 13, bgcolor: ACCENT, '&:hover': { bgcolor: '#0e8a85' } }}>
                Next Step
              </Button>
            ) : (
              <Button variant="contained" size="small"
                onClick={handleSubmit} disabled={saving || !formData.piDeclaration}
                startIcon={saving ? <CircularProgress size={13} sx={{ color: 'inherit' }} /> : null}
                sx={{ textTransform: 'none', borderRadius: 2, fontSize: 13, bgcolor: ACCENT, '&:hover': { bgcolor: '#0e8a85' } }}>
                Submit DMP
              </Button>
            )}
          </Paper>
        </Box>
      </Box>
    </Box>
  );
}
