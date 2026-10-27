"use client";

import * as React from "react";
import { toast } from "sonner";
import { Archive, ArchiveRestore, Check, ChevronDown, Copy, Download, Kanban, MoreHorizontal, Paintbrush, Pencil, Plus, Tag, Tags } from "lucide-react";
import { BOARD_BACKGROUNDS } from "@/lib/domain/constants";
import { useData } from "@/lib/client/store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { LabelsManager } from "./labels-manager";
import { ArchivesDialog } from "./archives-dialog";

export function BoardSwitcher() {
  const { board, boards, selectBoard } = useData();
  const [creating, setCreating] = React.useState(false);
  const active = boards.filter((b) => !b.archivedAt);
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className="inline-flex h-8 min-w-0 max-w-[60vw] items-center gap-1.5 rounded-md px-2 text-[15px] font-semibold text-white hover:bg-white/15">
            <span className="truncate">{board?.name}</span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-70" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel>Tableaux</DropdownMenuLabel>
          {active.map((b) => (
            <DropdownMenuItem key={b.id} onSelect={() => b.id !== board?.id && selectBoard(b.id)}>
              <span className="h-4 w-6 shrink-0 rounded" style={{ backgroundColor: b.background }} />
              <span className="flex-1 truncate">{b.name}</span>
              {b.id === board?.id && <Check className="!text-foreground" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setCreating(true)}>
            <Plus /> Nouveau tableau
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {creating && <BoardDialog onClose={() => setCreating(false)} />}
    </>
  );
}

/** Création ou modification d'un tableau (nom + fond). */
function BoardDialog({ onClose, editId }: { onClose: () => void; editId?: string }) {
  const { boards, createBoard, updateBoard } = useData();
  const existing = editId ? boards.find((b) => b.id === editId) : undefined;
  const [name, setName] = React.useState(existing?.name ?? "");
  const [bg, setBg] = React.useState(existing?.background ?? BOARD_BACKGROUNDS[0].color);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const ok = existing ? await updateBoard(existing.id, { name: name.trim(), background: bg }) : await createBoard(name.trim(), bg);
    if (ok) onClose();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>{existing ? "Modifier le tableau" : "Nouveau tableau"}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 p-5">
            <div className="h-20 rounded-lg p-3" style={{ backgroundColor: bg }}>
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-10 w-12 rounded bg-black/25" />
                ))}
              </div>
            </div>
            <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom du tableau" aria-label="Nom du tableau" />
            <div className="grid grid-cols-8 gap-1.5" role="radiogroup" aria-label="Fond">
              {BOARD_BACKGROUNDS.map((b) => (
                <button
                  key={b.color}
                  type="button"
                  role="radio"
                  aria-checked={bg === b.color}
                  title={b.name}
                  onClick={() => setBg(b.color)}
                  className={cn("h-7 rounded ring-offset-2 ring-offset-card", bg === b.color && "ring-2 ring-ring")}
                  style={{ backgroundColor: b.color }}
                />
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              {existing ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function BoardMenu({ compactLabels, onToggleLabels }: { compactLabels: boolean; onToggleLabels: () => void }) {
  const { board, updateBoard, duplicateBoard, boards } = useData();
  const [dialog, setDialog] = React.useState<"edit" | "labels" | "archives" | null>(null);
  if (!board) return null;
  const others = boards.filter((b) => !b.archivedAt && b.id !== board.id);

  async function archive() {
    if (!others.length) return toast.error("Impossible d'archiver le dernier tableau actif.");
    if (!window.confirm(`Archiver « ${board!.name} » ? Il restera récupérable depuis les éléments archivés.`)) return;
    const id = board!.id;
    if (await updateBoard(id, { archived: true })) toast("Tableau archivé", { action: { label: "Annuler", onClick: () => void updateBoard(id, { archived: false }) } });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className="grid h-8 w-8 place-items-center rounded-md text-white/85 hover:bg-white/15" aria-label="Menu du tableau">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuItem onSelect={() => setDialog("edit")}>
            <Pencil /> Renommer
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Paintbrush /> Fond
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="p-2">
              <div className="grid grid-cols-4 gap-1.5">
                {BOARD_BACKGROUNDS.map((b) => (
                  <DropdownMenuItem key={b.color} className="h-8 w-12 p-0" onSelect={() => updateBoard(board.id, { background: b.color })} aria-label={b.name}>
                    <span className={cn("h-full w-full rounded", board.background === b.color && "ring-2 ring-ring")} style={{ backgroundColor: b.color }} />
                  </DropdownMenuItem>
                ))}
              </div>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuItem onSelect={() => setDialog("labels")}>
            <Tags /> Étiquettes
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onToggleLabels}>
            <Tag /> {compactLabels ? "Afficher le texte des étiquettes" : "Étiquettes compactes"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setDialog("archives")}>
            <ArchiveRestore /> Éléments archivés
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => duplicateBoard(board.id).then((d) => d && toast.success("Tableau dupliqué"))}>
            <Copy /> Dupliquer le tableau
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href={`/api/export?board=${board.id}`}>
              <Download /> Exporter en CSV
            </a>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={archive}>
            <Archive /> Archiver le tableau
          </DropdownMenuItem>
          {others.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="flex items-center gap-1.5">
                <Kanban className="h-3.5 w-3.5" /> {boards.filter((b) => !b.archivedAt).length} tableaux actifs
              </DropdownMenuLabel>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {dialog === "edit" && <BoardDialog editId={board.id} onClose={() => setDialog(null)} />}
      {dialog === "labels" && <LabelsManager open onOpenChange={(o) => !o && setDialog(null)} />}
      {dialog === "archives" && <ArchivesDialog open onOpenChange={(o) => !o && setDialog(null)} />}
    </>
  );
}
