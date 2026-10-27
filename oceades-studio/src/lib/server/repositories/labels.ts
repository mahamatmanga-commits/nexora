import "server-only";
import type { DatabaseSync } from "node:sqlite";
import { DEFAULT_LABELS, type LabelFamily } from "@/lib/domain/constants";
import type { Label } from "@/lib/domain/types";
import { getDb, newId, nowIso } from "../db";
import { NotFoundError } from "../errors";

interface LabelRow {
  id: string;
  family: string;
  key: string | null;
  name: string;
  color: string;
  position: number;
}

const toLabel = (r: LabelRow): Label => ({
  id: r.id,
  family: r.family as LabelFamily,
  key: r.key,
  name: r.name,
  color: r.color,
  position: r.position,
});

/** Crée les étiquettes par défaut si aucune n'existe encore. */
export function ensureDefaultLabels(db: DatabaseSync) {
  const n = (db.prepare("SELECT COUNT(*) AS n FROM labels").get() as { n: number }).n;
  if (n > 0) return;
  const insert = db.prepare("INSERT INTO labels (id, family, key, name, color, position, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)");
  DEFAULT_LABELS.forEach((l, i) => insert.run(newId("lab"), l.family, l.key, l.name, l.color, i, nowIso()));
}

/** Correspondance clé métier → id d'étiquette (fitness, instagram, reel…). */
export function labelIdsByKey(db: DatabaseSync): Map<string, string> {
  const rows = db.prepare("SELECT id, key FROM labels WHERE key IS NOT NULL").all() as { id: string; key: string }[];
  return new Map(rows.map((r) => [r.key, r.id]));
}

export async function listLabels(): Promise<Label[]> {
  const db = getDb();
  ensureDefaultLabels(db);
  return (db.prepare("SELECT * FROM labels ORDER BY family, position, name").all() as unknown as LabelRow[]).map(toLabel);
}

export async function createLabel(input: { family: LabelFamily; name: string; color: string }): Promise<Label> {
  const db = getDb();
  const id = newId("lab");
  const max = (db.prepare("SELECT COALESCE(MAX(position), 0) AS m FROM labels WHERE family = ?").get(input.family) as { m: number }).m;
  db.prepare("INSERT INTO labels (id, family, key, name, color, position, created_at) VALUES (?, ?, NULL, ?, ?, ?, ?)").run(
    id,
    input.family,
    input.name,
    input.color,
    max + 1,
    nowIso(),
  );
  return toLabel(db.prepare("SELECT * FROM labels WHERE id = ?").get(id) as unknown as LabelRow);
}

export async function updateLabel(id: string, patch: { name?: string; color?: string; family?: LabelFamily; position?: number }): Promise<Label> {
  const db = getDb();
  const row = db.prepare("SELECT * FROM labels WHERE id = ?").get(id) as unknown as LabelRow | undefined;
  if (!row) throw new NotFoundError("Étiquette introuvable.");
  db.prepare("UPDATE labels SET name = ?, color = ?, family = ?, position = ? WHERE id = ?").run(
    patch.name ?? row.name,
    patch.color ?? row.color,
    patch.family ?? row.family,
    patch.position ?? row.position,
    id,
  );
  return toLabel(db.prepare("SELECT * FROM labels WHERE id = ?").get(id) as unknown as LabelRow);
}

/** Supprime l'étiquette et la retire des cartes (les cartes elles-mêmes sont conservées). */
export async function deleteLabel(id: string): Promise<number> {
  const db = getDb();
  const used = (db.prepare("SELECT COUNT(*) AS n FROM card_labels WHERE label_id = ?").get(id) as { n: number }).n;
  const res = db.prepare("DELETE FROM labels WHERE id = ?").run(id);
  if (!res.changes) throw new NotFoundError("Étiquette introuvable.");
  return used;
}
