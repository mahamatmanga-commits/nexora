"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import {
  CalendarDays,
  FolderKanban,
  Images,
  LayoutDashboard,
  Megaphone,
  Menu,
  Moon,
  Plus,
  Settings,
  Sparkles,
  Sun,
  Wand2,
  X,
} from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { usePostEditor } from "@/components/posts/post-editor-provider";
import { useData } from "@/lib/client/store";

const NAV = [
  { href: "/", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/calendrier", label: "Calendrier", icon: CalendarDays },
  { href: "/production", label: "Production", icon: FolderKanban },
  { href: "/campagnes", label: "Campagnes", icon: Megaphone },
  { href: "/mediatheque", label: "Médiathèque", icon: Images },
];
const SMART = [
  { href: "/assistant", label: "Assistant IA", icon: Sparkles },
  { href: "/planning", label: "Construire mon planning", icon: Wand2 },
];

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 px-2">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-oceades-800 text-white shadow-sm dark:bg-oceades-300 dark:text-oceades-950">
        <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
          <path d="M3 15c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 3 2" />
          <path d="M3 9c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 3 2" opacity=".55" />
        </svg>
      </span>
      <span className="leading-tight">
        <span className="block text-sm font-semibold tracking-tight">Océades Studio</span>
        <span className="block text-[11px] text-muted-foreground">Calendrier éditorial</span>
      </span>
    </Link>
  );
}

function NavLink({ href, label, icon: Icon, badge, onNavigate }: { href: string; label: string; icon: React.ElementType; badge?: number; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
        active && "bg-accent font-medium text-foreground",
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0", active && "text-primary")} />
      <span className="flex-1 truncate">{label}</span>
      {!!badge && <span className="rounded-full bg-primary/10 px-1.5 text-[11px] font-medium tabular text-primary">{badge}</span>}
    </Link>
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const dark = mounted && resolvedTheme === "dark";
  return (
    <Button variant="ghost" size="sm" className="w-full justify-start gap-2.5 px-2.5 text-muted-foreground" onClick={() => setTheme(dark ? "light" : "dark")}>
      {dark ? <Sun /> : <Moon />}
      {dark ? "Mode clair" : "Mode sombre"}
    </Button>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { openNew } = usePostEditor();
  const { posts } = useData();
  const toValidate = posts.filter((p) => p.status === "a_valider").length;
  return (
    <div className="flex h-full flex-col gap-5 px-3 py-4">
      <Logo />
      <Button
        className="justify-start"
        onClick={() => {
          onNavigate?.();
          openNew({});
        }}
      >
        <Plus /> Nouvelle publication
        <kbd className="ml-auto rounded border border-white/20 px-1 text-[10px] font-normal opacity-70">N</kbd>
      </Button>
      <nav className="flex flex-col gap-0.5" aria-label="Navigation principale">
        {NAV.map((item) => (
          <NavLink key={item.href} {...item} badge={item.href === "/production" ? toValidate : undefined} onNavigate={onNavigate} />
        ))}
      </nav>
      <div>
        <p className="mb-1.5 px-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">Intelligence</p>
        <nav className="flex flex-col gap-0.5" aria-label="Outils intelligents">
          {SMART.map((item) => (
            <NavLink key={item.href} {...item} onNavigate={onNavigate} />
          ))}
        </nav>
      </div>
      <div className="mt-auto flex flex-col gap-0.5 border-t pt-3">
        <NavLink href="/parametres" label="Paramètres" icon={Settings} onNavigate={onNavigate} />
        <ThemeToggle />
      </div>
    </div>
  );
}

export function Sidebar() {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();
  React.useEffect(() => setOpen(false), [pathname]);

  return (
    <>
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 border-r bg-sidebar lg:block">
        <SidebarContent />
      </aside>
      {/* Barre supérieure mobile */}
      <div className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b bg-sidebar/90 px-3 backdrop-blur lg:hidden">
        <Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="Ouvrir le menu">
          <Menu />
        </Button>
        <Logo />
      </div>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-oceades-950/40 animate-in fade-in-0" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 border-r bg-sidebar shadow-xl animate-in slide-in-from-left duration-200">
            <Button variant="ghost" size="icon-sm" className="absolute right-2 top-3" onClick={() => setOpen(false)} aria-label="Fermer le menu">
              <X />
            </Button>
            <SidebarContent onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}
