import "server-only";
import type { DatabaseSync } from "node:sqlite";
import { STATUS_LABELS, type Status } from "@/lib/domain/constants";
import { cardInputSchema, type CardPatch } from "@/lib/domain/schemas";
import type { Card, CardEvent, ChecklistItem, Comment } from "@/lib/domain/types";
import type { z } from "zod";
import { getDb, newId, nowIso, transaction } from "../db";
import { NotFoundError, ValidationError } from "../errors";
import { readSettings } from "./members";

type CardInputParsed = z.infer<typeof cardInputSchema>;

interface CardRow {
  id: string;
  board_id: string;
  list_id: string;
  position: number;
  title: string;
  description: string;
  scheduled_at: string | null;
  production_date: string | null;
  validation_date: string | null;
  status: string;
  objective: string | null;
  target: string;
  campaign_id: string | null;
  assignee_id: string | null;
  hook: string;
  caption: string;
  script: string;
  brief: string;
  cta: string;
  cover_media_id: string | null;
  parent_card_id: string | null;
  links: string;
  archived_at: string | null;
  is_demo: number;
  created_at: string;
  updated_at: string;
}

/* ---------- Lecture ---------- */

function group<T>(rows: T[], key: (r: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const r of rows) {
    const k = key(r);
    const list = map.get(k);
    if (list) list.push(r);
    else map.set(k, [r]);
  }
  return map;
}

/** Charge des cartes avec leurs relations (étiquettes, pièces jointes, checklist, nombre de commentaires). */
export function hydrateCards(db: DatabaseSync, rows: CardRow[]): Card[] {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const ph = ids.map(() => "?").join(",");
  const labels = group(db.prepare(`SELECT card_id, label_id FROM card_labels WHERE card_id IN (${ph})`).all(...ids) as { card_id: string; label_id: string }[], (r) => r.card_id);
  const atts = group(db.prepare(`SELECT card_id, media_id FROM card_attachments WHERE card_id IN (${ph}) ORDER BY position`).all(...ids) as { card_id: string; media_id: string }[], (r) => r.card_id);
  const checks = group(
    db.prepare(`SELECT id, card_id, text, done, position FROM checklist_items WHERE card_id IN (${ph}) ORDER BY position`).all(...ids) as {
      id: string;
      card_id: string;
      text: string;
      done: number;
      position: number;
    }[],
    (r) => r.card_id,
  );
  const comments = new Map(
    (db.prepare(`SELECT card_id, COUNT(*) AS n FROM comments WHERE card_id IN (${ph}) GROUP BY card_id`).all(...ids) as { card_id: string; n: number }[]).map((r) => [r.card_id, r.n]),
  );
  return rows.map((r) => ({
    id: r.id,
    boardId: r.board_id,
    listId: r.list_id,
    position: r.position,
    title: r.title,
    description: r.description,
    scheduledAt: r.scheduled_at,
    productionDate: r.production_date,
    validationDate: r.validation_date,
    status: r.status as Status,
    objective: r.objective as Card["objective"],
    target: r.target,
    campaignId: r.campaign_id,
    assigneeId: r.assignee_id,
    hook: r.hook,
    caption: r.caption,
    script: r.script,
    brief: r.brief,
    cta: r.cta,
    coverMediaId: r.cover_media_id,
    parentCardId: r.parent_card_id,
    links: JSON.parse(r.links || "[]"),
    labelIds: (labels.get(r.id) ?? []).map((l) => l.label_id),
    attachmentIds: (atts.get(r.id) ?? []).map((a) => a.media_id),
    checklist: (checks.get(r.id) ?? []).map((c) => ({ id: c.id, cardId: c.card_id, text: c.text, done: c.done === 1, position: c.position })),
    commentCount: comments.get(r.id) ?? 0,
    archivedAt: r.archived_at,
    isDemo: r.is_demo === 1,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export function boardCards(db: DatabaseSync, boardId: string): Card[] {
  return hydrateCards(db, db.prepare("SELECT * FROM cards WHERE board_id = ? ORDER BY position").all(boardId) as unknown as CardRow[]);
}

export async function getCard(id: string): Promise<Card> {
  const db = getDb();
  const row = db.prepare("SELECT * FROM cards WHERE id = ?").get(id) as unknown as CardRow | undefined;
  if (!row) throw new NotFoundError("Carte introuvable.");
  return hydrateCards(db, [row])[0];
}

/** Cartes datées de tous les tableaux actifs (calendrier global, statistiques). */
export async function listAllActiveCards(): Promise<Card[]> {
  const db = getDb();
  return hydrateCards(
    db,
    db
      .prepare(
        `SELECT c.* FROM cards c JOIN lists l ON l.id = c.list_id JOIN boards b ON b.id = c.board_id
         WHERE c.archived_at IS NULL AND l.archived_at IS NULL AND b.archived_at IS NULL ORDER BY c.position`,
      )
      .all() as unknown as CardRow[],
  );
}

/* ---------- Historique ---------- */

export function logEvent(db: DatabaseSync, cardId: string, author: string, type: string, detail = "") {
  db.prepare("INSERT INTO card_events (id, card_id, author, type, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(newId("evt"), cardId, author, type, detail, nowIso());
}

export async function listEvents(cardId: string): Promise<CardEvent[]> {
  return (getDb().prepare("SELECT * FROM card_events WHERE card_id = ? ORDER BY created_at DESC LIMIT 200").all(cardId) as {
    id: string;
    card_id: string;
    author: string;
    type: string;
    detail: string;
    created_at: string;
  }[]).map((r) => ({ id: r.id, cardId: r.card_id, author: r.author, type: r.type, detail: r.detail, createdAt: r.created_at }));
}

/* ---------- Écriture ---------- */

function nextPosition(db: DatabaseSync, listId: string): number {
  return (db.prepare("SELECT COALESCE(MAX(position), 0) AS m FROM cards WHERE list_id = ?").get(listId) as { m: number }).m + 1024;
}

function listBoard(db: DatabaseSync, listId: string): string {
  const row = db.prepare("SELECT board_id FROM lists WHERE id = ?").get(listId) as { board_id: string } | undefined;
  if (!row) throw new ValidationError("La liste n'existe plus.");
  return row.board_id;
}

function assertRefs(db: DatabaseSync, p: { campaignId?: string | null; assigneeId?: string | null; labelIds?: string[]; attachmentIds?: string[]; coverMediaId?: string | null }) {
  const exists = (table: string, id: string) => db.prepare(`SELECT 1 FROM ${table} WHERE id = ?`).get(id);
  if (p.campaignId && !exists("campaigns", p.campaignId)) throw new ValidationError("Campagne introuvable.");
  if (p.assigneeId && !exists("members", p.assigneeId)) throw new ValidationError("Responsable introuvable.");
  if (p.coverMediaId && !exists("media", p.coverMediaId)) throw new ValidationError("Image de couverture introuvable.");
  for (const id of p.labelIds ?? []) if (!exists("labels", id)) throw new ValidationError("Étiquette introuvable.");
  for (const id of p.attachmentIds ?? []) if (!exists("media", id)) throw new ValidationError("Média introuvable.");
}

function writeLabels(db: DatabaseSync, cardId: string, labelIds: string[]) {
  db.prepare("DELETE FROM card_labels WHERE card_id = ?").run(cardId);
  const ins = db.prepare("INSERT OR IGNORE INTO card_labels (card_id, label_id) VALUES (?, ?)");
  for (const l of labelIds) ins.run(cardId, l);
}

function writeAttachments(db: DatabaseSync, cardId: string, ids: string[]) {
  db.prepare("DELETE FROM card_attachments WHERE card_id = ?").run(cardId);
  const ins = db.prepare("INSERT OR IGNORE INTO card_attachments (card_id, media_id, position) VALUES (?, ?, ?)");
  ids.forEach((m, i) => ins.run(cardId, m, i));
}

/** Insertion bas niveau (utilisée aussi par l'amorçage, la migration et l'import Trello). */
export function insertCard(
  db: DatabaseSync,
  input: CardInputParsed,
  opts: { isDemo?: boolean; author?: string; checklist?: { text: string; done: boolean }[]; createdAt?: string } = {},
): string {
  const id = newId("crd");
  const boardId = listBoard(db, input.listId);
  const now = opts.createdAt ?? nowIso();
  db.prepare(
    `INSERT INTO cards (id, board_id, list_id, position, title, description, scheduled_at, production_date, validation_date, status,
      objective, target, campaign_id, assignee_id, hook, caption, script, brief, cta, cover_media_id, parent_card_id, links, is_demo,
      created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    boardId,
    input.listId,
    input.position ?? nextPosition(db, input.listId),
    input.title,
    input.description,
    input.scheduledAt,
    input.productionDate,
    input.validationDate,
    input.status,
    input.objective,
    input.target,
    input.campaignId,
    input.assigneeId,
    input.hook,
    input.caption,
    input.script,
    input.brief,
    input.cta,
    input.coverMediaId,
    input.parentCardId,
    JSON.stringify(input.links),
    opts.isDemo ? 1 : 0,
    now,
    now,
  );
  writeLabels(db, id, input.labelIds);
  writeAttachments(db, id, input.attachmentIds);
  const items =
    opts.checklist ??
    (input.checklist ?? (() => {
      const settings = readSettings(db);
      return settings.autoChecklist ? settings.defaultChecklist : [];
    })()).map((text) => ({ text, done: false }));
  const ins = db.prepare("INSERT INTO checklist_items (id, card_id, text, done, position) VALUES (?, ?, ?, ?, ?)");
  items.forEach((it, i) => ins.run(newId("chk"), id, it.text, it.done ? 1 : 0, (i + 1) * 1024));
  logEvent(db, id, opts.author ?? "Équipe", "created", "");
  return id;
}

export async function createCard(raw: unknown, author: string): Promise<Card> {
  const input = cardInputSchema.parse(raw);
  const id = transaction((db) => {
    assertRefs(db, input);
    return insertCard(db, input, { author });
  });
  return getCard(id);
}

const COLUMNS: Record<string, string> = {
  title: "title",
  description: "description",
  scheduledAt: "scheduled_at",
  productionDate: "production_date",
  validationDate: "validation_date",
  status: "status",
  objective: "objective",
  target: "target",
  campaignId: "campaign_id",
  assigneeId: "assignee_id",
  hook: "hook",
  caption: "caption",
  script: "script",
  brief: "brief",
  cta: "cta",
  coverMediaId: "cover_media_id",
  listId: "list_id",
  position: "position",
};

const FIELD_NAMES: Record<string, string> = {
  title: "le titre",
  description: "la description interne",
  productionDate: "la date de production",
  validationDate: "la date limite de validation",
  objective: "l'objectif",
  target: "la cible",
  campaignId: "la campagne",
  assigneeId: "le responsable",
  hook: "l'accroche",
  caption: "la description du post",
  script: "le script",
  brief: "le brief créatif",
  cta: "l'appel à l'action",
  coverMediaId: "la couverture",
  labelIds: "les étiquettes",
  attachmentIds: "les médias",
  links: "les liens",
};

export async function updateCard(id: string, patch: CardPatch, author: string): Promise<Card> {
  transaction((db) => {
    const row = db.prepare("SELECT * FROM cards WHERE id = ?").get(id) as unknown as CardRow | undefined;
    if (!row) throw new NotFoundError("Carte introuvable.");
    assertRefs(db, patch);
    const sets: string[] = [];
    const values: (string | number | null)[] = [];
    const changed: string[] = [];

    if (patch.listId && patch.listId !== row.list_id) {
      const target = db.prepare("SELECT board_id, name FROM lists WHERE id = ?").get(patch.listId) as { board_id: string; name: string } | undefined;
      if (!target) throw new ValidationError("La liste de destination n'existe plus.");
      const from = db.prepare("SELECT name FROM lists WHERE id = ?").get(row.list_id) as { name: string } | undefined;
      if (target.board_id !== row.board_id) {
        sets.push("board_id = ?");
        values.push(target.board_id);
      }
      logEvent(db, id, author, "moved", `de « ${from?.name ?? "?"} » vers « ${target.name} »`);
    }
    for (const [key, column] of Object.entries(COLUMNS)) {
      const value = patch[key as keyof CardPatch];
      if (value === undefined) continue;
      const current = row[column as keyof CardRow];
      if (value === current) continue;
      sets.push(`${column} = ?`);
      values.push(value as string | number | null);
      if (key === "status") logEvent(db, id, author, "status", `${STATUS_LABELS[current as Status] ?? current} → ${STATUS_LABELS[value as Status]}`);
      else if (key === "scheduledAt") logEvent(db, id, author, "date", value ? String(value) : "date retirée");
      else if (key !== "listId" && key !== "position") changed.push(key);
    }
    if (patch.links) {
      sets.push("links = ?");
      values.push(JSON.stringify(patch.links));
      changed.push("links");
    }
    if (patch.archived !== undefined && patch.archived !== Boolean(row.archived_at)) {
      sets.push("archived_at = ?");
      values.push(patch.archived ? nowIso() : null);
      logEvent(db, id, author, patch.archived ? "archived" : "restored");
    }
    if (patch.labelIds) {
      writeLabels(db, id, patch.labelIds);
      changed.push("labelIds");
    }
    if (patch.attachmentIds) {
      writeAttachments(db, id, patch.attachmentIds);
      changed.push("attachmentIds");
    }
    // Regroupe les modifications de champs pour garder un historique lisible.
    if (changed.length) logEvent(db, id, author, "edited", changed.map((k) => FIELD_NAMES[k] ?? k).join(", "));
    sets.push("updated_at = ?");
    values.push(nowIso());
    db.prepare(`UPDATE cards SET ${sets.join(", ")} WHERE id = ?`).run(...values, id);
  });
  return getCard(id);
}

/** Copie d'une carte (contenu, étiquettes, médias, checklist décochée) placée juste après l'originale. */
export function copyCard(db: DatabaseSync, source: Card, overrides: Partial<CardInputParsed>, author: string, listId?: string): string {
  return insertCard(
    db,
    cardInputSchema.parse({
      listId: listId ?? source.listId,
      title: source.title,
      description: source.description,
      scheduledAt: source.scheduledAt,
      productionDate: source.productionDate,
      validationDate: source.validationDate,
      status: source.status === "publie" || source.status === "programme" ? "idee" : source.status,
      objective: source.objective,
      target: source.target,
      campaignId: source.campaignId,
      assigneeId: source.assigneeId,
      hook: source.hook,
      caption: source.caption,
      script: source.script,
      brief: source.brief,
      cta: source.cta,
      coverMediaId: source.coverMediaId,
      links: source.links,
      labelIds: source.labelIds,
      attachmentIds: source.attachmentIds,
      ...overrides,
    }),
    { author, checklist: source.checklist.map((c) => ({ text: c.text, done: false })) },
  );
}

export async function duplicateCard(id: string, author: string): Promise<Card> {
  const source = await getCard(id);
  const newId_ = transaction((db) => {
    const next = db.prepare("SELECT MIN(position) AS p FROM cards WHERE list_id = ? AND position > ?").get(source.listId, source.position) as { p: number | null };
    const position = next.p != null ? (source.position + next.p) / 2 : source.position + 1024;
    return copyCard(db, source, { title: `${source.title} (copie)`, position }, author);
  });
  return getCard(newId_);
}

/** Déclinaison : nouvelle carte liée à l'originale (parent_card_id). */
export async function declineCard(id: string, overrides: { title: string; labelIds: string[]; brief?: string }, author: string): Promise<Card> {
  const source = await getCard(id);
  const created = transaction((db) => {
    const cid = copyCard(
      db,
      source,
      {
        title: overrides.title,
        labelIds: overrides.labelIds,
        status: "idee",
        parentCardId: source.id,
        brief: overrides.brief ?? source.brief,
        position: undefined,
      },
      author,
    );
    db.prepare("UPDATE cards SET parent_card_id = ? WHERE id = ?").run(source.id, cid);
    logEvent(db, source.id, author, "declined", overrides.title);
    return cid;
  });
  return getCard(created);
}

/** Suppression définitive, possible uniquement pour une carte archivée (protection contre les erreurs). */
export async function deleteCard(id: string): Promise<void> {
  const db = getDb();
  const row = db.prepare("SELECT archived_at FROM cards WHERE id = ?").get(id) as { archived_at: string | null } | undefined;
  if (!row) throw new NotFoundError("Carte introuvable.");
  if (!row.archived_at) throw new ValidationError("Archivez la carte avant de la supprimer définitivement.");
  db.prepare("DELETE FROM cards WHERE id = ?").run(id);
}

/* ---------- Checklist ---------- */

export async function addChecklistItem(cardId: string, text: string, author: string, position?: number): Promise<ChecklistItem> {
  const db = getDb();
  if (!db.prepare("SELECT 1 FROM cards WHERE id = ?").get(cardId)) throw new NotFoundError("Carte introuvable.");
  const pos = position ?? (db.prepare("SELECT COALESCE(MAX(position), 0) AS m FROM checklist_items WHERE card_id = ?").get(cardId) as { m: number }).m + 1024;
  const id = newId("chk");
  db.prepare("INSERT INTO checklist_items (id, card_id, text, done, position) VALUES (?, ?, ?, 0, ?)").run(id, cardId, text, pos);
  db.prepare("UPDATE cards SET updated_at = ? WHERE id = ?").run(nowIso(), cardId);
  void author;
  return { id, cardId, text, done: false, position: pos };
}

export async function updateChecklistItem(id: string, patch: { text?: string; done?: boolean; position?: number }, author: string): Promise<ChecklistItem> {
  const db = getDb();
  const row = db.prepare("SELECT * FROM checklist_items WHERE id = ?").get(id) as { id: string; card_id: string; text: string; done: number; position: number } | undefined;
  if (!row) throw new NotFoundError("Élément introuvable.");
  const next = { text: patch.text ?? row.text, done: patch.done ?? row.done === 1, position: patch.position ?? row.position };
  db.prepare("UPDATE checklist_items SET text = ?, done = ?, position = ? WHERE id = ?").run(next.text, next.done ? 1 : 0, next.position, id);
  if (patch.done !== undefined && patch.done !== (row.done === 1)) logEvent(db, row.card_id, author, patch.done ? "checked" : "unchecked", next.text);
  db.prepare("UPDATE cards SET updated_at = ? WHERE id = ?").run(nowIso(), row.card_id);
  return { id, cardId: row.card_id, ...next };
}

export async function deleteChecklistItem(id: string): Promise<void> {
  const res = getDb().prepare("DELETE FROM checklist_items WHERE id = ?").run(id);
  if (!res.changes) throw new NotFoundError("Élément introuvable.");
}

/* ---------- Commentaires ---------- */

export async function listComments(cardId: string): Promise<Comment[]> {
  return (getDb().prepare("SELECT * FROM comments WHERE card_id = ? ORDER BY created_at DESC").all(cardId) as {
    id: string;
    card_id: string;
    author: string;
    body: string;
    created_at: string;
  }[]).map((r) => ({ id: r.id, cardId: r.card_id, author: r.author, body: r.body, createdAt: r.created_at }));
}

export async function addComment(cardId: string, body: string, author: string): Promise<Comment> {
  const db = getDb();
  if (!db.prepare("SELECT 1 FROM cards WHERE id = ?").get(cardId)) throw new NotFoundError("Carte introuvable.");
  const c: Comment = { id: newId("cmt"), cardId, author, body, createdAt: nowIso() };
  db.prepare("INSERT INTO comments (id, card_id, author, body, created_at) VALUES (?, ?, ?, ?, ?)").run(c.id, cardId, author, body, c.createdAt);
  return c;
}

export async function deleteComment(id: string): Promise<void> {
  const res = getDb().prepare("DELETE FROM comments WHERE id = ?").run(id);
  if (!res.changes) throw new NotFoundError("Commentaire introuvable.");
}
