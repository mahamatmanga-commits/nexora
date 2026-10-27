"use client";

import * as React from "react";
import { subDays } from "date-fns";
import { useData } from "@/lib/client/store";
import { parseLocal } from "@/lib/dates";
import { usePostEditor } from "@/components/posts/post-editor-provider";
import { PageHeader } from "@/components/ui/misc";
import { applyFilters, EMPTY_FILTERS, FilterBar, type Filters } from "./filters";
import { DndBoard } from "./dnd-board";
import { KanbanView } from "./kanban-view";
import type { ChipContext } from "./post-chip";

/** Suivi de production : Kanban de toutes les publications (les contenus publiés il y a plus de 14 jours sont masqués). */
export function ProductionPage() {
  const { posts, campaigns } = useData();
  const { openPost, openNew } = usePostEditor();
  const [filters, setFilters] = React.useState<Filters>(EMPTY_FILTERS);
  const campaignMap = React.useMemo(() => new Map(campaigns.map((c) => [c.id, c])), [campaigns]);
  const ctx: ChipContext = { colorMode: "activity", campaigns: campaignMap, onOpen: openPost };
  const cutoff = subDays(new Date(), 14);
  const visible = applyFilters(posts, filters, campaigns).filter(
    (p) => p.status !== "publie" || !p.scheduledAt || parseLocal(p.scheduledAt) >= cutoff,
  );

  return (
    <DndBoard ctx={ctx}>
      <div className="flex flex-col gap-4 p-4 lg:p-8">
        <PageHeader title="Production" description="Faites avancer chaque contenu de l'idée à la publication : glissez une carte d'une colonne à l'autre." />
        <FilterBar filters={filters} onChange={setFilters} campaigns={campaigns} />
        <KanbanView posts={visible} ctx={ctx} onCreate={(status) => openNew({ status })} />
      </div>
    </DndBoard>
  );
}
