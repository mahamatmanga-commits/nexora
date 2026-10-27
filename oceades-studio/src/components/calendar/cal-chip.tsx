"use client";

import * as React from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { STATUS_LABELS } from "@/lib/domain/constants";
import type { Card } from "@/lib/domain/types";
import { dueState } from "@/lib/cards";
import { timeOf } from "@/lib/dates";
import { cn, tint } from "@/lib/utils";
import { justDragged } from "@/lib/client/drag-guard";

export interface ChipContext {
  /** Couleur d'identification (activité de la carte). */
  colorOf: (card: Card) => string;
  onOpen: (id: string) => void;
}

/** Carte compacte du calendrier, déplaçable vers un autre jour ou créneau. */
export function CalChip({ card, ctx, variant = "line", className }: { card: Card; ctx: ChipContext; variant?: "line" | "block"; className?: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `card:${card.id}`, data: { card } });
  const color = ctx.colorOf(card);
  const due = dueState(card);
  return (
    <button
      ref={setNodeRef}
      type="button"
      {...listeners}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation();
        if (!justDragged()) ctx.onOpen(card.id);
      }}
      title={`${card.title} · ${STATUS_LABELS[card.status]}`}
      className={cn(
        "flex w-full min-w-0 touch-manipulation select-none items-center gap-1.5 overflow-hidden rounded border-l-[3px] px-1.5 text-left text-[11.5px] transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        variant === "line" ? "h-[22px]" : "h-full flex-col items-start justify-start gap-0 py-1",
        isDragging && "opacity-30",
        card.status === "publie" && "opacity-70",
        className,
      )}
      style={{ borderLeftColor: color, backgroundColor: tint(color, 0.22) }}
    >
      {card.scheduledAt && <span className="shrink-0 tabular text-[10.5px] text-muted-foreground">{timeOf(card.scheduledAt)}</span>}
      <span className={cn("min-w-0 font-medium", variant === "line" ? "truncate" : "line-clamp-2 leading-tight")}>{card.title}</span>
      {due === "late" && variant === "line" && <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-[#f87168]" aria-label="En retard" />}
    </button>
  );
}

export function DropZone({
  id,
  children,
  className,
  activeClassName = "bg-primary/10",
  ...rest
}: { id: string; children?: React.ReactNode; className?: string; activeClassName?: string } & React.HTMLAttributes<HTMLDivElement>) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={cn(className, isOver && activeClassName)} {...rest}>
      {children}
    </div>
  );
}
