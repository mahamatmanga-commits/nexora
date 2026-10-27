"use client";

import * as React from "react";
import { toast } from "sonner";
import { Download, FileText, Images, Search, ShieldCheck, ShieldAlert, Tag, Trash2, Upload, X } from "lucide-react";
import { MEDIA_CATEGORIES, MEDIA_CATEGORY_LABELS, type MediaCategory } from "@/lib/domain/constants";
import type { MediaItem } from "@/lib/domain/types";
import { mediaUrl, useData } from "@/lib/client/store";
import { usePostEditor } from "@/components/posts/post-editor-provider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input, Label, NativeSelect, Textarea } from "@/components/ui/input";
import { EmptyState, PageHeader, Progress, Segmented } from "@/components/ui/misc";
import { cn, formatBytes, normalize } from "@/lib/utils";
import { MediaThumb } from "./media-thumb";

interface UploadJob {
  id: string;
  name: string;
  progress: number;
  error?: string;
}

export function MediaPage() {
  const { media, posts, uploadMedia } = useData();
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState<MediaCategory | "all">("all");
  const [tag, setTag] = React.useState<string | null>(null);
  const [dragging, setDragging] = React.useState(false);
  const [jobs, setJobs] = React.useState<UploadJob[]>([]);
  const [detail, setDetail] = React.useState<string | null>(null);
  const fileInput = React.useRef<HTMLInputElement>(null);
  const dragDepth = React.useRef(0);

  const usage = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const p of posts) for (const m of p.mediaIds) map.set(m, (map.get(m) ?? 0) + 1);
    return map;
  }, [posts]);

  const allTags = React.useMemo(() => [...new Set(media.flatMap((m) => m.tags))].sort(), [media]);
  const q = normalize(query.trim());
  const visible = media.filter(
    (m) =>
      (category === "all" || m.category === category) &&
      (!tag || m.tags.includes(tag)) &&
      (!q || normalize(`${m.name} ${m.originalName} ${m.tags.join(" ")} ${m.notes}`).includes(q)),
  );

  async function upload(files: FileList | File[]) {
    const list = Array.from(files);
    for (const file of list) {
      const id = crypto.randomUUID();
      setJobs((j) => [...j, { id, name: file.name, progress: 0 }]);
      const params: Record<string, string> = category !== "all" ? { category } : {};
      const item = await uploadMedia(file, params, (r) => setJobs((j) => j.map((x) => (x.id === id ? { ...x, progress: r } : x))));
      setJobs((j) => (item ? j.filter((x) => x.id !== id) : j.map((x) => (x.id === id ? { ...x, error: "Échec" } : x))));
    }
    if (list.length) toast.success(`${list.length} fichier(s) traité(s)`);
  }

  return (
    <div
      className="relative flex min-h-dvh flex-col gap-5 p-4 lg:p-8"
      onDragEnter={(e) => {
        if (!e.dataTransfer.types.includes("Files")) return;
        dragDepth.current++;
        setDragging(true);
      }}
      onDragLeave={() => {
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (!dragDepth.current) setDragging(false);
      }}
      onDragOver={(e) => e.dataTransfer.types.includes("Files") && e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        dragDepth.current = 0;
        setDragging(false);
        if (e.dataTransfer.files.length) void upload(e.dataTransfer.files);
      }}
    >
      <PageHeader title="Médiathèque" description="Photos, vidéos, visuels et documents de campagne, au même endroit.">
        <Button onClick={() => fileInput.current?.click()}>
          <Upload /> Importer
        </Button>
        <input
          ref={fileInput}
          type="file"
          multiple
          hidden
          accept="image/*,video/mp4,video/quicktime,video/webm,application/pdf"
          onChange={(e) => {
            if (e.target.files) void upload(e.target.files);
            e.target.value = "";
          }}
        />
      </PageHeader>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un média ou un tag…" className="pl-8" aria-label="Rechercher un média" />
        </div>
        <div className="overflow-x-auto">
          <Segmented
            value={category}
            onChange={setCategory}
            options={[{ value: "all" as const, label: "Tous" }, ...MEDIA_CATEGORIES.map((c) => ({ value: c, label: MEDIA_CATEGORY_LABELS[c] }))]}
          />
        </div>
      </div>
      {allTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <Tag className="h-3.5 w-3.5 text-muted-foreground" />
          {allTags.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTag(tag === t ? null : t)}
              aria-pressed={tag === t}
              className={cn("rounded-full border px-2 py-0.5 text-xs text-muted-foreground transition hover:bg-accent", tag === t && "border-primary bg-primary text-primary-foreground hover:bg-primary")}
            >
              #{t}
            </button>
          ))}
        </div>
      )}

      {jobs.length > 0 && (
        <div className="flex flex-col gap-2 rounded-xl border bg-card p-3">
          {jobs.map((j) => (
            <div key={j.id} className="flex items-center gap-3 text-xs">
              <span className="w-48 truncate">{j.name}</span>
              <Progress value={j.progress * 100} className="flex-1" color={j.error ? "#e03131" : undefined} />
              <span className="w-12 text-right tabular text-muted-foreground">{j.error ?? `${Math.round(j.progress * 100)} %`}</span>
              {j.error && (
                <button type="button" onClick={() => setJobs((x) => x.filter((y) => y.id !== j.id))} aria-label="Fermer">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {visible.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
          {visible.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setDetail(m.id)}
              className="group overflow-hidden rounded-xl border bg-card text-left shadow-sm transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <MediaThumb item={m} className="aspect-[4/3] w-full transition-transform duration-300 group-hover:scale-[1.02]" />
              <div className="flex flex-col gap-0.5 p-2.5">
                <span className="truncate text-xs font-medium">{m.name}</span>
                <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  {MEDIA_CATEGORY_LABELS[m.category]} · {formatBytes(m.size)}
                  {m.rightsChecked ? <ShieldCheck className="ml-auto h-3.5 w-3.5 text-emerald-600" aria-label="Droits vérifiés" /> : <ShieldAlert className="ml-auto h-3.5 w-3.5 text-amber-500" aria-label="Droits à vérifier" />}
                </span>
                {!!usage.get(m.id) && <span className="text-[11px] text-primary">Utilisé dans {usage.get(m.id)} publication(s)</span>}
              </div>
            </button>
          ))}
        </div>
      ) : (
        <button type="button" onClick={() => fileInput.current?.click()} className="w-full">
          <EmptyState icon={<Images />} title={media.length ? "Aucun média ne correspond" : "Glissez vos fichiers ici"}>
            {media.length
              ? "Modifiez la recherche ou les filtres."
              : "Photos (JPG, PNG, WebP), vidéos (MP4, MOV, WebM) et PDF. Les fichiers sont stockés hors de la base de données, en flux, même volumineux."}
          </EmptyState>
        </button>
      )}

      {dragging && (
        <div className="pointer-events-none fixed inset-0 z-40 grid place-items-center bg-primary/10 backdrop-blur-[1px]">
          <div className="rounded-2xl border-2 border-dashed border-primary bg-card px-10 py-8 text-center shadow-xl">
            <Upload className="mx-auto mb-2 h-6 w-6 text-primary" />
            <p className="font-medium">Déposez pour importer</p>
            <p className="text-xs text-muted-foreground">{category !== "all" ? `Catégorie : ${MEDIA_CATEGORY_LABELS[category]}` : "Catégorie détectée automatiquement"}</p>
          </div>
        </div>
      )}

      {detail && <MediaDetail key={detail} id={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}

function MediaDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const { media, posts, updateMedia, deleteMedia } = useData();
  const { openPost } = usePostEditor();
  const item = media.find((m) => m.id === id);
  const [draft, setDraft] = React.useState<Pick<MediaItem, "name" | "category" | "tags" | "rightsChecked" | "notes"> | null>(
    item ? { name: item.name, category: item.category, tags: item.tags, rightsChecked: item.rightsChecked, notes: item.notes } : null,
  );
  const [tagInput, setTagInput] = React.useState("");
  if (!item || !draft) return null;
  const linked = posts.filter((p) => p.mediaIds.includes(item.id));

  function addTag() {
    const t = tagInput.trim().toLowerCase().replace(/^#/, "");
    if (t && !draft!.tags.includes(t)) setDraft({ ...draft!, tags: [...draft!.tags, t] });
    setTagInput("");
  }

  async function save() {
    if (await updateMedia(item!.id, draft!)) {
      toast.success("Média mis à jour");
      onClose();
    }
  }

  async function remove() {
    const warn = linked.length ? ` Il sera retiré de ${linked.length} publication(s).` : "";
    if (!window.confirm(`Supprimer définitivement « ${item!.name} » ?${warn}`)) return;
    if (await deleteMedia(item!.id)) {
      toast.success("Média supprimé");
      onClose();
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="truncate">{item.name}</DialogTitle>
          <DialogDescription>
            {item.originalName} · {formatBytes(item.size)} · importé le {new Date(item.createdAt).toLocaleDateString("fr-FR")}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-0 overflow-y-auto md:grid-cols-[1fr_300px]">
          <div className="grid min-h-[260px] place-items-center bg-muted/50 p-4">
            {item.mimeType.startsWith("image/") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mediaUrl(item.id)} alt={item.name} className="max-h-[60vh] rounded-md object-contain" />
            ) : item.mimeType.startsWith("video/") ? (
              <video src={mediaUrl(item.id)} controls playsInline className="max-h-[60vh] w-full rounded-md bg-black" />
            ) : item.mimeType === "application/pdf" ? (
              <iframe src={mediaUrl(item.id)} title={item.name} className="h-[60vh] w-full rounded-md border bg-white" />
            ) : (
              <FileText className="h-10 w-10 text-muted-foreground" />
            )}
          </div>
          <div className="flex flex-col gap-3.5 border-t p-5 md:border-l md:border-t-0">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="m-name">Nom</Label>
              <Input id="m-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Catégorie</Label>
              <NativeSelect value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as MediaCategory })}>
                {MEDIA_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{MEDIA_CATEGORY_LABELS[c]}</option>
                ))}
              </NativeSelect>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="m-tag">Tags</Label>
              <div className="flex flex-wrap gap-1">
                {draft.tags.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 rounded-full bg-muted py-0.5 pl-2 pr-1 text-xs">
                    #{t}
                    <button type="button" onClick={() => setDraft({ ...draft, tags: draft.tags.filter((x) => x !== t) })} aria-label={`Retirer ${t}`}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <Input
                id="m-tag"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                onBlur={addTag}
                placeholder="Ajouter un tag (Entrée)"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={draft.rightsChecked} onCheckedChange={(v) => setDraft({ ...draft, rightsChecked: v === true })} />
              Droits d'utilisation vérifiés
            </label>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="m-notes">Notes (crédit, autorisation, durée de droits…)</Label>
              <Textarea id="m-notes" rows={3} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1">
              <Label>Utilisé dans</Label>
              {linked.length ? (
                linked.map((p) => (
                  <button key={p.id} type="button" className="truncate text-left text-xs text-primary hover:underline" onClick={() => { onClose(); openPost(p.id); }}>
                    {p.title}
                  </button>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">Aucune publication. Associez ce média depuis une fiche de publication.</p>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" className="mr-auto text-destructive hover:text-destructive" onClick={remove}>
            <Trash2 /> Supprimer
          </Button>
          <Button variant="outline" asChild>
            <a href={`${mediaUrl(item.id)}?download`}>
              <Download /> Télécharger
            </a>
          </Button>
          <Button onClick={save}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
