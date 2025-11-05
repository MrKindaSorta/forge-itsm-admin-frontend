import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { AdminUser } from '../types';
import api from './api';

interface AuthContextType {
  admin: AdminUser | null;
  login: (email: string, password: string, turnstileToken: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on mount
    const token = localStorage.getItem('adminToken');
    const adminData = localStorage.getItem('adminUser');

    if (token && adminData) {
      try {
        setAdmin(JSON.parse(adminData));
      } catch (error) {
        console.error('Failed to parse admin data:', error);
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string, turnstileToken: string) => {
    const response = await api.post('/api/admin/auth/login', {
      email,
      password,
      turnstileToken,
    });

    if (response.data.success) {
      const { token, admin: adminUser } = response.data;
      localStorage.setItem('adminToken', token);
      localStorage.setItem('adminUser', JSON.stringify(adminUser));
      setAdmin(adminUser);
    } else {
      throw new Error(response.data.error || 'Login failed');
    }
  };

  const logout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    setAdmin(null);
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider
      value={{
        admin,
        login,
        logout,
        isAuthenticated: !!admin,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
