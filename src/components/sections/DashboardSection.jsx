import { ArrowUpRight, Eye, Heart, MousePointerClick, UserPlus } from 'lucide-react'
import GlassCard from '../ui/GlassCard'
import SectionHeading from '../ui/SectionHeading'
import Reveal from '../ui/Reveal'
import Glow from '../ui/Glow'
import AnimatedNumber from '../ui/AnimatedNumber'
import Progress from '../ui/Progress'
import { AreaChart, BarChart, Donut, Sparkline } from '../ui/Charts'
import { channelSplit, kpis, performance, topCampaigns, weeklyPosts } from '../../data/content'

const kpiIcons = [Eye, Heart, UserPlus, MousePointerClick]

function KpiCard({ kpi, icon: Icon, index }) {
  return (
    <Reveal delay={index * 90}>
      <GlassCard interactive className="h-full p-5 sm:p-6">
        <div className="relative flex items-center justify-between">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-nova-500/10 text-nova-300 ring-1 ring-inset ring-nova-400/20 transition-all duration-500 group-hover/card:bg-nova-500/20 group-hover/card:shadow-glow">
            <Icon className="h-[18px] w-[18px]" />
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 ring-1 ring-inset ring-emerald-300/15">
            <ArrowUpRight className="h-3 w-3" />
            {kpi.delta}
          </span>
        </div>
        <p className="relative mt-6 text-sm text-slate-400">{kpi.label}</p>
        <AnimatedNumber
          value={kpi.value}
          decimals={kpi.decimals}
          prefix={kpi.prefix}
          suffix={kpi.suffix}
          className="relative mt-1 block font-display text-3xl font-semibold tracking-tight text-white sm:text-[2.1rem]"
        />
        <Sparkline data={kpi.trend} className="relative mt-5 h-10 w-full" />
        <p className="relative mt-2 text-[11px] text-slate-500">vs. période précédente</p>
      </GlassCard>
    </Reveal>
  )
}

export default function DashboardSection() {
  return (
    <section id="dashboard" className="relative scroll-mt-24 py-24 sm:py-32">
      <Glow className="left-1/2 top-40 -z-10 h-[36rem] w-[60rem] -translate-x-1/2" color="rgba(31,107,255,0.18)" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Dashboard"
          title="Tous vos indicateurs. Un seul regard."
          description="Impressions, engagement, abonnés, conversions : NOVA consolide chaque réseau et chaque campagne en temps réel pour révéler ce qui fait vraiment croître votre marque."
        />

        <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
          {kpis.map((kpi, i) => (
            <KpiCard key={kpi.label} kpi={kpi} icon={kpiIcons[i]} index={i} />
          ))}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:mt-5 lg:grid-cols-3 lg:gap-5">
          {/* Performance chart */}
          <Reveal className="lg:col-span-2">
            <GlassCard className="h-full p-5 sm:p-7">
              <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm text-slate-400">Évolution des performances</p>
                  <p className="mt-1 font-display text-2xl font-semibold text-white">
                    <AnimatedNumber value={3.24} decimals={2} suffix=" M" /> interactions
                  </p>
                  <p className="mt-1 text-xs text-emerald-300">+38,7 % sur 12 mois</p>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-400">
                  {performance.series.map((s) => (
                    <span key={s.name} className="inline-flex items-center gap-2">
                      <span
                        className={`h-0.5 w-4 rounded-full ${s.dashed ? 'opacity-70' : ''}`}
                        style={{
                          background: s.dashed ? `repeating-linear-gradient(90deg, ${s.color} 0 3px, transparent 3px 6px)` : s.color,
                          boxShadow: s.dashed ? undefined : `0 0 8px ${s.color}`,
                        }}
                      />
                      {s.name}
                    </span>
                  ))}
                </div>
              </div>
              <AreaChart
                className="relative mt-8"
                series={performance.series}
                labels={performance.labels}
                height={260}
                formatValue={(v) => `${v} k`}
              />
            </GlassCard>
          </Reveal>

          {/* Channel split */}
          <Reveal delay={120}>
            <GlassCard className="flex h-full flex-col p-5 sm:p-7">
              <p className="relative text-sm text-slate-400">Répartition de l’audience</p>
              <div className="relative mt-6 flex flex-1 items-center justify-center">
                <div className="absolute h-32 w-32 rounded-full bg-nova-500/20 blur-2xl" />
                <Donut segments={channelSplit} size={176} stroke={14}>
                  <div>
                    <AnimatedNumber value={1.28} decimals={2} suffix=" M" className="font-display text-2xl font-semibold text-white" />
                    <p className="text-[11px] text-slate-500">abonnés cumulés</p>
                  </div>
                </Donut>
              </div>
              <ul className="relative mt-6 grid grid-cols-2 gap-2.5">
                {channelSplit.map((c) => (
                  <li key={c.label} className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2 text-xs ring-1 ring-inset ring-white/5">
                    <span className="flex items-center gap-2 text-slate-300">
                      <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
                      {c.label}
                    </span>
                    <span className="font-semibold tabular-nums text-white">{c.value} %</span>
                  </li>
                ))}
              </ul>
            </GlassCard>
          </Reveal>

          {/* Weekly publications */}
          <Reveal>
            <GlassCard className="h-full p-5 sm:p-7">
              <div className="relative flex items-center justify-between">
                <p className="text-sm text-slate-400">Publications cette semaine</p>
                <span className="text-xs text-slate-500">358 posts</span>
              </div>
              <p className="relative mt-1 font-display text-2xl font-semibold text-white">
                Pic le <span className="text-gradient-blue">jeudi</span>
              </p>
              <BarChart className="relative mt-8" data={weeklyPosts.data} labels={weeklyPosts.labels} highlight={weeklyPosts.highlight} height={150} />
            </GlassCard>
          </Reveal>

          {/* Top campaigns */}
          <Reveal delay={120} className="lg:col-span-2">
            <GlassCard className="h-full p-5 sm:p-7">
              <div className="relative flex items-center justify-between">
                <p className="text-sm text-slate-400">Campagnes les plus performantes</p>
                <a href="#fonctionnalites" className="inline-flex items-center gap-1 text-xs font-medium text-nova-300 transition-colors hover:text-nova-200">
                  Tout voir <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              </div>
              <ul className="relative mt-6 space-y-3">
                {topCampaigns.map((c, i) => (
                  <li
                    key={c.name}
                    className="group/row grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 rounded-2xl bg-white/[0.02] p-4 ring-1 ring-inset ring-white/5 transition-colors duration-300 hover:bg-white/[0.05] sm:grid-cols-[1.4fr_1.6fr_auto]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">{c.name}</p>
                      <p className="text-xs text-slate-500">{c.client}</p>
                    </div>
                    <div className="order-last col-span-2 sm:order-none sm:col-span-1">
                      <Progress value={c.progress} delay={200 + i * 150} />
                      <p className="mt-1.5 text-[11px] text-slate-500">{c.progress} % du budget consommé</p>
                    </div>
                    <span className="font-display text-sm font-semibold text-emerald-300">{c.roi}</span>
                  </li>
                ))}
              </ul>
            </GlassCard>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
