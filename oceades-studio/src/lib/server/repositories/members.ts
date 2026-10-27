import "server-only";
import { DEFAULT_CHECKLIST, MEMBER_COLORS } from "@/lib/domain/constants";
import type { DatabaseSync } from "node:sqlite";
import type { Member, Settings } from "@/lib/domain/types";
import { getDb, newId, nowIso } from "../db";
import { NotFoundError } from "../errors";

/* ---------- Membres (responsables des cartes) ---------- */

export async function listMembers(): Promise<Member[]> {
  return getDb().prepare("SELECT id, name, color FROM members ORDER BY name").all() as unknown as Member[];
}

export async function createMember(input: { name: string; color?: string }): Promise<Member> {
  const db = getDb();
  const n = (db.prepare("SELECT COUNT(*) AS n FROM members").get() as { n: number }).n;
  const id = newId("mbr");
  db.prepare("INSERT INTO members (id, name, color, created_at) VALUES (?, ?, ?, ?)").run(id, input.name, input.color ?? MEMBER_COLORS[n % MEMBER_COLORS.length], nowIso());
  return { id, name: input.name, color: input.color ?? MEMBER_COLORS[n % MEMBER_COLORS.length] };
}

export async function updateMember(id: string, patch: { name?: string; color?: string }): Promise<Member> {
  const db = getDb();
  const row = db.prepare("SELECT id, name, color FROM members WHERE id = ?").get(id) as Member | undefined;
  if (!row) throw new NotFoundError("Membre introuvable.");
  const next = { ...row, ...patch };
  db.prepare("UPDATE members SET name = ?, color = ? WHERE id = ?").run(next.name, next.color, id);
  return next;
}

export async function deleteMember(id: string): Promise<void> {
  const res = getDb().prepare("DELETE FROM members WHERE id = ?").run(id);
  if (!res.changes) throw new NotFoundError("Membre introuvable.");
}

/* ---------- Paramètres ---------- */

export const DEFAULT_SETTINGS: Settings = {
  balanceTargets: { fitness: 30, musculation: 20, aquatique: 25, institut: 25 },
  defaultChecklist: DEFAULT_CHECKLIST,
  autoChecklist: true,
};

export function readSettings(db: DatabaseSync = getDb()): Settings {
  const rows = db.prepare("SELECT key, value FROM settings").all() as { key: string; value: string }[];
  const stored = Object.fromEntries(rows.map((r) => [r.key, JSON.parse(r.value)]));
  return { ...DEFAULT_SETTINGS, ...stored };
}

export async function getSettings(): Promise<Settings> {
  return readSettings();
}

export async function saveSettings(settings: Settings): Promise<Settings> {
  const db = getDb();
  const upsert = db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value");
  for (const [k, v] of Object.entries(settings)) upsert.run(k, JSON.stringify(v));
  return readSettings();
}
