import { useEffect, useRef, useState } from 'react'

interface MermaidBlockProps {
  chart: string
}

export function MermaidBlock({ chart }: MermaidBlockProps) {
  const [svg, setSvg] = useState('')
  const [error, setError] = useState(false)
  const idRef = useRef(`mermaid-${Math.random().toString(36).slice(2, 8)}`)

  useEffect(() => {
    let cancelled = false
    setSvg('')
    setError(false)

    import('mermaid')
      .then((mermaid) => {
        mermaid.default.initialize({ theme: 'dark', startOnLoad: false })
        return mermaid.default.render(idRef.current, chart)
      })
      .then(({ svg: result }) => {
        if (!cancelled) setSvg(result)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })

    return () => { cancelled = true }
  }, [chart])

  if (error) {
    return (
      <pre className="bg-black/40 rounded-lg p-3 my-2 overflow-x-auto border border-white/5">
        <code className="text-xs leading-relaxed text-red-400">{chart}</code>
      </pre>
    )
  }

  if (!svg) {
    return (
      <div className="my-3 py-6 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-nikeOrange border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div
      className="my-3 flex justify-center [&_svg]:max-w-full [&_svg]:h-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
