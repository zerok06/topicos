import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Edit3, Printer, Package, BarChart3 } from 'lucide-react'
import { Card } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { ChartSkeleton } from '../../components/metrics/MetricCardSkeleton'
import { BarcodeLabel } from '../../components/products/BarcodeLabel'
import { LabelPrintPanel } from '../../components/products/LabelPrintPanel'
import api from '../../services/api'
import type { ProductDetail } from '../../types/product'

export const ProductDetailPage: React.FC = () => {
  const params = useParams({ strict: false })
  const navigate = useNavigate()
  const id = params.id
  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.get(`/products/${id}`)
      .then(r => setProduct(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-24 h-8 bg-white/5 rounded-xl animate-pulse" />
          <div className="w-48 h-8 bg-white/5 rounded-xl animate-pulse" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2"><ChartSkeleton /></div>
          <ChartSkeleton />
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="text-center py-16">
        <p className="text-white/40">Producto no encontrado</p>
      </div>
    )
  }

  const totalStock = product.stock_by_warehouse.reduce((s, w) => s + w.stock_qty, 0)

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate({ to: '/products/list' })}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-white">{product.product_name}</h1>
            <p className="text-xs text-white/40 mt-0.5">SKU: {product.sku}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate({ to: `/products/${product.product_id}/edit` })}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 text-xs font-semibold transition-colors"
          >
            <Edit3 className="w-4 h-4" />
            Editar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card title="Información del Producto" icon={<Package className="w-5 h-5 text-nikeOrange" />}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] text-white/40 uppercase font-semibold">Nombre</p>
                <p className="text-sm text-white/90 mt-1">{product.product_name}</p>
              </div>
              <div>
                <p className="text-[10px] text-white/40 uppercase font-semibold">SKU</p>
                <p className="text-sm font-mono text-white/90 mt-1">{product.sku}</p>
              </div>
              <div>
                <p className="text-[10px] text-white/40 uppercase font-semibold">Código de Barras</p>
                <p className="text-sm font-mono text-white/90 mt-1">{product.barcode || '—'}</p>
              </div>
              <div>
                <p className="text-[10px] text-white/40 uppercase font-semibold">Categoría</p>
                <p className="text-sm text-white/90 mt-1">{product.category_name || 'Sin categoría'}</p>
              </div>
              <div>
                <p className="text-[10px] text-white/40 uppercase font-semibold">Modelo</p>
                <p className="text-sm text-white/90 mt-1">{product.model || '—'}</p>
              </div>
              <div>
                <p className="text-[10px] text-white/40 uppercase font-semibold">Género</p>
                <p className="text-sm text-white/90 mt-1">{product.gender || '—'}</p>
              </div>
              <div>
                <p className="text-[10px] text-white/40 uppercase font-semibold">Talla</p>
                <p className="text-sm text-white/90 mt-1">{product.size || '—'}</p>
              </div>
              <div>
                <p className="text-[10px] text-white/40 uppercase font-semibold">Color</p>
                <p className="text-sm text-white/90 mt-1">{product.color || '—'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[10px] text-white/40 uppercase font-semibold">Precio</p>
                <p className="text-lg font-bold text-nikeOrange mt-1">${product.unit_price.toFixed(2)}</p>
              </div>
              {product.description && (
                <div className="col-span-2">
                  <p className="text-[10px] text-white/40 uppercase font-semibold">Descripción</p>
                  <p className="text-xs text-white/70 mt-1">{product.description}</p>
                </div>
              )}
            </div>
          </Card>

          <Card title="Stock por Almacén" icon={<BarChart3 className="w-5 h-5 text-nikeOrange" />}>
            <div className="space-y-2">
              {product.stock_by_warehouse.map((sw) => (
                <div key={sw.warehouse_id} className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                  <div>
                    <p className="text-xs font-semibold text-white/90">{sw.warehouse_name}</p>
                    <p className="text-[10px] text-white/40">{sw.city}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${sw.is_critical ? 'text-red-400' : 'text-green-400'}`}>
                      {sw.stock_qty}
                    </p>
                    <p className="text-[10px] text-white/40">mín: {sw.min_stock}</p>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between p-2 rounded-lg bg-nikeOrange/10 border border-nikeOrange/20">
                <p className="text-xs font-bold text-nikeOrange">Total</p>
                <p className="text-sm font-bold text-nikeOrange">{totalStock}</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Código de Barras" icon={<Package className="w-5 h-5 text-nikeOrange" />}>
            {product.barcode ? (
              <div className="flex flex-col items-center gap-2 p-3 bg-white rounded-xl">
                <BarcodeLabel value={product.barcode} height={50} width={2} fontSize={12} />
                <p className="text-xs font-mono text-gray-600">{product.barcode}</p>
              </div>
            ) : (
              <p className="text-sm text-white/30 text-center py-4">Sin código de barras</p>
            )}
          </Card>

          <Card title="Imprimir Etiqueta" icon={<Printer className="w-5 h-5 text-nikeOrange" />}>
            <LabelPrintPanel
              product_name={product.product_name}
              sku={product.sku}
              barcode={product.barcode}
              unit_price={product.unit_price}
              size={product.size}
              color={product.color}
              gender={product.gender}
              model={product.model}
            />
          </Card>

          <Card title="Resumen" icon={<Package className="w-5 h-5 text-nikeOrange" />}>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/60">Stock Total</span>
                <span className="text-sm font-bold text-white/90">{totalStock}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/60">Almacenes</span>
                <span className="text-sm font-bold text-white/90">{product.stock_by_warehouse.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/60">Estado</span>
                <Badge variant={product.status === 'active' ? 'success' : 'secondary'}>{product.status}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/60">Creado</span>
                <span className="text-xs text-white/60">{new Date(product.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
