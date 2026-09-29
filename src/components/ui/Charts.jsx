import { useId, useMemo, useState } from 'react'
import { useInView } from '../../hooks/useInView'

/* ---------- geometry helpers ---------- */

function toPoints(data, width, height, { min, max, padTop = 8, padBottom = 4 } = {}) {
  const lo = min ?? Math.min(...data)
  const hi = max ?? Math.max(...data)
  const range = hi - lo || 1
  const step = width / (data.length - 1)
  return data.map((v, i) => [i * step, padTop + (1 - (v - lo) / range) * (height - padTop - padBottom)])
}

/** Catmull-Rom spline converted to cubic Béziers for a smooth, natural curve. */
function smoothPath(points, tension = 0.18) {
  if (points.length < 2) return ''
  let d = `M${points[0][0]},${points[0][1]}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] ?? p2
    const c1x = p1[0] + (p2[0] - p0[0]) * tension
    const c1y = p1[1] + (p2[1] - p0[1]) * tension
    const c2x = p2[0] - (p3[0] - p1[0]) * tension
    const c2y = p2[1] - (p3[1] - p1[1]) * tension
    d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2[0]},${p2[1]}`
  }
  return d
}

/* ---------- Sparkline ---------- */

export function Sparkline({ data, className = '', color = '#47a6ff', height = 40, width = 120 }) {
  const id = useId()
  const [ref, inView] = useInView({ threshold: 0.3 })
  const points = useMemo(() => toPoints(data, width, height, { padTop: 4, padBottom: 4 }), [data, width, height])
  const line = smoothPath(points)
  const area = `${line} L${width},${height} L0,${height} Z`
  const last = points[points.length - 1]

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={`wipe overflow-visible ${inView ? 'is-visible' : ''} ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${id}-f`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.35" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={area}
        fill={`url(#${id}-f)`}
        className="transition-opacity delay-500 duration-1000"
        style={{ opacity: inView ? 1 : 0 }}
      />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
       
      />
      <circle cx={last[0]} cy={last[1]} r="2.5" fill="#fff" style={{ opacity: inView ? 1 : 0 }} className="transition-opacity delay-[1600ms] duration-500" />
    </svg>
  )
}

/* ---------- Area chart with hover crosshair ---------- */

export function AreaChart({ series, labels, height = 260, formatValue = (v) => v, zeroBased = true, className = '' }) {
  const id = useId()
  const [ref, inView] = useInView({ threshold: 0.25 })
  const [hover, setHover] = useState(null)
  const width = 800
  const all = series.flatMap((s) => s.data)
  const hi = Math.max(...all)
  const lo = Math.min(...all)
  // Non zero-based charts zoom on the data range so small variations stay readable.
  const max = zeroBased ? hi * 1.08 : hi + (hi - lo) * 0.12
  const min = zeroBased ? 0 : Math.max(0, lo - (hi - lo) * 0.35)

  const computed = useMemo(
    () =>
      series.map((s) => {
        const pts = toPoints(s.data, width, height, { min, max, padTop: 12, padBottom: 2 })
        const line = smoothPath(pts)
        return { ...s, pts, line, area: `${line} L${width},${height} L0,${height} Z` }
      }),
    [series, height, max, min],
  )

  const count = labels.length
  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * width
    const idx = Math.round((x / width) * (count - 1))
    setHover(Math.max(0, Math.min(count - 1, idx)))
  }

  const hx = hover !== null ? (hover / (count - 1)) * 100 : 0

  return (
    <div ref={ref} className={`relative ${inView ? 'is-visible' : ''} ${className}`}>
      <div className="relative" style={{ height }} onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="wipe absolute inset-0 h-full w-full overflow-visible">
          <defs>
            {computed.map((s, i) => (
              <linearGradient key={i} id={`${id}-g${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={s.color} stopOpacity={i === 0 ? 0.32 : 0.14} />
                <stop offset="1" stopColor={s.color} stopOpacity="0" />
              </linearGradient>
            ))}
            <filter id={`${id}-glow`} x="-10%" y="-50%" width="120%" height="200%">
              <feGaussianBlur stdDeviation="6" />
            </filter>
          </defs>

          {[0.25, 0.5, 0.75, 1].map((t) => (
            <line key={t} x1="0" x2={width} y1={height * t} y2={height * t} stroke="rgba(148,180,255,0.07)" strokeDasharray="3 6" vectorEffect="non-scaling-stroke" />
          ))}

          {computed.map((s, i) => (
            <g key={s.name}>
              <path d={s.area} fill={`url(#${id}-g${i})`} className="transition-opacity duration-1000 delay-700" style={{ opacity: inView ? 1 : 0 }} />
              {i === 0 && (
                <path d={s.line} fill="none" stroke={s.color} strokeWidth="6" opacity="0.45" filter={`url(#${id}-glow)`} vectorEffect="non-scaling-stroke" />
              )}
              <path
                d={s.line}
                fill="none"
                stroke={s.color}
                strokeWidth={i === 0 ? 2.4 : 1.8}
                strokeDasharray={s.dashed ? '4 6' : undefined}
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                opacity={s.dashed ? 0.7 : 1}
              />
            </g>
          ))}
        </svg>

        {hover !== null && (
          <>
            <div className="pointer-events-none absolute inset-y-0 w-px bg-gradient-to-b from-transparent via-nova-300/50 to-transparent" style={{ left: `${hx}%` }} />
            {computed.map((s) => (
              <span
                key={s.name}
                className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink-900"
                style={{
                  left: `${hx}%`,
                  top: `${(s.pts[hover][1] / height) * 100}%`,
                  background: s.color,
                  boxShadow: `0 0 12px ${s.color}`,
                }}
              />
            ))}
            <div
              className="glass-strong pointer-events-none absolute top-2 z-10 min-w-[150px] rounded-2xl px-3.5 py-2.5 text-xs"
              style={{ left: `${hx}%`, transform: `translateX(${hx > 70 ? 'calc(-100% - 14px)' : '14px'})` }}
            >
              <div className="mb-1.5 font-medium text-slate-400">{labels[hover]}</div>
              {computed.map((s) => (
                <div key={s.name} className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
                    {s.name}
                  </span>
                  <span className="font-semibold tabular-nums text-white">{formatValue(s.data[hover])}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="mt-3 flex justify-between text-[11px] font-medium text-slate-500">
        {labels.map((l, i) => (
          <span key={l} className={i % 2 === 1 ? 'hidden sm:inline' : ''}>
            {l}
          </span>
        ))}
      </div>
    </div>
  )
}

/* ---------- Bar chart ---------- */

export function BarChart({ data, labels, highlight, height = 140, className = '' }) {
  const [ref, inView] = useInView({ threshold: 0.3 })
  const max = Math.max(...data)
  return (
    <div ref={ref} className={`${inView ? 'is-visible' : ''} ${className}`}>
      <div className="flex items-end gap-1.5 sm:gap-2" style={{ height }}>
        {data.map((v, i) => {
          const active = i === highlight
          return (
            <div key={i} className="group/bar relative flex h-full flex-1 items-end">
              <div
                className={`bar-grow w-full rounded-t-lg rounded-b-sm transition-[filter] duration-300 group-hover/bar:brightness-125 ${
                  active
                    ? 'bg-gradient-to-t from-nova-600 to-nova-300 shadow-[0_0_24px_-2px_rgba(71,166,255,0.7)]'
                    : 'bg-gradient-to-t from-nova-500/15 to-nova-400/45'
                }`}
                style={{ height: `${(v / max) * 100}%`, '--delay': `${i * 55}ms` }}
              />
              <span className="glass-strong pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 rounded-lg px-2 py-0.5 text-[10px] font-semibold text-white opacity-0 transition-opacity group-hover/bar:opacity-100">
                {v.toLocaleString('fr-FR')}
              </span>
            </div>
          )
        })}
      </div>
      {labels && (
        <div className="mt-2 flex gap-1.5 text-center text-[10px] font-medium text-slate-500 sm:gap-2">
          {labels.map((l, i) => (
            <span key={i} className="flex-1">
              {l}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

/* ---------- Donut ---------- */

export function Donut({ segments, size = 148, stroke = 14, children, className = '' }) {
  const [ref, inView] = useInView({ threshold: 0.3 })
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const total = segments.reduce((a, s) => a + s.value, 0)
  const gap = 4
  let offset = 0

  return (
    <div ref={ref} className={`relative ${className}`} style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(148,180,255,0.08)" strokeWidth={stroke} />
        {segments.map((s, i) => {
          const len = (s.value / total) * c - gap
          const dash = `${inView ? len : 0} ${c}`
          const el = (
            <circle
              key={s.label}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={dash}
              strokeDashoffset={-offset}
              style={{ transition: `stroke-dasharray 1.4s cubic-bezier(0.2,0.8,0.2,1) ${i * 150}ms`, filter: i === 0 ? 'drop-shadow(0 0 6px rgba(71,166,255,0.6))' : undefined }}
            />
          )
          offset += len + gap
          return el
        })}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  )
}
