import "server-only";
import { z } from "zod";
import { LABEL_PALETTE, MEMBER_COLORS, type ListKind } from "@/lib/domain/constants";
import { cardInputSchema } from "@/lib/domain/schemas";
import { mondayOf, weekListName } from "@/lib/dates";
import { normalize } from "@/lib/utils";
import { getDb, newId, nowIso, transaction } from "./db";
import { insertBoard, insertList } from "./repositories/boards";
import { insertCard, logEvent } from "./repositories/cards";
import { ensureDefaultLabels } from "./repositories/labels";

/**
 * Import d'un export JSON Trello (Menu du tableau → Imprimer, exporter et partager → Exporter en JSON).
 * Lecture seule du fichier : le tableau Trello d'origine n'est jamais modifié.
 */

const trelloSchema = z.object({
  name: z.string().default("Tableau Trello"),
  lists: z.array(z.object({ id: z.string(), name: z.string(), closed: z.boolean().default(false), pos: z.number().default(0) })).default([]),
  cards: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        desc: z.string().default(""),
        idList: z.string(),
        idLabels: z.array(z.string()).default([]),
        idMembers: z.array(z.string()).default([]),
        idChecklists: z.array(z.string()).default([]),
        due: z.string().nullable().default(null),
        dueComplete: z.boolean().default(false),
        closed: z.boolean().default(false),
        pos: z.number().default(0),
        attachments: z.array(z.object({ name: z.string().default(""), url: z.string().default(""), isUpload: z.boolean().optional() })).default([]),
        cover: z.object({ idAttachment: z.string().nullable().optional() }).partial().nullable().optional(),
      }),
    )
    .default([]),
  labels: z.array(z.object({ id: z.string(), name: z.string().default(""), color: z.string().nullable().default(null) })).default([]),
  checklists: z
    .array(z.object({ id: z.string(), idCard: z.string(), name: z.string().default(""), pos: z.number().default(0), checkItems: z.array(z.object({ name: z.string(), state: z.string(), pos: z.number().default(0) })).default([]) }))
    .default([]),
  members: z.array(z.object({ id: z.string(), fullName: z.string().default("") })).default([]),
  actions: z
    .array(
      z.object({
        type: z.string(),
        date: z.string(),
        data: z.object({ text: z.string().optional(), card: z.object({ id: z.string() }).partial().optional() }).passthrough(),
        memberCreator: z.object({ fullName: z.string().default("") }).partial().optional(),
      }),
    )
    .default([]),
});
type TrelloData = z.infer<typeof trelloSchema>;

/** Couleurs Trello → palette Océades. */
const TRELLO_COLORS: Record<string, string> = {
  green: "#216e4e",
  yellow: "#7f5f01",
  orange: "#a54800",
  red: "#ae2e24",
  purple: "#5e4db2",
  blue: "#0055cc",
  sky: "#206a83",
  lime: "#4c6b1f",
  pink: "#943d73",
  black: "#44546f",
};
const COLOR_NAMES: Record<string, string> = {
  green: "verte",
  yellow: "jaune",
  orange: "orange",
  red: "rouge",
  purple: "violette",
  blue: "bleue",
  sky: "ciel",
  lime: "citron",
  pink: "rose",
  black: "noire",
};
/** Nom d'une étiquette Trello ; les étiquettes sans nom prennent le nom de leur couleur. */
const labelName = (l: { name: string; color: string | null }) => l.name.trim() || `Étiquette ${COLOR_NAMES[(l.color ?? "").replace(/_(dark|light)$/, "")] ?? "sans nom"}`;
const colorOf = (c: string | null) => (c ? TRELLO_COLORS[c.replace(/_(dark|light)$/, "")] ?? LABEL_PALETTE[11].color : LABEL_PALETTE[11].color);

const MONTHS = ["janvier", "fevrier", "mars", "avril", "mai", "juin", "juillet", "aout", "septembre", "octobre", "novembre", "decembre"];

/** « Semaine du 26 octobre au 1er novembre » → lundi correspondant (année la plus proche d'aujourd'hui). */
export function parseWeekName(name: string, now = new Date()): string | null {
  const m = normalize(name).match(/semaine du (\d{1,2})(?:er)?\s*([a-z]+)?\s*au\s*(\d{1,2})(?:er)?\s+([a-z]+)/);
  if (!m) return null;
  const endMonth = MONTHS.indexOf(m[4]);
  const startMonth = m[2] ? MONTHS.indexOf(m[2]) : endMonth;
  if (startMonth < 0 || endMonth < 0) return null;
  const candidates = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => new Date(y, startMonth, Number(m[1])));
  const best = candidates.sort((a, b) => Math.abs(a.getTime() - now.getTime()) - Math.abs(b.getTime() - now.getTime()))[0];
  return mondayOf(best);
}

function listKind(name: string): ListKind {
  const n = normalize(name);
  if (/idee/.test(n)) return "ideas";
  if (/publie/.test(n)) return "done";
  if (/^semaine du/.test(n.replace(/[^a-z0-9 ]/g, "").trim())) return "week";
  return "normal";
}

/** Échéance Trello (UTC) → heure locale des clubs (Europe/Paris), au format "AAAA-MM-JJTHH:MM". */
function toParis(iso: string): string {
  const parts = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

export interface TrelloPreview {
  boardName: string;
  lists: { name: string; kind: ListKind; cards: number; archived: boolean }[];
  cards: number;
  archivedCards: number;
  labels: { name: string; color: string; matched: string | null }[];
  checklistItems: number;
  comments: number;
  attachments: number;
  members: string[];
  duplicates: { title: string; existingIn: string }[];
  warnings: string[];
}

export function parseTrello(raw: unknown): TrelloData {
  const res = trelloSchema.safeParse(raw);
  if (!res.success) throw new Error("Ce fichier ne ressemble pas à un export JSON Trello.");
  if (!res.data.lists.length && !res.data.cards.length) throw new Error("L'export ne contient ni liste ni carte.");
  return res.data;
}

function existingLabels() {
  const db = getDb();
  ensureDefaultLabels(db);
  return db.prepare("SELECT id, name FROM labels").all() as { id: string; name: string }[];
}

export function previewTrello(data: TrelloData): TrelloPreview {
  const labels = existingLabels();
  const db = getDb();
  const existing = db
    .prepare("SELECT c.title, b.name AS board FROM cards c JOIN boards b ON b.id = c.board_id WHERE c.archived_at IS NULL AND b.archived_at IS NULL")
    .all() as { title: string; board: string }[];
  const existingByTitle = new Map(existing.map((e) => [normalize(e.title.trim()), e.board]));
  const comments = data.actions.filter((a) => a.type === "commentCard").length;
  const attachments = data.cards.reduce((n, c) => n + c.attachments.length, 0);
  const uploads = data.cards.reduce((n, c) => n + c.attachments.filter((a) => a.isUpload).length, 0);
  const warnings: string[] = [];
  if (uploads) warnings.push(`${uploads} pièce(s) jointe(s) hébergée(s) sur Trello : seuls leurs liens sont repris (les fichiers restent sur Trello).`);
  if (data.cards.some((c) => c.cover?.idAttachment)) warnings.push("Les images de couverture Trello ne sont pas reprises ; importez les visuels dans la médiathèque puis définissez-les comme couverture.");
  warnings.push("Les automatisations (Butler), Power-Ups, votes et autocollants ne sont pas importés.");

  return {
    boardName: data.name,
    lists: data.lists
      .sort((a, b) => a.pos - b.pos)
      .map((l) => ({ name: l.name, kind: listKind(l.name), cards: data.cards.filter((c) => c.idList === l.id).length, archived: l.closed })),
    cards: data.cards.filter((c) => !c.closed).length,
    archivedCards: data.cards.filter((c) => c.closed).length,
    labels: data.labels
      .filter((l) => l.name || l.color)
      .map((l) => ({ name: labelName(l), color: colorOf(l.color), matched: labels.find((x) => normalize(x.name) === normalize(labelName(l)))?.name ?? null })),
    checklistItems: data.checklists.reduce((n, c) => n + c.checkItems.length, 0),
    comments,
    attachments,
    members: data.members.map((m) => m.fullName).filter(Boolean),
    duplicates: data.cards
      .filter((c) => !c.closed && existingByTitle.has(normalize(c.name.trim())))
      .map((c) => ({ title: c.name, existingIn: existingByTitle.get(normalize(c.name.trim()))! })),
    warnings,
  };
}

/** Crée un nouveau tableau à partir de l'export (jamais de fusion silencieuse avec l'existant). */
export function importTrello(data: TrelloData, opts: { skipDuplicates: boolean; author: string }): { boardId: string; cards: number; skipped: number } {
  const existingTitles = new Set(
    (getDb().prepare("SELECT title FROM cards WHERE archived_at IS NULL").all() as { title: string }[]).map((r) => normalize(r.title.trim())),
  );
  return transaction((db) => {
    ensureDefaultLabels(db);
    const boardId = insertBoard(db, data.name, "#203849");

    // Étiquettes : réutilise une étiquette existante de même nom, sinon en crée une (famille « Autres »).
    const known = db.prepare("SELECT id, name FROM labels").all() as { id: string; name: string }[];
    const labelMap = new Map<string, string>();
    for (const l of data.labels) {
      if (!l.name.trim() && !l.color) continue;
      const name = labelName(l).slice(0, 40);
      const match = known.find((k) => normalize(k.name) === normalize(name));
      if (match) labelMap.set(l.id, match.id);
      else {
        const id = newId("lab");
        db.prepare("INSERT INTO labels (id, family, key, name, color, position, created_at) VALUES (?, 'autre', NULL, ?, ?, 100, ?)").run(id, name, colorOf(l.color), nowIso());
        known.push({ id, name });
        labelMap.set(l.id, id);
      }
    }

    // Membres : rattachés par nom complet, créés si besoin.
    const memberMap = new Map<string, string>();
    const members = db.prepare("SELECT id, name FROM members").all() as { id: string; name: string }[];
    data.members.forEach((m, i) => {
      if (!m.fullName) return;
      const found = members.find((x) => normalize(x.name) === normalize(m.fullName));
      if (found) memberMap.set(m.id, found.id);
      else {
        const id = newId("mbr");
        db.prepare("INSERT INTO members (id, name, color, created_at) VALUES (?, ?, ?, ?)").run(id, m.fullName, MEMBER_COLORS[(members.length + i) % MEMBER_COLORS.length], nowIso());
        memberMap.set(m.id, id);
      }
    });

    // Listes, dans l'ordre Trello.
    const listMap = new Map<string, { id: string; kind: ListKind }>();
    data.lists
      .sort((a, b) => a.pos - b.pos)
      .forEach((l, i) => {
        const kind = listKind(l.name);
        const weekStart = kind === "week" ? parseWeekName(l.name) : null;
        const id = insertList(db, boardId, { name: kind === "week" && weekStart && !l.name.trim() ? weekListName(weekStart) : l.name, kind: kind === "week" && !weekStart ? "normal" : kind, weekStart, position: (i + 1) * 1024 });
        if (l.closed) db.prepare("UPDATE lists SET archived_at = ? WHERE id = ?").run(nowIso(), id);
        listMap.set(l.id, { id, kind });
      });

    const commentsByCard = new Map<string, { text: string; author: string; date: string }[]>();
    for (const a of data.actions) {
      if (a.type !== "commentCard" || !a.data.card?.id || !a.data.text) continue;
      commentsByCard.set(a.data.card.id, [...(commentsByCard.get(a.data.card.id) ?? []), { text: a.data.text, author: a.memberCreator?.fullName || "Trello", date: a.date }]);
    }

    let created = 0;
    let skipped = 0;
    for (const c of [...data.cards].sort((a, b) => a.pos - b.pos)) {
      const list = listMap.get(c.idList);
      if (!list) continue;
      if (opts.skipDuplicates && !c.closed && existingTitles.has(normalize(c.name.trim()))) {
        skipped++;
        continue;
      }
      const checklists = data.checklists.filter((k) => k.idCard === c.id).sort((a, b) => a.pos - b.pos);
      const items = checklists.flatMap((k) =>
        [...k.checkItems].sort((a, b) => a.pos - b.pos).map((it) => ({ text: (checklists.length > 1 ? `${k.name} — ${it.name}` : it.name).slice(0, 300), done: it.state === "complete" })),
      );
      const id = insertCard(
        db,
        cardInputSchema.parse({
          listId: list.id,
          title: c.name.slice(0, 300) || "Sans titre",
          description: c.desc.slice(0, 20000),
          scheduledAt: c.due ? toParis(c.due) : null,
          status: list.kind === "done" || c.dueComplete ? "publie" : "idee",
          assigneeId: c.idMembers.map((m) => memberMap.get(m)).find(Boolean) ?? null,
          labelIds: [...new Set(c.idLabels.map((l) => labelMap.get(l)).filter(Boolean))],
          links: c.attachments.filter((a) => /^https?:\/\//.test(a.url)).slice(0, 50).map((a) => ({ name: (a.name || a.url).slice(0, 200), url: a.url.slice(0, 2000) })),
          position: (created + 1) * 1024,
        }),
        { author: opts.author, checklist: items },
      );
      if (c.closed) db.prepare("UPDATE cards SET archived_at = ? WHERE id = ?").run(nowIso(), id);
      for (const cm of commentsByCard.get(c.id) ?? []) {
        db.prepare("INSERT INTO comments (id, card_id, author, body, created_at) VALUES (?, ?, ?, ?, ?)").run(newId("cmt"), id, cm.author, cm.text.slice(0, 5000), cm.date);
      }
      logEvent(db, id, opts.author, "edited", "import depuis Trello");
      created++;
    }
    return { boardId, cards: created, skipped };
  });
}
