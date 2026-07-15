import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
      setTenant(data.tenant);
    } catch (err) {
      setUser(null);
      setTenant(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('accessToken', data.accessToken);
      setUser(data.user);
      await fetchProfile();
      return { success: true };
    } catch (err) {
      return { 
        success: false, 
        error: err.response?.data?.message || 'Login failed.',
        code: err.response?.data?.code,
        tenantId: err.response?.data?.tenantId,
        isAdmin: err.response?.data?.isAdmin
      };
    } finally {
      setLoading(false);
    }
  };

  const signup = async (name, email, password, companyName) => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/signup', { name, email, password, companyName });
      localStorage.setItem('accessToken', data.accessToken);
      setUser(data.user);
      await fetchProfile();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'Registration failed.' };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      // Quiet fail
    } finally {
      localStorage.removeItem('accessToken');
      setUser(null);
      setTenant(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, tenant, loading, login, signup, logout, fetchProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
