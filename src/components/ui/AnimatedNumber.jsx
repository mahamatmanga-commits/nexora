import { useInView } from '../../hooks/useInView'
import { useCountUp } from '../../hooks/useCountUp'

const formatters = {}
function format(value, decimals) {
  const key = decimals
  formatters[key] ??= new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  return formatters[key].format(value)
}

/** Counts up to `value` when it scrolls into view. */
export default function AnimatedNumber({ value, decimals = 0, prefix = '', suffix = '', duration, className = '' }) {
  const [ref, inView] = useInView({ threshold: 0.4 })
  const current = useCountUp(value, { start: inView, duration })
  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {prefix}
      {format(current, decimals)}
      {suffix}
    </span>
  )
}
