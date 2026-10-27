"use client";

import * as React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CheckSquare, Clock, GitBranch, MessageSquare, Paperclip } from "lucide-react";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/domain/constants";
import type { Card } from "@/lib/domain/types";
import { mediaUrl, useIndexes } from "@/lib/client/store";
import { cardLabels, checklistProgress, dueState, labelKey } from "@/lib/cards";
import { fmt, parseLocal } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { justDragged } from "@/lib/client/drag-guard";
import { Avatar, LabelPill, PlatformGlyph } from "./bits";

/** Familles d'étiquettes affichées en pastilles sur la carte (les plateformes apparaissent en icônes). */
const FACE_FAMILIES = new Set(["activite", "format", "production", "autre"]);
const FAMILY_ORDER = ["activite", "format", "production", "autre", "plateforme"];

export function CardFace({ card, compactLabels, onToggleLabels, dragging }: { card: Card; compactLabels: boolean; onToggleLabels?: () => void; dragging?: boolean }) {
  const { labelById, memberById, mediaById } = useIndexes();
  const labels = cardLabels(card, labelById)
    .filter((l) => FACE_FAMILIES.has(l.family))
    .sort((a, b) => FAMILY_ORDER.indexOf(a.family) - FAMILY_ORDER.indexOf(b.family) || a.position - b.position);
  const platforms = cardLabels(card, labelById, "plateforme");
  const cover = card.coverMediaId ? mediaById.get(card.coverMediaId) : undefined;
  const due = dueState(card);
  const check = checklistProgress(card);
  const assignee = card.assigneeId ? memberById.get(card.assigneeId) : undefined;
  const hasFooter = card.scheduledAt || platforms.length || (check.total && check.done) || card.commentCount || card.attachmentIds.length || assignee || card.parentCardId;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg bg-tile text-[13px] shadow-[0_1px_1px_rgba(9,30,66,0.25)] ring-1 ring-black/5 transition-shadow dark:ring-white/[0.06]",
        "group-hover/card:ring-2 group-hover/card:ring-primary/60",
        dragging && "rotate-[2deg] shadow-xl ring-2 ring-primary/70",
        card.status === "publie" && "opacity-80",
      )}
    >
      {cover && (
        <div className="h-[132px] w-full overflow-hidden bg-muted">
          {cover.mimeType.startsWith("video/") ? (
            <video src={`${mediaUrl(cover.id)}#t=0.5`} preload="metadata" muted playsInline className="h-full w-full object-cover" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mediaUrl(cover.id)} alt="" loading="lazy" draggable={false} className="h-full w-full object-cover" />
          )}
        </div>
      )}
      <div className="flex flex-col gap-1.5 px-2.5 pb-2 pt-2">
        {labels.length > 0 && (
          <div
            className="flex flex-wrap gap-1"
            onClick={(e) => {
              if (!onToggleLabels) return;
              e.stopPropagation();
              onToggleLabels();
            }}
          >
            {labels.slice(0, 5).map((l) => (
              <LabelPill key={l.id} label={l} compact={compactLabels} />
            ))}
          </div>
        )}
        <p className="break-words leading-snug">{card.title}</p>
        {hasFooter ? (
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-muted-foreground">
            {card.scheduledAt && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded px-1 py-0.5",
                  due === "late" && "bg-[#ae2e24] text-white",
                  due === "soon" && "bg-[#7f5f01] text-white",
                  due === "done" && "bg-[#216e4e] text-white",
                )}
                title={STATUS_LABELS[card.status]}
              >
                <Clock className="h-3 w-3" />
                {fmt(parseLocal(card.scheduledAt), "d MMM")}
              </span>
            )}
            {card.status !== "idee" && card.status !== "publie" && (
              <span className="inline-flex items-center gap-1" title="Statut de production">
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[card.status] }} />
                {STATUS_LABELS[card.status]}
              </span>
            )}
            {platforms.length > 0 && (
              <span className="inline-flex items-center gap-1" title={platforms.map((p) => p.name).join(", ")}>
                {platforms.slice(0, 4).map((p) => (
                  <PlatformGlyph key={p.id} platform={labelKey(p)} className="h-3 w-3" />
                ))}
              </span>
            )}
            {check.total > 0 && check.done > 0 && (
              <span className={cn("inline-flex items-center gap-1", check.done === check.total && "rounded bg-[#216e4e] px-1 text-white")}>
                <CheckSquare className="h-3 w-3" />
                {check.done}/{check.total}
              </span>
            )}
            {card.commentCount > 0 && (
              <span className="inline-flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                {card.commentCount}
              </span>
            )}
            {card.attachmentIds.length > 0 && (
              <span className="inline-flex items-center gap-1">
                <Paperclip className="h-3 w-3" />
                {card.attachmentIds.length}
              </span>
            )}
            {card.parentCardId && <GitBranch className="h-3 w-3" aria-label="Déclinaison" />}
            {assignee && <Avatar member={assignee} size={22} className="ml-auto" />}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Carte déplaçable dans une liste. */
export function CardTile({ card, compactLabels, onToggleLabels, onOpen }: { card: Card; compactLabels: boolean; onToggleLabels: () => void; onOpen: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id, data: { type: "card", listId: card.listId } });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn("group/card cursor-pointer touch-manipulation outline-none", isDragging && "opacity-40")}
      {...attributes}
      {...listeners}
      role="button"
      aria-label={card.title}
      onClick={() => !justDragged() && onOpen(card.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onOpen(card.id);
        listeners?.onKeyDown?.(e);
      }}
      data-card-id={card.id}
    >
      <CardFace card={card} compactLabels={compactLabels} onToggleLabels={onToggleLabels} />
    </div>
  );
}
