import api from './api';

const pg = {
  listStudents: () => api.get('/postgraduate/students'),
  getMyRecord: () => api.get('/postgraduate/students/me'),
  getStudent: (id) => api.get(`/postgraduate/students/${id}`),
  getJourney: (id) => api.get(`/postgraduate/students/${id}/journey`),
  getCoursework: (id) => api.get(`/postgraduate/students/${id}/coursework`),
  getFinance: (id) => api.get(`/postgraduate/students/${id}/finance`),
  getClearance: (id) => api.get(`/postgraduate/students/${id}/graduation-clearance`),

  listProgressReports: () => api.get('/postgraduate/progress-reports'),
  createProgressReport: (data) => api.post('/postgraduate/progress-reports', data),

  supervisorMe: () => api.get('/postgraduate/supervisor/me'),
  supervisorDashboard: () => api.get('/postgraduate/supervisor/dashboard'),
  supervisorStudents: () => api.get('/postgraduate/supervisor/students'),
  supervisorStudent: (id) => api.get(`/postgraduate/supervisor/students/${id}`),
  listDelayReports: () => api.get('/postgraduate/supervisor/delay-reports'),
  createDelayReport: (formData) => api.post('/postgraduate/supervisor/delay-reports', formData),
  getDelayReport: (id) => api.get(`/postgraduate/supervisor/delay-reports/${id}`),
  downloadDelayReportEvidence: (id) => api.get(`/postgraduate/supervisor/delay-reports/${id}/evidence`, { responseType: 'blob' }),
  validateProgressReport: (id, data) => api.post(`/postgraduate/supervisor/progress-reports/${id}/validate`, data),

  universityDashboard: () => api.get('/postgraduate/dashboards/university'),
  departmentDashboard: () => api.get('/postgraduate/dashboards/department'),

  listInterventions: () => api.get('/postgraduate/interventions'),
  createIntervention: (data) => api.post('/postgraduate/interventions', data),
  updateIntervention: (id, data) => api.patch(`/postgraduate/interventions/${id}`, data),

  listProposals: () => api.get('/postgraduate/proposals'),
  getProposal: (id) => api.get(`/postgraduate/proposals/${id}`),
  createProposal: (data) => api.post('/postgraduate/proposals', data),
  updateProposal: (id, data) => api.patch(`/postgraduate/proposals/${id}`, data),
  submitProposal: (id) => api.patch(`/postgraduate/proposals/${id}`, { status: 'submitted' }),
  approveProposal: (id, data) => api.post(`/postgraduate/proposals/${id}/approve`, data),

  listClearances: () => api.get('/postgraduate/graduation-clearance'),
  runOverdueScan: () => api.post('/postgraduate/admin/overdue-scan'),
  listSupervisorAssignments: () => api.get('/postgraduate/admin/supervisor-assignments'),
  listSupervisors: () => api.get('/postgraduate/admin/supervisors'),
  assignSupervisor: (data) => api.post('/postgraduate/admin/supervisor-assignments', data),
  updateSupervisorAssignment: (id, data) => api.patch(`/postgraduate/admin/supervisor-assignments/${id}`, data),
  listAuditLog: (studentId) => api.get('/postgraduate/audit', { params: { student_id: studentId } }),

  getRequirements: () => api.get('/postgraduate/student/requirements'),
  getFeedback: () => api.get('/postgraduate/student/feedback'),
  listChallenges: () => api.get('/postgraduate/student/challenges'),
  reportChallenge: (data) => api.post('/postgraduate/student/challenges', data),
  updatePgProfile: (data) => api.patch('/postgraduate/student/profile', data),
  getThesisDraft: () => api.get('/postgraduate/student/thesis-draft'),
  saveThesisDraft: (data) => api.put('/postgraduate/student/thesis-draft', data),
  listPgPublications: () => api.get('/postgraduate/student/publications'),
  addPgPublication: (data) => api.post('/postgraduate/student/publications', data),
  getGraduationReadiness: () => api.get('/postgraduate/student/graduation-readiness'),
};

export default pg;
