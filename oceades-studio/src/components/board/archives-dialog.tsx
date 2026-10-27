"use client";

import * as React from "react";
import { toast } from "sonner";
import { RotateCcw, Trash2 } from "lucide-react";
import { useData } from "@/lib/client/store";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Segmented } from "@/components/ui/misc";
import { fmt } from "@/lib/dates";

/** Éléments archivés : restauration, ou suppression définitive avec confirmation. */
export function ArchivesDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { cards, lists, boards, updateCard, deleteCard, updateList, deleteList, updateBoard, deleteBoard, selectBoard } = useData();
  const [tab, setTab] = React.useState<"cartes" | "listes" | "tableaux">("cartes");
  const archivedCards = cards.filter((c) => c.archivedAt).sort((a, b) => b.archivedAt!.localeCompare(a.archivedAt!));
  const archivedLists = lists.filter((l) => l.archivedAt);
  const archivedBoards = boards.filter((b) => b.archivedAt);

  const rows =
    tab === "cartes"
      ? archivedCards.map((c) => ({
          id: c.id,
          name: c.title,
          meta: lists.find((l) => l.id === c.listId)?.name ?? "",
          when: c.archivedAt!,
          restore: () => updateCard(c.id, { archived: false }),
          remove: () => deleteCard(c.id),
        }))
      : tab === "listes"
        ? archivedLists.map((l) => ({
            id: l.id,
            name: l.name,
            meta: `${cards.filter((c) => c.listId === l.id).length} carte(s)`,
            when: l.archivedAt!,
            restore: () => updateList(l.id, { archived: false }),
            remove: () => deleteList(l.id),
          }))
        : archivedBoards.map((b) => ({
            id: b.id,
            name: b.name,
            meta: "",
            when: b.archivedAt!,
            restore: async () => {
              const r = await updateBoard(b.id, { archived: false });
              if (r) await selectBoard(b.id);
              return r;
            },
            remove: () => deleteBoard(b.id),
          }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Éléments archivés</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 overflow-hidden p-5">
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: "cartes", label: `Cartes (${archivedCards.length})` },
              { value: "listes", label: `Listes (${archivedLists.length})` },
              { value: "tableaux", label: `Tableaux (${archivedBoards.length})` },
            ]}
            className="self-start"
          />
          <div className="flex max-h-[50vh] flex-col divide-y overflow-y-auto rounded-lg border scrollbar-thin">
            {rows.map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{r.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {r.meta}
                    {r.meta && " · "}archivé le {fmt(new Date(r.when), "d MMM yyyy")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => (await r.restore()) && toast.success("Restauré")}
                  className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                  aria-label={`Restaurer ${r.name}`}
                  title="Restaurer"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!window.confirm(`Supprimer définitivement « ${r.name} » ? Cette action est irréversible.`)) return;
                    if (await r.remove()) toast.success("Supprimé définitivement");
                  }}
                  className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label={`Supprimer définitivement ${r.name}`}
                  title="Supprimer définitivement"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            {!rows.length && <p className="px-3 py-8 text-center text-sm text-muted-foreground">Rien d'archivé.</p>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
