import { addDays, differenceInCalendarDays, startOfDay } from "date-fns";
import { DONE_STATUSES } from "@/lib/domain/constants";
import type { Campaign, Card, Label, Settings } from "@/lib/domain/types";
import { familyKeys } from "@/lib/cards";
import { dayKey, parseLocal } from "@/lib/dates";
import { balanceReport } from "./balance";

export interface ProductionAlert {
  id: string;
  level: "high" | "medium";
  title: string;
  detail: string;
  cardId?: string;
}

const isChecked = (card: Card, text: string) => card.checklist.some((c) => c.text.toLowerCase() === text.toLowerCase() && c.done);
const hasItem = (card: Card, text: string) => card.checklist.some((c) => c.text.toLowerCase() === text.toLowerCase());

/** Règles d'alerte de production, calculées localement à partir des cartes. */
export function productionAlerts(cards: Card[], labelById: Map<string, Label>, campaigns: Campaign[], settings: Settings | null, now = new Date()): ProductionAlert[] {
  const alerts: ProductionAlert[] = [];
  const active = cards.filter((c) => !c.archivedAt);
  const today = startOfDay(now);

  for (const c of active) {
    if (!c.scheduledAt || c.status === "publie") continue;
    const date = parseLocal(c.scheduledAt);
    const days = differenceInCalendarDays(date, today);
    const formats = familyKeys(c, labelById, "format");

    if (date < now && !DONE_STATUSES.includes(c.status)) {
      alerts.push({ id: `late-${c.id}`, level: "high", title: c.title, detail: `Échéance dépassée de ${Math.max(1, -days)} j`, cardId: c.id });
      continue;
    }
    if (days === 1 && !c.coverMediaId && !c.attachmentIds.length) {
      alerts.push({ id: `visual-${c.id}`, level: "high", title: c.title, detail: "Prévue demain sans visuel", cardId: c.id });
    }
    if (days >= 0 && days <= 2 && (formats.includes("reel") || formats.includes("video")) && hasItem(c, "Montage terminé") && !isChecked(c, "Montage terminé")) {
      alerts.push({ id: `edit-${c.id}`, level: "high", title: c.title, detail: "Vidéo prévue sous 48 h, montage non terminé", cardId: c.id });
    }
    if (c.status === "programme" && hasItem(c, "Validation obtenue") && !isChecked(c, "Validation obtenue")) {
      alerts.push({ id: `valid-${c.id}`, level: "medium", title: c.title, detail: "Programmée sans validation", cardId: c.id });
    }
    if (c.validationDate && c.validationDate < dayKey(now) && !["a_valider", "programme", "publie"].includes(c.status)) {
      alerts.push({ id: `vdate-${c.id}`, level: "medium", title: c.title, detail: "Date limite de validation dépassée", cardId: c.id });
    }
  }

  for (const camp of campaigns) {
    const left = differenceInCalendarDays(parseLocal(`${camp.endDate}T00:00`), today);
    if (left < 0 || left > 3) continue;
    const open = active.filter((c) => c.campaignId === camp.id && !DONE_STATUSES.includes(c.status)).length;
    if (open) alerts.push({ id: `camp-${camp.id}`, level: "medium", title: camp.name, detail: `Se termine ${left === 0 ? "aujourd'hui" : `dans ${left} j`} · ${open} contenu(s) non programmé(s)` });
  }

  if (settings) {
    const horizon = active.filter((c) => c.scheduledAt && parseLocal(c.scheduledAt) >= today && parseLocal(c.scheduledAt) <= addDays(today, 30));
    for (const gap of balanceReport(horizon, labelById, settings.balanceTargets).gaps.slice(0, 2)) {
      alerts.push({ id: `bal-${gap.key}`, level: "medium", title: `${gap.name} sous-représenté`, detail: `${gap.actual} % prévu sur 30 jours, objectif ${gap.target} %` });
    }
  }
  return alerts.sort((a, b) => (a.level === b.level ? 0 : a.level === "high" ? -1 : 1));
}
