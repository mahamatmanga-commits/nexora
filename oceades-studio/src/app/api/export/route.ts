import { LABEL_FAMILY_LABELS, OBJECTIVE_LABELS, STATUS_LABELS, type LabelFamily } from "@/lib/domain/constants";
import { getDb } from "@/lib/server/db";
import { listCampaigns } from "@/lib/server/repositories/campaigns";
import { hydrateCards } from "@/lib/server/repositories/cards";
import { listLabels } from "@/lib/server/repositories/labels";
import { listMembers } from "@/lib/server/repositories/members";
import { route } from "@/lib/server/errors";

export const dynamic = "force-dynamic";

function cell(value: string | null | undefined): string {
  const v = value ?? "";
  // Neutralise les formules interprétées par les tableurs (injection CSV).
  const safe = /^[=+\-@\t]/.test(v) ? `'${v}` : v;
  return `"${safe.replace(/"/g, '""')}"`;
}

/** Export CSV de toutes les cartes actives (séparateur « ; » + BOM pour Excel). Paramètre optionnel ?board=<id>. */
export const GET = route(async (request) => {
  const boardId = new URL(request.url).searchParams.get("board");
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT c.*, l.name AS list_name, b.name AS board_name FROM cards c JOIN lists l ON l.id = c.list_id JOIN boards b ON b.id = c.board_id
       WHERE c.archived_at IS NULL ${boardId ? "AND c.board_id = ?" : ""} ORDER BY b.position, l.position, c.position`,
    )
    .all(...(boardId ? [boardId] : [])) as Record<string, string>[];
  const cards = hydrateCards(db, rows as never);
  const [labels, campaigns, members] = await Promise.all([listLabels(), listCampaigns(), listMembers()]);
  const labelById = new Map(labels.map((l) => [l.id, l]));
  const families: LabelFamily[] = ["activite", "plateforme", "format", "production", "autre"];
  const header = ["Tableau", "Liste", "Titre", "Date", "Heure", "Statut", ...families.map((f) => LABEL_FAMILY_LABELS[f]), "Objectif", "Campagne", "Responsable", "Accroche", "Description du post", "CTA", "Checklist"];
  const lines = cards.map((c, i) => {
    const [date, time] = c.scheduledAt ? c.scheduledAt.split("T") : ["", ""];
    const byFamily = (f: LabelFamily) => c.labelIds.map((id) => labelById.get(id)).filter((l) => l?.family === f).map((l) => l!.name).join(", ");
    return [
      rows[i].board_name,
      rows[i].list_name,
      c.title,
      date,
      time,
      STATUS_LABELS[c.status],
      ...families.map(byFamily),
      c.objective ? OBJECTIVE_LABELS[c.objective] : "",
      campaigns.find((x) => x.id === c.campaignId)?.name ?? "",
      members.find((m) => m.id === c.assigneeId)?.name ?? "",
      c.hook,
      c.caption,
      c.cta,
      `${c.checklist.filter((x) => x.done).length}/${c.checklist.length}`,
    ]
      .map(cell)
      .join(";");
  });
  const csv = "﻿" + [header.map(cell).join(";"), ...lines].join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="oceades-cartes-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
});
