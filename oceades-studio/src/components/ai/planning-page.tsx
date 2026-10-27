"use client";

import * as React from "react";
import { toast } from "sonner";
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, parseISO, startOfMonth, startOfWeek } from "date-fns";
import { CalendarPlus, Check, Info, Loader2, Sparkles, Wand2 } from "lucide-react";
import {
  ACTIVITIES,
  ACTIVITY_COLORS,
  ACTIVITY_LABELS,
  FORMATS,
  FORMAT_LABELS,
  OBJECTIVES,
  OBJECTIVE_LABELS,
  PLATFORM_FORMATS,
  PLATFORMS,
  PLATFORM_LABELS,
  type Activity,
  type Platform,
} from "@/lib/domain/constants";
import type { PostInput } from "@/lib/domain/schemas";
import { api } from "@/lib/client/api";
import { useData } from "@/lib/client/store";
import { capitalize, dayKey, fmt, parseLocal } from "@/lib/dates";
import { buildPlan, type PlanAnalysis, type PlanSlot } from "@/lib/insights/planner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input, Label, NativeSelect, Textarea } from "@/components/ui/input";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { cn, tint } from "@/lib/utils";
import { AiDisabledNotice } from "./ai-disabled";

interface DraftSlot extends PlanSlot {
  selected: boolean;
  title: string;
  hook: string;
  description: string;
  cta: string;
  notes: string;
  imported?: boolean;
  aiWritten?: boolean;
}

const DAYS = [
  [1, "Lun"],
  [2, "Mar"],
  [3, "Mer"],
  [4, "Jeu"],
  [5, "Ven"],
  [6, "Sam"],
  [7, "Dim"],
] as const;

function ToggleChips<T extends string>({ values, selected, labels, colors, onChange }: { values: readonly T[]; selected: T[]; labels: Record<T, string>; colors?: Record<T, string>; onChange: (v: T[]) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map((v) => {
        const on = selected.includes(v);
        return (
          <button
            key={v}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? selected.filter((x) => x !== v) : [...selected, v])}
            className={cn("rounded-md border px-2.5 py-1 text-xs transition", on ? "border-transparent font-medium" : "text-muted-foreground hover:bg-accent")}
            style={on ? (colors ? { backgroundColor: tint(colors[v], 0.14), color: colors[v] } : { backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }) : undefined}
          >
            {labels[v]}
          </button>
        );
      })}
    </div>
  );
}

export function PlanningPage() {
  const { posts, campaigns, ai, createPosts } = useData();
  const nextMonth = format(addMonths(new Date(), 1), "yyyy-MM");
  const [opts, setOpts] = React.useState({
    month: nextMonth,
    postsPerWeek: 3,
    activities: ["fitness", "aquatique", "musculation", "institut"] as Activity[],
    platforms: ["instagram", "facebook"] as Platform[],
    preferredDays: [1, 3, 5] as number[],
    preferredTimes: "12:15, 18:30",
    countExisting: true,
    instructions: "",
  });
  const [slots, setSlots] = React.useState<DraftSlot[]>([]);
  const [analysis, setAnalysis] = React.useState<PlanAnalysis | null>(null);
  const [writing, setWriting] = React.useState(false);
  const [importing, setImporting] = React.useState(false);

  const monthOptions = Array.from({ length: 8 }, (_, i) => format(addMonths(startOfMonth(new Date()), i), "yyyy-MM"));

  function propose() {
    const times = opts.preferredTimes
      .split(/[,;\s]+/)
      .map((t) => t.trim())
      .filter((t) => /^\d{1,2}:\d{2}$/.test(t))
      .map((t) => t.padStart(5, "0"));
    const { slots, analysis } = buildPlan({ ...opts, preferredTimes: times }, posts, campaigns);
    setAnalysis(analysis);
    setSlots(
      slots.map((s) => ({
        ...s,
        selected: true,
        title: s.themeHint ?? `${FORMAT_LABELS[s.format]} ${ACTIVITY_LABELS[s.activity]} — sujet à définir`,
        hook: "",
        description: "",
        cta: "",
        notes: `Créneau proposé par le générateur de planning.\nRaisons : ${s.rationale.join(" ; ")}.`,
      })),
    );
    if (!slots.length) toast.info("Le rythme demandé est déjà atteint par les publications existantes ce mois-ci.");
  }

  async function writeWithAi() {
    setWriting(true);
    try {
      const target = slots.filter((s) => s.selected && !s.imported);
      const { ideas } = await api<{ ideas: { key: string; title: string; hook: string; description: string; cta: string; notes: string }[] }>("/api/ai/plan", {
        method: "POST",
        json: {
          slots: target.map((s) => ({
            key: s.key,
            scheduledAt: s.scheduledAt,
            activity: s.activity,
            platform: s.platform,
            format: s.format,
            objective: s.objective,
            campaign: campaigns.find((c) => c.id === s.campaignId)?.name ?? "",
            themeHint: s.themeHint,
          })),
          instructions: opts.instructions,
          recentTitles: posts.slice(-100).map((p) => p.title),
        },
      });
      const byKey = new Map(ideas.map((i) => [i.key, i]));
      setSlots((list) =>
        list.map((s) => {
          const idea = byKey.get(s.key);
          return idea ? { ...s, title: idea.title, hook: idea.hook, description: idea.description, cta: idea.cta, notes: `${idea.notes}\n\n${s.notes}\nIdée rédigée par l'assistant IA — à relire.`, aiWritten: true } : s;
        }),
      );
      toast.success(`${ideas.length} idée(s) rédigée(s)`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur IA");
    } finally {
      setWriting(false);
    }
  }

  async function importSlots(only?: string) {
    const target = slots.filter((s) => !s.imported && (only ? s.key === only : s.selected));
    if (!target.length) return;
    setImporting(true);
    const inputs: PostInput[] = target.map((s) => ({
      title: s.title.trim() || "Publication à définir",
      scheduledAt: s.scheduledAt,
      platform: s.platform,
      activity: s.activity,
      format: s.format,
      objective: s.objective,
      status: "idee",
      description: s.description,
      hook: s.hook,
      cta: s.cta,
      notes: s.notes,
      campaignId: s.campaignId,
      mediaIds: [],
      checklist: { visualReady: false, textValidated: false, rightsChecked: false },
    }));
    const created = await createPosts(inputs);
    setImporting(false);
    if (created) {
      const keys = new Set(target.map((s) => s.key));
      setSlots((list) => list.map((s) => (keys.has(s.key) ? { ...s, imported: true, selected: false } : s)));
      toast.success(`${created.length} publication(s) ajoutée(s) au calendrier, sans modifier l'existant.`);
    }
  }

  const update = (key: string, patch: Partial<DraftSlot>) => setSlots((l) => l.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  const selectedCount = slots.filter((s) => s.selected && !s.imported).length;

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-8">
      <PageHeader
        title="Construire mon planning"
        description="Analyse de l'existant, répartition équilibrée des activités et formats, prise en compte des campagnes et temps forts. Vous validez chaque suggestion."
      />

      <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        <Card className="h-fit p-5">
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Mois</Label>
                <NativeSelect value={opts.month} onChange={(e) => setOpts({ ...opts, month: e.target.value })}>
                  {monthOptions.map((m) => (
                    <option key={m} value={m}>{capitalize(fmt(parseISO(`${m}-01`), "MMMM yyyy"))}</option>
                  ))}
                </NativeSelect>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ppw">Publications / semaine</Label>
                <Input id="ppw" type="number" min={1} max={14} value={opts.postsPerWeek} onChange={(e) => setOpts({ ...opts, postsPerWeek: Math.min(14, Math.max(1, Number(e.target.value) || 1)) })} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Activités à équilibrer</Label>
              <ToggleChips values={ACTIVITIES} selected={opts.activities} labels={ACTIVITY_LABELS} colors={ACTIVITY_COLORS} onChange={(activities) => setOpts({ ...opts, activities })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Plateformes</Label>
              <ToggleChips values={PLATFORMS} selected={opts.platforms} labels={PLATFORM_LABELS} onChange={(platforms) => setOpts({ ...opts, platforms })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Jours de publication préférés</Label>
              <div className="flex gap-1">
                {DAYS.map(([n, l]) => {
                  const on = opts.preferredDays.includes(n);
                  return (
                    <button
                      key={n}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setOpts({ ...opts, preferredDays: on ? opts.preferredDays.filter((d) => d !== n) : [...opts.preferredDays, n] })}
                      className={cn("h-8 flex-1 rounded-md border text-xs transition", on ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent")}
                    >
                      {l}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="times">Heures (en alternance)</Label>
              <Input id="times" value={opts.preferredTimes} onChange={(e) => setOpts({ ...opts, preferredTimes: e.target.value })} placeholder="12:15, 18:30" />
            </div>
            <label className="flex items-start gap-2 text-xs">
              <Checkbox checked={opts.countExisting} onCheckedChange={(v) => setOpts({ ...opts, countExisting: v === true })} className="mt-0.5" />
              <span>Compter les publications déjà prévues dans le rythme hebdomadaire (recommandé)</span>
            </label>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="instr">Consignes pour l'IA (optionnel)</Label>
              <Textarea id="instr" rows={3} value={opts.instructions} onChange={(e) => setOpts({ ...opts, instructions: e.target.value })} placeholder="Ex. insister sur l'aquabike, lancer le nouveau cours de Pilates…" />
            </div>
            <Button onClick={propose}>
              <Wand2 /> Analyser et proposer un planning
            </Button>
          </div>
        </Card>

        <div className="flex min-w-0 flex-col gap-4">
          {!ai.enabled && slots.length > 0 && <AiDisabledNotice context="la structure du planning reste disponible ; seules les idées rédigées par l'IA sont désactivées" />}
          {analysis && <AnalysisPanel analysis={analysis} month={opts.month} slots={slots} />}
          {slots.length > 0 && (
            <div className="sticky top-14 z-10 flex flex-wrap items-center gap-2 rounded-xl border bg-card/95 p-3 backdrop-blur lg:top-2">
              <span className="text-sm">
                <strong className="tabular">{slots.length}</strong> créneau(x) proposé(s) · <span className="tabular">{selectedCount}</span> sélectionné(s)
              </span>
              <div className="ml-auto flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={writeWithAi} disabled={!ai.enabled || writing || !selectedCount}>
                  {writing ? <Loader2 className="animate-spin" /> : <Sparkles />} Rédiger les idées avec l'IA
                </Button>
                <Button size="sm" onClick={() => importSlots()} disabled={importing || !selectedCount}>
                  <CalendarPlus /> Importer la sélection ({selectedCount})
                </Button>
              </div>
            </div>
          )}
          {slots.map((s) => (
            <SlotRow key={s.key} slot={s} onChange={(patch) => update(s.key, patch)} onImport={() => importSlots(s.key)} campaignName={campaigns.find((c) => c.id === s.campaignId)?.name} />
          ))}
          {!slots.length && (
            <EmptyState icon={<Wand2 />} title="Prêt à préparer le mois prochain ?">
              Réglez le rythme et les activités, puis lancez l'analyse. Les publications existantes ne sont jamais modifiées : les suggestions sont ajoutées uniquement si vous les importez.
            </EmptyState>
          )}
        </div>
      </div>
    </div>
  );
}

function AnalysisPanel({ analysis, month, slots }: { analysis: PlanAnalysis; month: string; slots: DraftSlot[] }) {
  const { posts } = useData();
  const start = startOfMonth(parseISO(`${month}-01`));
  const days = eachDayOfInterval({ start: startOfWeek(start, { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(start), { weekStartsOn: 1 }) });
  const existingByDay = new Map<string, string[]>();
  for (const p of posts) if (p.scheduledAt) existingByDay.set(p.scheduledAt.slice(0, 10), [...(existingByDay.get(p.scheduledAt.slice(0, 10)) ?? []), ACTIVITY_COLORS[p.activity]]);
  const proposedByDay = new Map<string, string[]>();
  for (const s of slots) proposedByDay.set(s.scheduledAt.slice(0, 10), [...(proposedByDay.get(s.scheduledAt.slice(0, 10)) ?? []), ACTIVITY_COLORS[s.activity]]);
  const finalCounts = Object.fromEntries(ACTIVITIES.map((a) => [a, (analysis.existingByActivity[a] ?? 0) + slots.filter((s) => s.activity === a).length]));

  return (
    <Card className="grid gap-5 p-5 lg:grid-cols-[1fr_260px]">
      <div className="flex flex-col gap-3 text-sm">
        <h2 className="flex items-center gap-2 font-semibold"><Info className="h-4 w-4 text-primary" /> Analyse</h2>
        <p className="text-muted-foreground">
          {analysis.existingInMonth} publication(s) déjà prévue(s) ce mois-ci.
          {analysis.underRepresented.length > 0 && <> Sous-représenté avant planning : <strong className="text-foreground">{analysis.underRepresented.map((a) => ACTIVITY_LABELS[a]).join(", ")}</strong>.</>}
        </p>
        <div className="flex flex-col gap-1.5">
          {Object.entries(finalCounts).filter(([a]) => (analysis.existingByActivity[a] ?? 0) + slots.filter((s) => s.activity === a).length > 0 || a in analysis.existingByActivity).map(([a, total]) => (
            <div key={a} className="flex items-center gap-2 text-xs">
              <span className="w-24">{ACTIVITY_LABELS[a as Activity]}</span>
              <div className="flex h-2 flex-1 gap-[2px] overflow-hidden rounded-full bg-muted">
                <div style={{ width: `${((analysis.existingByActivity[a] ?? 0) / Math.max(1, ...Object.values(finalCounts))) * 100}%`, backgroundColor: ACTIVITY_COLORS[a as Activity] }} title="Existant" />
                <div style={{ width: `${((total - (analysis.existingByActivity[a] ?? 0)) / Math.max(1, ...Object.values(finalCounts))) * 100}%`, backgroundColor: tint(ACTIVITY_COLORS[a as Activity], 0.45) }} title="Proposé" />
              </div>
              <span className="w-20 text-right tabular text-muted-foreground">{analysis.existingByActivity[a] ?? 0} + {total - (analysis.existingByActivity[a] ?? 0)}</span>
            </div>
          ))}
          <p className="text-[11px] text-muted-foreground">Barre pleine : existant · barre claire : proposé</p>
        </div>
        {(analysis.campaigns.length > 0 || analysis.moments.length > 0) && (
          <div className="flex flex-wrap gap-1.5">
            {analysis.campaigns.map((c) => (
              <span key={c.id} className="rounded-md bg-primary/10 px-2 py-0.5 text-xs text-primary">Campagne : {c.name}</span>
            ))}
            {analysis.moments.map((m) => (
              <span key={m.name} className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">✦ {m.name}</span>
            ))}
          </div>
        )}
      </div>
      <div>
        <div className="mb-1 grid grid-cols-7 text-center text-[10px] text-muted-foreground">
          {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => <span key={i}>{d}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {days.map((d) => {
            const k = dayKey(d);
            return (
              <div key={k} className={cn("flex aspect-square flex-col items-center justify-start gap-0.5 rounded p-0.5 text-[10px]", isSameMonth(d, start) ? "bg-muted/50" : "opacity-30")}>
                <span className="tabular text-muted-foreground">{format(d, "d")}</span>
                <span className="flex flex-wrap justify-center gap-0.5">
                  {(existingByDay.get(k) ?? []).map((c, i) => <span key={`e${i}`} className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c }} />)}
                  {(proposedByDay.get(k) ?? []).map((c, i) => <span key={`p${i}`} className="h-1.5 w-1.5 rounded-full border" style={{ borderColor: c }} />)}
                </span>
              </div>
            );
          })}
        </div>
        <p className="mt-1.5 text-[10px] text-muted-foreground">● existant · ○ proposé</p>
      </div>
    </Card>
  );
}

function SlotRow({ slot, onChange, onImport, campaignName }: { slot: DraftSlot; onChange: (p: Partial<DraftSlot>) => void; onImport: () => void; campaignName?: string }) {
  const date = slot.scheduledAt.slice(0, 10);
  const time = slot.scheduledAt.slice(11, 16);
  return (
    <Card className={cn("flex gap-3 p-4 transition", slot.imported && "opacity-60")}>
      <div className="pt-1">
        {slot.imported ? (
          <span className="grid h-4 w-4 place-items-center rounded-full bg-emerald-600 text-white"><Check className="h-3 w-3" /></span>
        ) : (
          <Checkbox checked={slot.selected} onCheckedChange={(v) => onChange({ selected: v === true })} aria-label="Sélectionner ce créneau" />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{capitalize(fmt(parseLocal(slot.scheduledAt), "EEEE d MMMM"))}</span>
          {campaignName && <span className="rounded bg-primary/10 px-1.5 text-[11px] text-primary">{campaignName}</span>}
          {slot.aiWritten && <span className="inline-flex items-center gap-1 rounded bg-violet-500/10 px-1.5 text-[11px] text-violet-700 dark:text-violet-300"><Sparkles className="h-3 w-3" /> IA</span>}
          {slot.imported && <span className="text-[11px] text-emerald-700 dark:text-emerald-300">Importé</span>}
        </div>
        <Input value={slot.title} onChange={(e) => onChange({ title: e.target.value })} disabled={slot.imported} aria-label="Titre" className="font-medium" />
        {slot.hook && <p className="text-xs text-muted-foreground">Accroche : {slot.hook}</p>}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
          <Input type="date" value={date} disabled={slot.imported} onChange={(e) => e.target.value && onChange({ scheduledAt: `${e.target.value}T${time}` })} className="col-span-2 h-8 text-xs sm:col-span-1" aria-label="Date" />
          <Input type="time" value={time} disabled={slot.imported} onChange={(e) => e.target.value && onChange({ scheduledAt: `${date}T${e.target.value}` })} className="h-8 text-xs" aria-label="Heure" />
          <NativeSelect value={slot.activity} disabled={slot.imported} onChange={(e) => onChange({ activity: e.target.value as Activity })} className="h-8 text-xs" aria-label="Activité">
            {ACTIVITIES.map((a) => <option key={a} value={a}>{ACTIVITY_LABELS[a]}</option>)}
          </NativeSelect>
          <NativeSelect value={slot.platform} disabled={slot.imported} onChange={(e) => onChange({ platform: e.target.value as Platform })} className="h-8 text-xs" aria-label="Plateforme">
            {PLATFORMS.map((p) => <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>)}
          </NativeSelect>
          <NativeSelect value={slot.format} disabled={slot.imported} onChange={(e) => onChange({ format: e.target.value as DraftSlot["format"] })} className={cn("h-8 text-xs", !PLATFORM_FORMATS[slot.platform].includes(slot.format) && "border-amber-500")} aria-label="Format">
            {FORMATS.map((f) => <option key={f} value={f}>{FORMAT_LABELS[f]}</option>)}
          </NativeSelect>
          <NativeSelect value={slot.objective} disabled={slot.imported} onChange={(e) => onChange({ objective: e.target.value as DraftSlot["objective"] })} className="h-8 text-xs" aria-label="Objectif">
            {OBJECTIVES.map((o) => <option key={o} value={o}>{OBJECTIVE_LABELS[o]}</option>)}
          </NativeSelect>
        </div>
        <p className="text-[11px] text-muted-foreground">{slot.rationale.join(" · ")}</p>
      </div>
      {!slot.imported && (
        <Button variant="ghost" size="sm" onClick={onImport} className="self-start">
          Valider
        </Button>
      )}
    </Card>
  );
}
