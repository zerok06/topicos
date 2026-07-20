import React, { useEffect, useRef, useState } from 'react'
import { useMotionValue, useSpring, useMotionValueEvent } from 'framer-motion'

interface AnimatedCounterProps {
  value: number
  decimals?: number
  prefix?: string
  suffix?: string
  format?: boolean
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  decimals = 0,
  prefix = '',
  suffix = '',
  format = true,
}) => {
  const motionValue = useMotionValue(0)
  const spring = useSpring(motionValue, { damping: 50, stiffness: 400 })
  const [displayValue, setDisplayValue] = useState('0')

  useMotionValueEvent(spring, 'change', (v) => {
    if (format) {
      setDisplayValue(prefix + Number(v.toFixed(decimals)).toLocaleString() + suffix)
    } else {
      setDisplayValue(prefix + v.toFixed(decimals) + suffix)
    }
  })

  const hasSetInitial = useRef(false)
  useEffect(() => {
    if (value !== 0 || !hasSetInitial.current) {
      motionValue.set(value)
    }
    if (!hasSetInitial.current) {
      hasSetInitial.current = true
    }
  }, [value, motionValue])

  return <>{displayValue}</>
}
