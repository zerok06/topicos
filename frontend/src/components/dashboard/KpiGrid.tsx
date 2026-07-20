import React, { useEffect, useState } from 'react'
import { Package, DollarSign, Target, CheckCircle2, AlertCircle, TrendingUp } from 'lucide-react'
import { MetricCard } from '../metrics/MetricCard'
import { MetricCardSkeleton } from '../metrics/MetricCardSkeleton'
import { metricsService } from '../../services/metrics.service'
import { useDashboardFilters } from '../../context/DashboardFilterContext'
import type { MetricsSummary } from '../../types/metrics'

const iconMap: Record<string, React.ReactNode> = {
  Package: <Package className="w-4 h-4 text-nikeOrange" />,
  DollarSign: <DollarSign className="w-4 h-4 text-blue-400" />,
  Target: <Target className="w-4 h-4 text-green-400" />,
  CheckCircle2: <CheckCircle2 className="w-4 h-4 text-blue-400" />,
  AlertCircle: <AlertCircle className="w-4 h-4 text-red-400" />,
  TrendingUp: <TrendingUp className="w-4 h-4 text-green-400" />,
}

export const KpiGrid: React.FC = () => {
  const { filters } = useDashboardFilters()
  const [summary, setSummary] = useState<MetricsSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    metricsService.getSummary(filters.timeRange, filters.warehouseId, filters.category)
      .then(setSummary)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [filters.timeRange, filters.warehouseId, filters.category])

  if (loading) {
    return <MetricCardSkeleton count={6} />
  }

  if (!summary) return null

  const kpis = [
    { label: 'Stock Total', value: summary.total_stock, icon: 'Package', color: 'text-nikeOrange', subtitle: `${summary.total_products} prod.` },
    { label: 'Valor Inventario', value: summary.total_value, icon: 'DollarSign', color: 'text-blue-400', subtitle: `$${(summary.total_value / 1000).toFixed(1)}K`, format: true },
    { label: '% Cumplimiento', value: summary.fulfillment_rate, icon: 'Target', color: 'text-green-400', suffix: '%', subtitle: '' },
    { label: 'Nivel Servicio', value: summary.service_level, icon: 'CheckCircle2', color: 'text-blue-400', suffix: '%', subtitle: '' },
    { label: 'Envíos Retrasados', value: summary.delayed_shipments, icon: 'AlertCircle', color: 'text-red-400', subtitle: '' },
    { label: 'Rotación', value: summary.inventory_turnover, icon: 'TrendingUp', color: 'text-green-400', subtitle: '' },
  ]

  return (
    <div className="grid grid-cols-3 lg:grid-cols-6 gap-2 lg:gap-3">
      {kpis.map((kpi, i) => (
        <MetricCard
          key={kpi.label}
          label={kpi.label}
          value={kpi.format ? `$${kpi.value.toLocaleString()}` : kpi.value}
          icon={iconMap[kpi.icon]}
          color={kpi.color}
          iconBg={`${kpi.color.replace('text-', 'bg-')}/10`}
          subtitle={kpi.subtitle}
          index={i}
          compact
        />
      ))}
    </div>
  )
}
