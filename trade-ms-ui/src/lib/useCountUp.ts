import { useEffect, useRef, useState } from 'react'

/**
 * Плавно «докручивает» число до target: при первом показе — от нуля, при смене
 * target — от текущего значения (смена периода не сбрасывает счётчик в ноль).
 * Кривая easeOutQuart: быстро стартует и мягко останавливается.
 * При prefers-reduced-motion значение выставляется сразу.
 */
export function useCountUp(target: number, duration = 1200): number {
  const [value, setValue] = useState(0)
  const current = useRef(0)

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const ms = reduce ? 0 : duration
    const from = current.current
    const start = performance.now()
    let raf = 0

    const tick = (now: number) => {
      const p = ms === 0 ? 1 : Math.min(1, (now - start) / ms)
      const eased = 1 - Math.pow(1 - p, 4)
      current.current = from + (target - from) * eased
      setValue(current.current)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])

  return value
}
