import { addDays, eachDayOfInterval, endOfMonth, getISODay, parseISO, startOfMonth, startOfWeek } from "date-fns";
import type { FormatKey, Objective, PlatformKey } from "@/lib/domain/constants";
import type { Campaign, Card, Label } from "@/lib/domain/types";
import { cardLabels, familyKeys, labelKey } from "@/lib/cards";
import { dayKey, parseLocal } from "@/lib/dates";
import { momentsBetween } from "./seasonal";
import { similarity, tokens } from "./repetition";

/**
 * « Organiser mon mois » — logique déterministe et explicable :
 * créneaux selon le rythme souhaité, activités choisies selon l'écart aux objectifs d'équilibre,
 * formats alternés, campagnes et temps forts pris en compte. L'IA (optionnelle) rédige ensuite chaque idée.
 */

export interface PlannerOptions {
  month: string; // AAAA-MM
  postsPerWeek: number;
  activities: string[]; // clés d'activité
  platforms: PlatformKey[];
  preferredDays: number[]; // 1 = lundi … 7 = dimanche
  preferredTimes: string[];
  countExisting: boolean;
}

export interface PlanSlot {
  key: string;
  scheduledAt: string;
  activity: string;
  platform: PlatformKey;
  format: FormatKey;
  objective: Objective;
  campaignId: string | null;
  title: string;
  hint: string | null;
  reasons: string[];
}

const FORMATS_BY_PLATFORM: Record<PlatformKey, FormatKey[]> = {
  instagram: ["reel", "carrousel", "story", "photo"],
  facebook: ["photo", "reel", "carrousel", "video"],
  tiktok: ["video"],
  linkedin: ["carrousel", "photo", "article", "video"],
  meta_ads: ["publicite"],
};
const OBJECTIVES: Objective[] = ["notoriete", "engagement", "conversion", "engagement", "fidelisation", "trafic"];
const FORMAT_NAMES: Record<string, string> = { reel: "Reel", story: "Story", carrousel: "Carrousel", photo: "Photo", video: "Vidéo", publicite: "Publicité", article: "Article" };

function spread<T>(items: T[], count: number): T[] {
  if (count >= items.length) return items;
  const out: T[] = [];
  const step = items.length / count;
  for (let i = 0; i < count; i++) out.push(items[Math.floor(i * step + step / 2 - 0.5)]);
  return [...new Set(out)];
}

export function buildPlan(opts: PlannerOptions, cards: Card[], labelById: Map<string, Label>, campaigns: Campaign[], targets: Record<string, number>) {
  const start = startOfMonth(parseISO(`${opts.month}-01`));
  const end = endOfMonth(start);
  const monthCards = cards.filter((c) => !c.archivedAt && c.scheduledAt && parseLocal(c.scheduledAt) >= start && parseLocal(c.scheduledAt) <= addDays(end, 1));
  const activities = opts.activities.length ? opts.activities : ["fitness", "musculation", "aquatique", "institut"];
  const platforms = opts.platforms.length ? opts.platforms : (["instagram", "facebook"] as PlatformKey[]);
  const times = opts.preferredTimes.length ? opts.preferredTimes : ["12:15", "18:30"];
  const days = opts.preferredDays.length ? opts.preferredDays : [1, 3, 5];
  const activityName = (k: string) => [...labelById.values()].find((l) => l.family === "activite" && labelKey(l) === k)?.name ?? k;

  // 1. Créneaux par semaine, en tenant compte de l'existant.
  const perDay = new Map<string, number>();
  for (const c of monthCards) perDay.set(c.scheduledAt!.slice(0, 10), (perDay.get(c.scheduledAt!.slice(0, 10)) ?? 0) + 1);
  const dates: Date[] = [];
  for (let w = startOfWeek(start, { weekStartsOn: 1 }); w <= end; w = addDays(w, 7)) {
    const week = eachDayOfInterval({ start: w, end: addDays(w, 6) }).filter((d) => d >= start && d <= end);
    const existing = opts.countExisting ? week.reduce((n, d) => n + (perDay.get(dayKey(d)) ?? 0), 0) : 0;
    const needed = Math.max(0, Math.round((opts.postsPerWeek * week.length) / 7) - existing);
    let pool = week.filter((d) => days.includes(getISODay(d)));
    if (pool.length < needed) pool = week;
    const free = pool.filter((d) => !perDay.get(dayKey(d)));
    dates.push(...spread(free.length >= needed ? free : pool, needed));
  }
  dates.sort((a, b) => a.getTime() - b.getTime());

  // 2. Analyse : répartition actuelle vs objectifs.
  const counts: Record<string, number> = Object.fromEntries(activities.map((a) => [a, 0]));
  for (const c of monthCards) {
    const a = familyKeys(c, labelById, "activite").find((k) => k in counts);
    if (a) counts[a]++;
  }
  const existingByActivity = { ...counts };
  const weight = (a: string) => Math.max(1, targets[a] ?? 100 / activities.length);
  const totalWeight = activities.reduce((s, a) => s + weight(a), 0);
  const formatUse = new Map<string, number>();
  for (const c of monthCards) for (const f of familyKeys(c, labelById, "format")) formatUse.set(f, (formatUse.get(f) ?? 0) + 1);
  const moments = momentsBetween(start, end);
  const monthCampaigns = campaigns.filter((c) => parseISO(c.startDate) <= end && parseISO(c.endDate) >= start);
  const used = cards.filter((c) => !c.archivedAt).map((c) => tokens(`${c.title} ${c.hook}`));

  // 3. Attribution.
  const slots: PlanSlot[] = [];
  let prevActivity = "";
  let prevFormat = "";
  dates.forEach((date, i) => {
    const day = dayKey(date);
    const reasons: string[] = [];
    const total = Object.values(counts).reduce((a, b) => a + b, 0) + 1;
    // Activité dont la part est la plus en retard sur son objectif.
    const ranked = [...activities].sort((a, b) => counts[a] / total - weight(a) / totalWeight - (counts[b] / total - weight(b) / totalWeight));
    const activity = ranked.find((a) => a !== prevActivity) ?? ranked[0];
    if (counts[activity] / total < (weight(activity) / totalWeight) * 0.7) reasons.push(`${activityName(activity)} en dessous de son objectif`);
    counts[activity]++;

    const platform = platforms[i % platforms.length];
    const format = [...FORMATS_BY_PLATFORM[platform]].filter((f) => f !== prevFormat).sort((a, b) => (formatUse.get(a) ?? 0) - (formatUse.get(b) ?? 0))[0] ?? FORMATS_BY_PLATFORM[platform][0];
    formatUse.set(format, (formatUse.get(format) ?? 0) + 1);
    if ((formatUse.get(format) ?? 0) === 1) reasons.push(`format ${FORMAT_NAMES[format].toLowerCase()} peu utilisé ce mois-ci`);

    const campaign = monthCampaigns.find((c) => c.startDate <= day && c.endDate >= day && (c.activities.includes(activity as never) || c.activities.includes("global")));
    const objective: Objective = campaign ? (i % 2 ? "trafic" : "conversion") : OBJECTIVES[i % OBJECTIVES.length];
    if (campaign) reasons.push(`campagne « ${campaign.name} »`);

    let hint: string | null = null;
    for (const m of moments.filter((m) => m.start <= day && m.end >= day)) {
      const fresh = (m.ideas[activity as keyof typeof m.ideas] ?? m.ideas.global ?? []).find((idea) => !used.some((u) => similarity(u, tokens(idea)) >= 0.3));
      if (fresh) {
        hint = fresh;
        used.push(tokens(fresh));
        reasons.push(`temps fort : ${m.name}`);
        break;
      }
    }
    if (!hint && campaign?.keyMessages) hint = campaign.keyMessages.split("\n")[0];

    slots.push({
      key: `s${i}-${day}`,
      scheduledAt: `${day}T${times[i % times.length]}`,
      activity,
      platform,
      format,
      objective,
      campaignId: campaign?.id ?? null,
      title: hint ?? `${FORMAT_NAMES[format]} ${activityName(activity)}`,
      hint,
      reasons,
    });
    prevActivity = activity;
    prevFormat = format;
  });

  return {
    slots,
    analysis: {
      existing: monthCards.length,
      existingByActivity,
      campaigns: monthCampaigns.map((c) => c.name),
      moments: moments.map((m) => m.name),
      activityName,
    },
  };
}

export { cardLabels };
