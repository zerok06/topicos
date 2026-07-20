export interface MetricsSummary {
  total_stock: number
  critical_count: number
  critical_units: number
  normal_units: number
  total_value: number
  total_products: number
  total_warehouses: number
  service_level: number
  inventory_turnover: number
  days_of_inventory: number
  fulfillment_rate: number
  cycle_time_hours: number
  capacity_utilization: number
  total_shipments: number
  in_transit: number
  prep_shipments: number
  delivered_shipments: number
  pending_transfers: number
  delayed_shipments: number
  total_movements_in: number
  total_movements_out: number
}

export interface WarehousePerformance {
  warehouse_id: number
  warehouse_name: string
  city: string | null
  capacity: number
  total_stock: number
  product_count: number
  critical_count: number
  utilization: number
}

export interface MovementTrend {
  date: string
  entradas: number
  salidas: number
  ajustes: number
  transferencias: number
}

export interface TopProduct {
  product_id: number
  sku: string
  product_name: string
  unit_price: number
  total_stock: number
  movement_total: number
  value: number
}

export interface CategoryDistribution {
  name: string
  product_count: number
  total_stock: number
}

export interface Alert {
  type: 'critical_stock' | 'delayed_shipment' | 'pending_transfer'
  severity: 'high' | 'medium' | 'low'
  title: string
  description: string
  [key: string]: any
}

export interface ShipmentStats {
  by_status: Record<string, number>
  by_carrier: Record<string, number>
  routes: {
    route_name: string
    origin: string
    destination: string
    distance_km: number
    estimated_hours: number
    carrier: string
  }[]
}

export interface StockByWarehouse {
  name: string
  city: string | null
  total: number
  critical: number
  normal: number
  breakdown?: {
    name: string
    value: number
    critical: number
    color: string
  }[]
}
