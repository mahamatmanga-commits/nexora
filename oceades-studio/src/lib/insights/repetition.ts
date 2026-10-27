import { differenceInCalendarDays } from "date-fns";
import type { Card } from "@/lib/domain/types";
import { parseLocal } from "@/lib/dates";

/**
 * Détection des répétitions : compare le vocabulaire (titre + accroche + texte du post) des cartes
 * proches dans le temps. Algorithme local et explicable (similarité de Jaccard sur les mots significatifs),
 * aucun appel externe.
 */

const STOPWORDS = new Set(
  (
    "le la les un une des du de d l au aux et ou en à a pour par sur dans avec sans ce cet cette ces son sa ses " +
    "votre vos notre nos leur leurs vous nous on il elle ils elles je tu se qui que quoi dont est sont être avoir " +
    "fait faire plus moins très tout tous toute toutes pas ne n y c s qu mais donc car comme si ici là bien " +
    "oceades océades club séance séances"
  ).split(" "),
);

export function tokens(text: string): Set<string> {
  const normalized = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ");
  const result = new Set<string>();
  for (const word of normalized.split(/\s+/)) {
    if (word.length < 3 || STOPWORDS.has(word)) continue;
    // Racinisation minimale : pluriels.
    result.add(word.replace(/(s|x)$/, ""));
  }
  return result;
}

export function similarity(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

export interface RepetitionWarning {
  otherId: string;
  otherTitle: string;
  daysApart: number;
  score: number;
  published: boolean;
}

function textOf(c: Pick<Card, "title" | "hook" | "caption">) {
  return `${c.title} ${c.title} ${c.hook} ${c.caption}`;
}

/**
 * Contenus trop proches d'une carte : même vocabulaire (≥ 35 %) dans une fenêtre de 45 jours avant
 * et 21 jours après sa date (ou autour d'aujourd'hui si elle n'est pas datée).
 */
export function findRepetitions(target: Pick<Card, "id" | "title" | "hook" | "caption" | "scheduledAt">, cards: Card[]): RepetitionWarning[] {
  const ref = target.scheduledAt ? parseLocal(target.scheduledAt) : new Date();
  const mine = tokens(textOf(target));
  if (mine.size < 2) return [];
  const out: RepetitionWarning[] = [];
  for (const other of cards) {
    if (other.id === target.id || other.archivedAt || !other.scheduledAt) continue;
    const days = differenceInCalendarDays(parseLocal(other.scheduledAt), ref);
    if (days < -45 || days > 21) continue;
    const score = similarity(mine, tokens(textOf(other)));
    if (score >= 0.35) out.push({ otherId: other.id, otherTitle: other.title, daysApart: Math.abs(days), score, published: other.status === "publie" });
  }
  return out.sort((a, b) => b.score - a.score);
}
