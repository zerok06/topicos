import React, { useEffect, useState } from 'react'
import { Warehouse, AlertCircle } from 'lucide-react'
import { Card } from '../ui/Card'
import { Progress } from '../ui/progress'
import { metricsService } from '../../services/metrics.service'
import type { WarehousePerformance } from '../../types/metrics'
import { Loader } from '../ui/Loader'

export const WarehousePerformanceTable: React.FC = () => {
  const [data, setData] = useState<WarehousePerformance[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    metricsService.getWarehousePerformance()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <Card title="Rendimiento y Ocupación por Sede" icon={<Warehouse className="w-5 h-5 text-white" />}>
        <Loader label="Cargando datos de sedes..." />
      </Card>
    )
  }

  return (
    <Card
      title="Rendimiento y Ocupación por Sede - Logística"
      icon={<Warehouse className="w-5 h-5 text-white" />}
    >
      <div className="text-xs text-white/40 -mt-4 mb-6 italic">
        Monitoreo comparativo de capacidad, inventario y variedad de catálogo por almacén activo
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs md:text-sm">
          <thead>
            <tr className="border-b border-white/10 text-white/40 uppercase tracking-wider text-[10px]">
              <th className="py-3 px-2 font-mono">Sede / Ubicación</th>
              <th className="py-3 px-2 text-right">Productos</th>
              <th className="py-3 px-2 text-right">Stock Total</th>
              <th className="py-3 px-2 w-48">Utilización de Capacidad</th>
              <th className="py-3 px-2 text-right">Estado</th>
            </tr>
          </thead>
          <tbody>
            {data.map((w) => {
              const utilPct = w.utilization * 100
              const isHighUtilization = utilPct > 85

              return (
                <tr
                  key={w.warehouse_id}
                  className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                >
                  <td className="py-3.5 px-2">
                    <div className="flex items-center gap-2">
                      <Warehouse className="w-4 h-4 text-white/60" />
                      <div>
                        <p className="font-bold text-white/90">{w.warehouse_name}</p>
                        <p className="text-[10px] text-white/40 mt-0.5">{w.city || 'Sede Regional'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-2 text-right font-semibold text-white/80">
                    {w.product_count}
                  </td>
                  <td className="py-3.5 px-2 text-right font-mono font-bold text-white/90">
                    {w.total_stock.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-2">
                    <div className="space-y-1">
                      <Progress
                        value={utilPct}
                        className="h-1.5 bg-white/10"
                        indicatorClassName={
                          isHighUtilization
                            ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.7)]'
                            : 'bg-white/70'
                        }
                      />
                      <div className="flex justify-between text-[9px] text-white/40">
                        <span>{utilPct.toFixed(0)}% Utilizado</span>
                        <span>Max: {w.capacity.toLocaleString()}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-2 text-right">
                    {w.critical_count > 0 ? (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">
                        <AlertCircle className="w-3 h-3" /> {w.critical_count} Críticos
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                        Óptimo
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
