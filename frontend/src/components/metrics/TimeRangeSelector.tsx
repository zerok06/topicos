import React from 'react'
import { cn } from '../../lib/utils'

const OPTIONS = [
  { label: '7d', value: 7 },
  { label: '14d', value: 14 },
  { label: '30d', value: 30 },
  { label: '90d', value: 90 },
] as const

interface TimeRangeSelectorProps {
  value: number
  onChange: (days: number) => void
}

export const TimeRangeSelector: React.FC<TimeRangeSelectorProps> = ({ value, onChange }) => {
  return (
    <div className="flex items-center gap-1 p-0.5 rounded-lg bg-white/5 border border-white/10">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            'px-3 py-1.5 rounded-md text-xs font-semibold transition-all',
            value === opt.value
              ? 'bg-nikeOrange text-white shadow-lg shadow-nikeOrange/20'
              : 'text-white/50 hover:text-white/80 hover:bg-white/5'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
