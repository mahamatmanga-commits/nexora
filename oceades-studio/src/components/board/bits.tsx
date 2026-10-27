"use client";

import * as React from "react";
import type { Label, Member } from "@/lib/domain/types";
import { initials } from "@/lib/cards";
import { cn } from "@/lib/utils";

/** Étiquette façon Trello : pastille pleine avec texte, ou fine barre en mode compact. */
export function LabelPill({ label, compact, className }: { label: Label; compact?: boolean; className?: string }) {
  if (compact) {
    return <span title={label.name} className={cn("block h-2 w-10 rounded-full", className)} style={{ backgroundColor: label.color }} />;
  }
  return (
    <span
      className={cn("inline-flex h-[18px] max-w-full items-center truncate rounded px-1.5 text-[11px] font-medium leading-none text-white/95", className)}
      style={{ backgroundColor: label.color }}
      title={label.name}
    >
      {label.name}
    </span>
  );
}

export function Avatar({ member, size = 24, className }: { member: Member; size?: number; className?: string }) {
  return (
    <span
      title={member.name}
      className={cn("inline-grid shrink-0 place-items-center rounded-full font-semibold text-white ring-2 ring-tile", className)}
      style={{ width: size, height: size, backgroundColor: member.color, fontSize: size * 0.4 }}
    >
      {initials(member.name)}
    </span>
  );
}

/** Glyphes monochromes des plateformes (les logos de marque ne font pas partie de Lucide). */
export function PlatformGlyph({ platform, className }: { platform: string; className?: string }) {
  const common = { className: cn("h-3.5 w-3.5 shrink-0", className), viewBox: "0 0 24 24", "aria-hidden": true };
  switch (platform) {
    case "instagram":
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case "facebook":
      return (
        <svg {...common} fill="currentColor">
          <path d="M14 8h2.5V4.5H14c-2.5 0-4 1.6-4 4V11H7.5v3.5H10V21h3.5v-6.5H16l.5-3.5h-3V8.8c0-.5.3-.8.5-.8Z" />
        </svg>
      );
    case "tiktok":
      return (
        <svg {...common} fill="currentColor">
          <path d="M16.5 3c.3 2.3 1.8 3.9 4 4.1v3.4c-1.5 0-2.8-.4-4-1.2v6.2c0 3.5-2.7 5.5-5.5 5.5A5.4 5.4 0 0 1 5.5 15.6c0-3.3 2.9-5.7 6.2-5.2v3.5c-1.4-.4-2.8.5-2.8 1.8 0 1.1.9 1.9 2 1.9 1.2 0 2.1-.8 2.1-2.4V3h3.5Z" />
        </svg>
      );
    case "linkedin":
      return (
        <svg {...common} fill="currentColor">
          <path d="M4 9h3.5v11H4zM5.8 3.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4ZM10 9h3.3v1.6c.5-.9 1.7-1.9 3.5-1.9 3.6 0 4.2 2.3 4.2 5.4V20h-3.5v-5.2c0-1.3 0-2.9-1.8-2.9s-2.1 1.4-2.1 2.8V20H10V9Z" />
        </svg>
      );
    case "meta_ads":
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <path d="M3 15c0-4 2-8 4.5-8 3 0 5.5 10 9 10 2 0 3.5-2 3.5-5s-1.5-5-3.5-5c-3 0-5.5 10-9 10C5 17 3 16.5 3 15Z" />
        </svg>
      );
    default:
      return null;
  }
}

/** Petit menu « … » discret qui n'apparaît qu'au survol du parent (classe group). */
export const hoverReveal = "opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100 [@media(hover:none)]:opacity-100";
