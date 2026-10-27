import "server-only";
import type { DatabaseSync } from "node:sqlite";
import { getDb, newId, nowIso, transaction } from "../db";
import type { Campaign } from "@/lib/domain/types";
import type { CampaignInput, CampaignPatch } from "@/lib/domain/schemas";
import { NotFoundError, ValidationError } from "../errors";

interface CampaignRow {
  id: string;
  name: string;
  kind: string;
  objective: string;
  start_date: string;
  end_date: string;
  activities: string;
  target_audience: string;
  key_messages: string;
  color: string;
  is_demo: number;
  created_at: string;
  updated_at: string;
}

function toCampaign(r: CampaignRow): Campaign {
  return {
    id: r.id,
    name: r.name,
    kind: r.kind as Campaign["kind"],
    objective: r.objective,
    startDate: r.start_date,
    endDate: r.end_date,
    activities: JSON.parse(r.activities || "[]"),
    targetAudience: r.target_audience,
    keyMessages: r.key_messages,
    color: r.color,
    isDemo: r.is_demo === 1,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function listCampaigns(): Promise<Campaign[]> {
  const rows = getDb().prepare("SELECT * FROM campaigns ORDER BY start_date").all() as unknown as CampaignRow[];
  return rows.map(toCampaign);
}

export async function getCampaign(id: string): Promise<Campaign> {
  const row = getDb().prepare("SELECT * FROM campaigns WHERE id = ?").get(id) as CampaignRow | undefined;
  if (!row) throw new NotFoundError("Campagne introuvable.");
  return toCampaign(row);
}

export function insertCampaign(db: DatabaseSync, input: CampaignInput, opts: { isDemo?: boolean; id?: string } = {}) {
  const id = opts.id ?? newId("cmp");
  const now = nowIso();
  db.prepare(
    `INSERT INTO campaigns (id, name, kind, objective, start_date, end_date, activities, target_audience, key_messages,
      color, is_demo, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.name,
    input.kind,
    input.objective,
    input.startDate,
    input.endDate,
    JSON.stringify(input.activities),
    input.targetAudience,
    input.keyMessages,
    input.color,
    opts.isDemo ? 1 : 0,
    now,
    now,
  );
  return id;
}

export async function createCampaign(input: CampaignInput): Promise<Campaign> {
  const id = transaction((db) => insertCampaign(db, input));
  return getCampaign(id);
}

const COLUMN_MAP: Record<string, string> = {
  name: "name",
  kind: "kind",
  objective: "objective",
  startDate: "start_date",
  endDate: "end_date",
  targetAudience: "target_audience",
  keyMessages: "key_messages",
  color: "color",
};

export async function updateCampaign(id: string, patch: CampaignPatch): Promise<Campaign> {
  const current = await getCampaign(id);
  const start = patch.startDate ?? current.startDate;
  const end = patch.endDate ?? current.endDate;
  if (end < start) throw new ValidationError("La date de fin doit suivre la date de début.");
  const sets: string[] = [];
  const values: string[] = [];
  for (const [key, column] of Object.entries(COLUMN_MAP)) {
    const value = patch[key as keyof CampaignPatch];
    if (value !== undefined) {
      sets.push(`${column} = ?`);
      values.push(value as string);
    }
  }
  if (patch.activities) {
    sets.push("activities = ?");
    values.push(JSON.stringify(patch.activities));
  }
  sets.push("updated_at = ?");
  values.push(nowIso());
  getDb().prepare(`UPDATE campaigns SET ${sets.join(", ")} WHERE id = ?`).run(...values, id);
  return getCampaign(id);
}

/** Supprime la campagne ; les publications associées sont conservées et simplement détachées. */
export async function deleteCampaign(id: string): Promise<void> {
  const result = getDb().prepare("DELETE FROM campaigns WHERE id = ?").run(id);
  if (result.changes === 0) throw new NotFoundError("Campagne introuvable.");
}
