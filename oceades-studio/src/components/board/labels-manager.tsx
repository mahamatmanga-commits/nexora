"use client";

import * as React from "react";
import { toast } from "sonner";
import { Check, Pencil, Plus, Trash2 } from "lucide-react";
import { LABEL_FAMILIES, LABEL_FAMILY_LABELS, LABEL_PALETTE, type LabelFamily } from "@/lib/domain/constants";
import type { Label } from "@/lib/domain/types";
import { useData } from "@/lib/client/store";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/** Éditeur d'une étiquette : nom + couleur (utilisé dans le gestionnaire et dans le sélecteur de la carte). */
export function LabelEditor({
  label,
  family,
  onDone,
}: {
  label?: Label;
  family: LabelFamily;
  onDone: (created?: Label) => void;
}) {
  const { createLabel, updateLabel, deleteLabel, cards } = useData();
  const [name, setName] = React.useState(label?.name ?? "");
  const [color, setColor] = React.useState(label?.color ?? LABEL_PALETTE[0].color);

  async function save() {
    if (!name.trim()) return;
    if (label) {
      if (await updateLabel(label.id, { name: name.trim(), color })) onDone();
    } else {
      const created = await createLabel(family, name.trim(), color);
      if (created) onDone(created);
    }
  }

  async function remove() {
    if (!label) return;
    const used = cards.filter((c) => c.labelIds.includes(label.id)).length;
    if (!window.confirm(`Supprimer l'étiquette « ${label.name} » ?${used ? ` Elle sera retirée de ${used} carte(s) de ce tableau.` : ""}`)) return;
    if (await deleteLabel(label.id)) {
      toast.success("Étiquette supprimée");
      onDone();
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid place-items-center rounded-md bg-muted/60 py-4">
        <span className="inline-flex h-7 min-w-[80px] items-center justify-center rounded px-3 text-sm font-medium text-white" style={{ backgroundColor: color }}>
          {name || "Aperçu"}
        </span>
      </div>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && save()}
        maxLength={40}
        placeholder="Nom de l'étiquette"
        aria-label="Nom de l'étiquette"
        className="h-8 rounded-md border bg-card px-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/40"
      />
      <div className="grid grid-cols-6 gap-1.5" role="radiogroup" aria-label="Couleur">
        {LABEL_PALETTE.map((p) => (
          <button
            key={p.color}
            type="button"
            role="radio"
            aria-checked={color === p.color}
            title={p.name}
            onClick={() => setColor(p.color)}
            className={cn("grid h-7 place-items-center rounded text-white ring-offset-2 ring-offset-popover", color === p.color && "ring-2 ring-ring")}
            style={{ backgroundColor: p.color }}
          >
            {color === p.color && <Check className="h-3.5 w-3.5" />}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={save} disabled={!name.trim()} className="h-8 rounded-md bg-primary px-3 text-[13px] font-medium text-primary-foreground disabled:opacity-50">
          {label ? "Enregistrer" : "Créer"}
        </button>
        <button type="button" onClick={() => onDone()} className="h-8 rounded-md px-3 text-[13px] text-muted-foreground hover:bg-accent">
          Annuler
        </button>
        {label && (
          <button type="button" onClick={remove} className="ml-auto grid h-8 w-8 place-items-center rounded-md text-destructive hover:bg-destructive/10" aria-label="Supprimer l'étiquette">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export function LabelsManager({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { labels } = useData();
  const [editing, setEditing] = React.useState<{ family: LabelFamily; label?: Label } | null>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Étiquettes</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-5 overflow-y-auto p-5 scrollbar-thin">
          {editing ? (
            <LabelEditor label={editing.label} family={editing.family} onDone={() => setEditing(null)} />
          ) : (
            LABEL_FAMILIES.map((fam) => (
              <section key={fam} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-medium text-muted-foreground">{LABEL_FAMILY_LABELS[fam]}</h3>
                  <button type="button" onClick={() => setEditing({ family: fam })} className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:bg-accent hover:text-foreground" aria-label={`Ajouter une étiquette ${LABEL_FAMILY_LABELS[fam]}`}>
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {labels
                    .filter((l) => l.family === fam)
                    .map((l) => (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => setEditing({ family: fam, label: l })}
                        className="group inline-flex h-7 items-center gap-1.5 rounded px-2.5 text-[12px] font-medium text-white"
                        style={{ backgroundColor: l.color }}
                      >
                        {l.name}
                        <Pencil className="h-3 w-3 opacity-0 transition group-hover:opacity-80" />
                      </button>
                    ))}
                  {!labels.some((l) => l.family === fam) && <span className="text-xs text-muted-foreground">Aucune</span>}
                </div>
              </section>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
