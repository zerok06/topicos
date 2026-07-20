import React, { useEffect, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { Truck, Activity } from 'lucide-react'
import { Card } from '../ui/Card'
import { ChartSkeleton } from '../metrics/MetricCardSkeleton'
import { metricsService } from '../../services/metrics.service'
import type { ShipmentStats } from '../../types/metrics'

const STATUS_FILTERS = [
  { label: 'Todos', value: 'all' },
  { label: 'En tránsito', value: 'transit' },
  { label: 'Entregado', value: 'delivered' },
  { label: 'Retrasado', value: 'delayed' },
]

export const ShipmentDonut: React.FC = () => {
  const [data, setData] = useState<ShipmentStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeIndex, setActiveIndex] = useState<number>(0)
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    setLoading(true)
    metricsService.getShipmentStats()
      .then((res) => {
        setData(res)
        if (res && Object.keys(res.by_status).length > 0) {
          setActiveIndex(0)
        }
      })
      .catch(() => { })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <ChartSkeleton />
  }

  const getStatusColor = (name: string): string => {
    const n = name.toLowerCase()
    if (n.includes('entregado') || n.includes('delivered')) return '#FA5400'
    if (n.includes('tránsito') || n.includes('transit') || n.includes('ruta')) return '#FF7A00'
    if (n.includes('retrasado') || n.includes('delay') || n.includes('incidencia')) return '#ef4444'
    return '#475569'
  }

  const statusPriority = (name: string): number => {
    const n = name.toLowerCase()
    if (n.includes('retrasado') || n.includes('delay')) return 0
    if (n.includes('tránsito') || n.includes('transit')) return 1
    if (n.includes('entregado') || n.includes('delivered')) return 2
    return 3
  }

  let chartData = data
    ? Object.entries(data.by_status).map(([name, value]) => ({
        name, value, color: getStatusColor(name),
        priority: statusPriority(name),
      })).sort((a, b) => a.priority - b.priority)
    : []

  if (statusFilter !== 'all') {
    const filterMap: Record<string, string> = {
      transit: 'tránsito',
      delivered: 'entregado',
      delayed: 'retrasado',
    }
    const kw = filterMap[statusFilter]
    chartData = chartData.filter(d => d.name.toLowerCase().includes(kw))
  }

  const totalShipments = chartData.reduce((acc, curr) => acc + curr.value, 0)
  const activeItem = chartData[activeIndex] || chartData[0]
  const percentage = totalShipments > 0 ? ((activeItem?.value || 0) / totalShipments * 100).toFixed(1) : 0

  return (
    <Card
      title="Estado de Envíos"
      icon={<Truck className="w-5 h-5 text-nikeOrange" />}
      action={
        <div className="flex bg-black/40 p-0.5 rounded-lg border border-white/5 gap-0.5">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`px-2 py-0.5 text-[9px] font-bold rounded-md transition-all ${
                statusFilter === f.value
                  ? 'bg-nikeOrange text-white shadow-sm'
                  : 'text-white/40 hover:text-white/80'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        <div className="md:col-span-7 h-[200px] relative flex items-center justify-center bg-white/[0.02] rounded-2xl border border-white/5 p-2">
          <div className="absolute top-2 left-3 text-[10px] font-mono text-white/70 uppercase tracking-widest flex items-center gap-1">
            <Activity className="w-3 h-3 text-white/40" /> Monitoreo Activo
          </div>

          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%" cy="50%"
                innerRadius={50}
                outerRadius={70}
                paddingAngle={6}
                dataKey="value"
                onMouseEnter={(_, index) => setActiveIndex(index)}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    stroke="rgba(255,255,255,0.15)"
                    strokeWidth={index === activeIndex ? 2 : 1}
                    style={{
                      filter: index === activeIndex ? `drop-shadow(0px 0px 8px ${entry.color}80)` : 'none',
                      transition: 'all 0.3s ease',
                    }}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: '#09090b',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  fontSize: '12px',
                  color: '#fff',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.8)',
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          {activeItem && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
              <span className="text-[10px] font-mono text-slate-400 uppercase max-w-[80px] truncate">{activeItem.name}</span>
              <span className="text-lg font-extrabold text-white mt-0.5">{activeItem.value}</span>
              <span className="text-[10px] font-bold text-white/80">{percentage}%</span>
            </div>
          )}
        </div>

        <div className="md:col-span-5 flex flex-col gap-2 justify-center">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">
            Resumen ({totalShipments} Total)
          </div>
          <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
            {chartData.map((item, index) => {
              const itemPct = totalShipments > 0 ? ((item.value / totalShipments) * 100).toFixed(0) : 0
              const isSelected = index === activeIndex
              return (
                <div
                  key={index}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-white/10 border-white/20'
                      : 'bg-black/20 border-white/5 hover:border-white/10'
                  }`}
                  style={isSelected ? { boxShadow: `0 0 12px ${item.color}33` } : undefined}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: item.color }} />
                    <span className="text-xs font-semibold text-slate-200">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400">{itemPct}%</span>
                    <span className="text-xs font-bold text-white bg-white/5 px-2 py-0.5 rounded-md border border-white/5">{item.value}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </Card>
  )
}
