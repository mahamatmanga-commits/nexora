import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { ServiceUnavailableError } from "./errors";

/**
 * Intégration IA — exclusivement côté serveur. La clé n'est jamais envoyée au navigateur.
 * Sans clé configurée, toutes les routes IA répondent 503 et l'interface désactive les boutons :
 * aucun contenu n'est simulé.
 */

export const AI_MODEL = process.env.OCEADES_AI_MODEL || "claude-opus-5-5";

export function isAiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!isAiConfigured()) {
    throw new ServiceUnavailableError("Assistant IA désactivé : aucune clé ANTHROPIC_API_KEY n'est configurée sur le serveur.");
  }
  client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 5 * 60 * 1000 });
  return client;
}

export const BRAND_CONTEXT = `Tu es le/la responsable éditorial(e) des réseaux sociaux des Océades, des clubs de sport et de bien-être.
Les Océades proposent quatre univers :
- Fitness : cours collectifs (RPM/vélo, Body Pump, Pilates, Zumba, HIIT, stretching…), remise en forme, bien-être.
- Musculation : plateau musculation, équipements, coaching et suivi de progression.
- Aquatique : aquagym, aquabike, aquafitness, natation et autres activités dans l'eau.
- Institut : massages, soins du visage, soins du corps, Head Spa, LPG, offres bien-être et cartes cadeaux.

Principes éditoriaux :
- Écrire en français naturel, chaleureux et concret, comme une équipe de club qui connaît ses adhérents.
- Montrer le réel : coachs, adhérents, coulisses, conseils pratiques, ambiance des cours. Éviter le ton publicitaire forcé,
  les superlatifs creux (« incroyable », « révolutionnaire »), les promesses de résultats physiques chiffrés et les clichés.
- Varier les angles : pédagogie, coulisses, témoignage, humour léger, question à la communauté, défi, avant/après d'une séance (jamais du corps).
- Respecter la santé : pas d'injonction minceur, pas de culpabilisation, pas de conseil médical.
- N'invente pas de prix, de promotions, d'horaires précis ou de noms de personnes réelles : si une information est nécessaire,
  écris un repère entre crochets à compléter, par exemple [prix de l'offre] ou [prénom du coach].
- Les emojis sont permis avec parcimonie (0 à 3 par texte). Hashtags : 3 à 6 maximum, pertinents et locaux si possible.`;

async function generate<T extends z.ZodType>(schema: T, system: string, prompt: string): Promise<z.infer<T>> {
  const anthropic = getClient();
  try {
    const response = await anthropic.beta.messages.parse({
      model: AI_MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: betaZodOutputFormat(schema) },
      system,
      messages: [{ role: "user", content: prompt }],
    });
    if (response.stop_reason === "refusal") {
      throw new ServiceUnavailableError("L'assistant a refusé cette demande. Reformulez votre brief.");
    }
    if (response.stop_reason === "max_tokens" || !response.parsed_output) {
      throw new ServiceUnavailableError("Réponse de l'IA incomplète. Réduisez le nombre de propositions et réessayez.");
    }
    return response.parsed_output as z.infer<T>;
  } catch (error) {
    if (error instanceof ServiceUnavailableError) throw error;
    if (error instanceof Anthropic.AuthenticationError) {
      throw new ServiceUnavailableError("Clé API Anthropic refusée. Vérifiez ANTHROPIC_API_KEY.");
    }
    if (error instanceof Anthropic.RateLimitError) {
      throw new ServiceUnavailableError("Limite d'utilisation de l'API atteinte, réessayez dans un instant.");
    }
    if (error instanceof Anthropic.APIConnectionError) {
      throw new ServiceUnavailableError("Impossible de joindre le service IA (connexion).");
    }
    if (error instanceof Anthropic.APIError) {
      console.error("[ai]", error.status, error.message);
      throw new ServiceUnavailableError(`Le service IA a renvoyé une erreur (${error.status ?? "inconnue"}).`);
    }
    // Réponse non conforme au schéma attendu (valeur hors liste, JSON tronqué…).
    console.error("[ai] réponse invalide", error);
    throw new ServiceUnavailableError("La réponse de l'IA n'a pas pu être interprétée. Relancez la génération.");
  }
}

/* ---------- Idées de publications (assistant) ---------- */

const ACTIVITY = z.enum(["fitness", "musculation", "aquatique", "institut", "global"]);
const PLATFORM = z.enum(["instagram", "facebook", "tiktok", "linkedin", "meta_ads"]);
const FORMAT = z.enum(["reel", "story", "carrousel", "photo", "video", "publicite", "article"]);
const OBJECTIVE = z.enum(["notoriete", "engagement", "trafic", "conversion", "fidelisation"]);

export const ideaSchema = z.object({
  title: z.string().describe("Titre court de la carte"),
  angle: z.string().describe("Angle éditorial en une phrase"),
  activity: ACTIVITY,
  platforms: z.array(PLATFORM).describe("1 ou 2 plateformes"),
  format: FORMAT,
  objective: OBJECTIVE,
  hooks: z.array(z.string()).describe("3 accroches différentes"),
  caption: z.string().describe("Texte du post prêt à adapter, hashtags en fin"),
  cta: z.string(),
  script: z.string().describe("Script plan par plan pour un reel/une vidéo, ou déroulé slide par slide pour un carrousel ; sinon chaîne vide"),
  brief: z.string().describe("Brief créatif pour la photo, la vidéo ou le visuel"),
});
export type AiIdea = z.infer<typeof ideaSchema>;

export const ideasRequestSchema = z.object({
  prompt: z.string().trim().min(3).max(1500),
  activity: ACTIVITY.nullable().default(null),
  platform: PLATFORM.nullable().default(null),
  format: FORMAT.nullable().default(null),
  objective: OBJECTIVE.nullable().default(null),
  count: z.number().int().min(1).max(8).default(5),
  recentTitles: z.array(z.string().max(300)).max(120).default([]),
});
export type IdeasRequest = z.infer<typeof ideasRequestSchema>;

export async function generateIdeas(req: IdeasRequest): Promise<AiIdea[]> {
  const constraints = [
    req.activity && `activité : ${req.activity}`,
    req.platform && `plateforme : ${req.platform}`,
    req.format && `format : ${req.format}`,
    req.objective && `objectif : ${req.objective}`,
  ].filter(Boolean);
  const prompt = `Demande : « ${req.prompt} »
Nombre d'idées : ${req.count}
${constraints.length ? `Contraintes : ${constraints.join(", ")}\n` : ""}
Contenus déjà prévus ou publiés (ne pas les répéter, chercher d'autres angles) :
${req.recentTitles.length ? req.recentTitles.map((t) => `- ${t}`).join("\n") : "- (aucun)"}

Chaque idée doit avoir un angle réellement différent.`;
  const out = await generate(z.object({ ideas: z.array(ideaSchema) }), BRAND_CONTEXT, prompt);
  return out.ideas.slice(0, req.count);
}

/* ---------- Aide à la rédaction depuis une carte ---------- */

export const cardAssistRequestSchema = z.object({
  cardId: z.string().min(1),
  mode: z.enum(["descriptions", "script", "carousel"]),
  instructions: z.string().trim().max(1000).default(""),
});

export const descriptionsSchema = z.object({
  versions: z.array(z.object({ style: z.string().describe("Style en 2-3 mots"), text: z.string() })).describe("3 versions distinctes"),
});
export const scriptSchema = z.object({
  hook: z.string(),
  durationSeconds: z.number(),
  shots: z.array(z.object({ timing: z.string(), visual: z.string(), voiceover: z.string().describe("Voix off, ou chaîne vide"), onScreenText: z.string() })),
  cta: z.string(),
});
export const carouselSchema = z.object({
  title: z.string().describe("Titre accrocheur de la première slide"),
  slides: z.array(z.object({ title: z.string(), text: z.string(), visual: z.string().describe("Idée de visuel") })).describe("Slides de contenu"),
  ctaSlide: z.object({ title: z.string(), text: z.string() }),
});

export async function assistCard(mode: "descriptions" | "script" | "carousel", context: string, instructions: string) {
  const extra = instructions ? `\nConsignes : ${instructions}` : "";
  switch (mode) {
    case "descriptions":
      return generate(descriptionsSchema, BRAND_CONTEXT, `${context}\n\nRédige 3 versions du texte du post, de styles différents (par exemple : directe, storytelling, pédagogique).${extra}`);
    case "script":
      return generate(scriptSchema, BRAND_CONTEXT, `${context}\n\nÉcris le script complet d'un Reel de 20 à 45 secondes : accroche, plan par plan avec timing, voix off éventuelle, textes à l'écran, CTA final.${extra}`);
    case "carousel":
      return generate(carouselSchema, BRAND_CONTEXT, `${context}\n\nConstruis un carrousel de 5 à 8 slides : titre accrocheur, contenu de chaque slide, idée de visuel par slide, dernière slide avec CTA.${extra}`);
  }
}

/* ---------- Organiser mon mois ---------- */

export const planSlotRequestSchema = z.object({
  key: z.string(),
  scheduledAt: z.string(),
  activity: z.string(),
  platform: z.string(),
  format: z.string(),
  objective: z.string(),
  campaign: z.string().default(""),
  themeHint: z.string().nullable().default(null),
});
export const planRequestSchema = z.object({
  slots: z.array(planSlotRequestSchema).min(1).max(40),
  instructions: z.string().trim().max(1500).default(""),
  recentTitles: z.array(z.string().max(300)).max(150).default([]),
});
export type PlanRequest = z.infer<typeof planRequestSchema>;

export const planIdeaSchema = z.object({
  key: z.string(),
  title: z.string(),
  hook: z.string(),
  caption: z.string(),
  cta: z.string(),
  brief: z.string().describe("Brief de production court"),
});
export type PlanIdea = z.infer<typeof planIdeaSchema>;

export async function writePlanIdeas(req: PlanRequest): Promise<PlanIdea[]> {
  const prompt = `Voici des créneaux de publication déjà structurés (dates, activités, formats, objectifs équilibrés).
Propose une idée pour CHAQUE créneau en conservant exactement sa clé "key". Toutes les idées doivent être différentes,
cohérentes avec la date (saison, temps forts) et éviter les sujets déjà traités.
${req.instructions ? `\nConsignes de l'équipe : ${req.instructions}\n` : ""}
Créneaux :
${req.slots
  .map((s) => `- key=${s.key} | ${s.scheduledAt} | ${s.activity} | ${s.platform} | ${s.format} | objectif ${s.objective}` + (s.campaign ? ` | campagne : ${s.campaign}` : "") + (s.themeHint ? ` | piste : ${s.themeHint}` : ""))
  .join("\n")}

Sujets déjà traités :
${req.recentTitles.length ? req.recentTitles.map((t) => `- ${t}`).join("\n") : "- (aucun)"}`;
  const out = await generate(z.object({ ideas: z.array(planIdeaSchema) }), BRAND_CONTEXT, prompt);
  return out.ideas;
}
