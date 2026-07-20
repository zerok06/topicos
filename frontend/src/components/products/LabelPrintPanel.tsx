import React from 'react'
import { Printer } from 'lucide-react'
import { ProductLabel } from './ProductLabel'

interface LabelPrintPanelProps {
  product_name: string
  sku: string
  barcode?: string | null
  unit_price?: number
  size?: string | null
  color?: string | null
  gender?: string | null
  model?: string | null
}

export const LabelPrintPanel: React.FC<LabelPrintPanelProps> = (props) => {
  const [copies, setCopies] = React.useState(1)

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const safeName = text(props.product_name)
    const safeSku = text(props.sku)
    const safeModel = text(props.model || '')
    const safeSize = text(props.size || '')
    const safeColor = text(props.color || '')
    const safeGender = text(props.gender || '')
    const barcode = props.barcode || ''

    printWindow.document.write(`
      <html>
        <head>
          <title>Etiquetas - ${safeName}</title>
          <style>
            @page { margin: 0; size: 80mm 50mm; }
            body { margin: 0; padding: 0; font-family: 'Courier New', monospace; }
            .label-page { display: flex; flex-wrap: wrap; }
            .label-item { 
              width: 74mm; height: 44mm; 
              border: 1px dashed #ccc; 
              padding: 3mm;
              box-sizing: border-box;
              overflow: hidden;
              page-break-inside: avoid;
              display: flex;
              flex-direction: column;
            }
            .lh { font-size: 6px; font-weight: bold; color: #888; text-transform: uppercase; letter-spacing: 1px; }
            .ln { font-size: 9px; font-weight: bold; margin: 1px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .lm { font-size: 7px; color: #666; }
            .lp { font-size: 11px; font-weight: bold; margin-top: auto; }
            .lb { margin-top: 2px; text-align: center; font-size: 10px; font-family: monospace; }
            .lb-bar { font-family: 'Libre Barcode 128', 'Code128', monospace; font-size: 28px; letter-spacing: 2px; }
            @media print {
              body { margin: 0; padding: 0; }
              .no-print { display: none; }
              @page { margin: 0; }
              .label-item { border: none; }
            }
            @media screen {
              body { padding: 5mm; }
              .no-print { margin-bottom: 5mm; text-align: center; }
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="margin-bottom:5mm;text-align:center;">
            <button onclick="window.print()" style="padding:8px 24px;font-size:14px;cursor:pointer;background:#FA5400;color:white;border:none;border-radius:8px;">Imprimir</button>
            <p style="font-size:12px;color:#666;margin-top:8px;">${copies} copia(s) · Presiona Ctrl+P o el botón para imprimir</p>
          </div>
          <div class="label-page">
            ${Array.from({ length: copies }, () => `
              <div class="label-item">
                <div class="lh">Nike Logistica</div>
                <div class="ln">${safeName}</div>
                <div class="lm">SKU: ${safeSku}${safeModel ? ' | ' + safeModel : ''}</div>
                <div class="lm">${safeGender}${safeSize ? ' | Talla: ' + safeSize : ''}${safeColor ? ' | ' + safeColor : ''}</div>
                <div class="lp">${props.unit_price ? '$' + props.unit_price.toFixed(2) : ''}</div>
                <div class="lb">${barcode}</div>
              </div>
            `).join('')}
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <label className="text-xs text-white/60">Copias:</label>
        <input
          type="number"
          min={1}
          max={100}
          value={copies}
          onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
          className="w-16 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-white text-xs text-center"
        />
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-nikeOrange hover:bg-nikeOrange/80 text-white text-xs font-semibold transition-colors"
        >
          <Printer className="w-4 h-4" />
          Imprimir Etiquetas
        </button>
      </div>
      <div className="border border-white/10 rounded-xl p-3 inline-block bg-white/5">
        <ProductLabel {...props} />
      </div>
    </div>
  )
}

function text(val: string): string {
  return val.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
