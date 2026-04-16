import { create } from 'zustand';
import { authAPI } from '../lib/api';

const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  // Initialize auth from localStorage
  initAuth: () => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        set({ token, isAuthenticated: true });
        get().fetchUser();
      }
    }
  },

  // Set token and store in localStorage
  setToken: (token) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
    }
    set({ token, isAuthenticated: true });
  },

  // Fetch current user
  fetchUser: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await authAPI.getCurrentUser();
      set({ user: response.data, isLoading: false });
      return response.data;
    } catch (error) {
      set({ 
        error: error.response?.data?.detail || 'Failed to fetch user',
        isLoading: false,
        isAuthenticated: false,
        token: null,
        user: null
      });
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
      }
      return null;
    }
  },

  // Login with email/password (for admins)
  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authAPI.login(email, password);
      const { access_token } = response.data;
      get().setToken(access_token);
      await get().fetchUser();
      set({ isLoading: false });
      return true;
    } catch (error) {
      set({ 
        error: error.response?.data?.detail || 'Login failed',
        isLoading: false 
      });
      return false;
    }
  },

  // Logout
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
    }
    set({ 
      user: null, 
      token: null, 
      isAuthenticated: false,
      error: null 
    });
  },

  // Clear error
  clearError: () => set({ error: null }),
}));

export default useAuthStore;
