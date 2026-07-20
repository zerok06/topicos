import React from 'react'
import { Button } from '../ui/button'
import { Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { metricsService } from '../../services/metrics.service'

export const ExportButton: React.FC = () => {
  const [loading, setLoading] = React.useState(false)
  const [type, setType] = React.useState<'all' | 'inventory' | 'logistics'>('all')

  const handleExport = async () => {
    setLoading(true)
    try {
      const blob = await metricsService.exportCSV(type)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `metrics_${type}_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      toast.success('Reporte CSV descargado correctamente')
    } catch {
      toast.error('Error al exportar el reporte')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={type}
        onChange={(e) => setType(e.target.value as any)}
        className="bg-background border border-white/10 rounded-xl px-3 py-2 text-xs text-white/70 outline-none focus:border-primary"
      >
        <option value="all">Todo</option>
        <option value="inventory">Inventario</option>
        <option value="logistics">Logística</option>
      </select>
      <Button
        variant="outline"
        size="sm"
        onClick={handleExport}
        disabled={loading}
        className="gap-1.5"
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Download className="w-3.5 h-3.5" />
        )}
        <span className="text-xs">CSV</span>
      </Button>
    </div>
  )
}
