import React, { useEffect, useState, useMemo } from 'react'
import {
  ClipboardList,
  ShieldAlert,
  RefreshCw,
  Search,
  Calendar,
  Filter,
  Activity,
  Clock,
  ChevronDown,
  ChevronUp,
  Download,
  Copy,
  CheckCircle2,
  XCircle,
  ArrowLeftRight,
  LogIn,
  LogOut,
  Plus,
  Eye,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { Card } from '../../components/ui/card'
import { Loader } from '../../components/ui/Loader'
import { Badge } from '../../components/ui/badge'
import { Input } from '../../components/ui/input'
import { MetricCard } from '../../components/metrics/MetricCard'
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from '../../components/ui/tabs'
import { useAuthStore } from '../../store/useAuthStore'
import { inventoryService } from '../../services/inventory.service'
import type { AuditLog, AuditSummary } from '../../types/inventory'
import { toast } from 'sonner'

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

const ACTION_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  TRASLADO_CONFIRMADO: { label: 'Traslado', color: 'text-orange-400 bg-orange-500/10 border-orange-500/20', icon: <ArrowLeftRight className="w-3 h-3" /> },
  LOGIN: { label: 'Login', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', icon: <LogIn className="w-3 h-3" /> },
  LOGOUT: { label: 'Logout', color: 'text-slate-400 bg-slate-500/10 border-slate-500/20', icon: <LogOut className="w-3 h-3" /> },
  CREATE: { label: 'Creación', color: 'text-green-400 bg-green-500/10 border-green-500/20', icon: <Plus className="w-3 h-3" /> },
  UPDATE: { label: 'Actualización', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20', icon: <Eye className="w-3 h-3" /> },
  DELETE: { label: 'Eliminación', color: 'text-red-400 bg-red-500/10 border-red-500/20', icon: <XCircle className="w-3 h-3" /> },
}

const getActionConfig = (action: string) => {
  return ACTION_CONFIG[action] || { label: action, color: 'text-white/60 bg-white/5 border-white/10', icon: <Activity className="w-3 h-3" /> }
}

export const AuditPage: React.FC = () => {
  const { hasRole } = useAuthStore()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [summary, setSummary] = useState<AuditSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const limit = 20

  const fetchLogs = async (p?: number) => {
    setLoading(true)
    setError(null)
    try {
      const currentPage = p ?? page
      const params: any = { page: currentPage, limit }
      if (actionFilter !== 'all') params.action = actionFilter
      if (dateFrom) params.date_from = dateFrom
      if (dateTo) params.date_to = dateTo
      const data = await inventoryService.getAuditLogs(params)
      setLogs(data.logs)
      setTotal(data.total)
      setTotalPages(data.pages)
      setPage(data.page)
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError('Acceso denegado: No tienes permisos suficientes.')
      } else {
        setError('Error al obtener el historial de auditoría.')
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchSummary = async () => {
    try {
      const data = await inventoryService.getAuditSummary()
      setSummary(data)
    } catch {
    }
  }

  useEffect(() => {
    if (hasRole('admin', 'supervisor')) {
      fetchLogs()
      fetchSummary()
    }
  }, [])

  useEffect(() => {
    if (hasRole('admin', 'supervisor')) {
      fetchLogs(1)
    }
  }, [actionFilter, dateFrom, dateTo])

  if (!hasRole('admin', 'supervisor')) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-3xl p-6 flex flex-col items-center justify-center text-center gap-3">
        <ShieldAlert className="w-12 h-12 text-red-500" />
        <h3 className="text-lg font-bold text-red-400">Acceso Restringido</h3>
        <p className="text-sm text-white/50 max-w-md">
          El panel de auditoría inmutable solo está disponible para Administradores y Supervisores.
        </p>
      </div>
    )
  }

  const handleCopyDetails = (details: Record<string, unknown>, id: number) => {
    navigator.clipboard.writeText(JSON.stringify(details, null, 2))
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
    toast.success('Detalles copiados al portapapeles')
  }

  const handleExportCSV = () => {
    const headers = ['ID', 'Acción', 'Usuario', 'Detalles', 'Fecha']
    const rows = logs.map((log) => [
      log.audit_id,
      log.action,
      log.user_email || 'Sistema',
      JSON.stringify(log.details),
      new Date(log.created_at).toISOString(),
    ])
    const csv = [headers.join(','), ...rows.map((r) => r.map((v) => `"${v}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV exportado')
  }

  const statCards = [
    { label: 'Total Registros', value: summary?.total ?? 0, icon: <ClipboardList className="w-4 h-4" />, color: 'text-white', iconBg: 'bg-nikeOrange/10 border border-nikeOrange/20 text-nikeOrange' },
    { label: 'Acciones Hoy', value: summary?.today_count ?? 0, icon: <Activity className="w-4 h-4" />, color: 'text-blue-400', iconBg: 'bg-blue-500/10 border border-blue-500/20 text-blue-400' },
    { label: 'Tipos de Acción', value: summary?.action_types?.length ?? 0, icon: <Filter className="w-4 h-4" />, color: 'text-green-400', iconBg: 'bg-green-500/10 border border-green-500/20 text-green-400' },
    { label: 'Última Actividad', value: summary?.last_activity ? new Date(summary.last_activity).toLocaleDateString() : '-', icon: <Clock className="w-4 h-4" />, color: 'text-cyan-400', iconBg: 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400' },
  ]

  const uniqueActions = useMemo(() => {
    return summary?.action_types ?? []
  }, [summary])

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-4 lg:space-y-5"
    >
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

      <motion.div variants={sectionVariants}>
        <Card
          title="Registro de Auditoría Inmutable"
          icon={<ClipboardList className="w-5 h-5 text-nikeOrange" />}
          action={
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCSV}
                disabled={logs.length === 0}
                className="text-xs text-white/40 hover:text-nikeOrange transition-colors uppercase font-bold tracking-wider flex items-center gap-1 disabled:opacity-30"
              >
                <Download className="w-3 h-3" /> CSV
              </button>
              <button
                onClick={() => fetchLogs()}
                className="text-xs text-nikeOrange hover:text-white transition-colors uppercase font-bold tracking-wider flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Refrescar
              </button>
            </div>
          }
        >
          <div className="mb-4 space-y-3">
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por acción o email..."
              icon={<Search className="w-4 h-4" />}
            />

            <div className="flex flex-wrap items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-white/30 shrink-0" />
              <Tabs value={actionFilter} onValueChange={(v) => setActionFilter(v)}>
                <TabsList className="h-9">
                  <TabsTrigger value="all" className="text-xs">
                    Todas
                  </TabsTrigger>
                  {uniqueActions.map((act) => (
                    <TabsTrigger key={act} value={act} className="text-xs">
                      {ACTION_CONFIG[act]?.label || act}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-white/30 shrink-0" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-nikeOrange/50"
              />
              <span className="text-xs text-white/30">a</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-nikeOrange/50"
              />
              {(dateFrom || dateTo) && (
                <button
                  onClick={() => { setDateFrom(''); setDateTo('') }}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>

          {error ? (
            <div className="text-center py-6 text-red-400 text-sm">{error}</div>
          ) : loading ? (
            <Loader label="Cargando logs de auditoría..." />
          ) : logs.length === 0 ? (
            <div className="text-center py-10 text-white/30 text-sm">
              No se han registrado movimientos.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-white/5 text-white/40 text-xs uppercase tracking-wider">
                      <th className="py-3 px-2 w-8"></th>
                      <th className="py-3 px-2">Acción</th>
                      <th className="py-3 px-2">Usuario</th>
                      <th className="py-3 px-2 hidden sm:table-cell">Detalles</th>
                      <th className="py-3 px-2 text-right">Fecha/Hora</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs
                      .filter(
                        (log) =>
                          log.action.toLowerCase().includes(search.toLowerCase()) ||
                          (log.user_email || '').toLowerCase().includes(search.toLowerCase()),
                      )
                      .map((log) => {
                        const config = getActionConfig(log.action)
                        const isExpanded = expandedId === log.audit_id
                        return (
                          <React.Fragment key={log.audit_id}>
                            <motion.tr
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3 }}
                              className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                              onClick={() => setExpandedId(isExpanded ? null : log.audit_id)}
                            >
                              <td className="py-3 px-2">
                                {isExpanded ? (
                                  <ChevronUp className="w-3.5 h-3.5 text-white/40" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5 text-white/20" />
                                )}
                              </td>
                              <td className="py-3 px-2">
                                <Badge variant="secondary" className={config.color}>
                                  {config.icon}
                                  {config.label}
                                </Badge>
                              </td>
                              <td className="py-3 px-2 text-white/80 font-medium text-xs">
                                {log.user_email || 'Sistema'}
                              </td>
                              <td className="py-3 px-2 text-xs text-white/50 max-w-xs truncate hidden sm:table-cell">
                                {Object.entries(log.details).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(', ')}
                              </td>
                              <td className="py-3 px-2 text-right text-xs text-white/40 font-mono">
                                {new Date(log.created_at).toLocaleString()}
                              </td>
                            </motion.tr>
                            {isExpanded && (
                              <motion.tr
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                              >
                                <td colSpan={5} className="px-2 pb-3">
                                  <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3 ml-6">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-xs text-white/40 uppercase tracking-wider font-semibold">Detalles completos</span>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleCopyDetails(log.details, log.audit_id) }}
                                        className="text-xs text-nikeOrange hover:text-white transition-colors flex items-center gap-1"
                                      >
                                        {copiedId === log.audit_id ? (
                                          <><CheckCircle2 className="w-3 h-3" /> Copiado</>
                                        ) : (
                                          <><Copy className="w-3 h-3" /> Copiar</>
                                        )}
                                      </button>
                                    </div>
                                    <pre className="text-xs text-white/60 font-mono whitespace-pre-wrap bg-black/20 rounded-lg p-3 max-h-48 overflow-y-auto">
                                      {JSON.stringify(log.details, null, 2)}
                                    </pre>
                                  </div>
                                </td>
                              </motion.tr>
                            )}
                          </React.Fragment>
                        )
                      })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-4">
                <span className="text-xs text-white/40">
                  Página {page} de {totalPages} ({total} registros)
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => fetchLogs(page - 1)}
                    disabled={page <= 1}
                    className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white/70 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    Anterior
                  </button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    const start = Math.max(1, page - 2)
                    const p = start + i
                    if (p > totalPages) return null
                    return (
                      <button
                        key={p}
                        onClick={() => fetchLogs(p)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                          p === page
                            ? 'bg-nikeOrange text-white'
                            : 'bg-white/5 border border-white/10 text-white/70 hover:text-white'
                        }`}
                      >
                        {p}
                      </button>
                    )
                  })}
                  <button
                    onClick={() => fetchLogs(page + 1)}
                    disabled={page >= totalPages}
                    className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white/70 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            </>
          )}
        </Card>
      </motion.div>
    </motion.div>
  )
}
