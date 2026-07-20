import React from 'react'
import { Card } from '../ui/card'
import { cn } from '../../lib/utils'

interface ChartContainerProps {
  title: string
  icon?: React.ReactNode
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
  height?: number
}

export const ChartContainer: React.FC<ChartContainerProps> = ({
  title,
  icon,
  action,
  children,
  className,
}) => {
  return (
    <Card
      title={title}
      icon={icon}
      action={action}
      className={cn(className)}
    >
      {children}
    </Card>
  )
}

export const chartTooltipStyle = {
  background: '#1C1C1E',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '12px',
  fontSize: '12px',
  color: 'rgba(255,255,255,0.9)',
}

export const chartAxisStyle = {
  stroke: 'rgba(255,255,255,0.4)',
  fontSize: 12,
  tickLine: false as const,
}

export const chartGridStyle = {
  strokeDasharray: '3 3',
  stroke: 'rgba(255,255,255,0.05)',
}

export const CHART_COLORS = {
  nikeOrange: '#FA5400',
  green: '#00C49F',
  yellow: '#FFBB28',
  red: '#FF6B6B',
  purple: '#8884D8',
  blue: '#3B82F6',
  pink: '#EC4899',
  cyan: '#06B6D4',
}

export const COLOR_PALETTE = [
  CHART_COLORS.nikeOrange,
  CHART_COLORS.green,
  CHART_COLORS.yellow,
  CHART_COLORS.red,
  CHART_COLORS.purple,
  CHART_COLORS.blue,
  CHART_COLORS.pink,
  CHART_COLORS.cyan,
]
