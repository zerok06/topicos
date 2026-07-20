import { useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { Hash, Clock, Truck, Calendar } from 'lucide-react'

const CITY_COORDS: Record<string, [number, number]> = {
  Piura: [-5.194, -80.632],
  Trujillo: [-8.109, -79.028],
  Lima: [-12.046, -77.043],
  Cusco: [-13.532, -71.967],
  Arequipa: [-16.409, -71.537],
}

interface WarehouseData {
  warehouse_id?: number
  warehouse_name: string
  city: string | null
  stock_qty: number
  min_stock: number
  max_stock: number | null
  is_critical: boolean
}

interface TrackingMapProps {
  fromId: string
  toId: string
  warehouses: WarehouseData[]
  warehouseOptions: { id: number; name: string; city: string | null; lat?: number | null; lng?: number | null }[]
  transferQty: number
  trackingId: string
  estimatedDays: number
  etaStr: string
  progressPercent: number
}

function createDefaultIcon(): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `
      <div style="display: flex; flex-direction: column; align-items: center; gap: 2px; opacity: 0.4; cursor: pointer;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 9.5L12 3L21 9.5V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V9.5Z"
            fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"/>
          <rect x="9" y="14" width="6" height="7" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>
        </svg>
      </div>`,
    iconSize: [20, 26],
    iconAnchor: [10, 26],
  })
}

function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (positions.length === 0) return
    const bounds = L.latLngBounds(positions)
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 7 })
  }, [map, positions])
  return null
}

function createHighlightIcon(type: 'origin' | 'dest'): L.DivIcon {
  const color = type === 'origin' ? '#FA5400' : '#22c55e'
  return L.divIcon({
    className: '',
    html: `
      <div style="
        display: flex; flex-direction: column; align-items: center; gap: 2px;
        filter: drop-shadow(0 0 12px ${color}40);
        cursor: pointer;
      ">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" fill="${color}20" stroke="${color}" stroke-width="2"/>
          <circle cx="12" cy="12" r="4" fill="${color}"/>
        </svg>
        <span style="font-size:9px; font-weight:700; color:${color}; text-shadow:0 1px 4px rgba(0,0,0,0.8);">
          ${type === 'origin' ? 'ORIGEN' : 'DESTINO'}
        </span>
      </div>`,
    iconSize: [32, 48],
    iconAnchor: [16, 48],
    popupAnchor: [0, -52],
  })
}

export default function TrackingMap({
  fromId,
  toId,
  warehouses,
  warehouseOptions,
  transferQty,
  trackingId,
  estimatedDays,
  etaStr,
  progressPercent,
}: TrackingMapProps) {
  const positions = useMemo(() => {
    const result: [number, number][] = []
    for (const wh of warehouseOptions) {
      const city = wh.city || ''
      const coord = CITY_COORDS[city]
      if (coord) result.push(coord)
    }
    return result
  }, [warehouseOptions])

  const polylinePositions = useMemo(() => {
    const fromWh = warehouseOptions.find(w => String(w.id) === fromId)
    const toWh = warehouseOptions.find(w => String(w.id) === toId)
    if (!fromWh || !toWh) return [] as [number, number][]
    const fromCoord = CITY_COORDS[fromWh.city || '']
    const toCoord = CITY_COORDS[toWh.city || '']
    if (!fromCoord || !toCoord) return []
    return [fromCoord, toCoord] as [number, number][]
  }, [fromId, toId, warehouseOptions])

  const fromCity = warehouseOptions.find(w => String(w.id) === fromId)?.city || ''
  const toCity = warehouseOptions.find(w => String(w.id) === toId)?.city || ''

  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/10 overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-2 border-b border-white/10 bg-white/[0.02]">
        <p className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">
          {trackingId === 'Vista previa' ? 'Vista previa de Ruta' : trackingId}
        </p>
      </div>

      {/* Map */}
      <div className="flex-1 relative" style={{ minHeight: '300px' }}>
        <MapContainer
          center={[-12, -77]}
          zoom={6}
          className="w-full h-full absolute inset-0 z-0"
          style={{ width: '100%', height: '100%' }}
          zoomControl={false}
          attributionControl={false}
          dragging={false}
          scrollWheelZoom={false}
          doubleClickZoom={false}
          touchZoom={false}
          keyboard={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          <FitBounds positions={positions} />

          {/* Origin marker */}
          {polylinePositions.length > 0 && (
            <Marker
              position={polylinePositions[0]}
              icon={createHighlightIcon('origin')}
            >
              <Popup>
                <div className="text-xs space-y-0.5">
                  <p className="font-bold text-nikeOrange">{fromCity}</p>
                  {(() => {
                    const whIdNum = parseInt(fromId)
                    const stock = warehouses.find(w =>
                      w.warehouse_id === whIdNum
                    )
                    if (!stock) return null
                    return (
                      <>
                        <p className="text-white/60">Stock: <span className="font-bold text-white">{stock.stock_qty} uds</span></p>
                        <p className="text-white/40">Min: {stock.min_stock} · Max: {stock.max_stock ?? '-'}</p>
                        <p className={stock.is_critical ? 'text-red-400 font-semibold' : 'text-green-400'}>
                          {stock.is_critical ? 'Stock Critico' : 'Stock Normal'}
                        </p>
                      </>
                    )
                  })()}
                </div>
              </Popup>
            </Marker>
          )}

          {/* Destination marker */}
          {polylinePositions.length > 0 && (
            <Marker
              position={polylinePositions[1]}
              icon={createHighlightIcon('dest')}
            >
              <Popup>
                <div className="text-xs space-y-0.5">
                  <p className="font-bold text-green-400">{toCity}</p>
                  {(() => {
                    const whIdNum = parseInt(toId)
                    const stock = warehouses.find(w =>
                      w.warehouse_id === whIdNum
                    )
                    if (!stock) return null
                    return (
                      <>
                        <p className="text-white/60">Stock: <span className="font-bold text-white">{stock.stock_qty} uds</span></p>
                        <p className="text-white/40">Min: {stock.min_stock} · Max: {stock.max_stock ?? '-'}</p>
                        <p className={stock.is_critical ? 'text-red-400 font-semibold' : 'text-green-400'}>
                          {stock.is_critical ? 'Stock Critico' : 'Stock Normal'}
                        </p>
                      </>
                    )
                  })()}
                </div>
              </Popup>
            </Marker>
          )}

          {/* Other warehouses */}
          {warehouseOptions.map(wh => {
            if (String(wh.id) === fromId || String(wh.id) === toId) return null
            const coord = CITY_COORDS[wh.city || '']
            if (!coord) return null
            const stock = warehouses.find(w => w.city === wh.city)
            return (
              <Marker key={wh.id} position={coord} icon={createDefaultIcon()}>
                <Popup>
                  <div className="text-xs space-y-0.5">
                    <p className="font-bold text-white/80">{wh.name}</p>
                    {wh.city && <p className="text-white/40">{wh.city}</p>}
                    {stock && (
                      <>
                        <p className="text-white/60">Stock: <span className="font-bold text-white">{stock.stock_qty} uds</span></p>
                        <p className="text-white/40">Min: {stock.min_stock} · Max: {stock.max_stock ?? '-'}</p>
                      </>
                    )}
                  </div>
                </Popup>
              </Marker>
            )
          })}

          {/* Route polyline */}
          {polylinePositions.length > 0 && (
            <Polyline
              positions={polylinePositions}
              pathOptions={{
                color: '#FA5400',
                weight: 3,
                dashArray: '8, 6',
                opacity: 0.8,
              }}
            />
          )}
        </MapContainer>

        {/* Overlay: tracking info */}
        {polylinePositions.length > 0 && (
          <div className="absolute top-3 left-3 right-3 z-[1000] flex items-center gap-3 px-3 py-2 rounded-lg bg-black/60 backdrop-blur-md border border-white/10">
            <div className="flex items-center gap-1.5 min-w-0">
              <Hash className="w-3 h-3 text-nikeOrange shrink-0" />
              <span className="font-mono text-[10px] font-bold text-nikeOrange truncate">{trackingId}</span>
            </div>
            <span className="text-white/20">|</span>
            <div className="flex items-center gap-1.5 shrink-0">
              <Clock className="w-3 h-3 text-cyan-400" />
              <span className="text-[10px] font-bold text-white/90">{estimatedDays}d</span>
            </div>
            <span className="text-white/20">|</span>
            <div className="flex items-center gap-1.5 shrink-0">
              <Truck className="w-3 h-3 text-yellow-400" />
              <span className="text-[10px] font-bold text-yellow-400">En transito</span>
            </div>
            <span className="text-white/20">|</span>
            <div className="flex items-center gap-1.5 shrink-0 min-w-0">
              <Calendar className="w-3 h-3 text-emerald-400" />
              <span className="text-[10px] font-bold text-white/90 truncate">{etaStr}</span>
            </div>
          </div>
        )}

        {/* Overlay: progress bar */}
        {polylinePositions.length > 0 && (
          <div className="absolute bottom-3 left-3 right-3 z-[1000] px-3 py-2 rounded-lg bg-black/60 backdrop-blur-md border border-white/10">
            <div className="flex items-center justify-between text-[9px] text-white/40 mb-1">
              <span>{fromCity || 'Origen'}</span>
              <span>{toCity || 'Destino'}</span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-nikeOrange rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[9px] text-white/30">{progressPercent}% completado</span>
              <span className="text-[10px] font-bold text-white/90">
                {transferQty} <span className="text-[9px] font-normal text-white/40">uds</span>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
