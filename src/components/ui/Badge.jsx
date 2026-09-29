export default function Badge({ children, className = '' }) {
  return (
    <span
      className={`glass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium tracking-wide text-nova-100 ${className}`}
    >
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-pulse-dot rounded-full bg-nova-400" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-nova-300 shadow-[0_0_8px_2px_rgba(71,166,255,0.8)]" />
      </span>
      {children}
    </span>
  )
}
