import { create } from 'zustand'
import { authService } from '../services/auth.service'
import { usePermissionStore } from './usePermissionStore'
import type { User, LoginCredentials, RegisterData, UserRole } from '../types/auth'

interface AuthState {
  user: User | null
  token: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  login: (credentials: LoginCredentials) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => void
  initializeAuth: () => void
  hasRole: (...roles: UserRole[]) => boolean
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (credentials) => {
    set({ isLoading: true, error: null })
    try {
      const data = await authService.login(credentials)
      localStorage.setItem('access_token', data.access_token)
      localStorage.setItem('refresh_token', data.refresh_token)
      localStorage.setItem('user', JSON.stringify(data.user))
      set({
        user: data.user,
        token: data.access_token,
        refreshToken: data.refresh_token,
        isAuthenticated: true,
        isLoading: false,
      })
      usePermissionStore.getState().loadPermissions()
    } catch (err: any) {
      const message = err.response?.data?.detail || 'Error al iniciar sesión'
      set({ isLoading: false, error: message })
      throw new Error(message)
    }
  },

  register: async (data) => {
    set({ isLoading: true, error: null })
    try {
      const res = await authService.register(data)
      localStorage.setItem('access_token', res.access_token)
      localStorage.setItem('refresh_token', res.refresh_token)
      localStorage.setItem('user', JSON.stringify(res.user))
      set({
        user: res.user,
        token: res.access_token,
        refreshToken: res.refresh_token,
        isAuthenticated: true,
        isLoading: false,
      })
      usePermissionStore.getState().loadPermissions()
    } catch (err: any) {
      const message = err.response?.data?.detail || 'Error al registrar usuario'
      set({ isLoading: false, error: message })
      throw new Error(message)
    }
  },

  logout: () => {
    authService.logout().catch(() => {})
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    usePermissionStore.getState().clearPermissions()
    set({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      error: null,
    })
  },

  initializeAuth: () => {
    const token = localStorage.getItem('access_token')
    const refreshToken = localStorage.getItem('refresh_token')
    const userStr = localStorage.getItem('user')
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr) as User
        set({
          user,
          token,
          refreshToken,
          isAuthenticated: true,
        })
        usePermissionStore.getState().loadPermissions()
      } catch {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user')
      }
    }
  },

  hasRole: (...roles: UserRole[]) => {
    const { user } = get()
    if (!user) return false
    return roles.includes(user.role)
  },

  clearError: () => set({ error: null }),
}))
