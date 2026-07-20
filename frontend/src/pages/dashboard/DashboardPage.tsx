import React, { useState, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw } from 'lucide-react'
import { DashboardFilterBar } from '../../components/dashboard/DashboardFilterBar'
import { KpiGrid } from '../../components/dashboard/KpiGrid'
import { TrendChart } from '../../components/dashboard/TrendChart'
import { StockChart } from '../../components/dashboard/StockChart'
import { AlertsPanel } from '../../components/dashboard/AlertsPanel'
import { ShipmentDonut } from '../../components/dashboard/ShipmentDonut'
import { DashboardFilterProvider } from '../../context/DashboardFilterContext'
import { WarehousePerformanceTable } from '../../components/dashboard/WarehousePerformanceTable'
import { ShipmentRoutesTable } from '../../components/dashboard/ShipmentRoutesTable'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.03 },
  },
}

const sectionVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.4, 0.25, 1] },
  },
}

const DashboardContent: React.FC = () => {
  const [refreshing, setRefreshing] = useState(false)
  const [nextRefresh, setNextRefresh] = useState(30)

  const handleRefresh = useCallback(() => {
    setRefreshing(true)
    setTimeout(() => setRefreshing(false), 1500)
  }, [])

  useEffect(() => {
    const countdown = setInterval(() => {
      setNextRefresh((n) => Math.max(0, n - 1))
    }, 1000)
    return () => clearInterval(countdown)
  }, [])

  return (
    <motion.div
      variants={containerVariants}
      initial={false}
      animate="visible"
      className="space-y-5 lg:space-y-6"
    >
      {/* Cabecera compacta con filtros integrados */}
      <motion.div
        variants={sectionVariants}
        className="flex items-center justify-between border-b border-white/10 pb-4"
      >
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="w-2 h-2 rounded-full bg-nikeOrange animate-pulse shadow-[0_0_10px_#FA5400]" />
            <span className="text-[10px] font-bold tracking-widest text-nikeOrange uppercase">Centro de Inteligencia Logística</span>
          </div>
          <h1 className="text-xl lg:text-2xl font-extrabold text-white">Dashboard</h1>
        </div>
        <div className="flex items-center gap-2">
          <DashboardFilterBar refreshing={refreshing} onRefresh={handleRefresh} nextRefresh={nextRefresh} />
          <div className="flex items-center gap-1.5 text-[10px] text-white/40 font-mono">
            <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin text-nikeOrange' : ''}`} />
            {nextRefresh > 0 ? `${nextRefresh}s` : 'refrescando...'}
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all disabled:opacity-50 border border-white/10"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </motion.div>

      {/* Tarjetas KPI - Fila compacta horizontal */}
      <motion.div variants={sectionVariants} key={`kpi-${refreshing}`}>
        <KpiGrid />
      </motion.div>

      {/* Fila 1: TrendChart + ShipmentDonut en 2 columnas */}
      <motion.div
        variants={sectionVariants}
        className="grid grid-cols-1 lg:grid-cols-2 gap-5"
      >
        <TrendChart />
        <ShipmentDonut />
      </motion.div>

      {/* Fila 2: StockChart ancho completo */}
      <motion.div variants={sectionVariants}>
        <StockChart />
      </motion.div>

      {/* Fila 3: Alertas y tablas de rendimiento */}
      <motion.div
        variants={sectionVariants}
        className="grid grid-cols-1 lg:grid-cols-2 gap-5"
      >
        <AlertsPanel />
        <WarehousePerformanceTable />
      </motion.div>

      {/* Fila 4: Rutas de despacho */}
      <motion.div variants={sectionVariants}>
        <ShipmentRoutesTable />
      </motion.div>
    </motion.div>
  )
}

export const DashboardPage: React.FC = () => {
  return (
    <DashboardFilterProvider>
      <DashboardContent />
    </DashboardFilterProvider>
  )
}
