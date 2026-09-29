import { useInView } from '../../hooks/useInView'

export default function Progress({ value, delay = 0, className = '' }) {
  const [ref, inView] = useInView({ threshold: 0.5 })
  return (
    <div ref={ref} className={`h-1.5 overflow-hidden rounded-full bg-white/[0.06] ${className}`}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-nova-600 via-nova-400 to-nova-200 shadow-[0_0_12px_rgba(71,166,255,0.6)] transition-[width] duration-[1400ms] ease-[cubic-bezier(0.2,0.8,0.2,1)]"
        style={{ width: inView ? `${value}%` : '0%', transitionDelay: `${delay}ms` }}
      />
    </div>
  )
}
