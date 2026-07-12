/** Demo account role switching — demo@dacoris.com only */

export const DEMO_ACCOUNT_EMAIL = 'demo@dacoris.com';
export const DEMO_ORCID_ID = '0009-0001-0000-0001';

export const DEMO_ROLES = [
  {
    id: 'RESEARCHER',
    labelKey: 'navbar.demoRoles.researcher',
    primaryAccountType: 'RESEARCHER',
    jobTitle: 'Researcher',
    dashboardRoute: '/researcher/overview',
  },
  {
    id: 'RESEARCH_MANAGER',
    labelKey: 'navbar.demoRoles.researchManager',
    primaryAccountType: 'GRANT_MANAGER',
    jobTitle: 'Research Manager',
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
  return user?.email?.toLowerCase() === DEMO_ACCOUNT_EMAIL;
}

export function getDemoRoleById(roleId) {
  return DEMO_ROLES.find((r) => r.id === roleId) || null;
}

export function getDemoRoleByAccountType(primaryAccountType) {
  return DEMO_ROLES.find((r) => r.primaryAccountType === primaryAccountType) || DEMO_ROLES[0];
}

export function getActiveDemoRole(user) {
  if (!user) return null;
  return getDemoRoleByAccountType(user.primary_account_type);
}
