export default function Logo({ className = '' }) {
  return (
    <a href="#top" className={`group inline-flex items-center gap-2.5 ${className}`} aria-label="NOVA, accueil">
      <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-b from-white/10 to-white/[0.02] ring-1 ring-inset ring-white/15 transition-shadow duration-500 group-hover:shadow-glow">
        <span className="absolute inset-0 rounded-xl bg-nova-500/20 blur-md" />
        <svg viewBox="0 0 24 24" className="relative h-5 w-5" fill="none">
          <defs>
            <linearGradient id="logo-g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#b5d8ff" />
              <stop offset="1" stopColor="#2b86ff" />
            </linearGradient>
          </defs>
          <path
            d="M6 18V6l12 12V6"
            stroke="url(#logo-g)"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="font-display text-lg font-semibold tracking-[0.18em] text-white">NOVA</span>
    </a>
  )
}
