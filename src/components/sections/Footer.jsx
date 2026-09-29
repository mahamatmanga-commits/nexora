import { ArrowRight } from 'lucide-react'
import Logo from '../ui/Logo'
import { footerColumns } from '../../data/content'
import { Instagram, LinkedIn, TikTok, XIcon, YouTube } from '../ui/BrandIcons'

const socials = [
  { icon: LinkedIn, label: 'LinkedIn' },
  { icon: Instagram, label: 'Instagram' },
  { icon: XIcon, label: 'X' },
  { icon: TikTok, label: 'TikTok' },
  { icon: YouTube, label: 'YouTube' },
]

export default function Footer() {
  return (
    <footer className="relative mt-8 border-t border-white/5">
      <div className="hairline absolute inset-x-0 top-0" />
      <div className="mx-auto max-w-6xl px-4 pb-10 pt-16 sm:px-6 sm:pt-20">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_2.6fr]">
          <div>
            <Logo />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-slate-400">
              Le centre de contrôle des équipes marketing et communication.
            </p>

            <form className="mt-8 max-w-sm" onSubmit={(e) => e.preventDefault()}>
              <label htmlFor="newsletter" className="text-xs font-medium text-slate-300">
                La newsletter des marketeurs data-driven
              </label>
              <div className="glass mt-3 flex items-center rounded-full p-1 transition-shadow focus-within:shadow-glow">
                <input
                  id="newsletter"
                  type="email"
                  required
                  placeholder="vous@entreprise.com"
                  className="min-w-0 flex-1 bg-transparent px-4 text-sm text-white placeholder:text-slate-500 focus:outline-none"
                />
                <button
                  type="submit"
                  aria-label="S’inscrire"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-b from-nova-400 to-nova-600 text-white shadow-glow transition-transform hover:scale-105"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </form>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {footerColumns.map((col) => (
              <div key={col.title}>
                <p className="text-sm font-semibold text-white">{col.title}</p>
                <ul className="mt-4 space-y-3">
                  {col.links.map((l) => (
                    <li key={l}>
                      <a href="#" className="text-sm text-slate-400 transition-colors duration-300 hover:text-white">
                        {l}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 flex flex-col-reverse items-start justify-between gap-6 border-t border-white/5 pt-8 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-500">
            <span>© {new Date().getFullYear()} NOVA Technologies SAS</span>
            {['Mentions légales', 'Confidentialité', 'CGU', 'Cookies'].map((l) => (
              <a key={l} href="#" className="transition-colors hover:text-slate-300">
                {l}
              </a>
            ))}
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              Tous les systèmes opérationnels
            </span>
          </div>
          <div className="flex gap-2">
            {socials.map(({ icon: Icon, label }) => (
              <a
                key={label}
                href="#"
                aria-label={label}
                className="glass grid h-9 w-9 place-items-center rounded-full text-slate-400 transition-all duration-300 hover:-translate-y-0.5 hover:text-white hover:shadow-glow"
              >
                <Icon className="h-3.5 w-3.5" />
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* oversized wordmark */}
      <div aria-hidden="true" className="pointer-events-none select-none overflow-hidden">
        <p
          className="-mb-[0.22em] text-center font-display text-[26vw] font-bold leading-none tracking-[-0.06em] text-transparent"
          style={{
            backgroundImage: 'linear-gradient(180deg, rgba(124,196,255,0.12), transparent 75%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextStroke: '1px rgba(124,196,255,0.08)',
          }}
        >
          NOVA
        </p>
      </div>
    </footer>
  )
}
