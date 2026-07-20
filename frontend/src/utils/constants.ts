import type { UserRole } from '../types/auth'

export const NAV_ITEMS: NavItem[] = [
  {
    path: '/dashboard',
    label: 'Dashboard',
    icon: 'LayoutDashboard',
    roles: ['admin', 'supervisor', 'operador'],
    permissions: ['dashboard.view'],
  },
  {
    path: '/inventory',
    label: 'Inventario',
    icon: 'Package',
    roles: ['admin', 'supervisor', 'operador'],
    permissions: ['inventory.view'],
  },
  {
    path: '/tracking',
    label: 'Tracking',
    icon: 'MapPin',
    roles: ['admin', 'supervisor'],
    permissions: ['tracking.view'],
  },
  {
    path: '/chatbot',
    label: 'Asistente IA',
    icon: 'MessageSquare',
    roles: ['admin', 'supervisor', 'operador'],
    permissions: ['chatbot.view'],
  },
  {
    path: '/audit',
    label: 'Auditoría',
    icon: 'ClipboardList',
    roles: ['admin', 'supervisor'],
    permissions: ['audit.view'],
  },
  {
    path: '/users',
    label: 'Usuarios',
    icon: 'Users',
    roles: ['admin'],
    permissions: ['users.view'],
  },
  {
    path: '/settings',
    label: 'Configuración',
    icon: 'Settings',
    roles: ['admin', 'supervisor', 'operador'],
    permissions: ['settings.view'],
  },
]

export interface NavItem {
  path: string
  label: string
  icon: string
  roles: UserRole[]
  permissions?: string[]
}

export const DEMO_CREDENTIALS = [
  { email: 'admin@nike.com', password: 'admin123', label: 'Administrador' },
  { email: 'supervisor@nike.com', password: 'supervisor123', label: 'Supervisor' },
  { email: 'operador@nike.com', password: 'operador123', label: 'Operador' },
]
