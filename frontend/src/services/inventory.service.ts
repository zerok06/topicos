import api from './api'
import type { StockItem, PaginatedAuditLogs, AuditSummary, BarcodeResult, ProductResponse } from '../types/inventory'

export const inventoryService = {
  async getStock(): Promise<StockItem[]> {
    const res = await api.get<StockItem[]>('/stock/')
    return res.data
  },

  async transferStock(data: any): Promise<{ message: string; tracking_code?: string }> {
    const res = await api.post<{ message: string; tracking_code?: string }>('/stock/transfer', data)
    return res.data
  },

  async getAuditLogs(params?: { page?: number; limit?: number; action?: string; date_from?: string; date_to?: string }): Promise<PaginatedAuditLogs> {
    const res = await api.get<PaginatedAuditLogs>('/stock/audit-logs', { params })
    return res.data
  },

  async getAuditSummary(): Promise<AuditSummary> {
    const res = await api.get<AuditSummary>('/stock/audit-summary')
    return res.data
  },

  async sendChatMessage(message: string): Promise<{ response: string }> {
    const res = await api.post<{ response: string }>('/chat/', { message })
    return res.data
  },

  async searchByBarcode(barcode: string): Promise<BarcodeResult[]> {
    const res = await api.post<BarcodeResult[]>('/chat/barcode', { barcode })
    return res.data
  },

  async createProduct(data: any): Promise<ProductResponse> {
    const res = await api.post<ProductResponse>('/products/', data)
    return res.data
  },

  async getProducts(search?: string): Promise<any[]> {
    const params = search ? `?search=${encodeURIComponent(search)}` : ''
    const res = await api.get(`/products/${params}`)
    return res.data
  },

  async getProductDetail(id: number): Promise<any> {
    const res = await api.get(`/products/${id}`)
    return res.data
  },

  async updateProduct(id: number, data: any): Promise<any> {
    const res = await api.put(`/products/${id}`, data)
    return res.data
  },
}
