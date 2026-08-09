'use client';

import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import api, { authAPI } from '../lib/api';
import { isDemoAccount, getDemoRoleById, getDemoRoleByAccountType } from '../lib/demoRoles';

const AuthContext = createContext(null);
const DEMO_ROLE_STORAGE_KEY = 'demoActiveRole';

// Token refresh interval: refresh 5 minutes before expiration
const REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5 minutes

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setTokenState] = useState(null);
  const [refreshToken, setRefreshTokenState] = useState(null);
  const [loading, setLoading] = useState(true);
  const refreshTimerRef = useRef(null);
  const tokenExpiryRef = useRef(null);

  // Clear refresh timer
  const clearRefreshTimer = () => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  };

  // Schedule automatic token refresh
  const scheduleTokenRefresh = (expiresIn) => {
    clearRefreshTimer();
    
    if (!expiresIn) return;
    
    // Convert seconds to milliseconds
    const expiresInMs = expiresIn * 1000;
    
    // Schedule refresh 5 minutes before expiration
    const refreshIn = Math.max(0, expiresInMs - REFRESH_BUFFER_MS);
    
    console.log(`Token will expire in ${expiresInMs}ms. Scheduling refresh in ${refreshIn}ms`);
    
    tokenExpiryRef.current = Date.now() + expiresInMs;
    
    refreshTimerRef.current = setTimeout(async () => {
      console.log('Auto-refreshing token...');
      await performTokenRefresh();
    }, refreshIn);
  };

  // Perform token refresh
  const performTokenRefresh = async () => {
    const currentRefreshToken = localStorage.getItem('refreshToken');
    
    if (!currentRefreshToken) {
      console.log('No refresh token available');
      logout();
      return;
    }

    try {
      console.log('Refreshing access token...');
      const response = await authAPI.refreshToken(currentRefreshToken);
      const { access_token, refresh_token, expires_in } = response.data;
      
      setToken(access_token);
      setRefreshToken(refresh_token);
      
      // Schedule next refresh
      scheduleTokenRefresh(expires_in);
      
      console.log('Token refreshed successfully');
    } catch (error) {
      console.error('Token refresh failed:', error);
      logout();
    }
  };

  useEffect(() => {
    // Load token and user from localStorage on mount
    const storedToken = localStorage.getItem('token');
    const storedRefreshToken = localStorage.getItem('refreshToken');
    const storedUser = localStorage.getItem('user');
    const storedExpiry = localStorage.getItem('tokenExpiry');
    
    if (storedToken && storedUser) {
      setTokenState(storedToken);
      setRefreshTokenState(storedRefreshToken);
      setUser(JSON.parse(storedUser));
      
      // Check if token is expired or about to expire
      if (storedExpiry) {
        const expiry = parseInt(storedExpiry, 10);
        const now = Date.now();
        const timeUntilExpiry = expiry - now;
        
        if (timeUntilExpiry <= 0) {
          // Token already expired, try to refresh
          console.log('Token expired, attempting refresh...');
          performTokenRefresh();
        } else if (timeUntilExpiry < REFRESH_BUFFER_MS) {
          // Token about to expire, refresh now
          console.log('Token expiring soon, refreshing now...');
          performTokenRefresh();
        } else {
          // Schedule refresh for later
          const secondsUntilExpiry = Math.floor(timeUntilExpiry / 1000);
          scheduleTokenRefresh(secondsUntilExpiry);
        }
      }

      // Claim invites sent before account creation (e.g. user already logged in)
      api.post('/grants/proposals/invitations/claim').catch(() => {});
    }
    setLoading(false);
    
    // Cleanup on unmount
    return () => clearRefreshTimer();
  }, []);

  const setToken = (newToken) => {
    localStorage.setItem('token', newToken);
    setTokenState(newToken);
  };

  const setRefreshToken = (newRefreshToken) => {
    localStorage.setItem('refreshToken', newRefreshToken);
    setRefreshTokenState(newRefreshToken);
  };

  const persistUser = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const applyStoredDemoRole = useCallback(async (userData) => {
    if (!isDemoAccount(userData)) return userData;

    const storedRoleId = localStorage.getItem(DEMO_ROLE_STORAGE_KEY);
    if (!storedRoleId) return userData;

    const storedRole = getDemoRoleById(storedRoleId);
    if (!storedRole || storedRole.primaryAccountType === userData.primary_account_type) {
      return userData;
    }

    try {
      const response = await authAPI.switchDemoRole(storedRoleId);
      const updated = response.data;
      persistUser(updated);
      return updated;
    } catch (error) {
      console.error('Failed to restore demo role:', error);
      localStorage.removeItem(DEMO_ROLE_STORAGE_KEY);
      return userData;
    }
  }, []);
  const claimPendingInvites = async () => {
    try {
      const invitationToken =
        typeof window !== 'undefined'
          ? (sessionStorage.getItem('proposalInvitationToken') || new URLSearchParams(window.location.search).get('invitation'))
          : null;
      await api.post('/grants/proposals/invitations/claim', null, {
        params: invitationToken ? { invitation_token: invitationToken } : undefined,
      });
      if (invitationToken && typeof window !== 'undefined') {
        sessionStorage.removeItem('proposalInvitationToken');
      }
    } catch (error) {
      // Non-blocking — login/session should still succeed
      console.warn('Failed to claim pending proposal invites:', error?.response?.data || error.message);
    }
  };

  const fetchUser = async () => {
    try {
      const response = await authAPI.getCurrentUser();
      let userData = await applyStoredDemoRole(response.data);
      if (userData === response.data) {
        persistUser(userData);
      }
      if (isDemoAccount(userData) && !localStorage.getItem(DEMO_ROLE_STORAGE_KEY)) {
        const activeRole = getDemoRoleByAccountType(userData.primary_account_type);
        localStorage.setItem(DEMO_ROLE_STORAGE_KEY, activeRole.id);
      }
      return userData;
    } catch (error) {
      logout();
      return null;
    }
  };

  const login = async (email, password) => {
    try {
      console.log('AuthContext: Starting login...');
      const response = await authAPI.login(email, password);
      console.log('AuthContext: Login response:', response.data);
      const { access_token, refresh_token, expires_in } = response.data;
      
      setToken(access_token);
      setRefreshToken(refresh_token);
      
      // Store expiry time
      const expiryTime = Date.now() + (expires_in * 1000);
      localStorage.setItem('tokenExpiry', expiryTime.toString());
      tokenExpiryRef.current = expiryTime;
      
      // Schedule automatic refresh
      scheduleTokenRefresh(expires_in);
      
      console.log('AuthContext: Token set, fetching user...');
      const userData = await fetchUser();
      await claimPendingInvites();
      console.log('AuthContext: User data fetched:', userData);
      return userData;
    } catch (error) {
      console.error('AuthContext: Login error:', error);
      throw error;
    }
  };

  const logout = () => {
    clearRefreshTimer();
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('tokenExpiry');
    localStorage.removeItem('user');
    localStorage.removeItem(DEMO_ROLE_STORAGE_KEY);
    setTokenState(null);
    setRefreshTokenState(null);
    setUser(null);
    tokenExpiryRef.current = null;
  };

  const switchDemoRole = async (roleId) => {
    const role = getDemoRoleById(roleId);
    if (!role) throw new Error('Invalid demo role');

    const response = await authAPI.switchDemoRole(roleId);
    const userData = response.data;
    persistUser(userData);
    localStorage.setItem(DEMO_ROLE_STORAGE_KEY, roleId);
    return userData;
  };

  // Expose refresh function for manual use
  const refreshTokenManually = async () => {
    await performTokenRefresh();
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      refreshToken,
      loading, 
      setToken, 
      setRefreshToken,
      fetchUser, 
      login, 
      logout,
      switchDemoRole,
      refreshToken: refreshTokenManually,
      scheduleTokenRefresh
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
