"use client";

import * as React from "react";
import { toast } from "sonner";
import { Check, Clapperboard, GalleryHorizontalEnd, Loader2, Sparkles, Trash2, Wand2 } from "lucide-react";
import {
  ACTIVITIES,
  ACTIVITY_LABELS,
  FORMATS,
  FORMAT_LABELS,
  OBJECTIVES,
  OBJECTIVE_LABELS,
  PLATFORMS,
  PLATFORM_LABELS,
  type Activity,
  type Format,
  type Objective,
  type Platform,
} from "@/lib/domain/constants";
import { api } from "@/lib/client/api";
import { useData } from "@/lib/client/store";
import { usePostEditor } from "@/components/posts/post-editor-provider";
import { ActivityBadge, FormatLabel, PlatformLabel } from "@/components/posts/post-badges";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, NativeSelect, Textarea } from "@/components/ui/input";
import { EmptyState, PageHeader, Segmented } from "@/components/ui/misc";
import { cn } from "@/lib/utils";
import { AiDisabledNotice } from "./ai-disabled";

/** Format renvoyé par /api/ai/ideas (voir lib/server/ai.ts). */
interface AiIdea {
  title: string;
  angle: string;
  activity: Activity;
  platform: Platform;
  format: Format;
  objective: Objective;
  hooks: string[];
  captionInstagram: string;
  captionFacebook: string;
  cta: string;
  ctaAlternatives: string[];
  reelScript: { timing: string; visual: string; text: string }[];
  carouselSlides: { title: string; text: string }[];
  shootingBrief: string;
  formatAdvice: string;
  suggestedDay: string;
}

interface Proposal extends AiIdea {
  key: string;
  chosenHook: number;
  caption: string;
  chosenCta: string;
  date: string;
  added?: string;
}

const TONES = ["chaleureux et concret", "énergique et motivant", "pédagogique", "complice et léger", "premium et apaisant"];

function productionNotes(p: Proposal): string {
  const parts = [`Angle : ${p.angle}`];
  if (p.reelScript.length) parts.push("Script :\n" + p.reelScript.map((s) => `- [${s.timing}] ${s.visual} — « ${s.text} »`).join("\n"));
  if (p.carouselSlides.length) parts.push("Slides :\n" + p.carouselSlides.map((s, i) => `${i + 1}. ${s.title} — ${s.text}`).join("\n"));
  if (p.shootingBrief) parts.push(`Brief photo/vidéo : ${p.shootingBrief}`);
  if (p.formatAdvice) parts.push(`Format : ${p.formatAdvice}`);
  const otherHooks = p.hooks.filter((_, i) => i !== p.chosenHook);
  if (otherHooks.length) parts.push("Autres accroches :\n" + otherHooks.map((h) => `- ${h}`).join("\n"));
  parts.push("Proposition générée par l'assistant IA — à relire avant validation.");
  return parts.join("\n\n");
}

export function AssistantPage() {
  const { ai, posts, campaigns, createPost } = useData();
  const { openPost } = usePostEditor();
  const [form, setForm] = React.useState({
    activity: "fitness" as Activity,
    platform: "instagram" as Platform,
    format: "auto" as Format | "auto",
    objective: "engagement" as Objective,
    audience: "",
    period: "",
    tone: TONES[0],
    count: 3,
    brief: "",
    campaignId: "",
  });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [proposals, setProposals] = React.useState<Proposal[]>([]);

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const campaign = campaigns.find((c) => c.id === form.campaignId);
    try {
      const { ideas } = await api<{ ideas: AiIdea[] }>("/api/ai/ideas", {
        method: "POST",
        json: {
          activity: form.activity,
          platform: form.platform,
          format: form.format,
          objective: form.objective,
          audience: form.audience,
          period: form.period,
          tone: form.tone,
          count: form.count,
          brief: form.brief,
          campaign: campaign ? `${campaign.name} (${campaign.startDate} → ${campaign.endDate})\nObjectif : ${campaign.objective}\nCible : ${campaign.targetAudience}\nMessages clés : ${campaign.keyMessages}` : "",
          recentTitles: posts
            .filter((p) => p.activity === form.activity || p.activity === "global")
            .slice(-60)
            .map((p) => p.title),
        },
      });
      setProposals((prev) => [
        ...ideas.map((idea, i) => ({
          ...idea,
          key: `${Date.now()}-${i}`,
          chosenHook: 0,
          caption: idea.platform === "facebook" ? idea.captionFacebook : idea.captionInstagram,
          chosenCta: idea.cta,
          date: "",
        })),
        ...prev,
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  const update = (key: string, patch: Partial<Proposal>) => setProposals((list) => list.map((p) => (p.key === key ? { ...p, ...patch } : p)));

  async function add(p: Proposal) {
    const created = await createPost({
      title: p.title,
      scheduledAt: p.date ? `${p.date}T12:00` : null,
      platform: p.platform,
      activity: p.activity,
      format: p.format,
      objective: p.objective,
      status: "idee",
      description: p.caption,
      hook: p.hooks[p.chosenHook] ?? "",
      cta: p.chosenCta,
      notes: productionNotes(p),
      campaignId: form.campaignId || null,
      mediaIds: [],
      checklist: { visualReady: false, textValidated: false, rightsChecked: false },
    });
    if (created) {
      update(p.key, { added: created.id });
      toast.success(p.date ? "Ajoutée au calendrier (statut Idée)" : "Ajoutée à la boîte à idées", { action: { label: "Ouvrir", onClick: () => openPost(created.id) } });
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-8">
      <PageHeader title="Assistant IA" description="Générez des idées, accroches, légendes, scripts et briefs adaptés aux Océades. Rien n'est publié sans votre validation." />
      {!ai.enabled && <AiDisabledNotice />}

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="h-fit p-5">
          <form onSubmit={generate} className="flex flex-col gap-3.5">
            <div className="grid grid-cols-2 gap-3">
              <Sel label="Activité" value={form.activity} onChange={(v) => setForm({ ...form, activity: v as Activity })} options={ACTIVITIES.map((a) => [a, ACTIVITY_LABELS[a]])} />
              <Sel label="Réseau social" value={form.platform} onChange={(v) => setForm({ ...form, platform: v as Platform })} options={PLATFORMS.map((p) => [p, PLATFORM_LABELS[p]])} />
              <Sel label="Type de publication" value={form.format} onChange={(v) => setForm({ ...form, format: v as Format | "auto" })} options={[["auto", "Recommandé par l'IA"], ...FORMATS.map((f) => [f, FORMAT_LABELS[f]] as [string, string])]} />
              <Sel label="Objectif" value={form.objective} onChange={(v) => setForm({ ...form, objective: v as Objective })} options={OBJECTIVES.map((o) => [o, OBJECTIVE_LABELS[o]])} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ai-target">Cible</Label>
              <Input id="ai-target" value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} placeholder="Ex. seniors actifs, jeunes parents, débutants…" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ai-period">Période</Label>
                <Input id="ai-period" value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} placeholder="Ex. mi-novembre" />
              </div>
              <Sel label="Ton" value={form.tone} onChange={(v) => setForm({ ...form, tone: v })} options={TONES.map((t) => [t, t])} />
            </div>
            <Sel label="Campagne (optionnel)" value={form.campaignId} onChange={(v) => setForm({ ...form, campaignId: v })} options={[["", "Aucune"], ...campaigns.map((c) => [c.id, c.name] as [string, string])]} />
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ai-brief">Consignes complémentaires</Label>
              <Textarea id="ai-brief" rows={3} value={form.brief} onChange={(e) => setForm({ ...form, brief: e.target.value })} placeholder="Ex. mettre en avant le nouveau cours de Pilates du jeudi, tourner avec l'équipe du matin…" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Nombre de propositions</Label>
              <Segmented value={String(form.count)} onChange={(v) => setForm({ ...form, count: Number(v) })} options={["1", "2", "3", "4", "5"].map((n) => ({ value: n, label: n }))} />
            </div>
            <Button type="submit" disabled={!ai.enabled || loading} className="mt-1">
              {loading ? <Loader2 className="animate-spin" /> : <Sparkles />}
              {loading ? "Génération en cours…" : "Générer des idées avec l'IA"}
            </Button>
            {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}
            <p className="text-[11px] text-muted-foreground">
              Les publications déjà prévues pour cette activité sont transmises pour éviter les doublons. Les propositions restent des brouillons : vous les relisez, les modifiez puis
              choisissez de les ajouter.
            </p>
          </form>
        </Card>

        <div className="flex min-w-0 flex-col gap-4">
          {loading && (
            <Card className="flex items-center gap-3 p-5 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> L'assistant rédige {form.count} proposition(s)… cela peut prendre jusqu'à une minute.
            </Card>
          )}
          {proposals.map((p) => (
            <ProposalCard key={p.key} p={p} onChange={(patch) => update(p.key, patch)} onAdd={() => add(p)} onReject={() => setProposals((l) => l.filter((x) => x.key !== p.key))} onOpen={() => p.added && openPost(p.added)} />
          ))}
          {!proposals.length && !loading && (
            <EmptyState icon={<Wand2 />} title="Aucune proposition pour l'instant">
              Choisissez une activité, un réseau et un objectif, puis lancez la génération. Chaque idée arrive avec plusieurs accroches, des légendes, un script ou des slides, un CTA et un brief de tournage.
            </EmptyState>
          )}
        </div>
      </div>
    </div>
  );
}

function Sel({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  const id = React.useId();
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <NativeSelect id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </NativeSelect>
    </div>
  );
}

function ProposalCard({ p, onChange, onAdd, onReject, onOpen }: { p: Proposal; onChange: (patch: Partial<Proposal>) => void; onAdd: () => void; onReject: () => void; onOpen: () => void }) {
  const [tab, setTab] = React.useState<"texte" | "production">("texte");
  return (
    <Card className={cn("overflow-hidden animate-fade-in", p.added && "opacity-80")}>
      <div className="flex flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <ActivityBadge activity={p.activity} />
          <PlatformLabel platform={p.platform} />
          <FormatLabel format={p.format} />
          <span className="text-xs text-muted-foreground">· {OBJECTIVE_LABELS[p.objective]}</span>
          {p.suggestedDay && <span className="text-xs text-muted-foreground">· conseillé : {p.suggestedDay}</span>}
        </div>
        <Input value={p.title} onChange={(e) => onChange({ title: e.target.value })} className="border-transparent px-0 text-base font-semibold shadow-none focus-visible:border-input focus-visible:px-3" aria-label="Titre" />
        <p className="-mt-2 text-sm text-muted-foreground">{p.angle}</p>
        <Segmented value={tab} onChange={setTab} options={[{ value: "texte", label: "Textes" }, { value: "production", label: "Production" }]} className="self-start" />
        {tab === "texte" ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Accroches — choisissez-en une</Label>
              {p.hooks.map((h, i) => (
                <button key={i} type="button" onClick={() => onChange({ chosenHook: i })} className={cn("flex items-start gap-2 rounded-md border px-3 py-2 text-left text-sm transition", p.chosenHook === i ? "border-primary bg-primary/5" : "hover:bg-accent/50")}>
                  <span className={cn("mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border", p.chosenHook === i && "border-primary bg-primary text-primary-foreground")}>{p.chosenHook === i && <Check className="h-3 w-3" />}</span>
                  {h}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label>Légende</Label>
                <div className="flex gap-1 text-[11px]">
                  <button type="button" className="rounded px-1.5 py-0.5 hover:bg-accent" onClick={() => onChange({ caption: p.captionInstagram })}>Version Instagram</button>
                  <button type="button" className="rounded px-1.5 py-0.5 hover:bg-accent" onClick={() => onChange({ caption: p.captionFacebook })}>Version Facebook</button>
                </div>
              </div>
              <Textarea rows={6} value={p.caption} onChange={(e) => onChange({ caption: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Appel à l'action</Label>
              <div className="flex flex-wrap gap-1.5">
                {[p.cta, ...p.ctaAlternatives].map((c) => (
                  <button key={c} type="button" onClick={() => onChange({ chosenCta: c })} className={cn("rounded-md border px-2.5 py-1 text-xs transition", p.chosenCta === c ? "border-primary bg-primary/5 font-medium" : "hover:bg-accent/50")}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 text-sm">
            {p.reelScript.length > 0 && (
              <div>
                <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Clapperboard className="h-3.5 w-3.5" /> Script plan par plan</p>
                <ol className="flex flex-col divide-y rounded-md border">
                  {p.reelScript.map((s, i) => (
                    <li key={i} className="grid grid-cols-[64px_1fr] gap-2 px-3 py-2 text-xs">
                      <span className="tabular text-muted-foreground">{s.timing}</span>
                      <span><span className="font-medium">{s.visual}</span><br /><span className="text-muted-foreground">« {s.text} »</span></span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            {p.carouselSlides.length > 0 && (
              <div>
                <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><GalleryHorizontalEnd className="h-3.5 w-3.5" /> Carrousel slide par slide</p>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                  {p.carouselSlides.map((s, i) => (
                    <div key={i} className="flex aspect-[4/5] w-36 shrink-0 flex-col gap-1 rounded-lg border bg-muted/40 p-2.5 text-xs">
                      <span className="text-[10px] text-muted-foreground">{i + 1}/{p.carouselSlides.length}</span>
                      <span className="font-semibold leading-snug">{s.title}</span>
                      <span className="text-muted-foreground">{s.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Brief photographe / vidéaste</p>
              <p className="whitespace-pre-line rounded-md bg-muted/50 px-3 py-2 text-xs">{p.shootingBrief}</p>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Recommandation de format</p>
              <p className="text-xs">{p.formatAdvice}</p>
            </div>
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t bg-muted/40 px-5 py-3">
        {p.added ? (
          <>
            <span className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-300"><Check className="h-3.5 w-3.5" /> Ajoutée</span>
            <Button variant="outline" size="sm" className="ml-auto" onClick={onOpen}>Ouvrir la fiche</Button>
          </>
        ) : (
          <>
            <Button variant="ghost" size="sm" onClick={onReject}><Trash2 /> Rejeter</Button>
            <div className="ml-auto flex items-center gap-2">
              <Input type="date" value={p.date} onChange={(e) => onChange({ date: e.target.value })} className="h-8 w-[150px] text-xs" aria-label="Date de publication (optionnelle)" />
              <Button size="sm" onClick={onAdd}>{p.date ? "Ajouter au calendrier" : "Ajouter aux idées"}</Button>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
