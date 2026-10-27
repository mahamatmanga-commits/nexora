import { differenceInCalendarDays, differenceInHours } from "date-fns";
import { DONE_STATUSES, type LabelFamily } from "@/lib/domain/constants";
import type { Card, Label } from "@/lib/domain/types";
import { parseLocal } from "@/lib/dates";
import { normalize } from "@/lib/utils";

/** Accès aux étiquettes d'une carte par famille (activité, plateforme, format…). */
export function cardLabels(card: Pick<Card, "labelIds">, labelById: Map<string, Label>, family?: LabelFamily): Label[] {
  const out: Label[] = [];
  for (const id of card.labelIds) {
    const l = labelById.get(id);
    if (l && (!family || l.family === family)) out.push(l);
  }
  return out;
}

/** Clé métier d'une étiquette (« fitness », « reel »…) ou, pour une étiquette personnalisée, son nom normalisé. */
export function labelKey(l: Label): string {
  return l.key ?? normalize(l.name).replace(/[^a-z0-9]+/g, "_");
}

export function familyKeys(card: Pick<Card, "labelIds">, labelById: Map<string, Label>, family: LabelFamily): string[] {
  return cardLabels(card, labelById, family).map(labelKey);
}

export function activityOf(card: Pick<Card, "labelIds">, labelById: Map<string, Label>): Label | null {
  return cardLabels(card, labelById, "activite")[0] ?? null;
}

export function checklistProgress(card: Pick<Card, "checklist">) {
  const total = card.checklist.length;
  const done = card.checklist.filter((c) => c.done).length;
  return { done, total, ratio: total ? done / total : 0 };
}

export type DueState = "done" | "late" | "soon" | "upcoming" | null;

/** État d'échéance de la date de publication. */
export function dueState(card: Pick<Card, "scheduledAt" | "status">, now = new Date()): DueState {
  if (!card.scheduledAt) return null;
  if (card.status === "publie") return "done";
  const date = parseLocal(card.scheduledAt);
  if (date < now && !DONE_STATUSES.includes(card.status)) return "late";
  if (differenceInHours(date, now) <= 48 && !DONE_STATUSES.includes(card.status)) return "soon";
  return "upcoming";
}

export function dueLabel(card: Pick<Card, "scheduledAt">, now = new Date()): string {
  if (!card.scheduledAt) return "";
  const days = differenceInCalendarDays(parseLocal(card.scheduledAt), now);
  if (days < 0) return `en retard de ${-days} j`;
  if (days === 0) return "aujourd'hui";
  if (days === 1) return "demain";
  return `dans ${days} j`;
}

/** Position fractionnaire entre deux voisins (ordre persistant sans renuméroter). */
export function between(before: number | undefined, after: number | undefined): number {
  if (before === undefined && after === undefined) return 1024;
  if (before === undefined) return after! / 2;
  if (after === undefined) return before + 1024;
  return (before + after) / 2;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}
