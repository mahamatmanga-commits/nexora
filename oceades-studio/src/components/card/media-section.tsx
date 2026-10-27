"use client";

import * as React from "react";
import { ExternalLink, ImagePlus, Paperclip, Star, X } from "lucide-react";
import type { Card } from "@/lib/domain/types";
import { useData, useIndexes } from "@/lib/client/store";
import { MediaPicker } from "@/components/media/media-picker";
import { MediaThumb } from "@/components/media/media-thumb";
import { cn } from "@/lib/utils";
import { SectionTitle } from "./fields";

export function MediaSection({ card }: { card: Card }) {
  const { updateCard } = useData();
  const { mediaById } = useIndexes();
  const [picker, setPicker] = React.useState(false);
  const items = card.attachmentIds.map((id) => mediaById.get(id)).filter(Boolean) as NonNullable<ReturnType<typeof mediaById.get>>[];

  return (
    <section>
      <SectionTitle
        icon={<Paperclip />}
        action={
          <button type="button" onClick={() => setPicker(true)} className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[12px] text-muted-foreground hover:bg-accent hover:text-foreground">
            <ImagePlus className="h-3.5 w-3.5" /> Ajouter
          </button>
        }
      >
        Médias
      </SectionTitle>
      {items.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {items.map((m) => {
            const isCover = card.coverMediaId === m.id;
            return (
              <div key={m.id} className="group relative">
                <MediaThumb item={m} className={cn("h-20 w-28 rounded-md", isCover && "ring-2 ring-primary")} />
                <div className="absolute right-1 top-1 flex gap-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                  {(m.mimeType.startsWith("image/") || m.mimeType.startsWith("video/")) && (
                    <button
                      type="button"
                      onClick={() => updateCard(card.id, { coverMediaId: isCover ? null : m.id })}
                      className="grid h-6 w-6 place-items-center rounded bg-black/60 text-white"
                      aria-label={isCover ? "Retirer la couverture" : "Définir comme couverture"}
                      title={isCover ? "Retirer la couverture" : "Couverture"}
                    >
                      <Star className={cn("h-3.5 w-3.5", isCover && "fill-current")} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => updateCard(card.id, { attachmentIds: card.attachmentIds.filter((x) => x !== m.id), ...(isCover && { coverMediaId: null }) })}
                    className="grid h-6 w-6 place-items-center rounded bg-black/60 text-white"
                    aria-label={`Retirer ${m.name}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="mt-1 w-28 truncate text-[11px] text-muted-foreground">{m.name}</p>
              </div>
            );
          })}
        </div>
      ) : (
        <button type="button" onClick={() => setPicker(true)} className="w-full rounded-md border border-dashed px-3 py-3 text-left text-[13px] text-muted-foreground hover:bg-muted/50">
          Associer des photos, vidéos ou documents
        </button>
      )}
      {card.links.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1">
          {card.links.map((l, i) => (
            <li key={i}>
              <a href={l.url} target="_blank" rel="noreferrer noopener" className="inline-flex max-w-full items-center gap-1.5 truncate text-[13px] text-primary hover:underline">
                <ExternalLink className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{l.name || l.url}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
      <MediaPicker
        open={picker}
        onOpenChange={setPicker}
        selected={card.attachmentIds}
        onConfirm={(ids) => {
          const firstVisual = ids.map((id) => mediaById.get(id)).find((m) => m && (m.mimeType.startsWith("image/") || m.mimeType.startsWith("video/")));
          void updateCard(card.id, {
            attachmentIds: ids,
            ...(!card.coverMediaId && firstVisual && { coverMediaId: firstVisual.id }),
            ...(card.coverMediaId && !ids.includes(card.coverMediaId) && { coverMediaId: null }),
          });
        }}
      />
    </section>
  );
}
