"use client";

import * as React from "react";
import { Check, Pencil, Plus, Search } from "lucide-react";
import { LABEL_FAMILIES, LABEL_FAMILY_LABELS, type LabelFamily } from "@/lib/domain/constants";
import type { Label } from "@/lib/domain/types";
import { useData } from "@/lib/client/store";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { LabelEditor } from "@/components/board/labels-manager";
import { normalize } from "@/lib/utils";

/** Sélecteur d'étiquettes multiple, par familles, avec création et édition sur place. */
export function LabelPicker({ selected, onChange, children }: { selected: string[]; onChange: (ids: string[]) => void; children: React.ReactNode }) {
  const { labels } = useData();
  const [query, setQuery] = React.useState("");
  const [editing, setEditing] = React.useState<{ family: LabelFamily; label?: Label } | null>(null);
  const q = normalize(query.trim());

  return (
    <Popover onOpenChange={(o) => !o && (setEditing(null), setQuery(""))}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0">
        {editing ? (
          <div className="p-3">
            <LabelEditor
              label={editing.label}
              family={editing.family}
              onDone={(created) => {
                if (created) onChange([...selected, created.id]);
                setEditing(null);
              }}
            />
          </div>
        ) : (
          <>
            <div className="relative border-b p-2">
              <Search className="pointer-events-none absolute left-4 top-[17px] h-3.5 w-3.5 text-muted-foreground" />
              <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher une étiquette" aria-label="Rechercher une étiquette" className="h-8 w-full rounded-md bg-muted pl-7 pr-2 text-[13px] outline-none" />
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-2 scrollbar-thin">
              {LABEL_FAMILIES.map((fam) => {
                const items = labels.filter((l) => l.family === fam && (!q || normalize(l.name).includes(q)));
                if (!items.length && q) return null;
                return (
                  <div key={fam} className="mb-2">
                    <div className="flex items-center justify-between px-1 pb-1">
                      <span className="text-[11px] font-medium text-muted-foreground">{LABEL_FAMILY_LABELS[fam]}</span>
                      <button type="button" onClick={() => setEditing({ family: fam })} className="grid h-5 w-5 place-items-center rounded text-muted-foreground hover:bg-accent" aria-label={`Nouvelle étiquette ${LABEL_FAMILY_LABELS[fam]}`}>
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    {items.map((l) => {
                      const on = selected.includes(l.id);
                      return (
                        <div key={l.id} className="group flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onChange(on ? selected.filter((x) => x !== l.id) : [...selected, l.id])}
                            className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded px-1 hover:bg-accent"
                            aria-pressed={on}
                          >
                            <span className={`grid h-4 w-4 shrink-0 place-items-center rounded border ${on ? "border-primary bg-primary text-primary-foreground" : "border-input"}`}>{on && <Check className="h-3 w-3" />}</span>
                            <span className="flex h-6 min-w-0 flex-1 items-center truncate rounded px-2 text-[12px] font-medium text-white" style={{ backgroundColor: l.color }}>
                              {l.name}
                            </span>
                          </button>
                          <button type="button" onClick={() => setEditing({ family: fam, label: l })} className="grid h-7 w-7 place-items-center rounded text-muted-foreground opacity-0 hover:bg-accent group-hover:opacity-100 focus-visible:opacity-100" aria-label={`Modifier ${l.name}`}>
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
