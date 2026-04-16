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

  // Ethics
  submitEthicsApplication: (data) => api.post('/api/research/ethics', data),
  getProjectEthics: (projectId) => api.get(`/api/research/ethics/project/${projectId}`),
  updateEthicsDecision: (appId, targetStatus, decisionNotes, approvedUntil) => 
    api.patch(`/api/research/ethics/${appId}/decision`, null, {
      params: { target_status: targetStatus, decision_notes: decisionNotes, approved_until: approvedUntil }
    }),
};

// Data Capture Module APIs
export const dataAPI = {
  // Forms
  listForms: () => api.get('/api/data/forms'),
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
};

export default {
  grants: grantsAPI,
  research: researchAPI,
  data: dataAPI,
};
