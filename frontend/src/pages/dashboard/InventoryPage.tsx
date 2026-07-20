import React, { useEffect, useState, useMemo, useCallback } from 'react'
import {
  Database,
  RefreshCw,
  ShieldAlert,
  ClipboardList,
  Search,
  Package,
  AlertTriangle,
  TrendingUp,
  Warehouse,
  ArrowRight,
  Filter,
  X,
  Plus,
  Eye,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Camera,
  QrCode,
  ArrowLeftRight,
  Printer,
  DollarSign,
  Ruler,
  Palette,
  Info,
  Hash,
  Barcode,
  Tag,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { Card } from '../../components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { SlidePanel } from '../../components/ui/slide-panel'
import { Loader } from '../../components/ui/Loader'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Progress } from '../../components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select'
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from '../../components/ui/tabs'
import { MetricCard } from '../../components/metrics/MetricCard'
import { BarcodeScanner } from '../../components/BarcodeScanner'
import { BarcodeLabel } from '../../components/products/BarcodeLabel'
import { LabelPrintPanel } from '../../components/products/LabelPrintPanel'
import { WarehouseDistributionForm } from '../../components/products/WarehouseDistributionForm'
import { toast } from 'sonner'
import TrackingMap from '../../components/tracking/TrackingMap'
import { useAuthStore } from '../../store/useAuthStore'
import { useIsMobile } from '../../hooks/useIsMobile'
import api from '../../services/api'
import { inventoryService } from '../../services/inventory.service'
import type { StockItem, TransferRequest } from '../../types/inventory'
import type { ProductDetail, WarehouseDistribution } from '../../types/product'

type StockFilter = 'all' | 'normal' | 'critical' | 'low'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.03 },
  },
}

const sectionVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.4, 0.25, 1] },
  },
}

export const InventoryPage: React.FC = () => {
  const { hasRole } = useAuthStore()
  const isMobile = useIsMobile()
  const [stock, setStock] = useState<StockItem[]>([])
  const [allWarehouses, setAllWarehouses] = useState<{id: number; name: string; city: string | null}[]>([])
  const [loading, setLoading] = useState(true)

  // Search & filter
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<StockFilter>('all')

  // Dialog states
  const [addProductOpen, setAddProductOpen] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)

  // Product detail
  const [selectedSku, setSelectedSku] = useState<string | null>(null)
  const [productDetail, setProductDetail] = useState<ProductDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  // Transfer form state (global)
  const [transferProduct, setTransferProduct] = useState('')
  const [fromWarehouse, setFromWarehouse] = useState('')
  const [toWarehouse, setToWarehouse] = useState('')
  const [transferQty, setTransferQty] = useState(5)
  const [vehicleType, setVehicleType] = useState('truck')
  const [transferError, setTransferError] = useState<string | null>(null)
  const [transferSuccess, setTransferSuccess] = useState<string | null>(null)
  const [transferring, setTransferring] = useState(false)

  // Product-specific transfer (from SlidePanel)
  const [productTransferOpen, setProductTransferOpen] = useState(false)
  const [ptOrigin, setPtOrigin] = useState('')
  const [ptDestination, setPtDestination] = useState('')
  const [ptQty, setPtQty] = useState(5)
  const [ptVehicleType, setPtVehicleType] = useState('truck')
  const [ptError, setPtError] = useState<string | null>(null)
  const [ptSuccess, setPtSuccess] = useState<string | null>(null)
  const [ptTransferring, setPtTransferring] = useState(false)

  const resetTransferForm = () => {
    setTransferProduct('')
    setFromWarehouse('')
    setToWarehouse('')
    setTransferQty(5)
    setVehicleType('truck')
    setTransferError(null)
    setTransferSuccess(null)
    setTransferring(false)
  }

  const resetPtForm = () => {
    setPtOrigin('')
    setPtDestination('')
    setPtQty(5)
    setPtVehicleType('truck')
    setPtError(null)
    setPtSuccess(null)
    setPtTransferring(false)
  }

  // Add Product form state
  const [showScanner, setShowScanner] = useState(false)
  const [addingProduct, setAddingProduct] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [addSuccess, setAddSuccess] = useState<string | null>(null)
  const [distributions, setDistributions] = useState<WarehouseDistribution[]>([])
  const [productForm, setProductForm] = useState({
    product_name: '',
    model: '',
    gender: 'Unisex',
    size: '',
    color: '',
    unit_price: '',
    description: '',
    barcode: '',
  })

  const fetchStock = useCallback(async () => {
    setLoading(true)
    try {
      const data = await inventoryService.getStock()
      setStock(data)
    } catch {
      toast.error('No se pudo cargar el inventario.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStock()
  }, [fetchStock])

  useEffect(() => {
    api.get('/metrics/warehouses').then(r => setAllWarehouses(r.data)).catch(() => {})
  }, [])

  // Fetch product detail when SKU is selected
  useEffect(() => {
    if (!selectedSku) {
      setProductDetail(null)
      return
    }
    const fetchDetail = async () => {
      setLoadingDetail(true)
      try {
        const products = await inventoryService.getProducts(selectedSku)
        const match = products.find((p: any) => p.sku === selectedSku)
        if (match?.product_id) {
          const detail = await inventoryService.getProductDetail(match.product_id)
          setProductDetail(detail)
        } else {
          setProductDetail(null)
        }
      } catch {
        setProductDetail(null)
      } finally {
        setLoadingDetail(false)
      }
    }
    fetchDetail()
  }, [selectedSku])

  // Stats
  const stats = useMemo(() => {
    const totalUnits = stock.reduce((sum, item) => sum + item.stock_qty, 0)
    const criticalCount = stock.filter((item) => item.stock_qty < item.min_stock).length
    const lowCount = stock.filter((item) => item.stock_qty <= item.min_stock * 1.5 && item.stock_qty >= item.min_stock).length
    const normalCount = stock.length - criticalCount - lowCount
    const warehouses = new Set(stock.map((item) => item.warehouse_name)).size
    return { totalUnits, criticalCount, lowCount, normalCount, warehouses, totalProducts: stock.length }
  }, [stock])

  // Filtered stock
  const filteredStock = useMemo(() => {
    let result = stock.filter(
      (item) =>
        item.product_name.toLowerCase().includes(search.toLowerCase()) ||
        item.sku.toLowerCase().includes(search.toLowerCase()) ||
        item.warehouse_name.toLowerCase().includes(search.toLowerCase()),
    )

    if (filter !== 'all') {
      result = result.filter((item) => {
        if (filter === 'critical') return item.stock_qty < item.min_stock
        if (filter === 'low') return item.stock_qty <= item.min_stock * 1.5 && item.stock_qty >= item.min_stock
        if (filter === 'normal') return item.stock_qty > item.min_stock * 1.5
        return true
      })
    }

    return result
  }, [stock, search, filter])

  // Consolidated stock for selected SKU (from stock data)
  const selectedProductStock = useMemo(() => {
    if (!selectedSku) return null
    const items = stock.filter((item) => item.sku === selectedSku)
    if (items.length === 0) return null
    return {
      product_id: items[0].product_id,
      sku: items[0].sku,
      product_name: items[0].product_name,
      warehouses: items.map((item) => ({
        warehouse_id: item.warehouse_id,
        warehouse_name: item.warehouse_name,
        city: item.city,
        stock_qty: item.stock_qty,
        min_stock: item.min_stock,
        max_stock: item.max_stock,
        is_critical: item.stock_qty < item.min_stock,
      })),
      totalStock: items.reduce((s, i) => s + i.stock_qty, 0),
      totalMinStock: items.reduce((s, i) => s + i.min_stock, 0),
    }
  }, [selectedSku, stock])

  // Available products for transfer (deduplicated by product_id)
  const transferProducts = useMemo(() => {
    const seen = new Set<number>()
    return stock.filter((item) => {
      if (seen.has(item.product_id)) return false
      seen.add(item.product_id)
      return true
    })
  }, [stock])

  // Stock breakdown for selected transfer product
  const selectedTransferStock = useMemo(() => {
    if (!transferProduct) return null
    const pid = parseInt(transferProduct)
    const items = stock.filter(s => s.product_id === pid)
    if (items.length === 0) return null
    return {
      product_id: pid,
      sku: items[0].sku,
      product_name: items[0].product_name,
      warehouses: items.map(item => ({
        warehouse_id: item.warehouse_id,
        warehouse_name: item.warehouse_name,
        city: item.city,
        stock_qty: item.stock_qty,
        min_stock: item.min_stock,
        max_stock: item.max_stock,
        is_critical: item.stock_qty < item.min_stock,
      })),
      totalStock: items.reduce((s, i) => s + i.stock_qty, 0),
    }
  }, [transferProduct, stock])

  const warehouseOptions = useMemo(() => {
    return allWarehouses.map(w => ({ id: w.id, name: w.name, city: w.city }))
  }, [allWarehouses])

  // Transfer handlers
  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault()
    setTransferSuccess(null)
    setTransferError(null)

    if (!transferProduct || !fromWarehouse || !toWarehouse) {
      setTransferError('Por favor selecciona todos los campos.')
      toast.error('Por favor selecciona todos los campos.')
      return
    }

    if (fromWarehouse === toWarehouse) {
      setTransferError('El almacén origen y destino deben ser diferentes.')
      toast.error('El almacén origen y destino deben ser diferentes.')
      return
    }

    setTransferring(true)
    try {
      // Refrescar stock antes de validar
      const freshStock = await inventoryService.getStock()
      const freshSelected = freshStock.filter(s => s.product_id === parseInt(transferProduct))
      const freshWh = freshSelected.find(
        w => w.warehouse_id === parseInt(fromWarehouse)
      )
      const freshMaxStock = freshWh?.stock_qty || 0

      if (transferQty > freshMaxStock) {
        setTransferError(`Stock actualizado: solo hay ${freshMaxStock} unidades disponibles en el almacén origen.`)
        toast.error(`Stock actualizado: solo hay ${freshMaxStock} unidades.`)
        setTransferring(false)
        return
      }

      const data: TransferRequest = {
        product_id: parseInt(transferProduct),
        from_warehouse_id: parseInt(fromWarehouse),
        to_warehouse_id: parseInt(toWarehouse),
        quantity: transferQty,
        vehicle_type: vehicleType,
      }
      const result = await inventoryService.transferStock(data)
      setTransferSuccess(`${result.message} Código: ${result.tracking_code}`)
      toast.success(`${result.message} Código: ${result.tracking_code}`)
      setStock(freshStock)
      setTimeout(() => {
        setTransferOpen(false)
        resetTransferForm()
      }, 1500)
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Error al procesar la transferencia.'
      setTransferError(msg)
      toast.error(msg)
    } finally {
      setTransferring(false)
    }
  }

  const handleProductTransfer = async (e: React.FormEvent) => {
    e.preventDefault()
    setPtError(null)
    setPtSuccess(null)

    if (!ptOrigin || !ptDestination) {
      setPtError('Selecciona almacén origen y destino.')
      toast.error('Selecciona almacén origen y destino.')
      return
    }

    if (ptOrigin === ptDestination) {
      setPtError('El almacén origen y destino deben ser diferentes.')
      toast.error('El almacén origen y destino deben ser diferentes.')
      return
    }

    if (!ptQty || ptQty <= 0) {
      setPtError('Ingresa una cantidad válida.')
      toast.error('Ingresa una cantidad válida.')
      return
    }

    setPtTransferring(true)
    try {
      // Refrescar stock antes de validar
      const freshStock = await inventoryService.getStock()
      const freshWh = freshStock.find(
        s => s.product_id === (selectedProductStock?.product_id || 0) &&
             s.warehouse_id === parseInt(ptOrigin)
      )
      const freshMaxStock = freshWh?.stock_qty || 0

      if (ptQty > freshMaxStock) {
        setPtError(`Stock actualizado: solo hay ${freshMaxStock} unidades disponibles en el almacén origen.`)
        toast.error(`Stock actualizado: solo hay ${freshMaxStock} unidades.`)
        setPtTransferring(false)
        return
      }

      const data: TransferRequest = {
        product_id: selectedProductStock?.product_id || 0,
        from_warehouse_id: parseInt(ptOrigin),
        to_warehouse_id: parseInt(ptDestination),
        quantity: ptQty,
        vehicle_type: ptVehicleType,
      }
      const result = await inventoryService.transferStock(data)
      setPtSuccess(`${result.message} Código: ${result.tracking_code}`)
      toast.success(`${result.message} Código: ${result.tracking_code}`)
      setStock(freshStock)
      setTimeout(() => {
        setProductTransferOpen(false)
        resetPtForm()
      }, 1500)
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Error al procesar la transferencia.'
      setPtError(msg)
      toast.error(msg)
    } finally {
      setPtTransferring(false)
    }
  }

  // Add Product handlers
  const updateProductForm = (field: string, value: string) => {
    setProductForm(prev => ({ ...prev, [field]: value }))
  }

  const handleBarcodeScan = (decodedText: string) => {
    updateProductForm('barcode', decodedText)
  }

  const generateInternalBarcode = () => {
    const random = Math.floor(1000 + Math.random() * 9000)
    updateProductForm('barcode', `INT-${random}`)
  }

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddingProduct(true)
    setAddError(null)
    setAddSuccess(null)

    try {
      const payload: any = {
        product_name: productForm.product_name,
        unit_price: parseFloat(productForm.unit_price),
      }
      if (productForm.model) payload.model = productForm.model
      if (productForm.gender) payload.gender = productForm.gender
      if (productForm.size) payload.size = productForm.size
      if (productForm.color) payload.color = productForm.color
      if (productForm.description) payload.description = productForm.description
      if (productForm.barcode) payload.barcode = productForm.barcode
      if (distributions.length > 0) {
        payload.warehouse_distribution = distributions
      }

      const result = await inventoryService.createProduct(payload)
      setAddSuccess(`Producto "${result.product_name}" creado con SKU: ${result.sku}`)
      toast.success(`Producto creado: ${result.product_name}`)
      setProductForm({
        product_name: '', model: '', gender: 'Unisex', size: '', color: '',
        unit_price: '', description: '', barcode: '',
      })
      setDistributions([])
      fetchStock()
      setTimeout(() => {
        setAddProductOpen(false)
        setAddSuccess(null)
      }, 2000)
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Error al crear producto'
      setAddError(msg)
      toast.error(msg)
    } finally {
      setAddingProduct(false)
    }
  }

  // Helpers
  const getStockPercent = (item: StockItem) => {
    const max = item.max_stock || 500
    return Math.min(100, (item.stock_qty / max) * 100)
  }

  const getStockState = (item: StockItem): 'critical' | 'low' | 'normal' => {
    if (item.stock_qty < item.min_stock) return 'critical'
    if (item.stock_qty <= item.min_stock * 1.5) return 'low'
    return 'normal'
  }

  const getStateColor = (state: 'critical' | 'low' | 'normal') => {
    if (state === 'critical') return 'text-red-400'
    if (state === 'low') return 'text-yellow-400'
    return 'text-green-400'
  }

  const getProgressColor = (state: 'critical' | 'low' | 'normal') => {
    if (state === 'critical') return 'bg-red-500'
    if (state === 'low') return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const hasAddData = productForm.product_name && productForm.unit_price

  const statCards = [
    { label: 'Total Unidades', value: stats.totalUnits, icon: <Package className="w-4 h-4" />, color: 'text-white', iconBg: 'bg-nikeOrange/10 border border-nikeOrange/20 text-nikeOrange' },
    { label: 'Productos', value: stats.totalProducts, icon: <Database className="w-4 h-4" />, color: 'text-blue-400', iconBg: 'bg-blue-500/10 border border-blue-500/20 text-blue-400' },
    { label: 'Almacenes', value: stats.warehouses, icon: <Warehouse className="w-4 h-4" />, color: 'text-green-400', iconBg: 'bg-green-500/10 border border-green-500/20 text-green-400' },
    { label: 'Stock Crítico', value: stats.criticalCount, icon: <AlertTriangle className="w-4 h-4" />, color: 'text-red-400', iconBg: 'bg-red-500/10 border border-red-500/20 text-red-400' },
  ]

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-4 lg:space-y-5"
    >
      {/* Compact Stats */}
      <motion.div variants={sectionVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-3">
        {statCards.map((s, i) => (
          <MetricCard
            key={s.label}
            label={s.label}
            value={s.value}
            icon={s.icon}
            color={s.color}
            iconBg={s.iconBg}
            index={i}
            compact
            animate
          />
        ))}
      </motion.div>

      {/* Action Buttons */}
      <motion.div variants={sectionVariants} className="flex items-center gap-2">
        <Button
          onClick={() => {
            setAddProductOpen(true)
            setAddError(null)
            setAddSuccess(null)
          }}
          size="sm"
          className="bg-nikeOrange hover:bg-nikeOrange/80 text-white"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Nuevo Producto
        </Button>
        {hasRole('admin', 'supervisor') && (
          <Button
            onClick={() => {
              setTransferOpen(true)
              setTransferError(null)
              setTransferSuccess(null)
            }}
            size="sm"
            variant="secondary"
            className="bg-white/5 hover:bg-white/10 border border-white/10"
          >
            <ArrowLeftRight className="w-4 h-4 mr-1.5" />
            Trasladar
          </Button>
        )}
        <div className="flex-1" />
        <button
          onClick={fetchStock}
          className="text-xs text-nikeOrange hover:text-white transition-colors uppercase font-bold tracking-wider flex items-center gap-1"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Refrescar
        </button>
      </motion.div>

      {/* Stock Table Card */}
      <motion.div variants={sectionVariants}>
        <Card
          title="Inventario y Stock en Vivo"
          icon={<Database className="w-5 h-5 text-nikeOrange" />}
        >
          <div className="mb-4 space-y-3">
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por SKU, producto o almacén..."
              icon={<Search className="w-4 h-4" />}
            />

            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <Filter className="w-3.5 h-3.5 text-white/30 shrink-0" />
              <Tabs value={filter} onValueChange={(v) => setFilter(v as StockFilter)}>
                <TabsList className="h-9">
                  <TabsTrigger value="all" className="text-xs">
                    Todos ({stats.totalProducts})
                  </TabsTrigger>
                  <TabsTrigger value="normal" className="text-xs">
                    Normal ({stats.normalCount})
                  </TabsTrigger>
                  <TabsTrigger value="low" className="text-xs">
                    Bajo ({stats.lowCount})
                  </TabsTrigger>
                  <TabsTrigger value="critical" className="text-xs">
                    Crítico ({stats.criticalCount})
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          {loading ? (
            <Loader label="Cargando base de datos central..." />
          ) : filteredStock.length === 0 ? (
            <div className="text-center py-10 text-white/30 text-sm">
              No hay stock registrado o no coincide la búsqueda.
            </div>
          ) : isMobile ? (
            <div className="space-y-3">
              {filteredStock.map((item) => {
                const state = getStockState(item)
                const percent = getStockPercent(item)
                return (
                  <div
                    key={item.inventory_id}
                    onClick={() => setSelectedSku(item.sku)}
                    className="rounded-xl border border-white/5 bg-white/[0.02] p-3.5 space-y-2.5 cursor-pointer hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-white/90 text-sm truncate">{item.product_name}</p>
                        <p className="font-mono text-[10px] text-white/40 mt-0.5">{item.sku}</p>
                      </div>
                      {state === 'critical' ? (
                        <Badge variant="danger">Crítico</Badge>
                      ) : state === 'low' ? (
                        <Badge variant="warning">Bajo</Badge>
                      ) : (
                        <Badge variant="success">Normal</Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-white/50">
                      <Warehouse className="w-3.5 h-3.5" />
                      <span className="truncate">{item.warehouse_name}</span>
                      {item.city && <span className="text-white/30">· {item.city}</span>}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-white/40">Stock</span>
                        <span className={`font-bold ${getStateColor(state)}`}>
                          {item.stock_qty} / {item.max_stock || 500}
                        </span>
                      </div>
                      <Progress
                        value={percent}
                        className="h-1.5"
                        indicatorClassName={getProgressColor(state)}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-white/40 text-xs uppercase tracking-wider">
                    <th className="py-3 px-2">SKU</th>
                    <th className="py-3 px-2">Producto</th>
                    <th className="py-3 px-2">Almacén</th>
                    <th className="py-3 px-2 w-40">Nivel</th>
                    <th className="py-3 px-2 text-right">Cantidad</th>
                    <th className="py-3 px-2 text-right">Estado</th>
                    <th className="py-3 px-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStock.map((item) => {
                    const state = getStockState(item)
                    const percent = getStockPercent(item)
                    return (
                      <tr
                        key={item.inventory_id}
                        onClick={() => setSelectedSku(item.sku)}
                        className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                      >
                        <td className="py-3.5 px-2 font-mono text-xs text-white/60">
                          {item.sku}
                        </td>
                        <td className="py-3.5 px-2 font-semibold text-white/90">
                          {item.product_name}
                        </td>
                        <td className="py-3.5 px-2 text-white/60">
                          <div className="flex items-center gap-1.5">
                            <Warehouse className="w-3.5 h-3.5 text-white/30" />
                            <span>{item.warehouse_name}</span>
                            {item.city && <span className="text-xs text-white/30">({item.city})</span>}
                          </div>
                        </td>
                        <td className="py-3.5 px-2">
                          <div className="flex items-center gap-2">
                            <Progress
                              value={percent}
                              className="h-1.5"
                              indicatorClassName={getProgressColor(state)}
                            />
                            <span className="text-[10px] text-white/30 shrink-0 w-16 text-right">
                              {item.stock_qty}/{item.max_stock || 500}
                            </span>
                          </div>
                        </td>
                        <td className={`py-3.5 px-2 text-right font-bold ${getStateColor(state)}`}>
                          {item.stock_qty}
                        </td>
                        <td className="py-3.5 px-2 text-right">
                          {state === 'critical' ? (
                            <Badge variant="danger">Crítico</Badge>
                          ) : state === 'low' ? (
                            <Badge variant="warning">Bajo</Badge>
                          ) : (
                            <Badge variant="success">Normal</Badge>
                          )}
                        </td>
                        <td className="py-3.5 px-2 text-center">
                          <Eye className="w-4 h-4 text-white/30 hover:text-nikeOrange transition-colors" />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </motion.div>

      {/* ============ ADD PRODUCT DIALOG ============ */}
      <Dialog open={addProductOpen} onOpenChange={setAddProductOpen}>
        <DialogContent width="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Registrar Producto</DialogTitle>
          </DialogHeader>

          {addSuccess && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-green-500/10 border border-green-500/20">
              <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
              <p className="text-sm font-medium text-green-300">{addSuccess}</p>
            </div>
          )}

          {addError && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">{addError}</p>
            </div>
          )}

          <form onSubmit={handleAddProduct} className="flex flex-col max-h-[75vh]">
            <div className="overflow-y-auto flex-1 space-y-3 pr-1">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Nombre del Producto *</Label>
                  <input
                    value={productForm.product_name}
                    onChange={e => updateProductForm('product_name', e.target.value)}
                    placeholder="Ej: Nike Air Max 90"
                    required
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-nikeOrange/50"
                  />
                </div>
                <div>
                  <Label>Modelo</Label>
                  <input
                    value={productForm.model}
                    onChange={e => updateProductForm('model', e.target.value)}
                    placeholder="Ej: DM0011-100"
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-nikeOrange/50"
                  />
                </div>
                <div>
                  <Label>Género</Label>
                  <select
                    value={productForm.gender}
                    onChange={e => updateProductForm('gender', e.target.value)}
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
                  <Label>Talla</Label>
                  <input
                    value={productForm.size}
                    onChange={e => updateProductForm('size', e.target.value)}
                    placeholder="Ej: 42, M, L"
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-nikeOrange/50"
                  />
                </div>
                <div>
                  <Label>Color</Label>
                  <input
                    value={productForm.color}
                    onChange={e => updateProductForm('color', e.target.value)}
                    placeholder="Ej: Blanco/Negro"
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-nikeOrange/50"
                  />
                </div>
                <div>
                  <Label>Precio Unitario *</Label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={productForm.unit_price}
                    onChange={e => updateProductForm('unit_price', e.target.value)}
                    placeholder="Ej: 299.99"
                    required
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-nikeOrange/50"
                  />
                </div>
                <div className="col-span-2">
                  <Label>Descripción</Label>
                  <textarea
                    value={productForm.description}
                    onChange={e => updateProductForm('description', e.target.value)}
                    placeholder="Descripción del producto..."
                    rows={1}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-nikeOrange/50 resize-none"
                  />
                </div>
              </div>

              <div className="border-t border-white/5 pt-3">
                <Label className="block text-xs mb-1">Código de Barras</Label>
                <div className="flex gap-1.5">
                  <input
                    value={productForm.barcode}
                    onChange={e => updateProductForm('barcode', e.target.value)}
                    placeholder="Escanear o ingresar código EAN-13"
                    className="flex-1 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-nikeOrange/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowScanner(true)}
                    className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 text-xs transition-colors"
                    title="Escanear código"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={generateInternalBarcode}
                    className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 text-xs transition-colors"
                    title="Generar código interno"
                  >
                    <QrCode className="w-4 h-4" />
                  </button>
                </div>
                {productForm.barcode && (
                  <div className="mt-1.5 p-1.5 bg-white rounded-lg inline-block">
                    <BarcodeLabel value={productForm.barcode} height={24} width={1} fontSize={7} />
                  </div>
                )}
              </div>

              <div className="pt-2">
                <WarehouseDistributionForm value={distributions} onChange={setDistributions} />
              </div>
            </div>

            <div className="sticky bottom-0 pt-3 mt-auto">
              <Button
                type="submit"
                disabled={addingProduct || !hasAddData}
                className="w-full bg-nikeOrange hover:bg-nikeOrange/80 text-white"
              >
                {addingProduct ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Registrando...</>
                ) : (
                  'Registrar Producto'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ============ TRANSFER MODAL ============ */}
      <Dialog open={transferOpen} onOpenChange={(open) => {
        setTransferOpen(open)
        if (!open) {
          resetTransferForm()
        }
      }}>
        <DialogContent width="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Traslado Rapido de Stock</DialogTitle>
          </DialogHeader>

          {!hasRole('admin', 'supervisor') ? (
            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex gap-3 items-start">
              <ShieldAlert className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-red-400">Funcionalidad Restringida</h4>
                <p className="text-xs text-white/50 mt-1">
                  Tu rol de <strong>Operador</strong> no permite realizar traslados.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleTransfer}>
              <div className="grid grid-cols-[2fr_3fr] gap-6">
                {/* Left column - form */}
                <div className="space-y-5">
                  {/* Producto selector */}
                  <div className="flex flex-col gap-1.5">
                    <Label>Producto</Label>
                    <Select
                      value={transferProduct}
                      onValueChange={(v) => {
                        setTransferProduct(v)
                        setFromWarehouse('')
                        setToWarehouse('')
                        setTransferQty(5)
                        setTransferError(null)
                        setTransferSuccess(null)
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona Producto" />
                      </SelectTrigger>
                      <SelectContent>
                        {transferProducts.map((p) => (
                          <SelectItem key={p.product_id} value={String(p.product_id)}>
                            {p.product_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Stock preview for selected product */}
                  {selectedTransferStock && (
                    <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                      <div className="px-4 py-2 border-b border-white/10 bg-white/[0.02]">
                        <p className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">
                          Stock por almacen
                        </p>
                      </div>
                      <div className="p-3 space-y-2">
                        {selectedTransferStock.warehouses.map((w, i) => {
                          const max = w.max_stock || 500
                          const percent = Math.min(100, (w.stock_qty / max) * 100)
                          const state = w.is_critical ? 'critical' : w.stock_qty <= w.min_stock * 1.5 ? 'low' : 'normal'
                          return (
                            <div key={i} className="flex items-center gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-white/70 truncate">{w.warehouse_name}</span>
                                  <span className={`font-bold shrink-0 ml-2 ${w.is_critical ? 'text-red-400' : state === 'low' ? 'text-yellow-400' : 'text-green-400'}`}>
                                    {w.stock_qty} uds
                                  </span>
                                </div>
                                <Progress value={percent} className="h-1 mt-1" indicatorClassName={
                                  w.is_critical ? 'bg-red-500' : state === 'low' ? 'bg-yellow-500' : 'bg-green-500'
                                } />
                              </div>
                            </div>
                          )
                        })}
                        <div className="flex items-center justify-between border-t border-white/10 pt-2 mt-1">
                          <span className="text-[10px] text-white/40 uppercase">Total</span>
                          <span className="text-xs font-bold text-white/90">{selectedTransferStock.totalStock} uds</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Origen */}
                  <div className="flex flex-col gap-1.5">
                    <Label>Almacen Origen</Label>
                    <Select
                      value={fromWarehouse}
                      onValueChange={(v) => {
                        setFromWarehouse(v)
                        const newMax = selectedTransferStock?.warehouses.find(
                          w => String(w.warehouse_id) === v
                        )?.stock_qty || 0
                        setTransferQty(Math.min(5, newMax))
                      }}
                      disabled={!selectedTransferStock}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Origen" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedTransferStock?.warehouses
                          .filter(w => w.stock_qty > 0)
                          .map((w) => (
                            <SelectItem key={`tf-from-${w.warehouse_id}`} value={String(w.warehouse_id)}>
                              <div className="flex items-center justify-between w-full gap-4">
                                <span>{w.warehouse_name}</span>
                                <span className="text-white/40 font-mono text-xs">{w.stock_qty} uds</span>
                              </div>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Destino */}
                  <div className="flex flex-col gap-1.5">
                    <Label>Almacen Destino</Label>
                    <Select
                      value={toWarehouse}
                      onValueChange={setToWarehouse}
                      disabled={!selectedTransferStock}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Destino" />
                      </SelectTrigger>
                      <SelectContent>
                        {warehouseOptions
                          .filter(w => String(w.id) !== fromWarehouse)
                          .map((w) => (
                            <SelectItem key={`tf-to-${w.id}`} value={String(w.id)}>
                              {w.name} {w.city ? `(${w.city})` : ''}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Cantidad */}
                  <div className="flex flex-col gap-1.5">
                    <Label>
                      Cantidad
                      {fromWarehouse && (
                        <span className="text-white/40 font-normal ml-2">
                          (max: {selectedTransferStock?.warehouses.find(
                            w => String(w.warehouse_id) === fromWarehouse
                          )?.stock_qty || 0} uds)
                        </span>
                      )}
                    </Label>
                  <Input
                    type="number"
                    value={transferQty}
                    onChange={(e) => {
                      const maxStock = selectedTransferStock?.warehouses.find(
                        w => String(w.warehouse_id) === fromWarehouse
                      )?.stock_qty || 0
                      const val = parseInt(e.target.value) || 1
                      setTransferQty(Math.min(val, maxStock))
                    }}
                    min={1}
                    max={selectedTransferStock?.warehouses.find(
                      w => String(w.warehouse_id) === fromWarehouse
                    )?.stock_qty || 0}
                    disabled={!fromWarehouse}
                  />
                  </div>

                  {/* Tipo de vehiculo */}
                  <div className="flex flex-col gap-1.5">
                    <Label>Transporte</Label>
                    <Select value={vehicleType} onValueChange={setVehicleType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Tipo de vehiculo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="truck">
                          <div className="flex items-center gap-2">
                            🚚 Camion — S/ 2.50/km
                          </div>
                        </SelectItem>
                        <SelectItem value="van">
                          <div className="flex items-center gap-2">
                            🚐 Camioneta — S/ 1.80/km
                          </div>
                        </SelectItem>
                        <SelectItem value="bike">
                          <div className="flex items-center gap-2">
                            🏍️ Moto — S/ 0.50/km
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Warning for critical/low origin */}
                  {fromWarehouse && (() => {
                    const originWh = selectedTransferStock?.warehouses.find(
                      w => String(w.warehouse_id) === fromWarehouse
                    )
                    if (!originWh) return null
                    if (originWh.is_critical) {
                      return (
                        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-bold text-red-400">Stock Critico</p>
                            <p className="text-[10px] text-white/50 mt-0.5">
                              Este almacen tiene {originWh.stock_qty} uds (minimo: {originWh.min_stock}). Puedes realizar el traslado igualmente.
                            </p>
                          </div>
                        </div>
                      )
                    }
                    if (originWh.stock_qty <= originWh.min_stock * 1.5) {
                      return (
                        <div className="flex items-start gap-2 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                          <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-bold text-yellow-400">Stock Bajo</p>
                            <p className="text-[10px] text-white/50 mt-0.5">
                              Stock por debajo del nivel optimo ({originWh.stock_qty}/{originWh.min_stock}).
                            </p>
                          </div>
                        </div>
                      )
                    }
                    return null
                  })()}

                  {/* Flow indicator */}
                  {fromWarehouse && toWarehouse && fromWarehouse !== toWarehouse && (
                    <div className="flex items-center justify-center gap-3 py-2 px-4 rounded-xl bg-white/5 border border-white/5">
                      <span className="text-xs text-white/60 font-medium">
                        {warehouseOptions.find(w => String(w.id) === fromWarehouse)?.city || 'Origen'}
                      </span>
                      <ArrowRight className="w-4 h-4 text-nikeOrange" />
                      <span className="text-xs text-white/60 font-medium">
                        {warehouseOptions.find(w => String(w.id) === toWarehouse)?.city || 'Destino'}
                      </span>
                      <span className="text-xs text-white/40">·</span>
                      <span className="text-xs text-nikeOrange font-bold">{transferQty} unidades</span>
                    </div>
                  )}

                  {transferSuccess && (
                    <div className="text-xs text-green-400 font-semibold bg-green-500/10 border border-green-500/20 p-3 rounded-xl flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 shrink-0" />
                      {transferSuccess}
                    </div>
                  )}
                  {transferError && (
                    <div className="text-xs text-red-400 font-semibold bg-red-500/10 border border-red-500/20 p-3 rounded-xl flex items-center gap-2">
                      <X className="w-4 h-4 shrink-0" />
                      {transferError}
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => { resetTransferForm(); setTransferOpen(false); }}
                      className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-sm font-semibold transition-all"
                    >
                      Cancelar
                    </button>
                    <Button type="submit" className="flex-1 bg-nikeOrange hover:bg-nikeOrange/80 text-white" disabled={transferring}>
                      {transferring ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Procesando...</>
                      ) : (
                        <><ClipboardList className="w-4 h-4 mr-2" /> Confirmar Traslado</>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Right column - tracking preview */}
                <div className="h-full min-h-[250px]">
                  {fromWarehouse && toWarehouse && fromWarehouse !== toWarehouse ? (() => {
                    const previewId = `Vista previa`
                    return (
                      <TrackingMap
                        fromId={fromWarehouse}
                        toId={toWarehouse}
                        warehouses={selectedTransferStock?.warehouses || []}
                        warehouseOptions={warehouseOptions}
                        transferQty={transferQty}
                        trackingId={previewId}
                        estimatedDays={0}
                        etaStr={''}
                        progressPercent={0}
                      />
                    )
                  })() : (
                    <div className="h-full rounded-xl bg-white/[0.02] border border-dashed border-white/10 flex flex-col items-center justify-center text-center p-6">
                      <ArrowLeftRight className="w-8 h-8 text-white/20 mb-3" />
                      <p className="text-xs text-white/30 font-medium">Vista previa del traslado</p>
                      <p className="text-[10px] text-white/20 mt-1 max-w-[180px]">
                        Selecciona origen y destino para ver la ruta en el mapa
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ============ PRODUCT DETAIL SLIDE PANEL ============ */}
      <SlidePanel
        open={!!selectedSku}
        onOpenChange={(open) => { if (!open) setSelectedSku(null) }}
        title={selectedProductStock?.product_name || 'Producto'}
        width="w-[600px]"
        footer={
          !isMobile && productDetail ? (
            <div className="flex gap-2">
              {hasRole('admin', 'supervisor') && (
                <button
                  onClick={() => {
                    setPtOrigin('')
                    setPtDestination('')
                    setPtQty(5)
                    setPtError(null)
                    setPtSuccess(null)
                    setProductTransferOpen(true)
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-nikeOrange hover:bg-nikeOrange/80 text-white text-sm font-bold transition-all flex items-center justify-center gap-2"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  Trasladar
                </button>
              )}
              <button
                onClick={() => setSelectedSku(null)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-sm font-semibold transition-all"
              >
                Cerrar
              </button>
            </div>
          ) : undefined
        }
      >
        {loadingDetail ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-nikeOrange" />
          </div>
        ) : selectedProductStock ? (
          isMobile ? (
            /* ----- MOBILE: Product Detail ----- */
            <div className="space-y-3">
              {/* SKU & Summary */}
              <div className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3 border border-white/10">
                <div>
                  <p className="text-[10px] text-white/40 uppercase tracking-wider">SKU</p>
                  <p className="font-mono text-xs font-bold text-white/90">{selectedProductStock.sku}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-white/40 uppercase tracking-wider">Stock Total</p>
                  <p className="text-sm font-bold text-white/90">{selectedProductStock.totalStock} uds</p>
                </div>
              </div>

              {/* Product info */}
              {productDetail && (
                <div className="grid grid-cols-2 gap-2">
                  {productDetail.model && (
                    <div className="bg-white/5 rounded-xl px-3 py-2.5 border border-white/10">
                      <p className="text-[10px] text-white/40 flex items-center gap-1"><Hash className="w-3 h-3" /> Modelo</p>
                      <p className="text-xs font-semibold text-white/90 truncate">{productDetail.model}</p>
                    </div>
                  )}
                  {productDetail.gender && (
                    <div className="bg-white/5 rounded-xl px-3 py-2.5 border border-white/10">
                      <p className="text-[10px] text-white/40 flex items-center gap-1"><Tag className="w-3 h-3" /> Género</p>
                      <p className="text-xs font-semibold text-white/90">{productDetail.gender}</p>
                    </div>
                  )}
                  {productDetail.size && (
                    <div className="bg-white/5 rounded-xl px-3 py-2.5 border border-white/10">
                      <p className="text-[10px] text-white/40 flex items-center gap-1"><Ruler className="w-3 h-3" /> Talla</p>
                      <p className="text-xs font-semibold text-white/90">{productDetail.size}</p>
                    </div>
                  )}
                  {productDetail.color && (
                    <div className="bg-white/5 rounded-xl px-3 py-2.5 border border-white/10">
                      <p className="text-[10px] text-white/40 flex items-center gap-1"><Palette className="w-3 h-3" /> Color</p>
                      <p className="text-xs font-semibold text-white/90">{productDetail.color}</p>
                    </div>
                  )}
                  {productDetail.unit_price && (
                    <div className="bg-white/5 rounded-xl px-3 py-2.5 border border-white/10">
                      <p className="text-[10px] text-white/40 flex items-center gap-1"><DollarSign className="w-3 h-3" /> Precio</p>
                      <p className="text-xs font-bold text-nikeOrange">S/ {productDetail.unit_price}</p>
                    </div>
                  )}
                  {productDetail.description && (
                    <div className="col-span-2 bg-white/5 rounded-xl px-3 py-2.5 border border-white/10">
                      <p className="text-[10px] text-white/40 flex items-center gap-1"><Info className="w-3 h-3" /> Descripción</p>
                      <p className="text-xs text-white/70">{productDetail.description}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Barcode */}
              {productDetail?.barcode && (
                <div className="bg-white/5 rounded-xl px-4 py-3 border border-white/10">
                  <p className="text-[10px] text-white/40 uppercase tracking-wider flex items-center gap-1 mb-2">
                    <Barcode className="w-3 h-3" /> Código de Barras
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg">
                      <BarcodeLabel value={productDetail.barcode} height={28} width={1} fontSize={7} />
                    </div>
                    <span className="text-[10px] font-mono text-white/60">{productDetail.barcode}</span>
                  </div>
                </div>
              )}

              {/* Warehouses */}
              <div>
                <p className="text-xs text-white/40 uppercase tracking-wider font-semibold mb-2">
                  Distribución por Almacén
                </p>
                <div className="space-y-2">
                  {selectedProductStock.warehouses.map((w, i) => {
                    const max = w.max_stock || 500
                    const percent = Math.min(100, (w.stock_qty / max) * 100)
                    const state = w.is_critical ? 'critical' : w.stock_qty <= w.min_stock * 1.5 ? 'low' : 'normal'
                    return (
                      <div key={i} className="bg-white/5 rounded-xl px-4 py-3 border border-white/10">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Warehouse className="w-3.5 h-3.5 text-white/40 shrink-0" />
                            <span className="text-xs font-semibold text-white/90 truncate">{w.warehouse_name}</span>
                            {w.city && <span className="text-[10px] text-white/30 shrink-0">({w.city})</span>}
                          </div>
                          {w.is_critical ? (
                            <Badge variant="danger" className="shrink-0">Crítico</Badge>
                          ) : state === 'low' ? (
                            <Badge variant="warning" className="shrink-0">Bajo</Badge>
                          ) : (
                            <Badge variant="success" className="shrink-0">Normal</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={percent} className="h-1.5" indicatorClassName={getProgressColor(state)} />
                          <span className="text-[10px] text-white/40 shrink-0 w-14 text-right">{w.stock_qty}/{max}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="bg-white/5 rounded-xl px-4 py-3 border border-white/10">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/60 text-xs">Stock Mínimo Total</span>
                  <span className="font-bold text-white/90 text-sm">{selectedProductStock.totalMinStock} uds</span>
                </div>
              </div>

              {/* Transfer button mobile */}
              {hasRole('admin', 'supervisor') && (
                <button
                  onClick={() => {
                    setPtOrigin('')
                    setPtDestination('')
                    setPtQty(5)
                    setPtError(null)
                    setPtSuccess(null)
                    setProductTransferOpen(true)
                  }}
                  className="w-full py-3 rounded-xl bg-nikeOrange hover:bg-nikeOrange/80 text-white text-sm font-bold transition-all flex items-center justify-center gap-2"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  Trasladar Stock
                </button>
              )}

              {/* Print label */}
              {productDetail && (
                <LabelPrintPanel
                  product_name={productDetail.product_name}
                  sku={productDetail.sku}
                  barcode={productDetail.barcode || undefined}
                  unit_price={productDetail.unit_price}
                  size={productDetail.size || undefined}
                  color={productDetail.color || undefined}
                  gender={productDetail.gender || undefined}
                  model={productDetail.model || undefined}
                />
              )}
            </div>
          ) : (
            /* ----- DESKTOP: Product Detail ----- */
            <div className="space-y-5">
              {/* Status + SKU bar */}
              <div className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3 border border-white/10">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-[10px] text-white/40 uppercase tracking-wider">SKU</p>
                    <p className="font-mono text-sm font-bold text-white/90">{selectedProductStock.sku}</p>
                  </div>
                  {productDetail?.status && (
                    <Badge variant={productDetail.status === 'active' ? 'success' : 'secondary'}>
                      {productDetail.status === 'active' ? 'Activo' : productDetail.status}
                    </Badge>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-white/40 uppercase tracking-wider">Stock Total</p>
                  <p className="text-2xl font-bold text-white/90">
                    {selectedProductStock.totalStock}
                    <span className="text-xs font-normal text-white/40 ml-1">uds</span>
                  </p>
                </div>
              </div>

              {/* Product Info Grid */}
              {productDetail && (
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-wider font-semibold mb-3 flex items-center gap-2">
                    <Info className="w-3.5 h-3.5" />
                    Información del Producto
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    {productDetail.model && (
                      <div className="bg-white/5 rounded-xl px-4 py-3 border border-white/10 hover:bg-white/10 transition-colors">
                        <p className="text-[10px] text-white/40 flex items-center gap-1"><Hash className="w-3 h-3" /> Modelo</p>
                        <p className="text-sm font-semibold text-white/90 mt-0.5">{productDetail.model}</p>
                      </div>
                    )}
                    {productDetail.gender && (
                      <div className="bg-white/5 rounded-xl px-4 py-3 border border-white/10 hover:bg-white/10 transition-colors">
                        <p className="text-[10px] text-white/40 flex items-center gap-1"><Tag className="w-3 h-3" /> Género</p>
                        <p className="text-sm font-semibold text-white/90 mt-0.5">{productDetail.gender}</p>
                      </div>
                    )}
                    {productDetail.size && (
                      <div className="bg-white/5 rounded-xl px-4 py-3 border border-white/10 hover:bg-white/10 transition-colors">
                        <p className="text-[10px] text-white/40 flex items-center gap-1"><Ruler className="w-3 h-3" /> Talla</p>
                        <p className="text-sm font-semibold text-white/90 mt-0.5">{productDetail.size}</p>
                      </div>
                    )}
                    {productDetail.color && (
                      <div className="bg-white/5 rounded-xl px-4 py-3 border border-white/10 hover:bg-white/10 transition-colors">
                        <p className="text-[10px] text-white/40 flex items-center gap-1"><Palette className="w-3 h-3" /> Color</p>
                        <p className="text-sm font-semibold text-white/90 mt-0.5">{productDetail.color}</p>
                      </div>
                    )}
                    {productDetail.unit_price && (
                      <div className="bg-white/5 rounded-xl px-4 py-3 border border-white/10 hover:bg-white/10 transition-colors">
                        <p className="text-[10px] text-white/40 flex items-center gap-1"><DollarSign className="w-3 h-3" /> Precio</p>
                        <p className="text-sm font-bold text-nikeOrange mt-0.5">S/ {productDetail.unit_price.toFixed(2)}</p>
                      </div>
                    )}
                    {productDetail.description && (
                      <div className="col-span-3 bg-white/5 rounded-xl px-4 py-3 border border-white/10 hover:bg-white/10 transition-colors">
                        <p className="text-[10px] text-white/40 flex items-center gap-1"><Info className="w-3 h-3" /> Descripción</p>
                        <p className="text-sm text-white/70 mt-0.5">{productDetail.description}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Barcode Section */}
              {productDetail?.barcode && (
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-wider font-semibold mb-3 flex items-center gap-2">
                    <Barcode className="w-3.5 h-3.5" />
                    Código de Barras
                  </p>
                  <div className="bg-white/5 rounded-xl px-4 py-4 border border-white/10 flex items-center gap-4">
                    <div className="p-3 bg-white rounded-xl">
                      <BarcodeLabel value={productDetail.barcode} height={40} width={1.5} fontSize={10} />
                    </div>
                    <div>
                      <p className="text-sm font-mono text-white/80">{productDetail.barcode}</p>
                      <button
                        onClick={() => {
                          const printWin = window.open('', '_blank')
                          if (printWin) {
                            printWin.document.write(`
                              <html><head><title>${productDetail.sku}</title>
                              <style>body{margin:0;display:flex;align-items:center;justify-content:center;height:100vh}</style>
                              </head><body>
                              <svg data-value="${productDetail.barcode}" height="60"></svg>
                              <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3/dist/JsBarcode.all.min.js">
                              JsBarcode(document.querySelector('svg'), '${productDetail.barcode}', {height:60,width:2,fontSize:14});
                              </script></body></html>
                            `)
                            printWin.document.close()
                            setTimeout(() => printWin.print(), 500)
                          }
                        }}
                        className="text-xs text-nikeOrange hover:text-white transition-colors font-semibold flex items-center gap-1 mt-1"
                      >
                        <Printer className="w-3 h-3" /> Imprimir código
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Warehouse Distribution */}
              <div>
                <p className="text-xs text-white/40 uppercase tracking-wider font-semibold mb-3 flex items-center gap-2">
                  <Warehouse className="w-3.5 h-3.5" />
                  Distribución por Almacén
                </p>
                <div className="space-y-3">
                  {selectedProductStock.warehouses.map((w, i) => {
                    const max = w.max_stock || 500
                    const percent = Math.min(100, (w.stock_qty / max) * 100)
                    const state = w.is_critical ? 'critical' : w.stock_qty <= w.min_stock * 1.5 ? 'low' : 'normal'
                    return (
                      <div key={i} className="bg-white/5 rounded-xl px-4 py-3 border border-white/10 hover:bg-white/10 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Warehouse className="w-4 h-4 text-white/40 shrink-0" />
                            <span className="text-sm font-semibold text-white/90 truncate">{w.warehouse_name}</span>
                            {w.city && <span className="text-xs text-white/30 shrink-0">({w.city})</span>}
                          </div>
                          {w.is_critical ? (
                            <Badge variant="danger">Crítico</Badge>
                          ) : state === 'low' ? (
                            <Badge variant="warning">Bajo</Badge>
                          ) : (
                            <Badge variant="success">Normal</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <Progress value={percent} className="h-2 flex-1" indicatorClassName={getProgressColor(state)} />
                          <span className="text-xs text-white/40 shrink-0 w-20 text-right font-mono">{w.stock_qty}/{max}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-nikeOrange/5 rounded-xl px-4 py-3 border border-nikeOrange/20">
                  <p className="text-[10px] text-white/40 uppercase tracking-wider">Stock Mínimo Total</p>
                  <p className="text-lg font-bold text-nikeOrange mt-1">{selectedProductStock.totalMinStock} uds</p>
                </div>
                <div className="bg-white/5 rounded-xl px-4 py-3 border border-white/10">
                  <p className="text-[10px] text-white/40 uppercase tracking-wider">Almacenes</p>
                  <p className="text-lg font-bold text-white/90 mt-1">{selectedProductStock.warehouses.length}</p>
                </div>
              </div>

              {/* Label Print */}
              {productDetail && (
                <div className="border-t border-white/10 pt-4">
                  <LabelPrintPanel
                    product_name={productDetail.product_name}
                    sku={productDetail.sku}
                    barcode={productDetail.barcode || undefined}
                    unit_price={productDetail.unit_price}
                    size={productDetail.size || undefined}
                    color={productDetail.color || undefined}
                    gender={productDetail.gender || undefined}
                    model={productDetail.model || undefined}
                  />
                </div>
              )}
            </div>
          )
        ) : (
          <div className="text-center py-10 text-white/40 text-sm">
            No se encontró información del producto.
          </div>
        )}
      </SlidePanel>

      {/* ============ PRODUCT TRANSFER DIALOG (from SlidePanel) ============ */}
      <Dialog open={productTransferOpen} onOpenChange={(open) => {
        setProductTransferOpen(open)
        if (!open) {
          resetPtForm()
        }
      }}>
        <DialogContent width="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              Trasladar: {selectedProductStock?.product_name || 'Producto'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleProductTransfer}>
            <div className="grid grid-cols-[2fr_3fr] gap-6">
              {/* Left column - form */}
              <div className="space-y-5">
                {/* Product context */}
                <div className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3 border border-white/10">
                  <div>
                    <p className="text-[10px] text-white/40 uppercase tracking-wider">SKU</p>
                    <p className="font-mono text-xs font-bold text-white/90">{selectedProductStock?.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-white/40 uppercase tracking-wider">Stock Total</p>
                    <p className="text-sm font-bold text-white/90">{selectedProductStock?.totalStock} uds</p>
                  </div>
                </div>

                {/* Origin warehouse - only with stock */}
                <div className="flex flex-col gap-1.5">
                  <Label>Almacen Origen</Label>
                  <Select value={ptOrigin} onValueChange={(v) => {
                    setPtOrigin(v)
                    setPtDestination('')
                    const newMax = selectedProductStock?.warehouses.find(
                      w => String(w.warehouse_id) === v
                    )?.stock_qty || 0
                    setPtQty(Math.min(5, newMax))
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona origen" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedProductStock?.warehouses
                        .filter((w) => w.stock_qty > 0)
                        .map((w) => (
                          <SelectItem key={`pt-from-${w.warehouse_id}`} value={String(w.warehouse_id)}>
                            <div className="flex items-center justify-between w-full gap-4">
                              <span>{w.warehouse_name}</span>
                              <span className="text-white/40 font-mono text-xs">{w.stock_qty} uds</span>
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Critical/low warning */}
                {ptOrigin && (() => {
                  const originWh = selectedProductStock?.warehouses.find(
                    w => String(w.warehouse_id) === ptOrigin
                  )
                  if (!originWh) return null
                  if (originWh.is_critical) {
                    return (
                      <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-red-400">Stock Critico</p>
                          <p className="text-[10px] text-white/50 mt-0.5">
                            Este almacen tiene {originWh.stock_qty} uds (minimo: {originWh.min_stock}). Puedes realizar el traslado igualmente.
                          </p>
                        </div>
                      </div>
                    )
                  }
                  if (originWh.stock_qty <= originWh.min_stock * 1.5) {
                    return (
                      <div className="flex items-start gap-2 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                        <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-yellow-400">Stock Bajo</p>
                          <p className="text-[10px] text-white/50 mt-0.5">
                            Stock por debajo del nivel optimo ({originWh.stock_qty}/{originWh.min_stock}).
                          </p>
                        </div>
                      </div>
                    )
                  }
                  return null
                })()}

                {/* Destination warehouse */}
                <div className="flex flex-col gap-1.5">
                  <Label>Almacen Destino</Label>
                  <Select value={ptDestination} onValueChange={setPtDestination}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona destino" />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouseOptions
                        .filter((w) => String(w.id) !== ptOrigin)
                        .map((w) => (
                          <SelectItem key={`pt-to-${w.id}`} value={String(w.id)}>
                            {w.name} {w.city ? `(${w.city})` : ''}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Quantity */}
                <div className="flex flex-col gap-1.5">
                  <Label>
                    Cantidad
                    {ptOrigin && (
                      <span className="text-white/40 font-normal ml-2">
                        (max: {selectedProductStock?.warehouses.find(
                          w => String(w.warehouse_id) === ptOrigin
                        )?.stock_qty || 0} uds)
                      </span>
                    )}
                  </Label>
                  <Input
                    type="number"
                    value={ptQty}
                    onChange={(e) => {
                      const maxStock = selectedProductStock?.warehouses.find(
                        w => String(w.warehouse_id) === ptOrigin
                      )?.stock_qty || 0
                      const val = parseInt(e.target.value) || 1
                      setPtQty(Math.min(val, maxStock))
                    }}
                    min={1}
                    max={selectedProductStock?.warehouses.find(
                      w => String(w.warehouse_id) === ptOrigin
                    )?.stock_qty || 0}
                  />
                </div>

                {/* Tipo de vehiculo */}
                <div className="flex flex-col gap-1.5">
                  <Label>Transporte</Label>
                  <Select value={ptVehicleType} onValueChange={setPtVehicleType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tipo de vehiculo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="truck">
                        <div className="flex items-center gap-2">
                          🚚 Camion — S/ 2.50/km
                        </div>
                      </SelectItem>
                      <SelectItem value="van">
                        <div className="flex items-center gap-2">
                          🚐 Camioneta — S/ 1.80/km
                        </div>
                      </SelectItem>
                      <SelectItem value="bike">
                        <div className="flex items-center gap-2">
                          🏍️ Moto — S/ 0.50/km
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Flow indicator */}
                {ptOrigin && ptDestination && ptOrigin !== ptDestination && (
                  <div className="flex items-center justify-center gap-3 py-2 px-4 rounded-xl bg-white/5 border border-white/5">
                    <span className="text-xs text-white/60 font-medium">
                      {warehouseOptions.find(w => String(w.id) === ptOrigin)?.city || 'Origen'}
                    </span>
                    <ArrowRight className="w-4 h-4 text-nikeOrange" />
                    <span className="text-xs text-white/60 font-medium">
                      {warehouseOptions.find(w => String(w.id) === ptDestination)?.city || 'Destino'}
                    </span>
                    <span className="text-xs text-white/40">·</span>
                    <span className="text-xs text-nikeOrange font-bold">{ptQty} unidades</span>
                  </div>
                )}

                {ptSuccess && (
                  <div className="text-xs text-green-400 font-semibold bg-green-500/10 border border-green-500/20 p-3 rounded-xl flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 shrink-0" />
                    {ptSuccess}
                  </div>
                )}
                {ptError && (
                  <div className="text-xs text-red-400 font-semibold bg-red-500/10 border border-red-500/20 p-3 rounded-xl flex items-center gap-2">
                    <X className="w-4 h-4 shrink-0" />
                    {ptError}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => { resetPtForm(); setProductTransferOpen(false); }}
                    className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-sm font-semibold transition-all"
                  >
                    Cancelar
                  </button>
                  <Button type="submit" className="flex-1 bg-nikeOrange hover:bg-nikeOrange/80 text-white" disabled={ptTransferring}>
                    {ptTransferring ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Procesando...</>
                    ) : (
                      <><ClipboardList className="w-4 h-4 mr-2" /> Confirmar Traslado</>
                    )}
                  </Button>
                </div>
              </div>

              {/* Right column - tracking preview */}
              <div className="h-full min-h-[250px]">
                {ptOrigin && ptDestination && ptOrigin !== ptDestination ? (() => {
                  return (
                    <TrackingMap
                      fromId={ptOrigin}
                      toId={ptDestination}
                      warehouses={selectedProductStock?.warehouses || []}
                      warehouseOptions={warehouseOptions}
                      transferQty={ptQty}
                      trackingId={'Vista previa'}
                      estimatedDays={0}
                      etaStr={''}
                      progressPercent={0}
                    />
                  )
                })() : (
                  <div className="h-full rounded-xl bg-white/[0.02] border border-dashed border-white/10 flex flex-col items-center justify-center text-center p-6">
                    <ArrowLeftRight className="w-8 h-8 text-white/20 mb-3" />
                    <p className="text-xs text-white/30 font-medium">Vista previa del traslado</p>
                    <p className="text-[10px] text-white/20 mt-1 max-w-[180px]">
                      Selecciona origen y destino para ver la ruta en el mapa
                    </p>
                  </div>
                )}
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Barcode Scanner overlay */}
      {showScanner && (
        <BarcodeScanner
          onScan={(code) => {
            handleBarcodeScan(code)
            setShowScanner(false)
          }}
          onClose={() => setShowScanner(false)}
        />
      )}
    </motion.div>
  )
}
