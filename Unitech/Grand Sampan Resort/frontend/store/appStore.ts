import { create } from 'zustand';

type AppState = {
  user: { id: string; email: string; role?: string } | null;
  accessToken: string | null;
  refreshToken: string | null;
  setAuth: (input: { user: { id: string; email: string; role?: string } | null; accessToken: string | null; refreshToken: string | null }) => void;
  clearAuth: () => void;
};

export const useAppStore = create<AppState>((set) => ({
  user: null,
  accessToken: typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null,
  refreshToken: typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null,
  setAuth: ({ user, accessToken, refreshToken }) => {
    if (typeof window !== 'undefined') {
      if (accessToken) localStorage.setItem('accessToken', accessToken);
      else localStorage.removeItem('accessToken');
      if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
      else localStorage.removeItem('refreshToken');
    }
    set({ user, accessToken, refreshToken });
  },
  clearAuth: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
    set({ user: null, accessToken: null, refreshToken: null });
  }
}));

