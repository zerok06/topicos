import { useEffect, useState, useRef } from 'react'

export interface WebSocketOptions {
  url: string
  onMessage?: (data: any) => void
  onFallbackTriggered?: () => void
  maxRetries?: number
}

export const useWebSocket = ({
  url,
  onMessage,
  onFallbackTriggered,
  maxRetries = 5
}: WebSocketOptions) => {
  const [fallbackToPolling, setFallbackToPolling] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const retryCountRef = useRef(0)
  const socketRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (fallbackToPolling) {
      onFallbackTriggered?.()
      return
    }

    const connect = () => {
      console.log(`Intentando conectar a WebSocket: ${url} (Intento ${retryCountRef.current + 1})`)
      const ws = new WebSocket(url)
      socketRef.current = ws

      ws.onopen = () => {
        console.log("Conectado a WebSocket de Nike Logística.")
        setIsConnected(true)
        retryCountRef.current = 0
      }

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data)
          onMessage?.(parsed)
        } catch (err) {
          onMessage?.(event.data)
        }
      }

      ws.onclose = (event) => {
        setIsConnected(false)
        console.log(`Conexión de WebSocket cerrada: ${event.reason || 'Sin motivo'}`)
        
        if (retryCountRef.current < maxRetries) {
          const delay = Math.pow(2, retryCountRef.current) * 1000 // Backoff exponencial
          retryCountRef.current += 1
          console.log(`Reconectando en ${delay / 1000}s...`)
          setTimeout(connect, delay)
        } else {
          console.warn("WebSocket falló tras 5 intentos. Conmutando automáticamente a HTTP Polling...")
          setFallbackToPolling(true)
        }
      }

      ws.onerror = (error) => {
        console.error("Error en WebSocket:", error)
      }
    }

    connect()

    return () => {
      if (socketRef.current) {
        socketRef.current.close()
      }
    }
  }, [url, fallbackToPolling, maxRetries])

  return { isConnected, fallbackToPolling }
}
