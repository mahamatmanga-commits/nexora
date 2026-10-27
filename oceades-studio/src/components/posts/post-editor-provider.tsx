"use client";

import * as React from "react";
import type { PostInput } from "@/lib/domain/schemas";
import { PostDialog } from "./post-dialog";

interface EditorState {
  open: boolean;
  postId: string | null;
  defaults: Partial<PostInput>;
  nonce: number;
}

interface EditorContextValue {
  openPost: (id: string) => void;
  openNew: (defaults: Partial<PostInput>) => void;
}

const EditorContext = React.createContext<EditorContextValue | null>(null);

export function PostEditorProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<EditorState>({ open: false, postId: null, defaults: {}, nonce: 0 });

  const value = React.useMemo<EditorContextValue>(
    () => ({
      openPost: (id) => setState((s) => ({ open: true, postId: id, defaults: {}, nonce: s.nonce + 1 })),
      openNew: (defaults) => setState((s) => ({ open: true, postId: null, defaults, nonce: s.nonce + 1 })),
    }),
    [],
  );

  // Raccourci clavier « N » : nouvelle publication (hors champs de saisie).
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.key.toLowerCase() !== "n" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (el.closest("input, textarea, select, [contenteditable=true], [role=dialog]")) return;
      e.preventDefault();
      value.openNew({});
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [value]);

  return (
    <EditorContext.Provider value={value}>
      {children}
      <PostDialog
        key={state.nonce}
        open={state.open}
        postId={state.postId}
        defaults={state.defaults}
        onOpenChange={(open) => setState((s) => ({ ...s, open }))}
        onSwitch={(id) => setState((s) => ({ open: true, postId: id, defaults: {}, nonce: s.nonce + 1 }))}
      />
    </EditorContext.Provider>
  );
}

export function usePostEditor() {
  const ctx = React.useContext(EditorContext);
  if (!ctx) throw new Error("usePostEditor doit être utilisé dans <PostEditorProvider>");
  return ctx;
}
