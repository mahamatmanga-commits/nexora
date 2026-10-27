"use client";

import * as React from "react";
import { toast } from "sonner";
import type { Board, BoardData, BoardList, Campaign, Card, ChecklistItem, Label, MediaItem, Member, Settings } from "@/lib/domain/types";
import type { CampaignInput, CampaignPatch, CardInput, CardPatch, MediaPatch } from "@/lib/domain/schemas";
import type { LabelFamily, ListKind } from "@/lib/domain/constants";
import { api, uploadFile } from "./api";

interface AiStatus {
  enabled: boolean;
  model: string | null;
}

const BOARD_KEY = "oceades.board";

function fail(error: unknown) {
  toast.error(error instanceof Error ? error.message : "Une erreur est survenue.");
}

/** Exécute une requête ; en cas d'échec, affiche l'erreur et renvoie null. */
async function attempt<T>(fn: () => Promise<T>, rollback?: () => void): Promise<T | null> {
  try {
    return await fn();
  } catch (e) {
    rollback?.();
    fail(e);
    return null;
  }
}

const byPosition = <T extends { position: number }>(a: T, b: T) => a.position - b.position;

function useStoreValue() {
  const [ready, setReady] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [boards, setBoards] = React.useState<Board[]>([]);
  const [boardId, setBoardId] = React.useState<string | null>(null);
  const [lists, setLists] = React.useState<BoardList[]>([]);
  const [cards, setCards] = React.useState<Card[]>([]);
  const [labels, setLabels] = React.useState<Label[]>([]);
  const [members, setMembers] = React.useState<Member[]>([]);
  const [campaigns, setCampaigns] = React.useState<Campaign[]>([]);
  const [media, setMedia] = React.useState<MediaItem[]>([]);
  const [settings, setSettings] = React.useState<Settings | null>(null);
  const [ai, setAi] = React.useState<AiStatus>({ enabled: false, model: null });
  const cardsRef = React.useRef(cards);
  cardsRef.current = cards;
  const listsRef = React.useRef(lists);
  listsRef.current = lists;

  const applyBoard = React.useCallback((data: BoardData) => {
    setBoardId(data.board.id);
    setLists([...data.lists].sort(byPosition));
    setCards([...data.cards].sort(byPosition));
    setBoards((prev) => (prev.some((b) => b.id === data.board.id) ? prev.map((b) => (b.id === data.board.id ? data.board : b)) : [...prev, data.board]));
    try {
      localStorage.setItem(BOARD_KEY, data.board.id);
    } catch {}
  }, []);

  const loadBoard = React.useCallback(async (id: string) => applyBoard(await api<BoardData>(`/api/boards/${id}`)), [applyBoard]);

  const reload = React.useCallback(async () => {
    try {
      const [b, l, m, c, me, s, a] = await Promise.all([
        api<Board[]>("/api/boards"),
        api<Label[]>("/api/labels"),
        api<Member[]>("/api/members"),
        api<Campaign[]>("/api/campaigns"),
        api<MediaItem[]>("/api/media"),
        api<Settings>("/api/settings"),
        api<AiStatus>("/api/ai/status"),
      ]);
      setBoards(b);
      setLabels(l);
      setMembers(m);
      setCampaigns(c);
      setMedia(me);
      setSettings(s);
      setAi(a);
      let target: string | null = null;
      try {
        target = localStorage.getItem(BOARD_KEY);
      } catch {}
      const active = b.filter((x) => !x.archivedAt);
      if (!target || !active.some((x) => x.id === target)) target = active[0]?.id ?? null;
      if (target) await loadBoard(target);
      else {
        // Aucun tableau : on crée le tableau éditorial par défaut.
        applyBoard(await api<BoardData>("/api/boards", { method: "POST", json: { name: "Planning éditorial Océades", background: "#203849" } }));
      }
      setLoadError(null);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Chargement impossible.");
    } finally {
      setReady(true);
    }
  }, [applyBoard, loadBoard]);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  const upsertCard = React.useCallback((card: Card) => {
    setCards((prev) => {
      if (card.boardId !== boardIdRef.current) return prev.filter((c) => c.id !== card.id);
      const exists = prev.some((c) => c.id === card.id);
      return (exists ? prev.map((c) => (c.id === card.id ? card : c)) : [...prev, card]).sort(byPosition);
    });
  }, []);
  const boardIdRef = React.useRef(boardId);
  boardIdRef.current = boardId;

  const patchCardLocal = (id: string, patch: Partial<Card>) =>
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)).sort(byPosition));

  const board = boards.find((b) => b.id === boardId) ?? null;

  return {
    ready,
    loadError,
    reload,
    board,
    boards,
    lists,
    cards,
    labels,
    members,
    campaigns,
    media,
    settings,
    ai,

    /* ----- Tableaux ----- */
    selectBoard: (id: string) => attempt(() => loadBoard(id)),
    async createBoard(name: string, background: string) {
      const data = await attempt(() => api<BoardData>("/api/boards", { method: "POST", json: { name, background } }));
      if (data) applyBoard(data);
      return data;
    },
    async updateBoard(id: string, patch: { name?: string; background?: string; archived?: boolean }) {
      const b = await attempt(() => api<Board>(`/api/boards/${id}`, { method: "PATCH", json: patch }));
      if (b) {
        setBoards((prev) => prev.map((x) => (x.id === id ? b : x)));
        if (patch.archived && id === boardId) {
          const next = boards.find((x) => x.id !== id && !x.archivedAt);
          if (next) await loadBoard(next.id);
        }
      }
      return b;
    },
    async duplicateBoard(id: string) {
      const data = await attempt(() => api<BoardData>(`/api/boards/${id}/duplicate`, { method: "POST" }));
      if (data) applyBoard(data);
      return data;
    },
    async deleteBoard(id: string) {
      const ok = await attempt(() => api(`/api/boards/${id}`, { method: "DELETE" }));
      if (ok !== null) setBoards((prev) => prev.filter((b) => b.id !== id));
      return ok !== null;
    },
    refreshBoard: () => (boardId ? attempt(() => loadBoard(boardId)) : Promise.resolve(null)),

    /* ----- Listes ----- */
    async createList(input: { name: string; kind?: ListKind; weekStart?: string | null; color?: string | null; position?: number }) {
      if (!boardId) return null;
      const list = await attempt(() => api<BoardList>("/api/lists", { method: "POST", json: { boardId, ...input } }));
      if (list) setLists((prev) => [...prev, list].sort(byPosition));
      return list;
    },
    async updateList(id: string, patch: { name?: string; color?: string | null; position?: number; archived?: boolean; kind?: ListKind; weekStart?: string | null }) {
      const before = listsRef.current;
      setLists((prev) =>
        prev
          .map((l) => (l.id === id ? { ...l, ...patch, archivedAt: patch.archived === undefined ? l.archivedAt : patch.archived ? new Date().toISOString() : null } : l))
          .sort(byPosition),
      );
      return attempt(
        () => api<BoardList>(`/api/lists/${id}`, { method: "PATCH", json: patch }),
        () => setLists(before),
      );
    },
    async duplicateList(id: string) {
      const res = await attempt(() => api<{ list: BoardList; cards: Card[] }>(`/api/lists/${id}/duplicate`, { method: "POST" }));
      if (res) {
        setLists((prev) => [...prev, res.list].sort(byPosition));
        setCards((prev) => [...prev, ...res.cards].sort(byPosition));
      }
      return res;
    },
    async deleteList(id: string) {
      const ok = await attempt(() => api(`/api/lists/${id}`, { method: "DELETE" }));
      if (ok !== null) {
        setLists((prev) => prev.filter((l) => l.id !== id));
        setCards((prev) => prev.filter((c) => c.listId !== id));
      }
      return ok !== null;
    },

    /* ----- Cartes ----- */
    async createCard(input: CardInput) {
      const card = await attempt(() => api<Card>("/api/cards", { method: "POST", json: input }));
      if (card) upsertCard(card);
      return card;
    },
    async createCards(inputs: CardInput[]) {
      const created = await attempt(() => api<Card[]>("/api/cards", { method: "POST", json: inputs }));
      if (created) created.forEach(upsertCard);
      return created;
    },
    /** Mise à jour optimiste ; le serveur fait foi au retour. */
    async updateCard(id: string, patch: CardPatch) {
      const before = cardsRef.current.find((c) => c.id === id);
      const { archived, ...rest } = patch;
      patchCardLocal(id, { ...rest, ...(archived !== undefined && { archivedAt: archived ? new Date().toISOString() : null }) } as Partial<Card>);
      const card = await attempt(
        () => api<Card>(`/api/cards/${id}`, { method: "PATCH", json: patch }),
        () => before && patchCardLocal(id, before),
      );
      if (card) upsertCard(card);
      return card;
    },
    async duplicateCard(id: string) {
      const card = await attempt(() => api<Card>(`/api/cards/${id}/duplicate`, { method: "POST" }));
      if (card) upsertCard(card);
      return card;
    },
    async declineCard(id: string, body: { title: string; labelIds: string[]; brief?: string }) {
      const card = await attempt(() => api<Card>(`/api/cards/${id}/decline`, { method: "POST", json: body }));
      if (card) upsertCard(card);
      return card;
    },
    async deleteCard(id: string) {
      const ok = await attempt(() => api(`/api/cards/${id}`, { method: "DELETE" }));
      if (ok !== null) setCards((prev) => prev.filter((c) => c.id !== id));
      return ok !== null;
    },
    async addChecklistItem(cardId: string, text: string) {
      const item = await attempt(() => api<ChecklistItem>(`/api/cards/${cardId}/checklist`, { method: "POST", json: { text } }));
      if (item) setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, checklist: [...c.checklist, item] } : c)));
      return item;
    },
    async updateChecklistItem(cardId: string, itemId: string, patch: { text?: string; done?: boolean; position?: number }) {
      const before = cardsRef.current.find((c) => c.id === cardId)?.checklist;
      const apply = (list: ChecklistItem[]) => list.map((i) => (i.id === itemId ? { ...i, ...patch } : i)).sort(byPosition);
      setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, checklist: apply(c.checklist) } : c)));
      return attempt(
        () => api<ChecklistItem>(`/api/checklist/${itemId}`, { method: "PATCH", json: patch }),
        () => before && setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, checklist: before } : c))),
      );
    },
    async deleteChecklistItem(cardId: string, itemId: string) {
      const before = cardsRef.current.find((c) => c.id === cardId)?.checklist;
      setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, checklist: c.checklist.filter((i) => i.id !== itemId) } : c)));
      return attempt(
        () => api(`/api/checklist/${itemId}`, { method: "DELETE" }),
        () => before && setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, checklist: before } : c))),
      );
    },
    bumpComments: (cardId: string, delta: number) =>
      setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, commentCount: Math.max(0, c.commentCount + delta) } : c))),

    /* ----- Étiquettes, membres, paramètres ----- */
    async createLabel(family: LabelFamily, name: string, color: string) {
      const l = await attempt(() => api<Label>("/api/labels", { method: "POST", json: { family, name, color } }));
      if (l) setLabels((prev) => [...prev, l]);
      return l;
    },
    async updateLabel(id: string, patch: { name?: string; color?: string }) {
      const l = await attempt(() => api<Label>(`/api/labels/${id}`, { method: "PATCH", json: patch }));
      if (l) setLabels((prev) => prev.map((x) => (x.id === id ? l : x)));
      return l;
    },
    async deleteLabel(id: string) {
      const ok = await attempt(() => api(`/api/labels/${id}`, { method: "DELETE" }));
      if (ok !== null) {
        setLabels((prev) => prev.filter((l) => l.id !== id));
        setCards((prev) => prev.map((c) => ({ ...c, labelIds: c.labelIds.filter((l) => l !== id) })));
      }
      return ok !== null;
    },
    async createMember(name: string) {
      const m = await attempt(() => api<Member>("/api/members", { method: "POST", json: { name } }));
      if (m) setMembers((prev) => [...prev, m].sort((a, b) => a.name.localeCompare(b.name)));
      return m;
    },
    async deleteMember(id: string) {
      const ok = await attempt(() => api(`/api/members/${id}`, { method: "DELETE" }));
      if (ok !== null) {
        setMembers((prev) => prev.filter((m) => m.id !== id));
        setCards((prev) => prev.map((c) => (c.assigneeId === id ? { ...c, assigneeId: null } : c)));
      }
      return ok !== null;
    },
    async saveSettings(next: Settings) {
      const s = await attempt(() => api<Settings>("/api/settings", { method: "PUT", json: next }));
      if (s) setSettings(s);
      return s;
    },

    /* ----- Campagnes ----- */
    async createCampaign(input: CampaignInput) {
      const c = await attempt(() => api<Campaign>("/api/campaigns", { method: "POST", json: input }));
      if (c) setCampaigns((prev) => [...prev, c].sort((a, b) => a.startDate.localeCompare(b.startDate)));
      return c;
    },
    async updateCampaign(id: string, patch: CampaignPatch) {
      const c = await attempt(() => api<Campaign>(`/api/campaigns/${id}`, { method: "PATCH", json: patch }));
      if (c) setCampaigns((prev) => prev.map((x) => (x.id === id ? c : x)).sort((a, b) => a.startDate.localeCompare(b.startDate)));
      return c;
    },
    async deleteCampaign(id: string) {
      const ok = await attempt(() => api(`/api/campaigns/${id}`, { method: "DELETE" }));
      if (ok !== null) {
        setCampaigns((prev) => prev.filter((c) => c.id !== id));
        setCards((prev) => prev.map((c) => (c.campaignId === id ? { ...c, campaignId: null } : c)));
      }
      return ok !== null;
    },

    /* ----- Médias ----- */
    async uploadMedia(file: File, params: Record<string, string> = {}, onProgress?: (r: number) => void) {
      const item = await attempt(() => uploadFile<MediaItem>(file, params, onProgress));
      if (item) setMedia((prev) => [item, ...prev]);
      return item;
    },
    async updateMedia(id: string, patch: MediaPatch) {
      const item = await attempt(() => api<MediaItem>(`/api/media/${id}`, { method: "PATCH", json: patch }));
      if (item) setMedia((prev) => prev.map((m) => (m.id === id ? item : m)));
      return item;
    },
    async deleteMedia(id: string) {
      const ok = await attempt(() => api(`/api/media/${id}`, { method: "DELETE" }));
      if (ok !== null) {
        setMedia((prev) => prev.filter((m) => m.id !== id));
        setCards((prev) => prev.map((c) => ({ ...c, attachmentIds: c.attachmentIds.filter((m) => m !== id), coverMediaId: c.coverMediaId === id ? null : c.coverMediaId })));
      }
      return ok !== null;
    },
  };
}

export type Store = ReturnType<typeof useStoreValue>;
const StoreContext = React.createContext<Store | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const value = useStoreValue();
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useData(): Store {
  const ctx = React.useContext(StoreContext);
  if (!ctx) throw new Error("useData doit être utilisé dans <DataProvider>");
  return ctx;
}

/** Index pratiques dérivés du store. */
export function useIndexes() {
  const { labels, members, campaigns, media, lists } = useData();
  return React.useMemo(
    () => ({
      labelById: new Map(labels.map((l) => [l.id, l])),
      memberById: new Map(members.map((m) => [m.id, m])),
      campaignById: new Map(campaigns.map((c) => [c.id, c])),
      mediaById: new Map(media.map((m) => [m.id, m])),
      listById: new Map(lists.map((l) => [l.id, l])),
    }),
    [labels, members, campaigns, media, lists],
  );
}

export function mediaUrl(id: string) {
  return `/api/media/${id}/file`;
}
