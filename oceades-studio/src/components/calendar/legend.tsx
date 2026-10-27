import {
  ACTIVITIES,
  ACTIVITY_COLORS,
  ACTIVITY_LABELS,
  PLATFORMS,
  PLATFORM_COLORS,
  PLATFORM_LABELS,
  STATUSES,
  STATUS_COLORS,
  STATUS_LABELS,
  type ColorMode,
} from "@/lib/domain/constants";
import type { Campaign } from "@/lib/domain/types";

/** Légende des couleurs selon le mode d'affichage. */
export function ColorLegend({ mode, campaigns }: { mode: ColorMode; campaigns: Campaign[] }) {
  const items: { label: string; color: string }[] =
    mode === "platform"
      ? PLATFORMS.map((p) => ({ label: PLATFORM_LABELS[p], color: PLATFORM_COLORS[p] }))
      : mode === "status"
        ? STATUSES.map((s) => ({ label: STATUS_LABELS[s], color: STATUS_COLORS[s] }))
        : mode === "campaign"
          ? [...campaigns.map((c) => ({ label: c.name, color: c.color })), { label: "Sans campagne", color: "#adb5bd" }]
          : ACTIVITIES.map((a) => ({ label: ACTIVITY_LABELS[a], color: ACTIVITY_COLORS[a] }));
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground" aria-label="Légende des couleurs">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}
