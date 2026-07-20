import React, { useEffect, useState } from 'react'
import { Warehouse } from 'lucide-react'
import api from '../../services/api'
import type { WarehouseDistribution } from '../../types/product'

interface WarehouseOption {
  id: number
  name: string
  city: string | null
}

interface WarehouseDistributionFormProps {
  value: WarehouseDistribution[]
  onChange: (dists: WarehouseDistribution[]) => void
}

export const WarehouseDistributionForm: React.FC<WarehouseDistributionFormProps> = ({ value, onChange }) => {
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([])

  useEffect(() => {
    api.get('/metrics/warehouses').then(r => setWarehouses(r.data)).catch(() => {})
  }, [])

  const toggleWarehouse = (whId: number) => {
    const exists = value.find((d) => d.warehouse_id === whId)
    if (exists) {
      onChange(value.filter((d) => d.warehouse_id !== whId))
    } else {
      onChange([...value, { warehouse_id: whId, stock_qty: 0 }])
    }
  }

  const updateQty = (whId: number, qty: number) => {
    onChange(
      value.map((d) => (d.warehouse_id === whId ? { ...d, stock_qty: qty } : d))
    )
  }

  return (
    <div>
      <label className="text-sm font-semibold text-white/80 flex items-center gap-2 mb-2">
        <Warehouse className="w-4 h-4 text-nikeOrange" />
        Distribuir en almacenes
      </label>
      <div className="grid grid-cols-2 gap-2">
        {warehouses.map((wh) => {
          const dist = value.find((d) => d.warehouse_id === wh.id)
          const selected = !!dist
          return (
            <div
              key={wh.id}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer h-10 ${
                selected
                  ? 'bg-nikeOrange/5 border-nikeOrange/30'
                  : 'bg-white/5 border-white/10 hover:border-white/20'
              }`}
              onClick={() => toggleWarehouse(wh.id)}
            >
              <input
                type="checkbox"
                checked={selected}
                onChange={() => toggleWarehouse(wh.id)}
                className="accent-nikeOrange shrink-0"
              />
              <span className="text-xs font-medium text-white/80 truncate flex-1">{wh.name}</span>
              {selected && (
                <input
                  type="number"
                  min={0}
                  value={dist?.stock_qty ?? 0}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => updateQty(wh.id, Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-14 px-1.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-white text-xs text-center"
                  placeholder="0"
                />
              )}
            </div>
          )
        })}
      </div>
      {warehouses.length === 0 && (
        <p className="text-xs text-white/30 mt-1">Cargando almacenes...</p>
      )}
    </div>
  )
}
