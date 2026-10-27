"use client";

import * as React from "react";
import { toast } from "sonner";
import { addDays, format } from "date-fns";
import {
  AlertTriangle,
  CalendarClock,
  CalendarOff,
  Copy,
  ImagePlus,
  Layers,
  MoreHorizontal,
  Trash2,
  X,
} from "lucide-react";
import {
  ACTIVITIES,
  ACTIVITY_LABELS,
  CAPTION_LIMITS,
  CHECKLIST_ITEMS,
  FORMATS,
  FORMAT_LABELS,
  OBJECTIVES,
  OBJECTIVE_LABELS,
  PLATFORM_FORMATS,
  PLATFORMS,
  PLATFORM_LABELS,
  STATUSES,
  STATUS_LABELS,
} from "@/lib/domain/constants";
import { postInputSchema, type PostInput } from "@/lib/domain/schemas";
import type { Post } from "@/lib/domain/types";
import { useData } from "@/lib/client/store";
import { checklistState, deadlineLabel, deadlineLevel } from "@/lib/insights/alerts";
import { findRepetitions } from "@/lib/insights/repetition";
import { reuseSuggestions } from "@/lib/insights/reuse";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label, NativeSelect, Textarea } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { DemoBadge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/misc";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MediaPicker } from "@/components/media/media-picker";
import { MediaThumb } from "@/components/media/media-thumb";
import { cn } from "@/lib/utils";
import { STATUS_COLORS } from "@/lib/domain/constants";

const EMPTY: PostInput = {
  title: "",
  scheduledAt: null,
  platform: "instagram",
  activity: "fitness",
  format: "reel",
  objective: "engagement",
  status: "idee",
  description: "",
  hook: "",
  cta: "",
  notes: "",
  campaignId: null,
  mediaIds: [],
  checklist: { visualReady: false, textValidated: false, rightsChecked: false },
};

function fromPost(p: Post): PostInput {
  const { id: _id, isDemo: _d, createdAt: _c, updatedAt: _u, ...rest } = p;
  return rest;
}

type Errors = Partial<Record<keyof PostInput, string>>;

function Field({ label, error, children, className, htmlFor }: { label: string; error?: string; children: React.ReactNode; className?: string; htmlFor?: string }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function PostDialog({
  open,
  postId,
  defaults,
  onOpenChange,
  onSwitch,
}: {
  open: boolean;
  postId: string | null;
  defaults: Partial<PostInput>;
  onOpenChange: (open: boolean) => void;
  onSwitch: (id: string) => void;
}) {
  const data = useData();
  const existing = postId ? data.posts.find((p) => p.id === postId) ?? null : null;
  const initial = React.useMemo<PostInput>(
    () => (existing ? fromPost(existing) : { ...EMPTY, ...defaults }),
    // Valeurs initiales figées à l'ouverture.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [postId],
  );
  const [form, setForm] = React.useState<PostInput>(initial);
  const [errors, setErrors] = React.useState<Errors>({});
  const [saving, setSaving] = React.useState(false);
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const titleRef = React.useRef<HTMLInputElement>(null);

  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const set = <K extends keyof PostInput>(key: K, value: PostInput[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const date = form.scheduledAt?.slice(0, 10) ?? "";
  const time = form.scheduledAt?.slice(11, 16) ?? "";

  const virtualPost: Post = {
    ...form,
    id: postId ?? "__new__",
    isDemo: existing?.isDemo ?? false,
    createdAt: existing?.createdAt ?? "",
    updatedAt: existing?.updatedAt ?? "",
  };
  const repetitions = React.useMemo(
    () => findRepetitions(virtualPost, data.posts).slice(0, 3),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form.title, form.hook, form.description, form.activity, form.format, form.scheduledAt, data.posts],
  );
  const deadline = deadlineLevel(virtualPost);
  const checklist = checklistState(form);
  const limit = CAPTION_LIMITS[form.platform];
  const formatOk = PLATFORM_FORMATS[form.platform].includes(form.format);

  function close() {
    if (dirty && !saving && !window.confirm("Fermer sans enregistrer les modifications ?")) return;
    onOpenChange(false);
  }

  async function save() {
    const parsed = postInputSchema.safeParse(form);
    if (!parsed.success) {
      const errs: Errors = {};
      for (const issue of parsed.error.issues) errs[issue.path[0] as keyof PostInput] ??= issue.message;
      setErrors(errs);
      if (errs.title) titleRef.current?.focus();
      return;
    }
    setSaving(true);
    const result = existing ? await data.updatePost(existing.id, parsed.data) : await data.createPost(parsed.data);
    setSaving(false);
    if (result) {
      toast.success(existing ? "Publication enregistrée" : "Publication créée");
      onOpenChange(false);
    }
  }

  async function duplicate() {
    if (!existing) return;
    const copy = await data.duplicatePost(existing.id);
    if (copy) {
      toast.success("Publication dupliquée");
      onSwitch(copy.id);
    }
  }

  async function remove() {
    if (!existing || !window.confirm(`Supprimer « ${existing.title} » ? Cette action est définitive.`)) return;
    if (await data.deletePost(existing.id)) {
      toast.success("Publication supprimée");
      onOpenChange(false);
    }
  }

  async function decline(platform: PostInput["platform"], format: PostInput["format"]) {
    if (!existing) return;
    const created = await data.createPost({
      ...fromPost(existing),
      title: `${existing.title} — ${FORMAT_LABELS[format]} ${PLATFORM_LABELS[platform]}`,
      platform,
      format,
      status: "idee",
      mediaIds: existing.mediaIds,
      notes: `Déclinaison de « ${existing.title} ». Adapter le texte et le cadrage à ${PLATFORM_LABELS[platform]}.`,
      checklist: { visualReady: false, textValidated: false, rightsChecked: false },
    });
    if (created) {
      toast.success("Déclinaison créée en tant qu'idée");
      onSwitch(created.id);
    }
  }

  const selectedMedia = form.mediaIds.map((id) => data.media.find((m) => m.id === id)).filter(Boolean) as typeof data.media;

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <DialogContent
        className="max-w-4xl"
        onOpenAutoFocus={(e) => {
          if (!existing) {
            e.preventDefault();
            titleRef.current?.focus();
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            void save();
          }
        }}
      >
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[form.status] }} />
            <DialogTitle>{existing ? "Fiche de publication" : "Nouvelle publication"}</DialogTitle>
            {existing?.isDemo && <DemoBadge />}
          </div>
          <DialogDescription className="sr-only">Renseignez les informations de la publication.</DialogDescription>
        </DialogHeader>

        <div className="grid flex-1 gap-0 overflow-y-auto scrollbar-thin md:grid-cols-[1fr_300px]">
          {/* Contenu */}
          <div className="flex flex-col gap-4 p-5">
            <div>
              <input
                ref={titleRef}
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="Titre interne de la publication"
                aria-label="Titre"
                aria-invalid={!!errors.title}
                className="w-full bg-transparent text-lg font-semibold tracking-tight outline-none placeholder:text-muted-foreground/60"
              />
              {errors.title && <p className="mt-1 text-xs text-destructive">{errors.title}</p>}
            </div>

            {(deadline || repetitions.length > 0 || !formatOk) && (
              <div className="flex flex-col gap-1.5">
                {deadline && (
                  <div className={cn("flex items-center gap-2 rounded-md px-3 py-2 text-xs", deadline === "late" ? "bg-red-500/10 text-red-700 dark:text-red-300" : "bg-amber-500/10 text-amber-700 dark:text-amber-300")}>
                    <CalendarClock className="h-3.5 w-3.5 shrink-0" />
                    {deadline === "late" ? `${deadlineLabel(virtualPost)} : la date est passée et la publication n'est pas programmée.` : `${deadlineLabel(virtualPost)} : publication proche encore au stade « ${STATUS_LABELS[form.status]} ».`}
                  </div>
                )}
                {!formatOk && (
                  <div className="flex items-center gap-2 rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    Le format {FORMAT_LABELS[form.format]} n'est pas natif sur {PLATFORM_LABELS[form.platform]}.
                  </div>
                )}
                {repetitions.map((r) => (
                  <button
                    key={r.otherId}
                    type="button"
                    onClick={() => !dirty && onSwitch(r.otherId)}
                    className="flex items-start gap-2 rounded-md bg-amber-500/10 px-3 py-2 text-left text-xs text-amber-800 dark:text-amber-200"
                  >
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>
                      Risque de répétition avec « <strong>{r.otherTitle}</strong> » ({r.daysApart} j d'écart) — {r.reason}.
                    </span>
                  </button>
                ))}
              </div>
            )}

            <Field label="Accroche (hook)" error={errors.hook} htmlFor="hook">
              <Input id="hook" value={form.hook} onChange={(e) => set("hook", e.target.value)} placeholder="La première phrase qui arrête le scroll" />
            </Field>
            <Field label="Description / légende" error={errors.description} htmlFor="description">
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={7}
                placeholder="Texte destiné aux réseaux sociaux"
              />
              <p className={cn("text-right text-[11px] tabular text-muted-foreground", form.description.length > limit.max && "text-destructive", form.description.length > limit.recommended && form.description.length <= limit.max && "text-amber-600")}>
                {form.description.length} caractères · conseillé ≤ {limit.recommended} sur {PLATFORM_LABELS[form.platform]} (max {limit.max.toLocaleString("fr-FR")})
              </p>
            </Field>
            <Field label="Appel à l'action (CTA)" error={errors.cta} htmlFor="cta">
              <Input id="cta" value={form.cta} onChange={(e) => set("cta", e.target.value)} placeholder="Ex. Réservez votre séance d'essai" />
            </Field>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label>Visuels</Label>
                <Button variant="ghost" size="sm" onClick={() => setPickerOpen(true)}>
                  <ImagePlus /> Associer
                </Button>
              </div>
              {selectedMedia.length ? (
                <div className="flex flex-wrap gap-2">
                  {selectedMedia.map((m) => (
                    <div key={m.id} className="group relative">
                      <MediaThumb item={m} className="h-20 w-20 rounded-md border" />
                      <button
                        type="button"
                        onClick={() => set("mediaIds", form.mediaIds.filter((id) => id !== m.id))}
                        className="absolute -right-1.5 -top-1.5 hidden h-5 w-5 place-items-center rounded-full border bg-card shadow group-hover:grid focus-visible:grid"
                        aria-label={`Retirer ${m.name}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  className="rounded-md border border-dashed px-3 py-4 text-xs text-muted-foreground transition hover:bg-accent"
                >
                  Aucun visuel associé — cliquez pour choisir dans la médiathèque ou importer un fichier.
                </button>
              )}
            </div>

            <Field label="Notes internes" error={errors.notes} htmlFor="notes">
              <Textarea id="notes" value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} placeholder="Instructions pour l'équipe, brief, contraintes…" />
            </Field>
          </div>

          {/* Métadonnées */}
          <aside className="flex flex-col gap-3.5 border-t bg-muted/30 p-5 md:border-l md:border-t-0">
            <Field label="Statut">
              <NativeSelect value={form.status} onChange={(e) => set("status", e.target.value as PostInput["status"])}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Date et heure de publication" error={errors.scheduledAt}>
              {form.scheduledAt ? (
                <div className="flex gap-2">
                  <Input type="date" value={date} aria-label="Date" onChange={(e) => e.target.value && set("scheduledAt", `${e.target.value}T${time || "12:00"}`)} />
                  <Input type="time" value={time} aria-label="Heure" className="w-28" onChange={(e) => e.target.value && set("scheduledAt", `${date}T${e.target.value}`)} />
                  <Button variant="ghost" size="icon" aria-label="Retirer la date" title="Retirer la date (idée non planifiée)" onClick={() => set("scheduledAt", null)}>
                    <CalendarOff />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="justify-start text-muted-foreground"
                  onClick={() => {
                    set("scheduledAt", `${format(addDays(new Date(), 1), "yyyy-MM-dd")}T12:00`);
                  }}
                >
                  <CalendarClock /> Non planifiée — choisir une date
                </Button>
              )}
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Plateforme">
                <NativeSelect value={form.platform} onChange={(e) => set("platform", e.target.value as PostInput["platform"])}>
                  {PLATFORMS.map((p) => (
                    <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Format">
                <NativeSelect value={form.format} onChange={(e) => set("format", e.target.value as PostInput["format"])}>
                  {FORMATS.map((f) => (
                    <option key={f} value={f}>{FORMAT_LABELS[f]}</option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Activité">
                <NativeSelect value={form.activity} onChange={(e) => set("activity", e.target.value as PostInput["activity"])}>
                  {ACTIVITIES.map((a) => (
                    <option key={a} value={a}>{ACTIVITY_LABELS[a]}</option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Objectif">
                <NativeSelect value={form.objective} onChange={(e) => set("objective", e.target.value as PostInput["objective"])}>
                  {OBJECTIVES.map((o) => (
                    <option key={o} value={o}>{OBJECTIVE_LABELS[o]}</option>
                  ))}
                </NativeSelect>
              </Field>
            </div>
            <Field label="Campagne">
              <NativeSelect value={form.campaignId ?? ""} onChange={(e) => set("campaignId", e.target.value || null)}>
                <option value="">Aucune</option>
                {data.campaigns.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </NativeSelect>
            </Field>

            <div className="flex flex-col gap-2 rounded-lg border bg-card p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">Checklist de publication</span>
                <span className="text-[11px] tabular text-muted-foreground">{checklist.done}/{checklist.total}</span>
              </div>
              <Progress value={(checklist.done / checklist.total) * 100} color={checklist.complete ? "#0ca678" : undefined} />
              {CHECKLIST_ITEMS.map((item) => {
                const checked = checklist.items[item.key];
                const id = `check-${item.key}`;
                return (
                  <label key={item.key} htmlFor={id} className={cn("flex items-center gap-2 text-xs", item.auto && "text-muted-foreground")}>
                    <Checkbox
                      id={id}
                      checked={checked}
                      disabled={item.auto}
                      onCheckedChange={(v) =>
                        !item.auto && set("checklist", { ...form.checklist, [item.key]: v === true })
                      }
                    />
                    <span className="flex-1">{item.label}</span>
                    {item.auto && <span className="text-[10px] uppercase tracking-wide">auto</span>}
                  </label>
                );
              })}
            </div>
            {existing && (
              <p className="text-[11px] text-muted-foreground">
                Modifiée le {new Date(existing.updatedAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
              </p>
            )}
          </aside>
        </div>

        <DialogFooter>
          {existing && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="mr-auto">
                  <MoreHorizontal /> Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                <DropdownMenuItem onSelect={duplicate} disabled={dirty}>
                  <Copy /> Dupliquer
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5" /> Décliner pour…
                </DropdownMenuLabel>
                {reuseSuggestions(existing).map((s) => (
                  <DropdownMenuItem key={`${s.platform}-${s.format}`} onSelect={() => decline(s.platform, s.format)} disabled={dirty}>
                    <div className="flex flex-col">
                      <span>{s.label}</span>
                      <span className="text-[11px] text-muted-foreground">{s.why}</span>
                    </div>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem destructive onSelect={remove}>
                  <Trash2 /> Supprimer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {existing && dirty && <span className="text-xs text-muted-foreground">Modifications non enregistrées</span>}
          <Button variant="ghost" onClick={close}>
            Annuler
          </Button>
          <Button onClick={save} disabled={saving || (!!existing && !dirty)}>
            {saving ? "Enregistrement…" : existing ? "Enregistrer" : "Créer"}
            <kbd className="hidden rounded border border-white/25 px-1 text-[10px] font-normal opacity-70 sm:inline">⌘↵</kbd>
          </Button>
        </DialogFooter>
      </DialogContent>
      <MediaPicker open={pickerOpen} onOpenChange={setPickerOpen} selected={form.mediaIds} onConfirm={(ids) => set("mediaIds", ids)} />
    </Dialog>
  );
}
