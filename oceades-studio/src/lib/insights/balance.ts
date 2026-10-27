import {
  ACTIVITIES,
  ACTIVITY_LABELS,
  FORMATS,
  FORMAT_LABELS,
  OBJECTIVES,
  OBJECTIVE_LABELS,
  type Activity,
  type Format,
  type Objective,
} from "@/lib/domain/constants";
import type { Post } from "@/lib/domain/types";

export interface BalanceAlert {
  dimension: "activité" | "format" | "objectif";
  key: string;
  label: string;
  count: number;
  expected: number;
  message: string;
}

/** Répartition cible par défaut des 4 activités (Global = transverse, non comptée dans l'équilibre). */
export const DEFAULT_ACTIVITY_TARGET: Record<Exclude<Activity, "global">, number> = {
  fitness: 0.3,
  musculation: 0.2,
  aquatique: 0.25,
  institut: 0.25,
};

export function countBy<K extends string>(posts: Post[], keyOf: (p: Post) => K, keys: readonly K[]) {
  const counts = Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;
  for (const p of posts) counts[keyOf(p)] = (counts[keyOf(p)] ?? 0) + 1;
  return counts;
}

/**
 * Signale les activités, formats et objectifs sous-représentés sur un ensemble de publications.
 * Seuil : moins de 50 % de la part attendue (et au moins 6 publications pour que l'analyse ait du sens).
 */
export function balanceAlerts(posts: Post[]): BalanceAlert[] {
  const alerts: BalanceAlert[] = [];
  if (posts.length < 6) return alerts;

  const activityPosts = posts.filter((p) => p.activity !== "global");
  const activityCounts = countBy(activityPosts, (p) => p.activity, ACTIVITIES);
  for (const [key, share] of Object.entries(DEFAULT_ACTIVITY_TARGET)) {
    const expected = activityPosts.length * share;
    const count = activityCounts[key as Activity];
    if (count < expected * 0.5) {
      alerts.push({
        dimension: "activité",
        key,
        label: ACTIVITY_LABELS[key as Activity],
        count,
        expected: Math.round(expected),
        message: `${ACTIVITY_LABELS[key as Activity]} est sous-représenté : ${count} publication(s) pour ~${Math.round(expected)} attendue(s).`,
      });
    }
  }

  const formatCounts = countBy(posts, (p) => p.format, FORMATS);
  const mainFormats: Format[] = ["reel", "carrousel", "story", "photo"];
  for (const f of mainFormats) {
    const expected = posts.length / (mainFormats.length + 1);
    if (formatCounts[f] < expected * 0.35) {
      alerts.push({
        dimension: "format",
        key: f,
        label: FORMAT_LABELS[f],
        count: formatCounts[f],
        expected: Math.round(expected),
        message: `Peu de ${FORMAT_LABELS[f].toLowerCase()}s (${formatCounts[f]}) : pensez à varier les formats.`,
      });
    }
  }

  const objectiveCounts = countBy(posts, (p) => p.objective, OBJECTIVES);
  for (const o of OBJECTIVES) {
    const expected = posts.length / OBJECTIVES.length;
    if (objectiveCounts[o] < expected * 0.35) {
      alerts.push({
        dimension: "objectif",
        key: o,
        label: OBJECTIVE_LABELS[o],
        count: objectiveCounts[o],
        expected: Math.round(expected),
        message: `Objectif « ${OBJECTIVE_LABELS[o]} » peu travaillé (${objectiveCounts[o]} publication(s)).`,
      });
    }
  }
  return alerts;
}

export type { Objective };
