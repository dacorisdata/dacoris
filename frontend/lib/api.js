import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth endpoints
export const authAPI = {
  login: (email, password) => 
    api.post('/api/auth/login', new URLSearchParams({ username: email, password }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    }),
  
  getCurrentUser: () => api.get('/api/auth/me'),
};

// ORCID endpoints
export const orcidAPI = {
  initiateLogin: () => {
    window.location.href = `${API_BASE_URL}/api/auth/orcid/login`;
  },
};

// Onboarding endpoints
export const onboardingAPI = {
  getInstitutions: () => api.get('/api/onboarding/institutions'),
  selectInstitution: (institutionId) => 
    api.post('/api/onboarding/select-institution', { institution_id: institutionId }),
  getStatus: () => api.get('/api/onboarding/status'),
  complete: () => api.post('/api/onboarding/complete'),
};

// Global Admin endpoints
export const globalAdminAPI = {
  listInstitutions: () => api.get('/api/global-admin/institutions'),
  createInstitution: (data) => api.post('/api/global-admin/institutions', data),
  getInstitution: (id) => api.get(`/api/global-admin/institutions/${id}`),
  updateInstitution: (id, data) => api.put(`/api/global-admin/institutions/${id}`, data),
  toggleInstitutionStatus: (id) => api.post(`/api/global-admin/institutions/${id}/toggle-status`),
  createInstitutionAdmin: (institutionId, data) => 
    api.post(`/api/global-admin/institutions/${institutionId}/admin`, data),
  listAllUsers: (skip = 0, limit = 100) => 
    api.get('/api/global-admin/users', { params: { skip, limit } }),
  getAnalytics: () => api.get('/api/global-admin/analytics'),
  getInstitutionUsers: (institutionId) => 
    api.get(`/api/global-admin/institutions/${institutionId}/users`),
};

// Institution Admin endpoints
export const institutionAdminAPI = {
  getUsers: () => api.get('/api/institution-admin/users'),
  getStats: () => api.get('/api/institution-admin/stats'),
  listUsers: (skip = 0, limit = 100) => 
    api.get('/api/institution-admin/users', { params: { skip, limit } }),
  listPendingUsers: () => api.get('/api/institution-admin/users/pending'),
  approveUser: (userId) => 
    api.post(`/api/institution-admin/users/${userId}/approve`),
  rejectUser: (userId) => 
    api.post(`/api/institution-admin/users/${userId}/reject`),
  assignRoles: (userId, roles, primary_account_type) =>
    api.post(`/api/institution-admin/users/${userId}/roles`, { roles, primary_account_type }),
  getUserRoles: (userId) => api.get(`/api/institution-admin/users/${userId}/roles`),
  getRoles: () => api.get('/api/institution-admin/roles'),
  createRole: (data) => api.post('/api/institution-admin/roles', data),
  getInstitutionSettings: () => api.get('/api/institution-admin/settings'),
  updateInstitutionSettings: (data) => api.put('/api/institution-admin/settings', data),
  getAnalytics: () => api.get('/api/institution-admin/analytics'),
};

// Researcher endpoints
export const researcherAPI = {
  getProfile: () => api.get('/api/auth/me'),
  updateProfile: (data) => api.put('/api/auth/me', data),
};

export default api;
