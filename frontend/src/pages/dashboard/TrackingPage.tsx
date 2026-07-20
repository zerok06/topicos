import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from 'react-leaflet'
import L from 'leaflet'
import {
  Truck,
  Package,
  Clock,
  Activity,
  CheckCircle2,
  AlertCircle,
  Bike,
  MapPin,
  Navigation,
  Route as RouteIcon,
  Search,
  X,
  DollarSign,
} from 'lucide-react'
import { MetricCard } from '../../components/metrics/MetricCard'
import { Card } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../components/ui/dialog'
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { trackingService } from '../../services/tracking.service'
import api from '../../services/api'
import type { TrackingShipment } from '../../types/tracking'

type VehicleStatus = 'en_transito' | 'pendiente' | 'entregado' | 'retrasado'
type VehicleType = 'truck' | 'van' | 'bike'

interface Vehicle {
  id: string
  type: VehicleType
  driver: string
  origin: string
  destination: string
  cargo: string
  cargoQty: number
  status: VehicleStatus
  progress: number
  eta: string
  distanceKm: number
  traveledKm: number
  route: [number, number][]
  currentPos: [number, number]
  bearing: number
  departureTime: string
  shipmentDate: string | null
  estimatedDelivery: string | null
  carrier: string | null
  estimatedCost: number | null
}

interface Sede {
  id: number
  name: string
  city: string | null
  lat: number
  lng: number
}

const statusConfig: Record<VehicleStatus, { label: string; variant: 'info' | 'warning' | 'success' | 'danger'; color: string }> = {
  en_transito: { label: 'En Tránsito', variant: 'info', color: '#06b6d4' },
  pendiente: { label: 'Pendiente', variant: 'warning', color: '#f59e0b' },
  entregado: { label: 'Entregado', variant: 'success', color: '#10b981' },
  retrasado: { label: 'Retrasado', variant: 'danger', color: '#ef4444' },
}

const getStatusStyles = (status: VehicleStatus) => {
  switch (status) {
    case 'entregado':
      return { bar: 'bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]' }
    case 'en_transito':
      return { bar: 'bg-gradient-to-r from-cyan-600 to-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.5)]' }
    case 'pendiente':
      return { bar: 'bg-gradient-to-r from-amber-600 to-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.5)]' }
    case 'retrasado':
      return { bar: 'bg-gradient-to-r from-red-600 to-red-400 shadow-[0_0_10px_rgba(239,68,68,0.6)] animate-pulse' }
    default:
      return { bar: 'bg-gradient-to-r from-orange-600 to-orange-400' }
  }
}

const sedeStatusColors = {
  active: '#22C55E',
  warning: '#FBBF24',
  critical: '#EF4444',
}

const vehicleIconMap: Record<string, React.ReactNode> = {
  truck: <Truck className="w-4 h-4" />,
  van: <Package className="w-4 h-4" />,
  bike: <Bike className="w-4 h-4" />,
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function calculateBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const y = Math.sin(dLng) * Math.cos((lat2 * Math.PI) / 180)
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.cos(dLng)
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

function buildRoute(waypoints: [number, number][]): { route: [number, number][]; totalDistance: number } {
  const route: [number, number][] = [waypoints[0]]
  let totalDistance = 0
  for (let i = 0; i < waypoints.length - 1; i++) {
    const [lat1, lng1] = waypoints[i]
    const [lat2, lng2] = waypoints[i + 1]
    const dist = haversineDistance(lat1, lng1, lat2, lng2)
    totalDistance += dist
    const segments = Math.max(Math.ceil(dist / 5), 1)
    for (let s = 1; s <= segments; s++) {
      const t = s / segments
      route.push([lat1 + (lat2 - lat1) * t, lng1 + (lng2 - lng1) * t])
    }
  }
  return { route, totalDistance }
}

function getPositionAlongRoute(route: [number, number][], progress: number) {
  if (route.length === 0) return { pos: [0, 0] as [number, number], bearing: 0, segmentIndex: 0 }
  if (route.length === 1) return { pos: route[0], bearing: 0, segmentIndex: 0 }
  const totalSegments = route.length - 1
  const targetSegment = (progress / 100) * totalSegments
  const segmentIndex = Math.min(Math.floor(targetSegment), totalSegments - 1)
  const segmentT = targetSegment - segmentIndex
  const [lat1, lng1] = route[segmentIndex]
  const [lat2, lng2] = route[segmentIndex + 1]
  const pos: [number, number] = [lat1 + (lat2 - lat1) * segmentT, lng1 + (lng2 - lng1) * segmentT]
  const bearing = calculateBearing(lat1, lng1, lat2, lng2)
  return { pos, bearing, segmentIndex }
}

function toVehicleStatus(s: string, estimatedDelivery: string | null): VehicleStatus {
  if (s === 'entregado' || s === 'devuelto') return 'entregado'
  if (s === 'preparacion') return 'pendiente'
  if (s === 'en_destino') return 'en_transito'
  if (s === 'en_transito' && estimatedDelivery) {
    const est = new Date(estimatedDelivery).getTime()
    if (Date.now() > est) return 'retrasado'
  }
  return 'en_transito'
}

function formatEta(progress: number, estimatedDelivery: string | null): string {
  if (progress >= 100) return 'Entregado'
  if (!estimatedDelivery) return '—'
  const remaining = new Date(estimatedDelivery).getTime() - Date.now()
  if (remaining <= 0) return 'Retrasado'
  const min = Math.round(remaining / 60000)
  if (min > 60) return `${Math.floor(min / 60)}h ${min % 60}min`
  return `${min}min`
}

function buildRouteFromShipment(shipment: TrackingShipment): [number, number][] {
  if (shipment.waypoints && shipment.waypoints.length >= 2) {
    return shipment.waypoints
  }
  const origLat = shipment.origin?.lat
  const origLng = shipment.origin?.lng
  const destLat = shipment.destination?.lat
  const destLng = shipment.destination?.lng
  if (origLat != null && origLng != null && destLat != null && destLng != null) {
    const mid1: [number, number] = [origLat + (destLat - origLat) * 0.3, origLng + (destLng - origLng) * 0.3]
    const mid2: [number, number] = [origLat + (destLat - origLat) * 0.7, origLng + (destLng - origLng) * 0.7]
    return [[origLat, origLng], mid1, mid2, [destLat, destLng]]
  }
  return []
}

function shipmentToVehicles(shipments: TrackingShipment[]): Vehicle[] {
  return shipments.map((s) => {
    const status = toVehicleStatus(s.status, s.estimated_delivery)
    const rawRoute = buildRouteFromShipment(s)
    const { route, totalDistance } = buildRoute(rawRoute)
    const progress = s.progress_percent
    const { pos, bearing } = getPositionAlongRoute(route, progress)
    const traveledKm = (totalDistance * progress) / 100
    const originLabel = s.origin?.city || s.origin?.name || '—'
    const destLabel = s.destination?.city || s.destination?.name || '—'
    return {
      id: s.tracking_code,
      type: (s.vehicle_type || 'truck') as VehicleType,
      driver: s.carrier || '—',
      origin: originLabel,
      destination: destLabel,
      cargo: s.product_name || '—',
      cargoQty: s.quantity || 0,
      status,
      progress,
      eta: formatEta(progress, s.estimated_delivery),
      distanceKm: totalDistance,
      traveledKm,
      route,
      currentPos: pos,
      bearing,
      departureTime: s.shipment_date ? new Date(s.shipment_date).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '—',
      shipmentDate: s.shipment_date,
      estimatedDelivery: s.estimated_delivery,
      carrier: s.carrier,
      estimatedCost: s.estimated_cost,
    }
  })
}

function recreateVehicle(v: Vehicle): Vehicle {
  const progress = v.estimatedDelivery
    ? Math.min(100, Math.max(0, (Date.now() - new Date(v.shipmentDate || v.departureTime).getTime()) /
      (new Date(v.estimatedDelivery).getTime() - new Date(v.shipmentDate || v.departureTime).getTime()) * 100))
    : v.progress
  const newStatus = progress >= 100 ? 'entregado' : v.status === 'retrasado' ? 'retrasado' : toVehicleStatus('en_transito', v.estimatedDelivery)
  const { pos, bearing } = getPositionAlongRoute(v.route, progress)
  const traveledKm = (v.distanceKm * progress) / 100
  return {
    ...v,
    progress,
    status: newStatus,
    currentPos: pos,
    bearing,
    traveledKm,
    eta: formatEta(progress, v.estimatedDelivery),
  }
}

function createSedeIcon(color: string) {
  return L.divIcon({
    className: 'custom-sede-marker',
    html: `
      <div style="position: relative; width: 30px; height: 30px;">
        <div style="position: absolute; inset: 0; border-radius: 50%; background: ${color}; opacity: 0.2; transform: scale(2);"></div>
        <div style="position: absolute; inset: 0; border-radius: 50%; background: ${color}; border: 2px solid white; box-shadow: 0 0 10px ${color};"></div>
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  })
}

function createVehicleIcon(color: string, type: string, bearing: number) {
  const icons: Record<string, string> = { truck: '🚚', van: '🚐', bike: '🏍️' }
  return L.divIcon({
    className: 'custom-vehicle-marker',
    html: `
      <div style="position: relative; width: 36px; height: 36px; transform: rotate(${bearing}deg);">
        <div style="position: absolute; inset: -4px; border-radius: 50%; background: ${color}; opacity: 0.15; animation: pulse 2s infinite;"></div>
        <div style="position: absolute; inset: 0; border-radius: 50%; background: ${color}; border: 2px solid white; display: flex; align-items: center; justify-content: center; font-size: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">${icons[type] || '📦'}</div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  })
}

function AutoFit({ sedes }: { sedes: Sede[] }) {
  const map = useMap()
  useEffect(() => {
    if (sedes.length === 0) return
    const bounds = L.latLngBounds(sedes.map((s) => [s.lat, s.lng]))
    map.fitBounds(bounds, { padding: [40, 40] })
  }, [map, sedes])
  return null
}

function FlyToVehicle({ vehicle }: { vehicle: Vehicle | null }) {
  const map = useMap()
  useEffect(() => {
    if (vehicle) {
      map.flyTo(vehicle.currentPos, 8, { duration: 1 })
    }
  }, [map, vehicle])
  return null
}

export const TrackingPage: React.FC = () => {
  const [sedes, setSedes] = useState<Sede[]>([])
  const [shipments, setShipments] = useState<TrackingShipment[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [selectedSede, setSelectedSede] = useState<Sede | null>(null)
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [filter, setFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [flyToVehicle, setFlyToVehicle] = useState<Vehicle | null>(null)
  const [loading, setLoading] = useState(true)

  const updateCountRef = useRef(0)

  const fetchData = useCallback(async () => {
    try {
      const [whRes, shipData] = await Promise.all([
        api.get('/metrics/warehouses'),
        trackingService.getActiveShipments(),
      ])
      const whData = whRes.data as { id: number; name: string; city: string | null; lat: number | null; lng: number | null }[]
      setSedes(
        whData
          .filter((w) => w.lat != null && w.lng != null)
          .map((w) => ({ id: w.id, name: w.name, city: w.city, lat: w.lat!, lng: w.lng! }))
      )
      setShipments(shipData)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const pollInterval = setInterval(fetchData, 15000)
    return () => clearInterval(pollInterval)
  }, [fetchData])

  useEffect(() => {
    setVehicles(shipmentToVehicles(shipments))
  }, [shipments])

  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      @keyframes pulse {
        0%, 100% { transform: scale(1); opacity: 0.15; }
        50% { transform: scale(1.5); opacity: 0.05; }
      }
      .leaflet-container { background: #0E0E10; }
      .leaflet-popup-content-wrapper { background: #1C1C1E; color: white; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); }
      .leaflet-popup-tip { background: #1C1C1E; }
      .leaflet-popup-content { margin: 12px 16px; }
      .leaflet-bar a { background: #1C1C1E; color: white; border-color: rgba(255,255,255,0.1); }
      .leaflet-bar a:hover { background: #2C2C2E; }
    `
    document.head.appendChild(style)
    return () => { document.head.removeChild(style) }
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      updateCountRef.current += 1
      setVehicles((prev) => prev.map(recreateVehicle))
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  const filteredVehicles = (filter === 'all'
    ? vehicles
    : vehicles.filter((v) => v.status === filter)
  ).filter((v) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      v.id.toLowerCase().includes(q) ||
      v.cargo.toLowerCase().includes(q) ||
      v.driver.toLowerCase().includes(q)
    )
  })

  const activeVehicles = vehicles.filter((v) => v.status === 'en_transito' || v.status === 'retrasado')
  const stats = {
    total: vehicles.length,
    enTransito: vehicles.filter((v) => v.status === 'en_transito').length,
    entregados: vehicles.filter((v) => v.status === 'entregado').length,
    retrasados: vehicles.filter((v) => v.status === 'retrasado').length,
    pendientes: vehicles.filter((v) => v.status === 'pendiente').length,
  }
  const totalDistance = vehicles.reduce((sum, v) => sum + v.distanceKm, 0)
  const totalTraveled = vehicles.reduce((sum, v) => sum + v.traveledKm, 0)
  const totalCost = vehicles.reduce((sum, v) => sum + (v.estimatedCost || 0), 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white/40 text-sm">Cargando tracking...</div>
      </div>
    )
  }

  if (vehicles.length === 0 && sedes.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white/40 text-sm text-center">
          <Package className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>No hay envíos activos</p>
          <p className="text-xs mt-1">Los traslados realizados desde inventario aparecerán aquí automáticamente.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 lg:gap-3">
        {[
          { label: 'Total Envíos', value: stats.total, icon: <Package className="w-4 h-4" />, color: 'text-white', iconBg: 'bg-nikeOrange/10 border border-nikeOrange/20 text-nikeOrange' },
          { label: 'En Tránsito', value: stats.enTransito, icon: <Truck className="w-4 h-4" />, color: 'text-cyan-400', iconBg: 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400' },
          { label: 'Entregados', value: stats.entregados, icon: <CheckCircle2 className="w-4 h-4" />, color: 'text-emerald-400', iconBg: 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' },
          { label: 'Retrasados', value: stats.retrasados, icon: <AlertCircle className="w-4 h-4" />, color: 'text-red-400', iconBg: 'bg-red-500/10 border border-red-500/20 text-red-400' },
          { label: 'Distancia Total', value: `${totalDistance.toFixed(0)} km`, icon: <RouteIcon className="w-4 h-4" />, color: 'text-white', iconBg: 'bg-purple-500/10 border border-purple-500/20 text-purple-400' },
          { label: 'Recorrido', value: `${totalTraveled.toFixed(0)} km`, icon: <Activity className="w-4 h-4" />, color: 'text-emerald-400', iconBg: 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' },
          { label: 'Costo Total', value: `S/ ${totalCost.toFixed(0)}`, icon: <DollarSign className="w-4 h-4" />, color: 'text-yellow-400', iconBg: 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-400' },
        ].map((s, i) => (
          <MetricCard
            key={s.label}
            label={s.label}
            value={s.value}
            icon={s.icon}
            color={s.color}
            iconBg={s.iconBg}
            index={i}
            compact
            animate
          />
        ))}
      </div>

      {/* Map + Sede details */}
      <div className="relative">
        <Card
          title="Mapa de Sedes — Nike Perú"
          icon={<MapPin className="w-5 h-5 text-nikeOrange" />}
        >
          <div className="rounded-2xl overflow-hidden border border-white/5" style={{ height: '550px' }}>
            <MapContainer
              center={[-12.5, -75]}
              zoom={5}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />

              <AutoFit sedes={sedes} />
              <FlyToVehicle vehicle={flyToVehicle} />

              {/* Full route polylines */}
              {activeVehicles.map((v) => (
                <Polyline
                  key={`route-full-${v.id}`}
                  positions={v.route}
                  pathOptions={{ color: statusConfig[v.status].color, weight: 2, opacity: 0.2, dashArray: '5, 8' }}
                />
              ))}

              {/* Traveled route polylines */}
              {activeVehicles.map((v) => {
                const { segmentIndex } = getPositionAlongRoute(v.route, v.progress)
                const traveledPath = v.route.slice(0, segmentIndex + 1)
                const { pos } = getPositionAlongRoute(v.route, v.progress)
                traveledPath.push(pos)
                return (
                  <Polyline
                    key={`route-traveled-${v.id}`}
                    positions={traveledPath}
                    pathOptions={{ color: statusConfig[v.status].color, weight: 3, opacity: 0.8 }}
                  />
                )
              })}

              {/* Sede markers */}
              {sedes.map((sede) => {
                const sedeStock = shipments
                  .filter((s) => s.origin?.city === sede.city || s.destination?.city === sede.city)
                  .reduce((sum, s) => sum + (s.quantity || 0), 0)
                const isCritical = sedeStock === 0 && sedes.length > 0
                const color = isCritical ? sedeStatusColors.critical : sedeStatusColors.active
                return (
                  <Marker
                    key={sede.id}
                    position={[sede.lat, sede.lng]}
                    icon={createSedeIcon(color)}
                    eventHandlers={{ click: () => setSelectedSede(sede) }}
                  >
                    <Popup>
                      <div style={{ minWidth: '180px' }}>
                        <strong style={{ fontSize: '14px' }}>{sede.name}</strong>
                        <br />
                        <span style={{ color: '#999', fontSize: '12px' }}>{sede.city}</span>
                        <hr style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '8px 0' }} />
                        <div style={{ fontSize: '12px' }}>
                          <div>📦 Envíos relacionados: {sedeStock}</div>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                )
              })}

              {/* Vehicle markers */}
              {activeVehicles.map((v) => (
                <Marker
                  key={`vehicle-${v.id}`}
                  position={v.currentPos}
                  icon={createVehicleIcon(statusConfig[v.status].color, v.type, v.bearing)}
                  zIndexOffset={1000}
                >
                  <Popup>
                    <div style={{ minWidth: '180px' }}>
                      <strong>{v.id}</strong>
                      <br />
                      <span style={{ color: '#999', fontSize: '12px' }}>{v.origin} → {v.destination}</span>
                      <hr style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '8px 0' }} />
                      <div style={{ fontSize: '12px' }}>
                        <div>🚛 {v.driver}</div>
                        <div>📦 {v.cargo} ({v.cargoQty} u.)</div>
                        <div>⏱️ ETA: {v.eta}</div>
                        <div>📊 Progreso: {Math.round(v.progress)}%</div>
                        <div>🛣️ {v.traveledKm.toFixed(1)}/{v.distanceKm.toFixed(0)} km</div>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-white/50">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: sedeStatusColors.active }} />
              Almacén activo
            </div>
            <div className="flex items-center gap-1.5">
              <Navigation className="w-3 h-3 text-cyan-400" />
              Ruta de envío
            </div>
          </div>
        </Card>

        {/* Floating sede panel overlay */}
        <div className="absolute top-4 right-4 z-[1000] w-80 max-h-[510px] overflow-y-auto rounded-xl bg-black/80 backdrop-blur-md border border-white/10 shadow-xl">
          <div className="p-4">
            {selectedSede ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white/90">{selectedSede.name}</h3>
                </div>
                <p className="text-xs text-white/40">{selectedSede.city}</p>
                <Button variant="ghost" size="sm" className="w-full" onClick={() => setSelectedSede(null)}>
                  ← Volver
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-white/40 mb-3">
                  Haz clic en un marcador del mapa para ver detalles del almacén.
                </p>
                {sedes.map((sede) => (
                  <button
                    key={sede.id}
                    onClick={() => setSelectedSede(sede)}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: sedeStatusColors.active }} />
                      <div>
                        <p className="text-xs font-semibold text-white/90">{sede.city || sede.name}</p>
                        <p className="text-[10px] text-white/40">{sede.name}</p>
                      </div>
                    </div>
                    <MapPin className="w-3.5 h-3.5 text-white/30 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Vehicles list */}
      <Card
        title="Envíos y Transferencias"
        icon={<Truck className="w-5 h-5 text-nikeOrange" />}
        action={
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text"
              placeholder="Buscar por código, producto, transportista..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-52 pl-9 pr-8 py-1.5 text-xs rounded-xl bg-white/5 border border-white/10 text-white/90 placeholder-white/30 focus:outline-none focus:border-nikeOrange/50 transition-colors"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        }
      >
        <Tabs defaultValue="all" onValueChange={setFilter}>
          <TabsList>
            <TabsTrigger value="all">Todos ({stats.total})</TabsTrigger>
            <TabsTrigger value="en_transito">Tránsito ({stats.enTransito})</TabsTrigger>
            <TabsTrigger value="pendiente">Pendiente ({stats.pendientes})</TabsTrigger>
            <TabsTrigger value="entregado">Entregado ({stats.entregados})</TabsTrigger>
            <TabsTrigger value="retrasado">Retrasado ({stats.retrasados})</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="space-y-3 mt-4">
          {filteredVehicles.length === 0 && searchQuery && (
            <p className="text-xs text-white/40 text-center py-6">No se encontraron envíos con esa búsqueda.</p>
          )}
          <AnimatePresence>
            {filteredVehicles.map((vehicle) => {
              const status = statusConfig[vehicle.status]
              const customStyles = getStatusStyles(vehicle.status)
              return (
                <motion.div
                  key={vehicle.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  onClick={() => {
                    setSelectedVehicle(vehicle)
                    setFlyToVehicle(vehicle)
                  }}
                  className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-white/5 text-nikeOrange">
                        {vehicleIconMap[vehicle.type]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-white/90">{vehicle.id}</span>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </div>
                        <p className="text-xs text-white/50 mt-0.5">
                          {vehicle.origin} → {vehicle.destination}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-xs text-white/40">
                        <Clock className="w-3 h-3" />
                        {vehicle.eta}
                      </div>
                    </div>
                  </div>

                  <div className="mb-3 w-full bg-white/10 h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${customStyles.bar}`}
                      style={{ width: `${vehicle.progress}%` }}
                    />
                  </div>

                  <div className="flex items-center gap-4 text-xs text-white/40">
                    <span className="flex items-center gap-1">
                      <Package className="w-3 h-3" /> {vehicle.cargo} ({vehicle.cargoQty} u.)
                    </span>
                    <span className="flex items-center gap-1">
                      <Activity className="w-3 h-3" /> {Math.round(vehicle.progress)}%
                    </span>
                    <span className="flex items-center gap-1">
                      <RouteIcon className="w-3 h-3" /> {vehicle.traveledKm.toFixed(0)}/{vehicle.distanceKm.toFixed(0)} km
                    </span>
                    {vehicle.estimatedCost != null && (
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3" /> S/ {vehicle.estimatedCost.toFixed(0)}
                      </span>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      </Card>

      {/* Vehicle detail modal */}
      <Dialog open={!!selectedVehicle} onOpenChange={(open) => !open && setSelectedVehicle(null)}>
        <DialogContent className="max-w-md">
          {selectedVehicle && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-white/5 text-nikeOrange">
                      {vehicleIconMap[selectedVehicle.type]}
                    </div>
                    <div>
                      <DialogTitle>{selectedVehicle.id}</DialogTitle>
                      <DialogDescription>{selectedVehicle.carrier || selectedVehicle.driver}</DialogDescription>
                    </div>
                  </div>
                  <Badge variant={statusConfig[selectedVehicle.status].variant}>
                    {statusConfig[selectedVehicle.status].label}
                  </Badge>
                </div>
              </DialogHeader>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-white/5">
                    <p className="text-xs text-white/40 uppercase tracking-wider">Origen</p>
                    <p className="text-sm font-semibold text-white/90">{selectedVehicle.origin}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5">
                    <p className="text-xs text-white/40 uppercase tracking-wider">Destino</p>
                    <p className="text-sm font-semibold text-white/90">{selectedVehicle.destination}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-white/5">
                    <p className="text-xs text-white/40 uppercase tracking-wider">Transportista</p>
                    <p className="text-sm font-semibold text-white/90">{selectedVehicle.driver}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5">
                    <p className="text-xs text-white/40 uppercase tracking-wider">Salida</p>
                    <p className="text-sm font-semibold text-white/90">{selectedVehicle.departureTime}</p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/5">
                  <p className="text-xs text-white/40 uppercase tracking-wider">Carga</p>
                  <p className="text-sm font-semibold text-white/90">
                    {selectedVehicle.cargo} — {selectedVehicle.cargoQty} unidades
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-white/5 text-center">
                    <p className="text-xs text-white/40 uppercase tracking-wider">ETA</p>
                    <p className="text-sm font-semibold text-white/90">{selectedVehicle.eta}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 text-center">
                    <p className="text-xs text-white/40 uppercase tracking-wider">Distancia</p>
                    <p className="text-sm font-semibold text-white/90">{selectedVehicle.distanceKm.toFixed(0)} km</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 text-center">
                    <p className="text-xs text-white/40 uppercase tracking-wider">Costo</p>
                    <p className="text-sm font-semibold text-white/90">
                      {selectedVehicle.estimatedCost != null ? `S/ ${selectedVehicle.estimatedCost.toFixed(0)}` : '—'}
                    </p>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-white/40 mb-1">
                    <span>Progreso del viaje</span>
                    <span>{Math.round(selectedVehicle.progress)}% — {selectedVehicle.traveledKm.toFixed(1)} km recorridos</span>
                  </div>
                  <div className="w-full bg-white/10 h-3 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${getStatusStyles(selectedVehicle.status).bar}`}
                      style={{ width: `${selectedVehicle.progress}%` }}
                    />
                  </div>
                </div>

                <Button variant="secondary" className="w-full" onClick={() => setSelectedVehicle(null)}>
                  Cerrar
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
