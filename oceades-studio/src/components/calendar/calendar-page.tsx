"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { addDays, addMonths, addWeeks, eachDayOfInterval, endOfMonth, endOfWeek, startOfMonth, startOfWeek } from "date-fns";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  TouchSensor,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
} from "@dnd-kit/core";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Lightbulb } from "lucide-react";
import type { Card } from "@/lib/domain/types";
import { useData, useIndexes } from "@/lib/client/store";
import { useWeekSync } from "@/lib/client/use-week-sync";
import { markDragEnd } from "@/lib/client/drag-guard";
import { activityOf } from "@/lib/cards";
import { capitalize, dayKey, fmt, mondayOf, parseLocal, withDay } from "@/lib/dates";
import { EMPTY_FILTERS, matchCard, type CardFilters } from "@/lib/filters";
import { useCardModal } from "@/components/card/card-modal-provider";
import { FilterPopover } from "@/components/board/filter-popover";
import { Segmented } from "@/components/ui/misc";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalChip, DropZone, type ChipContext } from "./cal-chip";
import { ListView } from "./list-view";
import { MonthView } from "./month-view";
import { TimeGridView } from "./time-grid-view";

type Mode = "mois" | "semaine" | "jour" | "liste";

const collision: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  return hits.length ? hits : rectIntersection(args);
};

/** Calendrier éditorial : seconde vue des cartes du tableau, synchronisée en temps réel. */
export function CalendarPage() {
  const { board, cards, lists, campaigns, updateCard, createCard } = useData();
  const { labelById, campaignById, listById } = useIndexes();
  const { openCard } = useCardModal();
  const { afterDateChange } = useWeekSync();
  const [mode, setMode] = React.useState<Mode>("mois");
  const [anchor, setAnchor] = React.useState(() => new Date());
  const [filters, setFilters] = React.useState<CardFilters>(EMPTY_FILTERS);
  const [ideasOpen, setIdeasOpen] = React.useState(false);
  const [active, setActive] = React.useState<Card | null>(null);
  const [creating, setCreating] = React.useState<string | null>(null);

  React.useEffect(() => {
    try {
      const m = localStorage.getItem("oceades.calendar.mode") as Mode | null;
      if (m && ["mois", "semaine", "jour", "liste"].includes(m)) setMode(m);
    } catch {}
  }, []);
  const changeMode = (m: Mode) => {
    setMode(m);
    try {
      localStorage.setItem("oceades.calendar.mode", m);
    } catch {}
  };

  const activeListIds = new Set(lists.filter((l) => !l.archivedAt).map((l) => l.id));
  const visible = cards.filter((c) => !c.archivedAt && activeListIds.has(c.listId) && matchCard(c, filters, labelById, campaignById));
  const dated = visible.filter((c) => c.scheduledAt);
  const ideas = visible.filter((c) => !c.scheduledAt);

  const ctx: ChipContext = { colorOf: (c) => activityOf(c, labelById)?.color ?? "#596773", onOpen: openCard };

  const range =
    mode === "semaine"
      ? { start: startOfWeek(anchor, { weekStartsOn: 1 }), end: endOfWeek(anchor, { weekStartsOn: 1 }) }
      : mode === "jour"
        ? { start: anchor, end: anchor }
        : { start: startOfMonth(anchor), end: endOfMonth(anchor) };
  const inRange = dated.filter((c) => c.scheduledAt!.slice(0, 10) >= dayKey(range.start) && c.scheduledAt!.slice(0, 10) <= dayKey(range.end));

  const shift = (d: 1 | -1) => setAnchor((a) => (mode === "semaine" ? addWeeks(a, d) : mode === "jour" ? addDays(a, d) : addMonths(a, d)));
  const title = mode === "semaine" ? `${fmt(range.start, "d MMM")} – ${fmt(range.end, "d MMM yyyy")}` : mode === "jour" ? capitalize(fmt(anchor, "EEEE d MMMM yyyy")) : capitalize(fmt(anchor, "MMMM yyyy"));

  // ← → pour naviguer, T pour revenir à aujourd'hui.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea, select, [role=dialog], [role=menu]") || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowLeft") shift(-1);
      else if (e.key === "ArrowRight") shift(1);
      else if (e.key.toLowerCase() === "t") setAnchor(new Date());
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  async function onDragEnd(e: DragEndEvent) {
    const card = e.active.data.current?.card as Card | undefined;
    setActive(null);
    markDragEnd();
    const target = e.over ? String(e.over.id) : null;
    if (!card || !target) return;
    const sep = target.indexOf(":");
    const kind = sep < 0 ? target : target.slice(0, sep);
    const value = target.slice(sep + 1);
    const scheduledAt = kind === "day" ? withDay(card.scheduledAt, value) : kind === "slot" ? value : kind === "inbox" ? null : undefined;
    if (scheduledAt === undefined || scheduledAt === card.scheduledAt) return;
    const previous = card.scheduledAt;
    const ok = await updateCard(card.id, { scheduledAt });
    if (!ok) return;
    toast(scheduledAt ? `Publication déplacée au ${fmt(parseLocal(scheduledAt), "EEEE d MMMM")}` : "Date retirée", {
      action: { label: "Annuler", onClick: () => void updateCard(card.id, { scheduledAt: previous }) },
    });
    afterDateChange(card, scheduledAt);
  }

  /** Création depuis une date : la carte rejoint la liste de la semaine correspondante, sinon la liste Idées. */
  async function create(scheduledAt: string, title: string) {
    const monday = mondayOf(parseLocal(scheduledAt));
    const list =
      lists.find((l) => !l.archivedAt && l.kind === "week" && l.weekStart === monday) ?? lists.find((l) => !l.archivedAt && l.kind === "ideas") ?? lists.find((l) => !l.archivedAt);
    if (!list) return toast.error("Ce tableau n'a aucune liste.");
    const card = await createCard({ listId: list.id, title, scheduledAt, ...(filters.campaignIds.length === 1 && { campaignId: filters.campaignIds[0] }), labelIds: filters.labelIds });
    if (card) openCard(card.id);
  }

  const days = mode === "semaine" ? eachDayOfInterval(range) : [anchor];

  return (
    <DndContext sensors={sensors} collisionDetection={collision} onDragStart={(e) => setActive((e.active.data.current?.card as Card) ?? null)} onDragEnd={onDragEnd} onDragCancel={() => setActive(null)}>
      <div className="flex h-[calc(100dvh-3rem)] flex-col lg:h-dvh">
        <header className="flex h-12 shrink-0 items-center gap-1 border-b px-3">
          <button type="button" onClick={() => shift(-1)} className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-accent" aria-label="Période précédente">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => shift(1)} className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-accent" aria-label="Période suivante">
            <ChevronRight className="h-4 w-4" />
          </button>
          <h1 className="ml-1 truncate text-[15px] font-semibold" aria-live="polite">
            {title}
          </h1>
          <button type="button" onClick={() => setAnchor(new Date())} className="ml-1 hidden h-7 rounded-md px-2 text-[12px] text-muted-foreground hover:bg-accent hover:text-foreground sm:block">
            Aujourd'hui
          </button>
          <div className="ml-auto flex items-center gap-1">
            <Segmented
              value={mode}
              onChange={changeMode}
              options={[
                { value: "mois", label: "Mois" },
                { value: "semaine", label: "Semaine" },
                { value: "jour", label: "Jour" },
                { value: "liste", label: "Liste" },
              ]}
            />
            <FilterPopover filters={filters} onChange={setFilters} families={["activite", "plateforme"]} showStatus={false} tone="plain" />
            <button
              type="button"
              onClick={() => setIdeasOpen((v) => !v)}
              aria-pressed={ideasOpen}
              className={cn("inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px] text-muted-foreground hover:bg-accent hover:text-foreground", ideasOpen && "bg-accent text-foreground")}
            >
              <Lightbulb className="h-4 w-4" />
              <span className="hidden sm:inline">Idées</span>
              <span className="tabular text-[12px]">{ideas.length}</span>
            </button>
          </div>
        </header>

        <div className={cn("grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)] gap-3 p-3", ideasOpen && "lg:grid-cols-[minmax(0,1fr)_260px]")}>
          <div className="min-h-0 min-w-0 overflow-auto scrollbar-thin">
            {mode === "mois" && (
              <MonthView anchor={anchor} cards={dated} campaigns={campaigns} ctx={ctx} onCreate={(day) => setCreating(`${day}T12:00`)} onSelectDay={(d) => (setAnchor(d), changeMode("jour"))} />
            )}
            {(mode === "semaine" || mode === "jour") && (
              <TimeGridView days={days} cards={dated} campaigns={campaigns} ctx={ctx} onCreate={(slot) => setCreating(slot)} onSelectDay={mode === "semaine" ? (d) => (setAnchor(d), changeMode("jour")) : undefined} />
            )}
            {mode === "liste" && <ListView cards={inRange} ctx={ctx} lists={listById} />}
          </div>
          {ideasOpen && (
            <DropZone id="inbox" className="flex min-h-0 flex-col gap-2 rounded-lg border bg-card p-3" activeClassName="ring-2 ring-primary/40">
              <p className="text-[13px] font-semibold">Banque d'idées</p>
              <div className="-mx-1 flex flex-1 flex-col gap-1 overflow-y-auto px-1 scrollbar-thin">
                {ideas.map((c) => (
                  <CalChip key={c.id} card={c} ctx={ctx} />
                ))}
                {!ideas.length && <p className="py-6 text-center text-[12px] text-muted-foreground">Aucune idée sans date.</p>}
              </div>
            </DropZone>
          )}
        </div>
      </div>
      {creating && <QuickCreate key={creating} scheduledAt={creating} onClose={() => setCreating(null)} onCreate={(t) => create(creating, t)} boardName={board?.name ?? ""} />}
      {typeof document !== "undefined" &&
        createPortal(<DragOverlay dropAnimation={{ duration: 160 }}>{active ? <CalChip card={active} ctx={ctx} className="w-52 shadow-xl" /> : null}</DragOverlay>, document.body)}
    </DndContext>
  );
}

/** Saisie rapide du titre d'une carte créée depuis le calendrier. */
function QuickCreate({ scheduledAt, onClose, onCreate, boardName }: { scheduledAt: string; onClose: () => void; onCreate: (title: string) => Promise<unknown>; boardName: string }) {
  const [title, setTitle] = React.useState("");
  return (
    <Popover open onOpenChange={(o) => !o && onClose()}>
      <PopoverTrigger asChild>
        <span className="fixed left-1/2 top-24 h-0 w-0" />
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!title.trim()) return;
            onClose();
            await onCreate(title.trim());
          }}
          className="flex flex-col gap-2"
        >
          <p className="text-[12px] text-muted-foreground">
            {capitalize(fmt(parseLocal(scheduledAt), "EEEE d MMMM 'à' HH:mm"))} · {boardName}
          </p>
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre de la carte" aria-label="Titre de la carte" className="h-9 rounded-md border bg-card px-2.5 text-[13px] outline-none focus:ring-2 focus:ring-ring/40" />
          <button type="submit" disabled={!title.trim()} className="h-8 rounded-md bg-primary text-[13px] font-medium text-primary-foreground disabled:opacity-50">
            Créer la carte
          </button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
