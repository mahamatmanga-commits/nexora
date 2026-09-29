import { useEffect, useState } from 'react'
import { ArrowRight, Menu, X } from 'lucide-react'
import Logo from '../ui/Logo'
import Button from '../ui/Button'
import { navLinks } from '../../data/content'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
  }, [open])

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4 sm:pt-5">
      <nav
        className={`glass flex w-full max-w-6xl items-center justify-between rounded-full py-2 pl-4 pr-2 transition-all duration-500 sm:pl-5 ${
          scrolled ? 'shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] !bg-ink-900/70' : ''
        }`}
      >
        <Logo />

        <ul className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <li key={link.label}>
              <a
                href={link.href}
                className="relative rounded-full px-4 py-2 text-sm text-slate-300 transition-colors duration-300 hover:bg-white/[0.05] hover:text-white"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-1.5 md:flex">
          <Button href="#" variant="ghost" size="sm">
            Connexion
          </Button>
          <Button href="#tarifs" size="sm">
            Commencer
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="grid h-10 w-10 place-items-center rounded-full text-white transition-colors hover:bg-white/10 md:hidden"
          aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {/* Mobile menu */}
      <div
        aria-hidden="true"
        onClick={() => setOpen(false)}
        className={`fixed inset-0 -z-10 bg-ink-950/70 backdrop-blur-md transition-opacity duration-500 md:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />
      <div
        className={`fixed inset-x-4 top-[84px] origin-top transition-all duration-500 md:hidden ${
          open ? 'pointer-events-auto scale-100 opacity-100' : 'pointer-events-none scale-95 opacity-0'
        }`}
      >
        <div className="glass-strong rounded-4xl p-3">
          <ul className="flex flex-col">
            {navLinks.map((link, i) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between rounded-2xl px-4 py-3.5 text-base text-slate-200 transition-colors hover:bg-white/5"
                  style={{ transitionDelay: `${i * 40}ms` }}
                >
                  {link.label}
                  <ArrowRight className="h-4 w-4 text-slate-500" />
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-2 grid grid-cols-2 gap-2 border-t border-white/5 pt-3">
            <Button href="#" variant="glass" onClick={() => setOpen(false)}>
              Connexion
            </Button>
            <Button href="#tarifs" onClick={() => setOpen(false)}>
              Commencer
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
