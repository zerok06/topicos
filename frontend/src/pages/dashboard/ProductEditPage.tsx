import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Save } from 'lucide-react'
import { Card } from '../../components/ui/card'
import { ChartSkeleton } from '../../components/metrics/MetricCardSkeleton'
import api from '../../services/api'
import type { ProductDetail } from '../../types/product'

interface FormData {
  product_name: string
  model: string
  gender: string
  size: string
  color: string
  unit_price: string
  description: string
}

export const ProductEditPage: React.FC = () => {
  const params = useParams({ strict: false })
  const navigate = useNavigate()
  const id = params.id
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<FormData>({
    product_name: '',
    model: '',
    gender: 'Unisex',
    size: '',
    color: '',
    unit_price: '',
    description: '',
  })

  useEffect(() => {
    setLoading(true)
    api.get(`/products/${id}`)
      .then((r) => {
        const p: ProductDetail = r.data
        setForm({
          product_name: p.product_name,
          model: p.model || '',
          gender: p.gender || 'Unisex',
          size: p.size || '',
          color: p.color || '',
          unit_price: String(p.unit_price),
          description: p.description || '',
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.put(`/products/${id}`, {
        ...form,
        unit_price: parseFloat(form.unit_price) || 0,
      })
      navigate({ to: `/products/${id}` })
    } catch {
      setSaving(false)
    }
  }

  const update = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-24 h-8 bg-white/5 rounded-xl animate-pulse" />
          <div className="w-48 h-8 bg-white/5 rounded-xl animate-pulse" />
        </div>
        <ChartSkeleton />
      </div>
    )
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate({ to: `/products/${id}` })}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-white">Editar Producto</h1>
            <p className="text-xs text-white/40 mt-0.5">SKU: {form.product_name}</p>
          </div>
        </div>
      </div>

      <Card title="Información del Producto">
        <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
          <div>
            <label className="text-xs text-white/60 font-semibold">Nombre *</label>
            <input
              value={form.product_name}
              onChange={update('product_name')}
              required
              className="w-full mt-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-nikeOrange/50"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/60 font-semibold">Modelo</label>
              <input
                value={form.model}
                onChange={update('model')}
                className="w-full mt-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-nikeOrange/50"
              />
            </div>
            <div>
              <label className="text-xs text-white/60 font-semibold">Género</label>
              <select
                value={form.gender}
                onChange={update('gender')}
                className="w-full mt-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-nikeOrange/50"
              >
                <option value="Unisex">Unisex</option>
                <option value="Hombre">Hombre</option>
                <option value="Mujer">Mujer</option>
                <option value="Niño">Niño</option>
                <option value="Niña">Niña</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-white/60 font-semibold">Talla</label>
              <input
                value={form.size}
                onChange={update('size')}
                className="w-full mt-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-nikeOrange/50"
              />
            </div>
            <div>
              <label className="text-xs text-white/60 font-semibold">Color</label>
              <input
                value={form.color}
                onChange={update('color')}
                className="w-full mt-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-nikeOrange/50"
              />
            </div>
            <div>
              <label className="text-xs text-white/60 font-semibold">Precio *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.unit_price}
                onChange={update('unit_price')}
                required
                className="w-full mt-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-nikeOrange/50"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-white/60 font-semibold">Descripción</label>
            <textarea
              value={form.description}
              onChange={update('description')}
              rows={3}
              className="w-full mt-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-nikeOrange/50 resize-none"
            />
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 rounded-xl bg-nikeOrange hover:bg-nikeOrange/80 text-white text-xs font-semibold transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
            <button
              type="button"
              onClick={() => navigate({ to: `/products/${id}` })}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 text-xs font-semibold transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </Card>
    </div>
  )
}
