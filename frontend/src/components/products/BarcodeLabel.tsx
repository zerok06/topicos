import React, { useEffect, useRef } from 'react'
import JsBarcode from 'jsbarcode'

interface BarcodeLabelProps {
  value: string
  format?: string
  width?: number
  height?: number
  fontSize?: number
  displayValue?: boolean
  className?: string
}

export const BarcodeLabel: React.FC<BarcodeLabelProps> = ({
  value,
  format = 'CODE128',
  width = 2,
  height = 60,
  fontSize = 14,
  displayValue = true,
  className,
}) => {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format,
          width,
          height,
          fontSize,
          displayValue,
          background: '#ffffff',
          lineColor: '#000000',
          margin: 5,
          valid: () => true,
        })
      } catch {
        // silently fail
      }
    }
  }, [value, format, width, height, fontSize, displayValue])

  if (!value) return null

  return (
    <svg
      ref={svgRef}
      className={className}
      style={{ maxWidth: '100%', height: 'auto' }}
    />
  )
}
