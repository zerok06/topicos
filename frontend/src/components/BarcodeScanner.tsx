import React, { useRef, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode'
import { X, ScanLine, AlertCircle, CheckCircle2, Camera, Zap } from 'lucide-react'
import { Button } from './ui/button'

interface BarcodeScannerProps {
  onScan: (decodedText: string) => void
  onClose: () => void
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose }) => {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [scanned, setScanned] = useState<string | null>(null)
  const [isStarting, setIsStarting] = useState(true)

  useEffect(() => {
    let mounted = true
    let scannerContainer: HTMLDivElement | null = null

    const stopScanner = async () => {
      const scanner = scannerRef.current
      if (scanner) {
        try {
          const state = scanner.getState()
          if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
            await scanner.stop()
          }
          scanner.clear()
        } catch {
          // ignore
        }
        scannerRef.current = null
      }
      if (scannerContainer && scannerContainer.parentNode) {
        scannerContainer.parentNode.removeChild(scannerContainer)
        scannerContainer = null
      }
    }

    const startScanner = async () => {
      try {
        const cameras = await Html5Qrcode.getCameras()
        if (!cameras || cameras.length === 0) {
          if (mounted) {
            setError('No se encontro ninguna camara en este dispositivo.')
            setIsStarting(false)
          }
          return
        }

        const backCamera = cameras.find(c => /back|rear|environment/i.test(c.label)) || cameras[cameras.length - 1]

        scannerContainer = document.createElement('div')
        scannerContainer.id = 'barcode-scanner-container'
        scannerContainer.style.width = '100%'
        scannerContainer.style.height = '100%'
        if (wrapperRef.current) {
          wrapperRef.current.appendChild(scannerContainer)
        }

        const scanner = new Html5Qrcode(scannerContainer.id, { verbose: false })
        scannerRef.current = scanner

        await scanner.start(
          backCamera.id,
          {
            fps: 10,
            qrbox: { width: 220, height: 140 },
            aspectRatio: 1.0,
          },
          (decodedText: string) => {
            if (!mounted) return
            setScanned(decodedText)
            stopScanner()
            setTimeout(() => {
              if (mounted) onScan(decodedText)
            }, 800)
          },
          () => {}
        )

        if (mounted) setIsStarting(false)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        if (mounted) {
          setError(`No se pudo acceder a la camara: ${msg}`)
          setIsStarting(false)
        }
      }
    }

    startScanner()

    return () => {
      mounted = false
      stopScanner()
    }
  }, [onScan])

  const handleClose = () => {
    const scanner = scannerRef.current
    if (scanner) {
      try {
        const state = scanner.getState()
        if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
          scanner.stop().catch(() => {})
        }
        scanner.clear()
      } catch {
        // ignore
      }
      scannerRef.current = null
    }
    onClose()
  }

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        handleClose()
      }
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  }, [])

  return createPortal(
    <div className="fixed inset-0 z-[60] bg-black flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between p-4 pt-6 shrink-0 z-10">
        <div className="flex items-center gap-2">
          <ScanLine className="w-5 h-5 text-nikeOrange" />
          <h3 className="text-sm font-semibold text-white/90">Escanear Código</h3>
        </div>
        <button
          onClick={handleClose}
          className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
        >
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Camera area - centered */}
      <div className="flex-1 flex items-center justify-center relative min-h-0">
        {/* Scanner wrapper - centered with fixed aspect area */}
        <div className="relative w-full max-w-sm aspect-[3/4] mx-auto rounded-2xl overflow-hidden bg-zinc-950">
          <div ref={wrapperRef} className="absolute inset-0 w-full h-full" />

          {/* Loading overlay */}
          {isStarting && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10 pointer-events-none bg-black">
              <Camera className="w-10 h-10 text-white/40 animate-pulse" />
              <p className="text-xs text-white/40">Activando cámara...</p>
            </div>
          )}

          {/* Scan frame overlay */}
          {!isStarting && !error && !scanned && (
            <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
              <div className="relative w-[70%] h-[35%]">
                {/* Corner brackets */}
                <div className="absolute -top-1 -left-1 w-8 h-8 border-t-2 border-l-2 border-nikeOrange rounded-tl-lg" />
                <div className="absolute -top-1 -right-1 w-8 h-8 border-t-2 border-r-2 border-nikeOrange rounded-tr-lg" />
                <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-2 border-l-2 border-nikeOrange rounded-bl-lg" />
                <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-2 border-r-2 border-nikeOrange rounded-br-lg" />
                {/* Animated scan line */}
                <div className="absolute left-0 right-0 h-0.5 bg-nikeOrange/80 shadow-[0_0_8px_rgba(251,130,30,0.8)] animate-scan-line" />
              </div>
            </div>
          )}

          {/* Success overlay */}
          {scanned && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-20 bg-black/80">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-400" />
              </div>
              <p className="text-sm text-green-300 font-medium">Código leído</p>
              <p className="text-lg text-white font-mono">{scanned}</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom area */}
      <div className="shrink-0 p-6 pb-8 flex flex-col items-center gap-4 z-10">
        {error ? (
          <>
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 max-w-sm w-full">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-xs text-red-300">{error}</p>
            </div>
            <Button onClick={handleClose} className="w-full max-w-sm">
              Cerrar
            </Button>
          </>
        ) : (
          <p className="text-sm text-white/50 text-center flex items-center gap-2">
            <Zap className="w-4 h-4 text-nikeOrange" />
            Apunta la cámara al código de barras del producto
          </p>
        )}
      </div>
    </div>,
    document.body
  )
}
