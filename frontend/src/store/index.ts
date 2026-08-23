import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser } from '../types';

interface AppState {
  user: AuthUser | null;
  is3DMode: boolean;
  sidebarOpen: boolean;
  setUser: (user: AuthUser | null) => void;
  toggle3DMode: () => void;
  toggleSidebar: () => void;
  logout: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      is3DMode: true,
      sidebarOpen: true,
      setUser: (user) => set({ user }),
      toggle3DMode: () => set((s) => ({ is3DMode: !s.is3DMode })),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      logout: () => set({ user: null }),
    }),
    { name: 'waste-app-store', partialize: (s) => ({ user: s.user, is3DMode: s.is3DMode }) }
  )
);
