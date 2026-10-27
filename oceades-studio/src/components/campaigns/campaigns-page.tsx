"use client";

import * as React from "react";
import Link from "next/link";
import {
  addMonths,
  differenceInCalendarDays,
  eachMonthOfInterval,
  endOfMonth,
  max as maxDate,
  min as minDate,
  parseISO,
  startOfMonth,
} from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight, Megaphone, Pencil, Plus, Target, Users } from "lucide-react";
import { CAMPAIGN_KIND_LABELS, STATUSES, STATUS_COLORS, STATUS_LABELS } from "@/lib/domain/constants";
import type { Campaign } from "@/lib/domain/types";
import { useData } from "@/lib/client/store";
import { capitalize, dayKey, fmt, parseLocal, timeOf } from "@/lib/dates";
import { usePostEditor } from "@/components/posts/post-editor-provider";
import { ActivityBadge, PlatformIcon, StatusBadge } from "@/components/posts/post-badges";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DemoBadge } from "@/components/ui/badge";
import { EmptyState, PageHeader, Progress } from "@/components/ui/misc";
import { cn } from "@/lib/utils";
import { CampaignDialog } from "./campaign-dialog";

const MONTHS_VISIBLE = 5;

export function CampaignsPage() {
  const { campaigns, posts } = useData();
  const { openPost, openNew } = usePostEditor();
  const [dialog, setDialog] = React.useState<{ open: boolean; campaign: Campaign | null; n: number }>({ open: false, campaign: null, n: 0 });
  const [from, setFrom] = React.useState(() => startOfMonth(addMonths(new Date(), -1)));
  const [selected, setSelected] = React.useState<string | null>(null);

  const to = endOfMonth(addMonths(from, MONTHS_VISIBLE - 1));
  const totalDays = differenceInCalendarDays(to, from) + 1;
  const months = eachMonthOfInterval({ start: from, end: to });
  const visible = campaigns.filter((c) => parseISO(c.startDate) <= to && parseISO(c.endDate) >= from);
  const todayOffset = differenceInCalendarDays(new Date(), from);
  const today = dayKey(new Date());

  const edit = (c: Campaign | null) => setDialog((d) => ({ open: true, campaign: c, n: d.n + 1 }));

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-8">
      <PageHeader title="Campagnes" description="Planifiez vos temps forts marketing et suivez l'avancement de leurs contenus.">
        <Button onClick={() => edit(null)}>
          <Plus /> Nouvelle campagne
        </Button>
      </PageHeader>

      {/* Frise chronologique */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b px-4 py-2.5">
          <h2 className="text-sm font-semibold">Vue chronologique</h2>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" onClick={() => setFrom((f) => addMonths(f, -1))} aria-label="Mois précédent">
              <ChevronLeft />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setFrom(startOfMonth(addMonths(new Date(), -1)))}>
              Aujourd'hui
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => setFrom((f) => addMonths(f, 1))} aria-label="Mois suivant">
              <ChevronRight />
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto scrollbar-thin">
          <div className="relative min-w-[720px]">
            <div className="grid border-b bg-muted/40" style={{ gridTemplateColumns: months.map((m) => `${differenceInCalendarDays(endOfMonth(m), m) + 1}fr`).join(" ") }}>
              {months.map((m) => (
                <div key={m.toISOString()} className="border-r px-3 py-1.5 text-xs font-medium text-muted-foreground last:border-r-0">
                  {capitalize(fmt(m, "MMMM yyyy"))}
                </div>
              ))}
            </div>
            <div className="relative flex flex-col gap-1.5 py-3" style={{ minHeight: 120 }}>
              {/* séparateurs de mois */}
              <div className="pointer-events-none absolute inset-0 grid" style={{ gridTemplateColumns: months.map((m) => `${differenceInCalendarDays(endOfMonth(m), m) + 1}fr`).join(" ") }}>
                {months.map((m) => (
                  <div key={m.toISOString()} className="border-r border-dashed last:border-r-0" />
                ))}
              </div>
              {todayOffset >= 0 && todayOffset < totalDays && (
                <div className="pointer-events-none absolute inset-y-0 z-10 w-px bg-red-500" style={{ left: `${((todayOffset + 0.5) / totalDays) * 100}%` }} title="Aujourd'hui" />
              )}
              {visible.map((c) => {
                const s = maxDate([parseISO(c.startDate), from]);
                const e = minDate([parseISO(c.endDate), to]);
                const left = (differenceInCalendarDays(s, from) / totalDays) * 100;
                const width = Math.max(((differenceInCalendarDays(e, s) + 1) / totalDays) * 100, 1.2);
                const items = posts.filter((p) => p.campaignId === c.id);
                return (
                  <div key={c.id} className="relative h-8 px-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSelected(c.id);
                        document.getElementById(`campaign-${c.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
                      }}
                      className={cn(
                        "absolute top-0 flex h-8 items-center gap-1.5 overflow-hidden whitespace-nowrap rounded-md px-2 text-xs font-medium text-white shadow-sm transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        selected === c.id && "ring-2 ring-ring ring-offset-1 ring-offset-card",
                      )}
                      style={{ left: `${left}%`, width: `${width}%`, backgroundColor: c.color }}
                      title={`${c.name} · ${fmt(parseISO(c.startDate), "d MMM")} → ${fmt(parseISO(c.endDate), "d MMM")}`}
                    >
                      {width >= 8 && (
                        <>
                          <span className="truncate">{c.name}</span>
                          <span className="shrink-0 opacity-80">· {items.length}</span>
                        </>
                      )}
                    </button>
                    {width < 8 && (
                      <span className="pointer-events-none absolute top-0 flex h-8 items-center whitespace-nowrap pl-1.5 text-xs font-medium" style={{ left: `calc(${left + width}% + 4px)` }}>
                        {c.name} <span className="ml-1 text-muted-foreground">· {items.length}</span>
                      </span>
                    )}
                  </div>
                );
              })}
              {!visible.length && <p className="px-4 py-6 text-center text-sm text-muted-foreground">Aucune campagne sur cette période.</p>}
            </div>
          </div>
        </div>
      </Card>

      {/* Fiches de campagne */}
      {campaigns.length === 0 ? (
        <EmptyState icon={<Megaphone />} title="Aucune campagne">
          Créez une campagne (Black Friday, rentrée, journée portes ouvertes…) pour y rattacher vos publications.
        </EmptyState>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {campaigns.map((c) => {
            const items = posts.filter((p) => p.campaignId === c.id).sort((a, b) => (a.scheduledAt ?? "9").localeCompare(b.scheduledAt ?? "9"));
            const done = items.filter((p) => p.status === "programme" || p.status === "publie").length;
            const state = c.endDate < today ? "Terminée" : c.startDate <= today ? "En cours" : "À venir";
            return (
              <Card key={c.id} id={`campaign-${c.id}`} className={cn("flex flex-col overflow-hidden transition-shadow", selected === c.id && "ring-2 ring-ring")}>
                <div className="h-1" style={{ backgroundColor: c.color }} />
                <div className="flex flex-col gap-3 p-5">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold tracking-tight">{c.name}</h3>
                        <span className="rounded bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">{CAMPAIGN_KIND_LABELS[c.kind]}</span>
                        <span className={cn("rounded px-1.5 text-[10px] font-medium", state === "En cours" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground")}>{state}</span>
                        {c.isDemo && <DemoBadge />}
                      </div>
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {fmt(parseISO(c.startDate), "d MMMM")} → {fmt(parseISO(c.endDate), "d MMMM yyyy")}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon-sm" onClick={() => edit(c)} aria-label={`Modifier ${c.name}`}>
                      <Pencil />
                    </Button>
                  </div>
                  {c.activities.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {c.activities.map((a) => (
                        <ActivityBadge key={a} activity={a} />
                      ))}
                    </div>
                  )}
                  <dl className="grid gap-2 text-sm">
                    {c.objective && (
                      <div className="flex gap-2">
                        <dt><Target className="mt-0.5 h-4 w-4 text-muted-foreground" aria-label="Objectif" /></dt>
                        <dd>{c.objective}</dd>
                      </div>
                    )}
                    {c.targetAudience && (
                      <div className="flex gap-2">
                        <dt><Users className="mt-0.5 h-4 w-4 text-muted-foreground" aria-label="Public cible" /></dt>
                        <dd className="text-muted-foreground">{c.targetAudience}</dd>
                      </div>
                    )}
                  </dl>
                  {c.keyMessages && (
                    <ul className="list-inside list-disc space-y-0.5 rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                      {c.keyMessages.split("\n").filter(Boolean).map((m, i) => (
                        <li key={i}>{m}</li>
                      ))}
                    </ul>
                  )}
                  <div>
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="font-medium">Production</span>
                      <span className="tabular text-muted-foreground">{done}/{items.length} programmés ou publiés</span>
                    </div>
                    <Progress value={items.length ? (done / items.length) * 100 : 0} color={c.color} />
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                      {STATUSES.map((s) => {
                        const n = items.filter((p) => p.status === s).length;
                        return n ? (
                          <span key={s} className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[s] }} /> {STATUS_LABELS[s]} {n}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>
                  <div className="flex flex-col divide-y rounded-md border">
                    {items.slice(0, 6).map((p) => (
                      <button key={p.id} type="button" onClick={() => openPost(p.id)} className="flex items-center gap-2 px-3 py-2 text-left text-xs hover:bg-accent/50">
                        <span className="w-16 shrink-0 tabular text-muted-foreground">{p.scheduledAt ? `${fmt(parseLocal(p.scheduledAt), "d MMM")} ${timeOf(p.scheduledAt)}` : "—"}</span>
                        <PlatformIcon platform={p.platform} className="text-muted-foreground" />
                        <span className="min-w-0 flex-1 truncate font-medium">{p.title}</span>
                        <StatusBadge status={p.status} />
                      </button>
                    ))}
                    {items.length > 6 && <p className="px-3 py-1.5 text-[11px] text-muted-foreground">+ {items.length - 6} autre(s)</p>}
                    {!items.length && <p className="px-3 py-3 text-xs text-muted-foreground">Aucun contenu associé pour l'instant.</p>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/calendrier?campagne=${c.id}`}>
                        <CalendarDays /> Voir dans le calendrier
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        openNew({
                          campaignId: c.id,
                          activity: c.activities[0] ?? "global",
                          scheduledAt: `${c.startDate > today ? c.startDate : today}T12:00`,
                        })
                      }
                    >
                      <Plus /> Ajouter un contenu
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      <CampaignDialog key={dialog.n} open={dialog.open} campaign={dialog.campaign} onOpenChange={(open) => setDialog((d) => ({ ...d, open }))} />
    </div>
  );
}
