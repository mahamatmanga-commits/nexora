"use client";

import * as React from "react";
import { CheckSquare, ListRestart, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import type { Card } from "@/lib/domain/types";
import { useData } from "@/lib/client/store";
import { checklistProgress } from "@/lib/cards";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { SectionTitle } from "./fields";

export function ChecklistSection({ card }: { card: Card }) {
  const { addChecklistItem, updateChecklistItem, deleteChecklistItem, settings } = useData();
  const [hideDone, setHideDone] = React.useState(false);
  const [adding, setAdding] = React.useState(false);
  const [text, setText] = React.useState("");
  const [editing, setEditing] = React.useState<string | null>(null);
  const progress = checklistProgress(card);
  const items = hideDone ? card.checklist.filter((i) => !i.done) : card.checklist;

  async function add() {
    const t = text.trim();
    if (!t) return setAdding(false);
    setText("");
    await addChecklistItem(card.id, t);
  }

  async function applyDefault() {
    const existing = new Set(card.checklist.map((c) => c.text.toLowerCase()));
    for (const t of settings?.defaultChecklist ?? []) if (!existing.has(t.toLowerCase())) await addChecklistItem(card.id, t);
  }

  return (
    <section>
      <SectionTitle
        icon={<CheckSquare />}
        action={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-accent" aria-label="Options de la checklist">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setHideDone((v) => !v)}>{hideDone ? "Afficher les éléments cochés" : "Masquer les éléments cochés"}</DropdownMenuItem>
              <DropdownMenuItem onSelect={applyDefault}>
                <ListRestart /> Compléter avec la checklist type
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      >
        Checklist
      </SectionTitle>
      {progress.total > 0 && (
        <div className="mb-2 flex items-center gap-2">
          <span className="w-8 text-right text-[11px] tabular text-muted-foreground">{Math.round(progress.ratio * 100)} %</span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div className={cn("h-full rounded-full transition-all duration-500", progress.ratio === 1 ? "bg-[#4bce97]" : "bg-primary")} style={{ width: `${progress.ratio * 100}%` }} />
          </div>
        </div>
      )}
      <ul className="flex flex-col">
        {items.map((item) => (
          <li key={item.id} className="group flex min-h-8 items-center gap-2.5 rounded-md px-1 hover:bg-muted/60">
            <Checkbox checked={item.done} onCheckedChange={(v) => updateChecklistItem(card.id, item.id, { done: v === true })} aria-label={item.text} className="ml-1" />
            {editing === item.id ? (
              <input
                autoFocus
                defaultValue={item.text}
                onBlur={(e) => {
                  setEditing(null);
                  const v = e.target.value.trim();
                  if (v && v !== item.text) void updateChecklistItem(card.id, item.id, { text: v });
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                  if (e.key === "Escape") setEditing(null);
                }}
                className="h-7 flex-1 rounded border bg-card px-2 text-[13px] outline-none"
                aria-label="Modifier l'élément"
              />
            ) : (
              <button type="button" onClick={() => setEditing(item.id)} className={cn("flex-1 py-1 text-left text-[13px]", item.done && "text-muted-foreground line-through")}>
                {item.text}
              </button>
            )}
            <button type="button" onClick={() => deleteChecklistItem(card.id, item.id)} className="grid h-6 w-6 place-items-center rounded text-muted-foreground opacity-0 hover:bg-accent hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100" aria-label={`Supprimer ${item.text}`}>
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>
      {adding ? (
        <div className="mt-1 flex items-center gap-1.5 pl-1">
          <input
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void add();
              if (e.key === "Escape") setAdding(false);
            }}
            onBlur={() => !text.trim() && setAdding(false)}
            placeholder="Nouvel élément"
            aria-label="Nouvel élément de checklist"
            className="h-8 flex-1 rounded-md border bg-card px-2.5 text-[13px] outline-none focus:ring-2 focus:ring-ring/40"
          />
        </div>
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="mt-1 inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-[13px] text-muted-foreground hover:bg-accent hover:text-foreground">
          <Plus className="h-4 w-4" /> Ajouter un élément
        </button>
      )}
    </section>
  );
}
