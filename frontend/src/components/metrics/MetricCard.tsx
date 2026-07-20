import React from 'react'
import { motion } from 'framer-motion'
import { Card } from '../ui/Card'
import { cn } from '../../lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { AnimatedCounter } from './AnimatedCounter'
import { Sparkline } from './Sparkline'

interface MetricCardProps {
  label: string
  value: string | number
  icon: React.ReactNode
  color?: string
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  subtitle?: string
  iconBg?: string
  animate?: boolean
  sparklineData?: { value: number }[]
  index?: number
  compact?: boolean
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.06,
      duration: 0.5,
      ease: [0.25, 0.4, 0.25, 1],
    },
  }),
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  icon,
  color = 'text-white',
  trend,
  trendValue,
  subtitle,
  iconBg = 'bg-nikeOrange/10 border border-nikeOrange/20 text-nikeOrange',
  animate = true,
  sparklineData,
  index = 0,
  compact = false,
}) => {
  const numericValue = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.-]/g, ''))
  const isNumeric = !isNaN(numericValue)

  const getGlowColor = () => {
    const colLower = color.toLowerCase()
    if (colLower.includes('orange') || colLower.includes('nike')) return '#FA5400'
    if (colLower.includes('blue')) return '#3b82f6'
    if (colLower.includes('green') || colLower.includes('emerald')) return '#10b981'
    if (colLower.includes('red') || colLower.includes('rose')) return '#ef4444'
    if (colLower.includes('yellow') || colLower.includes('amber')) return '#f59e0b'
    return '#FA5400'
  }
  const glowHex = getGlowColor()

  const content = (
    <Card
      className={cn(
        'relative overflow-hidden group transition-all duration-300 bg-gradient-to-b from-[#1c1c22] to-[#121215] border border-white/10 hover:border-[var(--glow-color-hover)] shadow-[0_10px_25px_rgba(0,0,0,0.5)] hover:shadow-[0_15px_30px_var(--glow-color-shadow)]',
        compact ? 'p-2.5 lg:p-3' : 'p-4 lg:p-5',
      )}
      style={{
        ['--glow-color-hover' as any]: `${glowHex}40`,
        ['--glow-color-shadow' as any]: `${glowHex}15`,
        ['--glow-color-bg' as any]: `${glowHex}05`,
        ['--glow-color-bg-hover' as any]: `${glowHex}10`,
      }}
    >
      <div
        className="absolute inset-x-0 top-0 h-[2px] opacity-80"
        style={{ backgroundImage: `linear-gradient(to right, transparent, ${glowHex}80, transparent)` }}
      />

      <div
        className="absolute -right-8 -top-8 w-28 h-28 rounded-full blur-2xl pointer-events-none transition-all duration-300 bg-[var(--glow-color-bg)] group-hover:bg-[var(--glow-color-bg-hover)]"
      />

      <div className="flex items-center gap-2.5 relative z-10">
        <div className={cn('w-8 h-8 lg:w-9 lg:h-9 rounded-xl flex items-center justify-center shrink-0 shadow-lg transition-all duration-300', iconBg)}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn(
            'text-white/50 uppercase tracking-wider font-semibold truncate',
            compact ? 'text-[9px] lg:text-[10px]' : 'text-[10px] lg:text-xs',
          )}>
            {label}
          </p>
          <p className={cn('font-extrabold tracking-tight', color, compact ? 'text-base lg:text-lg' : 'text-xl lg:text-3xl mt-1')}>
            {isNumeric && animate ? (
              <AnimatedCounter value={numericValue} format={typeof value === 'string' && value.includes('$')} />
            ) : (
              value
            )}
          </p>
          {!compact && subtitle && (
            <p className="text-[10px] text-white/40 mt-0.5">{subtitle}</p>
          )}
          {trend && trendValue && (
            <div className="flex items-center gap-1.5 mt-1.5">
              {trend === 'up' && <TrendingUp className="w-3 h-3 text-emerald-400" />}
              {trend === 'down' && <TrendingDown className="w-3 h-3 text-rose-400" />}
              {trend === 'neutral' && <Minus className="w-3 h-3 text-white/40" />}
              <span
                className={cn(
                  'text-[9px] font-bold px-1.5 py-0.5 rounded-full border',
                  trend === 'up' && 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                  trend === 'down' && 'bg-rose-500/10 text-rose-400 border-rose-500/20',
                  trend === 'neutral' && 'bg-white/5 text-white/50 border-white/10',
                )}
              >
                {trendValue}
              </span>
            </div>
          )}
          {sparklineData && (
            <div className="mt-1.5 opacity-40 group-hover:opacity-100 transition-opacity duration-200">
              <Sparkline data={sparklineData} color={color === 'text-rose-400' ? '#fb7185' : '#22d3ee'} />
            </div>
          )}
        </div>
      </div>
    </Card>
  )

  if (animate) {
    return (
      <motion.div
        custom={index}
        initial="hidden"
        animate="visible"
        variants={cardVariants}
      >
        {content}
      </motion.div>
    )
  }

  return content
}
