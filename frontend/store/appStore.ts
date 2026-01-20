import { create } from 'zustand';

type AppState = {
  user: { id: string; email: string } | null;
  setUser: (u: { id: string; email: string } | null) => void;
};

export const useAppStore = create<AppState>((set) => ({
  user: null,
  setUser: (u) => set({ user: u })
}));

