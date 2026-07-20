import React, { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { AlertCircle, Camera, CheckCircle2, Loader2, QrCode, List as ListIcon } from 'lucide-react'
import { Card } from '../../components/ui/card'
import { BarcodeScanner } from '../../components/BarcodeScanner'
import { BarcodeLabel } from '../../components/products/BarcodeLabel'
import { LabelPrintPanel } from '../../components/products/LabelPrintPanel'
import { WarehouseDistributionForm } from '../../components/products/WarehouseDistributionForm'
import { inventoryService } from '../../services/inventory.service'
import type { WarehouseDistribution } from '../../types/product'

export const ProductRegistrationPage: React.FC = () => {
  const navigate = useNavigate()
  const [showScanner, setShowScanner] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [distributions, setDistributions] = useState<WarehouseDistribution[]>([])
  const [form, setForm] = useState({
    product_name: '',
    model: '',
    gender: 'Unisex',
    size: '',
    color: '',
    unit_price: '',
    description: '',
    barcode: '',
  })

  const update = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleBarcodeScan = (decodedText: string) => {
    setForm(prev => ({ ...prev, barcode: decodedText }))
  }

  const generateInternalBarcode = () => {
    const random = Math.floor(1000 + Math.random() * 9000)
    setForm(prev => ({ ...prev, barcode: `INT-${random}` }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const payload: any = {
        product_name: form.product_name,
        unit_price: parseFloat(form.unit_price),
      }
      if (form.model) payload.model = form.model
      if (form.gender) payload.gender = form.gender
      if (form.size) payload.size = form.size
      if (form.color) payload.color = form.color
      if (form.description) payload.description = form.description
      if (form.barcode) payload.barcode = form.barcode
      if (distributions.length > 0) {
        payload.warehouse_distribution = distributions
      }

      const result = await inventoryService.createProduct(payload)
      setSuccess(`Producto "${result.product_name}" creado con SKU: ${result.sku}`)
      setForm({
        product_name: '', model: '', gender: 'Unisex', size: '', color: '',
        unit_price: '', description: '', barcode: '',
      })
      setDistributions([])
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Error al crear producto')
    } finally {
      setLoading(false)
    }
  }

  const hasBarcode = !!form.barcode
  const hasAllData = form.product_name && form.unit_price

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Registrar Producto</h1>
          <p className="text-sm text-white/40 mt-1">
            Escanea un código de barras o ingresa los datos manualmente
          </p>
        </div>
        <button
          onClick={() => navigate({ to: '/products/list' })}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 text-xs font-semibold transition-colors"
        >
          <ListIcon className="w-4 h-4" />
          Ver Productos
        </button>
      </div>

      {success && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
          <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
          <p className="text-sm font-medium text-green-300">{success}</p>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card title="Datos del Producto">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs text-white/60 font-semibold">Nombre del Producto *</label>
                  <input
                    value={form.product_name}
                    onChange={e => update('product_name', e.target.value)}
                    placeholder="Ej: Nike Air Max 90"
                    required
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-nikeOrange/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/60 font-semibold">Modelo</label>
                  <input
                    value={form.model}
                    onChange={e => update('model', e.target.value)}
                    placeholder="Ej: DM0011-100"
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-nikeOrange/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/60 font-semibold">Género</label>
                  <select
                    value={form.gender}
                    onChange={e => update('gender', e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-nikeOrange/50"
                  >
                    <option value="Unisex">Unisex</option>
                    <option value="Hombre">Hombre</option>
                    <option value="Mujer">Mujer</option>
                    <option value="Niño">Niño</option>
                    <option value="Niña">Niña</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-white/60 font-semibold">Talla</label>
                  <input
                    value={form.size}
                    onChange={e => update('size', e.target.value)}
                    placeholder="Ej: 42, M, L"
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-nikeOrange/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/60 font-semibold">Color</label>
                  <input
                    value={form.color}
                    onChange={e => update('color', e.target.value)}
                    placeholder="Ej: Blanco/Negro"
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-nikeOrange/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/60 font-semibold">Precio Unitario *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={form.unit_price}
                    onChange={e => update('unit_price', e.target.value)}
                    placeholder="Ej: 299.99"
                    required
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-nikeOrange/50"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-white/60 font-semibold">Descripción</label>
                  <textarea
                    value={form.description}
                    onChange={e => update('description', e.target.value)}
                    placeholder="Descripción del producto..."
                    rows={2}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-nikeOrange/50 resize-none"
                  />
                </div>
              </div>

              <div className="border-t border-white/5 pt-4">
                <label className="text-xs text-white/60 font-semibold mb-2 block">Código de Barras</label>
                <div className="flex gap-2">
                  <input
                    value={form.barcode}
                    onChange={e => update('barcode', e.target.value)}
                    placeholder="Escanear o ingresar código EAN-13"
                    className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-nikeOrange/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowScanner(true)}
                    className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 text-xs transition-colors"
                    title="Escanear código"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={generateInternalBarcode}
                    className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 text-xs transition-colors"
                    title="Generar código interno"
                  >
                    <QrCode className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="border-t border-white/5 pt-4">
                <WarehouseDistributionForm value={distributions} onChange={setDistributions} />
              </div>

              <button
                type="submit"
                disabled={loading || !hasAllData}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-nikeOrange hover:bg-nikeOrange/80 text-white text-sm font-bold transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Registrando...
                  </>
                ) : (
                  'Registrar Producto'
                )}
              </button>
            </form>
          </Card>
        </div>

        <div className="space-y-4">
          {hasBarcode && (
            <Card title="Vista Previa Código" className="p-4">
              <div className="flex flex-col items-center gap-2 p-3 bg-white rounded-xl">
                <BarcodeLabel value={form.barcode} height={40} width={1.5} fontSize={10} />
                <p className="text-xs font-mono text-gray-600">{form.barcode}</p>
              </div>
            </Card>
          )}

          {hasAllData && (
            <Card title="Vista Previa Etiqueta" className="p-4">
              <LabelPrintPanel
                product_name={form.product_name}
                sku="NK-XXXX"
                barcode={form.barcode || undefined}
                unit_price={parseFloat(form.unit_price) || 0}
                size={form.size || undefined}
                color={form.color || undefined}
                gender={form.gender || undefined}
                model={form.model || undefined}
              />
            </Card>
          )}

          {distributions.length > 0 && (
            <Card title="Resumen Distribución" className="p-4">
              <div className="space-y-1.5">
                {distributions.map((d) => (
                  <div key={d.warehouse_id} className="text-xs text-white/70 flex justify-between">
                    <span>Almacén #{d.warehouse_id}</span>
                    <span className="font-semibold text-white/90">{d.stock_qty} uds</span>
                  </div>
                ))}
                <div className="border-t border-white/10 pt-1.5 mt-1.5 flex justify-between text-xs">
                  <span className="text-white/60">Total</span>
                  <span className="font-bold text-nikeOrange">
                    {distributions.reduce((s, d) => s + d.stock_qty, 0)} uds
                  </span>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {showScanner && (
        <BarcodeScanner
          onScan={handleBarcodeScan}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  )
}
