import api from './api'
import type {
  MetricsSummary,
  WarehousePerformance,
  MovementTrend,
  TopProduct,
  CategoryDistribution,
  Alert,
  ShipmentStats,
  StockByWarehouse,
} from '../types/metrics'

interface FilterParams {
  days?: number
  warehouse_id?: number | null
  category?: string | null
}

function buildParams(opts?: FilterParams): string {
  const params = new URLSearchParams()
  if (opts?.days) params.set('days', String(opts.days))
  if (opts?.warehouse_id) params.set('warehouse_id', String(opts.warehouse_id))
  if (opts?.category) params.set('category', opts.category)
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

export const metricsService = {
  async getSummary(days?: number, warehouse_id?: number | null, category?: string | null): Promise<MetricsSummary> {
    const res = await api.get<MetricsSummary>(`/metrics/summary${buildParams({ days, warehouse_id, category })}`)
    return res.data
  },

  async getWarehousePerformance(): Promise<WarehousePerformance[]> {
    const res = await api.get<WarehousePerformance[]>('/metrics/warehouse-performance')
    return res.data
  },

  async getTrends(days: number = 7, warehouse_id?: number | null): Promise<MovementTrend[]> {
    const res = await api.get<MovementTrend[]>(`/metrics/trends${buildParams({ days, warehouse_id })}`)
    return res.data
  },

  async getTopProducts(limit: number = 10): Promise<TopProduct[]> {
    const res = await api.get<TopProduct[]>(`/metrics/top-products?limit=${limit}`)
    return res.data
  },

  async getCategoryDistribution(): Promise<CategoryDistribution[]> {
    const res = await api.get<CategoryDistribution[]>('/metrics/category-distribution')
    return res.data
  },

  async getAlerts(warehouse_id?: number | null): Promise<Alert[]> {
    const res = await api.get<Alert[]>(`/metrics/alerts${buildParams({ warehouse_id })}`)
    return res.data
  },

  async getShipmentStats(warehouse_id?: number | null): Promise<ShipmentStats> {
    const res = await api.get<ShipmentStats>(`/metrics/shipments${buildParams({ warehouse_id })}`)
    return res.data
  },

  async getStockByWarehouse(warehouse_id?: number | null): Promise<StockByWarehouse[]> {
    const res = await api.get<StockByWarehouse[]>(`/metrics/stock-by-warehouse${buildParams({ warehouse_id })}`)
    return res.data
  },

  async exportCSV(type: 'inventory' | 'logistics' | 'all' = 'all'): Promise<Blob> {
    const res = await api.get(`/metrics/export/csv?type=${type}`, {
      responseType: 'blob',
    })
    return res.data
  },
}
