import { createContext, useContext, useEffect, useMemo, useState } from 'react';

// Use explicit URL if set, otherwise use direct URL (CORS enabled on backend)
// FORCE PORT 5002 - DO NOT USE 5001
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5002').replace(':5001', ':5002');
console.log('🚀 AuthContext initialized with API_BASE_URL:', API_BASE_URL, '| ENV:', import.meta.env.VITE_API_BASE_URL);
const AuthContext = createContext(null);
const STORAGE_KEY = 'datanexus-auth';

export const AuthProvider = ({ children }) => {
  const [authState, setAuthState] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return { token: null, user: null };
    }
    try {
      return JSON.parse(stored);
    } catch (error) {
      console.warn('Failed to parse auth storage', error);
      return { token: null, user: null };
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (authState?.token) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(authState));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [authState]);

  const login = async (username, password) => {
    setLoading(true);
    setError(null);
    try {
      // Force use port 5002 - replace any 5001 with 5002
      const baseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5002').replace(':5001', ':5002');
      const url = `${baseUrl}/api/auth/login`;
      console.log('🔍 Login Debug:', { url, baseUrl, env: import.meta.env.VITE_API_BASE_URL, dev: import.meta.env.DEV });
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Invalid credentials.');
      }
      const data = await response.json();
      setAuthState({ token: data.token, user: data.user });
      return { token: data.token, user: data.user };
    } catch (err) {
      setAuthState({ token: null, user: null });
      setError(err.message || 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setAuthState({ token: null, user: null });
    setError(null);
  };

  const value = useMemo(
    () => ({
      token: authState?.token || null,
      user: authState?.user || null,
      role: authState?.user?.role || null,
      isAuthenticated: Boolean(authState?.token),
      loading,
      error,
      login,
      logout,
      clearError: () => setError(null),
    }),
    [authState, loading, error],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

