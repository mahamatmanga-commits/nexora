import "server-only";
import type { DatabaseSync } from "node:sqlite";
import type { ListKind } from "@/lib/domain/constants";
import type { Board, BoardData, BoardList } from "@/lib/domain/types";
import { addDaysKey, mondayOf, weekListName } from "@/lib/dates";
import { getDb, newId, nowIso, transaction } from "../db";
import { NotFoundError, ValidationError } from "../errors";
import { boardCards, copyCard, getCard, hydrateCards } from "./cards";

interface BoardRow {
  id: string;
  name: string;
  background: string;
  position: number;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}
interface ListRow {
  id: string;
  board_id: string;
  name: string;
  color: string | null;
  kind: string;
  week_start: string | null;
  position: number;
  archived_at: string | null;
}

const toBoard = (r: BoardRow): Board => ({
  id: r.id,
  name: r.name,
  background: r.background,
  position: r.position,
  archivedAt: r.archived_at,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});
const toList = (r: ListRow): BoardList => ({
  id: r.id,
  boardId: r.board_id,
  name: r.name,
  color: r.color,
  kind: r.kind as ListKind,
  weekStart: r.week_start,
  position: r.position,
  archivedAt: r.archived_at,
});

/* ---------- Tableaux ---------- */

export async function listBoards(): Promise<Board[]> {
  return (getDb().prepare("SELECT * FROM boards ORDER BY archived_at IS NOT NULL, position, created_at").all() as unknown as BoardRow[]).map(toBoard);
}

export async function getBoardData(id: string): Promise<BoardData> {
  const db = getDb();
  const row = db.prepare("SELECT * FROM boards WHERE id = ?").get(id) as unknown as BoardRow | undefined;
  if (!row) throw new NotFoundError("Tableau introuvable.");
  const lists = (db.prepare("SELECT * FROM lists WHERE board_id = ? ORDER BY position").all(id) as unknown as ListRow[]).map(toList);
  return { board: toBoard(row), lists, cards: boardCards(db, id) };
}

export function insertBoard(db: DatabaseSync, name: string, background: string): string {
  const id = newId("brd");
  const max = (db.prepare("SELECT COALESCE(MAX(position), 0) AS m FROM boards").get() as { m: number }).m;
  const now = nowIso();
  db.prepare("INSERT INTO boards (id, name, background, position, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)").run(id, name, background, max + 1024, now, now);
  return id;
}

export function insertList(
  db: DatabaseSync,
  boardId: string,
  input: { name: string; kind?: ListKind; color?: string | null; weekStart?: string | null; position?: number },
): string {
  const id = newId("lst");
  const pos = input.position ?? (db.prepare("SELECT COALESCE(MAX(position), 0) AS m FROM lists WHERE board_id = ?").get(boardId) as { m: number }).m + 1024;
  const now = nowIso();
  db.prepare("INSERT INTO lists (id, board_id, name, color, kind, week_start, position, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
    id,
    boardId,
    input.name,
    input.color ?? null,
    input.kind ?? "normal",
    input.weekStart ?? null,
    pos,
    now,
    now,
  );
  return id;
}

/** Listes par défaut : 💡 IDÉES, 4 semaines à partir de la semaine en cours, ✅ PUBLIÉS. */
export function insertDefaultLists(db: DatabaseSync, boardId: string, from = new Date()): Record<string, string> {
  const ids: Record<string, string> = {};
  ids.ideas = insertList(db, boardId, { name: "💡 IDÉES", kind: "ideas", color: "#e2b203" });
  let monday = mondayOf(from);
  for (let i = 0; i < 4; i++) {
    ids[monday] = insertList(db, boardId, { name: weekListName(monday), kind: "week", weekStart: monday });
    monday = addDaysKey(monday, 7);
  }
  ids.done = insertList(db, boardId, { name: "✅ PUBLIÉS", kind: "done", color: "#4bce97" });
  return ids;
}

export async function createBoard(input: { name: string; background: string; withDefaultLists: boolean }): Promise<BoardData> {
  const id = transaction((db) => {
    const bid = insertBoard(db, input.name, input.background);
    if (input.withDefaultLists) insertDefaultLists(db, bid);
    return bid;
  });
  return getBoardData(id);
}

export async function updateBoard(id: string, patch: { name?: string; background?: string; position?: number; archived?: boolean }): Promise<Board> {
  const db = getDb();
  const row = db.prepare("SELECT * FROM boards WHERE id = ?").get(id) as unknown as BoardRow | undefined;
  if (!row) throw new NotFoundError("Tableau introuvable.");
  if (patch.archived) {
    const active = (db.prepare("SELECT COUNT(*) AS n FROM boards WHERE archived_at IS NULL AND id != ?").get(id) as { n: number }).n;
    if (!active) throw new ValidationError("Impossible d'archiver le dernier tableau actif.");
  }
  db.prepare("UPDATE boards SET name = ?, background = ?, position = ?, archived_at = ?, updated_at = ? WHERE id = ?").run(
    patch.name ?? row.name,
    patch.background ?? row.background,
    patch.position ?? row.position,
    patch.archived === undefined ? row.archived_at : patch.archived ? nowIso() : null,
    nowIso(),
    id,
  );
  return toBoard(db.prepare("SELECT * FROM boards WHERE id = ?").get(id) as unknown as BoardRow);
}

/** Duplique un tableau : listes actives et cartes actives (sans commentaires ni historique). */
export async function duplicateBoard(id: string, author: string): Promise<BoardData> {
  const data = await getBoardData(id);
  const newBoard = transaction((db) => {
    const bid = insertBoard(db, `${data.board.name} (copie)`, data.board.background);
    for (const list of data.lists.filter((l) => !l.archivedAt)) {
      const lid = insertList(db, bid, { name: list.name, kind: list.kind, color: list.color, weekStart: list.weekStart, position: list.position });
      for (const card of data.cards.filter((c) => c.listId === list.id && !c.archivedAt)) copyCard(db, card, { position: card.position }, author, lid);
    }
    return bid;
  });
  return getBoardData(newBoard);
}

export async function deleteBoard(id: string): Promise<void> {
  const db = getDb();
  const row = db.prepare("SELECT archived_at FROM boards WHERE id = ?").get(id) as { archived_at: string | null } | undefined;
  if (!row) throw new NotFoundError("Tableau introuvable.");
  if (!row.archived_at) throw new ValidationError("Archivez le tableau avant de le supprimer définitivement.");
  db.prepare("DELETE FROM boards WHERE id = ?").run(id);
}

/* ---------- Listes ---------- */

export async function getList(id: string): Promise<BoardList> {
  const row = getDb().prepare("SELECT * FROM lists WHERE id = ?").get(id) as unknown as ListRow | undefined;
  if (!row) throw new NotFoundError("Liste introuvable.");
  return toList(row);
}

export async function createList(input: { boardId: string; name: string; color: string | null; kind: ListKind; weekStart: string | null; position?: number }): Promise<BoardList> {
  const id = transaction((db) => {
    if (!db.prepare("SELECT 1 FROM boards WHERE id = ?").get(input.boardId)) throw new ValidationError("Tableau introuvable.");
    return insertList(db, input.boardId, input);
  });
  return getList(id);
}

export async function updateList(
  id: string,
  patch: { name?: string; color?: string | null; kind?: ListKind; weekStart?: string | null; position?: number; archived?: boolean },
): Promise<BoardList> {
  const db = getDb();
  const row = db.prepare("SELECT * FROM lists WHERE id = ?").get(id) as unknown as ListRow | undefined;
  if (!row) throw new NotFoundError("Liste introuvable.");
  db.prepare("UPDATE lists SET name = ?, color = ?, kind = ?, week_start = ?, position = ?, archived_at = ?, updated_at = ? WHERE id = ?").run(
    patch.name ?? row.name,
    patch.color === undefined ? row.color : patch.color,
    patch.kind ?? row.kind,
    patch.weekStart === undefined ? row.week_start : patch.weekStart,
    patch.position ?? row.position,
    patch.archived === undefined ? row.archived_at : patch.archived ? nowIso() : null,
    nowIso(),
    id,
  );
  return getList(id);
}

/** Duplique une liste et ses cartes actives, juste à droite de l'originale. */
export async function duplicateList(id: string, author: string): Promise<{ list: BoardList; cards: Awaited<ReturnType<typeof getCard>>[] }> {
  const db = getDb();
  const source = await getList(id);
  const cards = boardCards(db, source.boardId).filter((c) => c.listId === id && !c.archivedAt);
  const created = transaction((tx) => {
    const next = tx.prepare("SELECT MIN(position) AS p FROM lists WHERE board_id = ? AND position > ?").get(source.boardId, source.position) as { p: number | null };
    const position = next.p != null ? (source.position + next.p) / 2 : source.position + 1024;
    const lid = insertList(tx, source.boardId, { name: `${source.name} (copie)`, kind: source.kind === "week" ? "normal" : source.kind, color: source.color, position });
    const cardIds = cards.map((c) => copyCard(tx, c, { position: c.position }, author, lid));
    return { lid, cardIds };
  });
  const rows = db.prepare(`SELECT * FROM cards WHERE id IN (${created.cardIds.map(() => "?").join(",") || "''"})`).all(...created.cardIds);
  return { list: await getList(created.lid), cards: hydrateCards(db, rows as never) };
}

export async function deleteList(id: string): Promise<void> {
  const db = getDb();
  const row = db.prepare("SELECT archived_at FROM lists WHERE id = ?").get(id) as { archived_at: string | null } | undefined;
  if (!row) throw new NotFoundError("Liste introuvable.");
  if (!row.archived_at) throw new ValidationError("Archivez la liste avant de la supprimer définitivement.");
  db.prepare("DELETE FROM lists WHERE id = ?").run(id);
}
