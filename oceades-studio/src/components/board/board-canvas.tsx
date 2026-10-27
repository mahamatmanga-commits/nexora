"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import {
  closestCenter,
  DndContext,
  DragOverlay,
  getFirstCollision,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  TouchSensor,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { arrayMove, horizontalListSortingStrategy, SortableContext, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import type { BoardList, Card } from "@/lib/domain/types";
import { useData } from "@/lib/client/store";
import { useWeekSync } from "@/lib/client/use-week-sync";
import { markDragEnd } from "@/lib/client/drag-guard";
import { between } from "@/lib/cards";
import { addDaysKey, mondayOf, weekListName } from "@/lib/dates";
import { CardFace } from "./card-tile";
import { ListColumn } from "./list-column";

interface Props {
  lists: BoardList[];
  /** Cartes visibles (après filtres), triées par position. */
  visibleCards: Card[];
  countByList: Map<string, number>;
  compactLabels: boolean;
  onToggleLabels: () => void;
  onOpenCard: (id: string) => void;
}

type Columns = Record<string, string[]>;

function buildColumns(lists: BoardList[], cards: Card[]): Columns {
  const cols: Columns = Object.fromEntries(lists.map((l) => [l.id, [] as string[]]));
  for (const c of cards) cols[c.listId]?.push(c.id);
  return cols;
}

export function BoardCanvas({ lists, visibleCards, countByList, compactLabels, onToggleLabels, onOpenCard }: Props) {
  const { cards, updateCard, updateList } = useData();
  const { afterListChange } = useWeekSync();
  const cardById = React.useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);

  const [columns, setColumns] = React.useState<Columns>(() => buildColumns(lists, visibleCards));
  const [order, setOrder] = React.useState<string[]>(() => lists.map((l) => l.id));
  const [active, setActive] = React.useState<{ type: "card" | "list"; id: string } | null>(null);
  const origin = React.useRef<string | null>(null);
  const lastOver = React.useRef<UniqueIdentifier | null>(null);

  // Hors glisser-déposer, l'affichage suit le store.
  React.useEffect(() => {
    if (active) return;
    setColumns(buildColumns(lists, visibleCards));
    setOrder(lists.map((l) => l.id));
  }, [lists, visibleCards, active]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates, keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space"] } }),
  );

  const findContainer = React.useCallback((id: UniqueIdentifier) => (String(id) in columns ? String(id) : Object.keys(columns).find((k) => columns[k].includes(String(id)))), [columns]);

  /** Détection adaptée à des conteneurs multiples (voir l'exemple « multiple containers » de dnd-kit). */
  const collision: CollisionDetection = React.useCallback(
    (args) => {
      if (active?.type === "list") {
        return closestCenter({ ...args, droppableContainers: args.droppableContainers.filter((c) => String(c.id) in columns) });
      }
      const pointer = pointerWithin(args);
      const hits = pointer.length ? pointer : rectIntersection(args);
      let overId = getFirstCollision(hits, "id");
      if (overId != null) {
        if (String(overId) in columns) {
          const ids = columns[String(overId)];
          if (ids.length) {
            overId = closestCenter({ ...args, droppableContainers: args.droppableContainers.filter((c) => ids.includes(String(c.id))) })[0]?.id ?? overId;
          }
        }
        lastOver.current = overId;
        return [{ id: overId }];
      }
      return lastOver.current ? [{ id: lastOver.current }] : [];
    },
    [active, columns],
  );

  function onDragStart(e: DragStartEvent) {
    const type = e.active.data.current?.type === "list" ? "list" : "card";
    setActive({ type, id: String(e.active.id) });
    origin.current = type === "card" ? findContainer(e.active.id) ?? null : null;
  }

  function onDragOver(e: DragOverEvent) {
    if (active?.type !== "card" || !e.over) return;
    const from = findContainer(e.active.id);
    const to = findContainer(e.over.id);
    if (!from || !to || from === to) return;
    setColumns((cols) => {
      const fromItems = cols[from].filter((id) => id !== String(e.active.id));
      const toItems = [...cols[to]];
      const overIndex = toItems.indexOf(String(e.over!.id));
      let index = toItems.length;
      if (overIndex >= 0) {
        const below = e.active.rect.current.translated && e.active.rect.current.translated.top > e.over!.rect.top + e.over!.rect.height / 2;
        index = overIndex + (below ? 1 : 0);
      }
      toItems.splice(index, 0, String(e.active.id));
      return { ...cols, [from]: fromItems, [to]: toItems };
    });
  }

  async function onDragEnd(e: DragEndEvent) {
    const current = active;
    setActive(null);
    markDragEnd();
    if (!current || !e.over) return;

    if (current.type === "list") {
      const fromIndex = order.indexOf(current.id);
      const toIndex = order.indexOf(String(e.over.id));
      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;
      const next = arrayMove(order, fromIndex, toIndex);
      setOrder(next);
      const pos = (id?: string) => lists.find((l) => l.id === id)?.position;
      await updateList(current.id, { position: between(pos(next[toIndex - 1]), pos(next[toIndex + 1])) });
      return;
    }

    const container = findContainer(current.id);
    if (!container) return;
    let ids = columns[container];
    const overIndex = ids.indexOf(String(e.over.id));
    const activeIndex = ids.indexOf(current.id);
    if (overIndex >= 0 && overIndex !== activeIndex) ids = arrayMove(ids, activeIndex, overIndex);
    setColumns((cols) => ({ ...cols, [container]: ids }));

    const index = ids.indexOf(current.id);
    const card = cardById.get(current.id);
    if (!card) return;
    const position = between(cardById.get(ids[index - 1])?.position, cardById.get(ids[index + 1])?.position);
    if (container === card.listId && Math.abs(position - card.position) < 1e-9) return;
    const moved = container !== origin.current;
    const ok = await updateCard(card.id, { listId: container, position });
    if (!ok || !moved) return;
    const target = lists.find((l) => l.id === container);
    if (target?.kind === "week") afterListChange(card, container);
    if (target?.kind === "done" && card.status !== "publie") {
      toast("Carte déplacée dans les publications.", { action: { label: "Marquer comme publiée", onClick: () => void updateCard(card.id, { status: "publie" }) } });
    }
  }

  const activeCard = active?.type === "card" ? cardById.get(active.id) : undefined;
  const activeList = active?.type === "list" ? lists.find((l) => l.id === active.id) : undefined;
  const listById = new Map(lists.map((l) => [l.id, l]));

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collision}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActive(null)}
      accessibility={{
        screenReaderInstructions: { draggable: "Appuyez sur Espace pour saisir, utilisez les flèches pour déplacer, Espace pour déposer, Échap pour annuler." },
      }}
    >
      <div className="flex h-full items-start gap-3 overflow-x-auto overflow-y-hidden px-3 pb-3 pt-1 scrollbar-thin" data-board-canvas>
        <SortableContext items={order} strategy={horizontalListSortingStrategy}>
          {order.map((id) => {
            const list = listById.get(id);
            if (!list) return null;
            const listCards = (columns[id] ?? []).map((cid) => cardById.get(cid)).filter(Boolean) as Card[];
            return (
              <ListColumn
                key={id}
                list={list}
                cards={listCards}
                totalCount={countByList.get(id) ?? listCards.length}
                compactLabels={compactLabels}
                onToggleLabels={onToggleLabels}
                onOpenCard={onOpenCard}
              />
            );
          })}
        </SortableContext>
        <AddList lists={lists} />
      </div>
      {typeof document !== "undefined" &&
        createPortal(
          <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(.2,.8,.2,1)" }}>
            {activeCard ? (
              <div className="w-[256px] cursor-grabbing">
                <CardFace card={activeCard} compactLabels={compactLabels} dragging />
              </div>
            ) : activeList ? (
              <div className="w-[272px] rotate-1 rounded-xl bg-list p-2 opacity-95 shadow-2xl">
                <p className="px-2 py-1 text-[13px] font-semibold">{activeList.name}</p>
                <div className="flex flex-col gap-2">
                  {(columns[activeList.id] ?? []).slice(0, 4).map((cid) => {
                    const c = cardById.get(cid);
                    return c ? <CardFace key={cid} card={c} compactLabels={compactLabels} /> : null;
                  })}
                </div>
              </div>
            ) : null}
          </DragOverlay>,
          document.body,
        )}
    </DndContext>
  );
}

/** Création de liste, avec suggestion de la semaine suivante. */
function AddList({ lists }: { lists: BoardList[] }) {
  const { createList } = useData();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");

  const lastWeek = lists.filter((l) => l.kind === "week" && l.weekStart).sort((a, b) => a.weekStart!.localeCompare(b.weekStart!)).pop();
  const nextMonday = lastWeek ? addDaysKey(lastWeek.weekStart!, 7) : mondayOf(new Date());
  const done = lists.find((l) => l.kind === "done");

  async function addWeek() {
    const after = lastWeek ?? lists.find((l) => l.kind === "ideas");
    const nextPos = after ? lists.filter((l) => l.position > after.position).sort((a, b) => a.position - b.position)[0]?.position : done?.position;
    await createList({ name: weekListName(nextMonday), kind: "week", weekStart: nextMonday, position: after ? between(after.position, nextPos) : undefined });
    setOpen(false);
  }

  async function submit() {
    const n = name.trim();
    if (!n) return;
    const created = await createList({ name: n });
    if (created) setName("");
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="flex h-10 w-[272px] shrink-0 items-center gap-1.5 rounded-xl bg-white/10 px-3 text-[13px] font-medium text-white/90 backdrop-blur-sm transition-colors hover:bg-white/20">
        <Plus className="h-4 w-4" /> Ajouter une liste
      </button>
    );
  }
  return (
    <div className="flex w-[272px] shrink-0 flex-col gap-2 rounded-xl bg-list p-2 shadow-sm">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") void submit();
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder="Nom de la liste"
        aria-label="Nom de la liste"
        className="h-8 rounded-md bg-tile px-2.5 text-[13px] outline-none ring-1 ring-border focus:ring-2 focus:ring-primary/60"
      />
      <div className="flex items-center gap-1">
        <button type="button" onClick={submit} className="h-8 rounded-md bg-primary px-3 text-[13px] font-medium text-primary-foreground hover:bg-primary/90">
          Ajouter
        </button>
        <button type="button" onClick={addWeek} className="h-8 truncate rounded-md px-2 text-[12px] text-muted-foreground hover:bg-accent hover:text-foreground" title={weekListName(nextMonday)}>
          + {weekListName(nextMonday).replace("Semaine du ", "Sem. ")}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="ml-auto grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-accent" aria-label="Fermer">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
