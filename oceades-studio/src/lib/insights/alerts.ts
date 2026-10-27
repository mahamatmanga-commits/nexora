import { differenceInCalendarDays, differenceInHours } from "date-fns";
import { DONE_STATUSES, type Status } from "@/lib/domain/constants";
import type { Post } from "@/lib/domain/types";
import { parseLocal } from "@/lib/dates";

export type DeadlineLevel = "late" | "risk" | null;

/** Statut minimal attendu selon la proximité de la date de publication. */
const READY_ENOUGH: Status[] = ["a_valider", "programme", "publie"];

/**
 * « En retard » : date passée et publication ni programmée ni publiée.
 * « À risque » : publication dans moins de 72 h encore au stade d'idée ou de production.
 */
export function deadlineLevel(post: Post, now = new Date()): DeadlineLevel {
  if (!post.scheduledAt || DONE_STATUSES.includes(post.status)) return null;
  const date = parseLocal(post.scheduledAt);
  if (date < now) return "late";
  if (differenceInHours(date, now) <= 72 && !READY_ENOUGH.includes(post.status)) return "risk";
  return null;
}

export function deadlineLabel(post: Post, now = new Date()): string {
  if (!post.scheduledAt) return "";
  const days = differenceInCalendarDays(parseLocal(post.scheduledAt), now);
  if (days < 0) return `En retard de ${-days} j`;
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return "Demain";
  return `Dans ${days} j`;
}

/** Checklist complète : items manuels + items déduits automatiquement de la fiche. */
export function checklistState(post: Pick<Post, "checklist" | "scheduledAt" | "cta">) {
  const items = {
    visualReady: post.checklist.visualReady,
    textValidated: post.checklist.textValidated,
    dateChosen: Boolean(post.scheduledAt),
    ctaPresent: post.cta.trim().length > 0,
    rightsChecked: post.checklist.rightsChecked,
  };
  const done = Object.values(items).filter(Boolean).length;
  return { items, done, total: 5, complete: done === 5 };
}
