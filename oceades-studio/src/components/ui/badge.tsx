import * as React from "react";
import { cn, tint } from "@/lib/utils";

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium leading-none text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

/** Pastille colorée (activité, statut, plateforme…). */
export function ColorBadge({ color, children, className, dot = true }: { color: string; children: React.ReactNode; className?: string; dot?: boolean }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-tight", className)}
      style={{ backgroundColor: tint(color, 0.12), color }}
    >
      {dot && <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />}
      <span className="dark:brightness-150">{children}</span>
    </span>
  );
}

export function DemoBadge({ className }: { className?: string }) {
  return (
    <span
      title="Donnée de démonstration"
      className={cn("rounded border border-dashed border-amber-500/60 px-1 text-[10px] font-medium uppercase tracking-wide text-amber-600 dark:text-amber-400", className)}
    >
      Démo
    </span>
  );
}
