import api from './api';

// Grant Module APIs
export const grantsAPI = {
  // Opportunities
  listOpportunities: (status = null) => 
    api.get('/grants/opportunities', { params: status ? { status } : {} }),
  createOpportunity: (data) => api.post('/grants/opportunities', data),
  getOpportunity: (id) => api.get(`/grants/opportunities/${id}`),
  updateOpportunityStatus: (id, status) => 
    api.patch(`/grants/opportunities/${id}/status`, null, { params: { status } }),

  // Proposals
  listProposals: () => api.get('/grants/proposals'),
  createProposal: (data) => api.post('/grants/proposals', data),
  getProposal: (id) => api.get(`/grants/proposals/${id}`),
  updateSection: (proposalId, sectionId, data) => 
    api.put(`/grants/proposals/${proposalId}/sections/${sectionId}`, data),
  uploadDocument: (proposalId, documentType, file) => {
    const formData = new FormData();
    formData.append('document_type', documentType);
    formData.append('file', file);
    return api.post(`/grants/proposals/${proposalId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  transitionStatus: (proposalId, targetStatus) => 
    api.patch(`/grants/proposals/${proposalId}/status`, null, { 
      params: { target_status: targetStatus } 
    }),

  // Reviews
  assignReviewer: (proposalId, reviewerId) => 
    api.post(`/grants/reviews/proposals/${proposalId}/assign`, { reviewer_id: reviewerId }),
  submitReview: (reviewId, data) => 
    api.post(`/grants/reviews/${reviewId}/submit`, data),
  getProposalReviews: (proposalId) => 
    api.get(`/grants/reviews/proposals/${proposalId}`),

  // Awards
  issueAward: (data) => api.post('/grants/awards', data),
  getAward: (id) => api.get(`/grants/awards/${id}`),
  addBudgetLines: (awardId, lines) => 
    api.post(`/grants/awards/${awardId}/budget`, lines),
  getBudget: (awardId) => api.get(`/grants/awards/${awardId}/budget`),

  // AI Grant Matcher
  matchOpportunities: ({ limit = 10, includeUpcoming = true } = {}) =>
    api.get('/grants/match', { params: { limit, include_upcoming: includeUpcoming } }),
};

// Research Module APIs
export const researchAPI = {
  // Projects
  listProjects: () => api.get('/research/projects'),
  createProject: (data) => api.post('/research/projects', data),
  getProject: (id) => api.get(`/research/projects/${id}`),
  updateProject: (id, data) => api.patch(`/research/projects/${id}`, data),

  // Project Members
  listMembers: (projectId) => api.get(`/research/projects/${projectId}/members`),
  inviteMember: (projectId, data) => api.post(`/research/projects/${projectId}/members`, data),
  removeMember: (projectId, memberId) => api.delete(`/research/projects/${projectId}/members/${memberId}`),

  // Milestones
  listMilestones: (projectId) => api.get(`/research/projects/${projectId}/milestones`),
  createMilestone: (projectId, data) => api.post(`/research/projects/${projectId}/milestones`, data),
  updateMilestone: (projectId, milestoneId, data) => api.patch(`/research/projects/${projectId}/milestones/${milestoneId}`, data),
  addTask: (projectId, milestoneId, data) => api.post(`/research/projects/${projectId}/milestones/${milestoneId}/tasks`, data),

  // Project Documents
  listDocuments: (projectId) => api.get(`/research/projects/${projectId}/documents`),
  uploadDocument: (projectId, documentType, file) => {
    const fd = new FormData();
    fd.append('document_type', documentType);
    fd.append('file', file);
    return api.post(`/research/projects/${projectId}/documents`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // Ethics
  listMyEthics: () => api.get('/research/ethics/my'),
  submitEthicsApplication: (data) => api.post('/research/ethics', data),
  getProjectEthics: (projectId) => api.get(`/research/ethics/project/${projectId}`),
  uploadEthicsDocument: (appId, documentType, file) => {
    const fd = new FormData();
    fd.append('document_type', documentType);
    fd.append('file', file);
    return api.post(`/research/ethics/${appId}/documents`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  updateEthicsDecision: (appId, targetStatus, decisionNotes, approvedUntil) =>
    api.patch(`/research/ethics/${appId}/decision`, null, {
      params: { target_status: targetStatus, decision_notes: decisionNotes, approved_until: approvedUntil },
    }),

  // Research Outputs
  listOutputs: (projectId = null) => api.get('/research/outputs', { params: projectId ? { project_id: projectId } : {} }),
  createOutput: (data) => api.post('/research/outputs', data),
  getOutput: (id) => api.get(`/research/outputs/${id}`),
  updateOutput: (id, data) => api.patch(`/research/outputs/${id}`, data),
  deleteOutput: (id) => api.delete(`/research/outputs/${id}`),
  pingPresence: (id) => api.post(`/research/outputs/${id}/presence`),
  getPresence: (id) => api.get(`/research/outputs/${id}/presence`),

  // Data Import
  submitDataImportRequest: (data) => api.post('/research/data-import', data),
  listMyDataImportRequests: () => api.get('/research/data-import'),
  listAllDataImportRequests: (status = null) => api.get('/admin/data-import', { params: status ? { status } : {} }),
  reviewDataImportRequest: (id, decision) => api.post(`/admin/data-import/${id}/review`, decision),
};

// Data Capture Module APIs
export const dataAPI = {
  // Forms
  listForms: () => api.get('/data/forms'),
  listFormsEnriched: () => api.get('/data/forms/enriched'),
  createForm: (data) => api.post('/data/forms', data),
  getForm: (id) => api.get(`/data/forms/${id}`),

  // Submissions
  submitData: (formId, data) =>
    api.post(`/data/forms/${formId}/submissions`, { data }),
  uploadCSV: (formId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/data/forms/${formId}/upload-csv`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  listSubmissions: (formId) => api.get(`/data/forms/${formId}/submissions`),
  listAllSubmissions: () => api.get('/data/forms/all-submissions'),

  // Datasets
  listDatasets: () => api.get('/data/datasets'),
  createDataset: (data) => api.post('/data/datasets', data),
  getDataset: (id) => api.get(`/data/datasets/${id}`),
  updateDataset: (id, data) => api.patch(`/data/datasets/${id}`, data),
  promoteSubmissions: (id) => api.post(`/data/datasets/${id}/promote-submissions`),
  listVersions: (id) => api.get(`/data/datasets/${id}/versions`),

  // QA
  createQARule: (data) => api.post('/data/qa/rules', data),
  listQARules: (datasetId) => api.get(`/data/qa/rules/${datasetId}`),
  deleteQARule: (ruleId) => api.delete(`/data/qa/rules/${ruleId}`),
  runQAChecks: (datasetId) => api.post(`/data/qa/run/${datasetId}`),
  getQAResults: (submissionId) => api.get(`/data/qa/results/${submissionId}`),
  overrideQAResult: (resultId) => api.post(`/data/qa/results/${resultId}/override`),
  updateSubmissionStatus: (submissionId, status) =>
    api.patch(`/data/qa/submissions/${submissionId}/status?target_status=${status}`),
  getQADashboard: (datasetId) => api.get(`/data/qa/dashboard/${datasetId}`),
};

export default {
  grants: grantsAPI,
  research: researchAPI,
  data: dataAPI,
};
