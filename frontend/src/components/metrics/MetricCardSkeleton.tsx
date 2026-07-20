import React from 'react'
import { cn } from '../../lib/utils'

interface MetricCardSkeletonProps {
  count?: number
}

export const MetricCardSkeleton: React.FC<MetricCardSkeletonProps> = ({ count = 1 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-3xl glass-panel p-6 shadow-xl relative overflow-hidden">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 space-y-3">
              <div className="h-3 w-24 rounded-full bg-white/5 animate-pulse" />
              <div className="h-8 w-32 rounded-lg bg-white/5 animate-pulse" />
              <div className="h-3 w-20 rounded-full bg-white/5 animate-pulse" />
            </div>
            <div className="w-12 h-12 rounded-xl bg-white/5 animate-pulse shrink-0" />
          </div>
        </div>
      ))}
    </>
  )
}

interface ChartSkeletonProps {
  className?: string
}

export const ChartSkeleton: React.FC<ChartSkeletonProps> = ({ className }) => {
  return (
    <div className={cn("rounded-3xl glass-panel p-6 shadow-xl relative overflow-hidden", className)}>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 rounded-full bg-white/5 animate-pulse" />
          <div className="h-5 w-48 rounded-full bg-white/5 animate-pulse" />
        </div>
      </div>
      <div className="h-[300px] w-full rounded-xl bg-white/[0.02] animate-pulse flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-white/10 border-t-white/30 animate-spin" />
      </div>
    </div>
  )
}
