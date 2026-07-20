import React from 'react'
import { Loader2 } from 'lucide-react'

export const Loader: React.FC<{ label?: string }> = ({ label }) => (
  <div className="flex flex-col gap-3 py-10 justify-center items-center">
    <Loader2 className="w-8 h-8 text-primary animate-spin" />
    {label && <span className="text-xs text-white/40">{label}</span>}
  </div>
)

export const FullPageLoader: React.FC<{ label?: string }> = ({ label }) => (
  <div className="min-h-screen bg-background flex flex-col gap-4 justify-center items-center">
    <Loader2 className="w-12 h-12 text-primary animate-spin" />
    {label && <span className="text-sm text-white/40">{label}</span>}
  </div>
)
