import "server-only";
import { getDb, newId, nowIso } from "../db";
import type { MediaItem } from "@/lib/domain/types";
import type { MediaCategory } from "@/lib/domain/constants";
import type { MediaPatch } from "@/lib/domain/schemas";
import { NotFoundError } from "../errors";
import { storage } from "../storage";

interface MediaRow {
  id: string;
  name: string;
  original_name: string;
  mime_type: string;
  size: number;
  category: string;
  tags: string;
  storage_key: string;
  rights_checked: number;
  notes: string;
  is_demo: number;
  created_at: string;
}

function toMedia(r: MediaRow): MediaItem {
  return {
    id: r.id,
    name: r.name,
    originalName: r.original_name,
    mimeType: r.mime_type,
    size: r.size,
    category: r.category as MediaCategory,
    tags: JSON.parse(r.tags || "[]"),
    rightsChecked: r.rights_checked === 1,
    notes: r.notes,
    isDemo: r.is_demo === 1,
    createdAt: r.created_at,
  };
}

export async function listMedia(): Promise<MediaItem[]> {
  const rows = getDb().prepare("SELECT * FROM media ORDER BY created_at DESC").all() as unknown as MediaRow[];
  return rows.map(toMedia);
}

export async function getMediaRow(id: string): Promise<MediaRow> {
  const row = getDb().prepare("SELECT * FROM media WHERE id = ?").get(id) as MediaRow | undefined;
  if (!row) throw new NotFoundError("Média introuvable.");
  return row;
}

export async function getMedia(id: string): Promise<MediaItem> {
  return toMedia(await getMediaRow(id));
}

export function guessCategory(mime: string): MediaCategory {
  if (mime.startsWith("video/")) return "video";
  if (mime === "application/pdf") return "document";
  return "photo";
}

const EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
  "image/svg+xml": "svg",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
  "application/pdf": "pdf",
};

export async function createMediaFromStream(params: {
  originalName: string;
  mimeType: string;
  category?: MediaCategory;
  tags?: string[];
  body: ReadableStream<Uint8Array>;
  maxBytes: number;
}): Promise<MediaItem> {
  const id = newId("med");
  const now = new Date();
  const key = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${id}.${EXTENSIONS[params.mimeType] ?? "bin"}`;
  const size = await storage.save(key, params.body, params.maxBytes);
  const name = params.originalName.replace(/\.[^.]+$/, "").slice(0, 200) || "Sans titre";
  getDb()
    .prepare(
      `INSERT INTO media (id, name, original_name, mime_type, size, category, tags, storage_key, rights_checked, notes,
        is_demo, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, '', 0, ?)`,
    )
    .run(
      id,
      name,
      params.originalName.slice(0, 255),
      params.mimeType,
      size,
      params.category ?? guessCategory(params.mimeType),
      JSON.stringify(params.tags ?? []),
      key,
      nowIso(),
    );
  return getMedia(id);
}

export async function updateMedia(id: string, patch: MediaPatch): Promise<MediaItem> {
  await getMediaRow(id);
  const sets: string[] = [];
  const values: (string | number)[] = [];
  if (patch.name !== undefined) (sets.push("name = ?"), values.push(patch.name));
  if (patch.category !== undefined) (sets.push("category = ?"), values.push(patch.category));
  if (patch.notes !== undefined) (sets.push("notes = ?"), values.push(patch.notes));
  if (patch.tags !== undefined) {
    sets.push("tags = ?");
    values.push(JSON.stringify([...new Set(patch.tags.map((t) => t.toLowerCase()))]));
  }
  if (patch.rightsChecked !== undefined) (sets.push("rights_checked = ?"), values.push(patch.rightsChecked ? 1 : 0));
  if (sets.length) getDb().prepare(`UPDATE media SET ${sets.join(", ")} WHERE id = ?`).run(...values, id);
  return getMedia(id);
}

export async function deleteMedia(id: string): Promise<void> {
  const row = await getMediaRow(id);
  getDb().prepare("DELETE FROM media WHERE id = ?").run(id);
  await storage.remove(row.storage_key);
}
