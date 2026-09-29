import { Check, RefreshCw } from 'lucide-react'
import SectionHeading from '../ui/SectionHeading'
import GlassCard from '../ui/GlassCard'
import Reveal from '../ui/Reveal'
import Glow from '../ui/Glow'
import AnimatedNumber from '../ui/AnimatedNumber'
import { Facebook, Instagram, LinkedIn, Pinterest, Threads, TikTok, XIcon, YouTube } from '../ui/BrandIcons'

const inner = [
  { icon: Instagram, name: 'Instagram', angle: 0 },
  { icon: TikTok, name: 'TikTok', angle: 120 },
  { icon: LinkedIn, name: 'LinkedIn', angle: 240 },
]
const outer = [
  { icon: Facebook, name: 'Facebook', angle: 30 },
  { icon: YouTube, name: 'YouTube', angle: 102 },
  { icon: XIcon, name: 'X', angle: 174 },
  { icon: Pinterest, name: 'Pinterest', angle: 246 },
  { icon: Threads, name: 'Threads', angle: 318 },
]

const accounts = [
  { icon: Instagram, name: 'Instagram', handle: '@maison.aurele', followers: 184200 },
  { icon: TikTok, name: 'TikTok', handle: '@aurele.studio', followers: 96400 },
  { icon: LinkedIn, name: 'LinkedIn', handle: 'Maison Aurèle', followers: 42800 },
  { icon: Facebook, name: 'Facebook', handle: 'Maison Aurèle', followers: 61300 },
]

function OrbitIcon({ icon: Icon, name, angle, radiusVar, reverse, duration }) {
  return (
    <div
      className="absolute left-1/2 top-1/2 -ml-6 -mt-6 h-12 w-12 sm:-ml-7 sm:-mt-7 sm:h-14 sm:w-14"
      style={{ transform: `rotate(${angle}deg) translateX(var(${radiusVar})) rotate(${-angle}deg)` }}
    >
      {/* counter-rotates so the glyph stays upright while its ring spins */}
      <div
        className="h-full w-full animate-spin-slow"
        style={{ animationDuration: duration, animationDirection: reverse ? 'normal' : 'reverse' }}
      >
        <div
          title={name}
          className="glass-strong group/icon grid h-full w-full place-items-center rounded-2xl text-slate-200 transition-all duration-300 hover:scale-110 hover:text-white hover:shadow-glow"
        >
          <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
      </div>
    </div>
  )
}

function Orbit() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[460px] [--r1:92px] [--r2:150px] sm:[--r1:120px] sm:[--r2:200px]">
      {/* rings */}
      <div className="absolute inset-[6%] rounded-full border border-white/[0.06]" />
      <div className="absolute inset-[24%] rounded-full border border-nova-300/10" />
      <div className="absolute inset-[6%] rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,rgba(71,166,255,0.25)_40deg,transparent_90deg)] opacity-60 [mask-image:radial-gradient(circle,transparent_64%,#000_65%,#000_66%,transparent_67%)] animate-spin-slow" />

      {/* inner ring */}
      <div className="absolute inset-0 animate-spin-slow [animation-duration:32s]">
        {inner.map((it) => (
          <OrbitIcon key={it.name} {...it} radiusVar="--r1" duration="32s" />
        ))}
      </div>
      {/* outer ring */}
      <div className="absolute inset-0 animate-spin-slow [animation-direction:reverse] [animation-duration:52s]">
        {outer.map((it) => (
          <OrbitIcon key={it.name} {...it} radiusVar="--r2" duration="52s" reverse />
        ))}
      </div>

      {/* core */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="absolute inset-[-40%] rounded-full bg-nova-500/40 blur-3xl" />
        <div className="relative grid h-20 w-20 place-items-center rounded-[1.6rem] bg-gradient-to-b from-nova-400 to-nova-700 shadow-glow-lg ring-1 ring-inset ring-white/30 sm:h-24 sm:w-24 sm:rounded-[1.9rem]">
          <span className="absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />
          <svg viewBox="0 0 24 24" className="h-9 w-9 sm:h-10 sm:w-10" fill="none">
            <path d="M6 18V6l12 12V6" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </div>
  )
}

export default function Integrations() {
  return (
    <section id="reseaux" className="relative scroll-mt-24 overflow-hidden py-24 sm:py-32">
      <Glow className="left-[-16rem] top-1/4 -z-10 h-[34rem] w-[34rem]" color="rgba(31,107,255,0.2)" />
      <div className="mx-auto grid max-w-6xl items-center gap-16 px-4 sm:px-6 lg:grid-cols-2">
        <div>
          <SectionHeading
            align="left"
            eyebrow="Réseaux connectés"
            title="Tous vos réseaux, enfin réunis."
            description="Connectez Instagram, TikTok, LinkedIn, Facebook, YouTube et bien d’autres en quelques secondes. NOVA synchronise vos audiences, vos contenus et vos messages en continu."
          />

          <Reveal delay={200}>
            <GlassCard className="mt-10 p-2">
              <ul className="relative divide-y divide-white/5">
                {accounts.map(({ icon: Icon, name, handle, followers }) => (
                  <li key={name} className="flex items-center gap-3 rounded-2xl px-3 py-3 transition-colors duration-300 hover:bg-white/[0.03]">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/[0.06] text-white ring-1 ring-inset ring-white/10">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white">{name}</p>
                      <p className="truncate text-xs text-slate-500">{handle}</p>
                    </div>
                    <div className="text-right">
                      <AnimatedNumber value={followers} className="block font-display text-sm font-semibold text-white" />
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-300">
                        <Check className="h-2.5 w-2.5" /> Connecté
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="relative flex items-center justify-between px-3 pb-2 pt-3 text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <RefreshCw className="h-3 w-3 animate-spin-slow [animation-duration:6s]" /> Synchronisé il y a 12 s
                </span>
                <span>+ 16 autres intégrations</span>
              </div>
            </GlassCard>
          </Reveal>
        </div>

        <Reveal delay={150}>
          <Orbit />
        </Reveal>
      </div>
    </section>
  )
}
