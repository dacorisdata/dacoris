import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
    api.post('/auth/login', new URLSearchParams({ username: email, password }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    }),
  
  getCurrentUser: () => api.get('/auth/me'),
};

// ORCID endpoints
export const orcidAPI = {
  initiateLogin: () => {
    window.location.href = `${API_BASE_URL}/auth/orcid/login`;
  },
};

// Onboarding endpoints
export const onboardingAPI = {
  getInstitutions: () => api.get('/onboarding/institutions'),
  selectInstitution: (institutionId) => 
    api.post('/onboarding/select-institution', { institution_id: institutionId }),
  getStatus: () => api.get('/onboarding/status'),
  complete: () => api.post('/onboarding/complete'),
};

// Global Admin endpoints
export const globalAdminAPI = {
  listInstitutions: () => api.get('/global-admin/institutions'),
  createInstitution: (data) => api.post('/global-admin/institutions', data),
  getInstitution: (id) => api.get(`/global-admin/institutions/${id}`),
  updateInstitution: (id, data) => api.put(`/global-admin/institutions/${id}`, data),
  toggleInstitutionStatus: (id) => api.post(`/global-admin/institutions/${id}/toggle-status`),
  createInstitutionAdmin: (institutionId, data) => 
    api.post(`/global-admin/institutions/${institutionId}/admin`, data),
  listAllUsers: (skip = 0, limit = 100) => 
    api.get('/global-admin/users', { params: { skip, limit } }),
  getAnalytics: () => api.get('/global-admin/analytics'),
  getInstitutionUsers: (institutionId) => 
    api.get(`/global-admin/institutions/${institutionId}/users`),
};

// Institution Admin endpoints
export const institutionAdminAPI = {
  getUsers: () => api.get('/institution-admin/users'),
  getStats: () => api.get('/institution-admin/stats'),
  listUsers: (skip = 0, limit = 100) => 
    api.get('/institution-admin/users', { params: { skip, limit } }),
  listPendingUsers: () => api.get('/institution-admin/users/pending'),
  approveUser: (userId) => 
    api.post(`/institution-admin/users/${userId}/approve`),
  rejectUser: (userId) => 
    api.post(`/institution-admin/users/${userId}/reject`),
  assignRoles: (userId, roles, primary_account_type) =>
    api.post(`/institution-admin/users/${userId}/roles`, { roles, primary_account_type }),
  getUserRoles: (userId) => api.get(`/institution-admin/users/${userId}/roles`),
  getRoles: () => api.get('/institution-admin/roles'),
  createRole: (data) => api.post('/institution-admin/roles', data),
  getInstitutionSettings: () => api.get('/institution-admin/settings'),
  updateInstitutionSettings: (data) => api.put('/institution-admin/settings', data),
  getAnalytics: () => api.get('/institution-admin/analytics'),
};

// Researcher endpoints
export const researcherAPI = {
  getProfile: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/me', data),
};

export default api;
