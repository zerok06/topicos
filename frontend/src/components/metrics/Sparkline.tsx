import React from 'react'
import { Area, AreaChart, ResponsiveContainer } from 'recharts'

interface SparklineProps {
  data: { value: number }[]
  color?: string
  height?: number
}

export const Sparkline: React.FC<SparklineProps> = ({
  data,
  color = '#FA5400',
  height = 40,
}) => {
  if (!data || data.length < 2) return null

  return (
    <div style={{ height, width: '100%' }}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`sparkGrad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#sparkGrad-${color.replace('#', '')})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
