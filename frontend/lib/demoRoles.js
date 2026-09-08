/** Demo account role switching — allowlisted emails only */

export const DEMO_ACCOUNT_EMAIL = 'demo@kibu.ac.ke';
export const DEMO_ACCOUNT_EMAILS = ['demo@kibu.ac.ke', 'demo@dacoris.com'];
export const DEMO_ORCID_ID = '0009-0001-0000-0001';

const LEGACY_ROLE_IDS = {
  RESEARCH_MANAGER: 'DIRECTOR_RESEARCH',
};

export const DEMO_ROLES = [
  {
    id: 'RESEARCHER',
    labelKey: 'navbar.demoRoles.researcher',
    primaryAccountType: 'RESEARCHER',
    jobTitle: 'Researcher',
    dashboardRoute: '/researcher/overview',
  },
  {
    id: 'DIRECTOR_RESEARCH',
    labelKey: 'navbar.demoRoles.directorResearch',
    primaryAccountType: 'DIRECTOR_RESEARCH',
    jobTitle: 'Director of Research',
    dashboardRoute: '/admin-staff/overview',
  },
  {
    id: 'SUPERVISOR',
    labelKey: 'navbar.demoRoles.supervisor',
    primaryAccountType: 'SUPERVISOR',
    jobTitle: 'Supervisor',
    dashboardRoute: '/researcher/postgraduate/supervisor',
  },
  {
    id: 'REVIEWER',
    labelKey: 'navbar.demoRoles.reviewer',
    primaryAccountType: 'EXTERNAL_REVIEWER',
    jobTitle: 'Reviewer',
    dashboardRoute: '/reviewer/tasks',
  },
];

export function isDemoAccount(user) {
  return DEMO_ACCOUNT_EMAILS.includes(user?.email?.toLowerCase());
}

export function getDemoRoleById(roleId) {
  const id = LEGACY_ROLE_IDS[roleId] || roleId;
  return DEMO_ROLES.find((r) => r.id === id) || null;
}

export function getDemoRoleByAccountType(primaryAccountType) {
  return DEMO_ROLES.find((r) => r.primaryAccountType === primaryAccountType) || DEMO_ROLES[0];
}

export function getActiveDemoRole(user) {
  if (!user) return null;
  return getDemoRoleByAccountType(user.primary_account_type);
}
