/** Self-registration roles for administrative staff, grouped by hierarchy level. */

export const ROLE_LEVELS = {
  TOP: 'top',
  MID: 'mid',
  BOTTOM: 'bottom',
};

export const ADMIN_STAFF_REGISTRATION_ROLES = [
  { value: 'DIRECTOR_RESEARCH', labelKey: 'roleDirectorResearch', level: ROLE_LEVELS.TOP },
  { value: 'INSTITUTIONAL_LEADERSHIP', labelKey: 'roleInstitutionalLeadership', level: ROLE_LEVELS.TOP },
  { value: 'DVC_RESEARCH', labelKey: 'roleDvcResearch', level: ROLE_LEVELS.TOP, universityOnly: true },
  { value: 'HEAD_OF_PG_STUDIES', labelKey: 'roleHeadOfPgStudies', level: ROLE_LEVELS.TOP, universityOnly: true },

  { value: 'RESEARCH_ADMINISTRATOR', labelKey: 'roleResearchAdministrator', level: ROLE_LEVELS.MID },
  { value: 'GRANT_MANAGER', labelKey: 'roleGrantManager', level: ROLE_LEVELS.MID },
  { value: 'FINANCE_OFFICER', labelKey: 'roleFinanceOfficer', level: ROLE_LEVELS.MID },
  { value: 'ETHICS_COMMITTEE_MEMBER', labelKey: 'roleEthicsCommitteeMember', level: ROLE_LEVELS.MID },
  { value: 'DATA_STEWARD', labelKey: 'roleDataSteward', level: ROLE_LEVELS.MID },
  { value: 'LIBRARIAN', labelKey: 'roleLibrarian', level: ROLE_LEVELS.MID },
  { value: 'MOU_ADMIN', labelKey: 'roleMouAdmin', level: ROLE_LEVELS.MID },
  { value: 'LEGAL_OFFICER', labelKey: 'roleLegalOfficer', level: ROLE_LEVELS.MID },
  { value: 'PARTNERSHIP_COORDINATOR', labelKey: 'rolePartnershipCoordinator', level: ROLE_LEVELS.MID },
  { value: 'PG_COORDINATOR', labelKey: 'rolePgCoordinator', level: ROLE_LEVELS.MID, universityOnly: true },

  { value: 'DATA_ENGINEER', labelKey: 'roleDataEngineer', level: ROLE_LEVELS.BOTTOM },
  { value: 'SUPERVISOR', labelKey: 'roleSupervisor', level: ROLE_LEVELS.BOTTOM },
  { value: 'ADMIN_STAFF', labelKey: 'roleAdminStaffOther', level: ROLE_LEVELS.BOTTOM },
];

export const ADMIN_STAFF_DASHBOARD_TYPES = ADMIN_STAFF_REGISTRATION_ROLES.map((r) => r.value);

export function isUniversityInstitutionTypes(institutionTypes = []) {
  return Array.isArray(institutionTypes) && institutionTypes.includes('university');
}

export function getRegistrationRolesForInstitution(institutionTypes = []) {
  const isUniversity = isUniversityInstitutionTypes(institutionTypes);
  return ADMIN_STAFF_REGISTRATION_ROLES.filter((role) => !role.universityOnly || isUniversity);
}

export function groupRegistrationRoles(roles) {
  return {
    top: roles.filter((r) => r.level === ROLE_LEVELS.TOP),
    mid: roles.filter((r) => r.level === ROLE_LEVELS.MID),
    bottom: roles.filter((r) => r.level === ROLE_LEVELS.BOTTOM),
  };
}

export function isRoleAllowedForInstitution(roleValue, institutionTypes = []) {
  return getRegistrationRolesForInstitution(institutionTypes).some((r) => r.value === roleValue);
}

/** Primary account types permitted to assign grant proposal stage reviewers. */
export const GRANT_REVIEWER_ASSIGNER_TYPES = [
  'DIRECTOR_RESEARCH',
  'RESEARCH_ADMINISTRATOR',
];

/** Permission roles that may assign grant reviewers (matches backend user_roles). */
export const GRANT_REVIEWER_ASSIGNER_ROLE_KEYS = new Set([
  'director_research',
  'research_admin',
  'research_administrator',
]);

function normalizeRoleKey(role) {
  return String(role || '').toLowerCase().replace(/-/g, '_');
}

export function userHasGrantStaffRole(user) {
  if (!user) return false;
  if (user.is_global_admin || user.is_institution_admin) return true;
  if (GRANT_REVIEWER_ASSIGNER_TYPES.includes(user.primary_account_type)) return true;
  return (user.roles || []).some((role) => GRANT_REVIEWER_ASSIGNER_ROLE_KEYS.has(normalizeRoleKey(role)));
}

export function canAssignGrantReviewers(user) {
  return userHasGrantStaffRole(user);
}

export function canRecommendGrantOpportunities(user) {
  return userHasGrantStaffRole(user);
}
