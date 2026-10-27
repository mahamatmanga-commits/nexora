"use client";

import * as React from "react";
import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { Plus } from "lucide-react";
import type { Campaign, Post } from "@/lib/domain/types";
import { dayKey, fmt } from "@/lib/dates";
import { momentsBetween } from "@/lib/insights/seasonal";
import { cn, tint } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip } from "@/components/ui/tooltip";
import { DropZone, PostChip, type ChipContext } from "./post-chip";
import { postColor } from "@/components/posts/post-badges";

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MAX_VISIBLE = 2;

export function MonthView({
  anchor,
  posts,
  campaigns,
  ctx,
  onCreate,
  onSelectDay,
}: {
  anchor: Date;
  posts: Post[];
  campaigns: Campaign[];
  ctx: ChipContext;
  onCreate: (day: string) => void;
  onSelectDay: (day: Date) => void;
}) {
  const start = startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start, end });

  const byDay = React.useMemo(() => {
    const map = new Map<string, Post[]>();
    for (const p of posts) {
      if (!p.scheduledAt) continue;
      const k = p.scheduledAt.slice(0, 10);
      map.set(k, [...(map.get(k) ?? []), p]);
    }
    return map;
  }, [posts]);

  const moments = React.useMemo(() => momentsBetween(start, end), [start.getTime(), end.getTime()]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex h-full min-h-[560px] flex-col overflow-hidden rounded-xl border bg-card">
      <div className="grid grid-cols-7 border-b bg-muted/40">
        {WEEKDAYS.map((d) => (
          <div key={d} className="px-2 py-2 text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {d}
          </div>
        ))}
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-7" style={{ gridTemplateRows: `repeat(${days.length / 7}, minmax(96px, 1fr))` }}>
        {days.map((day, i) => {
          const key = dayKey(day);
          const list = byDay.get(key) ?? [];
          const inMonth = isSameMonth(day, anchor);
          const activeCampaigns = campaigns.filter((c) => c.startDate <= key && c.endDate >= key);
          // Un temps fort est signalé une seule fois : le jour où il commence (ou en début de grille s'il a déjà commencé).
          const dayMoments = moments.filter((m) => m.start === key || (i === 0 && m.start < key && m.end >= key));
          const visible = list.slice(0, MAX_VISIBLE);
          const hidden = list.length - visible.length;
          return (
            <DropZone
              key={key}
              id={`day:${key}`}
              data-dnd-day={key}
              className={cn(
                "group/cell relative flex min-w-0 flex-col gap-1 overflow-hidden border-b border-r p-1.5 transition-colors [&:nth-child(7n)]:border-r-0",
                !inMonth && "bg-muted/30",
              )}
              onDoubleClick={() => onCreate(key)}
            >
              <div className="flex items-center justify-between gap-1">
                <button
                  type="button"
                  onClick={() => onSelectDay(day)}
                  className={cn(
                    "grid h-6 min-w-6 place-items-center rounded-full px-1 text-xs tabular hover:bg-accent",
                    !inMonth && "text-muted-foreground/60",
                    isToday(day) && "bg-primary font-semibold text-primary-foreground hover:bg-primary/90",
                  )}
                  aria-label={`Voir le ${fmt(day, "EEEE d MMMM")}`}
                >
                  {fmt(day, "d")}
                </button>
                <div className="flex min-w-0 flex-1 items-center justify-end gap-1">
                  {dayMoments.slice(0, 1).map((m) => (
                    <span key={m.id} className="hidden truncate text-[10px] text-muted-foreground lg:inline" title={`Temps fort : ${m.name} (du ${m.start.slice(8)}/${m.start.slice(5, 7)} au ${m.end.slice(8)}/${m.end.slice(5, 7)})`}>
                      ✦ {m.name}
                    </span>
                  ))}
                  <button
                    type="button"
                    onClick={() => onCreate(key)}
                    className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-muted-foreground opacity-0 transition hover:bg-accent hover:text-foreground focus-visible:opacity-100 group-hover/cell:opacity-100 [@media(hover:none)]:opacity-60"
                    aria-label={`Créer une publication le ${fmt(day, "d MMMM")}`}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              {activeCampaigns.length > 0 && (
                <div className="flex gap-0.5">
                  {activeCampaigns.slice(0, 3).map((c) => (
                    <Tooltip key={c.id} content={`${c.kind === "evenement" ? "Événement" : "Campagne"} : ${c.name}`}>
                      <span
                        className="h-1 flex-1 rounded-full"
                        style={{ backgroundColor: tint(c.color, c.startDate === key || c.endDate === key ? 0.9 : 0.45) }}
                      />
                    </Tooltip>
                  ))}
                </div>
              )}
              {/* Téléphone : pastilles colorées, un appui ouvre la vue du jour. */}
              {list.length > 0 && (
                <button
                  type="button"
                  onClick={() => onSelectDay(day)}
                  className="flex flex-wrap gap-1 pt-0.5 sm:hidden"
                  aria-label={`${list.length} publication(s) le ${fmt(day, "d MMMM")}`}
                >
                  {list.slice(0, 6).map((p) => (
                    <span key={p.id} className="h-2 w-2 rounded-full" style={{ backgroundColor: postColor(p, ctx.colorMode, ctx.campaigns) }} />
                  ))}
                </button>
              )}
              <div className="hidden min-w-0 flex-col gap-0.5 sm:flex">
                {visible.map((p) => (
                  <PostChip key={p.id} post={p} ctx={ctx} variant="month" />
                ))}
                {hidden > 0 && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button type="button" className="rounded px-1.5 py-0.5 text-left text-[11px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground">
                        + {hidden} autre{hidden > 1 ? "s" : ""}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="flex w-64 flex-col gap-1">
                      <p className="mb-1 text-xs font-medium capitalize">{fmt(day, "EEEE d MMMM")}</p>
                      {list.map((p) => (
                        <PostChip key={p.id} post={p} ctx={ctx} />
                      ))}
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </DropZone>
          );
        })}
      </div>
    </div>
  );
}

export function monthRange(anchor: Date) {
  return { start: startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 }), end: addDays(endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 }), 1) };
}
