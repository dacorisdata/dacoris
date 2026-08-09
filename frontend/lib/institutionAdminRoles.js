/**
 * Institution admin role catalog — primary account types and permission roles.
 * Mirrors backend PrimaryAccountType / ResearchRole enums.
 */

import { ADMIN_STAFF_REGISTRATION_ROLES, ROLE_LEVELS } from './adminStaffRoles';

export const PRIMARY_ACCOUNT_TYPE_GROUPS = [
  {
    label: 'Top Level',
    types: ADMIN_STAFF_REGISTRATION_ROLES.filter((r) => r.level === ROLE_LEVELS.TOP).map((r) => ({
      value: r.value,
      label: primaryTypeLabelFromKey(r.labelKey),
      universityOnly: !!r.universityOnly,
    })),
  },
  {
    label: 'Mid Level',
    types: ADMIN_STAFF_REGISTRATION_ROLES.filter((r) => r.level === ROLE_LEVELS.MID).map((r) => ({
      value: r.value,
      label: primaryTypeLabelFromKey(r.labelKey),
      universityOnly: !!r.universityOnly,
    })),
  },
  {
    label: 'Bottom Level',
    types: ADMIN_STAFF_REGISTRATION_ROLES.filter((r) => r.level === ROLE_LEVELS.BOTTOM).map((r) => ({
      value: r.value,
      label: primaryTypeLabelFromKey(r.labelKey),
      universityOnly: !!r.universityOnly,
    })),
  },
  {
    label: 'Research & Academic',
    types: [
      { value: 'RESEARCHER', label: 'Researcher' },
      { value: 'POSTGRADUATE_STUDENT', label: 'Postgraduate Student' },
      { value: 'SUPERVISOR', label: 'Supervisor' },
      { value: 'EXTERNAL_SUPERVISOR', label: 'External Supervisor' },
    ],
  },
  {
    label: 'External & Guest',
    types: [
      { value: 'EXTERNAL_REVIEWER', label: 'External Reviewer' },
      { value: 'GUEST_COLLABORATOR', label: 'Guest Collaborator' },
      { value: 'EXTERNAL_FUNDER', label: 'External Funder' },
      { value: 'EXTERNAL_PARTNER', label: 'External Partner' },
    ],
  },
];

export const PRIMARY_ACCOUNT_TYPES = PRIMARY_ACCOUNT_TYPE_GROUPS.flatMap((g) => g.types);

function primaryTypeLabelFromKey(labelKey) {
  const labels = {
    roleDirectorResearch: 'Director of Research',
    roleInstitutionalLeadership: 'Institutional Leadership',
    roleDvcResearch: 'DVC (Research)',
    roleHeadOfPgStudies: 'Head of Postgraduate Studies',
    roleResearchAdministrator: 'Research Administrator',
    roleGrantManager: 'Grant Manager',
    roleFinanceOfficer: 'Finance Officer',
    roleEthicsCommitteeMember: 'Ethics Committee Member',
    roleDataSteward: 'Data Steward',
    roleLibrarian: 'Librarian / RDM Specialist',
    rolePgCoordinator: 'PG Coordinator',
    roleMouAdmin: 'MoU Administrator',
    roleLegalOfficer: 'Legal Officer',
    rolePartnershipCoordinator: 'Partnership Coordinator',
    roleDataEngineer: 'Data Engineer',
    roleSupervisor: 'Supervisor',
    roleAdminStaffOther: 'Administrative Staff (Other)',
  };
  return labels[labelKey] || labelKey;
}

export const PERMISSION_ROLE_GROUPS = [
  {
    label: 'Top Level Leadership',
    color: '#ef4444',
    roles: [
      { value: 'institutional_lead', label: 'Institutional Lead' },
      { value: 'dvc_research', label: 'DVC (Research)' },
      { value: 'director_research', label: 'Director of Research' },
      { value: 'head_of_pg_studies', label: 'Head of Postgraduate Studies' },
    ],
  },
  {
    label: 'Mid Level Operations',
    color: '#8b5cf6',
    roles: [
      { value: 'research_admin', label: 'Research Administrator' },
      { value: 'grant_officer', label: 'Grant Officer' },
      { value: 'finance_officer', label: 'Finance Officer' },
      { value: 'ethics_chair', label: 'Ethics Chair' },
      { value: 'data_steward', label: 'Data Steward' },
      { value: 'librarian', label: 'Librarian / RDM Specialist' },
      { value: 'mou_admin', label: 'MoU Administrator' },
      { value: 'legal_officer', label: 'Legal Officer' },
      { value: 'partnership_coordinator', label: 'Partnership Coordinator' },
      { value: 'pg_coordinator', label: 'PG Coordinator' },
    ],
  },
  {
    label: 'Bottom Level & Practitioners',
    color: '#0ea5e9',
    roles: [
      { value: 'ethics_reviewer', label: 'Ethics Reviewer' },
      { value: 'data_engineer', label: 'Data Engineer' },
      { value: 'supervisor', label: 'Supervisor' },
      { value: 'external_supervisor', label: 'External Supervisor' },
      { value: 'system_admin', label: 'System Administrator' },
    ],
  },
  {
    label: 'Research Roles',
    color: '#3b82f6',
    roles: [
      { value: 'researcher', label: 'Researcher' },
      { value: 'principal_investigator', label: 'Principal Investigator (PI)' },
      { value: 'co_investigator', label: 'Co-Investigator (Co-I)' },
      { value: 'postgraduate_student', label: 'Postgraduate Student' },
      { value: 'applicant', label: 'Applicant' },
    ],
  },
  {
    label: 'External & Guest',
    color: '#64748b',
    roles: [
      { value: 'external_reviewer', label: 'External Reviewer' },
      { value: 'guest_collaborator', label: 'Guest Collaborator' },
      { value: 'external_funder', label: 'External Funder' },
      { value: 'external_partner', label: 'External Partner' },
    ],
  },
];

/** Default permission roles applied when a primary account type is chosen. */
export const PRIMARY_TYPE_DEFAULT_ROLES = {
  RESEARCHER: ['researcher'],
  ADMIN_STAFF: ['research_admin'],
  DVC_RESEARCH: ['dvc_research', 'institutional_lead'],
  DIRECTOR_RESEARCH: ['director_research', 'institutional_lead'],
  RESEARCH_ADMINISTRATOR: ['research_admin'],
  GRANT_MANAGER: ['grant_officer'],
  FINANCE_OFFICER: ['finance_officer'],
  ETHICS_COMMITTEE_MEMBER: ['ethics_reviewer'],
  DATA_STEWARD: ['data_steward'],
  DATA_ENGINEER: ['data_engineer'],
  LIBRARIAN: ['librarian', 'data_steward'],
  INSTITUTIONAL_LEADERSHIP: ['institutional_lead'],
  MOU_ADMIN: ['mou_admin'],
  LEGAL_OFFICER: ['legal_officer'],
  PARTNERSHIP_COORDINATOR: ['partnership_coordinator'],
  EXTERNAL_REVIEWER: ['external_reviewer'],
  GUEST_COLLABORATOR: ['guest_collaborator'],
  EXTERNAL_FUNDER: ['external_funder'],
  EXTERNAL_PARTNER: ['external_partner'],
  POSTGRADUATE_STUDENT: ['postgraduate_student'],
  SUPERVISOR: ['supervisor'],
  EXTERNAL_SUPERVISOR: ['external_supervisor'],
  PG_COORDINATOR: ['pg_coordinator'],
  HEAD_OF_PG_STUDIES: ['head_of_pg_studies', 'institutional_lead'],
};

export const ALL_PERMISSION_ROLES = PERMISSION_ROLE_GROUPS.flatMap((g) => g.roles.map((r) => r.value));

export const ALL_ADMIN_STAFF_PERMISSION_ROLES = [
  'institutional_lead', 'dvc_research', 'director_research', 'head_of_pg_studies',
  'research_admin', 'grant_officer', 'finance_officer', 'ethics_chair', 'ethics_reviewer',
  'data_steward', 'data_engineer', 'librarian', 'mou_admin', 'legal_officer',
  'partnership_coordinator', 'pg_coordinator', 'supervisor', 'external_supervisor', 'system_admin',
];

const ROLE_LABELS = Object.fromEntries(
  PERMISSION_ROLE_GROUPS.flatMap((g) => g.roles.map((r) => [r.value, r.label]))
);

const PRIMARY_LABELS = Object.fromEntries(
  PRIMARY_ACCOUNT_TYPES.map((t) => [t.value, t.label])
);

export function getPrimaryAccountTypeLabel(value) {
  if (!value) return '—';
  return PRIMARY_LABELS[value] || value.replace(/_/g, ' ');
}

export function getPermissionRoleLabel(value) {
  if (!value) return '';
  return ROLE_LABELS[value] || value.replace(/_/g, ' ');
}

export function getDefaultRolesForPrimaryType(primaryType) {
  return PRIMARY_TYPE_DEFAULT_ROLES[primaryType] || [];
}

export function mergeRoles(existing = [], toAdd = []) {
  return [...new Set([...existing, ...toAdd])];
}

export function getPrimaryTypesForInstitution(institutionTypes = []) {
  const isUniversity = Array.isArray(institutionTypes) && institutionTypes.includes('university');
  return PRIMARY_ACCOUNT_TYPE_GROUPS.map((group) => ({
    ...group,
    types: group.types.filter((t) => !t.universityOnly || isUniversity),
  })).filter((group) => group.types.length > 0);
}
