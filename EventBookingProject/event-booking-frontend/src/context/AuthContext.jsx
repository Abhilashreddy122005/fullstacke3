import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginUser, registerUser } from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('eventUser');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Only restore if they have a token (not pending)
        if (parsed.token) setUser(parsed);
      } catch {
        localStorage.removeItem('eventUser');
      }
    }
    setLoading(false);
  }, []);

  const login = async (credentials) => {
    const { data } = await loginUser(credentials);
    setUser(data);
    localStorage.setItem('eventUser', JSON.stringify(data));
    return data;
  };

  const register = async (userData) => {
    const { data } = await registerUser(userData);
    // Only set user in context if not pending (i.e. Student)
    if (!data.pending && data.token) {
      setUser(data);
      localStorage.setItem('eventUser', JSON.stringify(data));
    }
    return data;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('eventUser');
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
