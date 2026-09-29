import { useRef } from 'react'
import { ArrowRight, CalendarCheck2, Play, Sparkles, TrendingUp } from 'lucide-react'
import Button from '../ui/Button'
import Badge from '../ui/Badge'
import Glow from '../ui/Glow'
import Reveal from '../ui/Reveal'
import DashboardPreview from './DashboardPreview'
import { Instagram, LinkedIn, TikTok } from '../ui/BrandIcons'

export default function Hero() {
  const stageRef = useRef(null)

  // Subtle 3D tilt of the preview following the pointer.
  const onPointerMove = (e) => {
    const el = stageRef.current
    if (!el || e.pointerType === 'touch') return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    el.style.setProperty('--rx', `${10 - y * 6}deg`)
    el.style.setProperty('--ry', `${x * 8}deg`)
  }
  const onPointerLeave = () => {
    stageRef.current?.style.setProperty('--rx', '10deg')
    stageRef.current?.style.setProperty('--ry', '0deg')
  }

  return (
    <section
      id="top"
      className="relative isolate overflow-hidden pb-20 pt-36 sm:pb-28 sm:pt-44"
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      {/* ambient light */}
      <div className="grid-bg absolute inset-0 -z-10" />
      <Glow className="left-1/2 top-[-12rem] -z-10 h-[40rem] w-[56rem] -translate-x-1/2" color="rgba(31,107,255,0.45)" />
      <Glow className="left-[-10rem] top-[28rem] -z-10 h-[28rem] w-[28rem]" color="rgba(71,166,255,0.22)" />
      <Glow className="right-[-12rem] top-[36rem] -z-10 h-[30rem] w-[30rem]" color="rgba(99,102,241,0.22)" />

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto flex flex-col items-center text-center">
          <Reveal>
            <Badge>
              Nouveau · NOVA Insights propulsé par l’IA
              <ArrowRight className="h-3 w-3 text-nova-300" />
            </Badge>
          </Reveal>

          <Reveal delay={100}>
            <h1 className="mt-8 text-balance text-[2.75rem] font-semibold leading-[1.02] tracking-[-0.035em] sm:text-6xl lg:text-[5.25rem]">
              <span className="text-gradient">
                Transformez vos <span className="whitespace-nowrap">données</span>
              </span>
              <br />
              <span className="text-gradient-blue">en décisions.</span>
            </h1>
          </Reveal>

          <Reveal delay={200}>
            <p className="mt-7 max-w-2xl text-balance text-base leading-relaxed text-slate-400 sm:text-lg">
              NOVA est le centre de contrôle des équipes marketing : réseaux sociaux, campagnes, contenus,
              statistiques et clients réunis dans un espace unique, clair et intelligent.
            </p>
          </Reveal>

          <Reveal delay={300} className="mt-10 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row">
            <Button href="#tarifs" size="lg" className="w-full sm:w-auto">
              Commencer gratuitement
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Button>
            <Button href="#dashboard" variant="glass" size="lg" className="w-full sm:w-auto">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-white/10 ring-1 ring-inset ring-white/20 transition-transform duration-300 group-hover:scale-110">
                <Play className="h-2.5 w-2.5 fill-white" />
              </span>
              Voir la démo
            </Button>
          </Reveal>

          <Reveal delay={380}>
            <p className="mt-6 text-xs text-slate-500">14 jours d’essai · Sans carte bancaire · Annulable à tout moment</p>
          </Reveal>
        </div>

        {/* Floating liquid-glass dashboard */}
        <Reveal delay={450} className="relative mx-auto mt-16 max-w-5xl sm:mt-20 [perspective:2000px]">
          <div className="absolute inset-x-[8%] -top-10 bottom-10 -z-10 rounded-full bg-nova-600/30 blur-[90px]" />
          <div
            ref={stageRef}
            className="transition-transform duration-700 ease-out"
            style={{ transform: 'rotateX(var(--rx, 10deg)) rotateY(var(--ry, 0deg))' }}
          >
            <div className="animate-float-slow">
              <DashboardPreview />
            </div>

            {/* floating chips */}
            <div className="absolute -left-6 top-[58%] hidden lg:block xl:-left-16">
              <div className="glass-strong flex animate-float items-center gap-3 rounded-2xl p-3 pr-4 shadow-glow [animation-delay:-2s]">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-400/10 text-emerald-300 ring-1 ring-inset ring-emerald-300/20">
                  <TrendingUp className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[11px] text-slate-400">Engagement</p>
                  <p className="font-display text-sm font-semibold text-white">+24,1 % ce mois</p>
                </div>
              </div>
            </div>

            <div className="absolute -right-4 top-[46%] hidden lg:block xl:-right-12">
              <div className="glass-strong w-60 animate-float rounded-2xl p-3.5 [animation-delay:-4s]">
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <CalendarCheck2 className="h-3.5 w-3.5 text-nova-300" /> Programmé · Jeu. 18:30
                </div>
                <p className="mt-2 text-xs font-medium leading-snug text-white">Teaser collection automne — carrousel 6 visuels</p>
                <div className="mt-3 flex items-center gap-1.5 text-slate-300">
                  {[Instagram, TikTok, LinkedIn].map((Icon, i) => (
                    <span key={i} className="grid h-6 w-6 place-items-center rounded-lg bg-white/[0.06] ring-1 ring-inset ring-white/10">
                      <Icon className="h-3 w-3" />
                    </span>
                  ))}
                  <span className="ml-auto rounded-full bg-nova-500/15 px-2 py-0.5 text-[10px] font-medium text-nova-200">Validé</span>
                </div>
              </div>
            </div>

            <div className="absolute -bottom-6 left-[12%] hidden md:block">
              <div className="glass-strong flex animate-float items-center gap-2.5 rounded-full py-2 pl-2 pr-4 [animation-delay:-1s]">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-b from-nova-400 to-nova-600 shadow-glow">
                  <Sparkles className="h-3.5 w-3.5 text-white" />
                </span>
                <p className="text-xs text-slate-200">
                  <span className="font-semibold text-white">Insight IA :</span> publiez le jeudi, +31 % de portée
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
