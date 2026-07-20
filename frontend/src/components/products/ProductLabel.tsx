import React from 'react'
import { BarcodeLabel } from './BarcodeLabel'

interface ProductLabelProps {
  product_name: string
  sku: string
  barcode?: string | null
  unit_price?: number
  size?: string | null
  color?: string | null
  gender?: string | null
  model?: string | null
  className?: string
}

export const ProductLabel: React.FC<ProductLabelProps> = ({
  product_name,
  sku,
  barcode,
  unit_price,
  size,
  color,
  gender,
  model,
  className,
}) => {
  return (
    <div className={`bg-white text-black rounded-none p-3 ${className}`} style={{ width: '280px' }}>
      <div className="text-[8px] font-bold tracking-wider text-gray-500 uppercase mb-1">
        Nike Logística — Etiqueta de Producto
      </div>
      <div className="text-xs font-bold text-black leading-tight mb-1 truncate">
        {product_name}
      </div>
      <div className="flex items-center justify-between text-[9px] text-gray-600 mb-1">
        <span>SKU: {sku}</span>
        {model && <span>Modelo: {model}</span>}
      </div>
      <div className="flex items-center gap-2 text-[9px] text-gray-600 mb-1">
        {gender && <span>{gender}</span>}
        {size && <span>Talla: {size}</span>}
        {color && <span>Color: {color}</span>}
      </div>
      {unit_price !== undefined && (
        <div className="text-sm font-bold text-black mb-1">
          ${unit_price.toFixed(2)}
        </div>
      )}
      {barcode && (
        <div className="flex justify-center">
          <BarcodeLabel
            value={barcode}
            height={35}
            width={1.5}
            fontSize={10}
          />
        </div>
      )}
    </div>
  )
}
