/** Post-login dashboard route based on user profile. */
export function getDashboardRoute(user) {
  if (!user) return '/login';
  if (user.is_global_admin) return '/global-admin/dashboard';
  if (user.is_institution_admin) return '/institution-admin/dashboard';
  if (user.primary_account_type === 'RESEARCHER') return '/researcher/dashboard';
  if (user.primary_account_type === 'EXTERNAL_REVIEWER') return '/reviewer/tasks';
  if ([
    'ADMIN_STAFF', 'GRANT_MANAGER', 'FINANCE_OFFICER', 'ETHICS_COMMITTEE_MEMBER',
    'DATA_STEWARD', 'DATA_ENGINEER', 'INSTITUTIONAL_LEADERSHIP',
    'GUEST_COLLABORATOR', 'EXTERNAL_FUNDER',
  ].includes(user.primary_account_type)) {
    return '/admin-staff/dashboard';
  }
  return '/onboarding';
}

export function isReviewerUser(user) {
  return user?.primary_account_type === 'EXTERNAL_REVIEWER';
}
