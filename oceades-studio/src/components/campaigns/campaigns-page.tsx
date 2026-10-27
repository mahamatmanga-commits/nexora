"use client";

import * as React from "react";
import Link from "next/link";
import { addMonths, differenceInCalendarDays, eachMonthOfInterval, endOfMonth, max as maxDate, min as minDate, parseISO, startOfMonth } from "date-fns";
import { ChevronDown, ChevronLeft, ChevronRight, Kanban, MoreHorizontal, Pencil, Plus } from "lucide-react";
import { DONE_STATUSES, STATUS_COLORS, STATUS_LABELS } from "@/lib/domain/constants";
import type { Campaign } from "@/lib/domain/types";
import { useData } from "@/lib/client/store";
import { capitalize, dayKey, fmt, parseLocal } from "@/lib/dates";
import { useCardModal } from "@/components/card/card-modal-provider";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { CampaignDialog } from "./campaign-dialog";

const MONTHS = 5;

export function CampaignsPage() {
  const { campaigns, cards } = useData();
  const { openCard } = useCardModal();
  const [dialog, setDialog] = React.useState<{ campaign: Campaign | null; n: number } | null>(null);
  const [from, setFrom] = React.useState(() => startOfMonth(addMonths(new Date(), -1)));
  const [open, setOpen] = React.useState<string | null>(null);

  const to = endOfMonth(addMonths(from, MONTHS - 1));
  const total = differenceInCalendarDays(to, from) + 1;
  const months = eachMonthOfInterval({ start: from, end: to });
  const cols = months.map((m) => `${differenceInCalendarDays(endOfMonth(m), m) + 1}fr`).join(" ");
  const visible = campaigns.filter((c) => parseISO(c.startDate) <= to && parseISO(c.endDate) >= from);
  const todayOffset = differenceInCalendarDays(new Date(), from);
  const today = dayKey(new Date());
  const active = cards.filter((c) => !c.archivedAt);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-4 lg:p-8">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold tracking-tight">Campagnes</h1>
        <button type="button" onClick={() => setDialog({ campaign: null, n: Date.now() })} className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-[13px] font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Nouvelle campagne
        </button>
      </div>

      {/* Frise chronologique */}
      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="flex items-center border-b px-2 py-1">
          <button type="button" onClick={() => setFrom((f) => addMonths(f, -1))} className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-accent" aria-label="Mois précédent">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => setFrom((f) => addMonths(f, 1))} className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-accent" aria-label="Mois suivant">
            <ChevronRight className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => setFrom(startOfMonth(addMonths(new Date(), -1)))} className="h-7 rounded-md px-2 text-[12px] text-muted-foreground hover:bg-accent">
            Aujourd'hui
          </button>
        </div>
        <div className="overflow-x-auto scrollbar-thin">
          <div className="min-w-[680px]">
            <div className="grid border-b text-[11px] text-muted-foreground" style={{ gridTemplateColumns: cols }}>
              {months.map((m) => (
                <div key={m.toISOString()} className="border-r px-3 py-1.5 last:border-r-0">
                  {capitalize(fmt(m, "MMMM yyyy"))}
                </div>
              ))}
            </div>
            <div className="relative flex flex-col gap-1.5 py-3" style={{ minHeight: 96 }}>
              <div className="pointer-events-none absolute inset-0 grid" style={{ gridTemplateColumns: cols }}>
                {months.map((m) => (
                  <div key={m.toISOString()} className="border-r border-dashed last:border-r-0" />
                ))}
              </div>
              {todayOffset >= 0 && todayOffset < total && <div className="pointer-events-none absolute inset-y-0 z-10 w-px bg-[#f87168]" style={{ left: `${((todayOffset + 0.5) / total) * 100}%` }} />}
              {visible.map((c) => {
                const s = maxDate([parseISO(c.startDate), from]);
                const e = minDate([parseISO(c.endDate), to]);
                const left = (differenceInCalendarDays(s, from) / total) * 100;
                const width = Math.max(((differenceInCalendarDays(e, s) + 1) / total) * 100, 1.2);
                return (
                  <div key={c.id} className="relative h-7 px-1">
                    <button
                      type="button"
                      onClick={() => setOpen(c.id)}
                      className="absolute top-0 flex h-7 items-center overflow-hidden whitespace-nowrap rounded-md px-2 text-[12px] font-medium text-white hover:brightness-110"
                      style={{ left: `${left}%`, width: `${width}%`, backgroundColor: c.color }}
                      title={c.name}
                    >
                      {width >= 8 && <span className="truncate">{c.name}</span>}
                    </button>
                    {width < 8 && (
                      <span className="pointer-events-none absolute top-0 flex h-7 items-center whitespace-nowrap pl-1.5 text-[12px]" style={{ left: `calc(${left + width}% + 4px)` }}>
                        {c.name}
                      </span>
                    )}
                  </div>
                );
              })}
              {!visible.length && <p className="py-4 text-center text-[13px] text-muted-foreground">Aucune campagne sur cette période.</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Liste */}
      <div className="flex flex-col divide-y overflow-hidden rounded-xl border bg-card">
        {campaigns.map((c) => {
          const items = active.filter((x) => x.campaignId === c.id).sort((a, b) => (a.scheduledAt ?? "9").localeCompare(b.scheduledAt ?? "9"));
          const done = items.filter((x) => DONE_STATUSES.includes(x.status)).length;
          const state = c.endDate < today ? "Terminée" : c.startDate <= today ? "En cours" : "À venir";
          const expanded = open === c.id;
          return (
            <div key={c.id}>
              <div className="flex items-center gap-3 px-4 py-3">
                <button type="button" onClick={() => setOpen(expanded ? null : c.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-expanded={expanded}>
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium">{c.name}</span>
                    <span className="block text-[12px] text-muted-foreground">
                      {fmt(parseISO(c.startDate), "d MMM")} → {fmt(parseISO(c.endDate), "d MMM yyyy")} · {state}
                    </span>
                  </span>
                  <span className="hidden w-40 items-center gap-2 sm:flex">
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <span className="block h-full rounded-full" style={{ width: `${items.length ? (done / items.length) * 100 : 0}%`, backgroundColor: c.color }} />
                    </span>
                    <span className="w-9 text-right text-[12px] tabular text-muted-foreground">
                      {done}/{items.length}
                    </span>
                  </span>
                  <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", expanded && "rotate-180")} />
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button type="button" className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-accent" aria-label={`Actions de ${c.name}`}>
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => setDialog({ campaign: c, n: Date.now() })}>
                      <Pencil /> Modifier
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/?campagne=${c.id}`}>
                        <Kanban /> Voir sur le tableau
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {expanded && (
                <div className="grid gap-5 border-t bg-muted/20 px-4 py-4 sm:grid-cols-[1fr_1.3fr]">
                  <dl className="flex flex-col gap-3 text-[13px]">
                    {c.objective && <Info label="Objectif">{c.objective}</Info>}
                    {c.brief && <Info label="Brief">{c.brief}</Info>}
                    {c.targetAudience && <Info label="Cible">{c.targetAudience}</Info>}
                    {c.keyMessages && <Info label="Messages clés">{c.keyMessages}</Info>}
                    {!c.objective && !c.brief && !c.targetAudience && !c.keyMessages && (
                      <button type="button" onClick={() => setDialog({ campaign: c, n: Date.now() })} className="text-left text-muted-foreground hover:text-foreground">
                        Ajouter un objectif et un brief…
                      </button>
                    )}
                  </dl>
                  <div>
                    <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">Contenus et échéances</p>
                    <div className="flex flex-col divide-y rounded-lg border bg-card">
                      {items.map((x) => (
                        <button key={x.id} type="button" onClick={() => openCard(x.id)} className="flex items-center gap-2 px-3 py-2 text-left text-[13px] hover:bg-accent/50">
                          <span className="w-14 shrink-0 text-[12px] tabular text-muted-foreground">{x.scheduledAt ? fmt(parseLocal(x.scheduledAt), "d MMM") : "—"}</span>
                          <span className="min-w-0 flex-1 truncate">{x.title}</span>
                          <span className="inline-flex shrink-0 items-center gap-1.5 text-[12px] text-muted-foreground">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[x.status] }} />
                            {STATUS_LABELS[x.status]}
                          </span>
                        </button>
                      ))}
                      {!items.length && <p className="px-3 py-3 text-[13px] text-muted-foreground">Aucun contenu. Associez des cartes depuis leur fiche.</p>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {!campaigns.length && <p className="px-4 py-10 text-center text-[13px] text-muted-foreground">Aucune campagne pour l'instant.</p>}
      </div>
      {dialog && <CampaignDialog key={dialog.n} open campaign={dialog.campaign} onOpenChange={(o) => !o && setDialog(null)} />}
    </div>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-medium text-muted-foreground">{label}</dt>
      <dd className="whitespace-pre-line">{children}</dd>
    </div>
  );
}
