import { z } from "zod";
import {
  ACTIVITIES,
  CAMPAIGN_KINDS,
  FORMATS,
  MEDIA_CATEGORIES,
  OBJECTIVES,
  PLATFORMS,
  STATUSES,
} from "./constants";

/** Date-heure locale (heure de Paris), sans fuseau : "2026-11-03T18:30". */
export const localDateTime = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Format de date invalide (AAAA-MM-JJTHH:MM)");
export const localDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format de date invalide (AAAA-MM-JJ)");

const trimmed = (max: number) => z.string().trim().max(max, `${max} caractères maximum`);

export const checklistSchema = z.object({
  visualReady: z.boolean().default(false),
  textValidated: z.boolean().default(false),
  rightsChecked: z.boolean().default(false),
});

export const postInputSchema = z.object({
  title: trimmed(160).min(1, "Le titre est obligatoire"),
  scheduledAt: localDateTime.nullable().default(null),
  platform: z.enum(PLATFORMS),
  activity: z.enum(ACTIVITIES),
  format: z.enum(FORMATS),
  objective: z.enum(OBJECTIVES),
  status: z.enum(STATUSES).default("idee"),
  description: trimmed(10000).default(""),
  hook: trimmed(500).default(""),
  cta: trimmed(300).default(""),
  notes: trimmed(5000).default(""),
  campaignId: z.string().nullable().default(null),
  mediaIds: z.array(z.string()).max(30).default([]),
  checklist: checklistSchema.default({ visualReady: false, textValidated: false, rightsChecked: false }),
});
export const postPatchSchema = postInputSchema.partial();

export type PostInput = z.infer<typeof postInputSchema>;
export type PostPatch = z.infer<typeof postPatchSchema>;
export type Checklist = z.infer<typeof checklistSchema>;

export const campaignInputSchema = z
  .object({
    name: trimmed(120).min(1, "Le nom est obligatoire"),
    kind: z.enum(CAMPAIGN_KINDS).default("campagne"),
    objective: trimmed(500).default(""),
    startDate: localDate,
    endDate: localDate,
    activities: z.array(z.enum(ACTIVITIES)).default([]),
    targetAudience: trimmed(500).default(""),
    keyMessages: trimmed(3000).default(""),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#203849"),
  })
  .refine((c) => c.endDate >= c.startDate, {
    message: "La date de fin doit suivre la date de début",
    path: ["endDate"],
  });
export const campaignPatchSchema = z.object({
  name: trimmed(120).min(1).optional(),
  kind: z.enum(CAMPAIGN_KINDS).optional(),
  objective: trimmed(500).optional(),
  startDate: localDate.optional(),
  endDate: localDate.optional(),
  activities: z.array(z.enum(ACTIVITIES)).optional(),
  targetAudience: trimmed(500).optional(),
  keyMessages: trimmed(3000).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});
export type CampaignInput = z.infer<typeof campaignInputSchema>;
export type CampaignPatch = z.infer<typeof campaignPatchSchema>;

export const mediaPatchSchema = z.object({
  name: trimmed(200).min(1).optional(),
  category: z.enum(MEDIA_CATEGORIES).optional(),
  tags: z.array(trimmed(40).min(1)).max(30).optional(),
  rightsChecked: z.boolean().optional(),
  notes: trimmed(2000).optional(),
});
export type MediaPatch = z.infer<typeof mediaPatchSchema>;
