import { differenceInCalendarDays } from "date-fns";
import type { Post } from "@/lib/domain/types";
import { parseLocal } from "@/lib/dates";

/**
 * Détection des répétitions : compare le vocabulaire (titre + accroche + description) des publications
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
  postId: string;
  otherId: string;
  otherTitle: string;
  daysApart: number;
  score: number;
  reason: string;
}

const WINDOW_DAYS = 21;

function textOf(p: Pick<Post, "title" | "hook" | "description">) {
  return `${p.title} ${p.title} ${p.hook} ${p.description}`;
}

/** Signale, pour une publication donnée, les contenus trop proches publiés ou prévus dans une fenêtre de 3 semaines. */
export function findRepetitions(
  target: Pick<Post, "id" | "title" | "hook" | "description" | "activity" | "format" | "scheduledAt">,
  posts: Post[],
): RepetitionWarning[] {
  if (!target.scheduledAt) return [];
  const targetDate = parseLocal(target.scheduledAt);
  const targetTokens = tokens(textOf(target));
  const warnings: RepetitionWarning[] = [];
  for (const other of posts) {
    if (other.id === target.id || !other.scheduledAt) continue;
    const days = Math.abs(differenceInCalendarDays(parseLocal(other.scheduledAt), targetDate));
    if (days > WINDOW_DAYS) continue;
    const score = similarity(targetTokens, tokens(textOf(other)));
    const sameAngle = other.activity === target.activity && other.format === target.format;
    if (score >= 0.35 || (sameAngle && score >= 0.2)) {
      warnings.push({
        postId: target.id,
        otherId: other.id,
        otherTitle: other.title,
        daysApart: days,
        score,
        reason: sameAngle
          ? `Même activité et même format, sujet proche (${Math.round(score * 100)} % de vocabulaire commun)`
          : `Sujet proche (${Math.round(score * 100)} % de vocabulaire commun)`,
      });
    } else if (sameAngle && days <= 2) {
      warnings.push({
        postId: target.id,
        otherId: other.id,
        otherTitle: other.title,
        daysApart: days,
        score,
        reason: "Même activité et même format à moins de 48 h",
      });
    }
  }
  return warnings.sort((a, b) => b.score - a.score);
}

export function allRepetitions(posts: Post[]): RepetitionWarning[] {
  const seen = new Set<string>();
  const result: RepetitionWarning[] = [];
  for (const p of posts) {
    for (const w of findRepetitions(p, posts)) {
      const key = [w.postId, w.otherId].sort().join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(w);
    }
  }
  return result;
}
