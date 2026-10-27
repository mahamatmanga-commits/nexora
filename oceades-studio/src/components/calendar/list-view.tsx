"use client";

import * as React from "react";
import { isToday } from "date-fns";
import { AlertCircle, CalendarPlus, Inbox } from "lucide-react";
import { STATUSES, STATUS_COLORS, STATUS_LABELS, type Status } from "@/lib/domain/constants";
import type { Campaign, Post } from "@/lib/domain/types";
import { capitalize, fmt, parseLocal, timeOf } from "@/lib/dates";
import { checklistState, deadlineLevel } from "@/lib/insights/alerts";
import { cn, tint } from "@/lib/utils";
import { ActivityBadge, FormatLabel, PlatformLabel, postColor } from "@/components/posts/post-badges";
import { DemoBadge } from "@/components/ui/badge";
import { EmptyState, Progress } from "@/components/ui/misc";
import type { ChipContext } from "./post-chip";

/** Vue liste : publications regroupées par jour, avec changement de statut en ligne. */
export function ListView({
  posts,
  ctx,
  campaigns,
  onStatusChange,
}: {
  posts: Post[];
  ctx: ChipContext;
  campaigns: Map<string, Campaign>;
  onStatusChange: (id: string, status: Status) => void;
}) {
  const groups = React.useMemo(() => {
    const map = new Map<string, Post[]>();
    for (const p of posts) {
      const k = p.scheduledAt ? p.scheduledAt.slice(0, 10) : "__none__";
      map.set(k, [...(map.get(k) ?? []), p]);
    }
    return [...map.entries()].sort(([a], [b]) => (a === "__none__" ? 1 : b === "__none__" ? -1 : a.localeCompare(b)));
  }, [posts]);

  if (!posts.length) {
    return (
      <EmptyState icon={<Inbox />} title="Aucune publication sur cette période">
        Modifiez les filtres ou créez une publication avec le bouton « Nouvelle publication ».
      </EmptyState>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {groups.map(([day, list]) => {
        const date = day === "__none__" ? null : parseLocal(`${day}T00:00`);
        return (
          <section key={day}>
            <h3 className="sticky top-0 z-10 mb-1.5 flex items-center gap-2 bg-background/90 py-1 text-xs font-semibold backdrop-blur">
              {date ? (
                <>
                  <span className={cn(isToday(date) && "text-primary")}>{capitalize(fmt(date, "EEEE d MMMM"))}</span>
                  {isToday(date) && <span className="rounded bg-primary px-1.5 text-[10px] text-primary-foreground">Aujourd'hui</span>}
                </>
              ) : (
                <span className="text-muted-foreground">Idées non planifiées</span>
              )}
              <span className="font-normal text-muted-foreground">· {list.length}</span>
            </h3>
            <div className="divide-y overflow-hidden rounded-xl border bg-card">
              {list.map((p) => {
                const deadline = deadlineLevel(p);
                const check = checklistState(p);
                const campaign = p.campaignId ? campaigns.get(p.campaignId) : null;
                return (
                  <div
                    key={p.id}
                    className="group grid cursor-pointer grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1.5 px-3 py-2.5 transition-colors hover:bg-accent/50 md:grid-cols-[52px_minmax(0,1fr)_120px_110px_96px_150px]"
                    onClick={() => ctx.onOpen(p.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && ctx.onOpen(p.id)}
                  >
                    <span className="flex items-center gap-2 text-xs tabular text-muted-foreground">
                      <span className="h-8 w-1 rounded-full" style={{ backgroundColor: postColor(p, ctx.colorMode, campaigns) }} />
                      {p.scheduledAt ? timeOf(p.scheduledAt) : "—"}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-medium">{p.title}</span>
                        {p.isDemo && <DemoBadge />}
                        {deadline && <AlertCircle className={cn("h-3.5 w-3.5 shrink-0", deadline === "late" ? "text-red-500" : "text-amber-500")} />}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {p.hook || p.description || "Pas encore de texte"}
                        {campaign && <span className="ml-1.5" style={{ color: campaign.color }}>· {campaign.name}</span>}
                      </p>
                    </div>
                    <div className="col-start-2 flex flex-wrap items-center gap-2 md:col-start-auto">
                      <ActivityBadge activity={p.activity} />
                    </div>
                    <div className="col-start-2 flex items-center gap-2 md:col-start-auto md:flex-col md:items-start md:gap-0.5">
                      <PlatformLabel platform={p.platform} />
                      <FormatLabel format={p.format} />
                    </div>
                    <div className="col-start-2 md:col-start-auto" title={`Checklist ${check.done}/${check.total}`}>
                      <Progress value={(check.done / check.total) * 100} color={check.complete ? "#0ca678" : undefined} className="w-20" />
                    </div>
                    <div className="col-start-2 md:col-start-auto" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={p.status}
                        aria-label="Statut"
                        onChange={(e) => onStatusChange(p.id, e.target.value as Status)}
                        className="h-7 w-full max-w-[150px] cursor-pointer rounded-md border-0 px-2 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        style={{ backgroundColor: tint(STATUS_COLORS[p.status], 0.14), color: STATUS_COLORS[p.status] }}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export function ListEmptyHint() {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <CalendarPlus className="h-3.5 w-3.5" /> Double-cliquez sur un jour du calendrier pour créer une publication.
    </span>
  );
}
