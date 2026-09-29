const base =
  'group relative inline-flex items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-full font-medium transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nova-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950 active:scale-[0.98]'

const variants = {
  primary:
    'bg-gradient-to-b from-nova-400 to-nova-600 text-white shadow-glow hover:shadow-glow-lg hover:brightness-110',
  glass:
    'glass text-white hover:bg-white/[0.08]',
  ghost: 'text-slate-300 hover:text-white hover:bg-white/[0.05]',
}

const sizes = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-[52px] px-7 text-[15px]',
}

export default function Button({
  as: Tag = 'a',
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...rest
}) {
  return (
    <Tag className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...rest}>
      {variant === 'primary' && (
        <>
          <span className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />
          <span className="pointer-events-none absolute inset-y-0 left-0 w-1/3 -skew-x-12 bg-white/25 opacity-0 blur-md transition-opacity group-hover:animate-shimmer group-hover:opacity-100" />
        </>
      )}
      <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
    </Tag>
  )
}
