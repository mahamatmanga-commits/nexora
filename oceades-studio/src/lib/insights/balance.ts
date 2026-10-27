import type { Card, Label } from "@/lib/domain/types";
import { cardLabels, labelKey } from "@/lib/cards";

export interface BalanceRow {
  key: string;
  name: string;
  color: string;
  count: number;
  /** Part réelle, en %. */
  actual: number;
  /** Objectif, en %. */
  target: number;
}

/**
 * Équilibre éditorial par activité : compare la part réelle de chaque activité (hors « Global »)
 * aux objectifs définis dans les Paramètres. Un écart est signalé au-delà de 10 points, à partir de 5 contenus.
 */
export function balanceReport(cards: Card[], labelById: Map<string, Label>, targets: Record<string, number>) {
  const activityLabels = [...labelById.values()].filter((l) => l.family === "activite" && labelKey(l) !== "global");
  const counts = new Map<string, number>();
  let total = 0;
  for (const c of cards) {
    const act = cardLabels(c, labelById, "activite").find((l) => labelKey(l) !== "global");
    if (!act) continue;
    counts.set(labelKey(act), (counts.get(labelKey(act)) ?? 0) + 1);
    total++;
  }
  const rows: BalanceRow[] = activityLabels.map((l) => {
    const key = labelKey(l);
    const count = counts.get(key) ?? 0;
    return { key, name: l.name, color: l.color, count, actual: total ? Math.round((count / total) * 100) : 0, target: Math.round(targets[key] ?? 0) };
  });
  const gaps = total >= 5 ? rows.filter((r) => r.target - r.actual > 10).sort((a, b) => b.target - b.actual - (a.target - a.actual)) : [];
  const excess = total >= 5 ? rows.filter((r) => r.actual - r.target > 10) : [];
  return { rows, total, gaps, excess };
}
