import React from 'react'
import { Menu, Wifi, WifiOff, AlertTriangle, ShieldAlert } from 'lucide-react'
import { useAuthStore } from '../../store/useAuthStore'
import { Avatar, AvatarFallback } from '../ui/avatar'

interface HeaderProps {
  title: string
  onMenuClick: () => void
  wsConnected: boolean
  wsFallback: boolean
  isMobile: boolean
}

export const Header: React.FC<HeaderProps> = ({
  title,
  onMenuClick,
  wsConnected,
  wsFallback,
  isMobile,
}) => {
  const { user } = useAuthStore()

  const roleLabel =
    user?.role === 'admin'
      ? 'Administrador'
      : user?.role === 'supervisor'
        ? 'Supervisor'
        : 'Operador'

  return (
    <header className="sticky top-0 z-30 glass-panel border-b border-white/10 bg-background/60 backdrop-blur-xl px-4 md:px-6 h-[70px] flex items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        {isMobile && (
          <button
            onClick={onMenuClick}
            className="p-2 rounded-xl hover:bg-white/5 text-white/60"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <h1 className="text-lg md:text-xl font-bold tracking-tight text-white/95 capitalize">
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        {/* Connection indicator */}
        <div className="hidden md:flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10 text-xs text-white/70">
          {wsConnected ? (
            <Wifi className="w-4 h-4 text-green-500" />
          ) : wsFallback ? (
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
          ) : (
            <WifiOff className="w-4 h-4 text-red-500" />
          )}
          <span className="hidden lg:inline">
            {wsConnected
              ? 'Real-Time'
              : wsFallback
                ? 'Fallback Polling'
                : 'Disconnected'}
          </span>
        </div>

        {/* Role badge */}
        <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10 text-xs text-white/70">
          <ShieldAlert className="w-4 h-4 text-white" />
          <span className="hidden md:inline">
            Rol: <strong className="text-white uppercase tracking-wider">{roleLabel}</strong>
          </span>
        </div>

        {/* User avatar */}
        <Avatar className="w-10 h-10">
          <AvatarFallback>
            {user?.username?.charAt(0).toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
