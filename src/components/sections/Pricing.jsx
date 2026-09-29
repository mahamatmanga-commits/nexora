import { useState } from 'react'
import { ArrowRight, Check } from 'lucide-react'
import SectionHeading from '../ui/SectionHeading'
import GlassCard from '../ui/GlassCard'
import Reveal from '../ui/Reveal'
import Button from '../ui/Button'
import Glow from '../ui/Glow'
import { pricing } from '../../data/content'

function BillingToggle({ yearly, onChange }) {
  return (
    <div className="glass relative inline-flex rounded-full p-1 text-sm" role="radiogroup" aria-label="Période de facturation">
      <span
        className="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-gradient-to-b from-nova-400 to-nova-600 shadow-glow transition-transform duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
        style={{ transform: yearly ? 'translateX(100%)' : 'translateX(0)' }}
      />
      {[
        { label: 'Mensuel', value: false },
        { label: 'Annuel', value: true },
      ].map((opt) => (
        <button
          key={opt.label}
          type="button"
          role="radio"
          aria-checked={yearly === opt.value}
          onClick={() => onChange(opt.value)}
          className={`relative z-10 w-32 rounded-full py-2 font-medium transition-colors duration-300 ${
            yearly === opt.value ? 'text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          {opt.label}
          {opt.value && <span className="ml-1.5 text-[11px] text-nova-100/80">−20 %</span>}
        </button>
      ))}
    </div>
  )
}

function PlanCard({ plan, yearly }) {
  const price = yearly ? plan.yearly : plan.monthly
  const featured = plan.featured

  const card = (
    <GlassCard
      interactive
      strong={featured}
      className={`flex h-full flex-col p-7 sm:p-8 ${featured ? 'rounded-[calc(2rem-1px)]' : ''}`}
    >
      {featured && <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-72 -translate-x-1/2 rounded-full bg-nova-500/30 blur-3xl" />}
      <div className="relative flex items-center justify-between">
        <h3 className="text-lg font-semibold">{plan.name}</h3>
        {featured && (
          <span className="rounded-full bg-nova-500/15 px-3 py-1 text-[11px] font-semibold text-nova-200 ring-1 ring-inset ring-nova-300/30">
            Le plus populaire
          </span>
        )}
      </div>
      <p className="relative mt-2 min-h-[40px] text-sm leading-relaxed text-slate-400">{plan.description}</p>

      <div className="relative mt-8 flex items-end gap-1.5">
        <span className="font-display text-5xl font-semibold tracking-tight text-white">
          <span key={price} className="inline-block animate-[fadeUp_0.5s_cubic-bezier(0.2,0.8,0.2,1)]">
            {price}
          </span>
          <span className="ml-1 text-3xl">€</span>
        </span>
        <span className="mb-1.5 text-sm text-slate-500">/ mois</span>
      </div>
      <p className="relative mt-1 h-4 text-xs text-slate-500">{yearly ? `Facturé ${price * 12} € par an` : 'Sans engagement'}</p>

      <Button
        href="#"
        variant={featured ? 'primary' : 'glass'}
        className="relative mt-8 w-full"
      >
        {plan.cta}
        <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
      </Button>

      <div className="hairline relative my-8 opacity-60" />

      <ul className="relative space-y-3.5">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-3 text-sm text-slate-300">
            <span
              className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full ${
                featured ? 'bg-nova-400/25 text-nova-200' : 'bg-white/[0.07] text-slate-300'
              }`}
            >
              <Check className="h-2.5 w-2.5" strokeWidth={3} />
            </span>
            {f}
          </li>
        ))}
      </ul>
    </GlassCard>
  )

  if (!featured) return card

  // Featured plan: luminous animated border around the glass card.
  return (
    <div className="relative h-full rounded-4xl p-px lg:-my-4">
      <div className="absolute inset-0 overflow-hidden rounded-4xl">
        <div className="absolute left-1/2 top-1/2 aspect-square w-[200%] -translate-x-1/2 -translate-y-1/2 animate-spin-slow bg-[conic-gradient(from_0deg,transparent_0deg,rgba(124,196,255,0.9)_50deg,transparent_120deg,transparent_200deg,rgba(43,134,255,0.8)_250deg,transparent_320deg)] [animation-duration:8s]" />
      </div>
      <div className="absolute -inset-6 -z-10 rounded-[3rem] bg-nova-600/20 blur-3xl" />
      <div className="relative h-full rounded-[calc(2rem-1px)] bg-ink-900">{card}</div>
    </div>
  )
}

export default function Pricing() {
  const [yearly, setYearly] = useState(true)
  return (
    <section id="tarifs" className="relative scroll-mt-24 py-24 sm:py-32">
      <Glow className="left-1/2 top-1/2 -z-10 h-[40rem] w-[60rem] -translate-x-1/2 -translate-y-1/2" color="rgba(31,107,255,0.18)" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Tarifs"
          title="Un plan pour chaque ambition."
          description="Commencez gratuitement pendant 14 jours. Changez de formule à tout moment, sans frais cachés."
        />

        <Reveal delay={200} className="mt-10 flex justify-center">
          <BillingToggle yearly={yearly} onChange={setYearly} />
        </Reveal>

        <div className="mt-16 grid items-stretch gap-5 lg:grid-cols-3 lg:gap-6">
          {pricing.map((plan, i) => (
            <Reveal key={plan.name} delay={i * 100} className={plan.featured ? 'lg:z-10' : ''}>
              <PlanCard plan={plan} yearly={yearly} />
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-12 text-center text-sm text-slate-500">
          Besoin d’un plan Enterprise avec hébergement dédié ?{' '}
          <a href="#contact" className="font-medium text-nova-300 underline-offset-4 transition-colors hover:text-nova-200 hover:underline">
            Contactez notre équipe
          </a>
        </Reveal>
      </div>
    </section>
  )
}
