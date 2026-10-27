"use client";

import * as React from "react";
import { Check, Search, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/misc";
import { MEDIA_CATEGORY_LABELS } from "@/lib/domain/constants";
import { useData } from "@/lib/client/store";
import { cn, normalize } from "@/lib/utils";
import { MediaThumb } from "./media-thumb";

/** Sélection de médias de la bibliothèque (avec import direct). */
export function MediaPicker({
  open,
  onOpenChange,
  selected,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selected: string[];
  onConfirm: (ids: string[]) => void;
}) {
  const { media, uploadMedia } = useData();
  const [query, setQuery] = React.useState("");
  const [picked, setPicked] = React.useState<string[]>(selected);
  const [uploading, setUploading] = React.useState<number | null>(null);
  const fileInput = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) setPicked(selected);
    // On ne réinitialise la sélection qu'à l'ouverture.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const q = normalize(query.trim());
  const visible = media.filter(
    (m) => !q || normalize(`${m.name} ${m.tags.join(" ")} ${MEDIA_CATEGORY_LABELS[m.category]}`).includes(q),
  );

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    for (const file of Array.from(files)) {
      setUploading(0);
      const item = await uploadMedia(file, {}, setUploading);
      if (item) setPicked((p) => [...p, item.id]);
    }
    setUploading(null);
  }

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Associer des médias</DialogTitle>
          <DialogDescription>Sélectionnez des visuels de la médiathèque ou importez-en de nouveaux.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 overflow-hidden p-5">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher par nom ou tag…" className="pl-8" />
            </div>
            <Button variant="outline" onClick={() => fileInput.current?.click()} disabled={uploading !== null}>
              <Upload /> {uploading !== null ? `${Math.round(uploading * 100)} %` : "Importer"}
            </Button>
            <input ref={fileInput} type="file" multiple hidden accept="image/*,video/*,application/pdf" onChange={(e) => onFiles(e.target.files)} />
          </div>
          <div className="grid min-h-[200px] grid-cols-3 gap-2 overflow-y-auto scrollbar-thin sm:grid-cols-4 md:grid-cols-5">
            {visible.map((m) => {
              const on = picked.includes(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggle(m.id)}
                  aria-pressed={on}
                  className={cn(
                    "group relative overflow-hidden rounded-lg border text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    on && "ring-2 ring-primary",
                  )}
                >
                  <MediaThumb item={m} className="aspect-square w-full" />
                  <span className="block truncate px-1.5 py-1 text-[11px]">{m.name}</span>
                  {on && (
                    <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-primary text-primary-foreground">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                </button>
              );
            })}
            {!visible.length && (
              <EmptyState className="col-span-full" title={media.length ? "Aucun média ne correspond" : "Médiathèque vide"}>
                Importez une photo, une vidéo ou un PDF pour l'associer à cette publication.
              </EmptyState>
            )}
          </div>
        </div>
        <DialogFooter>
          <span className="mr-auto text-xs text-muted-foreground">{picked.length} sélectionné(s)</span>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={() => {
              onConfirm(picked);
              onOpenChange(false);
            }}
          >
            Associer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
