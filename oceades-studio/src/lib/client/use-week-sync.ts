"use client";

import * as React from "react";
import { toast } from "sonner";
import type { Card } from "@/lib/domain/types";
import { addDaysKey, mondayOf, parseLocal, weekListName } from "@/lib/dates";
import { useData } from "./store";

/**
 * Cohérence entre listes hebdomadaires et dates de publication.
 * Rien n'est fait automatiquement : une notification propose l'action.
 */
export function useWeekSync() {
  const { lists, cards, createList, updateCard } = useData();
  const cardsRef = React.useRef(cards);
  cardsRef.current = cards;
  const listsRef = React.useRef(lists);
  listsRef.current = lists;

  /** Après un changement de date : proposer de ranger la carte dans la bonne semaine. */
  const afterDateChange = React.useCallback(
    (card: Card, scheduledAt: string | null) => {
      if (!scheduledAt) return;
      const current = listsRef.current.find((l) => l.id === card.listId);
      if (!current || current.kind !== "week") return;
      const monday = mondayOf(parseLocal(scheduledAt));
      if (current.weekStart === monday) return;
      const target = listsRef.current.find((l) => l.kind === "week" && l.weekStart === monday && !l.archivedAt);
      const name = weekListName(monday);
      toast(`La date tombe dans la ${name.charAt(0).toLowerCase()}${name.slice(1)}.`, {
        duration: 8000,
        action: {
          label: target ? "Déplacer" : "Créer la liste et déplacer",
          onClick: async () => {
            let listId = target?.id;
            if (!listId) {
              const after = listsRef.current.filter((l) => l.kind === "week" && l.weekStart && l.weekStart < monday && !l.archivedAt).pop();
              const next = after ? listsRef.current.filter((l) => l.position > after.position)[0] : undefined;
              const created = await createList({
                name,
                kind: "week",
                weekStart: monday,
                position: after ? (next ? (after.position + next.position) / 2 : after.position + 1024) : undefined,
              });
              listId = created?.id;
            }
            if (!listId) return;
            const last = Math.max(0, ...cardsRef.current.filter((c) => c.listId === listId).map((c) => c.position));
            await updateCard(card.id, { listId, position: last + 1024 });
          },
        },
      });
    },
    [createList, updateCard],
  );

  /** Après un déplacement vers une liste hebdomadaire : proposer d'ajuster la date. */
  const afterListChange = React.useCallback(
    (card: Card, listId: string) => {
      const target = listsRef.current.find((l) => l.id === listId);
      if (!target || target.kind !== "week" || !target.weekStart || !card.scheduledAt) return;
      const date = parseLocal(card.scheduledAt);
      if (mondayOf(date) === target.weekStart) return;
      const offset = (date.getDay() + 6) % 7;
      const next = `${addDaysKey(target.weekStart, offset)}T${card.scheduledAt.slice(11, 16)}`;
      toast("La date de publication ne correspond pas à cette semaine.", {
        duration: 8000,
        action: { label: "Ajuster la date", onClick: () => void updateCard(card.id, { scheduledAt: next }) },
      });
    },
    [updateCard],
  );

  return { afterDateChange, afterListChange };
}
