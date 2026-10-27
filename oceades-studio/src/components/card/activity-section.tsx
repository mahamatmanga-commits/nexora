"use client";

import * as React from "react";
import { History, MessageSquare, Trash2 } from "lucide-react";
import type { CardEvent, Comment } from "@/lib/domain/types";
import { api, currentAuthor } from "@/lib/client/api";
import { useData } from "@/lib/client/store";
import { initials } from "@/lib/cards";
import { fmt } from "@/lib/dates";
import { AutoTextarea, SectionTitle } from "./fields";

const EVENT_TEXT: Record<string, (d: string) => string> = {
  created: () => "a créé la carte",
  moved: (d) => `a déplacé la carte ${d}`,
  status: (d) => `a changé le statut : ${d}`,
  date: (d) => (d === "date retirée" ? "a retiré la date de publication" : `a programmé la publication le ${fmt(new Date(d), "d MMM yyyy 'à' HH:mm")}`),
  edited: (d) => `a modifié ${d}`,
  archived: () => "a archivé la carte",
  restored: () => "a restauré la carte",
  checked: (d) => `a coché « ${d} »`,
  unchecked: (d) => `a décoché « ${d} »`,
  declined: (d) => `a créé la déclinaison « ${d} »`,
};

function when(iso: string) {
  return fmt(new Date(iso), "d MMM 'à' HH:mm");
}

function Initials({ name }: { name: string }) {
  return <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">{initials(name) || "?"}</span>;
}

/** Commentaires et historique des modifications (historique masqué par défaut). */
export function ActivitySection({ cardId }: { cardId: string }) {
  const { bumpComments, cards } = useData();
  const [comments, setComments] = React.useState<Comment[]>([]);
  const [events, setEvents] = React.useState<CardEvent[] | null>(null);
  const [showHistory, setShowHistory] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const updatedAt = cards.find((c) => c.id === cardId)?.updatedAt;

  React.useEffect(() => {
    void api<Comment[]>(`/api/cards/${cardId}/comments`).then(setComments).catch(() => {});
  }, [cardId]);
  React.useEffect(() => {
    if (showHistory) void api<CardEvent[]>(`/api/cards/${cardId}/history`).then(setEvents).catch(() => {});
  }, [cardId, showHistory, updatedAt]);

  async function send() {
    const body = draft.trim();
    if (!body) return;
    setSending(true);
    try {
      const c = await api<Comment>(`/api/cards/${cardId}/comments`, { method: "POST", json: { body } });
      setComments((prev) => [c, ...prev]);
      bumpComments(cardId, 1);
      setDraft("");
    } finally {
      setSending(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Supprimer ce commentaire ?")) return;
    await api(`/api/comments/${id}`, { method: "DELETE" });
    setComments((prev) => prev.filter((c) => c.id !== id));
    bumpComments(cardId, -1);
  }

  type Item = { kind: "comment"; at: string; c: Comment } | { kind: "event"; at: string; e: CardEvent };
  const items: Item[] = [
    ...comments.map((c) => ({ kind: "comment" as const, at: c.createdAt, c })),
    ...(showHistory && events ? events.map((e) => ({ kind: "event" as const, at: e.createdAt, e })) : []),
  ].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <section>
      <SectionTitle
        icon={<MessageSquare />}
        action={
          <button type="button" onClick={() => setShowHistory((v) => !v)} className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[12px] text-muted-foreground hover:bg-accent hover:text-foreground" aria-pressed={showHistory}>
            <History className="h-3.5 w-3.5" /> {showHistory ? "Masquer l'historique" : "Historique"}
          </button>
        }
      >
        Commentaires
      </SectionTitle>
      <div className="flex gap-2.5">
        <Initials name={currentAuthor() || "Équipe"} />
        <div className="flex-1">
          <AutoTextarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void send();
            }}
            minRows={1}
            placeholder="Écrire un commentaire…"
            aria-label="Nouveau commentaire"
          />
          {draft.trim() && (
            <button type="button" onClick={send} disabled={sending} className="mt-1.5 h-8 rounded-md bg-primary px-3 text-[13px] font-medium text-primary-foreground disabled:opacity-50">
              Enregistrer
            </button>
          )}
        </div>
      </div>
      <ul className="mt-3 flex flex-col gap-3">
        {items.map((it) =>
          it.kind === "comment" ? (
            <li key={it.c.id} className="group flex gap-2.5">
              <Initials name={it.c.author} />
              <div className="min-w-0 flex-1">
                <p className="text-[12px]">
                  <span className="font-semibold">{it.c.author}</span> <span className="text-muted-foreground">{when(it.c.createdAt)}</span>
                </p>
                <p className="mt-1 whitespace-pre-wrap rounded-md bg-muted/60 px-3 py-2 text-[13px]">{it.c.body}</p>
              </div>
              <button type="button" onClick={() => remove(it.c.id)} className="grid h-7 w-7 place-items-center self-start rounded text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100" aria-label="Supprimer le commentaire">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ) : (
            <li key={it.e.id} className="flex gap-2.5 text-[12.5px] text-muted-foreground">
              <Initials name={it.e.author} />
              <p className="pt-1">
                <span className="font-medium text-foreground">{it.e.author}</span> {(EVENT_TEXT[it.e.type] ?? ((d: string) => d))(it.e.detail)} · {when(it.e.createdAt)}
              </p>
            </li>
          ),
        )}
      </ul>
    </section>
  );
}
