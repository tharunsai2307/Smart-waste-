import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser } from '../types/api';

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  setSession: (token: string, user: AuthUser) => void;
  updateUser: (patch: Partial<AuthUser>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setSession: (token, user) => {
        // eslint-disable-next-line no-console
        console.info('[auth] setSession called', { role: user?.role, mustChangePassword: user?.mustChangePassword });
        set({ token, user });
      },
      updateUser: (patch) => set((s) => ({ user: s.user ? { ...s.user, ...patch } : s.user })),
      logout: () => {
        // eslint-disable-next-line no-console
        console.warn('[auth] logout() called', new Error('logout stack trace').stack);
        set({ token: null, user: null });
      },
    }),
    {
      name: 'smart-waste-auth',
      onRehydrateStorage: () => (state, error) => {
        // eslint-disable-next-line no-console
        if (error) console.error('[auth] failed to rehydrate persisted session', error);
        else console.info('[auth] rehydrated persisted session', { hasToken: !!state?.token, hasUser: !!state?.user });
      },
    }
  )
);
