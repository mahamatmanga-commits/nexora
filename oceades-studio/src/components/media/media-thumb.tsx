"use client";

import * as React from "react";
import { FileText, Film, ImageOff } from "lucide-react";
import type { MediaItem } from "@/lib/domain/types";
import { mediaUrl } from "@/lib/client/store";
import { cn } from "@/lib/utils";

/** Vignette d'un média : image réelle, première image de la vidéo, ou icône de document. */
export function MediaThumb({ item, className, controls = false }: { item: MediaItem; className?: string; controls?: boolean }) {
  const [broken, setBroken] = React.useState(false);
  const base = cn("relative overflow-hidden bg-muted", className);
  if (broken) {
    return (
      <div className={cn(base, "grid place-items-center text-muted-foreground")}>
        <ImageOff className="h-5 w-5" />
      </div>
    );
  }
  if (item.mimeType.startsWith("image/")) {
    return (
      <div className={base}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={mediaUrl(item.id)} alt={item.name} loading="lazy" onError={() => setBroken(true)} className="h-full w-full object-cover" />
      </div>
    );
  }
  if (item.mimeType.startsWith("video/")) {
    return (
      <div className={base}>
        <video
          src={`${mediaUrl(item.id)}#t=0.5`}
          preload="metadata"
          muted
          playsInline
          controls={controls}
          onError={() => setBroken(true)}
          className="h-full w-full object-cover"
        />
        {!controls && (
          <span className="absolute bottom-1 left-1 rounded bg-black/60 p-0.5 text-white">
            <Film className="h-3 w-3" />
          </span>
        )}
      </div>
    );
  }
  return (
    <div className={cn(base, "grid place-items-center text-muted-foreground")}>
      <FileText className="h-6 w-6" />
    </div>
  );
}
