import { create } from 'zustand';
import { debugAction } from '@/lib/debug';

interface SidebarState {
  isOpen: boolean;
  isCollapsed: boolean;
  toggle: () => void;
  setOpen: (open: boolean) => void;
  setCollapsed: (collapsed: boolean) => void;
}

export const useSidebarStore = create<SidebarState>()((set) => ({
  isOpen: false,
  isCollapsed: false,
  toggle: () =>
    set((state) => {
      const isOpen = !state.isOpen;
      debugAction('sidebar', 'sidebar toggled', { from: state.isOpen, to: isOpen });
      return { isOpen };
    }),
  setOpen: (isOpen) => {
    debugAction('sidebar', 'sidebar open set', { isOpen });
    set({ isOpen });
  },
  setCollapsed: (isCollapsed) => {
    debugAction('sidebar', 'sidebar collapsed set', { isCollapsed });
    set({ isCollapsed });
  },
}));
