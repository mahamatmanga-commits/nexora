import { z } from "zod";
import {
  ACTIVITY_KEYS,
  CAMPAIGN_KINDS,
  LABEL_FAMILIES,
  LIST_KINDS,
  MEDIA_CATEGORIES,
  OBJECTIVES,
  STATUSES,
} from "./constants";

/** Date-heure locale (heure des clubs), sans fuseau : "2026-11-03T18:30". */
export const localDateTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Date invalide (AAAA-MM-JJTHH:MM)");
export const localDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide (AAAA-MM-JJ)");
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Couleur invalide");
const text = (max: number) => z.string().trim().max(max, `${max} caractères maximum`);

/* ---------- Tableaux ---------- */

export const boardInputSchema = z.object({
  name: text(100).min(1, "Le nom est obligatoire"),
  background: hex.default("#203849"),
  /** Crée les listes par défaut (Idées, semaines, Publiés). */
  withDefaultLists: z.boolean().default(true),
});
export const boardPatchSchema = z.object({
  name: text(100).min(1).optional(),
  background: hex.optional(),
  position: z.number().finite().optional(),
  archived: z.boolean().optional(),
});

/* ---------- Listes ---------- */

export const listInputSchema = z.object({
  boardId: z.string().min(1),
  name: text(100).min(1, "Le nom est obligatoire"),
  color: hex.nullable().default(null),
  kind: z.enum(LIST_KINDS).default("normal"),
  weekStart: localDate.nullable().default(null),
  position: z.number().finite().optional(),
});
export const listPatchSchema = z.object({
  name: text(100).min(1).optional(),
  color: hex.nullable().optional(),
  kind: z.enum(LIST_KINDS).optional(),
  weekStart: localDate.nullable().optional(),
  position: z.number().finite().optional(),
  archived: z.boolean().optional(),
});

/* ---------- Cartes ---------- */

const linkSchema = z.object({ name: text(200), url: z.string().url().max(2000) });

const cardFields = {
  title: text(300).min(1, "Le titre est obligatoire"),
  description: text(20000),
  scheduledAt: localDateTime.nullable(),
  productionDate: localDate.nullable(),
  validationDate: localDate.nullable(),
  status: z.enum(STATUSES),
  objective: z.enum(OBJECTIVES).nullable(),
  target: text(500),
  campaignId: z.string().nullable(),
  assigneeId: z.string().nullable(),
  hook: text(1000),
  caption: text(10000),
  script: text(20000),
  brief: text(10000),
  cta: text(500),
  coverMediaId: z.string().nullable(),
  links: z.array(linkSchema).max(50),
  labelIds: z.array(z.string()).max(40),
  attachmentIds: z.array(z.string()).max(50),
};

export const cardInputSchema = z.object({
  listId: z.string().min(1),
  position: z.number().finite().optional(),
  parentCardId: z.string().nullable().default(null),
  /** Éléments de checklist ; si absent, la checklist par défaut est appliquée (selon les paramètres). */
  checklist: z.array(text(300).min(1)).max(50).optional(),
  title: cardFields.title,
  description: cardFields.description.default(""),
  scheduledAt: cardFields.scheduledAt.default(null),
  productionDate: cardFields.productionDate.default(null),
  validationDate: cardFields.validationDate.default(null),
  status: cardFields.status.default("idee"),
  objective: cardFields.objective.default(null),
  target: cardFields.target.default(""),
  campaignId: cardFields.campaignId.default(null),
  assigneeId: cardFields.assigneeId.default(null),
  hook: cardFields.hook.default(""),
  caption: cardFields.caption.default(""),
  script: cardFields.script.default(""),
  brief: cardFields.brief.default(""),
  cta: cardFields.cta.default(""),
  coverMediaId: cardFields.coverMediaId.default(null),
  links: cardFields.links.default([]),
  labelIds: cardFields.labelIds.default([]),
  attachmentIds: cardFields.attachmentIds.default([]),
});
export type CardInput = z.input<typeof cardInputSchema>;

export const cardPatchSchema = z
  .object({
    ...cardFields,
    listId: z.string().min(1),
    position: z.number().finite(),
    archived: z.boolean(),
  })
  .partial();
export type CardPatch = z.infer<typeof cardPatchSchema>;

export const checklistItemInputSchema = z.object({ text: text(300).min(1, "Texte obligatoire"), position: z.number().finite().optional() });
export const checklistItemPatchSchema = z.object({ text: text(300).min(1).optional(), done: z.boolean().optional(), position: z.number().finite().optional() });
export const commentInputSchema = z.object({ body: text(5000).min(1, "Commentaire vide") });

/* ---------- Étiquettes, membres, paramètres ---------- */

export const labelInputSchema = z.object({
  family: z.enum(LABEL_FAMILIES),
  name: text(40).min(1, "Nom obligatoire"),
  color: hex,
});
export const labelPatchSchema = z.object({ name: text(40).min(1).optional(), color: hex.optional(), family: z.enum(LABEL_FAMILIES).optional(), position: z.number().finite().optional() });

export const memberInputSchema = z.object({ name: text(60).min(1, "Nom obligatoire"), color: hex.optional() });
export const memberPatchSchema = memberInputSchema.partial();

export const settingsSchema = z.object({
  balanceTargets: z.record(z.string(), z.number().min(0).max(100)),
  defaultChecklist: z.array(text(300).min(1)).max(50),
  autoChecklist: z.boolean(),
});

/* ---------- Campagnes, médias ---------- */

export const campaignInputSchema = z
  .object({
    name: text(120).min(1, "Le nom est obligatoire"),
    kind: z.enum(CAMPAIGN_KINDS).default("campagne"),
    objective: text(500).default(""),
    brief: text(5000).default(""),
    startDate: localDate,
    endDate: localDate,
    activities: z.array(z.enum(ACTIVITY_KEYS)).default([]),
    targetAudience: text(500).default(""),
    keyMessages: text(3000).default(""),
    color: hex.default("#2c5a7a"),
  })
  .refine((c) => c.endDate >= c.startDate, { message: "La fin doit suivre le début", path: ["endDate"] });
export const campaignPatchSchema = z.object({
  name: text(120).min(1).optional(),
  kind: z.enum(CAMPAIGN_KINDS).optional(),
  objective: text(500).optional(),
  brief: text(5000).optional(),
  startDate: localDate.optional(),
  endDate: localDate.optional(),
  activities: z.array(z.enum(ACTIVITY_KEYS)).optional(),
  targetAudience: text(500).optional(),
  keyMessages: text(3000).optional(),
  color: hex.optional(),
});
export type CampaignInput = z.infer<typeof campaignInputSchema>;
export type CampaignPatch = z.infer<typeof campaignPatchSchema>;

export const mediaPatchSchema = z.object({
  name: text(200).min(1).optional(),
  category: z.enum(MEDIA_CATEGORIES).optional(),
  activity: z.enum(ACTIVITY_KEYS).nullable().optional(),
  tags: z.array(text(40).min(1)).max(30).optional(),
  rightsChecked: z.boolean().optional(),
  notes: text(2000).optional(),
});
export type MediaPatch = z.infer<typeof mediaPatchSchema>;
