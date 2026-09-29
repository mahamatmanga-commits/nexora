import {
  BarChart3,
  Bell,
  CalendarDays,
  LayoutGrid,
  Megaphone,
  Search,
  Settings,
  Users,
} from 'lucide-react'
import { AreaChart, Sparkline } from '../ui/Charts'
import AnimatedNumber from '../ui/AnimatedNumber'
import { kpis, performance } from '../../data/content'

const sidebar = [
  { icon: LayoutGrid, active: true },
  { icon: BarChart3 },
  { icon: CalendarDays },
  { icon: Megaphone },
  { icon: Users },
]

/** Compact mock of the NOVA app shown in the hero. */
export default function DashboardPreview() {
  return (
    <div className="glass-strong glass-sheen relative overflow-hidden rounded-[1.75rem] p-2 sm:rounded-5xl sm:p-3">
      {/* window chrome */}
      <div className="flex items-center justify-between px-3 pb-2 pt-1 sm:px-4 sm:pb-3 sm:pt-2">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        </div>
        <div className="hidden items-center gap-2 rounded-full bg-white/[0.04] px-3 py-1 text-[11px] text-slate-500 ring-1 ring-inset ring-white/5 sm:flex">
          <Search className="h-3 w-3" /> app.nova.io/overview
        </div>
        <div className="flex items-center gap-2">
          <Bell className="h-3.5 w-3.5 text-slate-500" />
          <span className="h-5 w-5 rounded-full bg-gradient-to-br from-nova-300 to-indigo-500" />
        </div>
      </div>

      <div className="flex gap-3 rounded-[1.4rem] bg-ink-950/60 p-3 ring-1 ring-inset ring-white/5 sm:rounded-4xl sm:p-4">
        {/* sidebar */}
        <aside className="hidden flex-col items-center gap-2 border-r border-white/5 pr-3 sm:flex">
          {sidebar.map(({ icon: Icon, active }, i) => (
            <span
              key={i}
              className={`grid h-9 w-9 place-items-center rounded-xl transition-colors ${
                active ? 'bg-nova-500/15 text-nova-300 ring-1 ring-inset ring-nova-400/30' : 'text-slate-500'
              }`}
            >
              <Icon className="h-4 w-4" />
            </span>
          ))}
          <span className="mt-auto grid h-9 w-9 place-items-center rounded-xl text-slate-600">
            <Settings className="h-4 w-4" />
          </span>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mb-3 flex items-end justify-between sm:mb-4">
            <div>
              <p className="text-[11px] text-slate-500">Vue d’ensemble · 12 derniers mois</p>
              <p className="font-display text-sm font-semibold text-white sm:text-base">Bonjour Léa, voici vos performances</p>
            </div>
            <div className="hidden gap-1 rounded-full bg-white/[0.04] p-1 text-[10px] ring-1 ring-inset ring-white/5 md:flex">
              {['7J', '30J', '12M'].map((r) => (
                <span key={r} className={`rounded-full px-2.5 py-1 ${r === '12M' ? 'bg-white/10 text-white' : 'text-slate-500'}`}>
                  {r}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
            {kpis.map((k, i) => (
              <div
                key={k.label}
                className={`rounded-2xl bg-white/[0.03] p-3 ring-1 ring-inset ring-white/[0.06] ${i > 1 ? 'hidden lg:block' : ''}`}
              >
                <p className="truncate text-[10px] text-slate-500 sm:text-[11px]">{k.label}</p>
                <div className="mt-1 flex items-end justify-between gap-2">
                  <AnimatedNumber
                    value={k.value}
                    decimals={k.decimals}
                    prefix={k.prefix}
                    suffix={k.suffix}
                    className="font-display text-base font-semibold text-white sm:text-lg"
                  />
                  <span className="text-[10px] font-medium text-emerald-300/90">{k.delta}</span>
                </div>
                <Sparkline data={k.trend} className="mt-2 h-6 w-full" width={100} height={24} />
              </div>
            ))}
          </div>

          <div className="mt-3 rounded-2xl bg-white/[0.02] p-3 ring-1 ring-inset ring-white/[0.06] sm:mt-4 sm:p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium text-slate-300">Évolution de l’engagement</p>
              <p className="text-[10px] text-slate-500">en milliers</p>
            </div>
            <AreaChart
              series={performance.series.slice(0, 2)}
              labels={performance.labels}
              height={130}
              zeroBased={false}
              formatValue={(v) => `${v} k`}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
