import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getAuthToken, setAuthToken, clearAuthToken } from '../api/config.js';
import { login as apiLogin, getMe as apiGetMe, logout as apiLogout } from '../api/auth.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => getAuthToken());
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const triggerDataRefresh = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  const verifyCurrentUser = useCallback(async () => {
    const storedToken = getAuthToken();
    if (!storedToken) {
      setUser(null);
      setToken(null);
      setLoading(false);
      return null;
    }

    try {
      setLoading(true);
      const profile = await apiGetMe();
      setUser(profile);
      setToken(storedToken);
      return profile;
    } catch {
      clearAuthToken();
      setUser(null);
      setToken(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    verifyCurrentUser();
  }, [verifyCurrentUser]);

  useEffect(() => {
    const handleUnauthorized = () => {
      clearAuthToken();
      setUser(null);
      setToken(null);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const login = async (email, password) => {
    const result = await apiLogin(email, password);
    if (!result?.token) {
      throw new Error('Authentication failed: No JWT token returned by server.');
    }
    setAuthToken(result.token);
    setToken(result.token);

    const profile = await apiGetMe();
    setUser(profile);
    return profile;
  };

  const logout = useCallback(() => {
    apiLogout();
    setUser(null);
    setToken(null);
  }, []);

  const role = user?.role === 'manager' ? 'manager' : 'staff';
  const isManager = Boolean(user && role === 'manager');
  const isStaff = Boolean(user && role === 'staff');

  const value = {
    user,
    token,
    loading,
    isAuthenticated: Boolean(token && user),
    role,
    isManager,
    isStaff,
    login,
    logout,
    refreshUser: verifyCurrentUser,
    refreshTrigger,
    triggerDataRefresh,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
