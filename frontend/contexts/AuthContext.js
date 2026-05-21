'use client';

import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { authAPI } from '../lib/api';

const AuthContext = createContext(null);

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

  const fetchUser = async () => {
    try {
      const response = await authAPI.getCurrentUser();
      const userData = response.data;
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
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
    setTokenState(null);
    setRefreshTokenState(null);
    setUser(null);
    tokenExpiryRef.current = null;
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
