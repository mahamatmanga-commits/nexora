import "server-only";
import type { DatabaseSync } from "node:sqlite";
import { mondayOf, parseLocal, weekListName } from "@/lib/dates";
import { DEFAULT_CHECKLIST, type Status } from "@/lib/domain/constants";
import { cardInputSchema } from "@/lib/domain/schemas";
import { insertBoard, insertList } from "./repositories/boards";
import { insertCard } from "./repositories/cards";
import { ensureDefaultLabels, labelIdsByKey } from "./repositories/labels";

interface OldPost {
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
}

function mapStatus(old: string, format: string): Status {
  const video = format === "reel" || format === "video";
  switch (old) {
    case "a_produire":
      return video ? "a_tourner" : "a_designer";
    case "en_production":
      return video ? "a_monter" : "a_designer";
    case "a_valider":
    case "programme":
    case "publie":
      return old;
    default:
      return "idee";
  }
}

/**
 * Reprend les publications de la première version sous forme de cartes, dans un tableau
 * « Planning éditorial Océades ». Les anciennes tables sont conservées intactes.
 */
export function migratePostsToCards(db: DatabaseSync) {
  ensureDefaultLabels(db);
  const posts = db.prepare("SELECT * FROM posts ORDER BY scheduled_at IS NULL, scheduled_at").all() as unknown as OldPost[];
  if (!posts.length) return;

  const labels = labelIdsByKey(db);
  const boardId = insertBoard(db, "Planning éditorial Océades", "#203849");
  const ideas = insertList(db, boardId, { name: "💡 IDÉES", kind: "ideas", color: "#e2b203" });
  const weeks = [...new Set([mondayOf(new Date()), ...posts.filter((p) => p.scheduled_at && p.status !== "publie").map((p) => mondayOf(parseLocal(p.scheduled_at!)))])].sort();
  const weekLists = new Map(weeks.map((w) => [w, insertList(db, boardId, { name: weekListName(w), kind: "week", weekStart: w })]));
  const done = insertList(db, boardId, { name: "✅ PUBLIÉS", kind: "done", color: "#4bce97" });
  const mediaByPost = new Map<string, string[]>();
  for (const r of db.prepare("SELECT post_id, media_id FROM post_media ORDER BY position").all() as { post_id: string; media_id: string }[]) {
    mediaByPost.set(r.post_id, [...(mediaByPost.get(r.post_id) ?? []), r.media_id]);
  }

  for (const p of posts) {
    const status = mapStatus(p.status, p.format);
    const listId = status === "publie" ? done : p.scheduled_at ? weekLists.get(mondayOf(parseLocal(p.scheduled_at)))! : ideas;
    const flags = JSON.parse(p.checklist || "{}");
    const checklist = DEFAULT_CHECKLIST.map((text) => ({
      text,
      done:
        (text === "Visuel finalisé" && !!flags.visualReady) ||
        (text === "Description rédigée" && !!flags.textValidated) ||
        (text === "Publication programmée" && (status === "programme" || status === "publie")) ||
        (text === "Publication effectuée" && status === "publie"),
    }));
    const media = mediaByPost.get(p.id) ?? [];
    insertCard(
      db,
      cardInputSchema.parse({
        listId,
        title: p.title,
        description: p.notes,
        scheduledAt: p.scheduled_at,
        status,
        objective: p.objective,
        campaignId: p.campaign_id,
        hook: p.hook,
        caption: p.description,
        cta: p.cta,
        labelIds: [labels.get(p.activity), labels.get(p.platform), labels.get(p.format)].filter(Boolean),
        attachmentIds: media,
        coverMediaId: media[0] ?? null,
      }),
      { isDemo: p.is_demo === 1, checklist, createdAt: p.created_at, author: "Migration" },
    );
  }
}
