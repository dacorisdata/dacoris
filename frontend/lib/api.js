import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

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

// Response interceptor to handle errors and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If error is 401 and we haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers['Authorization'] = 'Bearer ' + token;
          return api(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');
      
      if (!refreshToken) {
        // No refresh token, logout
        isRefreshing = false;
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('tokenExpiry');
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      try {
        // Try to refresh the token
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken
        });
        
        const { access_token, refresh_token: new_refresh_token, expires_in } = response.data;
        
        // Update stored tokens
        localStorage.setItem('token', access_token);
        localStorage.setItem('refreshToken', new_refresh_token);
        
        // Update expiry
        const expiryTime = Date.now() + (expires_in * 1000);
        localStorage.setItem('tokenExpiry', expiryTime.toString());
        
        // Update the authorization header
        api.defaults.headers.common['Authorization'] = 'Bearer ' + access_token;
        originalRequest.headers['Authorization'] = 'Bearer ' + access_token;
        
        // Process queued requests
        processQueue(null, access_token);
        isRefreshing = false;
        
        // Retry the original request
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, logout
        processQueue(refreshError, null);
        isRefreshing = false;
        
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('tokenExpiry');
        
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        
        return Promise.reject(refreshError);
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
  
  refreshToken: (refreshToken) => 
    api.post('/auth/refresh', { refresh_token: refreshToken }),
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
  deleteUser: (userId) => 
    api.delete(`/institution-admin/users/${userId}`),
  suspendUser: (userId) => 
    api.post(`/institution-admin/users/${userId}/suspend`),
  activateUser: (userId) => 
    api.post(`/institution-admin/users/${userId}/activate`),
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

// Training & Capacity Building endpoints
export const trainingAPI = {
  adminStats: () => api.get('/training/stats/admin'),
  learnerStats: () => api.get('/training/stats/learner'),
  listPrograms: (params) => api.get('/training/programs', { params }),
  getProgram: (id) => api.get(`/training/programs/${id}`),
  createProgram: (data) => api.post('/training/programs', data),
  updateProgram: (id, data) => api.put(`/training/programs/${id}`, data),
  deleteProgram: (id) => api.delete(`/training/programs/${id}`),
  listEnrollments: (params) => api.get('/training/enrollments', { params }),
  myEnrollments: () => api.get('/training/enrollments/my'),
  enroll: (data) => api.post('/training/enrollments', data),
  updateEnrollment: (id, data) => api.patch(`/training/enrollments/${id}`, data),
  myCertificates: () => api.get('/training/certificates/my'),
  verifyCertificate: (code) => api.get(`/training/certificates/verify/${code}`),
  skillsCatalog: () => api.get('/training/skills/catalog'),
  mySkills: () => api.get('/training/skills/my'),
  addSkill: (data) => api.post('/training/skills', data),
  updateSkill: (id, data) => api.put(`/training/skills/${id}`, data),
  deleteSkill: (id) => api.delete(`/training/skills/${id}`),
  myNeedsAssessment: () => api.get('/training/needs-assessment/my'),
  submitNeedsAssessment: (data) => api.post('/training/needs-assessment', data),
  listNeedsAssessments: (params) => api.get('/training/needs-assessments', { params }),
  reviewNeedsAssessment: (id, data) => api.patch(`/training/needs-assessments/${id}`, data),
  myCPD: (params) => api.get('/training/cpd/my', { params }),
  addCPD: (data) => api.post('/training/cpd', data),
};

export default api;
