import { create } from 'zustand'

interface SidebarState {
  collapsed: boolean
  prevCollapsed: boolean
  setCollapsed: (collapsed: boolean) => void
  restoreCollapsed: () => void
}

export const useSidebarStore = create<SidebarState>((set) => ({
  collapsed: false,
  prevCollapsed: false,
  setCollapsed: (collapsed) => set((state) => ({ collapsed, prevCollapsed: state.collapsed })),
  restoreCollapsed: () => set((state) => ({ collapsed: state.prevCollapsed })),
}))
