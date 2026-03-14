import { resetProgress } from '@/lib/storage';
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface User {
  token: string;
  username: string;
}

interface AuthContextValue {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({} as AuthContextValue);

const STORAGE_KEY = 'vocab_auth';

function loadUser(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

function saveUser(user: User | null) {
  if (user) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

async function authFetch(endpoint: string, username: string, password: string): Promise<User> {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(body.error ?? 'Request failed');
  }

  const data = await res.json();
  return { token: data.token, username: data.username };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(loadUser);

  const login = useCallback(async (username: string, password: string) => {
    const u = await authFetch('/api/auth/login', username, password);
    saveUser(u);
    setUser(u);
  }, []);

  const register = useCallback(async (username: string, password: string) => {
    const u = await authFetch('/api/auth/register', username, password);
    saveUser(u);
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    saveUser(null);
    setUser(null);
    resetProgress();
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
