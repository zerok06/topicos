import React, { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { ChartSkeleton } from '../metrics/MetricCardSkeleton'
import { metricsService } from '../../services/metrics.service'
import type { Alert } from '../../types/metrics'
import { useDashboardFilters } from '../../context/DashboardFilterContext'

export const AlertsPanel: React.FC = () => {
  const { filters } = useDashboardFilters()
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    metricsService.getAlerts(filters.warehouseId)
      .then(setAlerts)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [filters.warehouseId])

  if (loading) {
    return <ChartSkeleton />
  }

  const criticalAlerts = alerts.filter((a) => a.severity === 'high').slice(0, 5)

  return (
    <Card
      title={`Alertas Críticas (${criticalAlerts.length})`}
      icon={<AlertTriangle className="w-5 h-5 text-red-400" />}
    >
      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {criticalAlerts.length === 0 ? (
          <p className="text-sm text-white/30 text-center py-8">No hay alertas activas.</p>
        ) : (
          criticalAlerts.map((alert, i) => (
            <div
              key={`${alert.type}-${i}`}
              className={`p-2.5 rounded-lg border ${
                alert.severity === 'high'
                  ? 'bg-red-500/5 border-red-500/20'
                  : 'bg-yellow-500/5 border-yellow-500/20'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-semibold text-white/90">{alert.title}</p>
                <Badge variant={alert.severity === 'high' ? 'danger' : 'warning'}>
                  {alert.severity}
                </Badge>
              </div>
              <p className="text-[10px] text-white/40 mt-1">{alert.description}</p>
            </div>
          ))
        )}
      </div>
    </Card>
  )
}
