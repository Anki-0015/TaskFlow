'use client';

import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { User } from '@/types';
import { AuthService } from '@/services/auth.service';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const token = AuthService.getToken();
    if (!token) return;

    try {
      const res = await AuthService.getMe();
      if (res.success && res.data) setUser(res.data);
      else setUser(null);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Refreshes auth from the cookie/API after the app mounts.
    refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      router.replace('/login');
    };
    window.addEventListener('taskflow:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('taskflow:unauthorized', handleUnauthorized);
  }, [router]);

  const login = async (email: string, password: string) => {
    try {
      const res = await AuthService.login(email, password);
      if (res.success && res.data) {
        setUser(res.data.user);
        return { success: true };
      }
      return { success: false, message: res.message };
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Login failed.';
      return { success: false, message: msg };
    }
  };

  const logout = () => {
    setUser(null);
    AuthService.logout();
    router.replace('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
