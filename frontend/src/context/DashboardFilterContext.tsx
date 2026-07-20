import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

export interface DashboardFilters {
  timeRange: number
  warehouseId: number | null
  category: string | null
}

interface DashboardFilterContextType {
  filters: DashboardFilters
  setTimeRange: (days: number) => void
  setWarehouseId: (id: number | null) => void
  setCategory: (cat: string | null) => void
  resetFilters: () => void
}

const defaultFilters: DashboardFilters = {
  timeRange: 7,
  warehouseId: null,
  category: null,
}

const DashboardFilterContext = createContext<DashboardFilterContextType>({
  filters: defaultFilters,
  setTimeRange: () => {},
  setWarehouseId: () => {},
  setCategory: () => {},
  resetFilters: () => {},
})

export const useDashboardFilters = () => useContext(DashboardFilterContext)

export const DashboardFilterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [filters, setFilters] = useState<DashboardFilters>(defaultFilters)

  const setTimeRange = useCallback((days: number) => {
    setFilters((prev) => ({ ...prev, timeRange: days }))
  }, [])

  const setWarehouseId = useCallback((id: number | null) => {
    setFilters((prev) => ({ ...prev, warehouseId: id }))
  }, [])

  const setCategory = useCallback((cat: string | null) => {
    setFilters((prev) => ({ ...prev, category: cat }))
  }, [])

  const resetFilters = useCallback(() => {
    setFilters(defaultFilters)
  }, [])

  return (
    <DashboardFilterContext.Provider value={{ filters, setTimeRange, setWarehouseId, setCategory, resetFilters }}>
      {children}
    </DashboardFilterContext.Provider>
  )
}
