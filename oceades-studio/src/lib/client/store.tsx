"use client";

import * as React from "react";
import { toast } from "sonner";
import type { Campaign, MediaItem, Post } from "@/lib/domain/types";
import type { CampaignInput, CampaignPatch, MediaPatch, PostInput, PostPatch } from "@/lib/domain/schemas";
import { api, uploadFile } from "./api";

interface AiStatus {
  enabled: boolean;
  model: string | null;
}

interface DataContextValue {
  ready: boolean;
  loadError: string | null;
  posts: Post[];
  campaigns: Campaign[];
  media: MediaItem[];
  ai: AiStatus;
  reload: () => Promise<void>;
  createPost: (input: PostInput) => Promise<Post | null>;
  createPosts: (inputs: PostInput[]) => Promise<Post[] | null>;
  updatePost: (id: string, patch: PostPatch, opts?: { silent?: boolean }) => Promise<Post | null>;
  duplicatePost: (id: string, scheduledAt?: string | null) => Promise<Post | null>;
  deletePost: (id: string) => Promise<boolean>;
  createCampaign: (input: CampaignInput) => Promise<Campaign | null>;
  updateCampaign: (id: string, patch: CampaignPatch) => Promise<Campaign | null>;
  deleteCampaign: (id: string) => Promise<boolean>;
  uploadMedia: (file: File, params?: Record<string, string>, onProgress?: (r: number) => void) => Promise<MediaItem | null>;
  updateMedia: (id: string, patch: MediaPatch) => Promise<MediaItem | null>;
  deleteMedia: (id: string) => Promise<boolean>;
}

const DataContext = React.createContext<DataContextValue | null>(null);

function fail(error: unknown) {
  toast.error(error instanceof Error ? error.message : "Une erreur est survenue.");
}

const sortPosts = (posts: Post[]) =>
  [...posts].sort((a, b) => {
    if (!a.scheduledAt && !b.scheduledAt) return a.createdAt.localeCompare(b.createdAt);
    if (!a.scheduledAt) return 1;
    if (!b.scheduledAt) return -1;
    return a.scheduledAt.localeCompare(b.scheduledAt);
  });

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [posts, setPosts] = React.useState<Post[]>([]);
  const [campaigns, setCampaigns] = React.useState<Campaign[]>([]);
  const [media, setMedia] = React.useState<MediaItem[]>([]);
  const [ai, setAi] = React.useState<AiStatus>({ enabled: false, model: null });
  const [ready, setReady] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const reload = React.useCallback(async () => {
    try {
      const [p, c, m, s] = await Promise.all([
        api<Post[]>("/api/posts"),
        api<Campaign[]>("/api/campaigns"),
        api<MediaItem[]>("/api/media"),
        api<AiStatus>("/api/ai/status"),
      ]);
      setPosts(p);
      setCampaigns(c);
      setMedia(m);
      setAi(s);
      setLoadError(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Chargement impossible.");
    } finally {
      setReady(true);
    }
  }, []);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  const upsertPost = (post: Post) =>
    setPosts((prev) => sortPosts(prev.some((p) => p.id === post.id) ? prev.map((p) => (p.id === post.id ? post : p)) : [...prev, post]));

  const value: DataContextValue = {
    ready,
    loadError,
    posts,
    campaigns,
    media,
    ai,
    reload,
    async createPost(input) {
      try {
        const post = await api<Post>("/api/posts", { method: "POST", json: input });
        upsertPost(post);
        return post;
      } catch (e) {
        fail(e);
        return null;
      }
    },
    async createPosts(inputs) {
      try {
        const created = await api<Post[]>("/api/posts/bulk", { method: "POST", json: inputs });
        setPosts((prev) => sortPosts([...prev, ...created]));
        return created;
      } catch (e) {
        fail(e);
        return null;
      }
    },
    async updatePost(id, patch) {
      // Mise à jour optimiste (glisser-déposer instantané), annulée en cas d'erreur.
      const previous = posts;
      setPosts((prev) => sortPosts(prev.map((p) => (p.id === id ? { ...p, ...patch, checklist: patch.checklist ?? p.checklist } : p))));
      try {
        const post = await api<Post>(`/api/posts/${id}`, { method: "PATCH", json: patch });
        upsertPost(post);
        return post;
      } catch (e) {
        setPosts(previous);
        fail(e);
        return null;
      }
    },
    async duplicatePost(id, scheduledAt) {
      try {
        const post = await api<Post>(`/api/posts/${id}/duplicate`, {
          method: "POST",
          json: scheduledAt === undefined ? {} : { scheduledAt },
        });
        upsertPost(post);
        return post;
      } catch (e) {
        fail(e);
        return null;
      }
    },
    async deletePost(id) {
      const previous = posts;
      setPosts((prev) => prev.filter((p) => p.id !== id));
      try {
        await api(`/api/posts/${id}`, { method: "DELETE" });
        return true;
      } catch (e) {
        setPosts(previous);
        fail(e);
        return false;
      }
    },
    async createCampaign(input) {
      try {
        const c = await api<Campaign>("/api/campaigns", { method: "POST", json: input });
        setCampaigns((prev) => [...prev, c].sort((a, b) => a.startDate.localeCompare(b.startDate)));
        return c;
      } catch (e) {
        fail(e);
        return null;
      }
    },
    async updateCampaign(id, patch) {
      try {
        const c = await api<Campaign>(`/api/campaigns/${id}`, { method: "PATCH", json: patch });
        setCampaigns((prev) => prev.map((x) => (x.id === id ? c : x)).sort((a, b) => a.startDate.localeCompare(b.startDate)));
        return c;
      } catch (e) {
        fail(e);
        return null;
      }
    },
    async deleteCampaign(id) {
      try {
        await api(`/api/campaigns/${id}`, { method: "DELETE" });
        setCampaigns((prev) => prev.filter((c) => c.id !== id));
        setPosts((prev) => prev.map((p) => (p.campaignId === id ? { ...p, campaignId: null } : p)));
        return true;
      } catch (e) {
        fail(e);
        return false;
      }
    },
    async uploadMedia(file, params = {}, onProgress) {
      try {
        const item = await uploadFile<MediaItem>(file, params, onProgress);
        setMedia((prev) => [item, ...prev]);
        return item;
      } catch (e) {
        fail(e);
        return null;
      }
    },
    async updateMedia(id, patch) {
      try {
        const item = await api<MediaItem>(`/api/media/${id}`, { method: "PATCH", json: patch });
        setMedia((prev) => prev.map((m) => (m.id === id ? item : m)));
        return item;
      } catch (e) {
        fail(e);
        return null;
      }
    },
    async deleteMedia(id) {
      try {
        await api(`/api/media/${id}`, { method: "DELETE" });
        setMedia((prev) => prev.filter((m) => m.id !== id));
        setPosts((prev) => prev.map((p) => ({ ...p, mediaIds: p.mediaIds.filter((m) => m !== id) })));
        return true;
      } catch (e) {
        fail(e);
        return false;
      }
    },
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = React.useContext(DataContext);
  if (!ctx) throw new Error("useData doit être utilisé dans <DataProvider>");
  return ctx;
}

export function mediaUrl(id: string) {
  return `/api/media/${id}/file`;
}
