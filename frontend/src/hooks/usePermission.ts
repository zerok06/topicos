import { usePermissionStore } from '../store/usePermissionStore'

export const usePermission = (module: string, action: string) => {
  return usePermissionStore((s) => s.hasPermission(module, action))
}

export const useAnyPermission = (...perms: string[]) => {
  return usePermissionStore((s) => s.hasAnyPermission(...perms))
}
