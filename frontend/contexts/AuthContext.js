'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setTokenState] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load token and user from localStorage on mount
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
      setTokenState(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const setToken = (newToken) => {
    localStorage.setItem('token', newToken);
    setTokenState(newToken);
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
      const { access_token } = response.data;
      setToken(access_token);
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
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setTokenState(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, setToken, fetchUser, login, logout }}>
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
