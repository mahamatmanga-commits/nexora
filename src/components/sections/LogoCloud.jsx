import Reveal from '../ui/Reveal'

const brands = ['Maison Aurèle', 'Studio Kora', 'Lumen Sport', 'Atelier Sève', 'Nordwave', 'Pixelle', 'Orbis Media', 'Célia & Co', 'Halo Agency', 'Vantage']

export default function LogoCloud() {
  return (
    <section className="relative py-10 sm:py-14">
      <Reveal className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="text-center text-xs font-medium uppercase tracking-[0.24em] text-slate-500">
          Plus de 2 400 équipes marketing pilotent leur croissance avec NOVA
        </p>
        <div className="relative mt-8 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_15%,#000_85%,transparent)]">
          <div className="flex w-max animate-marquee gap-14 pr-14 hover:[animation-play-state:paused]">
            {[...brands, ...brands].map((b, i) => (
              <span
                key={i}
                className="whitespace-nowrap font-display text-lg font-semibold tracking-tight text-slate-500/80 transition-colors duration-300 hover:text-white sm:text-xl"
              >
                {b}
              </span>
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  )
}
