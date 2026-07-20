import React, { useEffect, useState } from 'react'
import { MapPin, Navigation, Compass, Truck } from 'lucide-react'
import { Card } from '../ui/Card'
import { metricsService } from '../../services/metrics.service'
import type { ShipmentStats } from '../../types/metrics'
import { Loader } from '../ui/Loader'
import { useDashboardFilters } from '../../context/DashboardFilterContext'

export const ShipmentRoutesTable: React.FC = () => {
  const { filters } = useDashboardFilters()
  const [data, setData] = useState<ShipmentStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    metricsService.getShipmentStats(filters.warehouseId)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [filters.warehouseId])

  if (loading) {
    return (
      <Card title="Canales de Distribución y Rutas Activas" icon={<Navigation className="w-5 h-5 text-white" />}>
        <Loader label="Cargando rutas operativas..." />
      </Card>
    )
  }

  const routes = data?.routes || []

  return (
    <Card
      title="Monitoreo de Canales y Rutas Activas - Nike Logistics"
      icon={<Navigation className="w-5 h-5 text-white" />}
    >
      <div className="text-xs text-white/40 -mt-4 mb-6 italic">
        Flujo de despachos interprovinciales, transportista asignado, distancia y tiempos estimados
      </div>

      {routes.length === 0 ? (
        <div className="text-center py-8 text-white/30 text-xs">
          No hay rutas de envío registradas para los filtros seleccionados.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs md:text-sm">
            <thead>
              <tr className="border-b border-white/10 text-white/40 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-2">Nombre de Canal</th>
                <th className="py-3 px-2">Trayecto (Origen ➔ Destino)</th>
                <th className="py-3 px-2 text-right">Distancia</th>
                <th className="py-3 px-2 text-right">Tiempo Est.</th>
                <th className="py-3 px-2">Courier / Proveedor</th>
              </tr>
            </thead>
            <tbody>
              {routes.map((route, i) => (
                <tr
                  key={i}
                  className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                >
                  <td className="py-3.5 px-2">
                    <div className="flex items-center gap-2">
                      <Compass className="w-4 h-4 text-white/50 animate-pulse" />
                      <span className="font-bold text-white/95">{route.route_name}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-2">
                    <div className="flex items-center gap-1.5 font-medium text-white/70">
                      <MapPin className="w-3 h-3 text-white/40" />
                      <span>{route.origin}</span>
                      <span className="text-white/30">➔</span>
                      <span>{route.destination}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-2 text-right font-mono font-bold text-white/80">
                    {route.distance_km} km
                  </td>
                  <td className="py-3.5 px-2 text-right font-semibold text-white/80">
                    {route.estimated_hours} hrs
                  </td>
                  <td className="py-3.5 px-2">
                    <div className="flex items-center gap-1.5 text-white/60">
                      <Truck className="w-3.5 h-3.5 text-white/40" />
                      <span className="bg-white/5 border border-white/10 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase">
                        {route.carrier}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
