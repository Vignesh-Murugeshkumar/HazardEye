import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI, setTokens, clearTokens, getAccessToken } from '../services/api';

interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: 'citizen' | 'authority' | 'admin';
  city?: string;
  points: number;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    name: string;
    phone?: string;
    city?: string;
    role?: string;
    invite_code?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing token on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  async function checkAuthStatus() {
    try {
      const token = await getAccessToken();
      if (token) {
        const response = await authAPI.getMe();
        setUser(response.data);
      }
    } catch (error) {
      await clearTokens();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const response = await authAPI.login(email, password);
    const { access_token, refresh_token, user: userData } = response.data;
    await setTokens(access_token, refresh_token);
    setUser(userData);
  }

  async function register(data: {
    email: string;
    password: string;
    name: string;
    phone?: string;
    city?: string;
    role?: string;
    invite_code?: string;
  }) {
    const response = await authAPI.register(data);
    const { access_token, refresh_token, user: userData } = response.data;
    await setTokens(access_token, refresh_token);
    setUser(userData);
  }

  async function logout() {
    await clearTokens();
    setUser(null);
  }

  async function refreshUser() {
    try {
      const response = await authAPI.getMe();
      setUser(response.data);
    } catch (error) {
      // Silently fail — user data will be stale
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
