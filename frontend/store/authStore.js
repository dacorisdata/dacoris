import { create } from 'zustand';
import { authAPI } from '../lib/api';

// Token refresh interval: refresh 5 minutes before expiration
const REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5 minutes
let refreshTimer = null;

const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  // Clear refresh timer
  clearRefreshTimer: () => {
    if (refreshTimer) {
      clearTimeout(refreshTimer);
      refreshTimer = null;
    }
  },

  // Schedule automatic token refresh
  scheduleTokenRefresh: (expiresIn) => {
    get().clearRefreshTimer();
    
    if (!expiresIn) return;
    
    // Convert seconds to milliseconds
    const expiresInMs = expiresIn * 1000;
    
    // Schedule refresh 5 minutes before expiration
    const refreshIn = Math.max(0, expiresInMs - REFRESH_BUFFER_MS);
    
    console.log(`Token will expire in ${expiresInMs}ms. Scheduling refresh in ${refreshIn}ms`);
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('tokenExpiry', (Date.now() + expiresInMs).toString());
    }
    
    refreshTimer = setTimeout(async () => {
      console.log('Auto-refreshing token...');
      await get().performTokenRefresh();
    }, refreshIn);
  },

  // Perform token refresh
  performTokenRefresh: async () => {
    const currentRefreshToken = get().refreshToken || 
      (typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null);
    
    if (!currentRefreshToken) {
      console.log('No refresh token available');
      get().logout();
      return;
    }

    try {
      console.log('Refreshing access token...');
      const response = await authAPI.refreshToken(currentRefreshToken);
      const { access_token, refresh_token, expires_in } = response.data;
      
      get().setToken(access_token);
      get().setRefreshToken(refresh_token);
      
      // Schedule next refresh
      get().scheduleTokenRefresh(expires_in);
      
      console.log('Token refreshed successfully');
      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      get().logout();
      return false;
    }
  },

  // Initialize auth from localStorage
  initAuth: () => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      const refreshToken = localStorage.getItem('refreshToken');
      const tokenExpiry = localStorage.getItem('tokenExpiry');
      
      if (token && refreshToken) {
        set({ token, refreshToken, isAuthenticated: true });
        
        // Check if token is expired or about to expire
        if (tokenExpiry) {
          const expiry = parseInt(tokenExpiry, 10);
          const now = Date.now();
          const timeUntilExpiry = expiry - now;
          
          if (timeUntilExpiry <= 0) {
            // Token already expired, try to refresh
            console.log('Token expired, attempting refresh...');
            get().performTokenRefresh();
          } else if (timeUntilExpiry < REFRESH_BUFFER_MS) {
            // Token about to expire, refresh now
            console.log('Token expiring soon, refreshing now...');
            get().performTokenRefresh();
          } else {
            // Schedule refresh for later
            const secondsUntilExpiry = Math.floor(timeUntilExpiry / 1000);
            get().scheduleTokenRefresh(secondsUntilExpiry);
          }
        }
        
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

  // Set refresh token and store in localStorage
  setRefreshToken: (refreshToken) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('refreshToken', refreshToken);
    }
    set({ refreshToken });
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
        refreshToken: null,
        user: null
      });
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('tokenExpiry');
      }
      return null;
    }
  },

  // Login with email/password (for admins)
  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authAPI.login(email, password);
      const { access_token, refresh_token, expires_in } = response.data;
      
      get().setToken(access_token);
      get().setRefreshToken(refresh_token);
      
      // Schedule automatic refresh
      get().scheduleTokenRefresh(expires_in);
      
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
    get().clearRefreshTimer();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('tokenExpiry');
    }
    set({ 
      user: null, 
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      error: null 
    });
  },

  // Clear error
  clearError: () => set({ error: null }),
}));

export default useAuthStore;
