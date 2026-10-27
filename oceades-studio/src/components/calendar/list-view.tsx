"use client";

import * as React from "react";
import { isToday } from "date-fns";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/domain/constants";
import type { BoardList, Card } from "@/lib/domain/types";
import { capitalize, fmt, parseLocal, timeOf } from "@/lib/dates";
import { checklistProgress, dueState } from "@/lib/cards";
import { cn } from "@/lib/utils";
import type { ChipContext } from "./cal-chip";

/** Vue liste : cartes datées regroupées par jour. */
export function ListView({ cards, ctx, lists }: { cards: Card[]; ctx: ChipContext; lists: Map<string, BoardList> }) {
  const groups = React.useMemo(() => {
    const map = new Map<string, Card[]>();
    for (const c of cards) {
      if (!c.scheduledAt) continue;
      const k = c.scheduledAt.slice(0, 10);
      map.set(k, [...(map.get(k) ?? []), c]);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [cards]);

  if (!groups.length) return <p className="py-16 text-center text-sm text-muted-foreground">Aucune publication sur cette période.</p>;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      {groups.map(([day, list]) => {
        const date = parseLocal(`${day}T00:00`);
        return (
          <section key={day}>
            <h3 className={cn("mb-1.5 text-[12px] font-semibold text-muted-foreground", isToday(date) && "text-primary")}>{capitalize(fmt(date, "EEEE d MMMM"))}</h3>
            <div className="divide-y overflow-hidden rounded-lg border bg-card">
              {list
                .sort((a, b) => a.scheduledAt!.localeCompare(b.scheduledAt!))
                .map((c) => {
                  const p = checklistProgress(c);
                  return (
                    <button key={c.id} type="button" onClick={() => ctx.onOpen(c.id)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-accent/50">
                      <span className="w-11 shrink-0 text-[12px] tabular text-muted-foreground">{timeOf(c.scheduledAt!)}</span>
                      <span className="h-6 w-1 shrink-0 rounded-full" style={{ backgroundColor: ctx.colorOf(c) }} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px]">{c.title}</span>
                        <span className="block truncate text-[11.5px] text-muted-foreground">{lists.get(c.listId)?.name}</span>
                      </span>
                      {p.total > 0 && <span className="hidden text-[11px] tabular text-muted-foreground sm:inline">{p.done}/{p.total}</span>}
                      <span className={cn("inline-flex items-center gap-1.5 text-[12px]", dueState(c) === "late" && "text-[#f87168]")}>
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[c.status] }} />
                        {STATUS_LABELS[c.status]}
                      </span>
                    </button>
                  );
                })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
