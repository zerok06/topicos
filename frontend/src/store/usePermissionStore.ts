import { create } from 'zustand'
import { authService } from '../services/auth.service'

interface PermissionState {
  permissions: string[]
  loaded: boolean
  loading: boolean
  loadPermissions: () => Promise<void>
  hasPermission: (module: string, action: string) => boolean
  hasAnyPermission: (...perms: string[]) => boolean
  clearPermissions: () => void
}

export const usePermissionStore = create<PermissionState>((set, get) => ({
  permissions: [],
  loaded: false,
  loading: false,

  loadPermissions: async () => {
    set({ loading: true })
    try {
      const perms = await authService.getMyPermissions()
      set({ permissions: perms, loaded: true, loading: false })
    } catch {
      set({ permissions: [], loaded: true, loading: false })
    }
  },

  hasPermission: (module: string, action: string) => {
    const { permissions } = get()
    return permissions.includes(`${module}.${action}`)
  },

  hasAnyPermission: (...perms: string[]) => {
    const { permissions } = get()
    return perms.some((p) => permissions.includes(p))
  },

  clearPermissions: () => {
    set({ permissions: [], loaded: false, loading: false })
  },
}))
