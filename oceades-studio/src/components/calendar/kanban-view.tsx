"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { STATUSES, STATUS_COLORS, STATUS_LABELS, type Status } from "@/lib/domain/constants";
import type { Post } from "@/lib/domain/types";
import { fmt, parseLocal } from "@/lib/dates";
import { checklistState } from "@/lib/insights/alerts";
import { ActivityBadge } from "@/components/posts/post-badges";
import { DropZone, PostChip, type ChipContext } from "./post-chip";
import { Button } from "@/components/ui/button";

/** Kanban de production : une colonne par statut, glisser une carte change son statut. */
export function KanbanView({ posts, ctx, onCreate }: { posts: Post[]; ctx: ChipContext; onCreate: (status: Status) => void }) {
  const columns = React.useMemo(() => {
    const map = new Map<Status, Post[]>(STATUSES.map((s) => [s, []]));
    for (const p of posts) map.get(p.status)!.push(p);
    return map;
  }, [posts]);

  return (
    <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-3 scrollbar-thin sm:mx-0 sm:px-0">
      {STATUSES.map((status) => {
        const list = columns.get(status)!;
        return (
          <DropZone
            key={status}
            id={`status:${status}`}
            data-dnd-status={status}
            className="flex w-[272px] shrink-0 snap-start flex-col rounded-xl border bg-muted/40 transition-colors"
            activeClassName="bg-primary/5 ring-2 ring-primary/30"
          >
            <div className="flex items-center gap-2 px-3 py-2.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[status] }} />
              <span className="text-sm font-medium">{STATUS_LABELS[status]}</span>
              <span className="text-xs tabular text-muted-foreground">{list.length}</span>
              <Button variant="ghost" size="icon-sm" className="ml-auto h-6 w-6" onClick={() => onCreate(status)} aria-label={`Ajouter dans ${STATUS_LABELS[status]}`}>
                <Plus />
              </Button>
            </div>
            <div className="flex min-h-[120px] flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2 scrollbar-thin" style={{ maxHeight: "calc(100dvh - 260px)" }}>
              {list.map((p) => {
                const check = checklistState(p);
                return (
                  <PostChip
                    key={p.id}
                    post={p}
                    ctx={ctx}
                    variant="card"
                    footer={
                      <span className="mt-0.5 flex w-full items-center justify-between gap-2 text-[11px] text-muted-foreground">
                        <ActivityBadge activity={p.activity} />
                        <span className="tabular">{p.scheduledAt ? fmt(parseLocal(p.scheduledAt), "d MMM") : "Non planifiée"}</span>
                        <span className="tabular" title="Checklist de publication">{check.done}/{check.total} ✓</span>
                      </span>
                    }
                  />
                );
              })}
              {!list.length && <p className="px-2 py-6 text-center text-xs text-muted-foreground">Déposez une carte ici</p>}
            </div>
          </DropZone>
        );
      })}
    </div>
  );
}
