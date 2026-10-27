"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import {
  BarChart3,
  CalendarDays,
  Images,
  Kanban,
  Megaphone,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Sparkles,
  Sun,
} from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/tooltip";

const NAV = [
  { href: "/", label: "Tableau éditorial", icon: Kanban },
  { href: "/calendrier", label: "Calendrier", icon: CalendarDays },
  { href: "/campagnes", label: "Campagnes", icon: Megaphone },
  { href: "/assistant", label: "Assistant IA", icon: Sparkles },
  { href: "/mediatheque", label: "Médiathèque", icon: Images },
  { href: "/statistiques", label: "Statistiques", icon: BarChart3 },
];

const COLLAPSE_KEY = "oceades.sidebar.collapsed";

function Logo({ compact }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex h-8 items-center gap-2.5 px-1.5" aria-label="Océades Studio">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-[#203849] text-white ring-1 ring-white/10">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
          <path d="M3 15c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 3 2" />
          <path d="M3 9c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 3 2" opacity=".55" />
        </svg>
      </span>
      {!compact && <span className="truncate text-sm font-semibold tracking-tight">Océades Studio</span>}
    </Link>
  );
}

function NavItem({ href, label, icon: Icon, compact, onNavigate }: { href: string; label: string; icon: React.ElementType; compact: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
  const link = (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      aria-label={compact ? label : undefined}
      className={cn(
        "flex h-8 items-center gap-2.5 rounded-md px-2 text-[13px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
        active && "bg-accent text-foreground",
        compact && "justify-center px-0",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!compact && <span className="truncate">{label}</span>}
    </Link>
  );
  return compact ? (
    <Tooltip content={label} side="right">
      {link}
    </Tooltip>
  ) : (
    link
  );
}

function ThemeButton({ compact }: { compact: boolean }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const dark = !mounted || resolvedTheme === "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? "light" : "dark")}
      className={cn("flex h-8 items-center gap-2.5 rounded-md px-2 text-[13px] text-muted-foreground hover:bg-accent hover:text-foreground", compact && "justify-center px-0")}
      aria-label={dark ? "Passer en mode clair" : "Passer en mode sombre"}
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      {!compact && (dark ? "Mode clair" : "Mode sombre")}
    </button>
  );
}

function Content({ compact, onNavigate, onToggle }: { compact: boolean; onNavigate?: () => void; onToggle?: () => void }) {
  return (
    <div className="flex h-full flex-col gap-4 px-2 py-3">
      <Logo compact={compact} />
      <nav className="flex flex-col gap-0.5" aria-label="Navigation principale">
        {NAV.map((n) => (
          <NavItem key={n.href} {...n} compact={compact} onNavigate={onNavigate} />
        ))}
      </nav>
      <div className="mt-auto flex flex-col gap-0.5">
        <NavItem href="/parametres" label="Paramètres" icon={Settings} compact={compact} onNavigate={onNavigate} />
        <ThemeButton compact={compact} />
        {onToggle && (
          <button
            type="button"
            onClick={onToggle}
            className={cn("flex h-8 items-center gap-2.5 rounded-md px-2 text-[13px] text-muted-foreground hover:bg-accent hover:text-foreground", compact && "justify-center px-0")}
            aria-label={compact ? "Déplier le menu" : "Replier le menu"}
          >
            {compact ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            {!compact && "Replier"}
          </button>
        )}
      </div>
    </div>
  );
}

export function Sidebar() {
  const [compact, setCompact] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();
  React.useEffect(() => setOpen(false), [pathname]);
  React.useEffect(() => {
    try {
      setCompact(localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {}
  }, []);
  const toggle = () =>
    setCompact((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1");
      } catch {}
      return !c;
    });

  return (
    <>
      <aside className={cn("sticky top-0 hidden h-dvh shrink-0 border-r bg-sidebar transition-[width] duration-200 lg:block", compact ? "w-14" : "w-52")}>
        <Content compact={compact} onToggle={toggle} />
      </aside>
      <div className="sticky top-0 z-40 flex h-12 items-center gap-1 border-b bg-sidebar px-2 lg:hidden">
        <button type="button" onClick={() => setOpen(true)} className="grid h-9 w-9 place-items-center rounded-md hover:bg-accent" aria-label="Ouvrir le menu">
          <Menu className="h-5 w-5" />
        </button>
        <Logo />
      </div>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50 animate-in fade-in-0" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-60 border-r bg-sidebar shadow-xl animate-in slide-in-from-left duration-200">
            <Content compact={false} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}
