import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  getISODay,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import {
  ACTIVITY_LABELS,
  FORMAT_LABELS,
  PLATFORM_FORMATS,
  type Activity,
  type Format,
  type Objective,
  type Platform,
} from "@/lib/domain/constants";
import type { Campaign, Post } from "@/lib/domain/types";
import { dayKey, parseLocal } from "@/lib/dates";
import { momentsBetween } from "./seasonal";
import { tokens, similarity } from "./repetition";

/**
 * Générateur de planning éditorial — logique déterministe et explicable.
 * Il répartit les créneaux, équilibre activités / formats / objectifs en tenant compte de l'existant
 * et des campagnes, puis (optionnellement) l'IA rédige une idée pour chaque créneau.
 */

export interface PlannerOptions {
  month: string; // "AAAA-MM"
  postsPerWeek: number;
  activities: Activity[];
  platforms: Platform[];
  /** Jours ISO préférés : 1 = lundi … 7 = dimanche. */
  preferredDays: number[];
  /** Heures de publication proposées, en alternance. */
  preferredTimes: string[];
  /** Compter les publications déjà prévues dans le rythme hebdomadaire. */
  countExisting: boolean;
}

export interface PlanSlot {
  key: string;
  scheduledAt: string;
  activity: Activity;
  platform: Platform;
  format: Format;
  objective: Objective;
  campaignId: string | null;
  themeHint: string | null;
  rationale: string[];
}

export interface PlanAnalysis {
  existingInMonth: number;
  existingByActivity: Record<string, number>;
  underRepresented: Activity[];
  moments: { name: string; start: string; end: string }[];
  campaigns: { id: string; name: string }[];
}

const OBJECTIVE_ROTATION: Objective[] = ["notoriete", "engagement", "conversion", "engagement", "fidelisation", "trafic"];

function spreadDays(candidates: Date[], count: number): Date[] {
  if (count >= candidates.length) return candidates;
  if (count <= 0) return [];
  const result: Date[] = [];
  const step = candidates.length / count;
  for (let i = 0; i < count; i++) result.push(candidates[Math.min(candidates.length - 1, Math.floor(i * step + step / 2 - 0.5))]);
  return [...new Set(result)];
}

export function buildPlan(
  options: PlannerOptions,
  posts: Post[],
  campaigns: Campaign[],
): { slots: PlanSlot[]; analysis: PlanAnalysis } {
  const monthStart = startOfMonth(parseISO(`${options.month}-01`));
  const monthEnd = endOfMonth(monthStart);
  const monthPosts = posts.filter((p) => {
    if (!p.scheduledAt) return false;
    const d = parseLocal(p.scheduledAt);
    return d >= monthStart && d <= addDays(monthEnd, 1);
  });

  const activities = options.activities.length ? options.activities : (["fitness", "musculation", "aquatique", "institut"] as Activity[]);
  const platforms = options.platforms.length ? options.platforms : (["instagram", "facebook"] as Platform[]);
  const times = options.preferredTimes.length ? options.preferredTimes : ["12:15", "18:30"];
  const preferredDays = options.preferredDays.length ? options.preferredDays : [1, 3, 5];

  // 1. Créneaux par semaine (semaines ISO qui touchent le mois).
  const postsByDay = new Map<string, number>();
  for (const p of monthPosts) postsByDay.set(p.scheduledAt!.slice(0, 10), (postsByDay.get(p.scheduledAt!.slice(0, 10)) ?? 0) + 1);

  const dates: Date[] = [];
  let weekStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  while (weekStart <= monthEnd) {
    const weekDays = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) }).filter(
      (d) => d >= monthStart && d <= monthEnd,
    );
    const existing = options.countExisting ? weekDays.reduce((n, d) => n + (postsByDay.get(dayKey(d)) ?? 0), 0) : 0;
    // Prorata pour les semaines partielles (début / fin de mois).
    const quota = Math.round((options.postsPerWeek * weekDays.length) / 7);
    const needed = Math.max(0, quota - existing);
    let candidates = weekDays.filter((d) => preferredDays.includes(getISODay(d)));
    if (candidates.length < needed) candidates = weekDays;
    // On privilégie les jours sans publication existante.
    const free = candidates.filter((d) => !postsByDay.get(dayKey(d)));
    const pool = free.length >= needed ? free : candidates;
    dates.push(...spreadDays(pool, needed));
    weekStart = addDays(weekStart, 7);
  }
  dates.sort((a, b) => a.getTime() - b.getTime());

  // 2. Analyse de l'existant.
  const existingByActivity: Record<string, number> = Object.fromEntries(activities.map((a) => [a, 0]));
  for (const p of monthPosts) if (p.activity in existingByActivity) existingByActivity[p.activity]++;
  const total = monthPosts.filter((p) => activities.includes(p.activity)).length + dates.length;
  const target = total / activities.length;
  const assigned: Record<string, number> = { ...existingByActivity };
  const underRepresented = activities.filter((a) => existingByActivity[a] < target * 0.6);

  const formatUse = new Map<string, number>();
  for (const p of monthPosts) formatUse.set(`${p.activity}:${p.format}`, (formatUse.get(`${p.activity}:${p.format}`) ?? 0) + 1);
  const globalFormatUse = new Map<Format, number>();
  for (const p of monthPosts) globalFormatUse.set(p.format, (globalFormatUse.get(p.format) ?? 0) + 1);

  const moments = momentsBetween(monthStart, monthEnd);
  const monthCampaigns = campaigns.filter((c) => parseISO(c.startDate) <= monthEnd && parseISO(c.endDate) >= monthStart);
  const usedThemes = monthPosts.map((p) => tokens(`${p.title} ${p.hook}`));

  // 3. Attribution de chaque créneau.
  const slots: PlanSlot[] = [];
  let prevActivity: Activity | null = null;
  let prevFormat: Format | null = null;
  let platformIndex = 0;
  dates.forEach((date, i) => {
    const day = dayKey(date);
    const rationale: string[] = [];

    // Activité : plus gros déficit par rapport à la cible, en évitant deux fois la même d'affilée.
    const ranked = [...activities].sort((a, b) => assigned[a] - assigned[b]);
    const activity = ranked.find((a) => a !== prevActivity) ?? ranked[0];
    if (underRepresented.includes(activity) && existingByActivity[activity] === assigned[activity]) {
      rationale.push(`${ACTIVITY_LABELS[activity]} est sous-représenté ce mois-ci`);
    }
    assigned[activity]++;

    // Campagne active à cette date et pertinente pour l'activité.
    const campaign = monthCampaigns.find(
      (c) => c.startDate <= day && c.endDate >= day && (c.activities.includes(activity) || c.activities.includes("global")),
    );

    // Plateforme : rotation sur les plateformes retenues.
    let platform = platforms[platformIndex % platforms.length];
    platformIndex++;

    // Format : le moins utilisé pour cette activité, compatible avec la plateforme, différent du précédent.
    const formats = PLATFORM_FORMATS[platform].filter((f) => f !== "publicite");
    const format =
      [...formats]
        .filter((f) => f !== prevFormat)
        .sort(
          (a, b) =>
            (formatUse.get(`${activity}:${a}`) ?? 0) - (formatUse.get(`${activity}:${b}`) ?? 0) ||
            (globalFormatUse.get(a) ?? 0) - (globalFormatUse.get(b) ?? 0),
        )[0] ?? formats[0];
    formatUse.set(`${activity}:${format}`, (formatUse.get(`${activity}:${format}`) ?? 0) + 1);
    globalFormatUse.set(format, (globalFormatUse.get(format) ?? 0) + 1);
    if (!PLATFORM_FORMATS[platform].includes(format)) platform = platforms[0];

    // Objectif : campagne → conversion/trafic, sinon rotation pour couvrir tout le tunnel.
    let objective = OBJECTIVE_ROTATION[i % OBJECTIVE_ROTATION.length];
    if (campaign) {
      objective = i % 2 === 0 ? "conversion" : "trafic";
      rationale.push(`Pendant la campagne « ${campaign.name} »`);
    }

    // Piste éditoriale : temps fort saisonnier, en évitant les sujets déjà traités.
    let themeHint: string | null = null;
    for (const m of moments.filter((m) => m.start <= day && m.end >= day)) {
      const ideas = m.ideas[activity] ?? m.ideas.global ?? [];
      const fresh = ideas.find((idea) => {
        const t = tokens(idea);
        return !usedThemes.some((u) => similarity(u, t) >= 0.3);
      });
      if (fresh) {
        themeHint = fresh;
        usedThemes.push(tokens(fresh));
        rationale.push(`Temps fort : ${m.name}`);
        break;
      }
    }
    if (!themeHint && campaign?.keyMessages) themeHint = campaign.keyMessages.split("\n")[0];

    rationale.push(`Format ${FORMAT_LABELS[format].toLowerCase()} pour varier les contenus ${ACTIVITY_LABELS[activity].toLowerCase()}`);

    slots.push({
      key: `slot-${i}-${day}`,
      scheduledAt: `${day}T${times[i % times.length]}`,
      activity,
      platform,
      format,
      objective,
      campaignId: campaign?.id ?? null,
      themeHint,
      rationale,
    });
    prevActivity = activity;
    prevFormat = format;
  });

  return {
    slots,
    analysis: {
      existingInMonth: monthPosts.length,
      existingByActivity,
      underRepresented,
      moments: moments.map((m) => ({ name: m.name, start: m.start, end: m.end })),
      campaigns: monthCampaigns.map((c) => ({ id: c.id, name: c.name })),
    },
  };
}
