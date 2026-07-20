import React from 'react'
import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  Package,
  MapPin,
  MessageSquare,
  ClipboardList,
  Users,
  Settings,
  ChevronLeft,
  LogOut,
  Shield,
  User as UserIcon,
  Users as UsersIcon,
  X,
} from 'lucide-react'
import { useAuthStore } from '../../store/useAuthStore'
import { usePermissionStore } from '../../store/usePermissionStore'
import { NAV_ITEMS } from '../../utils/constants'
import { cn } from '../../lib/utils'

const iconMap: Record<string, React.ReactNode> = {
  LayoutDashboard: <LayoutDashboard className="w-5 h-5" />,
  Package: <Package className="w-5 h-5" />,
  MapPin: <MapPin className="w-5 h-5" />,
  MessageSquare: <MessageSquare className="w-5 h-5" />,
  ClipboardList: <ClipboardList className="w-5 h-5" />,
  Users: <Users className="w-5 h-5" />,
  Settings: <Settings className="w-5 h-5" />,
}

interface SidebarProps {
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
  mobileOpen: boolean
  setMobileOpen: (open: boolean) => void
  isMobile: boolean
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
  isMobile,
}) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout, hasRole } = useAuthStore()
  const { hasPermission } = usePermissionStore()

  const visibleItems = NAV_ITEMS.filter((item) => {
    const hasRequiredRole = hasRole(...item.roles)
    const hasRequiredPermission = !item.permissions || item.permissions.some((p) => {
      const [mod, act] = p.split('.')
      return hasPermission(mod, act)
    })
    return hasRequiredRole && hasRequiredPermission
  })

  const roleIcon =
    user?.role === 'admin' ? (
      <Shield className="w-4 h-4 text-red-500" />
    ) : user?.role === 'supervisor' ? (
      <UsersIcon className="w-4 h-4 text-blue-400" />
    ) : (
      <UserIcon className="w-4 h-4 text-green-400" />
    )

  const roleLabel =
    user?.role === 'admin'
      ? 'Administrador'
      : user?.role === 'supervisor'
        ? 'Supervisor'
        : 'Operador'

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && isMobile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 bg-black/50 z-40"
          />
        )}
      </AnimatePresence>

      <motion.aside
        animate={{
          width: collapsed ? 80 : 260,
          x: isMobile && !mobileOpen ? -300 : 0,
        }}
        className={cn(
          'fixed lg:sticky top-0 left-0 h-screen z-50 glass-panel border-r border-white/10 flex flex-col transition-all',
          isMobile && !mobileOpen && 'pointer-events-none',
        )}
        style={{ width: collapsed ? 80 : 260 }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between gap-3 p-6 border-b border-white/10 h-[70px]">
          <div className="flex items-center gap-3 overflow-hidden">
            <svg
              className="w-16 h-6 text-white fill-current shrink-0 filter drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]"
              viewBox="0 0 24 24"
            >
              <path d="M21 6.5c-2.4 1.6-6.1 3.8-9 5.2-2.3 1.1-4.7 2.1-7.1 2.9-.6.2-1.2.4-1.9.4-.3 0-.6 0-.8-.2-.3-.2-.4-.5-.4-.9 0-1.1.7-2.7 1.8-4.4.9-1.4 2.1-2.9 3.5-4.2.3-.3.8-.4 1.1-.2.3.2.4.6.2 1-.7 1.4-1.4 3.1-1.7 4.5.7-.2 1.5-.6 2.4-1.1 3.2-1.8 7-4.1 10.4-5.6.8-.4 1.7-.8 2.5-.9.4 0 .7.1.8.4.1.3 0 .7-.5 1.1z" />
            </svg>
            {!collapsed && (
              <div className="overflow-hidden">
                <h1 className="text-sm font-bold tracking-wider uppercase text-white/95 whitespace-nowrap">
                  Nike Logística
                </h1>
                <p className="text-[10px] text-white/40 font-semibold tracking-widest uppercase whitespace-nowrap">
                  Inteligencia
                </p>
              </div>
            )}
          </div>
          {isMobile && (
            <button
              onClick={() => setMobileOpen(false)}
              className="p-2 rounded-xl hover:bg-white/10 text-white/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {visibleItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-3 rounded-xl transition-all group relative',
                  isActive
                    ? 'bg-primary/10 border border-primary/20 text-white shadow-[0_0_15px_rgba(255,255,255,0.06)]'
                    : 'text-white/50 hover:text-white hover:bg-white/5 border border-transparent',
                )}
              >
                <span className="shrink-0">{iconMap[item.icon]}</span>
                {!collapsed && (
                  <span className="text-sm font-semibold whitespace-nowrap">
                    {item.label}
                  </span>
                )}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* User info & logout */}
        <div className="p-3 border-t border-white/10 space-y-2">
          {!collapsed && user && (
            <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5 border border-white/5">
              {roleIcon}
              <div className="overflow-hidden flex-1">
                <div className="text-sm font-semibold text-white/90 truncate">
                  {user.username}
                </div>
                <div className="text-xs text-white/40 truncate">{roleLabel}</div>
              </div>
            </div>
          )}
          <button
            onClick={() => {
              logout()
              navigate({ to: '/login' })
            }}
            className={cn(
              'flex items-center gap-3 px-3 py-3 rounded-xl text-white/50 hover:text-red-400 hover:bg-red-500/10 transition-all w-full',
              collapsed && 'justify-center',
            )}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {!collapsed && (
              <span className="text-sm font-semibold">Cerrar Sesión</span>
            )}
          </button>
        </div>

        {/* Collapse toggle - desktop only */}
        {!isMobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex absolute -right-3 top-[70px] w-6 h-6 rounded-full bg-nikeOrange items-center justify-center text-white shadow-lg transition-transform"
          >
            <ChevronLeft
              className={cn('w-4 h-4 transition-transform', collapsed && 'rotate-180')}
            />
          </button>
        )}
      </motion.aside>
    </>
  )
}
