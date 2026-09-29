import {
  BarChart3,
  Briefcase,
  CalendarDays,
  Check,
  FileBarChart2,
  Megaphone,
  Share2,
} from 'lucide-react'
import GlassCard from '../ui/GlassCard'
import SectionHeading from '../ui/SectionHeading'
import Reveal from '../ui/Reveal'
import Glow from '../ui/Glow'
import Progress from '../ui/Progress'
import AnimatedNumber from '../ui/AnimatedNumber'
import { AreaChart } from '../ui/Charts'
import { Instagram, LinkedIn, TikTok } from '../ui/BrandIcons'

function FeatureHeader({ icon: Icon, title, text }) {
  return (
    <div className="relative">
      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-b from-white/10 to-white/[0.02] text-nova-300 ring-1 ring-inset ring-white/10 transition-all duration-500 group-hover/card:text-white group-hover/card:shadow-glow">
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="mt-5 text-xl font-semibold sm:text-[1.35rem]">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-400">{text}</p>
    </div>
  )
}

/* ---- visual vignettes for each tile ---- */

function AnalyticsVisual() {
  return (
    <div className="relative mt-8 rounded-3xl bg-ink-950/50 p-4 ring-1 ring-inset ring-white/5 sm:p-5">
      <div className="mb-3 flex items-end justify-between">
        <div>
          <p className="text-[11px] text-slate-500">Taux de conversion</p>
          <AnimatedNumber value={4.86} decimals={2} suffix=" %" className="font-display text-2xl font-semibold text-white" />
        </div>
        <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">+0,9 pt</span>
      </div>
      <AreaChart
        height={120}
        zeroBased={false}
        labels={['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8']}
        formatValue={(v) => `${v} %`}
        series={[
          { name: 'Conversion', color: '#47a6ff', data: [3.1, 3.4, 3.2, 3.9, 3.7, 4.2, 4.5, 4.86] },
          { name: 'Secteur', color: '#8b9cff', data: [2.9, 3.0, 3.0, 3.1, 3.2, 3.2, 3.3, 3.3] },
        ]}
      />
    </div>
  )
}

function SocialVisual() {
  const posts = [
    { icon: Instagram, label: 'Reel produit', status: 'Publié', tone: 'text-emerald-300 bg-emerald-400/10' },
    { icon: LinkedIn, label: 'Étude de cas', status: 'En revue', tone: 'text-amber-200 bg-amber-300/10' },
    { icon: TikTok, label: 'Behind the scenes', status: 'Programmé', tone: 'text-nova-200 bg-nova-500/15' },
  ]
  return (
    <ul className="relative mt-8 space-y-2.5">
      {posts.map(({ icon: Icon, label, status, tone }, i) => (
        <li
          key={label}
          className="flex items-center gap-3 rounded-2xl bg-white/[0.03] p-3 ring-1 ring-inset ring-white/5 transition-transform duration-500 group-hover/card:translate-x-1"
          style={{ transitionDelay: `${i * 60}ms` }}
        >
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-white/[0.06] text-slate-200">
            <Icon className="h-3.5 w-3.5" />
          </span>
          <span className="flex-1 truncate text-sm text-slate-200">{label}</span>
          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${tone}`}>{status}</span>
        </li>
      ))}
    </ul>
  )
}

function CalendarVisual() {
  const days = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
  const filled = { 1: 1, 3: 2, 4: 1, 8: 1, 10: 3, 11: 1, 15: 2, 17: 1, 18: 1, 22: 1, 24: 2, 25: 1, 26: 1 }
  return (
    <div className="relative mt-8">
      <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-medium text-slate-500">
        {days.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1.5">
        {Array.from({ length: 28 }, (_, i) => {
          const n = filled[i] ?? 0
          const today = i === 10
          return (
            <span
              key={i}
              className={`relative flex aspect-square flex-col items-center justify-center rounded-lg text-[10px] transition-colors duration-300 ${
                today
                  ? 'bg-nova-500/25 text-white ring-1 ring-inset ring-nova-300/50 shadow-[0_0_16px_-2px_rgba(71,166,255,0.6)]'
                  : n
                    ? 'bg-white/[0.05] text-slate-200 ring-1 ring-inset ring-white/5'
                    : 'text-slate-600'
              }`}
            >
              {i + 1}
              {n > 0 && (
                <span className="absolute bottom-1 flex gap-0.5">
                  {Array.from({ length: n }, (_, k) => (
                    <span key={k} className="h-1 w-1 rounded-full bg-nova-300" />
                  ))}
                </span>
              )}
            </span>
          )
        })}
      </div>
    </div>
  )
}

function CampaignVisual() {
  const items = [
    { label: 'Notoriété', value: 92 },
    { label: 'Considération', value: 68 },
    { label: 'Conversion', value: 47 },
  ]
  return (
    <div className="relative mt-8 space-y-4">
      {items.map((it, i) => (
        <div key={it.label}>
          <div className="mb-1.5 flex justify-between text-xs">
            <span className="text-slate-300">{it.label}</span>
            <span className="tabular-nums text-slate-500">{it.value} %</span>
          </div>
          <Progress value={it.value} delay={i * 150} />
        </div>
      ))}
    </div>
  )
}

function ClientsVisual() {
  const clients = [
    { name: 'Maison Aurèle', initials: 'MA', health: 'Excellent', score: 96, color: 'from-sky-300 to-blue-600' },
    { name: 'Studio Kora', initials: 'SK', health: 'Stable', score: 81, color: 'from-indigo-300 to-violet-600' },
    { name: 'Lumen Sport', initials: 'LS', health: 'À suivre', score: 64, color: 'from-cyan-300 to-sky-600' },
  ]
  return (
    <ul className="relative mt-8 divide-y divide-white/5 rounded-2xl bg-white/[0.02] ring-1 ring-inset ring-white/5">
      {clients.map((c) => (
        <li key={c.name} className="flex items-center gap-3 px-3.5 py-3">
          <span className={`grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br ${c.color} text-[10px] font-bold text-white`}>
            {c.initials}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-white">{c.name}</p>
            <p className="text-[11px] text-slate-500">Santé du compte · {c.health}</p>
          </div>
          <span className="font-display text-sm font-semibold tabular-nums text-nova-200">{c.score}</span>
        </li>
      ))}
    </ul>
  )
}

function ReportsVisual() {
  return (
    <div className="relative mt-8 flex items-end gap-4">
      <div className="relative w-full max-w-[220px] rotate-[-4deg] rounded-2xl bg-white/[0.04] p-4 ring-1 ring-inset ring-white/10 transition-transform duration-700 group-hover/card:rotate-0">
        <div className="flex items-center justify-between">
          <span className="h-2 w-16 rounded-full bg-white/20" />
          <span className="text-[10px] font-semibold text-nova-300">PDF</span>
        </div>
        <div className="mt-4 flex h-14 items-end gap-1">
          {[40, 62, 48, 78, 66, 92, 84].map((h, i) => (
            <span key={i} className="flex-1 rounded-sm bg-gradient-to-t from-nova-600/40 to-nova-300/80" style={{ height: `${h}%` }} />
          ))}
        </div>
        <div className="mt-3 space-y-1.5">
          <span className="block h-1.5 w-full rounded-full bg-white/10" />
          <span className="block h-1.5 w-3/4 rounded-full bg-white/10" />
        </div>
      </div>
      <ul className="flex-1 space-y-2 text-xs text-slate-300">
        {['Chaque lundi, 9h00', 'Marque blanche', 'Envoi aux clients'].map((t) => (
          <li key={t} className="flex items-center gap-2">
            <span className="grid h-4 w-4 place-items-center rounded-full bg-nova-500/20 text-nova-300">
              <Check className="h-2.5 w-2.5" />
            </span>
            {t}
          </li>
        ))}
      </ul>
    </div>
  )
}

const tiles = [
  {
    icon: BarChart3,
    title: 'Analytics unifiés',
    text: 'Toutes vos métriques cross-canal consolidées, comparées à votre secteur et expliquées par l’IA.',
    visual: AnalyticsVisual,
    className: 'md:col-span-2 lg:col-span-4',
  },
  {
    icon: Share2,
    title: 'Gestion des réseaux sociaux',
    text: 'Créez, validez et publiez partout depuis une seule boîte de production.',
    visual: SocialVisual,
    className: 'lg:col-span-2',
  },
  {
    icon: CalendarDays,
    title: 'Calendrier éditorial',
    text: 'Visualisez votre planning, glissez-déposez vos contenus, évitez les trous.',
    visual: CalendarVisual,
    className: 'lg:col-span-2',
  },
  {
    icon: Megaphone,
    title: 'Campagnes',
    text: 'Budgets, objectifs et funnel suivis en direct, pour chaque campagne.',
    visual: CampaignVisual,
    className: 'lg:col-span-2',
  },
  {
    icon: Briefcase,
    title: 'Gestion clients',
    text: 'Un espace par client, avec son historique, ses livrables et sa santé.',
    visual: ClientsVisual,
    className: 'lg:col-span-2',
  },
  {
    icon: FileBarChart2,
    title: 'Rapports automatiques',
    text: 'Des rapports soignés, à vos couleurs, générés et envoyés sans lever le petit doigt.',
    visual: ReportsVisual,
    className: 'md:col-span-2 lg:col-span-6',
    wide: true,
  },
]

export default function Features() {
  return (
    <section id="fonctionnalites" className="relative scroll-mt-24 py-24 sm:py-32">
      <Glow className="right-[-20rem] top-1/3 -z-10 h-[36rem] w-[36rem]" color="rgba(71,166,255,0.16)" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Fonctionnalités"
          title="Une plateforme. Toute votre stratégie."
          description="Chaque module de NOVA est pensé pour fonctionner ensemble : vos contenus alimentent vos campagnes, vos campagnes alimentent vos rapports."
        />

        <div className="mt-16 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-6 lg:gap-5">
          {tiles.map(({ icon, title, text, visual: Visual, className, wide }, i) => (
            <Reveal key={title} delay={(i % 3) * 90} className={`${className}`}>
              <GlassCard interactive className="h-full p-6 sm:p-8">
                {wide ? (
                  <div className="relative grid items-center gap-6 md:grid-cols-2">
                    <FeatureHeader icon={icon} title={title} text={text} />
                    <Visual />
                  </div>
                ) : (
                  <>
                    <FeatureHeader icon={icon} title={title} text={text} />
                    <Visual />
                  </>
                )}
              </GlassCard>
            </Reveal>
          ))}
        </div>

      </div>
    </section>
  )
}
