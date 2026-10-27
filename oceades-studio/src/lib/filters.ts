import { addDays } from "date-fns";
import type { Status } from "@/lib/domain/constants";
import type { Campaign, Card, Label } from "@/lib/domain/types";
import { parseLocal } from "@/lib/dates";
import { dueState } from "@/lib/cards";
import { normalize } from "@/lib/utils";

export type DueFilter = "late" | "week" | "none";

export interface CardFilters {
  query: string;
  labelIds: string[];
  statuses: Status[];
  campaignIds: string[];
  assigneeIds: string[];
  due: DueFilter[];
}

export const EMPTY_FILTERS: CardFilters = { query: "", labelIds: [], statuses: [], campaignIds: [], assigneeIds: [], due: [] };

export function filterCount(f: CardFilters): number {
  return f.labelIds.length + f.statuses.length + f.campaignIds.length + f.assigneeIds.length + f.due.length;
}

export function isFiltering(f: CardFilters): boolean {
  return filterCount(f) > 0 || f.query.trim().length > 0;
}

/**
 * Filtre façon Trello : à l'intérieur d'une même famille d'étiquettes, une carte correspond si elle porte
 * l'une des étiquettes choisies (OU) ; entre familles, toutes les conditions doivent être remplies (ET).
 */
export function matchCard(card: Card, f: CardFilters, labelById: Map<string, Label>, campaignById: Map<string, Campaign>, now = new Date()): boolean {
  if (f.labelIds.length) {
    const byFamily = new Map<string, string[]>();
    for (const id of f.labelIds) {
      const fam = labelById.get(id)?.family ?? "autre";
      byFamily.set(fam, [...(byFamily.get(fam) ?? []), id]);
    }
    for (const ids of byFamily.values()) if (!ids.some((id) => card.labelIds.includes(id))) return false;
  }
  if (f.statuses.length && !f.statuses.includes(card.status)) return false;
  if (f.campaignIds.length && !(card.campaignId && f.campaignIds.includes(card.campaignId))) return false;
  if (f.assigneeIds.length && !(card.assigneeId && f.assigneeIds.includes(card.assigneeId))) return false;
  if (f.due.length) {
    const ok = f.due.some((d) => {
      if (d === "none") return !card.scheduledAt;
      if (d === "late") return dueState(card, now) === "late";
      if (!card.scheduledAt) return false;
      const date = parseLocal(card.scheduledAt);
      return date >= now && date <= addDays(now, 7);
    });
    if (!ok) return false;
  }
  const q = normalize(f.query.trim());
  if (q) {
    const hay = normalize(
      [card.title, card.description, card.hook, card.caption, card.script, card.brief, card.cta, ...card.labelIds.map((id) => labelById.get(id)?.name ?? ""), card.campaignId ? campaignById.get(card.campaignId)?.name : ""].join(" "),
    );
    if (!q.split(/\s+/).every((w) => hay.includes(w))) return false;
  }
  return true;
}
