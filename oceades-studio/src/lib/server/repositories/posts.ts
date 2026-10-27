import "server-only";
import type { DatabaseSync } from "node:sqlite";
import { getDb, newId, nowIso, transaction } from "../db";
import type { Post } from "@/lib/domain/types";
import type { PostInput, PostPatch } from "@/lib/domain/schemas";
import { NotFoundError, ValidationError } from "../errors";

interface PostRow {
  id: string;
  title: string;
  scheduled_at: string | null;
  platform: string;
  activity: string;
  format: string;
  objective: string;
  status: string;
  description: string;
  hook: string;
  cta: string;
  notes: string;
  campaign_id: string | null;
  checklist: string;
  is_demo: number;
  created_at: string;
  updated_at: string;
}

function mediaIdsByPost(db: DatabaseSync, ids?: string[]): Map<string, string[]> {
  const rows = (
    ids && ids.length === 1
      ? db.prepare("SELECT post_id, media_id FROM post_media WHERE post_id = ? ORDER BY position").all(ids[0])
      : db.prepare("SELECT post_id, media_id FROM post_media ORDER BY post_id, position").all()
  ) as { post_id: string; media_id: string }[];
  const map = new Map<string, string[]>();
  for (const r of rows) {
    const list = map.get(r.post_id) ?? [];
    list.push(r.media_id);
    map.set(r.post_id, list);
  }
  return map;
}

function toPost(row: PostRow, mediaIds: string[]): Post {
  const checklist = JSON.parse(row.checklist || "{}");
  return {
    id: row.id,
    title: row.title,
    scheduledAt: row.scheduled_at,
    platform: row.platform as Post["platform"],
    activity: row.activity as Post["activity"],
    format: row.format as Post["format"],
    objective: row.objective as Post["objective"],
    status: row.status as Post["status"],
    description: row.description,
    hook: row.hook,
    cta: row.cta,
    notes: row.notes,
    campaignId: row.campaign_id,
    mediaIds,
    checklist: {
      visualReady: Boolean(checklist.visualReady),
      textValidated: Boolean(checklist.textValidated),
      rightsChecked: Boolean(checklist.rightsChecked),
    },
    isDemo: row.is_demo === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function assertReferences(db: DatabaseSync, campaignId: string | null | undefined, mediaIds?: string[]) {
  if (campaignId) {
    const c = db.prepare("SELECT id FROM campaigns WHERE id = ?").get(campaignId);
    if (!c) throw new ValidationError("La campagne sélectionnée n'existe plus.");
  }
  if (mediaIds?.length) {
    const placeholders = mediaIds.map(() => "?").join(",");
    const found = db.prepare(`SELECT COUNT(*) AS n FROM media WHERE id IN (${placeholders})`).get(...mediaIds) as {
      n: number;
    };
    if (found.n !== new Set(mediaIds).size) throw new ValidationError("Un média associé est introuvable.");
  }
}

function writeMedia(db: DatabaseSync, postId: string, mediaIds: string[]) {
  db.prepare("DELETE FROM post_media WHERE post_id = ?").run(postId);
  const insert = db.prepare("INSERT OR IGNORE INTO post_media (post_id, media_id, position) VALUES (?, ?, ?)");
  mediaIds.forEach((m, i) => insert.run(postId, m, i));
}

export async function listPosts(): Promise<Post[]> {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM posts ORDER BY scheduled_at IS NULL, scheduled_at, created_at")
    .all() as unknown as PostRow[];
  const media = mediaIdsByPost(db);
  return rows.map((r) => toPost(r, media.get(r.id) ?? []));
}

export async function getPost(id: string): Promise<Post> {
  const db = getDb();
  const row = db.prepare("SELECT * FROM posts WHERE id = ?").get(id) as PostRow | undefined;
  if (!row) throw new NotFoundError("Publication introuvable.");
  return toPost(row, mediaIdsByPost(db, [id]).get(id) ?? []);
}

export function insertPost(db: DatabaseSync, input: PostInput, opts: { isDemo?: boolean; id?: string } = {}): string {
  const id = opts.id ?? newId("pub");
  const now = nowIso();
  db.prepare(
    `INSERT INTO posts (id, title, scheduled_at, platform, activity, format, objective, status, description, hook, cta,
      notes, campaign_id, checklist, is_demo, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.title,
    input.scheduledAt,
    input.platform,
    input.activity,
    input.format,
    input.objective,
    input.status,
    input.description,
    input.hook,
    input.cta,
    input.notes,
    input.campaignId,
    JSON.stringify(input.checklist),
    opts.isDemo ? 1 : 0,
    now,
    now,
  );
  writeMedia(db, id, input.mediaIds);
  return id;
}

export async function createPost(input: PostInput): Promise<Post> {
  const id = transaction((db) => {
    assertReferences(db, input.campaignId, input.mediaIds);
    return insertPost(db, input);
  });
  return getPost(id);
}

/** Création en lot (import d'un planning) : n'écrase jamais une publication existante. */
export async function createPosts(inputs: PostInput[]): Promise<Post[]> {
  const ids = transaction((db) =>
    inputs.map((input) => {
      assertReferences(db, input.campaignId, input.mediaIds);
      return insertPost(db, input);
    }),
  );
  return Promise.all(ids.map(getPost));
}

const COLUMN_MAP: Record<string, string> = {
  title: "title",
  scheduledAt: "scheduled_at",
  platform: "platform",
  activity: "activity",
  format: "format",
  objective: "objective",
  status: "status",
  description: "description",
  hook: "hook",
  cta: "cta",
  notes: "notes",
  campaignId: "campaign_id",
};

export async function updatePost(id: string, patch: PostPatch): Promise<Post> {
  transaction((db) => {
    const existing = db.prepare("SELECT id FROM posts WHERE id = ?").get(id);
    if (!existing) throw new NotFoundError("Publication introuvable.");
    assertReferences(db, patch.campaignId, patch.mediaIds);
    const sets: string[] = [];
    const values: (string | null)[] = [];
    for (const [key, column] of Object.entries(COLUMN_MAP)) {
      const value = patch[key as keyof PostPatch];
      if (value !== undefined) {
        sets.push(`${column} = ?`);
        values.push(value as string | null);
      }
    }
    if (patch.checklist) {
      sets.push("checklist = ?");
      values.push(JSON.stringify(patch.checklist));
    }
    sets.push("updated_at = ?");
    values.push(nowIso());
    db.prepare(`UPDATE posts SET ${sets.join(", ")} WHERE id = ?`).run(...values, id);
    if (patch.mediaIds) writeMedia(db, id, patch.mediaIds);
  });
  return getPost(id);
}

export async function duplicatePost(id: string, scheduledAt?: string | null): Promise<Post> {
  const source = await getPost(id);
  const copy: PostInput = {
    title: `${source.title} (copie)`,
    scheduledAt: scheduledAt === undefined ? source.scheduledAt : scheduledAt,
    platform: source.platform,
    activity: source.activity,
    format: source.format,
    objective: source.objective,
    // Une copie repart en production : elle ne doit pas apparaître comme publiée.
    status: source.status === "publie" || source.status === "programme" ? "a_produire" : source.status,
    description: source.description,
    hook: source.hook,
    cta: source.cta,
    notes: source.notes,
    campaignId: source.campaignId,
    mediaIds: source.mediaIds,
    checklist: { visualReady: false, textValidated: false, rightsChecked: false },
  };
  return createPost(copy);
}

export async function deletePost(id: string): Promise<void> {
  const result = getDb().prepare("DELETE FROM posts WHERE id = ?").run(id);
  if (result.changes === 0) throw new NotFoundError("Publication introuvable.");
}
