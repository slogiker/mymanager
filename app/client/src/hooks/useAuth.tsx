import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from '../lib/api';
import type { User } from '../types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ user: User; mustChangePassword: boolean }>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<User>('/auth/me')
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(username: string, password: string) {
    const data = await api.post<{ user: User; mustChangePassword?: boolean; must_change_password?: boolean }>('/auth/login', { username, password });
    const mustChange = Boolean(data.mustChangePassword || data.must_change_password || data.user?.must_change_password);
    const userObj: User = {
      ...data.user,
      must_change_password: mustChange ? 1 : 0,
    };
    setUser(userObj);
    return {
      user: userObj,
      mustChangePassword: mustChange,
      must_change_password: mustChange,
      role: userObj.role,
    };
  }

  async function logout() {
    await api.post('/auth/logout');
    setUser(null);
  }

  async function changePassword(currentPassword: string, newPassword: string) {
    await api.post('/auth/change-password', { currentPassword, newPassword });
    setUser(prev => prev ? { ...prev, must_change_password: 0 } : prev);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, changePassword, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
