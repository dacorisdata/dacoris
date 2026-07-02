export const INSTITUTION_TYPES = [
  { value: 'university', label: 'University' },
  { value: 'hospital', label: 'Hospital' },
  { value: 'research_institute', label: 'Research Institute' },
  { value: 'government', label: 'Government' },
  { value: 'ngo', label: 'NGO' },
  { value: 'industry', label: 'Industry' },
  { value: 'funder', label: 'Funder' },
  { value: 'international_org', label: 'International Organization' },
  { value: 'other', label: 'Other' },
];

export const getInstitutionTypeLabel = (value) =>
  INSTITUTION_TYPES.find((type) => type.value === value)?.label || null;

export const getInstitutionTypeOptions = (values = []) =>
  INSTITUTION_TYPES.filter((type) => values.includes(type.value));

export const isUniversityInstitution = (user) =>
  Array.isArray(user?.institution_types) && user.institution_types.includes('university');

export const isSupervisorAccount = (user) =>
  ['SUPERVISOR', 'EXTERNAL_SUPERVISOR'].includes(user?.primary_account_type);

export const isPgStudentAccount = (user) =>
  ['POSTGRADUATE_STUDENT', 'RESEARCHER'].includes(user?.primary_account_type);

/** Routes supervisors and co-supervisors may access within the researcher area. */
export const SUPERVISOR_ALLOWED_PATH_PREFIXES = [
  '/researcher/overview',
  '/researcher/profile',
  '/researcher/postgraduate/supervisor',
];

export const isSupervisorAllowedPath = (pathname) =>
  SUPERVISOR_ALLOWED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
