"use client";

import * as React from "react";
import { Filter, Search, X } from "lucide-react";
import {
  ACTIVITIES,
  ACTIVITY_COLORS,
  ACTIVITY_LABELS,
  FORMATS,
  FORMAT_LABELS,
  OBJECTIVES,
  OBJECTIVE_LABELS,
  PLATFORMS,
  PLATFORM_COLORS,
  PLATFORM_LABELS,
  STATUSES,
  STATUS_COLORS,
  STATUS_LABELS,
  type Activity,
  type Format,
  type Objective,
  type Platform,
  type Status,
} from "@/lib/domain/constants";
import type { Campaign, Post } from "@/lib/domain/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn, normalize, tint } from "@/lib/utils";

export interface Filters {
  query: string;
  activities: Activity[];
  platforms: Platform[];
  statuses: Status[];
  formats: Format[];
  objectives: Objective[];
  campaignIds: string[];
}

export const EMPTY_FILTERS: Filters = {
  query: "",
  activities: [],
  platforms: [],
  statuses: [],
  formats: [],
  objectives: [],
  campaignIds: [],
};

export function activeFilterCount(f: Filters) {
  return f.activities.length + f.platforms.length + f.statuses.length + f.formats.length + f.objectives.length + f.campaignIds.length;
}

export function applyFilters(posts: Post[], f: Filters, campaigns: Campaign[]): Post[] {
  const q = normalize(f.query.trim());
  const campaignName = new Map(campaigns.map((c) => [c.id, c.name]));
  return posts.filter((p) => {
    if (f.activities.length && !f.activities.includes(p.activity)) return false;
    if (f.platforms.length && !f.platforms.includes(p.platform)) return false;
    if (f.statuses.length && !f.statuses.includes(p.status)) return false;
    if (f.formats.length && !f.formats.includes(p.format)) return false;
    if (f.objectives.length && !f.objectives.includes(p.objective)) return false;
    if (f.campaignIds.length && !(p.campaignId && f.campaignIds.includes(p.campaignId))) return false;
    if (q) {
      const haystack = normalize(
        [p.title, p.hook, p.description, p.cta, p.notes, p.campaignId ? campaignName.get(p.campaignId) : "", ACTIVITY_LABELS[p.activity], PLATFORM_LABELS[p.platform]].join(" "),
      );
      if (!q.split(/\s+/).every((word) => haystack.includes(word))) return false;
    }
    return true;
  });
}

function ChipGroup<T extends string>({
  title,
  values,
  selected,
  labels,
  colors,
  onChange,
}: {
  title: string;
  values: readonly T[];
  selected: T[];
  labels: Record<T, string>;
  colors?: Record<T, string>;
  onChange: (v: T[]) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
      <div className="flex flex-wrap gap-1">
        {values.map((v) => {
          const on = selected.includes(v);
          const color = colors?.[v];
          return (
            <button
              key={v}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(on ? selected.filter((x) => x !== v) : [...selected, v])}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                on && "border-transparent font-medium",
              )}
              style={on && color ? { backgroundColor: tint(color, 0.14), color } : on ? { backgroundColor: "hsl(var(--accent))" } : undefined}
            >
              {color && <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />}
              <span className={cn(on && color && "dark:brightness-150")}>{labels[v]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function FilterBar({
  filters,
  onChange,
  campaigns,
  className,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
  campaigns: Campaign[];
  className?: string;
}) {
  const count = activeFilterCount(filters);
  const searchRef = React.useRef<HTMLInputElement>(null);

  // « / » place le curseur dans la recherche.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || (e.target as HTMLElement).closest("input, textarea, select, [role=dialog]")) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const campaignLabels = Object.fromEntries(campaigns.map((c) => [c.id, c.name])) as Record<string, string>;
  const campaignColors = Object.fromEntries(campaigns.map((c) => [c.id, c.color])) as Record<string, string>;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          ref={searchRef}
          value={filters.query}
          onChange={(e) => onChange({ ...filters, query: e.target.value })}
          placeholder="Rechercher…"
          aria-label="Rechercher une publication"
          className="h-9 pl-8 pr-8"
        />
        {filters.query ? (
          <button type="button" onClick={() => onChange({ ...filters, query: "" })} className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground" aria-label="Effacer la recherche">
            <X className="h-4 w-4" />
          </button>
        ) : (
          <kbd className="pointer-events-none absolute right-2 top-2 hidden rounded border px-1.5 text-[10px] text-muted-foreground sm:block">/</kbd>
        )}
      </div>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-9">
            <Filter /> Filtres
            {count > 0 && <span className="rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">{count}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="flex max-h-[70vh] w-[min(92vw,420px)] flex-col gap-4 overflow-y-auto scrollbar-thin">
          <ChipGroup title="Activité" values={ACTIVITIES} selected={filters.activities} labels={ACTIVITY_LABELS} colors={ACTIVITY_COLORS} onChange={(activities) => onChange({ ...filters, activities })} />
          <ChipGroup title="Plateforme" values={PLATFORMS} selected={filters.platforms} labels={PLATFORM_LABELS} colors={PLATFORM_COLORS} onChange={(platforms) => onChange({ ...filters, platforms })} />
          <ChipGroup title="Statut" values={STATUSES} selected={filters.statuses} labels={STATUS_LABELS} colors={STATUS_COLORS} onChange={(statuses) => onChange({ ...filters, statuses })} />
          <ChipGroup title="Format" values={FORMATS} selected={filters.formats} labels={FORMAT_LABELS} onChange={(formats) => onChange({ ...filters, formats })} />
          <ChipGroup title="Objectif" values={OBJECTIVES} selected={filters.objectives} labels={OBJECTIVE_LABELS} onChange={(objectives) => onChange({ ...filters, objectives })} />
          {campaigns.length > 0 && (
            <ChipGroup title="Campagne" values={campaigns.map((c) => c.id)} selected={filters.campaignIds} labels={campaignLabels} colors={campaignColors} onChange={(campaignIds) => onChange({ ...filters, campaignIds })} />
          )}
          {count > 0 && (
            <Button variant="ghost" size="sm" className="self-start" onClick={() => onChange({ ...EMPTY_FILTERS, query: filters.query })}>
              <X /> Réinitialiser les filtres
            </Button>
          )}
        </PopoverContent>
      </Popover>
      {/* Raccourcis visibles : filtres actifs */}
      {count > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          {filters.activities.map((a) => (
            <ActivePill key={a} color={ACTIVITY_COLORS[a]} label={ACTIVITY_LABELS[a]} onRemove={() => onChange({ ...filters, activities: filters.activities.filter((x) => x !== a) })} />
          ))}
          {filters.platforms.map((p) => (
            <ActivePill key={p} color={PLATFORM_COLORS[p]} label={PLATFORM_LABELS[p]} onRemove={() => onChange({ ...filters, platforms: filters.platforms.filter((x) => x !== p) })} />
          ))}
          {filters.statuses.map((s) => (
            <ActivePill key={s} color={STATUS_COLORS[s]} label={STATUS_LABELS[s]} onRemove={() => onChange({ ...filters, statuses: filters.statuses.filter((x) => x !== s) })} />
          ))}
          {filters.formats.map((f) => (
            <ActivePill key={f} label={FORMAT_LABELS[f]} onRemove={() => onChange({ ...filters, formats: filters.formats.filter((x) => x !== f) })} />
          ))}
          {filters.objectives.map((o) => (
            <ActivePill key={o} label={OBJECTIVE_LABELS[o]} onRemove={() => onChange({ ...filters, objectives: filters.objectives.filter((x) => x !== o) })} />
          ))}
          {filters.campaignIds.map((id) => (
            <ActivePill key={id} color={campaignColors[id]} label={campaignLabels[id] ?? "Campagne"} onRemove={() => onChange({ ...filters, campaignIds: filters.campaignIds.filter((x) => x !== id) })} />
          ))}
        </div>
      )}
    </div>
  );
}

function ActivePill({ label, color, onRemove }: { label: string; color?: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border bg-card py-0.5 pl-2 pr-1 text-xs">
      {color && <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />}
      {label}
      <button type="button" onClick={onRemove} className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground" aria-label={`Retirer le filtre ${label}`}>
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}
