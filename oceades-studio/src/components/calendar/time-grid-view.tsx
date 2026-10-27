"use client";

import * as React from "react";
import { isToday } from "date-fns";
import type { Campaign, Card } from "@/lib/domain/types";
import { dayKey, fmt } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { momentsOn } from "@/lib/insights/seasonal";
import { DropZone, CalChip, type ChipContext } from "./cal-chip";

const START_HOUR = 6;
const END_HOUR = 23;
const ROW = 64; // hauteur d'une heure, en px

function minutesOf(scheduledAt: string) {
  return Number(scheduledAt.slice(11, 13)) * 60 + Number(scheduledAt.slice(14, 16));
}

/** Vue horaire (semaine ou jour). Chaque créneau d'une heure est une zone de dépôt. */
export function TimeGridView({
  days,
  cards: posts,
  campaigns,
  ctx,
  onCreate,
  onSelectDay,
}: {
  days: Date[];
  cards: Card[];
  campaigns: Campaign[];
  ctx: ChipContext;
  onCreate: (scheduledAt: string) => void;
  onSelectDay?: (d: Date) => void;
}) {
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
  const single = days.length === 1;
  const scroller = React.useRef<HTMLDivElement>(null);
  const [now, setNow] = React.useState(() => new Date());

  React.useEffect(() => {
    // Positionne la vue autour de 8h au premier affichage.
    scroller.current?.scrollTo({ top: (8 - START_HOUR) * ROW });
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const byDay = React.useMemo(() => {
    const map = new Map<string, Card[]>();
    for (const p of posts) {
      if (!p.scheduledAt) continue;
      const k = p.scheduledAt.slice(0, 10);
      map.set(k, [...(map.get(k) ?? []), p]);
    }
    return map;
  }, [posts]);

  return (
    <div className="flex h-full min-h-[560px] flex-col overflow-hidden rounded-xl border bg-card">
      {/* En-têtes de jours */}
      <div className="grid border-b bg-muted/40" style={{ gridTemplateColumns: `56px repeat(${days.length}, minmax(0, 1fr))` }}>
        <div />
        {days.map((d) => {
          const key = dayKey(d);
          const campaignsToday = campaigns.filter((c) => c.startDate <= key && c.endDate >= key);
          const moments = momentsOn(d);
          return (
            <button
              key={key}
              type="button"
              disabled={!onSelectDay}
              onClick={() => onSelectDay?.(d)}
              className={cn("flex min-w-0 flex-col items-center gap-0.5 border-l px-1 py-2 text-center", onSelectDay && "hover:bg-accent/60")}
            >
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{fmt(d, single ? "EEEE" : "EEE")}</span>
              <span className={cn("grid h-7 min-w-7 place-items-center rounded-full px-1 text-sm font-semibold tabular", isToday(d) && "bg-primary text-primary-foreground")}>
                {fmt(d, "d")}
              </span>
              <span className="flex max-w-full flex-wrap justify-center gap-1">
                {campaignsToday.slice(0, single ? 4 : 2).map((c) => (
                  <span key={c.id} className="max-w-full truncate rounded px-1 text-[10px] font-medium text-white" style={{ backgroundColor: c.color }} title={c.name}>
                    {c.name}
                  </span>
                ))}
                {single && moments.map((m) => (
                  <span key={m.id} className="text-[10px] text-muted-foreground">✦ {m.name}</span>
                ))}
              </span>
            </button>
          );
        })}
      </div>
      <div ref={scroller} className="relative flex-1 overflow-y-auto scrollbar-thin">
        <div className="relative grid" style={{ gridTemplateColumns: `56px repeat(${days.length}, minmax(0, 1fr))` }}>
          {/* Colonne des heures */}
          <div>
            {hours.map((h) => (
              <div key={h} className="relative border-b border-transparent text-right" style={{ height: ROW }}>
                <span className="absolute -top-2 right-2 text-[10px] tabular text-muted-foreground">{h}:00</span>
              </div>
            ))}
          </div>
          {days.map((d) => {
            const key = dayKey(d);
            const list = (byDay.get(key) ?? []).slice().sort((a, b) => a.scheduledAt!.localeCompare(b.scheduledAt!));
            // Regroupe par heure pour placer côte à côte les publications simultanées.
            const groups = new Map<number, Card[]>();
            for (const p of list) {
              const h = Math.min(END_HOUR - 1, Math.max(START_HOUR, Math.floor(minutesOf(p.scheduledAt!) / 60)));
              groups.set(h, [...(groups.get(h) ?? []), p]);
            }
            const nowMinutes = now.getHours() * 60 + now.getMinutes();
            return (
              <div key={key} className="relative border-l">
                {hours.map((h) => {
                  const slot = `${key}T${String(h).padStart(2, "0")}:00`;
                  return (
                    <DropZone
                      key={h}
                      id={`slot:${slot}`}
                      className="group/slot relative cursor-pointer border-b border-dashed border-border/70 transition-colors hover:bg-accent/40"
                      style={{ height: ROW }}
                      onClick={() => onCreate(slot)}
                      role="button"
                      aria-label={`Créer une publication le ${fmt(d, "d MMMM")} à ${h}h`}
                      tabIndex={-1}
                    >
                      <span className="pointer-events-none absolute left-1 top-1 hidden text-[10px] text-muted-foreground group-hover/slot:block">+ {h}:00</span>
                    </DropZone>
                  );
                })}
                {[...groups.entries()].map(([h, items]) =>
                  items.map((p, idx) => {
                    const minutes = Math.max(START_HOUR * 60, Math.min((END_HOUR - 1) * 60 + 30, minutesOf(p.scheduledAt!)));
                    const top = ((minutes - START_HOUR * 60) / 60) * ROW + 2;
                    const width = 100 / items.length;
                    return (
                      <div
                        key={p.id}
                        className="absolute z-10 px-0.5"
                        style={{ top, left: `${idx * width}%`, width: `${width}%`, height: ROW - 4 }}
                        data-hour={h}
                      >
                        <CalChip card={p} ctx={ctx} variant="block" className="h-full shadow-sm" />
                      </div>
                    );
                  }),
                )}
                {isToday(d) && nowMinutes >= START_HOUR * 60 && nowMinutes < END_HOUR * 60 && (
                  <div className="pointer-events-none absolute inset-x-0 z-20 flex items-center" style={{ top: ((nowMinutes - START_HOUR * 60) / 60) * ROW }}>
                    <span className="-ml-1 h-2 w-2 rounded-full bg-red-500" />
                    <span className="h-px flex-1 bg-red-500" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
