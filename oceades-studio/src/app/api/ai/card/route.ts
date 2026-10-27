import { NextResponse } from "next/server";
import { LABEL_FAMILY_LABELS, OBJECTIVE_LABELS, STATUS_LABELS } from "@/lib/domain/constants";
import { assistCard, cardAssistRequestSchema } from "@/lib/server/ai";
import { getCard } from "@/lib/server/repositories/cards";
import { getCampaign } from "@/lib/server/repositories/campaigns";
import { listLabels } from "@/lib/server/repositories/labels";
import { readJson, route } from "@/lib/server/errors";

export const maxDuration = 300;

/** Propositions de rédaction pour une carte (descriptions, script, carrousel). Rien n'est enregistré ici. */
export const POST = route(async (request) => {
  const { cardId, mode, instructions } = cardAssistRequestSchema.parse(await readJson(request));
  const card = await getCard(cardId);
  const labels = await listLabels();
  const campaign = card.campaignId ? await getCampaign(card.campaignId).catch(() => null) : null;
  const byFamily = Object.entries(LABEL_FAMILY_LABELS)
    .map(([fam, name]) => {
      const names = labels.filter((l) => l.family === fam && card.labelIds.includes(l.id)).map((l) => l.name);
      return names.length ? `${name} : ${names.join(", ")}` : null;
    })
    .filter(Boolean)
    .join("\n");
  const context = [
    `Carte : ${card.title}`,
    byFamily,
    card.objective && `Objectif : ${OBJECTIVE_LABELS[card.objective]}`,
    card.target && `Cible : ${card.target}`,
    card.scheduledAt && `Publication prévue : ${card.scheduledAt}`,
    `Statut : ${STATUS_LABELS[card.status]}`,
    campaign && `Campagne : ${campaign.name} — ${campaign.objective}\nBrief campagne : ${campaign.brief}\nMessages clés : ${campaign.keyMessages}`,
    card.description && `Notes internes : ${card.description}`,
    card.hook && `Accroche actuelle : ${card.hook}`,
    card.caption && `Texte actuel : ${card.caption}`,
    card.brief && `Brief créatif : ${card.brief}`,
    card.cta && `CTA : ${card.cta}`,
  ]
    .filter(Boolean)
    .join("\n");
  return NextResponse.json({ mode, result: await assistCard(mode, context, instructions) });
});
