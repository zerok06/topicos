import React, { useState, useEffect } from 'react'
import { SlidersHorizontal, Warehouse, Tag, X, Calendar } from 'lucide-react'
import { useDashboardFilters } from '../../context/DashboardFilterContext'
import { TimeRangeSelector } from '../metrics/TimeRangeSelector'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import api from '../../services/api'

interface FilterOption {
  id: number | null
  name: string
}

export const DashboardFilterBar: React.FC<{
  refreshing?: boolean
  onRefresh?: () => void
  nextRefresh?: number
}> = () => {
  const { filters, setTimeRange, setWarehouseId, setCategory } = useDashboardFilters()
  const [open, setOpen] = useState(false)
  const [warehouses, setWarehouses] = useState<FilterOption[]>([])
  const [categories, setCategories] = useState<FilterOption[]>([])

  useEffect(() => {
    Promise.all([
      api.get('/metrics/warehouses').then(r => r.data),
      api.get('/metrics/categories').then(r => r.data),
    ])
      .then(([wh, cat]) => {
        const hasWarehouses = Array.isArray(wh) && wh.length > 0
        setWarehouses(hasWarehouses ? wh.map((w: any) => ({ id: w.id, name: w.name })) : [
          { id: 1, name: 'Almacén Central' },
          { id: 2, name: 'Almacén Norte' },
          { id: 3, name: 'Almacén Sur' },
        ])
        setCategories(cat.map((c: any) => ({ id: c.id, name: c.name })))
      })
      .catch(() => {
        setWarehouses([
          { id: 1, name: 'Almacén Central' },
          { id: 2, name: 'Almacén Norte' },
          { id: 3, name: 'Almacén Sur' },
        ])
        setCategories([])
      })
  }, [])

  const activeFilterCount = [filters.timeRange !== 7, filters.warehouseId !== null, filters.category !== null].filter(Boolean).length

  const filterContent = (
    <div className="space-y-5 p-1">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-3.5 h-3.5 text-nikeOrange" />
          <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">Rango de Tiempo</span>
        </div>
        <TimeRangeSelector value={filters.timeRange} onChange={(d) => setTimeRange(d)} />
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <Warehouse className="w-3.5 h-3.5 text-nikeOrange" />
          <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">Almacén</span>
        </div>
        <div className="relative">
          <select
            value={filters.warehouseId ?? ''}
            onChange={(e) => setWarehouseId(e.target.value ? Number(e.target.value) : null)}
            className="w-full pl-3 pr-8 py-2 rounded-xl bg-[#0f0f13] border border-white/10 text-white/90 text-xs font-semibold focus:outline-none focus:border-nikeOrange focus:ring-1 focus:ring-nikeOrange/30 appearance-none cursor-pointer"
          >
            <option value="">Todos los almacenes</option>
            {warehouses.map((w) => (
              <option key={w.id} value={String(w.id)}>{w.name}</option>
            ))}
          </select>
          <Warehouse className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40 pointer-events-none" />
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <Tag className="w-3.5 h-3.5 text-nikeOrange" />
          <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">Categoría</span>
        </div>
        <div className="relative">
          <select
            value={filters.category ?? ''}
            onChange={(e) => setCategory(e.target.value || null)}
            className="w-full pl-3 pr-8 py-2 rounded-xl bg-[#0f0f13] border border-white/10 text-white/90 text-xs font-semibold focus:outline-none focus:border-nikeOrange focus:ring-1 focus:ring-nikeOrange/30 appearance-none cursor-pointer"
          >
            <option value="">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c.name} value={c.name}>{c.name}</option>
            ))}
          </select>
          <Tag className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40 pointer-events-none" />
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex items-center gap-3">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className="relative flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#0f0f13] border border-white/10 hover:border-nikeOrange/50 text-white/80 hover:text-white text-xs font-semibold transition-all hover:bg-[#15151b] shadow-lg"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">Filtros</span>
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-nikeOrange text-[10px] font-bold text-white flex items-center justify-center shadow-[0_0_8px_rgba(250,84,0,0.6)]">
                {activeFilterCount}
              </span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={8}
          className="w-[280px] glass-panel border border-white/10 p-4 shadow-2xl"
        >
          <div className="flex items-center justify-between mb-2 pb-3 border-b border-white/10">
            <span className="text-xs font-bold text-white/70 uppercase tracking-wider">Filtros de Comando</span>
            <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          {filterContent}
        </PopoverContent>
      </Popover>
    </div>
  )
}
