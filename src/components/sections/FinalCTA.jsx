import { ArrowRight } from 'lucide-react'
import Button from '../ui/Button'
import Reveal from '../ui/Reveal'
import { usePointerGlow } from '../../hooks/usePointerGlow'

export default function FinalCTA() {
  const onPointerMove = usePointerGlow()
  return (
    <section id="contact" className="relative scroll-mt-24 px-4 py-24 sm:px-6 sm:py-32">
      <Reveal className="mx-auto max-w-6xl">
        <div
          onPointerMove={onPointerMove}
          className="glass-strong group relative isolate overflow-hidden rounded-[2.5rem] px-6 py-20 text-center sm:rounded-[3rem] sm:px-12 sm:py-28"
        >
          {/* light: horizon arc */}
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(80%_60%_at_50%_120%,rgba(43,134,255,0.45),transparent_70%)]" />
          <div className="absolute left-1/2 top-[62%] -z-10 aspect-square w-[160%] -translate-x-1/2 rounded-full border border-nova-300/25 shadow-[0_-20px_80px_-10px_rgba(71,166,255,0.45),inset_0_20px_60px_-20px_rgba(124,196,255,0.35)] sm:w-[110%]" />
          <div className="grid-bg absolute inset-0 -z-10 opacity-60" />
          <div className="spotlight pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-700 group-hover:opacity-100" />

          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-nova-300">Prêt à décoller ?</p>
          <h2 className="text-gradient mx-auto mt-6 max-w-3xl text-balance text-4xl font-semibold leading-[1.05] sm:text-6xl lg:text-7xl">
            Prenez le contrôle de votre marketing.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-balance text-base text-slate-400 sm:text-lg">
            Rejoignez les 2 400 équipes qui décident plus vite, publient mieux et prouvent leur impact avec NOVA.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button href="#tarifs" size="lg" className="w-full sm:w-auto">
              Commencer gratuitement
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Button>
            <Button href="#" variant="glass" size="lg" className="w-full sm:w-auto">
              Réserver une démo
            </Button>
          </div>
        </div>
      </Reveal>
    </section>
  )
}
