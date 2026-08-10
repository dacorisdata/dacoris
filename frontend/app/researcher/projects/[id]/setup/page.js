'use client';
import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useParams } from 'next/navigation';
import {
  Box, Typography, Button, Paper, TextField, CircularProgress, Alert,
  Divider, IconButton, Chip, useTheme, MenuItem, Select, FormControl,
  InputLabel, FormControlLabel, Checkbox, LinearProgress, Avatar,
  Tabs, Tab,
} from '@mui/material';
import {
  ArrowBack as BackIcon, Save as SaveIcon, Add as AddIcon,
  Delete as DeleteIcon, CheckCircle as CheckIcon,
  Science as ProjectIcon, Groups as TeamIcon, Description as DescIcon,
  Gavel as EthicsIcon, Flag as MilestoneIcon, VerifiedUser as DeclareIcon,
  EmojiEvents as TrophyIcon, Storage as StorageIcon, AttachMoney as MoneyIcon,
  UploadFile as UploadIcon, Link as LinkIcon, Article as FormIcon,
  InfoOutlined as InfoIcon, RadioButtonUnchecked as IncompleteIcon,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { useAuth } from '../../../../../contexts/AuthContext';
import { TeamInviteDialog } from '../../../../../components/TeamInvitePanel';
import PlanAssigneeSelect, {
  buildPlanIndividuals, parseAssigneeKey, assigneeKeyFromDeliverable,
} from '../../../../../components/ProjectPlanAssignee';
import { accentScrollbarSx } from '../../../../../lib/scrollStyles';

const RichTextField = dynamic(() => import('../../../../../components/RichTextField'), { ssr: false });

const API    = process.env.NEXT_PUBLIC_API_URL || '/api';
const ACCENT = '#1ca7a1';
const GOLD   = '#f59e0b';

const STEPS = [
  { label: 'Project Context',       Icon: ProjectIcon   },
  { label: 'Research Team',         Icon: TeamIcon      },
  { label: 'Research Details',      Icon: DescIcon      },
  { label: 'Project Plan',          Icon: MilestoneIcon },
  { label: 'Ethics & Compliance',   Icon: EthicsIcon    },
  { label: 'Data Management Plan',  Icon: StorageIcon   },
  { label: 'Financial',             Icon: MoneyIcon     },
  { label: 'Declarations',          Icon: DeclareIcon   },
];

const inp = { '& .MuiOutlinedInput-root': { borderRadius: 2 } };
const multilineInp = {
  ...inp,
  '& .MuiInputBase-inputMultiline': { overflow: 'hidden !important', resize: 'none' },
};
const MEMBER_ROLES = ['co_investigator', 'research_assistant', 'data_manager', 'external_collaborator'];
const PRIORITIES   = ['low', 'medium', 'high', 'critical'];
const ETHICS_DOC_TYPES = ['ethics_clearance', 'IRB_protocol', 'consent_form', 'other'];
const RESEARCH_AREAS = ['Clinical Research', 'Social Sciences', 'Health Sciences', 'Natural Sciences', 'Engineering & Technology', 'Environmental Sciences', 'Other'];
const PROJECT_TYPES = [
  { value: 'contract_research', label: 'Contract Research' },
  { value: 'grant_funded', label: 'Grant Funded' },
  { value: 'internal', label: 'Internal' },
  { value: 'collaborative', label: 'Collaborative' },
];
const PROJECT_FLAGS = [
  { field: 'involvesHumanSubjects', label: 'This project involves human subjects' },
  { field: 'involvesAnimalSubjects', label: 'This project involves animal subjects' },
  { field: 'involvesSensitiveData', label: 'This project handles sensitive / personal data' },
  { field: 'isClinicalTrial', label: 'This project is a clinical trial or interventional study' },
  { field: 'usesHazardousMaterials', label: 'This project uses hazardous materials or chemicals' },
];
const PI_ACADEMIC_TITLES = ['Prof.', 'Dr.', 'Mr.', 'Mrs.', 'Ms.', 'Eng.', 'Other'];
const CO_INVESTIGATOR_ROLES = ['co_investigator'];
const SUPPORT_STAFF_ROLES = ['research_assistant', 'data_manager', 'external_collaborator'];
const RESEARCH_DESIGNS = [
  'Qualitative', 'Quantitative', 'Mixed Methods', 'Experimental', 'Quasi-Experimental',
  'Descriptive', 'Case Study', 'Longitudinal', 'Cross-Sectional', 'Other',
];
const MILESTONE_STATUSES = [
  { value: 'planned', label: 'Planned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'overdue', label: 'Overdue' },
];
const DELIVERABLE_TYPES = ['Report', 'Dataset', 'Prototype', 'Publication', 'Presentation', 'Software', 'Other'];
const DELIVERABLE_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'overdue', label: 'Overdue' },
];
const DMP_ENTRY_MODES = [
  { value: 'upload', label: 'Upload DMP', Icon: UploadIcon },
  { value: 'form', label: 'Fill Form', Icon: FormIcon },
  { value: 'attach', label: 'Attach Existing', Icon: LinkIcon },
];
const DMP_STORAGE_LOCATIONS = [
  'Institutional Server', 'Cloud Storage (AWS/Azure/GCP)', 'Local Secure Drive',
  'National Repository', 'Encrypted External Drive', 'Other',
];
const DMP_RETENTION_PERIODS = ['1 year', '3 years', '5 years', '7 years', '10 years', 'Permanent', 'Other'];
const CURRENCY_OPTIONS = [
  { value: 'KES', label: 'KES — Kenyan Shilling' },
  { value: 'USD', label: 'USD — US Dollar' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'GBP', label: 'GBP — British Pound' },
];
const BUDGET_CATEGORIES = [
  'Personnel', 'Equipment', 'Travel', 'Supplies', 'Services',
  'Indirect Costs', 'Participant Costs', 'Other',
];

const DEFAULT_DECLARATIONS = {
  research_integrity: false,
  conflict_of_interest: false,
  data_protection: false,
  funder_compliance: false,
  institutional_approval: false,
  ethics_compliance: false,
  originality: false,
};

const SUBMISSION_CHECKLIST = [
  { key: 'context', label: 'Project Context & Identity' },
  { key: 'team', label: 'Research Team Details' },
  { key: 'research', label: 'Research Abstract & Objectives' },
  { key: 'plan', label: 'Milestones & Deliverables' },
  { key: 'ethics', label: 'Ethics Documentation' },
  { key: 'dmp', label: 'Data Management Plan' },
  { key: 'financial', label: 'Budget & Financial Plan' },
  { key: 'declarations', label: 'All Declarations Signed' },
];

const stripHtml = (value) => (value || '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();

const normalizeObjective = (obj = {}) => ({
  title: obj.title ?? obj.objective ?? '',
  description: obj.description ?? '',
  outcome: obj.outcome ?? '',
});

const hasObjectiveContent = (obj) =>
  !!(obj.title?.trim() || stripHtml(obj.description) || stripHtml(obj.outcome));

const parseJsonList = (value, fallback = []) => {
  if (Array.isArray(value)) return value;
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
};

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const toInputDate = d => d ? new Date(d).toISOString().split('T')[0] : '';
const ethicsStatusColor = s => ({ approved: '#10b981', submitted: '#f59e0b', under_review: '#0ea5e9', rejected: '#ef4444' }[s] || '#64748b');
const priorityColor = p => ({ critical: '#ef4444', high: '#f97316', medium: '#f59e0b', low: '#10b981' }[p] || '#64748b');
const draftKey = id => `projectSetup_${id}`;

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

function DropZone({ label, file, onFile, accent = ACCENT, accept }) {
  const theme = useTheme();
  const onDrop = useCallback(accepted => { if (accepted[0]) onFile(accepted[0]); }, [onFile]);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, multiple: false, accept });
  return (
    <Box>
      <Typography sx={{ fontSize: 12, fontWeight: 600, mb: 0.75 }}>{label}</Typography>
      <Box {...getRootProps()} sx={{
        border: `2px dashed ${isDragActive ? accent : theme.palette.divider}`,
        borderRadius: 2, p: 2.5, textAlign: 'center', cursor: 'pointer',
        bgcolor: isDragActive ? `${accent}08` : 'transparent',
        transition: 'all 0.15s',
        '&:hover': { borderColor: accent, bgcolor: `${accent}06` },
      }}>
        <input {...getInputProps()} />
        <UploadIcon sx={{ fontSize: 22, color: 'text.disabled', mb: 0.5 }} />
        {file ? (
          <Typography sx={{ fontSize: 12, color: accent, fontWeight: 600 }}>{file.name || file.original_filename}</Typography>
        ) : (
          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
            {isDragActive ? 'Drop here' : 'Drag & drop or click to upload'}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

function DmpUploadZone({ file, onFile }) {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const onDrop = useCallback(accepted => { if (accepted[0]) onFile(accepted[0]); }, [onFile]);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
  });
  return (
    <Box {...getRootProps()} sx={{
      border: `2px dashed ${isDragActive ? ACCENT : theme.palette.divider}`,
      borderRadius: 2.5,
      p: { xs: 4, md: 6 },
      textAlign: 'center',
      cursor: 'pointer',
      bgcolor: isDragActive ? `${ACCENT}08` : dark ? 'rgba(255,255,255,0.02)' : '#fafafa',
      transition: 'all 0.15s',
      '&:hover': { borderColor: ACCENT, bgcolor: `${ACCENT}06` },
    }}>
      <input {...getInputProps()} />
      <UploadIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1.5 }} />
      {file ? (
        <Typography sx={{ fontSize: 13, color: ACCENT, fontWeight: 600 }}>{file.name || file.original_filename}</Typography>
      ) : (
        <>
          <Typography sx={{ fontSize: 14, fontWeight: 600, mb: 0.5 }}>
            Upload your Data Management Plan document
          </Typography>
          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
            PDF, DOCX — any DMP format accepted
          </Typography>
        </>
      )}
    </Box>
  );
}


function BudgetUploadZone({ file, onFile }) {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const onDrop = useCallback(accepted => { if (accepted[0]) onFile(accepted[0]); }, [onFile]);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv'],
    },
  });
  return (
    <Box {...getRootProps()} sx={{
      border: `2px dashed ${isDragActive ? GOLD : theme.palette.divider}`,
      borderRadius: 2.5,
      p: { xs: 4, md: 6 },
      textAlign: 'center',
      cursor: 'pointer',
      bgcolor: isDragActive ? `${GOLD}08` : dark ? 'rgba(255,255,255,0.02)' : '#fafafa',
      transition: 'all 0.15s',
      '&:hover': { borderColor: GOLD, bgcolor: `${GOLD}06` },
    }}>
      <input {...getInputProps()} />
      <UploadIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1.5 }} />
      {file ? (
        <Typography sx={{ fontSize: 13, color: GOLD, fontWeight: 600 }}>{file.name || file.original_filename}</Typography>
      ) : (
        <>
          <Typography sx={{ fontSize: 14, fontWeight: 600, mb: 0.5 }}>
            Upload official budget document (optional)
          </Typography>
          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
            XLSX, CSV, PDF — attach the funder-approved budget if available
          </Typography>
        </>
      )}
    </Box>
  );
}


const DEFAULT_FORM = {
  title: '', shortTitle: '', researchArea: '', projectType: 'contract_research',
  projectCode: '', leadInstitution: '', department: '',
  startDate: '', endDate: '',
  involvesHumanSubjects: false, involvesAnimalSubjects: false,
  involvesSensitiveData: false, isClinicalTrial: false, usesHazardousMaterials: false,
  projectAbstract: '', backgroundRationale: '', problemStatement: '',
  researchObjectives: [], researchMethodology: '', researchDesign: '', targetPopulation: '',
  researchKeywords: [],
  description: '', background: '', methodology: '', impactStatement: '',
  ethicsMode: 'upload',
  linkedEthicsId: '', conflictOfInterest: '', ethicsDocType: 'ethics_clearance',
  dmpMode: 'upload',
  dmpTypesOfData: '', dmpEstimatedVolume: '', dmpDataFormats: '',
  dmpPrimaryStorage: '', dmpBackupProcedure: '', dmpAccessControls: '',
  dmpRetentionPeriod: '', dmpSharingPlan: '', dmpRepository: '',
  dmpLinkedDocumentId: '',
  fundingSource: '', totalAward: '', currency: 'KES', grantType: '',
  financialOverheadRate: '', financialNotes: '',
  declarations: { ...DEFAULT_DECLARATIONS },
  declarationDate: '',
  piFullName: '', piTitle: '', piEmail: '', piPhone: '',
  piInstitution: '', piDepartment: '', piOrcid: '', piStaffId: '',
};

export default function ProjectSetupPage() {
  const router = useRouter();
  const { id } = useParams();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';

  const [loading, setLoading]       = useState(true);
  const [activeStep, setActiveStep] = useState(0);
  const [saving, setSaving]         = useState(false);
  const [uploading, setUploading]   = useState(false);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState('');
  const [project, setProject]       = useState(null);
  const [awardData, setAwardData]   = useState(null);
  const [budgetData, setBudgetData] = useState(null);
  const [myEthicsApps, setMyEthicsApps] = useState([]);
  const [dmpLibrary, setDmpLibrary] = useState([]);
  const [memberOpen, setMemberOpen] = useState(false);
  const [memberDefaultRole, setMemberDefaultRole] = useState('co_investigator');
  const [pendingEthicsFile, setPendingEthicsFile] = useState(null);
  const [pendingDmpFile, setPendingDmpFile]       = useState(null);
  const [pendingBudgetFile, setPendingBudgetFile] = useState(null);
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [keywordInput, setKeywordInput] = useState('');

  const set = (f, v) => setFormData(p => ({ ...p, [f]: v }));

  useEffect(() => {
    fetchUser().then(u => { if (!u) router.push('/login'); else loadProject(); });
  }, [id]);

  const loadDraft = (projectId) => {
    try {
      const raw = sessionStorage.getItem(draftKey(projectId));
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };

  const saveDraftLocal = (projectId, data) => {
    sessionStorage.setItem(draftKey(projectId), JSON.stringify(data));
  };

  useEffect(() => {
    if (!id || loading || !project) return undefined;
    const timer = setTimeout(() => saveDraftLocal(id, formData), 600);
    return () => clearTimeout(timer);
  }, [formData, id, loading, project]);

  const buildFormFromProject = (p, me, draft = {}) => ({
    ...DEFAULT_FORM,
    ...draft,
    title: draft.title ?? p.title ?? '',
    projectCode: draft.projectCode ?? p.project_code ?? '',
    projectType: draft.projectType ?? p.project_type ?? 'contract_research',
    shortTitle: draft.shortTitle ?? p.short_title ?? '',
    researchArea: draft.researchArea ?? p.research_area ?? '',
    leadInstitution: draft.leadInstitution ?? p.lead_institution ?? me?.institution?.name ?? '',
    department: draft.department ?? p.department ?? me?.department ?? '',
    startDate: draft.startDate ?? toInputDate(p.start_date),
    endDate: draft.endDate ?? toInputDate(p.end_date),
    involvesHumanSubjects: draft.involvesHumanSubjects ?? !!p.involves_human_subjects,
    involvesAnimalSubjects: draft.involvesAnimalSubjects ?? !!p.involves_animal_subjects,
    involvesSensitiveData: draft.involvesSensitiveData ?? !!p.involves_sensitive_data,
    isClinicalTrial: draft.isClinicalTrial ?? !!p.is_clinical_trial,
    usesHazardousMaterials: draft.usesHazardousMaterials ?? !!p.uses_hazardous_materials,
    projectAbstract: draft.projectAbstract ?? p.project_abstract ?? p.description ?? '',
    backgroundRationale: draft.backgroundRationale ?? p.background_rationale ?? '',
    problemStatement: draft.problemStatement ?? p.problem_statement ?? '',
    researchMethodology: draft.researchMethodology ?? p.research_methodology ?? '',
    researchDesign: draft.researchDesign ?? p.research_design ?? '',
    targetPopulation: draft.targetPopulation ?? p.target_population ?? '',
    researchKeywords: draft.researchKeywords ?? parseJsonList(p.research_keywords),
    researchObjectives: (draft.researchObjectives ?? parseJsonList(p.research_objectives)).map(normalizeObjective),
    description: draft.description ?? p.project_abstract ?? p.description ?? '',
    background: draft.background ?? p.background_rationale ?? '',
    methodology: draft.methodology ?? p.research_methodology ?? '',
    piFullName: draft.piFullName ?? p.pi_full_name ?? p.pi_name ?? me?.name ?? '',
    piTitle: draft.piTitle ?? p.pi_academic_title ?? me?.job_title ?? '',
    piEmail: draft.piEmail ?? p.pi_email ?? me?.email ?? '',
    piPhone: draft.piPhone ?? p.pi_phone ?? me?.phone ?? '',
    piInstitution: draft.piInstitution ?? p.lead_institution ?? me?.institution?.name ?? '',
    piDepartment: draft.piDepartment ?? p.department ?? me?.department ?? '',
    piOrcid: draft.piOrcid ?? p.pi_orcid ?? me?.orcid_id ?? '',
    piStaffId: draft.piStaffId ?? p.pi_staff_id ?? '',
    dmpMode: draft.dmpMode ?? p.dmp_entry_mode ?? 'upload',
    dmpTypesOfData: draft.dmpTypesOfData ?? p.dmp_types_of_data ?? '',
    dmpEstimatedVolume: draft.dmpEstimatedVolume ?? p.dmp_estimated_volume ?? '',
    dmpDataFormats: draft.dmpDataFormats ?? p.dmp_data_formats ?? '',
    dmpPrimaryStorage: draft.dmpPrimaryStorage ?? p.dmp_primary_storage ?? '',
    dmpBackupProcedure: draft.dmpBackupProcedure ?? p.dmp_backup_procedure ?? '',
    dmpAccessControls: draft.dmpAccessControls ?? p.dmp_access_controls ?? '',
    dmpRetentionPeriod: draft.dmpRetentionPeriod ?? p.dmp_retention_period ?? '',
    dmpSharingPlan: draft.dmpSharingPlan ?? p.dmp_sharing_plan ?? '',
    dmpRepository: draft.dmpRepository ?? p.dmp_repository ?? '',
    dmpLinkedDocumentId: draft.dmpLinkedDocumentId ?? p.dmp_linked_document_id ?? '',
    financialOverheadRate: draft.financialOverheadRate ?? p.financial_overhead_rate ?? '',
    financialNotes: draft.financialNotes ?? p.financial_notes ?? '',
    currency: draft.currency ?? p.reporting_currency ?? 'KES',
    conflictOfInterest: draft.conflictOfInterest ?? p.conflict_of_interest ?? '',
    declarations: {
      ...DEFAULT_DECLARATIONS,
      ...(draft.declarations || {}),
      ...(p.declaration_responses || {}),
    },
    declarationDate: draft.declarationDate ?? toInputDate(p.declaration_date) ?? '',
  });

  const fetchProjectBundle = async () => {
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };
    const [projRes, ethicsRes, meRes, dmpDocsRes] = await Promise.all([
      axios.get(`${API}/research/projects/${id}`, { headers }),
      axios.get(`${API}/research/ethics/my`, { headers }).catch(() => ({ data: [] })),
      axios.get(`${API}/auth/me`, { headers }).catch(() => ({ data: null })),
      axios.get(`${API}/research/projects/my/dmp-documents`, { headers }).catch(() => ({ data: [] })),
    ]);
    return {
      p: projRes.data,
      me: meRes.data,
      ethics: ethicsRes.data || [],
      dmpDocs: dmpDocsRes.data || [],
    };
  };

  const loadAwardData = async (p, hydrateForm = false) => {
    if (!p.award_id) {
      setAwardData(null);
      setBudgetData(null);
      return;
    }
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      const [awardRes, budgetRes] = await Promise.all([
        axios.get(`${API}/grants/awards/${p.award_id}`, { headers }),
        axios.get(`${API}/grants/awards/${p.award_id}/budget`, { headers }),
      ]);
      setAwardData(awardRes.data);
      setBudgetData(budgetRes.data);
      if (hydrateForm) {
        setFormData(prev => ({
          ...prev,
          fundingSource: awardRes.data.funder_name || prev.fundingSource,
          totalAward: awardRes.data.total_amount || prev.totalAward,
          currency: awardRes.data.currency || prev.currency,
        }));
      }
    } catch {
      setAwardData(null);
      setBudgetData(null);
    }
  };

  const applyProjectBundle = async ({ p, me, ethics, dmpDocs }, { hydrateForm = false } = {}) => {
    if (p.status && p.status !== 'draft') {
      router.replace(`/researcher/projects/${id}`);
      return false;
    }
    setProject(p);
    setMyEthicsApps(ethics);
    setDmpLibrary(dmpDocs);
    if (hydrateForm) {
      const draft = loadDraft(id);
      setFormData(buildFormFromProject(p, me, draft));
      await loadAwardData(p, true);
    } else {
      await loadAwardData(p, false);
    }
    return true;
  };

  const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

  const seedProposalTeamIfNeeded = async (p) => {
    if (!p?.award_id || p.status !== 'draft') return false;
    try {
      const res = await axios.post(
        `${API}/research/projects/${id}/members/seed-from-proposal`,
        {},
        { headers: authHeaders() },
      );
      return (res.data?.added || 0) > 0;
    } catch {
      return false;
    }
  };

  const loadProject = async () => {
    try {
      setLoading(true);
      let bundle = await fetchProjectBundle();
      const seeded = await seedProposalTeamIfNeeded(bundle.p);
      if (seeded) {
        bundle = await fetchProjectBundle();
      }
      await applyProjectBundle(bundle, { hydrateForm: true });
    } catch {
      setError('Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  const refreshProject = async () => {
    try {
      const bundle = await fetchProjectBundle();
      await applyProjectBundle(bundle, { hydrateForm: false });
    } catch {
      setError('Failed to refresh project data');
    }
  };

  const uploadProjectDocument = async (file, documentType) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('document_type', documentType);
    await axios.post(`${API}/research/projects/${id}/documents`, fd, {
      headers: { ...authHeaders(), 'Content-Type': 'multipart/form-data' },
    });
    await refreshProject();
  };

  const buildProjectPayload = () => ({
    title: formData.title,
    description: formData.projectAbstract || null,
    project_type: formData.projectType,
    short_title: formData.shortTitle || null,
    research_area: formData.researchArea || null,
    start_date: formData.startDate ? new Date(formData.startDate).toISOString() : null,
    end_date: formData.endDate ? new Date(formData.endDate).toISOString() : null,
    involves_human_subjects: formData.involvesHumanSubjects,
    involves_animal_subjects: formData.involvesAnimalSubjects,
    involves_sensitive_data: formData.involvesSensitiveData,
    is_clinical_trial: formData.isClinicalTrial,
    uses_hazardous_materials: formData.usesHazardousMaterials,
    pi_full_name: formData.piFullName || null,
    pi_academic_title: formData.piTitle || null,
    pi_email: formData.piEmail || null,
    pi_phone: formData.piPhone || null,
    pi_orcid: formData.piOrcid?.trim() || null,
    pi_staff_id: formData.piStaffId || null,
    lead_institution: formData.piInstitution || formData.leadInstitution || null,
    department: formData.piDepartment || formData.department || null,
    project_abstract: formData.projectAbstract || null,
    background_rationale: formData.backgroundRationale || null,
    problem_statement: formData.problemStatement || null,
    research_methodology: formData.researchMethodology || null,
    research_design: formData.researchDesign || null,
    target_population: formData.targetPopulation || null,
    research_keywords: formData.researchKeywords || [],
    research_objectives: (formData.researchObjectives || []).filter(hasObjectiveContent),
    dmp_entry_mode: formData.dmpMode || 'upload',
    dmp_types_of_data: formData.dmpTypesOfData || null,
    dmp_estimated_volume: formData.dmpEstimatedVolume || null,
    dmp_data_formats: formData.dmpDataFormats || null,
    dmp_primary_storage: formData.dmpPrimaryStorage || null,
    dmp_backup_procedure: formData.dmpBackupProcedure || null,
    dmp_access_controls: formData.dmpAccessControls || null,
    dmp_retention_period: formData.dmpRetentionPeriod || null,
    dmp_sharing_plan: formData.dmpSharingPlan || null,
    dmp_repository: formData.dmpRepository || null,
    dmp_linked_document_id: formData.dmpLinkedDocumentId || null,
    financial_overhead_rate: formData.financialOverheadRate || null,
    financial_notes: formData.financialNotes || null,
    reporting_currency: formData.currency || 'KES',
    conflict_of_interest: formData.conflictOfInterest || null,
    declaration_responses: formData.declarations || null,
    declaration_date: formData.declarationDate ? new Date(formData.declarationDate).toISOString() : null,
  });

  const addObjective = () => {
    setFormData(p => ({
      ...p,
      researchObjectives: [...(p.researchObjectives || []), { title: '', description: '', outcome: '' }],
    }));
  };

  const updateObjective = (index, field, value) => {
    setFormData(p => ({
      ...p,
      researchObjectives: p.researchObjectives.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const removeObjective = (index) => {
    setFormData(p => ({
      ...p,
      researchObjectives: p.researchObjectives.filter((_, i) => i !== index),
    }));
  };

  const addKeyword = () => {
    const keyword = keywordInput.trim();
    if (!keyword) return;
    if (formData.researchKeywords.includes(keyword)) {
      setKeywordInput('');
      return;
    }
    setFormData(p => ({ ...p, researchKeywords: [...(p.researchKeywords || []), keyword] }));
    setKeywordInput('');
  };

  const removeKeyword = (keyword) => {
    setFormData(p => ({
      ...p,
      researchKeywords: p.researchKeywords.filter(k => k !== keyword),
    }));
  };

  const handleSaveDraft = async () => {
    try {
      setSaving(true);
      setError('');
      saveDraftLocal(id, formData);
      await axios.patch(`${API}/research/projects/${id}`, {
        ...buildProjectPayload(),
        status: 'draft',
      }, { headers: authHeaders() });
      setProject(p => (p ? { ...p, status: 'draft' } : p));
      setSuccess('Draft saved');
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to save draft');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    const allSigned = Object.values(formData.declarations || {}).every(Boolean);
    const signOffComplete = allSigned && !!formData.piFullName?.trim() && !!formData.declarationDate;
    if (!signOffComplete) {
      setError('Complete all declarations and PI sign-off before submitting.');
      return;
    }
    try {
      setSaving(true);
      setError('');
      saveDraftLocal(id, formData);
      if (pendingEthicsFile) await uploadProjectDocument(pendingEthicsFile, formData.ethicsDocType);
      if (pendingDmpFile) await uploadProjectDocument(pendingDmpFile, 'data_management_plan');
      if (pendingBudgetFile) await uploadProjectDocument(pendingBudgetFile, 'budget');
      await axios.patch(`${API}/research/projects/${id}`, {
        ...buildProjectPayload(),
        status: 'proposed',
      }, { headers: authHeaders() });
      setSuccess('Project submitted for review');
      setTimeout(() => router.push(`/researcher/projects/${id}`), 1500);
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to submit project');
    } finally {
      setSaving(false);
    }
  };

  const uploadEthicsDocNow = async () => {
    if (!pendingEthicsFile) return;
    try {
      setUploading(true);
      await uploadProjectDocument(pendingEthicsFile, formData.ethicsDocType);
      setPendingEthicsFile(null);
      setSuccess('Ethics document uploaded');
    } catch {
      setError('Failed to upload ethics document');
    } finally {
      setUploading(false);
    }
  };

  const uploadDmpNow = async () => {
    if (!pendingDmpFile) return;
    try {
      setUploading(true);
      await uploadProjectDocument(pendingDmpFile, 'data_management_plan');
      setPendingDmpFile(null);
      setSuccess('DMP document uploaded');
      const dmpDocsRes = await axios.get(`${API}/research/projects/my/dmp-documents`, { headers: authHeaders() });
      setDmpLibrary(dmpDocsRes.data || []);
    } catch {
      setError('Failed to upload DMP');
    } finally {
      setUploading(false);
    }
  };

  const uploadBudgetNow = async () => {
    if (!pendingBudgetFile) return;
    try {
      setUploading(true);
      await uploadProjectDocument(pendingBudgetFile, 'budget');
      setPendingBudgetFile(null);
      setSuccess('Budget document uploaded');
    } catch {
      setError('Failed to upload budget');
    } finally {
      setUploading(false);
    }
  };

  const addMilestone = async (data) => {
    const res = await axios.post(`${API}/research/projects/${id}/milestones`, data, { headers: authHeaders() });
    setProject(p => ({ ...p, milestones: [...(p.milestones || []), res.data] }));
    return res.data;
  };

  const updateMilestone = async (milestoneId, data) => {
    try {
      await axios.patch(`${API}/research/projects/${id}/milestones/${milestoneId}`, data, { headers: authHeaders() });
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to save milestone');
      await refreshProject();
    }
  };

  const deleteMilestone = async (milestoneId) => {
    await axios.delete(`${API}/research/projects/${id}/milestones/${milestoneId}`, { headers: authHeaders() });
    setProject(p => ({ ...p, milestones: (p.milestones || []).filter(m => m.id !== milestoneId) }));
  };

  const addDeliverable = async (data) => {
    const res = await axios.post(`${API}/research/projects/${id}/deliverables`, data, { headers: authHeaders() });
    setProject(p => ({ ...p, deliverables: [...(p.deliverables || []), res.data] }));
    return res.data;
  };

  const updateDeliverable = async (deliverableId, data) => {
    try {
      await axios.patch(`${API}/research/projects/${id}/deliverables/${deliverableId}`, data, { headers: authHeaders() });
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to save deliverable');
      await refreshProject();
    }
  };

  const deleteDeliverable = async (deliverableId) => {
    await axios.delete(`${API}/research/projects/${id}/deliverables/${deliverableId}`, { headers: authHeaders() });
    setProject(p => ({ ...p, deliverables: (p.deliverables || []).filter(d => d.id !== deliverableId) }));
  };

  const createProjectTeam = async (payload) => {
    const res = await axios.post(`${API}/research/projects/${id}/teams`, payload, { headers: authHeaders() });
    await refreshProject();
    return res.data;
  };

  const addBudgetLine = async (data) => {
    const res = await axios.post(`${API}/research/projects/${id}/budget-lines`, data, { headers: authHeaders() });
    setProject(p => ({ ...p, budget_lines: [...(p.budget_lines || []), res.data] }));
  };

  const updateBudgetLine = async (lineId, data) => {
    try {
      await axios.patch(`${API}/research/projects/${id}/budget-lines/${lineId}`, data, { headers: authHeaders() });
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to save budget line');
      await refreshProject();
    }
  };

  const deleteBudgetLine = async (lineId) => {
    await axios.delete(`${API}/research/projects/${id}/budget-lines/${lineId}`, { headers: authHeaders() });
    setProject(p => ({ ...p, budget_lines: (p.budget_lines || []).filter(l => l.id !== lineId) }));
  };

  const inviteMembers = async (invitees) => {
    let sent = 0;
    const failures = [];
    for (const data of invitees) {
      try {
        await axios.post(`${API}/research/projects/${id}/members`, data, { headers: authHeaders() });
        sent += 1;
      } catch (e) {
        const label = data.name || data.email || 'Unknown';
        failures.push(`${label}: ${e.response?.data?.detail || 'failed'}`);
      }
    }
    await refreshProject();
    if (failures.length) {
      throw new Error(
        sent > 0
          ? `Sent ${sent} invitation(s). Some failed: ${failures.join('; ')}`
          : failures.join('; ')
      );
    }
    setSuccess(`Sent ${sent} team invitation${sent !== 1 ? 's' : ''} — notifications dispatched`);
  };

  const removeMember = async (memberId) => {
    await axios.delete(`${API}/research/projects/${id}/members/${memberId}`, { headers: authHeaders() });
    setProject(p => ({ ...p, members: p.members.filter(m => m.id !== memberId) }));
  };

  const progress = Math.round(((activeStep + 1) / STEPS.length) * 100);
  const duration = formData.startDate && formData.endDate
    ? Math.round((new Date(formData.endDate) - new Date(formData.startDate)) / (1000 * 60 * 60 * 24 * 30))
    : 0;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, minHeight: 0 }}>
        <CircularProgress sx={{ color: ACCENT }} />
      </Box>
    );
  }

  if (!project) {
    return <Box sx={{ p: 4 }}><Alert severity="error">Project not found</Alert></Box>;
  }

  const milestones = project.milestones || [];
  const deliverables = project.deliverables || [];
  const planTeams = project.teams || [];
  const members = project.members || [];
  const ethicsApps = project.ethics_applications || [];
  const documents = project.documents || [];
  const ethicsDocs = documents.filter(d => ETHICS_DOC_TYPES.includes(d.document_type) || d.document_type?.includes('ethics'));
  const dmpDocs = documents.filter(d => d.document_type === 'data_management_plan');
  const budgetDocs = documents.filter(d => d.document_type === 'budget');

  const planIndividuals = buildPlanIndividuals(project, members, formData.piFullName);

  const projectBudgetLines = project.budget_lines || [];
  const awardedBudget = Number(awardData?.total_amount || formData.totalAward || 0);
  const totalPlanned = projectBudgetLines.reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const unallocatedBudget = awardedBudget - totalPlanned;
  const currency = formData.currency || awardData?.currency || project.reporting_currency || 'KES';
  const funderLabel = awardData?.funder_name || formData.fundingSource || 'the funder';

  const allDeclarationsSigned = Object.values(formData.declarations || {}).every(Boolean);
  const declarationsSignedOff = allDeclarationsSigned
    && !!formData.piFullName?.trim()
    && !!formData.declarationDate;

  const submissionChecklistStatus = {
    context: !!(formData.title?.trim() && formData.projectType && formData.startDate && formData.endDate),
    team: !!(formData.piFullName?.trim() && formData.piEmail?.trim()),
    research: !!(stripHtml(formData.projectAbstract) && stripHtml(formData.problemStatement)),
    plan: milestones.length > 0 || deliverables.length > 0,
    ethics: ethicsDocs.length > 0 || ethicsApps.length > 0 || !!formData.linkedEthicsId || !!stripHtml(formData.conflictOfInterest),
    dmp: dmpDocs.length > 0
      || (formData.dmpMode === 'attach' && !!formData.dmpLinkedDocumentId)
      || (formData.dmpMode === 'form' && !!stripHtml(formData.dmpTypesOfData)),
    financial: projectBudgetLines.length > 0 || budgetDocs.length > 0 || !!pendingBudgetFile,
    declarations: declarationsSignedOff,
  };
  const submissionCompleteCount = SUBMISSION_CHECKLIST.filter(item => submissionChecklistStatus[item.key]).length;

  const complianceDeclarations = [
    {
      key: 'research_integrity',
      title: 'Research Integrity',
      description: 'I confirm that this research will be conducted in accordance with the highest standards of research integrity, honesty, and rigour.',
    },
    {
      key: 'conflict_of_interest',
      title: 'Conflict of Interest',
      description: 'I declare that there are no actual or perceived conflicts of interest that could influence the conduct or reporting of this research.',
    },
    {
      key: 'data_protection',
      title: 'Data Protection',
      description: 'I confirm that data activities in this project will comply with applicable data protection laws and institutional policies.',
    },
    {
      key: 'funder_compliance',
      title: 'Funder Compliance',
      description: `I agree to comply with all conditions, guidelines, and reporting requirements of the funder (${funderLabel}).`,
    },
    {
      key: 'institutional_approval',
      title: 'Institutional Approval',
      description: 'I confirm this project has received or is in the process of receiving necessary institutional approvals.',
    },
    {
      key: 'ethics_compliance',
      title: 'Ethics Compliance',
      description: 'I confirm appropriate ethics review and approval will be obtained before any data collection involving human subjects.',
    },
    {
      key: 'originality',
      title: 'Originality Declaration',
      description: 'I confirm this project and all associated deliverables represent original work that does not infringe on third-party intellectual property.',
    },
  ];

  const toggleDeclaration = (key) => {
    setFormData(p => ({
      ...p,
      declarations: { ...p.declarations, [key]: !p.declarations?.[key] },
    }));
  };

  const step1 = (
    <Box>
      <SectionHeader icon={ProjectIcon} title="Project Context"
        subtitle="Define the foundational project identity linked to your awarded grant." />

      {awardData && (
        <>
          <SubLabel label="1.1 Award Reference" />
          <Paper elevation={0} sx={{
            mb: 2.5, p: 2, borderRadius: 2.5,
            background: dark ? 'linear-gradient(135deg,#78350f18,#92400e18)' : 'linear-gradient(135deg,#fffbeb,#fef3c7)',
            border: `1px solid ${GOLD}44`,
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              <TrophyIcon sx={{ fontSize: 18, color: GOLD }} />
              <Typography sx={{ fontSize: 11, color: GOLD, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Linked Award</Typography>
            </Box>
            <Typography sx={{ fontSize: 14, fontWeight: 800, mb: 0.5 }}>{awardData.proposal_title || project.title}</Typography>
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
              {awardData.funder_name} · {currency} {Number(awardData.total_amount || 0).toLocaleString()} · {awardData.award_number}
            </Typography>
          </Paper>
        </>
      )}

      <SubLabel label={awardData ? '1.2 Project Identity' : '1.1 Project Identity'} />
      <FieldRow>
        <TextField size="small" label="Project Title *" value={formData.title}
          onChange={e => set('title', e.target.value)} sx={{ flex: '1 1 100%', ...inp }} />
      </FieldRow>
      <FieldRow>
        <TextField size="small" label="Project Code" value={formData.projectCode || project.project_code || ''}
          disabled sx={{ flex: '1 1 200px', ...inp }} />
        <Box sx={{ flex: '1 1 220px', display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
          <FormControl sx={{ flex: 1, ...inp }}>
            <InputLabel size="small">Project Type *</InputLabel>
            <Select size="small" value={formData.projectType} label="Project Type *"
              onChange={e => set('projectType', e.target.value)}>
              {PROJECT_TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
            </Select>
          </FormControl>
          <Chip
            label={project.status?.replace(/_/g, ' ') || 'Active'}
            size="small"
            sx={{ mt: 1, fontWeight: 700, fontSize: 11, bgcolor: '#10b98122', color: '#10b981', textTransform: 'capitalize' }}
          />
        </Box>
      </FieldRow>
      <FieldRow>
        <TextField size="small" label="Lead Institution" value={formData.leadInstitution}
          onChange={e => set('leadInstitution', e.target.value)} placeholder="e.g. University of Nairobi"
          sx={{ flex: '1 1 280px', ...inp }} />
        <TextField size="small" label="Department / Faculty" value={formData.department}
          onChange={e => set('department', e.target.value)} placeholder="e.g. School of Business"
          sx={{ flex: '1 1 280px', ...inp }} />
      </FieldRow>

      <Divider sx={{ my: 2.5 }} />
      <SubLabel label={awardData ? '1.3 Project Timeline' : '1.2 Project Timeline'} />
      <FieldRow>
        <TextField size="small" label="Start Date *" type="date" value={formData.startDate}
          onChange={e => set('startDate', e.target.value)} InputLabelProps={{ shrink: true }} sx={{ flex: '1 1 180px', ...inp }} />
        <TextField size="small" label="End Date *" type="date" value={formData.endDate}
          onChange={e => set('endDate', e.target.value)} InputLabelProps={{ shrink: true }} sx={{ flex: '1 1 180px', ...inp }} />
        <TextField size="small" label="Duration" disabled
          value={duration > 0 ? `${duration} months` : 'Auto-calculated'} sx={{ flex: '0 1 160px', ...inp }} />
      </FieldRow>

      <Divider sx={{ my: 2.5 }} />
      <SubLabel label={awardData ? '1.4 Project Flags' : '1.3 Project Flags'} />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {PROJECT_FLAGS.map(({ field, label }) => (
          <FormControlLabel
            key={field}
            control={
              <Checkbox checked={formData[field]} onChange={e => set(field, e.target.checked)}
                sx={{ color: ACCENT, '&.Mui-checked': { color: ACCENT } }} />
            }
            label={<Typography sx={{ fontSize: 13 }}>{label}</Typography>}
          />
        ))}
      </Box>
    </Box>
  );

  const coInvestigators = members.filter(m => CO_INVESTIGATOR_ROLES.includes(m.role));
  const supportStaff = members.filter(m => SUPPORT_STAFF_ROLES.includes(m.role));
  const otherMembers = members.filter(m =>
    !CO_INVESTIGATOR_ROLES.includes(m.role) && !SUPPORT_STAFF_ROLES.includes(m.role)
  );

  const renderMemberRow = (m) => (
    <Box key={m.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
      <Avatar sx={{ width: 32, height: 32, fontSize: 12, bgcolor: m.user_id ? '#8b5cf6' : ACCENT }}>
        {(m.user_name || m.invited_email || '?')[0].toUpperCase()}
      </Avatar>
      <Box sx={{ flex: 1 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{m.user_name || m.invited_name || m.invited_email}</Typography>
        <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>
          {m.invited_email}
          {m.user_id ? ' · Registered researcher' : ' · External (ORCID)'}
        </Typography>
        <Typography sx={{ fontSize: 11, color: 'text.disabled', textTransform: 'capitalize' }}>
          {m.role?.replace(/_/g, ' ')} · {m.status}
        </Typography>
      </Box>
      <IconButton size="small" onClick={() => removeMember(m.id)}><DeleteIcon sx={{ fontSize: 15 }} /></IconButton>
    </Box>
  );

  const openMemberInvite = (defaultRole) => {
    setMemberDefaultRole(defaultRole);
    setMemberOpen(true);
  };

  const step2 = (
    <Box>
      <SectionHeader icon={TeamIcon} title="Research Team"
        subtitle={awardData
          ? 'Proposal team members are preloaded below. Add or remove members as needed.'
          : 'Define the principal investigator and all team members involved in this project.'} />

      <SubLabel label="2.1 Principal Investigator" />
      <Paper elevation={0} sx={{ mb: 2.5, p: 2.5, borderRadius: 2.5, bgcolor: dark ? 'rgba(255,255,255,0.02)' : '#fff', border: '1px solid', borderColor: 'divider' }}>
        <FieldRow>
          <TextField size="small" required label="Full Name" value={formData.piFullName}
            onChange={e => set('piFullName', e.target.value)} placeholder="Prof. / Dr. Full Name"
            sx={{ flex: '1 1 280px', ...inp }} />
          <FormControl sx={{ flex: '1 1 160px', ...inp }}>
            <InputLabel size="small">Title</InputLabel>
            <Select size="small" value={formData.piTitle} label="Title"
              onChange={e => set('piTitle', e.target.value)} displayEmpty>
              <MenuItem value=""><em>Select title</em></MenuItem>
              {PI_ACADEMIC_TITLES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </Select>
          </FormControl>
        </FieldRow>
        <FieldRow>
          <TextField size="small" required label="Email" type="email" value={formData.piEmail}
            onChange={e => set('piEmail', e.target.value)} placeholder="pi@institution.ac.ke"
            sx={{ flex: '1 1 260px', ...inp }} />
          <TextField size="small" label="Phone" value={formData.piPhone}
            onChange={e => set('piPhone', e.target.value)} placeholder="+254 7XX XXX XXX"
            sx={{ flex: '1 1 200px', ...inp }} />
        </FieldRow>
        <FieldRow>
          <TextField size="small" label="Institution" value={formData.piInstitution}
            onChange={e => { set('piInstitution', e.target.value); set('leadInstitution', e.target.value); }}
            placeholder="Lead Institution" sx={{ flex: '1 1 260px', ...inp }} />
          <TextField size="small" label="Department" value={formData.piDepartment}
            onChange={e => { set('piDepartment', e.target.value); set('department', e.target.value); }}
            placeholder="Department" sx={{ flex: '1 1 260px', ...inp }} />
        </FieldRow>
        <FieldRow>
          <TextField size="small" label="ORCID ID" value={formData.piOrcid}
            onChange={e => set('piOrcid', e.target.value)} placeholder="0000-0002-1825-0097"
            helperText="Optional — e.g. 0000-0002-1825-0097"
            sx={{ flex: '1 1 260px', ...inp }} />
          <TextField size="small" label="Staff / Employee ID" value={formData.piStaffId}
            onChange={e => set('piStaffId', e.target.value)} placeholder="Institutional ID"
            sx={{ flex: '1 1 260px', ...inp }} />
        </FieldRow>
      </Paper>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        <SubLabel label="2.2 Co-Investigators" />
        <Button size="small" variant="outlined" startIcon={<AddIcon />}
          onClick={() => openMemberInvite('co_investigator')}
          sx={{ textTransform: 'none', fontSize: 12, borderRadius: 2, mb: 1.5, borderColor: ACCENT, color: ACCENT }}>
          Add Co-Investigator
        </Button>
      </Box>
      {coInvestigators.length === 0 && otherMembers.length === 0 ? (
        <Box sx={{ p: 3, mb: 2.5, textAlign: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: 2.5 }}>
          <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>No co-investigators added yet.</Typography>
        </Box>
      ) : (
        <Box sx={{ mb: 2.5 }}>
          {coInvestigators.map(renderMemberRow)}
          {otherMembers.map(renderMemberRow)}
        </Box>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        <SubLabel label="2.3 Research Assistants & Support Staff" />
        <Button size="small" variant="outlined" startIcon={<AddIcon />}
          onClick={() => openMemberInvite('research_assistant')}
          sx={{ textTransform: 'none', fontSize: 12, borderRadius: 2, mb: 1.5, borderColor: ACCENT, color: ACCENT }}>
          Add Team Member
        </Button>
      </Box>
      {supportStaff.length === 0 ? (
        <Box sx={{ p: 3, textAlign: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: 2.5 }}>
          <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>No research assistants or support staff added yet.</Typography>
        </Box>
      ) : supportStaff.map(renderMemberRow)}
    </Box>
  );

  const step3 = (
    <Box>
      <SectionHeader icon={DescIcon} title="Research Details"
        subtitle="Describe the background, objectives, and methodology of the research." />

      <SubLabel label="3.1 Abstract" />
      <RichTextField
        required
        label="Project Abstract"
        value={formData.projectAbstract}
        onChange={v => set('projectAbstract', v)}
        placeholder="Summarise the research project — problem statement, approach, and expected outcomes..."
        helperText="Provide a concise summary (250–500 words)"
        minRows={5}
        showWordCount
      />

      <Divider sx={{ my: 2.5 }} />
      <SubLabel label="3.2 Background & Problem Statement" />
      <RichTextField
        label="Background / Rationale"
        value={formData.backgroundRationale}
        onChange={v => set('backgroundRationale', v)}
        placeholder="Describe the context that motivates this research..."
        minRows={4}
      />
      <RichTextField
        required
        label="Problem Statement"
        value={formData.problemStatement}
        onChange={v => set('problemStatement', v)}
        placeholder="What specific gap or problem does this research address?"
        minRows={4}
      />

      <Divider sx={{ my: 2.5 }} />
      <SubLabel label="3.3 Research Objectives" />
      {(formData.researchObjectives || []).length === 0 ? (
        <Box sx={{ p: 3, mb: 2, textAlign: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: 2.5 }}>
          <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>No objectives added yet.</Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2 }}>
          {formData.researchObjectives.map((obj, index) => (
            <Paper
              key={index}
              elevation={0}
              variant="outlined"
              sx={{ p: 2, borderRadius: 2.5, borderColor: 'divider', position: 'relative' }}
            >
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                <Box sx={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  bgcolor: ACCENT, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700,
                }}>
                  {index + 1}
                </Box>
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField
                    size="small"
                    fullWidth
                    label="Title of Objective"
                    value={obj.title || ''}
                    placeholder={`e.g. Objective ${index + 1} — primary aim of this research strand`}
                    onChange={e => updateObjective(index, 'title', e.target.value)}
                    sx={inp}
                  />
                  <RichTextField
                    label="Short Description"
                    value={obj.description || ''}
                    onChange={v => updateObjective(index, 'description', v)}
                    placeholder="Briefly describe what this objective sets out to achieve..."
                    minRows={3}
                  />
                  <RichTextField
                    label="Expected Outcome"
                    value={obj.outcome || ''}
                    onChange={v => updateObjective(index, 'outcome', v)}
                    placeholder="What measurable or demonstrable outcome is expected when this objective is met?"
                    minRows={3}
                  />
                </Box>
                <IconButton
                  size="small"
                  onClick={() => removeObjective(index)}
                  sx={{ color: '#ef4444', mt: 0.25 }}
                  aria-label="Remove objective"
                >
                  <DeleteIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Box>
            </Paper>
          ))}
        </Box>
      )}
      <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={addObjective}
        sx={{ mb: 2.5, textTransform: 'none', borderRadius: 2, borderColor: ACCENT, color: ACCENT }}>
        Add Objective
      </Button>

      <Divider sx={{ my: 2.5 }} />
      <SubLabel label="3.4 Methodology" />
      <RichTextField
        required
        label="Research Methodology"
        value={formData.researchMethodology}
        onChange={v => set('researchMethodology', v)}
        placeholder="Describe the research design, methods, and analytical approach..."
        minRows={5}
      />
      <FieldRow>
        <FormControl sx={{ flex: '1 1 220px', ...inp }}>
          <InputLabel size="small">Research Design</InputLabel>
          <Select size="small" value={formData.researchDesign} label="Research Design"
            onChange={e => set('researchDesign', e.target.value)} displayEmpty>
            <MenuItem value=""><em>Select type</em></MenuItem>
            {RESEARCH_DESIGNS.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
          </Select>
        </FormControl>
        <TextField size="small" label="Target Population / Sample" value={formData.targetPopulation}
          onChange={e => set('targetPopulation', e.target.value)}
          placeholder="e.g. 200 SME owners in Nairobi CBD"
          sx={{ flex: '1 1 280px', ...inp }} />
      </FieldRow>

      <Divider sx={{ my: 2.5 }} />
      <SubLabel label="3.5 Keywords" />
      <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
        <TextField size="small" fullWidth label="Research Keywords" value={keywordInput}
          onChange={e => setKeywordInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addKeyword(); } }}
          placeholder="Type a keyword..." sx={inp} />
        <Button variant="contained" onClick={addKeyword}
          sx={{ mt: 0.5, bgcolor: ACCENT, textTransform: 'none', borderRadius: 2, px: 3, '&:hover': { bgcolor: '#0e8a85' } }}>
          Add
        </Button>
      </Box>
      <Typography sx={{ fontSize: 11, color: 'text.secondary', mb: 1.5 }}>Press Enter or click Add</Typography>
      {formData.researchKeywords.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {formData.researchKeywords.map(keyword => (
            <Chip key={keyword} label={keyword} size="small" onDelete={() => removeKeyword(keyword)}
              sx={{ bgcolor: `${ACCENT}15`, color: ACCENT, fontWeight: 600 }} />
          ))}
        </Box>
      )}
    </Box>
  );

  const step4 = (
    <Box>
      <SectionHeader icon={MilestoneIcon} title="Project Plan"
        subtitle="Define milestones and deliverables to track project progress." />

      <SubLabel label="4.1 Milestones" />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 1.5 }}>
        {milestones.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: 2.5 }}>
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>No milestones added yet.</Typography>
          </Box>
        ) : milestones.map((m, index) => (
          <Box key={m.id} sx={{
            display: 'flex', gap: 1.5, alignItems: 'flex-start', flexWrap: 'wrap',
            p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2.5,
          }}>
            <TextField size="small" label="Milestone" value={m.title || ''} placeholder={`Milestone ${index + 1}`}
              onChange={e => setProject(p => ({
                ...p,
                milestones: p.milestones.map(x => x.id === m.id ? { ...x, title: e.target.value } : x),
              }))}
              onBlur={e => updateMilestone(m.id, { title: e.target.value.trim() || `Milestone ${index + 1}` })}
              sx={{ flex: '1 1 160px', ...inp }} />
            <TextField size="small" label="Description" value={m.description || ''} placeholder="Brief description"
              onChange={e => setProject(p => ({
                ...p,
                milestones: p.milestones.map(x => x.id === m.id ? { ...x, description: e.target.value } : x),
              }))}
              onBlur={e => updateMilestone(m.id, { description: e.target.value || null })}
              sx={{ flex: '2 1 220px', ...inp }} />
            <TextField size="small" label="Target Date" type="date" InputLabelProps={{ shrink: true }}
              value={toInputDate(m.due_date)}
              onChange={e => {
                const due = e.target.value ? new Date(e.target.value).toISOString() : null;
                setProject(p => ({
                  ...p,
                  milestones: p.milestones.map(x => x.id === m.id ? { ...x, due_date: due } : x),
                }));
                updateMilestone(m.id, { due_date: due });
              }}
              sx={{ flex: '0 1 150px', ...inp }} />
            <FormControl size="small" sx={{ flex: '0 1 140px', ...inp }}>
              <InputLabel>Status</InputLabel>
              <Select value={m.status || 'planned'} label="Status"
                onChange={e => {
                  const status = e.target.value;
                  setProject(p => ({
                    ...p,
                    milestones: p.milestones.map(x => x.id === m.id ? { ...x, status } : x),
                  }));
                  updateMilestone(m.id, { status });
                }}>
                {MILESTONE_STATUSES.map(s => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
              </Select>
            </FormControl>
            <IconButton size="small" onClick={() => deleteMilestone(m.id)} sx={{ mt: 0.5, color: '#ef4444' }}>
              <DeleteIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>
        ))}
      </Box>
      <Button size="small" variant="outlined" startIcon={<AddIcon />}
        onClick={() => addMilestone({ title: `Milestone ${milestones.length + 1}`, status: 'planned' })}
        sx={{ mb: 3, textTransform: 'none', borderRadius: 2, borderColor: ACCENT, color: ACCENT }}>
        Add Milestone
      </Button>

      <Divider sx={{ my: 2.5 }} />
      <SubLabel label="4.2 Deliverables" />
      {deliverables.length === 0 ? (
        <Box sx={{ p: 3, mb: 2, textAlign: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: 2.5 }}>
          <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>No deliverables added yet.</Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2 }}>
          {deliverables.map((d, index) => (
            <Paper key={d.id} elevation={0} variant="outlined" sx={{ p: 2.5, borderRadius: 2.5, position: 'relative' }}>
              <IconButton size="small" onClick={() => deleteDeliverable(d.id)}
                sx={{ position: 'absolute', top: 12, right: 12, color: '#ef4444' }}>
                <DeleteIcon sx={{ fontSize: 18 }} />
              </IconButton>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: ACCENT, mb: 2 }}>
                Deliverable {index + 1}
              </Typography>
              <FieldRow>
                <TextField size="small" required label="Name" value={d.name || ''}
                  placeholder="e.g. Baseline Survey Report"
                  onChange={e => setProject(p => ({
                    ...p,
                    deliverables: p.deliverables.map(x => x.id === d.id ? { ...x, name: e.target.value } : x),
                  }))}
                  onBlur={e => updateDeliverable(d.id, { name: e.target.value.trim() || `Deliverable ${index + 1}` })}
                  sx={{ flex: '1 1 280px', ...inp }} />
                <FormControl size="small" sx={{ flex: '1 1 180px', ...inp }}>
                  <InputLabel>Type</InputLabel>
                  <Select value={d.deliverable_type || ''} label="Type" displayEmpty
                    onChange={e => {
                      const deliverable_type = e.target.value;
                      setProject(p => ({
                        ...p,
                        deliverables: p.deliverables.map(x => x.id === d.id ? { ...x, deliverable_type } : x),
                      }));
                      updateDeliverable(d.id, { deliverable_type: deliverable_type || null });
                    }}>
                    <MenuItem value=""><em>Select type</em></MenuItem>
                    {DELIVERABLE_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                  </Select>
                </FormControl>
              </FieldRow>
              <TextField fullWidth size="small" multiline minRows={3} label="Description / Details"
                value={d.description || ''} placeholder="Describe the deliverable in detail..."
                onChange={e => setProject(p => ({
                  ...p,
                  deliverables: p.deliverables.map(x => x.id === d.id ? { ...x, description: e.target.value } : x),
                }))}
                onBlur={e => updateDeliverable(d.id, { description: e.target.value || null })}
                sx={{ mb: 2.5, ...multilineInp }} />
              <FieldRow>
                <TextField size="small" required label="Due Date" type="date" InputLabelProps={{ shrink: true }}
                  value={toInputDate(d.due_date)}
                  onChange={e => {
                    const due_date = e.target.value ? new Date(e.target.value).toISOString() : null;
                    setProject(p => ({
                      ...p,
                      deliverables: p.deliverables.map(x => x.id === d.id ? { ...x, due_date } : x),
                    }));
                    updateDeliverable(d.id, { due_date });
                  }}
                  sx={{ flex: '1 1 180px', ...inp }} />
                <PlanAssigneeSelect
                  label="Responsible Person / Team"
                  value={assigneeKeyFromDeliverable(d)}
                  individuals={planIndividuals}
                  teams={planTeams}
                  onCreateTeam={createProjectTeam}
                  onChange={key => {
                    const assignee = parseAssigneeKey(key);
                    setProject(p => ({
                      ...p,
                      deliverables: p.deliverables.map(x => x.id === d.id ? { ...x, ...assignee } : x),
                    }));
                    updateDeliverable(d.id, assignee);
                  }}
                  sx={{ flex: '2 1 280px', ...inp }}
                />
              </FieldRow>
              <FieldRow>
                <FormControl size="small" sx={{ flex: '1 1 180px', ...inp }}>
                  <InputLabel>Status</InputLabel>
                  <Select value={d.status || 'pending'} label="Status"
                    onChange={e => {
                      const status = e.target.value;
                      setProject(p => ({
                        ...p,
                        deliverables: p.deliverables.map(x => x.id === d.id ? { ...x, status } : x),
                      }));
                      updateDeliverable(d.id, { status });
                    }}>
                    {DELIVERABLE_STATUSES.map(s => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ flex: '1 1 220px', ...inp }}>
                  <InputLabel>Linked Milestone</InputLabel>
                  <Select value={d.milestone_id || ''} label="Linked Milestone" displayEmpty
                    onChange={e => {
                      const milestone_id = e.target.value || null;
                      setProject(p => ({
                        ...p,
                        deliverables: p.deliverables.map(x => x.id === d.id ? { ...x, milestone_id } : x),
                      }));
                      updateDeliverable(d.id, { milestone_id });
                    }}>
                    <MenuItem value=""><em>None</em></MenuItem>
                    {milestones.map(m => <MenuItem key={m.id} value={m.id}>{m.title}</MenuItem>)}
                  </Select>
                </FormControl>
              </FieldRow>
              {d.responsible_label && (
                <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 1 }}>
                  Assigned to: {d.responsible_label}
                </Typography>
              )}
            </Paper>
          ))}
        </Box>
      )}
      <Button size="small" variant="outlined" startIcon={<AddIcon />}
        onClick={() => addDeliverable({ name: `Deliverable ${deliverables.length + 1}`, status: 'pending' })}
        sx={{ textTransform: 'none', borderRadius: 2, borderColor: ACCENT, color: ACCENT }}>
        Add Deliverable
      </Button>
    </Box>
  );

  const step5 = (
    <Box>
      <SectionHeader icon={EthicsIcon} title="Ethics & Compliance"
        subtitle="Upload documents, attach existing applications, or link internal ethics records." />
      {formData.involvesHumanSubjects && ethicsApps.length === 0 && (
        <Alert severity="warning" sx={{ mb: 2.5, borderRadius: 2 }}>Human subjects research requires ethics approval before data collection.</Alert>
      )}
      <Tabs value={formData.ethicsMode} onChange={(_, v) => set('ethicsMode', v)} sx={{ mb: 2.5, minHeight: 36, '& .MuiTab-root': { minHeight: 36, textTransform: 'none', fontSize: 12 } }}>
        <Tab value="upload" label="Upload Document" icon={<UploadIcon sx={{ fontSize: 14 }} />} iconPosition="start" />
        <Tab value="link" label="Link Internal Application" icon={<LinkIcon sx={{ fontSize: 14 }} />} iconPosition="start" />
      </Tabs>

      {formData.ethicsMode === 'upload' ? (
        <Box>
          <FieldRow>
            <FormControl sx={{ flex: '1 1 220px', ...inp }}>
              <InputLabel size="small">Document Type</InputLabel>
              <Select size="small" value={formData.ethicsDocType} label="Document Type"
                onChange={e => set('ethicsDocType', e.target.value)}>
                <MenuItem value="ethics_clearance">Ethics Clearance</MenuItem>
                <MenuItem value="IRB_protocol">IRB Protocol</MenuItem>
                <MenuItem value="consent_form">Consent Form</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>
          </FieldRow>
          <DropZone label="Upload Ethics Document" file={pendingEthicsFile} onFile={setPendingEthicsFile} />
          {pendingEthicsFile && (
            <Button size="small" variant="outlined" onClick={uploadEthicsDocNow} disabled={uploading}
              sx={{ mt: 1.5, textTransform: 'none', borderRadius: 2 }}>
              {uploading ? 'Uploading…' : 'Upload Now'}
            </Button>
          )}
        </Box>
      ) : (
        <Box>
          <FormControl fullWidth size="small" sx={{ mb: 2, ...inp }}>
            <InputLabel>Link Existing Ethics Application</InputLabel>
            <Select value={formData.linkedEthicsId} label="Link Existing Ethics Application"
              onChange={e => set('linkedEthicsId', e.target.value)}>
              <MenuItem value="">Select application…</MenuItem>
              {myEthicsApps.map(app => (
                <MenuItem key={app.id} value={app.id}>
                  {(app.title || `Application ${app.id.slice(0, 8)}`)} · {app.status?.replace(/_/g, ' ')}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button size="small" variant="outlined" onClick={() => router.push(`/researcher/ethics/new?project=${id}`)}
            sx={{ textTransform: 'none', borderRadius: 2, mr: 1 }}>Create New Application</Button>
        </Box>
      )}

      <Divider sx={{ my: 2.5 }} />
      <SubLabel label="Linked / Uploaded Ethics Records" />
      {[...ethicsApps, ...myEthicsApps.filter(a => a.id === formData.linkedEthicsId && !ethicsApps.find(e => e.id === a.id))].map(e => (
        <Box key={e.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Box>
            <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{e.title || `Application #${e.id.slice(0, 8)}`}</Typography>
            <Typography sx={{ fontSize: 11, color: 'text.disabled', textTransform: 'capitalize' }}>{e.application_type?.replace(/_/g, ' ') || 'Ethics application'}</Typography>
          </Box>
          <Chip label={e.status?.replace(/_/g, ' ')} size="small"
            sx={{ fontSize: 9, fontWeight: 700, textTransform: 'capitalize', bgcolor: ethicsStatusColor(e.status) + '22', color: ethicsStatusColor(e.status) }} />
        </Box>
      ))}
      {ethicsDocs.map(d => (
        <Box key={d.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.75 }}>
          <UploadIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
          <Typography sx={{ fontSize: 12 }}>{d.original_filename}</Typography>
          <Chip label={d.document_type?.replace(/_/g, ' ')} size="small" sx={{ fontSize: 9, height: 18 }} />
        </Box>
      ))}

      <Divider sx={{ my: 2.5 }} />
      <SubLabel label="Conflict of Interest Disclosure" />
      <RichTextField
        label="Conflict of Interest Disclosure"
        value={formData.conflictOfInterest}
        onChange={v => set('conflictOfInterest', v)}
        placeholder="Disclose any financial or personal interests. Enter 'None' if not applicable."
        helperText="Describe any actual or perceived conflicts of interest related to this project."
        minRows={4}
      />
    </Box>
  );

  const step6 = (
    <Box>
      <SectionHeader icon={StorageIcon} title="Data Management Plan"
        subtitle="Outline how research data will be collected, stored, shared, and preserved." />

      <SubLabel label="6.1 DMP Entry Mode" />
      <Paper elevation={0} variant="outlined" sx={{ p: 1, mb: 2.5, borderRadius: 2.5 }}>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {DMP_ENTRY_MODES.map(({ value, label, Icon }) => {
            const active = formData.dmpMode === value;
            return (
              <Button
                key={value}
                size="small"
                variant={active ? 'contained' : 'outlined'}
                startIcon={<Icon sx={{ fontSize: 16 }} />}
                onClick={() => set('dmpMode', value)}
                sx={{
                  flex: '1 1 140px',
                  textTransform: 'none',
                  borderRadius: 2,
                  fontSize: 12,
                  fontWeight: 600,
                  py: 1,
                  bgcolor: active ? ACCENT : 'transparent',
                  color: active ? '#fff' : 'text.primary',
                  borderColor: active ? ACCENT : 'divider',
                  '&:hover': { bgcolor: active ? '#0e8a85' : `${ACCENT}08`, borderColor: ACCENT },
                }}
              >
                {label}
              </Button>
            );
          })}
        </Box>
      </Paper>

      {formData.dmpMode === 'upload' && (
        <Box sx={{ mb: 2.5 }}>
          <DmpUploadZone file={pendingDmpFile} onFile={setPendingDmpFile} />
          {pendingDmpFile && (
            <Button size="small" variant="contained" onClick={uploadDmpNow} disabled={uploading}
              sx={{ mt: 1.5, textTransform: 'none', borderRadius: 2, bgcolor: ACCENT, '&:hover': { bgcolor: '#0e8a85' } }}>
              {uploading ? 'Uploading…' : 'Upload Now'}
            </Button>
          )}
          {dmpDocs.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 600, mb: 1 }}>Uploaded DMP Documents</Typography>
              {dmpDocs.map(d => (
                <Box key={d.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.75 }}>
                  <StorageIcon sx={{ fontSize: 14, color: ACCENT }} />
                  <Typography sx={{ fontSize: 12 }}>{d.original_filename}</Typography>
                  <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>{fmtDate(d.uploaded_at)}</Typography>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      )}

      {formData.dmpMode === 'form' && (
        <Box>
          <SubLabel label="6.2 Data Description" />
          <RichTextField
            required
            label="Types of Data to be Collected"
            value={formData.dmpTypesOfData}
            onChange={v => set('dmpTypesOfData', v)}
            placeholder="e.g. Survey responses, financial transaction records, interview transcripts..."
            minRows={4}
          />
          <FieldRow>
            <TextField size="small" label="Estimated Volume" value={formData.dmpEstimatedVolume}
              onChange={e => set('dmpEstimatedVolume', e.target.value)}
              placeholder="e.g. ~500 MB, 2,000 records"
              sx={{ flex: '1 1 220px', ...inp }} />
            <TextField size="small" label="Data Formats" value={formData.dmpDataFormats}
              onChange={e => set('dmpDataFormats', e.target.value)}
              placeholder="e.g. CSV, SPSS, PDF, Audio"
              sx={{ flex: '1 1 220px', ...inp }} />
          </FieldRow>

          <Divider sx={{ my: 2.5 }} />
          <SubLabel label="6.3 Storage & Security" />
          <FieldRow>
            <FormControl size="small" sx={{ flex: '1 1 220px', ...inp }}>
              <InputLabel>Primary Storage Location</InputLabel>
              <Select value={formData.dmpPrimaryStorage} label="Primary Storage Location" displayEmpty
                onChange={e => set('dmpPrimaryStorage', e.target.value)}>
                <MenuItem value=""><em>Select location</em></MenuItem>
                {DMP_STORAGE_LOCATIONS.map(loc => <MenuItem key={loc} value={loc}>{loc}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField size="small" label="Backup Procedure" value={formData.dmpBackupProcedure}
              onChange={e => set('dmpBackupProcedure', e.target.value)}
              placeholder="e.g. Daily automated backup..."
              sx={{ flex: '1 1 280px', ...inp }} />
          </FieldRow>
          <FieldRow>
            <TextField size="small" label="Access Controls" value={formData.dmpAccessControls}
              onChange={e => set('dmpAccessControls', e.target.value)}
              placeholder="Who has access to the data?"
              sx={{ flex: '1 1 280px', ...inp }} />
            <FormControl size="small" sx={{ flex: '1 1 220px', ...inp }}>
              <InputLabel>Retention Period</InputLabel>
              <Select value={formData.dmpRetentionPeriod} label="Retention Period" displayEmpty
                onChange={e => set('dmpRetentionPeriod', e.target.value)}>
                <MenuItem value=""><em>Select period</em></MenuItem>
                {DMP_RETENTION_PERIODS.map(period => <MenuItem key={period} value={period}>{period}</MenuItem>)}
              </Select>
            </FormControl>
          </FieldRow>

          <Divider sx={{ my: 2.5 }} />
          <SubLabel label="6.4 Sharing & Archiving" />
          <RichTextField
            label="Data Sharing Plan"
            value={formData.dmpSharingPlan}
            onChange={v => set('dmpSharingPlan', v)}
            placeholder="Describe how data will be shared, embargoed, or made publicly available after the project..."
            minRows={4}
          />
          <TextField fullWidth size="small" label="Repository / Archive" value={formData.dmpRepository}
            onChange={e => set('dmpRepository', e.target.value)}
            placeholder="e.g. Zenodo, ICPSR, UKDS"
            sx={{ ...inp }} />
        </Box>
      )}

      {formData.dmpMode === 'attach' && (
        <Paper elevation={0} variant="outlined" sx={{ p: 3, borderRadius: 2.5, mb: 2.5 }}>
          {dmpLibrary.length === 0 ? (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <StorageIcon sx={{ fontSize: 36, color: 'text.disabled', mb: 1 }} />
              <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
                Search and select from previously uploaded DMPs in your document library
              </Typography>
              <Typography sx={{ fontSize: 12, color: 'text.disabled', mt: 0.5 }}>
                No DMP documents found. Upload one using the Upload DMP mode first.
              </Typography>
            </Box>
          ) : (
            <FormControl fullWidth size="small" sx={inp}>
              <InputLabel>Select DMP from Library</InputLabel>
              <Select
                value={formData.dmpLinkedDocumentId}
                label="Select DMP from Library"
                onChange={e => set('dmpLinkedDocumentId', e.target.value)}
              >
                <MenuItem value=""><em>Select a document…</em></MenuItem>
                {dmpLibrary.map(doc => (
                  <MenuItem key={doc.id} value={doc.id}>
                    {doc.original_filename} — {doc.project_title}
                  </MenuItem>
                ))}
              </Select>
              <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 1 }}>
                Search and select from previously uploaded DMPs in your document library
              </Typography>
            </FormControl>
          )}
        </Paper>
      )}
    </Box>
  );

  const step7 = (
    <Box>
      <SectionHeader icon={MoneyIcon} title="Financial"
        subtitle="Upload your budget document and build out the itemised budget plan for this project." />

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
        {[
          {
            label: 'Awarded Budget',
            value: `${currency} ${Number(awardedBudget).toLocaleString()}`,
            sub: awardedBudget > 0 ? `From ${funderLabel}` : 'Set award amount in project context',
            color: '#10b981',
          },
          {
            label: 'Total Planned',
            value: `${currency} ${Number(totalPlanned).toLocaleString()}`,
            sub: `Across ${projectBudgetLines.length} line item${projectBudgetLines.length !== 1 ? 's' : ''}`,
            color: GOLD,
          },
          {
            label: 'Unallocated',
            value: `${currency} ${Number(unallocatedBudget).toLocaleString()}`,
            sub: 'Still to allocate',
            color: unallocatedBudget < 0 ? '#ef4444' : '#10b981',
          },
        ].map(card => (
          <Paper key={card.label} elevation={0} variant="outlined" sx={{ flex: '1 1 180px', p: 2, borderRadius: 2.5 }}>
            <Typography sx={{ fontSize: 10, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.6, mb: 0.75 }}>
              {card.label}
            </Typography>
            <Typography sx={{ fontSize: 20, fontWeight: 800, color: card.color, lineHeight: 1.2 }}>
              {card.value}
            </Typography>
            <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.5 }}>{card.sub}</Typography>
          </Paper>
        ))}
      </Box>

      <SubLabel label="7.1 Budget Document" />
      <BudgetUploadZone file={pendingBudgetFile} onFile={setPendingBudgetFile} />
      {pendingBudgetFile && (
        <Button size="small" variant="contained" onClick={uploadBudgetNow} disabled={uploading}
          sx={{ mt: 1.5, textTransform: 'none', borderRadius: 2, bgcolor: ACCENT, '&:hover': { bgcolor: '#0e8a85' } }}>
          {uploading ? 'Uploading…' : 'Upload Now'}
        </Button>
      )}
      {budgetDocs.length > 0 && (
        <Box sx={{ mt: 2 }}>
          {budgetDocs.map(d => (
            <Box key={d.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.75 }}>
              <MoneyIcon sx={{ fontSize: 14, color: GOLD }} />
              <Typography sx={{ fontSize: 12 }}>{d.original_filename}</Typography>
              <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>{fmtDate(d.uploaded_at)}</Typography>
            </Box>
          ))}
        </Box>
      )}

      <Divider sx={{ my: 2.5 }} />
      <SubLabel label="7.2 Itemised Budget Plan" />
      <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 2 }}>
        Break down the full budget into line items. Actuals will be recorded against these lines as expenditure is submitted during project execution.
      </Typography>
      {projectBudgetLines.length === 0 ? (
        <Box sx={{ p: 3, mb: 2, textAlign: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: 2.5 }}>
          <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>No budget line items added yet.</Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2 }}>
          {projectBudgetLines.map(line => (
            <Box key={line.id} sx={{
              display: 'flex', gap: 1.5, alignItems: 'flex-start', flexWrap: 'wrap',
              p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2.5,
            }}>
              <FormControl size="small" sx={{ flex: '1 1 160px', ...inp }}>
                <InputLabel>Category</InputLabel>
                <Select value={line.category || ''} label="Category"
                  onChange={e => {
                    const category = e.target.value;
                    setProject(p => ({
                      ...p,
                      budget_lines: p.budget_lines.map(x => x.id === line.id ? { ...x, category } : x),
                    }));
                    updateBudgetLine(line.id, { category });
                  }}>
                  {BUDGET_CATEGORIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField size="small" label="Description" value={line.description || ''}
                placeholder="Brief description"
                onChange={e => setProject(p => ({
                  ...p,
                  budget_lines: p.budget_lines.map(x => x.id === line.id ? { ...x, description: e.target.value } : x),
                }))}
                onBlur={e => updateBudgetLine(line.id, { description: e.target.value || null })}
                sx={{ flex: '2 1 220px', ...inp }} />
              <TextField size="small" label="Amount" type="number" value={line.amount ?? ''}
                onChange={e => {
                  const amount = parseInt(e.target.value, 10) || 0;
                  setProject(p => ({
                    ...p,
                    budget_lines: p.budget_lines.map(x => x.id === line.id ? { ...x, amount } : x),
                  }));
                }}
                onBlur={e => updateBudgetLine(line.id, { amount: parseInt(e.target.value, 10) || 0 })}
                sx={{ flex: '0 1 140px', ...inp }}
                InputProps={{ startAdornment: <Typography sx={{ fontSize: 11, color: 'text.secondary', mr: 0.5 }}>{currency}</Typography> }}
              />
              <IconButton size="small" onClick={() => deleteBudgetLine(line.id)} sx={{ mt: 0.5, color: '#ef4444' }}>
                <DeleteIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Box>
          ))}
        </Box>
      )}
      <Button size="small" variant="outlined" startIcon={<AddIcon />}
        onClick={() => addBudgetLine({ category: BUDGET_CATEGORIES[0], description: '', amount: 0 })}
        sx={{ mb: 3, textTransform: 'none', borderRadius: 2, borderColor: ACCENT, color: ACCENT }}>
        Add Line Item
      </Button>

      <Divider sx={{ my: 2.5 }} />
      <SubLabel label="7.3 Financial Notes" />
      <FieldRow>
        <TextField size="small" label="Indirect Cost / Overhead Rate" value={formData.financialOverheadRate}
          onChange={e => set('financialOverheadRate', e.target.value)}
          placeholder="e.g. 15% of direct costs"
          sx={{ flex: '1 1 280px', ...inp }} />
        <FormControl size="small" sx={{ flex: '1 1 220px', ...inp }}>
          <InputLabel>Reporting Currency</InputLabel>
          <Select value={formData.currency} label="Reporting Currency"
            onChange={e => set('currency', e.target.value)}>
            {CURRENCY_OPTIONS.map(c => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
          </Select>
        </FormControl>
      </FieldRow>
      <TextField fullWidth multiline minRows={4} label="Financial Justification / Notes"
        value={formData.financialNotes}
        onChange={e => set('financialNotes', e.target.value)}
        placeholder="Justify major budget items, explain any cost assumptions, or note funder restrictions on line items..."
        sx={multilineInp} />
    </Box>
  );

  const step8 = (
    <Box>
      <SectionHeader icon={DeclareIcon} title="Declarations"
        subtitle="Review all compliance declarations and confirm before submitting the project." />

      <SubLabel label="8.1 Compliance Declarations" />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 3 }}>
        {complianceDeclarations.map(item => {
          const checked = !!formData.declarations?.[item.key];
          return (
            <Paper
              key={item.key}
              elevation={0}
              variant="outlined"
              onClick={() => toggleDeclaration(item.key)}
              sx={{
                p: 2,
                borderRadius: 2.5,
                cursor: 'pointer',
                borderColor: checked ? ACCENT : 'divider',
                bgcolor: checked ? `${ACCENT}06` : 'background.paper',
                transition: 'border-color 0.15s, background-color 0.15s',
                '&:hover': { borderColor: ACCENT, bgcolor: `${ACCENT}04` },
              }}
            >
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                <Checkbox
                  checked={checked}
                  onChange={() => toggleDeclaration(item.key)}
                  onClick={e => e.stopPropagation()}
                  sx={{ p: 0, mt: 0.25, color: ACCENT, '&.Mui-checked': { color: ACCENT } }}
                />
                <Box>
                  <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 0.5 }}>{item.title}</Typography>
                  <Typography sx={{ fontSize: 13, color: 'text.secondary', lineHeight: 1.55 }}>
                    {item.description}
                  </Typography>
                </Box>
              </Box>
            </Paper>
          );
        })}
      </Box>

      <SubLabel label="8.2 Principal Investigator Sign-off" />
      <Paper elevation={0} variant="outlined" sx={{ p: 2.5, borderRadius: 2.5, mb: 3 }}>
        <FieldRow>
          <TextField size="small" required label="Full Name of PI" value={formData.piFullName}
            onChange={e => set('piFullName', e.target.value)}
            placeholder="As it appears on official documents"
            sx={{ flex: '1 1 280px', ...inp }} />
          <TextField size="small" label="Designation / Title" value={formData.piTitle}
            onChange={e => set('piTitle', e.target.value)}
            placeholder="e.g. Associate Professor"
            sx={{ flex: '1 1 240px', ...inp }} />
        </FieldRow>
        <FieldRow>
          <TextField size="small" required label="Date of Declaration" type="date"
            value={formData.declarationDate}
            onChange={e => set('declarationDate', e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ flex: '1 1 220px', ...inp }} />
          <TextField size="small" label="Staff / Employee ID" value={formData.piStaffId}
            onChange={e => set('piStaffId', e.target.value)}
            placeholder="Institutional ID"
            sx={{ flex: '1 1 220px', ...inp }} />
        </FieldRow>
        <Alert severity="info" icon={<InfoIcon fontSize="inherit" />} sx={{
          mt: 0.5,
          borderRadius: 2,
          bgcolor: dark ? 'rgba(245,158,11,0.12)' : '#fffbeb',
          color: dark ? '#fcd34d' : '#92400e',
          border: `1px solid ${GOLD}44`,
          '& .MuiAlert-icon': { color: GOLD },
        }}>
          By providing your name and date above, you are electronically signing this declaration.
          This constitutes a legally binding affirmation of all statements made in this project submission.
        </Alert>
      </Paper>

      <SubLabel label="8.3 Submission Readiness" />
      <Paper elevation={0} variant="outlined" sx={{ borderRadius: 2.5 }}>
        <Box sx={{
          px: 2.5, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid', borderColor: 'divider',
        }}>
          <Typography sx={{ fontSize: 14, fontWeight: 700 }}>Submission Checklist</Typography>
          <Chip
            label={`${submissionCompleteCount}/${SUBMISSION_CHECKLIST.length} complete`}
            size="small"
            sx={{
              fontWeight: 700,
              fontSize: 11,
              bgcolor: submissionCompleteCount === SUBMISSION_CHECKLIST.length ? '#10b98122' : `${GOLD}22`,
              color: submissionCompleteCount === SUBMISSION_CHECKLIST.length ? '#10b981' : GOLD,
            }}
          />
        </Box>
        <Box sx={{ py: 0.5 }}>
          {SUBMISSION_CHECKLIST.map(item => {
            const complete = submissionChecklistStatus[item.key];
            return (
              <Box key={item.key} sx={{
                display: 'flex', alignItems: 'center', gap: 1.5,
                px: 2.5, py: 1.25,
                borderBottom: '1px solid', borderColor: 'divider',
                '&:last-child': { borderBottom: 'none' },
              }}>
                {complete ? (
                  <CheckIcon sx={{ fontSize: 18, color: '#10b981' }} />
                ) : (
                  <IncompleteIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                )}
                <Typography sx={{ flex: 1, fontSize: 13, fontWeight: complete ? 600 : 500 }}>
                  {item.label}
                </Typography>
                <Typography sx={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: complete ? '#10b981' : 'text.disabled',
                }}>
                  {complete ? 'Complete' : 'Incomplete'}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Paper>
    </Box>
  );

  const STEP_CONTENT = [step1, step2, step3, step4, step5, step6, step7, step8];

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      minHeight: 0,
      overflow: 'hidden',
      bgcolor: 'background.default',
    }}>
      {/* Fixed header — content below scrolls independently */}
      <Box sx={{
        flexShrink: 0,
        zIndex: 1100,
        bgcolor: 'background.default',
        borderBottom: '1px solid', borderColor: 'divider',
        px: { xs: 2, md: 4 }, py: 2,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Button size="small" startIcon={<BackIcon sx={{ fontSize: 15 }} />}
              onClick={() => router.push('/researcher/projects')}
              sx={{ textTransform: 'none', color: 'text.secondary', borderRadius: 2 }}>
              Back to Projects
            </Button>
            <Typography sx={{ color: 'divider' }}>|</Typography>
            <Box>
              <Typography sx={{ fontSize: 20, fontWeight: 800, lineHeight: 1.2 }}>Project Setup</Typography>
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{formData.title || 'Complete all sections to submit for review'}</Typography>
            </Box>
          </Box>
          <Button size="small" variant="contained"
            startIcon={saving ? <CircularProgress size={13} sx={{ color: 'inherit' }} /> : <SaveIcon sx={{ fontSize: 14 }} />}
            onClick={handleSaveDraft} disabled={saving}
            sx={{
              textTransform: 'none', borderRadius: 2, fontSize: 12,
              bgcolor: ACCENT, color: '#fff',
              '&:hover': { bgcolor: '#0e8a85' },
            }}>
            Save Draft
          </Button>
        </Box>
      </Box>

      <Box sx={{
        flex: 1,
        minHeight: 0,
        overflow: 'auto',
        ...accentScrollbarSx(dark, { size: 10 }),
      }}>
        <Box sx={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: { xs: 0, lg: 2 },
          px: { xs: 2, md: 4 },
          py: 3,
        }}>
          <Paper elevation={0} variant="outlined" sx={{
            width: 220,
            flexShrink: 0,
            borderRadius: 3,
            display: { xs: 'none', lg: 'block' },
            position: 'sticky',
            top: 0,
            zIndex: 100,
            bgcolor: 'background.paper',
          }}>
            <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.7, mb: 1 }}>Progress</Typography>
              <LinearProgress variant="determinate" value={progress}
                sx={{ height: 5, borderRadius: 3, bgcolor: 'divider', '& .MuiLinearProgress-bar': { bgcolor: ACCENT } }} />
              <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.5 }}>{progress}% complete</Typography>
            </Box>
            <Box sx={{ py: 1 }}>
              {STEPS.map((s, i) => {
                const done = i < activeStep;
                const active = i === activeStep;
                return (
                  <Box key={i} onClick={() => setActiveStep(i)} sx={{
                    display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.2, cursor: 'pointer',
                    borderLeft: active ? `3px solid ${ACCENT}` : '3px solid transparent',
                    bgcolor: active ? `${ACCENT}10` : 'transparent', transition: 'all 0.15s',
                    '&:hover': { bgcolor: `${ACCENT}08` },
                  }}>
                    <Box sx={{
                      width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      bgcolor: done ? '#10b981' : active ? ACCENT : dark ? 'rgba(255,255,255,0.08)' : '#f1f5f9',
                    }}>
                      {done ? <CheckIcon sx={{ fontSize: 13, color: '#fff' }} /> : <s.Icon sx={{ fontSize: 12, color: active ? '#fff' : 'text.disabled' }} />}
                    </Box>
                    <Typography sx={{ fontSize: 11.5, fontWeight: active ? 700 : 500, color: active ? ACCENT : done ? 'text.primary' : 'text.secondary', lineHeight: 1.3 }}>
                      {s.label}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </Paper>

          <Box sx={{ flex: 1, minWidth: 0 }}>
        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError('')}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

        <Box sx={{ minWidth: 0 }}>
          <Paper elevation={0} variant="outlined" sx={{ borderRadius: 3, p: { xs: 2.5, md: 3.5 }, mb: 2.5, overflow: 'visible' }}>
            {STEP_CONTENT[activeStep]}
          </Paper>

          <Paper elevation={0} variant="outlined" sx={{ borderRadius: 3, px: 3, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Button variant="outlined" size="small" disabled={activeStep === 0}
              onClick={() => setActiveStep(s => s - 1)} startIcon={<BackIcon sx={{ fontSize: 15 }} />}
              sx={{ textTransform: 'none', borderRadius: 2, fontSize: 13 }}>Previous</Button>
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
              <Button variant="contained" size="small" onClick={() => setActiveStep(s => s + 1)}
                sx={{ textTransform: 'none', borderRadius: 2, fontSize: 13, bgcolor: ACCENT, '&:hover': { bgcolor: '#0e8a85' } }}>
                Next Step
              </Button>
            ) : (
              <Button variant="contained" size="small" onClick={handleSubmit}
                disabled={saving || !declarationsSignedOff || !formData.title.trim()}
                startIcon={saving ? <CircularProgress size={13} sx={{ color: 'inherit' }} /> : null}
                sx={{ textTransform: 'none', borderRadius: 2, fontSize: 13, bgcolor: ACCENT, '&:hover': { bgcolor: '#0e8a85' } }}>
                Submit Project
              </Button>
            )}
          </Paper>
        </Box>
          </Box>
        </Box>
      </Box>

      <TeamInviteDialog
        open={memberOpen}
        onClose={() => setMemberOpen(false)}
        onSave={inviteMembers}
        title={memberDefaultRole === 'co_investigator' ? 'Add Co-Investigator' : 'Add Team Member'}
        defaultRole={memberDefaultRole}
        roles={memberDefaultRole === 'co_investigator' ? CO_INVESTIGATOR_ROLES : SUPPORT_STAFF_ROLES}
        accent={ACCENT}
      />
    </Box>
  );
}
