import { usePointerGlow } from '../../hooks/usePointerGlow'

/**
 * Liquid-glass surface. `interactive` adds a cursor-follow spotlight and a lift on hover.
 */
export default function GlassCard({
  as: Tag = 'div',
  interactive = false,
  strong = false,
  className = '',
  children,
  ...rest
}) {
  const onPointerMove = usePointerGlow()
  return (
    <Tag
      onPointerMove={interactive ? onPointerMove : undefined}
      className={`${strong ? 'glass-strong' : 'glass'} glass-sheen group/card overflow-hidden rounded-4xl ${
        interactive
          ? 'transition-[transform,box-shadow] duration-500 ease-out hover:-translate-y-1 hover:shadow-glow'
          : ''
      } ${className}`}
      {...rest}
    >
      {interactive && (
        <div className="spotlight pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover/card:opacity-100" />
      )}
      {children}
    </Tag>
  )
}
