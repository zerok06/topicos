import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from '@tanstack/react-router'
import { Search, Plus, Printer, Package, Edit3, BarChart3 } from 'lucide-react'
import { Card } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { ChartSkeleton } from '../../components/metrics/MetricCardSkeleton'
import api from '../../services/api'
import type { ProductListItem } from '../../types/product'

export const ProductsPage: React.FC = () => {
  const navigate = useNavigate()
  const [products, setProducts] = useState<ProductListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<number>>(new Set())

  const fetchProducts = () => {
    setLoading(true)
    api.get(`/products${search ? `?search=${encodeURIComponent(search)}` : ''}`)
      .then(r => setProducts(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchProducts() }, [])

  useEffect(() => {
    const timer = setTimeout(fetchProducts, 300)
    return () => clearTimeout(timer)
  }, [search])

  const toggleSelect = (id: number) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  const toggleAll = () => {
    if (selected.size === products.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(products.map(p => p.product_id)))
    }
  }

  const printSelected = () => {
    const selectedProducts = products.filter(p => selected.has(p.product_id))
    if (selectedProducts.length === 0) return

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(`
      <html><head><title>Etiquetas</title>
      <style>
        @page { margin: 0; }
        body { margin: 0; padding: 0; font-family: 'Courier New', monospace; }
        .lp { display: flex; flex-wrap: wrap; }
        .li { width: 74mm; height: 44mm; border: 1px dashed #ccc; padding: 3mm; box-sizing: border-box; page-break-inside: avoid; }
        .lh { font-size: 6px; font-weight: bold; color: #888; text-transform: uppercase; letter-spacing: 1px; }
        .ln { font-size: 9px; font-weight: bold; margin: 1px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .lm { font-size: 7px; color: #666; }
        .lp2 { font-size: 11px; font-weight: bold; margin-top: auto; }
        .lb { margin-top: 2px; text-align: center; font-size: 10px; font-family: monospace; }
        @media print { body { margin: 0; padding: 0; } .no-print { display: none; } @page { margin: 0; } .li { border: none; } }
      </style></head>
      <body>
        <div class="no-print" style="margin-bottom:5mm;text-align:center;">
          <button onclick="window.print()" style="padding:8px 24px;font-size:14px;cursor:pointer;background:#FA5400;color:white;border:none;border-radius:8px;">Imprimir ${selectedProducts.length} etiqueta(s)</button>
        </div>
        <div class="lp">
          ${selectedProducts.map(p => `
            <div class="li">
              <div class="lh">Nike Logistica</div>
              <div class="ln">${esc(p.product_name)}</div>
              <div class="lm">SKU: ${esc(p.sku)}</div>
              <div class="lp2">$${p.unit_price.toFixed(2)}</div>
              <div class="lb">${p.barcode || ''}</div>
            </div>
          `).join('')}
        </div>
      </body></html>
    `)
    printWindow.document.close()
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Productos</h1>
          <p className="text-sm text-white/40 mt-1">Gestiona todos los productos registrados</p>
        </div>
        <button
          onClick={() => navigate({ to: '/products' })}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-nikeOrange hover:bg-nikeOrange/80 text-white text-xs font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo Producto
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, SKU o código de barras..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder:text-white/20 focus:outline-none focus:border-nikeOrange/50"
          />
        </div>
        {selected.size > 0 && (
          <button
            onClick={printSelected}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-nikeOrange/20 hover:bg-nikeOrange/30 text-nikeOrange text-xs font-semibold transition-colors"
          >
            <Printer className="w-4 h-4" />
            Imprimir ({selected.size})
          </button>
        )}
      </div>

      <Card title={`${products.length} producto(s)`} icon={<Package className="w-5 h-5 text-nikeOrange" />}>
        {loading ? (
          <ChartSkeleton />
        ) : products.length === 0 ? (
          <p className="text-sm text-white/30 text-center py-8">No se encontraron productos.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="p-2 text-left">
                    <input
                      type="checkbox"
                      checked={selected.size === products.length && products.length > 0}
                      onChange={toggleAll}
                      className="accent-nikeOrange"
                    />
                  </th>
                  <th className="p-2 text-left text-white/40 font-semibold">SKU</th>
                  <th className="p-2 text-left text-white/40 font-semibold">Producto</th>
                  <th className="p-2 text-left text-white/40 font-semibold">Código Barras</th>
                  <th className="p-2 text-right text-white/40 font-semibold">Precio</th>
                  <th className="p-2 text-right text-white/40 font-semibold">Stock Total</th>
                  <th className="p-2 text-center text-white/40 font-semibold">Estado</th>
                  <th className="p-2 text-right text-white/40 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p, i) => (
                  <motion.tr
                    key={p.product_id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03, duration: 0.3 }}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={() => navigate({ to: `/products/${p.product_id}` })}
                  >
                    <td className="p-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(p.product_id)}
                        onChange={() => toggleSelect(p.product_id)}
                        className="accent-nikeOrange"
                      />
                    </td>
                    <td className="p-2 font-mono text-white/60">{p.sku}</td>
                    <td className="p-2 font-semibold text-white/90">{p.product_name}</td>
                    <td className="p-2 text-white/40 font-mono">{p.barcode || '-'}</td>
                    <td className="p-2 text-right text-white/90">${p.unit_price.toFixed(2)}</td>
                    <td className="p-2 text-right">
                      <span className={`font-bold ${p.total_stock > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {p.total_stock}
                      </span>
                      <span className="text-white/30 ml-1">({p.warehouse_count} alm.)</span>
                    </td>
                    <td className="p-2 text-center">
                      <Badge variant={p.status === 'active' ? 'success' : 'secondary'}>
                        {p.status}
                      </Badge>
                    </td>
                    <td className="p-2 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => navigate({ to: `/products/${p.product_id}` })}
                          className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                          title="Ver detalle"
                        >
                          <BarChart3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => navigate({ to: `/products/${p.product_id}/edit` })}
                          className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                          title="Editar"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setSelected(new Set([p.product_id]))
                            setTimeout(() => printSelected(), 0)
                          }}
                          className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                          title="Imprimir etiqueta"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

function esc(val: string): string {
  return val.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
