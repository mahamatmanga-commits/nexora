"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { useData, useIndexes } from "@/lib/client/store";
import { EMPTY_FILTERS, isFiltering, matchCard, type CardFilters } from "@/lib/filters";
import { useCardModal } from "@/components/card/card-modal-provider";
import { BoardCanvas } from "./board-canvas";
import { BoardMenu, BoardSwitcher } from "./board-menus";
import { FilterPopover } from "./filter-popover";
import { AlertsButton } from "./alerts";

const LABELS_KEY = "oceades.labels.compact";

export function BoardPage() {
  const { board, lists, cards } = useData();
  const { labelById, campaignById } = useIndexes();
  const { openCard } = useCardModal();
  const params = useSearchParams();
  const [filters, setFilters] = React.useState<CardFilters>(() => {
    const c = params.get("campagne");
    return c ? { ...EMPTY_FILTERS, campaignIds: [c] } : EMPTY_FILTERS;
  });
  const [compactLabels, setCompactLabels] = React.useState(false);
  const searchRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    try {
      setCompactLabels(localStorage.getItem(LABELS_KEY) === "1");
    } catch {}
  }, []);
  const toggleLabels = React.useCallback(() => {
    setCompactLabels((v) => {
      try {
        localStorage.setItem(LABELS_KEY, v ? "0" : "1");
      } catch {}
      return !v;
    });
  }, []);

  // Ouvre une carte passée dans l'URL (?carte=…), par exemple depuis le calendrier ou les campagnes.
  React.useEffect(() => {
    const id = params.get("carte");
    if (id && cards.some((c) => c.id === id)) openCard(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.get("carte"), cards.length > 0]);

  // « / » : recherche ; « Échap » dans la recherche : effacer.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || (e.target as HTMLElement).closest("input, textarea, select, [contenteditable=true], [role=dialog]")) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const activeLists = React.useMemo(() => lists.filter((l) => !l.archivedAt), [lists]);
  const activeCards = React.useMemo(() => cards.filter((c) => !c.archivedAt), [cards]);
  const filtering = isFiltering(filters);
  const visibleCards = React.useMemo(
    () => (filtering ? activeCards.filter((c) => matchCard(c, filters, labelById, campaignById)) : activeCards),
    [activeCards, filters, filtering, labelById, campaignById],
  );
  const countByList = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const c of visibleCards) m.set(c.listId, (m.get(c.listId) ?? 0) + 1);
    return m;
  }, [visibleCards]);

  if (!board) return null;

  return (
    <div className="flex h-[calc(100dvh-3rem)] flex-col lg:h-dvh" style={{ backgroundColor: board.background }}>
      <header className="flex h-12 shrink-0 items-center gap-1 bg-black/20 px-3 text-white">
        <BoardSwitcher />
        <div className="ml-auto flex items-center gap-1">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-2 h-4 w-4 text-white/60" />
            <input
              ref={searchRef}
              value={filters.query}
              onChange={(e) => setFilters({ ...filters, query: e.target.value })}
              onKeyDown={(e) => e.key === "Escape" && setFilters({ ...filters, query: "" })}
              placeholder="Rechercher"
              aria-label="Rechercher une carte"
              className="h-8 w-32 rounded-md bg-white/15 pl-8 pr-7 text-[13px] text-white outline-none transition-[width,background] placeholder:text-white/55 focus:w-56 focus:bg-white/25 sm:w-44"
            />
            {filters.query && (
              <button type="button" onClick={() => setFilters({ ...filters, query: "" })} className="absolute right-1.5 top-2 text-white/70 hover:text-white" aria-label="Effacer la recherche">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <FilterPopover filters={filters} onChange={setFilters} />
          <AlertsButton />
          <BoardMenu compactLabels={compactLabels} onToggleLabels={toggleLabels} />
        </div>
      </header>
      {filtering && (
        <div className="flex items-center gap-2 bg-black/25 px-4 py-1 text-[12px] text-white/85">
          {visibleCards.length} carte{visibleCards.length > 1 ? "s" : ""} correspondante{visibleCards.length > 1 ? "s" : ""}
          <button type="button" onClick={() => setFilters(EMPTY_FILTERS)} className="underline-offset-2 hover:underline">
            Tout afficher
          </button>
        </div>
      )}
      <div className="min-h-0 flex-1 pt-2">
        <BoardCanvas lists={activeLists} visibleCards={visibleCards} countByList={countByList} compactLabels={compactLabels} onToggleLabels={toggleLabels} onOpenCard={openCard} />
      </div>
    </div>
  );
}
