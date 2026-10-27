import * as React from "react";
import {
  ACTIVITY_COLORS,
  ACTIVITY_LABELS,
  FORMAT_LABELS,
  PLATFORM_COLORS,
  PLATFORM_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
  type Activity,
  type ColorMode,
  type Format,
  type Platform,
  type Status,
} from "@/lib/domain/constants";
import type { Campaign, Post } from "@/lib/domain/types";
import { ColorBadge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Clapperboard, GalleryHorizontalEnd, Image as ImageIcon, Megaphone, CircleDashed, Video } from "lucide-react";

export function ActivityBadge({ activity, className }: { activity: Activity; className?: string }) {
  return <ColorBadge color={ACTIVITY_COLORS[activity]} className={className}>{ACTIVITY_LABELS[activity]}</ColorBadge>;
}

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  return <ColorBadge color={STATUS_COLORS[status]} className={className}>{STATUS_LABELS[status]}</ColorBadge>;
}

/** Glyphes simplifiés des plateformes (les icônes de marque ne font plus partie de Lucide). */
export function PlatformIcon({ platform, className }: { platform: Platform; className?: string }) {
  const common = { className: cn("h-3.5 w-3.5 shrink-0", className), viewBox: "0 0 24 24", "aria-label": PLATFORM_LABELS[platform], role: "img" };
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
  }
}

export function PlatformLabel({ platform, className }: { platform: Platform; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs text-muted-foreground", className)}>
      <span style={{ color: PLATFORM_COLORS[platform] }} className="dark:brightness-150">
        <PlatformIcon platform={platform} />
      </span>
      {PLATFORM_LABELS[platform]}
    </span>
  );
}

const FORMAT_ICONS: Record<Format, React.ElementType> = {
  reel: Clapperboard,
  story: CircleDashed,
  carrousel: GalleryHorizontalEnd,
  photo: ImageIcon,
  video: Video,
  publicite: Megaphone,
};

export function FormatLabel({ format, className, iconOnly }: { format: Format; className?: string; iconOnly?: boolean }) {
  const Icon = FORMAT_ICONS[format];
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs text-muted-foreground", className)} title={FORMAT_LABELS[format]}>
      <Icon className="h-3.5 w-3.5" />
      {!iconOnly && FORMAT_LABELS[format]}
    </span>
  );
}

/** Couleur d'une publication selon le mode d'affichage choisi dans le calendrier. */
export function postColor(post: Post, mode: ColorMode, campaigns: Map<string, Campaign>): string {
  switch (mode) {
    case "platform":
      return PLATFORM_COLORS[post.platform];
    case "status":
      return STATUS_COLORS[post.status];
    case "campaign":
      return (post.campaignId && campaigns.get(post.campaignId)?.color) || "#adb5bd";
    default:
      return ACTIVITY_COLORS[post.activity];
  }
}
