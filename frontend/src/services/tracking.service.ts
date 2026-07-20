import api from './api'
import type { TrackingShipment } from '../types/tracking'

export const trackingService = {
  async getActiveShipments(): Promise<TrackingShipment[]> {
    const res = await api.get<TrackingShipment[]>('/tracking/shipments')
    return res.data
  },
}
