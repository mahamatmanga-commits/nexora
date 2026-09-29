/** Diffuse blue halo used as ambient light behind sections. */
export default function Glow({ className = '', color = 'rgba(31,107,255,0.35)', animate = true }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute rounded-full blur-[110px] ${animate ? 'animate-drift' : ''} ${className}`}
      style={{ background: `radial-gradient(circle, ${color} 0%, transparent 70%)` }}
    />
  )
}
