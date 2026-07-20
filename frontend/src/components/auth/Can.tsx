import React from 'react'
import { usePermissionStore } from '../../store/usePermissionStore'

interface CanProps {
  module: string
  action: string
  fallback?: React.ReactNode
  children: React.ReactNode
}

export const Can: React.FC<CanProps> = ({ module, action, fallback = null, children }) => {
  const hasPermission = usePermissionStore((s) => s.hasPermission(module, action))
  if (!hasPermission) return <>{fallback}</>
  return <>{children}</>
}
