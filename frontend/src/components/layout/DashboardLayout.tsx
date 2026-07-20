import React, { useState } from 'react'
import { useLocation } from '@tanstack/react-router'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { useWebSocket } from '../../hooks/useWebSocket'
import { useIsMobile } from '../../hooks/useIsMobile'
import { inventoryService } from '../../services/inventory.service'
import { useSidebarStore } from '../../store/useSidebarStore'

interface DashboardLayoutProps {
  children: React.ReactNode
}

const pageTitleMap: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/inventory': 'Inventario',
  '/tracking': 'Tracking',
  '/chatbot': 'Asistente IA',
  '/audit': 'Auditoría',
  '/users': 'Usuarios',
  '/settings': 'Configuración',
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const isMobile = useIsMobile()
  const [mobileOpen, setMobileOpen] = useState(false)
  const collapsed = useSidebarStore((s) => s.collapsed)
  const setCollapsed = useSidebarStore((s) => s.setCollapsed)
  const location = useLocation()

  const wsUrl = import.meta.env.VITE_API_BASE_URL
    ? `${import.meta.env.VITE_API_BASE_URL.replace('http', 'ws')}/ws/stock`
    : `ws://${window.location.host}/api/v1/ws/stock`

  const { isConnected, fallbackToPolling } = useWebSocket({
    url: wsUrl,
    onMessage: () => {},
    onFallbackTriggered: () => {
      const interval = setInterval(() => {
        const token = localStorage.getItem('access_token')
        if (!token) {
          clearInterval(interval)
          return
        }
        inventoryService.getStock().catch(() => {})
      }, 10000)
      return () => clearInterval(interval)
    },
  })

  const title = pageTitleMap[location.pathname] || 'Dashboard'

  return (
    <div className="h-screen bg-command-center text-white flex">
      {/* Background command center tactical canvas */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute inset-0 dot-matrix" />
        <div className="absolute inset-0 tech-grid" />
        {/* Spotlights: Stark White top-right, Metallic Silver bottom-left */}
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-white/4 rounded-full blur-[150px]" />
        <div className="absolute -bottom-40 -left-40 w-[750px] h-[750px] bg-slate-500/4 rounded-full blur-[180px]" />
      </div>

      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        isMobile={isMobile}
      />

      <div className="flex-1 flex flex-col min-w-0 relative z-10 overflow-y-auto">
        <Header
          title={title}
          onMenuClick={() => setMobileOpen(true)}
          wsConnected={isConnected}
          wsFallback={fallbackToPolling}
          isMobile={isMobile}
        />

        <main className="flex-1 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
