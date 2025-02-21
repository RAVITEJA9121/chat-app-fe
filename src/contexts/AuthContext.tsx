import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, userAPI } from '@/services/api';

interface User {
  email: string;
  full_name: string;
  date_of_birth?: string;
  full_address: string;
  phone_number: string;
  avatar_url?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (userData: {
    email: string;
    password: string;
    full_name: string;
    date_of_birth?: string;
    full_address: string;
    phone_number: string;
  }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const userData = await userAPI.getProfile();
        setUser(userData);
      }
    } catch (error) {
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await authAPI.login(email, password);
    localStorage.setItem('token', response.token);
    const userData = await userAPI.getProfile();
    setUser(userData);
  };

  const logout = async () => {
    await authAPI.logout();
    setUser(null);
  };

  const register = async (userData: {
    email: string;
    password: string;
    full_name: string;
    date_of_birth?: string;
    full_address: string;
    phone_number: string;
  }) => {
    const response = await authAPI.register(userData);
    localStorage.setItem('token', response.token);
    setUser(response.user);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 