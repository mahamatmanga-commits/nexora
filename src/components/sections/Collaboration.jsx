import { AtSign, CheckCircle2, Lock, MessageSquare, Send, ShieldCheck, Workflow } from 'lucide-react'
import SectionHeading from '../ui/SectionHeading'
import GlassCard from '../ui/GlassCard'
import Reveal from '../ui/Reveal'
import Glow from '../ui/Glow'
import AnimatedNumber from '../ui/AnimatedNumber'

const team = [
  { initials: 'LM', name: 'Léa Martin', role: 'Head of Social', color: 'from-sky-300 to-blue-600', online: true },
  { initials: 'KD', name: 'Karim Diallo', role: 'Content Designer', color: 'from-indigo-300 to-violet-600', online: true },
  { initials: 'CR', name: 'Chloé Roux', role: 'Account Manager', color: 'from-cyan-200 to-sky-600', online: false },
  { initials: 'TN', name: 'Tom Nguyen', role: 'Growth Analyst', color: 'from-blue-300 to-indigo-700', online: true },
]

const steps = [
  { label: 'Brief', done: true },
  { label: 'Création', done: true },
  { label: 'Validation', active: true },
  { label: 'Client' },
  { label: 'Publication' },
]

const perks = [
  { icon: Workflow, title: 'Workflows de validation', text: 'Des circuits d’approbation sur-mesure, du brief au client.' },
  { icon: MessageSquare, title: 'Commentaires en contexte', text: 'Annotez directement les visuels, mentionnez, résolvez.' },
  { icon: ShieldCheck, title: 'Rôles & permissions', text: 'Contrôlez finement qui voit, édite et publie quoi.' },
  { icon: Lock, title: 'Portail client sécurisé', text: 'Partagez livrables et rapports sans jamais exposer vos accès.' },
]

function Avatar({ person, status = true, className = '' }) {
  return (
    <span className={`relative inline-grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br ${person.color} text-[11px] font-bold text-white ring-2 ring-ink-900 ${className}`}>
      {person.initials}
      {status && person.online && <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-ink-900" />}
    </span>
  )
}

function Workspace() {
  return (
    <div className="relative">
      <GlassCard strong className="p-5 sm:p-6">
        {/* header */}
        <div className="relative flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-slate-500">Campagne · Automne 26</p>
            <p className="mt-1 font-display text-lg font-semibold text-white">Teaser collection</p>
          </div>
          <div className="flex -space-x-2.5">
            {team.map((p) => (
              <Avatar key={p.initials} person={p} status={false} />
            ))}
          </div>
        </div>

        {/* workflow */}
        <div className="relative mt-6 flex items-center">
          {steps.map((s, i) => (
            <div key={s.label} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <span
                  className={`grid h-7 w-7 place-items-center rounded-full text-[10px] font-semibold ring-1 ring-inset ${
                    s.done
                      ? 'bg-nova-500/20 text-nova-200 ring-nova-300/30'
                      : s.active
                        ? 'bg-gradient-to-b from-nova-400 to-nova-600 text-white shadow-glow ring-white/30'
                        : 'bg-white/[0.04] text-slate-500 ring-white/10'
                  }`}
                >
                  {s.done ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span className={`text-[10px] ${s.active ? 'text-white' : 'text-slate-500'}`}>{s.label}</span>
              </div>
              {i < steps.length - 1 && (
                <span className={`mx-1 mb-5 h-px flex-1 ${s.done ? 'bg-gradient-to-r from-nova-400/60 to-nova-400/30' : 'bg-white/10'}`} />
              )}
            </div>
          ))}
        </div>

        {/* thread */}
        <div className="relative mt-6 space-y-3">
          <div className="flex gap-3">
            <Avatar person={team[1]} />
            <div className="rounded-2xl rounded-tl-md bg-white/[0.04] px-3.5 py-2.5 ring-1 ring-inset ring-white/5">
              <p className="text-xs font-medium text-white">
                Karim <span className="font-normal text-slate-500">· il y a 4 min</span>
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-slate-300">
                Version finale du carrousel prête. J’ai ajusté les contrastes sur les slides 3 et 5.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Avatar person={team[0]} />
            <div className="rounded-2xl rounded-tl-md bg-nova-500/10 px-3.5 py-2.5 ring-1 ring-inset ring-nova-300/15">
              <p className="text-xs font-medium text-white">
                Léa <span className="font-normal text-slate-500">· à l’instant</span>
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-slate-300">
                Parfait ! <span className="font-medium text-nova-300">@Chloé</span> tu peux l’envoyer au client pour validation ?
              </p>
            </div>
          </div>
        </div>

        {/* composer */}
        <div className="relative mt-5 flex items-center gap-2 rounded-full bg-white/[0.03] py-1.5 pl-4 pr-1.5 ring-1 ring-inset ring-white/10">
          <AtSign className="h-3.5 w-3.5 text-slate-500" />
          <span className="flex-1 text-xs text-slate-500">
            Répondre à l’équipe…
            <span className="ml-0.5 inline-block h-3 w-px animate-pulse bg-nova-300 align-middle" />
          </span>
          <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-b from-nova-400 to-nova-600 text-white shadow-glow">
            <Send className="h-3.5 w-3.5" />
          </span>
        </div>
      </GlassCard>

      {/* floating approval toast */}
      <div className="absolute -bottom-7 -right-3 hidden sm:block lg:-right-8">
        <div className="glass-strong flex animate-float items-center gap-2.5 rounded-2xl py-2.5 pl-2.5 pr-4 shadow-glow">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-400/15 text-emerald-300">
            <CheckCircle2 className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs font-semibold text-white">Validé par le client</p>
            <p className="text-[10px] text-slate-400">Maison Aurèle · 09:42</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Collaboration() {
  return (
    <section id="equipe" className="relative scroll-mt-24 py-24 sm:py-32">
      <Glow className="right-[-14rem] top-1/3 -z-10 h-[34rem] w-[34rem]" color="rgba(99,102,241,0.16)" />
      <div className="mx-auto grid max-w-6xl items-center gap-16 px-4 sm:px-6 lg:grid-cols-2">
        <Reveal className="order-2 lg:order-1">
          <Workspace />
        </Reveal>

        <div className="order-1 lg:order-2">
          <SectionHeading
            align="left"
            eyebrow="Collaboration"
            title="Votre équipe, parfaitement synchronisée."
            description="Créatifs, chefs de projet, analystes et clients travaillent dans le même espace. Moins d’e-mails, moins d’allers-retours, plus de contenus publiés."
          />

          <div className="mt-10 grid gap-3 sm:grid-cols-2">
            {perks.map(({ icon: Icon, title, text }, i) => (
              <Reveal key={title} delay={i * 80}>
                <div className="group h-full rounded-3xl p-4 transition-colors duration-300 hover:bg-white/[0.03]">
                  <Icon className="h-5 w-5 text-nova-300 transition-transform duration-300 group-hover:scale-110" />
                  <p className="mt-3 text-sm font-semibold text-white">{title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-400">{text}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={200} className="mt-8 flex gap-10 border-t border-white/5 pt-8">
            <div>
              <AnimatedNumber value={42} prefix="−" suffix=" %" className="font-display text-3xl font-semibold text-white" />
              <p className="mt-1 text-xs text-slate-500">de temps de validation</p>
            </div>
            <div>
              <AnimatedNumber value={3.2} decimals={1} prefix="×" className="font-display text-3xl font-semibold text-white" />
              <p className="mt-1 text-xs text-slate-500">de contenus publiés</p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
