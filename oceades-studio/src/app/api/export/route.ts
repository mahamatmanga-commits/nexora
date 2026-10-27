import { ACTIVITY_LABELS, FORMAT_LABELS, OBJECTIVE_LABELS, PLATFORM_LABELS, STATUS_LABELS } from "@/lib/domain/constants";
import { listCampaigns } from "@/lib/server/repositories/campaigns";
import { listPosts } from "@/lib/server/repositories/posts";
import { errorResponse } from "@/lib/server/errors";

export const dynamic = "force-dynamic";

function cell(value: string | null | undefined): string {
  const v = (value ?? "").replace(/\r?\n/g, "\n");
  // Neutralise les formules interprétées par les tableurs (injection CSV).
  const safe = /^[=+\-@\t]/.test(v) ? `'${v}` : v;
  return `"${safe.replace(/"/g, '""')}"`;
}

/** Export CSV (séparateur « ; » + BOM UTF-8 pour une ouverture directe dans Excel en français). */
export async function GET() {
  try {
    const [posts, campaigns] = await Promise.all([listPosts(), listCampaigns()]);
    const campaignName = new Map(campaigns.map((c) => [c.id, c.name]));
    const header = ["Titre", "Date", "Heure", "Plateforme", "Activité", "Format", "Objectif", "Statut", "Campagne", "Accroche", "Description", "CTA", "Notes", "Démo"];
    const lines = posts.map((p) => {
      const [date, time] = p.scheduledAt ? p.scheduledAt.split("T") : ["", ""];
      return [
        p.title, date, time, PLATFORM_LABELS[p.platform], ACTIVITY_LABELS[p.activity], FORMAT_LABELS[p.format],
        OBJECTIVE_LABELS[p.objective], STATUS_LABELS[p.status], p.campaignId ? campaignName.get(p.campaignId) ?? "" : "",
        p.hook, p.description, p.cta, p.notes, p.isDemo ? "oui" : "non",
      ].map(cell).join(";");
    });
    const csv = "﻿" + [header.map(cell).join(";"), ...lines].join("\r\n");
    const stamp = new Date().toISOString().slice(0, 10);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="oceades-publications-${stamp}.csv"`,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
