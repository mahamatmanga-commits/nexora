import { getDb } from "@/lib/server/db";
import { route } from "@/lib/server/errors";

export const dynamic = "force-dynamic";

const TABLES = ["boards", "lists", "labels", "members", "campaigns", "cards", "card_labels", "card_attachments", "checklist_items", "comments", "card_events", "media", "settings"];

/** Sauvegarde JSON complète de la base (hors fichiers médias, conservés dans storage/). */
export const GET = route(async () => {
  const db = getDb();
  const data = Object.fromEntries(TABLES.map((t) => [t, db.prepare(`SELECT * FROM ${t}`).all()]));
  const body = JSON.stringify({ app: "oceades-studio", version: 2, exportedAt: new Date().toISOString(), data }, null, 2);
  return new Response(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="oceades-sauvegarde-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
});
