import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'
import { MessageSquare, Send, ScanLine, Copy, Check, ChevronDown, User, Bot } from 'lucide-react'
import { Card } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { inventoryService } from '../../services/inventory.service'
import { useIsMobile } from '../../hooks/useIsMobile'
import { BarcodeScanner } from '../../components/BarcodeScanner'
import { useSidebarStore } from '../../store/useSidebarStore'
import { MermaidBlock } from '../../components/MermaidBlock'
import type { ChatMessage } from '../../types/inventory'

const QUICK_QUESTIONS = [
  '¿Qué productos tienen stock crítico?',
  '¿Cuántos pares de Air Jordan hay en Lima?',
  '¿Qué almacén tiene más inventario?',
  '¿Puedo ver el stock de Pegasus?',
]

function getDateLabel(date: Date): string {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.round((today.getTime() - msgDate.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Hoy'
  if (diffDays === 1) return 'Ayer'
  return date.toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })
}

const markdownComponents: Components = {
  p: ({ children }) => <p className="text-sm leading-relaxed text-white/90 my-1.5">{children}</p>,
  strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
  em: ({ children }) => <em className="italic text-white/80">{children}</em>,
  code: ({ children, className }) => {
    const lang = className?.replace('language-', '') || ''
    if (lang === 'mermaid') {
      return <MermaidBlock chart={String(children).replace(/\n$/, '')} />
    }
    const isInline = !className
    return isInline ? (
      <code className="bg-white/10 px-1.5 py-0.5 rounded text-[11px] font-mono text-white/80">{children}</code>
    ) : (
      <code className="text-xs leading-relaxed text-white/80">{children}</code>
    )
  },
  pre: ({ children }) => <pre className="bg-black/40 rounded-lg p-3 my-2 overflow-x-auto border border-white/5">{children}</pre>,
  ul: ({ children }) => <ul className="list-disc ml-5 space-y-1 my-2 text-white/80">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal ml-5 space-y-1 my-2 text-white/80">{children}</ol>,
  li: ({ children }) => <li className="text-white/80 text-sm">{children}</li>,
  table: ({ children }) => (
    <div className="overflow-x-auto my-2">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="border border-white/10 px-3 py-2 text-xs font-bold text-white/70 bg-white/5 text-left">{children}</th>,
  td: ({ children }) => <td className="border border-white/10 px-3 py-2 text-xs text-white/80">{children}</td>,
  h1: ({ children }) => <h1 className="text-base font-bold text-white mt-4 mb-2">{children}</h1>,
  h2: ({ children }) => <h2 className="text-sm font-bold text-white mt-3 mb-1.5">{children}</h2>,
  h3: ({ children }) => <h3 className="text-xs font-bold text-white mt-2 mb-1">{children}</h3>,
  hr: () => <hr className="border-white/10 my-3" />,
  a: ({ children, href }) => <a href={href} className="text-nikeOrange hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>,
}

const messageVariants = {
  initial: { opacity: 0, y: 12, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 px-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.8s' }}
        />
      ))}
    </div>
  )
}

export const ChatbotPage: React.FC = () => {
  const isMobile = useIsMobile()
  const setCollapsed = useSidebarStore((s) => s.setCollapsed)
  const [chatMessage, setChatMessage] = useState('')
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      sender: 'bot',
      text: '¡Hola! Soy tu Asistente Logístico de Nike. ¿En qué puedo ayudarte hoy con el inventario o despachos?',
      timestamp: new Date(),
    },
  ])
  const [loadingChat, setLoadingChat] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [typingState, setTypingState] = useState<{ chatIndex: number; fullText: string; displayed: string; done: boolean } | null>(null)
  const typingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) clearInterval(typingTimerRef.current)
    }
  }, [])

  const startTyping = useCallback((chatIndex: number, fullText: string) => {
    if (typingTimerRef.current) clearInterval(typingTimerRef.current)
    setTypingState({ chatIndex, fullText, displayed: '', done: false })
    let displayed = ''
    typingTimerRef.current = setInterval(() => {
      const remaining = fullText.length - displayed.length
      const chars = remaining > 6 ? 3 : remaining
      displayed = fullText.slice(0, displayed.length + chars)
      if (displayed.length >= fullText.length) {
        if (typingTimerRef.current) clearInterval(typingTimerRef.current)
        typingTimerRef.current = null
        setTypingState({ chatIndex, fullText, displayed, done: true })
      } else {
        setTypingState({ chatIndex, fullText, displayed, done: false })
      }
    }, 18)
  }, [])

  const getMessageText = useCallback((msg: ChatMessage, index: number): string => {
    if (msg.sender === 'bot' && typingState && typingState.chatIndex === index && !typingState.done) {
      return typingState.displayed
    }
    return msg.text
  }, [typingState])

  useEffect(() => {
    setCollapsed(true)
    return () => setCollapsed(false)
  }, [setCollapsed])

  const scrollToBottom = useCallback((force = false) => {
    if (force) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      return
    }
    const container = messagesContainerRef.current
    if (!container) return
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100
    if (isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [chatHistory, loadingChat, scrollToBottom])

  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current
    if (!container) return
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100
    setShowScrollButton(!isNearBottom && chatHistory.length > 2)
  }, [chatHistory.length])

  const dateGroups = useMemo(() => {
    const groups: { label: string; messages: ChatMessage[] }[] = []
    let currentLabel = ''
    for (const msg of chatHistory) {
      const label = getDateLabel(msg.timestamp)
      if (label !== currentLabel) {
        groups.push({ label, messages: [msg] })
        currentLabel = label
      } else {
        groups[groups.length - 1].messages.push(msg)
      }
    }
    return groups
  }, [chatHistory])

  const sendQuestion = async (question: string) => {
    if (typingTimerRef.current) clearInterval(typingTimerRef.current)
    setTypingState(null)
    setChatHistory((prev) => [
      ...prev,
      { sender: 'user', text: question, timestamp: new Date() },
    ])
    setLoadingChat(true)

    try {
      const result = await inventoryService.sendChatMessage(question)
      const botIndex = chatHistory.length + 1
      setChatHistory((prev) => [
        ...prev,
        { sender: 'bot', text: result.response, timestamp: new Date() },
      ])
      startTyping(botIndex, result.response)
    } catch {
      setChatHistory((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: 'Lo siento, ocurrió un error al consultar el chatbot de Nike.',
          timestamp: new Date(),
        },
      ])
    } finally {
      setLoadingChat(false)
    }
  }

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatMessage.trim()) return
    const userMsg = chatMessage
    setChatMessage('')
    await sendQuestion(userMsg)
  }

  const handleQuickQuestion = (question: string) => {
    setChatMessage(question)
  }

  const handleBarcodeScan = async (decodedText: string) => {
    setShowScanner(false)
    const question = `Buscar producto con código: ${decodedText}`
    await sendQuestion(question)
  }

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIndex(index)
      setTimeout(() => setCopiedIndex(null), 2000)
    } catch {}
  }

  const isInitial = chatHistory.length === 1

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {showScanner && (
        <BarcodeScanner
          onScan={handleBarcodeScan}
          onClose={() => setShowScanner(false)}
        />
      )}

      <div className="flex-1 overflow-hidden">
        <Card className="h-full flex flex-col overflow-hidden p-0">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 border-b border-white/5 px-4 sm:px-6 py-3 sm:py-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-nikeOrange/10 border border-nikeOrange/20">
                <MessageSquare className="w-5 h-5 text-nikeOrange" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold tracking-tight text-white/90">
                  Asistente Logístico RAG
                </h2>
                <p className="text-[10px] sm:text-xs text-white/40 hidden sm:block">
                  Powered by pgvector & Groq
                </p>
              </div>
            </div>
            {isMobile && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowScanner(true)}
                className="shrink-0 gap-1.5"
              >
                <ScanLine className="w-4 h-4" />
                <span className="text-xs hidden sm:inline">Escanear</span>
              </Button>
            )}
          </div>

          {/* Messages */}
          <div
            ref={messagesContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-1 min-h-0 scrollbar-thin"
          >
            <AnimatePresence mode="popLayout">
              {dateGroups.map((group) => (
                <div key={group.label}>
                  {/* Date separator */}
                  <div className="flex items-center gap-3 py-3">
                    <div className="flex-1 h-px bg-white/5" />
                    <span className="text-[10px] font-semibold text-white/20 uppercase tracking-wider">
                      {group.label}
                    </span>
                    <div className="flex-1 h-px bg-white/5" />
                  </div>

                  {/* Messages */}
                  {group.messages.map((msg) => {
                    const globalIdx = chatHistory.indexOf(msg)
                    return (
                      <motion.div
                        key={`${group.label}-${globalIdx}`}
                        variants={messageVariants}
                        initial="initial"
                        animate="animate"
                        layout
                        className={`flex gap-2.5 mb-3 group ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        {/* Bot avatar */}
                        {msg.sender === 'bot' && (
                          <div className="w-8 h-8 rounded-xl bg-nikeOrange/10 border border-nikeOrange/20 flex items-center justify-center shrink-0 mt-1">
                            <Bot className="w-4 h-4 text-nikeOrange" />
                          </div>
                        )}

                        {/* Message bubble */}
                        <div className="max-w-[88%] sm:max-w-[75%]">
                          <div
                            className={`relative rounded-2xl p-3 text-sm leading-relaxed ${
                              msg.sender === 'user'
                                ? 'bg-nikeOrange text-white rounded-tr-none'
                                : 'bg-white/5 border border-white/5 text-white/90 rounded-tl-none'
                            }`}
                          >
                            {msg.sender === 'bot' ? (
                              <div className="prose prose-invert max-w-none text-sm leading-relaxed min-w-0">
                                {typingState && typingState.chatIndex === globalIdx && !typingState.done ? (
                                  <p className="whitespace-pre-line break-words m-0">{getMessageText(msg, globalIdx)}</p>
                                ) : (
                                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                                    {msg.text}
                                  </ReactMarkdown>
                                )}
                              </div>
                            ) : (
                              <p className="whitespace-pre-line break-words">{msg.text}</p>
                            )}
                            {typingState && typingState.chatIndex === globalIdx && !typingState.done && (
                              <span className="inline-block w-[2px] h-4 bg-nikeOrange ml-0.5 animate-pulse align-text-bottom" />
                            )}
                            <span className="text-[10px] text-white/30 block text-right mt-1.5">
                              {msg.timestamp.toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>

                          {/* Copy button on hover */}
                          {msg.sender === 'bot' && (
                            <div className="flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 px-1">
                              <button
                                onClick={() => copyToClipboard(msg.text, globalIdx)}
                                className="text-white/30 hover:text-white/60 transition-colors"
                                title="Copiar mensaje"
                              >
                                {copiedIndex === globalIdx ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          )}
                        </div>

                        {/* User avatar */}
                        {msg.sender === 'user' && (
                          <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 mt-1">
                            <User className="w-4 h-4 text-white/50" />
                          </div>
                        )}
                      </motion.div>
                    )
                  })}
                </div>
              ))}
            </AnimatePresence>

            {/* Typing indicator */}
            {loadingChat && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-2.5 mb-3"
              >
                <div className="w-8 h-8 rounded-xl bg-nikeOrange/10 border border-nikeOrange/20 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-nikeOrange" />
                </div>
                <div className="bg-white/5 border border-white/5 rounded-2xl rounded-tl-none p-3 flex items-center gap-2.5">
                  <TypingDots />
                  <span className="text-[11px] text-white/30 font-medium">Consultando base de conocimiento...</span>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Scroll to bottom button */}
          <AnimatePresence>
            {showScrollButton && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10"
              >
                <button
                  onClick={() => scrollToBottom(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/10 backdrop-blur-md text-xs text-white/60 hover:text-white hover:bg-white/15 transition-all shadow-lg"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                  Nuevos mensajes
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Quick questions chips (only when initial) */}
          {isInitial && !loadingChat && (
            <div className="px-4 sm:px-6 pb-2 shrink-0">
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {QUICK_QUESTIONS.map((q, i) => (
                  <motion.button
                    key={q}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.08, duration: 0.3 }}
                    onClick={() => handleQuickQuestion(q)}
                    className="shrink-0 text-left px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all text-xs text-white/60 hover:text-white whitespace-nowrap"
                  >
                    {q}
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <form onSubmit={handleSendChat} className="flex gap-2 p-3 sm:p-4 border-t border-white/5 shrink-0 bg-black/20">
            <div className="flex-1 flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 focus-within:border-nikeOrange/50 transition-colors">
              <input
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="Pregunta sobre stock, almacenes, productos..."
                className="flex-1 bg-transparent py-2.5 sm:py-3 text-sm text-white placeholder-white/30 outline-none min-w-0"
              />
              {!isMobile && (
                <button
                  type="button"
                  onClick={() => setShowScanner(true)}
                  className="text-white/30 hover:text-nikeOrange transition-colors shrink-0"
                  title="Escanear código de barras"
                >
                  <ScanLine className="w-4 h-4" />
                </button>
              )}
            </div>
            <Button
              type="submit"
              disabled={loadingChat || !chatMessage.trim()}
              className="rounded-2xl px-4 shrink-0"
              size="icon"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
