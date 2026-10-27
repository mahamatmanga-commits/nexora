"use client";

import * as React from "react";
import { toast } from "sonner";
import { GalleryHorizontalEnd, Loader2, PenLine, Sparkles, Video, X } from "lucide-react";
import type { Card } from "@/lib/domain/types";
import { api } from "@/lib/client/api";
import { useData } from "@/lib/client/store";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

type Mode = "descriptions" | "script" | "carousel";
type Result =
  | { mode: "descriptions"; result: { versions: { style: string; text: string }[] } }
  | { mode: "script"; result: { hook: string; durationSeconds: number; shots: { timing: string; visual: string; voiceover: string; onScreenText: string }[]; cta: string } }
  | { mode: "carousel"; result: { title: string; slides: { title: string; text: string; visual: string }[]; ctaSlide: { title: string; text: string } } };

function scriptText(r: Extract<Result, { mode: "script" }>["result"]) {
  return [
    `Accroche : ${r.hook}`,
    `Durée estimée : ${r.durationSeconds} s`,
    "",
    ...r.shots.map((s) => `[${s.timing}] ${s.visual}${s.onScreenText ? `\n   Texte à l'écran : ${s.onScreenText}` : ""}${s.voiceover ? `\n   Voix off : ${s.voiceover}` : ""}`),
    "",
    `CTA : ${r.cta}`,
  ].join("\n");
}

function carouselText(r: Extract<Result, { mode: "carousel" }>["result"]) {
  return [
    `Slide 1 — ${r.title}`,
    ...r.slides.map((s, i) => `Slide ${i + 2} — ${s.title}\n${s.text}\nVisuel : ${s.visual}`),
    `Slide ${r.slides.length + 2} — ${r.ctaSlide.title}\n${r.ctaSlide.text}`,
  ].join("\n\n");
}

/** Bouton « IA » de la fiche : génère des propositions à la demande, l'utilisateur choisit ce qu'il insère. */
export function AiMenu({ card, onResult }: { card: Card; onResult: (r: Result | null, loading: boolean) => void }) {
  const { ai } = useData();

  async function run(mode: Mode) {
    onResult(null, true);
    try {
      const res = await api<Result>("/api/ai/card", { method: "POST", json: { cardId: card.id, mode } });
      onResult(res, false);
    } catch (e) {
      onResult(null, false);
      toast.error(e instanceof Error ? e.message : "Erreur de l'assistant");
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[12px] text-muted-foreground hover:bg-accent hover:text-foreground">
          <Sparkles className="h-3.5 w-3.5" /> IA
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {!ai.enabled && <DropdownMenuLabel className="font-normal">Assistant inactif : aucune clé API configurée sur le serveur.</DropdownMenuLabel>}
        <DropdownMenuItem disabled={!ai.enabled} onSelect={() => run("descriptions")}>
          <PenLine /> Générer une description
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!ai.enabled} onSelect={() => run("script")}>
          <Video /> Générer un script de Reel
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!ai.enabled} onSelect={() => run("carousel")}>
          <GalleryHorizontalEnd /> Générer un carrousel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AiResults({ card, result, loading, onClose }: { card: Card; result: Result | null; loading: boolean; onClose: () => void }) {
  const { updateCard } = useData();
  if (!loading && !result) return null;

  const insert = async (field: "caption" | "script" | "hook" | "cta", text: string, mode: "replace" | "append" = "replace") => {
    const value = mode === "append" && card[field] ? `${card[field]}\n\n${text}` : text;
    if (await updateCard(card.id, { [field]: value })) toast.success("Inséré dans la carte");
  };

  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <div className="mb-2 flex items-center gap-2 text-[12px] text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5" />
        {loading ? "Rédaction en cours…" : "Propositions de l'assistant — à relire avant utilisation"}
        <button type="button" onClick={onClose} className="ml-auto grid h-6 w-6 place-items-center rounded hover:bg-accent" aria-label="Fermer les propositions">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      {loading && <Loader2 className="mx-auto my-4 h-5 w-5 animate-spin text-muted-foreground" />}
      {result?.mode === "descriptions" &&
        result.result.versions.map((v, i) => (
          <div key={i} className="mb-2 rounded-md bg-card p-3 last:mb-0">
            <p className="mb-1 text-[11px] font-medium text-muted-foreground">{v.style}</p>
            <p className="whitespace-pre-wrap text-[13px]">{v.text}</p>
            <button type="button" onClick={() => insert("caption", v.text)} className="mt-2 h-7 rounded-md bg-primary px-2.5 text-[12px] font-medium text-primary-foreground">
              Utiliser cette version
            </button>
          </div>
        ))}
      {result?.mode === "script" && (
        <div className="rounded-md bg-card p-3">
          <pre className="whitespace-pre-wrap font-sans text-[13px]">{scriptText(result.result)}</pre>
          <div className="mt-2 flex gap-1.5">
            <button type="button" onClick={() => insert("script", scriptText(result.result))} className="h-7 rounded-md bg-primary px-2.5 text-[12px] font-medium text-primary-foreground">
              Insérer dans le script
            </button>
            <button type="button" onClick={() => insert("hook", result.result.hook)} className="h-7 rounded-md px-2.5 text-[12px] text-muted-foreground hover:bg-accent">
              Utiliser l'accroche
            </button>
          </div>
        </div>
      )}
      {result?.mode === "carousel" && (
        <div className="rounded-md bg-card p-3">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {[{ title: result.result.title, text: "", visual: "" }, ...result.result.slides, { ...result.result.ctaSlide, visual: "" }].map((s, i) => (
              <div key={i} className="flex aspect-[4/5] w-32 shrink-0 flex-col gap-1 rounded-md border bg-muted/40 p-2 text-[11px]">
                <span className="text-muted-foreground">{i + 1}</span>
                <span className="font-semibold leading-snug">{s.title}</span>
                <span className="text-muted-foreground">{s.text}</span>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => insert("script", carouselText(result.result))} className="h-7 rounded-md bg-primary px-2.5 text-[12px] font-medium text-primary-foreground">
            Insérer le déroulé
          </button>
        </div>
      )}
    </div>
  );
}

export type { Result as AiResult };
