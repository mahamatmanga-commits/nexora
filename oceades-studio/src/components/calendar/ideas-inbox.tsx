"use client";

import * as React from "react";
import { Lightbulb, Plus } from "lucide-react";
import { toast } from "sonner";
import type { Activity } from "@/lib/domain/constants";
import type { Post } from "@/lib/domain/types";
import { useData } from "@/lib/client/store";
import { Input } from "@/components/ui/input";
import { DropZone, PostChip, type ChipContext } from "./post-chip";

/**
 * Boîte à idées : saisie express (titre + Entrée) et idées non planifiées,
 * à glisser sur le calendrier. Déposer une publication ici retire sa date.
 */
export function IdeasInbox({ ideas, ctx, defaultActivity }: { ideas: Post[]; ctx: ChipContext; defaultActivity?: Activity }) {
  const { createPost } = useData();
  const [title, setTitle] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    setBusy(true);
    const post = await createPost({
      title: t,
      scheduledAt: null,
      platform: "instagram",
      activity: defaultActivity ?? "global",
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
    });
    setBusy(false);
    if (post) {
      setTitle("");
      toast.success("Idée ajoutée", { action: { label: "Compléter", onClick: () => ctx.onOpen(post.id) } });
    }
  }

  return (
    <DropZone id="inbox" className="flex h-full flex-col gap-3 rounded-xl border bg-card p-3 transition-colors">
      <div className="flex items-center gap-2">
        <Lightbulb className="h-4 w-4 text-amber-500" />
        <h2 className="text-sm font-semibold">Idées à planifier</h2>
        <span className="text-xs tabular text-muted-foreground">{ideas.length}</span>
      </div>
      <form onSubmit={add} className="flex gap-1.5">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nouvelle idée… (Entrée)" aria-label="Titre de la nouvelle idée" className="h-8 text-xs" disabled={busy} />
        <button type="submit" disabled={busy || !title.trim()} className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground disabled:opacity-40" aria-label="Ajouter l'idée">
          <Plus className="h-4 w-4" />
        </button>
      </form>
      <div className="-mx-1 flex flex-1 flex-col gap-1 overflow-y-auto px-1 scrollbar-thin">
        {ideas.map((p) => (
          <PostChip key={p.id} post={p} ctx={ctx} />
        ))}
        {!ideas.length && <p className="py-4 text-center text-xs text-muted-foreground">Aucune idée en attente. Notez-en une ci-dessus ou déposez ici une publication pour la retirer du calendrier.</p>}
      </div>
      <p className="text-[11px] leading-relaxed text-muted-foreground">Glissez une idée sur un jour pour la planifier. Maintenez <kbd className="rounded border px-1">Alt</kbd> en déposant pour dupliquer.</p>
    </DropZone>
  );
}
