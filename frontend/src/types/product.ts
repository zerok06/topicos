export interface ProductDetail {
  product_id: number
  sku: string
  barcode: string | null
  product_name: string
  model: string | null
  gender: string | null
  size: string | null
  color: string | null
  unit_price: number
  description: string | null
  category_id: number | null
  category_name: string | null
  status: string
  created_at: string
  stock_by_warehouse: ProductStockByWarehouse[]
}

export interface ProductStockByWarehouse {
  warehouse_id: number
  warehouse_name: string
  city: string | null
  stock_qty: number
  min_stock: number
  is_critical: boolean
}

export interface WarehouseDistribution {
  warehouse_id: number
  stock_qty: number
}

export interface ProductListItem {
  product_id: number
  sku: string
  barcode: string | null
  product_name: string
  unit_price: number
  total_stock: number
  warehouse_count: number
  status: string
}
