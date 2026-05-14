import api from './api';

// Grant Module APIs
export const grantsAPI = {
  // Opportunities
  listOpportunities: (status = null) => 
    api.get('/api/grants/opportunities', { params: status ? { status } : {} }),
  createOpportunity: (data) => api.post('/api/grants/opportunities', data),
  getOpportunity: (id) => api.get(`/api/grants/opportunities/${id}`),
  updateOpportunityStatus: (id, status) => 
    api.patch(`/api/grants/opportunities/${id}/status`, null, { params: { status } }),

  // Proposals
  listProposals: () => api.get('/api/grants/proposals'),
  createProposal: (data) => api.post('/api/grants/proposals', data),
  getProposal: (id) => api.get(`/api/grants/proposals/${id}`),
  updateSection: (proposalId, sectionId, data) => 
    api.put(`/api/grants/proposals/${proposalId}/sections/${sectionId}`, data),
  uploadDocument: (proposalId, documentType, file) => {
    const formData = new FormData();
    formData.append('document_type', documentType);
    formData.append('file', file);
    return api.post(`/api/grants/proposals/${proposalId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  transitionStatus: (proposalId, targetStatus) => 
    api.patch(`/api/grants/proposals/${proposalId}/status`, null, { 
      params: { target_status: targetStatus } 
    }),

  // Reviews
  assignReviewer: (proposalId, reviewerId) => 
    api.post(`/api/grants/reviews/proposals/${proposalId}/assign`, { reviewer_id: reviewerId }),
  submitReview: (reviewId, data) => 
    api.post(`/api/grants/reviews/${reviewId}/submit`, data),
  getProposalReviews: (proposalId) => 
    api.get(`/api/grants/reviews/proposals/${proposalId}`),

  // Awards
  issueAward: (data) => api.post('/api/grants/awards', data),
  getAward: (id) => api.get(`/api/grants/awards/${id}`),
  addBudgetLines: (awardId, lines) => 
    api.post(`/api/grants/awards/${awardId}/budget`, lines),
  getBudget: (awardId) => api.get(`/api/grants/awards/${awardId}/budget`),
};

// Research Module APIs
export const researchAPI = {
  // Projects
  listProjects: () => api.get('/api/research/projects'),
  createProject: (data) => api.post('/api/research/projects', data),
  getProject: (id) => api.get(`/api/research/projects/${id}`),
  updateProject: (id, data) => api.patch(`/api/research/projects/${id}`, data),

  // Project Members
  listMembers: (projectId) => api.get(`/api/research/projects/${projectId}/members`),
  inviteMember: (projectId, data) => api.post(`/api/research/projects/${projectId}/members`, data),
  removeMember: (projectId, memberId) => api.delete(`/api/research/projects/${projectId}/members/${memberId}`),

  // Milestones
  listMilestones: (projectId) => api.get(`/api/research/projects/${projectId}/milestones`),
  createMilestone: (projectId, data) => api.post(`/api/research/projects/${projectId}/milestones`, data),
  updateMilestone: (projectId, milestoneId, data) => api.patch(`/api/research/projects/${projectId}/milestones/${milestoneId}`, data),
  addTask: (projectId, milestoneId, data) => api.post(`/api/research/projects/${projectId}/milestones/${milestoneId}/tasks`, data),

  // Project Documents
  listDocuments: (projectId) => api.get(`/api/research/projects/${projectId}/documents`),
  uploadDocument: (projectId, documentType, file) => {
    const fd = new FormData();
    fd.append('document_type', documentType);
    fd.append('file', file);
    return api.post(`/api/research/projects/${projectId}/documents`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // Ethics
  listMyEthics: () => api.get('/api/research/ethics/my'),
  submitEthicsApplication: (data) => api.post('/api/research/ethics', data),
  getProjectEthics: (projectId) => api.get(`/api/research/ethics/project/${projectId}`),
  uploadEthicsDocument: (appId, documentType, file) => {
    const fd = new FormData();
    fd.append('document_type', documentType);
    fd.append('file', file);
    return api.post(`/api/research/ethics/${appId}/documents`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  updateEthicsDecision: (appId, targetStatus, decisionNotes, approvedUntil) =>
    api.patch(`/api/research/ethics/${appId}/decision`, null, {
      params: { target_status: targetStatus, decision_notes: decisionNotes, approved_until: approvedUntil },
    }),

  // Research Outputs
  listOutputs: (projectId = null) => api.get('/api/research/outputs', { params: projectId ? { project_id: projectId } : {} }),
  createOutput: (data) => api.post('/api/research/outputs', data),
  getOutput: (id) => api.get(`/api/research/outputs/${id}`),
  updateOutput: (id, data) => api.patch(`/api/research/outputs/${id}`, data),
  deleteOutput: (id) => api.delete(`/api/research/outputs/${id}`),
  pingPresence: (id) => api.post(`/api/research/outputs/${id}/presence`),
  getPresence: (id) => api.get(`/api/research/outputs/${id}/presence`),

  // Data Import
  submitDataImportRequest: (data) => api.post('/api/research/data-import', data),
  listMyDataImportRequests: () => api.get('/api/research/data-import'),
  listAllDataImportRequests: (status = null) => api.get('/api/admin/data-import', { params: status ? { status } : {} }),
  reviewDataImportRequest: (id, decision) => api.post(`/api/admin/data-import/${id}/review`, decision),
};

// Data Capture Module APIs
export const dataAPI = {
  // Forms
  listForms: () => api.get('/api/data/forms'),
  listFormsEnriched: () => api.get('/api/data/forms/enriched'),
  createForm: (data) => api.post('/api/data/forms', data),
  getForm: (id) => api.get(`/api/data/forms/${id}`),

  // Submissions
  submitData: (formId, data) =>
    api.post(`/api/data/forms/${formId}/submissions`, { data }),
  uploadCSV: (formId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/api/data/forms/${formId}/upload-csv`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  listSubmissions: (formId) => api.get(`/api/data/forms/${formId}/submissions`),
  listAllSubmissions: () => api.get('/api/data/forms/all-submissions'),

  // Datasets
  listDatasets: () => api.get('/api/data/datasets'),
  createDataset: (data) => api.post('/api/data/datasets', data),
  getDataset: (id) => api.get(`/api/data/datasets/${id}`),
  updateDataset: (id, data) => api.patch(`/api/data/datasets/${id}`, data),
  promoteSubmissions: (id) => api.post(`/api/data/datasets/${id}/promote-submissions`),
  listVersions: (id) => api.get(`/api/data/datasets/${id}/versions`),

  // QA
  createQARule: (data) => api.post('/api/data/qa/rules', data),
  listQARules: (datasetId) => api.get(`/api/data/qa/rules/${datasetId}`),
  deleteQARule: (ruleId) => api.delete(`/api/data/qa/rules/${ruleId}`),
  runQAChecks: (datasetId) => api.post(`/api/data/qa/run/${datasetId}`),
  getQAResults: (submissionId) => api.get(`/api/data/qa/results/${submissionId}`),
  overrideQAResult: (resultId) => api.post(`/api/data/qa/results/${resultId}/override`),
  updateSubmissionStatus: (submissionId, status) =>
    api.patch(`/api/data/qa/submissions/${submissionId}/status?target_status=${status}`),
  getQADashboard: (datasetId) => api.get(`/api/data/qa/dashboard/${datasetId}`),
};

export default {
  grants: grantsAPI,
  research: researchAPI,
  data: dataAPI,
};
