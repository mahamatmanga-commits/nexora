"use client";

import * as React from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  type CollisionDetection,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import type { Status } from "@/lib/domain/constants";
import { STATUS_LABELS } from "@/lib/domain/constants";
import type { Post } from "@/lib/domain/types";
import { useData } from "@/lib/client/store";
import { fmt, parseLocal, withDay } from "@/lib/dates";
import { PostChip, type ChipContext } from "./post-chip";

/** Dépôt sous le pointeur (intuitif dans une grille), repli sur l'intersection (clavier, tactile). */
const collision: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  return hits.length ? hits : rectIntersection(args);
};

/**
 * Contexte de glisser-déposer partagé par toutes les vues.
 * Cibles : "day:AAAA-MM-JJ" (garde l'heure), "slot:AAAA-MM-JJTHH:MM", "status:<statut>", "inbox" (retire la date).
 * Maintenir Alt (⌥) au moment du dépôt duplique la publication au lieu de la déplacer.
 */
export function DndBoard({ children, ctx }: { children: React.ReactNode; ctx: ChipContext }) {
  const { updatePost, duplicatePost } = useData();
  const [active, setActive] = React.useState<Post | null>(null);
  const altKey = React.useRef(false);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => (altKey.current = e.altKey);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", down);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", down);
    };
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 6 } }),
    useSensor(KeyboardSensor),
  );

  function onStart(e: DragStartEvent) {
    setActive((e.active.data.current?.post as Post) ?? null);
  }

  async function onEnd(e: DragEndEvent) {
    const post = e.active.data.current?.post as Post | undefined;
    setActive(null);
    const target = e.over?.id ? String(e.over.id) : null;
    if (!post || !target) return;
    const [kind, value] = [target.slice(0, target.indexOf(":") === -1 ? target.length : target.indexOf(":")), target.slice(target.indexOf(":") + 1)];

    if (kind === "status") {
      if (post.status === value) return;
      const ok = await updatePost(post.id, { status: value as Status });
      if (ok) toast.success(`« ${post.title} » → ${STATUS_LABELS[value as Status]}`);
      return;
    }

    let scheduledAt: string | null;
    if (kind === "day") scheduledAt = withDay(post.scheduledAt, value);
    else if (kind === "slot") scheduledAt = value;
    else if (kind === "inbox") scheduledAt = null;
    else return;
    if (scheduledAt === post.scheduledAt) return;

    if (altKey.current) {
      const copy = await duplicatePost(post.id, scheduledAt);
      if (copy) toast.success("Publication dupliquée");
      return;
    }
    const previous = post.scheduledAt;
    const ok = await updatePost(post.id, { scheduledAt });
    if (ok) {
      toast.success(scheduledAt ? `Déplacée au ${fmt(parseLocal(scheduledAt), "EEEE d MMMM 'à' HH:mm")}` : "Retirée du calendrier (idée non planifiée)", {
        action: { label: "Annuler", onClick: () => void updatePost(post.id, { scheduledAt: previous }) },
      });
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collision}
      onDragStart={onStart}
      onDragEnd={onEnd}
      onDragCancel={() => setActive(null)}
      accessibility={{
        screenReaderInstructions: {
          draggable: "Pour déplacer une publication, appuyez sur Espace, utilisez les flèches puis Espace pour déposer, ou Échap pour annuler.",
        },
      }}
    >
      {children}
      {/* Portail vers <body> : l'aperçu reste aligné sur le pointeur quelle que soit la mise en page. */}
      {typeof document !== "undefined" &&
        createPortal(
          <DragOverlay dropAnimation={{ duration: 180, easing: "ease-out" }}>
            {active ? <PostChip post={active} ctx={ctx} className="w-56 rotate-1 bg-card shadow-xl" /> : null}
          </DragOverlay>,
          document.body,
        )}
    </DndContext>
  );
}
