export interface TrackingWarehouse {
  id: number | null
  name: string | null
  city: string | null
  lat: number | null
  lng: number | null
}

export interface TrackingShipment {
  tracking_code: string
  status: 'preparacion' | 'en_transito' | 'en_destino' | 'entregado' | 'devuelto'
  shipment_date: string | null
  estimated_delivery: string | null
  actual_delivery: string | null
  origin: TrackingWarehouse | null
  destination: TrackingWarehouse | null
  product_name: string | null
  quantity: number | null
  carrier: string | null
  vehicle_type: string
  estimated_cost: number | null
  estimated_hours: number | null
  distance_km: number | null
  waypoints: [number, number][] | null
  progress_percent: number
}
