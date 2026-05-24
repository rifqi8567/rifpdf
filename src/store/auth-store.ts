import { create } from 'zustand';
import type { User } from '@/types';
import { debugAction } from '@/lib/debug';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  setUser: (user) => {
    debugAction('auth-store', 'user set', {
      userId: user?.id,
      email: user?.email,
      hasAvatar: Boolean(user?.avatar_url),
      isAuthenticated: Boolean(user),
    });
    set({ user, isAuthenticated: !!user, isLoading: false });
  },
  setLoading: (isLoading) => {
    debugAction('auth-store', 'loading set', { isLoading });
    set({ isLoading });
  },
  logout: () => {
    debugAction('auth-store', 'store logout');
    set({ user: null, isAuthenticated: false, isLoading: false });
  },
}));
