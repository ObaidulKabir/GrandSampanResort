'use client';
import { create } from 'zustand';

export type User = {
  id: string;
  email: string;
  name?: string;
  emailVerified?: boolean;
  role?: string;
  kyc?: boolean;
};

type AppState = {
  user: User | null;
  token: string | null;
  hydrated: boolean;
  setAuth: (user: User | null, token: string | null) => void;
  patchUser: (patch: Partial<User>) => void;
  hydrate: () => void;
  logout: () => void;
};

const TOKEN_KEY = 'gsr_token';
const USER_KEY = 'gsr_user';

export const useAppStore = create<AppState>((set, get) => ({
  user: null,
  token: null,
  hydrated: false,
  setAuth: (user, token) => {
    if (typeof window !== 'undefined') {
      if (token && user) {
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      }
    }
    set({ user, token });
  },
  patchUser: (patch) => {
    const current = get().user;
    if (!current) return;
    const next = { ...current, ...patch };
    if (typeof window !== 'undefined') {
      localStorage.setItem(USER_KEY, JSON.stringify(next));
    }
    set({ user: next });
  },
  hydrate: () => {
    if (typeof window === 'undefined') {
      set({ hydrated: true });
      return;
    }
    const token = localStorage.getItem(TOKEN_KEY);
    const raw = localStorage.getItem(USER_KEY);
    let user: User | null = null;
    try {
      user = raw ? (JSON.parse(raw) as User) : null;
    } catch {
      user = null;
    }
    set({ user: token && user ? user : null, token: token || null, hydrated: true });
  },
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
    set({ user: null, token: null });
  }
}));
