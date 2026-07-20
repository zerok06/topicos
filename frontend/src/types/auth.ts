export type UserRole = 'admin' | 'supervisor' | 'operador'

export interface User {
  user_id: number
  email: string
  username: string
  role: UserRole
  warehouse_id?: number | null
  is_active: boolean
  created_at: string | null
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  username: string
  password: string
  role: UserRole
  warehouse_id?: number | null
}

export interface UserUpdateData {
  email?: string
  username?: string
  role?: UserRole
  warehouse_id?: number | null
  is_active?: boolean
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  user: User
}

export interface Permission {
  permission_id: number
  module: string
  action: string
  label: string
  description: string | null
}

export interface UserPermissionsResponse {
  user_id: number
  permissions: string[]
}

export interface SetUserPermissionRequest {
  permission_id: number
  granted: boolean
}

export interface ChangePasswordData {
  current_password: string
  new_password: string
}
