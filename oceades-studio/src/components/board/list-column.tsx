"use client";

import * as React from "react";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Archive, ArrowDownWideNarrow, Copy, LayoutTemplate, MoreHorizontal, Palette, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { CARD_TEMPLATES, LIST_COLORS, type CardTemplate } from "@/lib/domain/constants";
import type { BoardList, Card } from "@/lib/domain/types";
import { useData } from "@/lib/client/store";
import { between } from "@/lib/cards";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { hoverReveal } from "./bits";
import { justDragged } from "@/lib/client/drag-guard";
import { CardTile } from "./card-tile";

interface Props {
  list: BoardList;
  cards: Card[];
  totalCount: number;
  compactLabels: boolean;
  onToggleLabels: () => void;
  onOpenCard: (id: string) => void;
  dragOverlay?: boolean;
}

export function ListColumn({ list, cards, totalCount, compactLabels, onToggleLabels, onOpenCard, dragOverlay }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: list.id, data: { type: "list" } });
  const { updateList, duplicateList, createCard, updateCard, cards: allCards, labels } = useData();

  /** Crée une carte à partir d'un modèle (étiquettes, checklist et champs pré-remplis), puis l'ouvre. */
  async function fromTemplate(t: CardTemplate) {
    const card = await createCard({
      listId: list.id,
      title: t.name,
      objective: t.objective ?? null,
      hook: t.hook ?? "",
      brief: t.brief ?? "",
      script: t.script ?? "",
      checklist: t.checklist,
      labelIds: t.labels.map((k) => labels.find((l) => l.key === k)?.id).filter(Boolean) as string[],
    });
    if (card) onOpenCard(card.id);
  }
  const [renaming, setRenaming] = React.useState(false);
  const [name, setName] = React.useState(list.name);
  const [composing, setComposing] = React.useState<"top" | "bottom" | null>(null);
  const scroller = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => setName(list.name), [list.name]);

  async function commitRename() {
    setRenaming(false);
    const n = name.trim();
    if (n && n !== list.name) await updateList(list.id, { name: n });
    else setName(list.name);
  }

  async function archive() {
    const res = await updateList(list.id, { archived: true });
    if (res) toast("Liste archivée", { action: { label: "Annuler", onClick: () => void updateList(list.id, { archived: false }) } });
  }

  async function sortByDate() {
    const sorted = [...allCards.filter((c) => c.listId === list.id && !c.archivedAt)].sort((a, b) => (a.scheduledAt ?? "9999").localeCompare(b.scheduledAt ?? "9999"));
    await Promise.all(sorted.map((c, i) => ((i + 1) * 1024 !== c.position ? updateCard(c.id, { position: (i + 1) * 1024 }) : null)));
  }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn("flex max-h-full w-[272px] shrink-0 flex-col rounded-xl bg-list shadow-sm", isDragging && !dragOverlay && "opacity-40", dragOverlay && "rotate-1 shadow-2xl")}
      data-list-id={list.id}
    >
      {list.color && <div className="mx-3 mt-2 h-1 rounded-full" style={{ backgroundColor: list.color }} />}
      <div className="group flex items-center gap-1 px-2 pb-1 pt-2" {...attributes} {...listeners} aria-roledescription="liste déplaçable">
        {renaming ? (
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") {
                setName(list.name);
                setRenaming(false);
              }
              e.stopPropagation();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="h-7 flex-1 rounded-md border border-ring bg-card px-2 text-[13px] font-semibold outline-none"
            aria-label="Nom de la liste"
          />
        ) : (
          <button type="button" onClick={() => !justDragged() && setRenaming(true)} className="line-clamp-2 min-w-0 flex-1 break-words rounded-md px-2 py-1 text-left text-[13px] font-semibold leading-snug hover:bg-accent/60" title={list.name}>
            {list.name}
          </button>
        )}
        <span className="px-1 text-xs tabular text-muted-foreground" aria-label={`${totalCount} cartes`}>
          {totalCount}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className={cn("grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground", hoverReveal)} aria-label="Actions de la liste" onPointerDown={(e) => e.stopPropagation()}>
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem onSelect={() => setComposing("top")}>
              <Plus /> Ajouter une carte
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <LayoutTemplate /> Depuis un modèle
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-56">
                {CARD_TEMPLATES.map((t) => (
                  <DropdownMenuItem key={t.id} onSelect={() => fromTemplate(t)}>
                    {t.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem onSelect={sortByDate}>
              <ArrowDownWideNarrow /> Trier par date
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Palette /> Couleur
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="p-2">
                <div className="grid grid-cols-5 gap-1.5">
                  {LIST_COLORS.map((c) => (
                    <DropdownMenuItem key={c} className="h-7 w-9 p-0" onSelect={() => updateList(list.id, { color: c })} aria-label={`Couleur ${c}`}>
                      <span className="h-full w-full rounded" style={{ backgroundColor: c }} />
                    </DropdownMenuItem>
                  ))}
                </div>
                <DropdownMenuItem className="mt-1.5 justify-center text-xs" onSelect={() => updateList(list.id, { color: null })}>
                  Aucune couleur
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem onSelect={() => duplicateList(list.id)}>
              <Copy /> Dupliquer la liste
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={archive}>
              <Archive /> Archiver la liste
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div ref={scroller} className="flex min-h-[8px] flex-col gap-2 overflow-y-auto overflow-x-hidden px-2 pb-1 pt-1 scrollbar-thin">
        {composing === "top" && <Composer onClose={() => setComposing(null)} onSubmit={(title) => createCard({ listId: list.id, title, position: between(undefined, cards[0]?.position) })} />}
        <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {cards.map((c) => (
            <CardTile key={c.id} card={c} compactLabels={compactLabels} onToggleLabels={onToggleLabels} onOpen={onOpenCard} />
          ))}
        </SortableContext>
        {composing === "bottom" && (
          <Composer
            onClose={() => setComposing(null)}
            onSubmit={async (title) => {
              await createCard({ listId: list.id, title, ...(list.kind === "done" && { status: "publie" }) });
              requestAnimationFrame(() => scroller.current?.scrollTo({ top: scroller.current.scrollHeight }));
            }}
          />
        )}
      </div>
      {composing !== "bottom" && (
        <button type="button" onClick={() => setComposing("bottom")} className="mx-2 mb-2 mt-1 flex h-8 items-center gap-1.5 rounded-lg px-2 text-[13px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
          <Plus className="h-4 w-4" /> Ajouter une carte
        </button>
      )}
    </div>
  );
}

/** Saisie rapide d'une carte : Entrée ajoute et garde le champ ouvert, Échap ferme. */
function Composer({ onSubmit, onClose }: { onSubmit: (title: string) => Promise<unknown> | void; onClose: () => void }) {
  const [value, setValue] = React.useState("");
  const ref = React.useRef<HTMLTextAreaElement>(null);
  React.useEffect(() => ref.current?.focus(), []);

  async function submit() {
    const t = value.trim();
    if (!t) return onClose();
    setValue("");
    await onSubmit(t);
    ref.current?.focus();
  }

  return (
    <div className="flex flex-col gap-1.5 pb-1">
      <textarea
        ref={ref}
        value={value}
        rows={2}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void submit();
          }
          if (e.key === "Escape") onClose();
        }}
        onBlur={() => !value.trim() && onClose()}
        placeholder="Titre de la carte"
        aria-label="Titre de la nouvelle carte"
        className="w-full resize-none rounded-lg bg-tile px-2.5 py-2 text-[13px] shadow-sm outline-none ring-1 ring-border placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/60"
      />
      <div className="flex items-center gap-1">
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={submit} className="h-8 rounded-md bg-primary px-3 text-[13px] font-medium text-primary-foreground hover:bg-primary/90">
          Ajouter
        </button>
        <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-accent" aria-label="Annuler">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
