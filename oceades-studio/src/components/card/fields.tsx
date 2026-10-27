"use client";

import * as React from "react";
import type { CardPatch } from "@/lib/domain/schemas";
import { useData } from "@/lib/client/store";
import { cn } from "@/lib/utils";

type TextField = "title" | "description" | "hook" | "caption" | "script" | "brief" | "cta" | "target";

/**
 * Champ texte à sauvegarde automatique : enregistre 800 ms après la dernière frappe,
 * à la perte du focus et à la fermeture de la fiche (aucun bouton « Enregistrer »).
 */
export function useAutosave(cardId: string, field: TextField, serverValue: string) {
  const { updateCard } = useData();
  const [value, setValue] = React.useState(serverValue);
  const pending = React.useRef<string | null>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout>>(undefined);
  const lastSaved = React.useRef(serverValue);

  // Valeur modifiée ailleurs (IA, autre vue) : on la reprend si l'utilisateur n'est pas en train d'écrire.
  React.useEffect(() => {
    if (pending.current === null && serverValue !== lastSaved.current) {
      setValue(serverValue);
      lastSaved.current = serverValue;
    }
  }, [serverValue]);

  const flush = React.useCallback(() => {
    clearTimeout(timer.current);
    const v = pending.current;
    pending.current = null;
    if (v === null || v === lastSaved.current) return;
    if (field === "title" && !v.trim()) return;
    lastSaved.current = v;
    void updateCard(cardId, { [field]: field === "title" ? v.trim() : v } as CardPatch);
  }, [cardId, field, updateCard]);

  React.useEffect(() => flush, [flush]);

  const onChange = (v: string) => {
    setValue(v);
    pending.current = v;
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, 800);
  };
  return { value, onChange, flush, setValue };
}

/** Zone de texte qui s'agrandit avec son contenu. */
export const AutoTextarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement> & { minRows?: number }>(
  ({ className, minRows = 2, value, ...props }, forwarded) => {
    const ref = React.useRef<HTMLTextAreaElement>(null);
    React.useImperativeHandle(forwarded, () => ref.current!);
    React.useLayoutEffect(() => {
      const el = ref.current;
      if (!el) return;
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight + 2}px`;
    }, [value]);
    return (
      <textarea
        ref={ref}
        rows={minRows}
        value={value}
        className={cn(
          "w-full resize-none rounded-md border border-transparent bg-muted/50 px-3 py-2 text-[13.5px] leading-relaxed outline-none transition-colors placeholder:text-muted-foreground/70 hover:bg-muted focus:border-ring/50 focus:bg-card",
          className,
        )}
        {...props}
      />
    );
  },
);
AutoTextarea.displayName = "AutoTextarea";

export function AutosaveTextarea({ cardId, field, value, placeholder, minRows, className, ariaLabel }: { cardId: string; field: TextField; value: string; placeholder?: string; minRows?: number; className?: string; ariaLabel: string }) {
  const s = useAutosave(cardId, field, value);
  return <AutoTextarea value={s.value} onChange={(e) => s.onChange(e.target.value)} onBlur={s.flush} placeholder={placeholder} minRows={minRows} className={className} aria-label={ariaLabel} />;
}

/** Petit intitulé de section. */
export function SectionTitle({ icon, children, action }: { icon?: React.ReactNode; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-center gap-2">
      {icon && <span className="text-muted-foreground [&_svg]:h-4 [&_svg]:w-4">{icon}</span>}
      <h3 className="text-[13px] font-semibold">{children}</h3>
      {action && <div className="ml-auto flex items-center gap-1">{action}</div>}
    </div>
  );
}

/** Bloc méta compact (titre gris + contenu), comme les blocs « Étiquettes », « Dates » de Trello. */
export function MetaBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-[11px] font-medium text-muted-foreground">{title}</span>
      <div className="flex flex-wrap items-center gap-1">{children}</div>
    </div>
  );
}

export const chipButton = "inline-flex h-7 items-center gap-1.5 rounded-md bg-muted px-2 text-[12.5px] transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
