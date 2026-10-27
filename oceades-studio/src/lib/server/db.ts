import "server-only";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { seedDemoData } from "./seed";
import { migratePostsToCards } from "./migrate-posts";

/**
 * Persistance locale : SQLite intégré à Node 22 (aucune dépendance native à compiler).
 * Le schéma est volontairement calqué sur supabase/migrations/0001_init.sql
 * afin de pouvoir basculer vers PostgreSQL/Supabase sans changer le modèle.
 */

const DATA_DIR = path.resolve(process.env.OCEADES_DATA_DIR ?? "./data");
const DB_FILE = path.join(DATA_DIR, "oceades.db");

const MIGRATIONS: (string | ((db: DatabaseSync) => void))[] = [
  `
  CREATE TABLE campaigns (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'campagne',
    objective TEXT NOT NULL DEFAULT '',
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    activities TEXT NOT NULL DEFAULT '[]',
    target_audience TEXT NOT NULL DEFAULT '',
    key_messages TEXT NOT NULL DEFAULT '',
    color TEXT NOT NULL DEFAULT '#203849',
    is_demo INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE posts (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    scheduled_at TEXT,
    platform TEXT NOT NULL,
    activity TEXT NOT NULL,
    format TEXT NOT NULL,
    objective TEXT NOT NULL,
    status TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    hook TEXT NOT NULL DEFAULT '',
    cta TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    campaign_id TEXT REFERENCES campaigns(id) ON DELETE SET NULL,
    checklist TEXT NOT NULL DEFAULT '{}',
    is_demo INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX posts_scheduled_at_idx ON posts(scheduled_at);
  CREATE INDEX posts_campaign_idx ON posts(campaign_id);
  CREATE TABLE media (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size INTEGER NOT NULL,
    category TEXT NOT NULL,
    tags TEXT NOT NULL DEFAULT '[]',
    storage_key TEXT NOT NULL,
    rights_checked INTEGER NOT NULL DEFAULT 0,
    notes TEXT NOT NULL DEFAULT '',
    is_demo INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );
  CREATE TABLE post_media (
    post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    media_id TEXT NOT NULL REFERENCES media(id) ON DELETE CASCADE,
    position INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (post_id, media_id)
  );
  `,
  // v2 — modèle « Trello » : tableaux, listes, cartes, étiquettes, checklists, commentaires, historique.
  `
  CREATE TABLE boards (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    background TEXT NOT NULL DEFAULT '#203849',
    position REAL NOT NULL DEFAULT 0,
    archived_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE lists (
    id TEXT PRIMARY KEY,
    board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT,
    kind TEXT NOT NULL DEFAULT 'normal',
    week_start TEXT,
    position REAL NOT NULL,
    archived_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX lists_board_idx ON lists(board_id);
  CREATE TABLE labels (
    id TEXT PRIMARY KEY,
    family TEXT NOT NULL,
    key TEXT,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    position REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );
  CREATE TABLE members (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE cards (
    id TEXT PRIMARY KEY,
    board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    list_id TEXT NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
    position REAL NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    scheduled_at TEXT,
    production_date TEXT,
    validation_date TEXT,
    status TEXT NOT NULL DEFAULT 'idee',
    objective TEXT,
    target TEXT NOT NULL DEFAULT '',
    campaign_id TEXT REFERENCES campaigns(id) ON DELETE SET NULL,
    assignee_id TEXT REFERENCES members(id) ON DELETE SET NULL,
    hook TEXT NOT NULL DEFAULT '',
    caption TEXT NOT NULL DEFAULT '',
    script TEXT NOT NULL DEFAULT '',
    brief TEXT NOT NULL DEFAULT '',
    cta TEXT NOT NULL DEFAULT '',
    cover_media_id TEXT REFERENCES media(id) ON DELETE SET NULL,
    parent_card_id TEXT REFERENCES cards(id) ON DELETE SET NULL,
    links TEXT NOT NULL DEFAULT '[]',
    archived_at TEXT,
    is_demo INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX cards_list_idx ON cards(list_id, position);
  CREATE INDEX cards_board_idx ON cards(board_id);
  CREATE INDEX cards_scheduled_idx ON cards(scheduled_at);
  CREATE TABLE card_labels (
    card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    label_id TEXT NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
    PRIMARY KEY (card_id, label_id)
  );
  CREATE TABLE card_attachments (
    card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    media_id TEXT NOT NULL REFERENCES media(id) ON DELETE CASCADE,
    position INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (card_id, media_id)
  );
  CREATE TABLE checklist_items (
    id TEXT PRIMARY KEY,
    card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    done INTEGER NOT NULL DEFAULT 0,
    position REAL NOT NULL
  );
  CREATE INDEX checklist_card_idx ON checklist_items(card_id);
  CREATE TABLE comments (
    id TEXT PRIMARY KEY,
    card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    author TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX comments_card_idx ON comments(card_id);
  CREATE TABLE card_events (
    id TEXT PRIMARY KEY,
    card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    author TEXT NOT NULL,
    type TEXT NOT NULL,
    detail TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );
  CREATE INDEX events_card_idx ON card_events(card_id, created_at);
  CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  ALTER TABLE campaigns ADD COLUMN brief TEXT NOT NULL DEFAULT '';
  ALTER TABLE media ADD COLUMN activity TEXT;
  `,
  // v3 — reprise des publications de la première version sous forme de cartes (rien n'est supprimé).
  (db) => migratePostsToCards(db),
];

function migrate(db: DatabaseSync) {
  db.exec("CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL)");
  const row = db.prepare("SELECT version FROM schema_version").get() as { version: number } | undefined;
  let version = row?.version ?? 0;
  if (!row) db.prepare("INSERT INTO schema_version (version) VALUES (0)").run();
  while (version < MIGRATIONS.length) {
    db.exec("BEGIN");
    try {
      const step = MIGRATIONS[version];
      if (typeof step === "string") db.exec(step);
      else step(db);
      version += 1;
      db.prepare("UPDATE schema_version SET version = ?").run(version);
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
}

function open(): DatabaseSync {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const isNew = !fs.existsSync(DB_FILE);
  const db = new DatabaseSync(DB_FILE);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 3000;");
  migrate(db);
  if (isNew) seedDemoData(db);
  return db;
}

const globalForDb = globalThis as unknown as { __oceadesDb?: DatabaseSync };

export function getDb(): DatabaseSync {
  if (!globalForDb.__oceadesDb) globalForDb.__oceadesDb = open();
  return globalForDb.__oceadesDb;
}

/** Exécute une fonction dans une transaction SQLite. */
export function transaction<T>(fn: (db: DatabaseSync) => T): T {
  const db = getDb();
  db.exec("BEGIN");
  try {
    const result = fn(db);
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
