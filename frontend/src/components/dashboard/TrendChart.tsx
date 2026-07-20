import React, { useEffect, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Activity, Calendar } from 'lucide-react'
import { Card } from '../ui/Card'
import { ChartSkeleton } from '../metrics/MetricCardSkeleton'
import { metricsService } from '../../services/metrics.service'
import type { MovementTrend } from '../../types/metrics'

const RANGE_OPTIONS = [
  { label: '7d', value: 7 },
  { label: '14d', value: 14 },
  { label: '30d', value: 30 },
  { label: '90d', value: 90 },
]

export const TrendChart: React.FC = () => {
  const [data, setData] = useState<MovementTrend[]>([])
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState(7)

  useEffect(() => {
    setLoading(true)
    metricsService.getTrends(range)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [range])

  if (loading) {
    return <ChartSkeleton />
  }

  return (
    <Card
      title="Movimientos de Stock"
      icon={<Activity className="w-5 h-5 text-nikeOrange" />}
      action={
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-white/40" />
          <div className="flex bg-black/40 p-0.5 rounded-lg border border-white/5 gap-0.5">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setRange(opt.value)}
                className={`px-2 py-0.5 text-[9px] font-bold rounded-md transition-all ${
                  range === opt.value
                    ? 'bg-nikeOrange text-white shadow-sm'
                    : 'text-white/40 hover:text-white/80'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      }
    >
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="trendEntradas" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#FA5400" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#FA5400" stopOpacity={0.01} />
            </linearGradient>
            <linearGradient id="trendSalidas" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#FF7A00" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#FF7A00" stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
          <XAxis dataKey="date" stroke="rgba(255,255,255,0.4)" fontSize={10} tickLine={false} />
          <YAxis stroke="rgba(255,255,255,0.4)" fontSize={12} tickLine={false} />
          <Tooltip contentStyle={{ background: '#09090b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px', color: 'rgba(255,255,255,0.9)' }} />
          <Legend wrapperStyle={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }} />
          <Area type="monotone" dataKey="entradas" stroke="#FA5400" strokeWidth={2.5} fill="url(#trendEntradas)" name="Entradas" />
          <Area type="monotone" dataKey="salidas" stroke="#FF7A00" strokeWidth={2} strokeDasharray="5 5" fill="url(#trendSalidas)" name="Salidas" />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  )
}
