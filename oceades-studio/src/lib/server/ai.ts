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

/* ---------- Idées de publications ---------- */

export const ideaSchema = z.object({
  title: z.string().describe("Nom interne court de la publication"),
  angle: z.string().describe("L'angle éditorial en une phrase : pourquoi ce contenu est intéressant pour l'audience"),
  activity: z.enum(["fitness", "musculation", "aquatique", "institut", "global"]),
  platform: z.enum(["instagram", "facebook", "tiktok", "linkedin"]),
  format: z.enum(["reel", "story", "carrousel", "photo", "video", "publicite"]),
  objective: z.enum(["notoriete", "engagement", "trafic", "conversion", "fidelisation"]),
  hooks: z.array(z.string()).describe("3 accroches différentes pour la même idée"),
  captionInstagram: z.string().describe("Légende prête à publier sur Instagram, avec hashtags en fin"),
  captionFacebook: z.string().describe("Version Facebook, un peu plus explicative, sans excès de hashtags"),
  cta: z.string().describe("Appel à l'action principal, concret"),
  ctaAlternatives: z.array(z.string()).describe("2 autres appels à l'action possibles"),
  reelScript: z
    .array(z.object({ timing: z.string(), visual: z.string(), text: z.string() }))
    .describe("Script plan par plan si le format est reel ou vidéo, sinon tableau vide"),
  carouselSlides: z
    .array(z.object({ title: z.string(), text: z.string() }))
    .describe("Slides une par une si le format est carrousel, sinon tableau vide"),
  shootingBrief: z.string().describe("Brief pour le photographe ou vidéaste : lieu, personnes, plans, lumière, matériel"),
  formatAdvice: z.string().describe("Recommandation de format et pourquoi, alternatives éventuelles"),
  suggestedDay: z.string().describe("Jour et heure conseillés, ou chaîne vide"),
});
export type AiIdea = z.infer<typeof ideaSchema>;

export const ideasRequestSchema = z.object({
  activity: z.enum(["fitness", "musculation", "aquatique", "institut", "global"]),
  platform: z.enum(["instagram", "facebook", "tiktok", "linkedin"]),
  format: z.enum(["reel", "story", "carrousel", "photo", "video", "publicite", "auto"]),
  objective: z.enum(["notoriete", "engagement", "trafic", "conversion", "fidelisation"]),
  audience: z.string().trim().max(300).default(""),
  period: z.string().trim().max(120).default(""),
  tone: z.string().trim().max(120).default("chaleureux et concret"),
  count: z.number().int().min(1).max(6).default(3),
  brief: z.string().trim().max(1500).default(""),
  recentTitles: z.array(z.string().max(200)).max(80).default([]),
  campaign: z.string().trim().max(1500).default(""),
});
export type IdeasRequest = z.infer<typeof ideasRequestSchema>;

export async function generateIdeas(req: IdeasRequest): Promise<AiIdea[]> {
  const prompt = `Propose ${req.count} idée(s) de publication distinctes pour les Océades.

Paramètres :
- Activité : ${req.activity}
- Réseau social : ${req.platform}
- Format : ${req.format === "auto" ? "à recommander selon l'idée" : req.format}
- Objectif marketing : ${req.objective}
- Cible : ${req.audience || "adhérents et prospects du club"}
- Période : ${req.period || "non précisée"}
- Ton : ${req.tone}
${req.campaign ? `- Campagne associée :\n${req.campaign}\n` : ""}${req.brief ? `- Consignes supplémentaires : ${req.brief}\n` : ""}
Publications déjà prévues ou publiées récemment (ne pas les répéter, trouver des angles différents) :
${req.recentTitles.length ? req.recentTitles.map((t) => `- ${t}`).join("\n") : "- (aucune)"}

Chaque idée doit avoir un angle réellement différent des autres. Remplis reelScript uniquement pour un reel ou une vidéo,
carouselSlides uniquement pour un carrousel (5 à 8 slides).`;
  const out = await generate(z.object({ ideas: z.array(ideaSchema) }), BRAND_CONTEXT, prompt);
  return out.ideas.slice(0, req.count);
}

/* ---------- Rédaction d'un planning ---------- */

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
  recentTitles: z.array(z.string().max(200)).max(120).default([]),
});
export type PlanRequest = z.infer<typeof planRequestSchema>;

export const planIdeaSchema = z.object({
  key: z.string(),
  title: z.string(),
  hook: z.string(),
  description: z.string().describe("Légende prête à adapter"),
  cta: z.string(),
  notes: z.string().describe("Brief de production court pour l'équipe (visuel, tournage, éléments à préparer)"),
});
export type PlanIdea = z.infer<typeof planIdeaSchema>;

export async function writePlanIdeas(req: PlanRequest): Promise<PlanIdea[]> {
  const prompt = `Voici un planning éditorial déjà structuré (dates, activités, formats et objectifs équilibrés).
Rédige une idée de publication pour CHAQUE créneau, en conservant exactement la clé "key" de chaque créneau.
Les idées doivent toutes être différentes, cohérentes avec la date (saison, temps forts) et éviter les sujets déjà traités.
${req.instructions ? `\nConsignes de l'équipe : ${req.instructions}\n` : ""}
Créneaux :
${req.slots
  .map(
    (s) =>
      `- key=${s.key} | ${s.scheduledAt} | ${s.activity} | ${s.platform} | ${s.format} | objectif ${s.objective}` +
      (s.campaign ? ` | campagne : ${s.campaign}` : "") +
      (s.themeHint ? ` | piste : ${s.themeHint}` : ""),
  )
  .join("\n")}

Sujets déjà traités récemment :
${req.recentTitles.length ? req.recentTitles.map((t) => `- ${t}`).join("\n") : "- (aucun)"}`;
  const out = await generate(z.object({ ideas: z.array(planIdeaSchema) }), BRAND_CONTEXT, prompt);
  return out.ideas;
}
