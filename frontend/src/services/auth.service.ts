import api from './api'
import type {
  LoginCredentials, RegisterData, TokenResponse, User,
  UserUpdateData, ChangePasswordData,
  Permission, UserPermissionsResponse, SetUserPermissionRequest,
} from '../types/auth'

export const authService = {
  async login(credentials: LoginCredentials): Promise<TokenResponse> {
    const res = await api.post<TokenResponse>('/auth/login', credentials)
    return res.data
  },

  async register(data: RegisterData): Promise<TokenResponse> {
    const res = await api.post<TokenResponse>('/auth/register', data)
    return res.data
  },

  async getMe(): Promise<User> {
    const res = await api.get<User>('/auth/me')
    return res.data
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout')
  },

  async listUsers(): Promise<User[]> {
    const res = await api.get<User[]>('/auth/users')
    return res.data
  },

  async getUser(id: number): Promise<User> {
    const res = await api.get<User>(`/auth/users/${id}`)
    return res.data
  },

  async updateUser(id: number, data: UserUpdateData): Promise<User> {
    const res = await api.patch<User>(`/auth/users/${id}`, data)
    return res.data
  },

  async toggleUserActive(id: number): Promise<User> {
    const res = await api.patch<User>(`/auth/users/${id}/toggle-active`)
    return res.data
  },

  async deleteUser(id: number): Promise<{ message: string }> {
    const res = await api.delete<{ message: string }>(`/auth/users/${id}`)
    return res.data
  },

  async resetUserPassword(id: number, newPassword: string): Promise<{ message: string }> {
    const res = await api.post<{ message: string }>(`/auth/users/${id}/reset-password`, { new_password: newPassword })
    return res.data
  },

  async changeMyPassword(data: ChangePasswordData): Promise<{ message: string }> {
    const res = await api.post<{ message: string }>('/auth/change-password', data)
    return res.data
  },

  async getPermissions(): Promise<Permission[]> {
    const res = await api.get<Permission[]>('/auth/permissions')
    return res.data
  },

  async seedPermissions(): Promise<{ message: string }> {
    const res = await api.post<{ message: string }>('/auth/permissions/seed')
    return res.data
  },

  async getUserPermissions(userId: number): Promise<UserPermissionsResponse> {
    const res = await api.get<UserPermissionsResponse>(`/auth/users/${userId}/permissions`)
    return res.data
  },

  async setUserPermissions(userId: number, permissions: SetUserPermissionRequest[]): Promise<UserPermissionsResponse> {
    const res = await api.put<UserPermissionsResponse>(`/auth/users/${userId}/permissions`, { permissions })
    return res.data
  },

  async getMyPermissions(): Promise<string[]> {
    const res = await api.get<string[]>('/auth/my-permissions')
    return res.data
  },
}
