"use client";

import * as React from "react";
import { toast } from "sonner";
import { addMonths, format, parseISO, startOfMonth } from "date-fns";
import { Check, ChevronDown, Loader2, Sparkles, Wand2, X } from "lucide-react";
import { PLATFORM_KEYS, type FormatKey, type Objective, type PlatformKey } from "@/lib/domain/constants";
import type { CardInput } from "@/lib/domain/schemas";
import type { BoardList } from "@/lib/domain/types";
import { api } from "@/lib/client/api";
import { useData, useIndexes } from "@/lib/client/store";
import { between } from "@/lib/cards";
import { capitalize, fmt, mondayOf, parseLocal, weekListName } from "@/lib/dates";
import { buildPlan, type PlanSlot } from "@/lib/insights/planner";
import { Segmented } from "@/components/ui/misc";
import { LabelPill } from "@/components/board/bits";
import { AiDisabledNotice } from "./ai-disabled";
import { cn } from "@/lib/utils";

interface Idea {
  title: string;
  angle: string;
  activity: string;
  platforms: PlatformKey[];
  format: FormatKey;
  objective: Objective;
  hooks: string[];
  caption: string;
  cta: string;
  script: string;
  brief: string;
}

/** Ids d'étiquettes à partir des clés métier (fitness, instagram, reel…). */
function useLabelIds() {
  const { labels } = useData();
  return React.useCallback((keys: (string | null | undefined)[]) => keys.map((k) => labels.find((l) => l.key === k)?.id).filter(Boolean) as string[], [labels]);
}

export function AssistantPage() {
  const [tab, setTab] = React.useState<"idees" | "mois">("idees");
  const { ai } = useData();
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5 p-4 lg:p-8">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold tracking-tight">Assistant</h1>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: "idees", label: "Idées de contenus" },
            { value: "mois", label: "Organiser mon mois" },
          ]}
          className="ml-auto"
        />
      </div>
      {!ai.enabled && tab === "idees" && <AiDisabledNotice />}
      {tab === "idees" ? <IdeasTab /> : <MonthTab />}
    </div>
  );
}

/* ---------------- Idées ---------------- */

function IdeasTab() {
  const { ai, cards, lists, createCards } = useData();
  const { labelById } = useIndexes();
  const labelIds = useLabelIds();
  const [prompt, setPrompt] = React.useState("");
  const [count, setCount] = React.useState(5);
  const [loading, setLoading] = React.useState(false);
  const [ideas, setIdeas] = React.useState<(Idea & { key: string; selected: boolean; open: boolean; added?: boolean })[]>([]);
  const activeLists = lists.filter((l) => !l.archivedAt);
  const [listId, setListId] = React.useState<string>("");
  const target = activeLists.find((l) => l.id === listId) ?? activeLists.find((l) => l.kind === "ideas") ?? activeLists[0];

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      const { ideas: res } = await api<{ ideas: Idea[] }>("/api/ai/ideas", {
        method: "POST",
        json: { prompt, count, recentTitles: cards.filter((c) => !c.archivedAt).slice(-100).map((c) => c.title) },
      });
      setIdeas((prev) => [...res.map((i, n) => ({ ...i, key: `${Date.now()}-${n}`, selected: true, open: false })), ...prev.filter((p) => !p.added)]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur de l'assistant");
    } finally {
      setLoading(false);
    }
  }

  async function add() {
    const chosen = ideas.filter((i) => i.selected && !i.added);
    if (!chosen.length || !target) return;
    const inputs: CardInput[] = chosen.map((i) => ({
      listId: target.id,
      title: i.title,
      description: `${i.angle}\n\nAutres accroches :\n${i.hooks.slice(1).map((h) => `- ${h}`).join("\n")}\n\nProposition de l'assistant IA — à relire.`,
      hook: i.hooks[0] ?? "",
      caption: i.caption,
      cta: i.cta,
      script: i.script,
      brief: i.brief,
      objective: i.objective,
      status: "idee",
      labelIds: labelIds([i.activity, ...i.platforms, i.format]),
    }));
    const created = await createCards(inputs);
    if (created) {
      const keys = new Set(chosen.map((c) => c.key));
      setIdeas((prev) => prev.map((p) => (keys.has(p.key) ? { ...p, added: true, selected: false } : p)));
      toast.success(`${created.length} carte(s) ajoutée(s) à « ${target.name} »`);
    }
  }

  const selected = ideas.filter((i) => i.selected && !i.added).length;

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={generate} className="flex flex-col gap-2 rounded-xl border bg-card p-3">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.metaKey || e.ctrlKey) && generate(e)}
          rows={2}
          placeholder="Propose-moi 5 idées de Reels sur la musculation pour Les Océades."
          aria-label="Demande à l'assistant"
          className="w-full resize-none bg-transparent px-1 text-[14px] outline-none placeholder:text-muted-foreground"
        />
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
            Nombre
            <select value={count} onChange={(e) => setCount(Number(e.target.value))} className="h-7 rounded-md bg-muted px-1.5 text-[12px]">
              {[1, 2, 3, 4, 5, 6, 8].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={!ai.enabled || loading || !prompt.trim()} className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-[13px] font-medium text-primary-foreground disabled:opacity-50">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Générer
          </button>
        </div>
      </form>

      {ideas.length > 0 && (
        <>
          <div className="flex flex-col gap-2">
            {ideas.map((i) => {
              const labels = labelIds([i.activity, i.format]).map((id) => labelById.get(id)!).filter(Boolean);
              return (
                <div key={i.key} className={cn("rounded-xl border bg-card transition", i.added && "opacity-60")}>
                  <div className="flex items-start gap-3 p-3">
                    <button
                      type="button"
                      disabled={i.added}
                      onClick={() => setIdeas((p) => p.map((x) => (x.key === i.key ? { ...x, selected: !x.selected } : x)))}
                      className={cn("mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border", (i.selected || i.added) && "border-primary bg-primary text-primary-foreground")}
                      aria-label="Sélectionner"
                      aria-pressed={i.selected}
                    >
                      {(i.selected || i.added) && <Check className="h-3 w-3" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap gap-1">
                        {labels.map((l) => (
                          <LabelPill key={l.id} label={l} />
                        ))}
                      </div>
                      <input
                        value={i.title}
                        disabled={i.added}
                        onChange={(e) => setIdeas((p) => p.map((x) => (x.key === i.key ? { ...x, title: e.target.value } : x)))}
                        className="w-full bg-transparent text-[14px] font-medium outline-none"
                        aria-label="Titre"
                      />
                      <p className="text-[12.5px] text-muted-foreground">{i.angle}</p>
                      {i.open && (
                        <div className="mt-3 flex flex-col gap-3 text-[13px]">
                          <Block title="Accroches">
                            <ul className="list-inside list-disc">{i.hooks.map((h, n) => <li key={n}>{h}</li>)}</ul>
                          </Block>
                          <Block title="Texte du post">{i.caption}</Block>
                          {i.script && <Block title="Script / déroulé">{i.script}</Block>}
                          <Block title="Brief créatif">{i.brief}</Block>
                          <Block title="CTA">{i.cta}</Block>
                        </div>
                      )}
                    </div>
                    <button type="button" onClick={() => setIdeas((p) => p.map((x) => (x.key === i.key ? { ...x, open: !x.open } : x)))} className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-accent" aria-label="Détails">
                      <ChevronDown className={cn("h-4 w-4 transition-transform", i.open && "rotate-180")} />
                    </button>
                    {!i.added && (
                      <button type="button" onClick={() => setIdeas((p) => p.filter((x) => x.key !== i.key))} className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-accent" aria-label="Rejeter">
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <ImportBar count={selected} lists={activeLists} listId={target?.id ?? ""} onListChange={setListId} onImport={add} />
        </>
      )}
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-0.5 text-[11px] font-medium text-muted-foreground">{title}</p>
      <div className="whitespace-pre-line">{children}</div>
    </div>
  );
}

function ImportBar({ count, lists, listId, onListChange, onImport, label = "Ajouter" }: { count: number; lists?: BoardList[]; listId?: string; onListChange?: (id: string) => void; onImport: () => void; label?: string }) {
  return (
    <div className="sticky bottom-3 flex items-center gap-2 rounded-xl border bg-popover/95 p-2 pl-3 shadow-lg backdrop-blur">
      <span className="text-[13px] text-muted-foreground">{count} sélectionnée(s)</span>
      {lists && onListChange && (
        <select value={listId} onChange={(e) => onListChange(e.target.value)} aria-label="Liste de destination" className="ml-auto h-8 max-w-[45%] rounded-md bg-muted px-2 text-[13px]">
          {lists.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      )}
      <button type="button" onClick={onImport} disabled={!count} className={cn("h-8 rounded-md bg-primary px-3 text-[13px] font-medium text-primary-foreground disabled:opacity-50", !lists && "ml-auto")}>
        {label}
      </button>
    </div>
  );
}

/* ---------------- Organiser mon mois ---------------- */

const DAYS: [number, string][] = [
  [1, "L"],
  [2, "M"],
  [3, "M"],
  [4, "J"],
  [5, "V"],
  [6, "S"],
  [7, "D"],
];

function MonthTab() {
  const { ai, cards, lists, campaigns, settings, createCards, createList } = useData();
  const { labelById } = useIndexes();
  const labelIds = useLabelIds();
  const [month, setMonth] = React.useState(() => format(addMonths(new Date(), 1), "yyyy-MM"));
  const [perWeek, setPerWeek] = React.useState(3);
  const [platforms, setPlatforms] = React.useState<PlatformKey[]>(["instagram", "facebook"]);
  const [days, setDays] = React.useState([1, 3, 5]);
  const [times, setTimes] = React.useState("12:15, 18:30");
  const [instructions, setInstructions] = React.useState("");
  const [slots, setSlots] = React.useState<(PlanSlot & { selected: boolean; added?: boolean; hook?: string; caption?: string; cta?: string; brief?: string })[] | null>(null);
  const [summary, setSummary] = React.useState<string>("");
  const [writing, setWriting] = React.useState(false);
  const months = Array.from({ length: 6 }, (_, i) => format(addMonths(startOfMonth(new Date()), i), "yyyy-MM"));

  function propose() {
    const t = times
      .split(/[,;\s]+/)
      .filter((x) => /^\d{1,2}:\d{2}$/.test(x))
      .map((x) => x.padStart(5, "0"));
    const activities = Object.keys(settings?.balanceTargets ?? {}).filter((k) => (settings?.balanceTargets[k] ?? 0) > 0);
    const res = buildPlan({ month, postsPerWeek: perWeek, activities, platforms, preferredDays: days, preferredTimes: t, countExisting: true }, cards, labelById, campaigns, settings?.balanceTargets ?? {});
    setSlots(res.slots.map((s) => ({ ...s, selected: true })));
    const parts = [`${res.analysis.existing} contenu(s) déjà prévu(s)`, ...res.analysis.campaigns.map((c) => `campagne ${c}`), ...res.analysis.moments.map((m) => m)];
    setSummary(parts.join(" · "));
  }

  async function write() {
    if (!slots) return;
    setWriting(true);
    try {
      const target = slots.filter((s) => s.selected && !s.added);
      const { ideas } = await api<{ ideas: { key: string; title: string; hook: string; caption: string; cta: string; brief: string }[] }>("/api/ai/plan", {
        method: "POST",
        json: {
          slots: target.map((s) => ({ key: s.key, scheduledAt: s.scheduledAt, activity: s.activity, platform: s.platform, format: s.format, objective: s.objective, campaign: campaigns.find((c) => c.id === s.campaignId)?.name ?? "", themeHint: s.hint })),
          instructions,
          recentTitles: cards.slice(-120).map((c) => c.title),
        },
      });
      const byKey = new Map(ideas.map((i) => [i.key, i]));
      setSlots((prev) => prev!.map((s) => (byKey.has(s.key) ? { ...s, ...byKey.get(s.key)! } : s)));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur de l'assistant");
    } finally {
      setWriting(false);
    }
  }

  /** Ajoute les cartes retenues dans leur liste hebdomadaire (créée si besoin). Rien d'existant n'est modifié. */
  async function importSelected() {
    if (!slots) return;
    const chosen = slots.filter((s) => s.selected && !s.added);
    if (!chosen.length) return;
    let current = lists.filter((l) => !l.archivedAt);
    const listFor = async (monday: string) => {
      const found = current.find((l) => l.kind === "week" && l.weekStart === monday);
      if (found) return found.id;
      const before = current.filter((l) => l.kind === "week" && l.weekStart! < monday).pop() ?? current.find((l) => l.kind === "ideas");
      const after = before ? current.filter((l) => l.position > before.position).sort((a, b) => a.position - b.position)[0] : undefined;
      const created = await createList({ name: weekListName(monday), kind: "week", weekStart: monday, position: before ? between(before.position, after?.position) : undefined });
      if (created) current = [...current, created].sort((a, b) => a.position - b.position);
      return created?.id;
    };
    const inputs: CardInput[] = [];
    for (const s of chosen) {
      const listId = await listFor(mondayOf(parseLocal(s.scheduledAt)));
      if (!listId) return;
      inputs.push({
        listId,
        title: s.title,
        scheduledAt: s.scheduledAt,
        status: "idee",
        objective: s.objective,
        campaignId: s.campaignId,
        hook: s.hook ?? "",
        caption: s.caption ?? "",
        cta: s.cta ?? "",
        brief: s.brief ?? "",
        description: `Proposé par « Organiser mon mois » : ${s.reasons.join(", ") || "rythme de publication"}.`,
        labelIds: labelIds([s.activity, s.platform, s.format]),
      });
    }
    const created = await createCards(inputs);
    if (created) {
      const keys = new Set(chosen.map((c) => c.key));
      setSlots((prev) => prev!.map((s) => (keys.has(s.key) ? { ...s, added: true, selected: false } : s)));
      toast.success(`${created.length} carte(s) ajoutée(s) au tableau`);
    }
  }

  const byWeek = new Map<string, NonNullable<typeof slots>>();
  for (const s of slots ?? []) {
    const m = mondayOf(parseLocal(s.scheduledAt));
    byWeek.set(m, [...(byWeek.get(m) ?? []), s]);
  }
  const selected = (slots ?? []).filter((s) => s.selected && !s.added).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3 rounded-xl border bg-card p-3">
        <Field label="Mois">
          <select value={month} onChange={(e) => setMonth(e.target.value)} className="h-8 rounded-md bg-muted px-2 text-[13px]">
            {months.map((m) => (
              <option key={m} value={m}>
                {capitalize(fmt(parseISO(`${m}-01`), "MMMM yyyy"))}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Par semaine">
          <input type="number" min={1} max={14} value={perWeek} onChange={(e) => setPerWeek(Math.max(1, Math.min(14, Number(e.target.value) || 1)))} className="h-8 w-16 rounded-md bg-muted px-2 text-[13px]" />
        </Field>
        <Field label="Plateformes">
          <div className="flex gap-1">
            {PLATFORM_KEYS.map((p) => {
              const on = platforms.includes(p);
              const l = [...labelById.values()].find((x) => x.key === p);
              return (
                <button key={p} type="button" aria-pressed={on} onClick={() => setPlatforms(on ? platforms.filter((x) => x !== p) : [...platforms, p])} className={cn("h-8 rounded-md px-2 text-[12px]", on ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                  {l?.name ?? p}
                </button>
              );
            })}
          </div>
        </Field>
        <Field label="Jours">
          <div className="flex gap-0.5">
            {DAYS.map(([n, l]) => {
              const on = days.includes(n);
              return (
                <button key={n} type="button" aria-pressed={on} onClick={() => setDays(on ? days.filter((d) => d !== n) : [...days, n])} className={cn("h-8 w-7 rounded-md text-[12px]", on ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                  {l}
                </button>
              );
            })}
          </div>
        </Field>
        <Field label="Heures">
          <input value={times} onChange={(e) => setTimes(e.target.value)} className="h-8 w-28 rounded-md bg-muted px-2 text-[13px]" />
        </Field>
        <button type="button" onClick={propose} className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-[13px] font-medium text-primary-foreground">
          <Wand2 className="h-4 w-4" /> Proposer
        </button>
        {slots && ai.enabled && (
          <input value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Consignes pour l'IA (facultatif)" className="h-8 w-full rounded-md bg-muted px-2 text-[13px] outline-none" aria-label="Consignes pour l'IA" />
        )}
      </div>

      {slots && (
        <>
          <p className="text-[12px] text-muted-foreground">{summary}. Répartition guidée par vos objectifs d'équilibre (Paramètres).</p>
          {slots.length === 0 && <p className="py-8 text-center text-[13px] text-muted-foreground">Le rythme souhaité est déjà atteint ce mois-ci.</p>}
          {[...byWeek.entries()].map(([monday, list]) => (
            <section key={monday}>
              <h3 className="mb-1.5 text-[12px] font-semibold text-muted-foreground">{weekListName(monday)}</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {list.map((s) => {
                  const pills = labelIds([s.activity, s.format]).map((id) => labelById.get(id)!).filter(Boolean);
                  return (
                    <div key={s.key} className={cn("flex gap-2.5 rounded-lg border bg-card p-2.5", s.added && "opacity-60")}>
                      <button
                        type="button"
                        disabled={s.added}
                        onClick={() => setSlots((p) => p!.map((x) => (x.key === s.key ? { ...x, selected: !x.selected } : x)))}
                        className={cn("mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border", (s.selected || s.added) && "border-primary bg-primary text-primary-foreground")}
                        aria-label="Sélectionner"
                        aria-pressed={s.selected}
                      >
                        {(s.selected || s.added) && <Check className="h-3 w-3" />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-1">
                          {pills.map((l) => (
                            <LabelPill key={l.id} label={l} />
                          ))}
                          <span className="ml-auto text-[11px] text-muted-foreground">{fmt(parseLocal(s.scheduledAt), "EEE d · HH:mm")}</span>
                        </div>
                        <input
                          value={s.title}
                          disabled={s.added}
                          onChange={(e) => setSlots((p) => p!.map((x) => (x.key === s.key ? { ...x, title: e.target.value } : x)))}
                          className="w-full bg-transparent text-[13px] font-medium outline-none"
                          aria-label="Titre"
                        />
                        {s.hook ? <p className="text-[12px] text-muted-foreground">{s.hook}</p> : s.reasons.length > 0 && <p className="text-[11.5px] text-muted-foreground">{s.reasons.join(" · ")}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
          {slots.length > 0 && (
            <div className="sticky bottom-3 flex items-center gap-2 rounded-xl border bg-popover/95 p-2 pl-3 shadow-lg backdrop-blur">
              <span className="text-[13px] text-muted-foreground">{selected} sélectionnée(s)</span>
              {ai.enabled && (
                <button type="button" onClick={write} disabled={writing || !selected} className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[13px] text-muted-foreground hover:bg-accent disabled:opacity-50">
                  {writing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Rédiger avec l'IA
                </button>
              )}
              <button type="button" onClick={importSelected} disabled={!selected} className={cn("h-8 rounded-md bg-primary px-3 text-[13px] font-medium text-primary-foreground disabled:opacity-50", !ai.enabled && "ml-auto")}>
                Ajouter au tableau
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}
