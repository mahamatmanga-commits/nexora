"use client";

import * as React from "react";
import { ListFilter, X } from "lucide-react";
import { LABEL_FAMILIES, LABEL_FAMILY_LABELS, STATUSES, STATUS_COLORS, STATUS_LABELS, type LabelFamily } from "@/lib/domain/constants";
import { useData } from "@/lib/client/store";
import { EMPTY_FILTERS, filterCount, type CardFilters, type DueFilter } from "@/lib/filters";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[11px] font-medium text-muted-foreground">{title}</p>
      <div className="flex flex-wrap gap-1">{children}</div>
    </div>
  );
}

function Chip({ on, onClick, color, children }: { on: boolean; onClick: () => void; color?: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded px-2 text-[12px] transition",
        on ? "bg-primary text-primary-foreground" : "bg-muted text-foreground/80 hover:bg-accent",
      )}
    >
      {color && <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: color }} />}
      {children}
    </button>
  );
}

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

/** Filtres discrets : un bouton, un panneau. Familles affichables selon le contexte (le calendrier n'en montre que deux). */
export function FilterPopover({
  filters,
  onChange,
  families = LABEL_FAMILIES as unknown as LabelFamily[],
  showStatus = true,
  tone = "board",
}: {
  filters: CardFilters;
  onChange: (f: CardFilters) => void;
  families?: LabelFamily[];
  showStatus?: boolean;
  tone?: "board" | "plain";
}) {
  const { labels, campaigns, members } = useData();
  const count = filterCount(filters);
  const DUE: [DueFilter, string][] = [
    ["late", "En retard"],
    ["week", "7 prochains jours"],
    ["none", "Sans date"],
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px] transition-colors",
            tone === "board" ? "text-white/85 hover:bg-white/15" : "text-muted-foreground hover:bg-accent hover:text-foreground",
            count > 0 && (tone === "board" ? "bg-white/20 text-white" : "bg-accent text-foreground"),
          )}
          aria-label="Filtres"
        >
          <ListFilter className="h-4 w-4" />
          <span className="hidden sm:inline">Filtres</span>
          {count > 0 && <span className={cn("rounded-full px-1.5 text-[11px] font-semibold", tone === "board" ? "bg-white text-[#203849]" : "bg-primary text-primary-foreground")}>{count}</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="flex max-h-[75vh] w-[min(92vw,360px)] flex-col gap-4 overflow-y-auto scrollbar-thin">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Filtrer</p>
          {count > 0 && (
            <button type="button" onClick={() => onChange({ ...EMPTY_FILTERS, query: filters.query })} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" /> Effacer
            </button>
          )}
        </div>
        {families.map((fam) => {
          const items = labels.filter((l) => l.family === fam);
          if (!items.length) return null;
          return (
            <Section key={fam} title={LABEL_FAMILY_LABELS[fam]}>
              {items.map((l) => (
                <Chip key={l.id} on={filters.labelIds.includes(l.id)} color={l.color} onClick={() => onChange({ ...filters, labelIds: toggle(filters.labelIds, l.id) })}>
                  {l.name}
                </Chip>
              ))}
            </Section>
          );
        })}
        {showStatus && (
          <Section title="Statut">
            {STATUSES.map((s) => (
              <Chip key={s} on={filters.statuses.includes(s)} color={STATUS_COLORS[s]} onClick={() => onChange({ ...filters, statuses: toggle(filters.statuses, s) })}>
                {STATUS_LABELS[s]}
              </Chip>
            ))}
          </Section>
        )}
        {showStatus && (
          <Section title="Échéance">
            {DUE.map(([k, l]) => (
              <Chip key={k} on={filters.due.includes(k)} onClick={() => onChange({ ...filters, due: toggle(filters.due, k) })}>
                {l}
              </Chip>
            ))}
          </Section>
        )}
        {campaigns.length > 0 && (
          <Section title="Campagne">
            {campaigns.map((c) => (
              <Chip key={c.id} on={filters.campaignIds.includes(c.id)} color={c.color} onClick={() => onChange({ ...filters, campaignIds: toggle(filters.campaignIds, c.id) })}>
                {c.name}
              </Chip>
            ))}
          </Section>
        )}
        {members.length > 0 && (
          <Section title="Responsable">
            {members.map((m) => (
              <Chip key={m.id} on={filters.assigneeIds.includes(m.id)} color={m.color} onClick={() => onChange({ ...filters, assigneeIds: toggle(filters.assigneeIds, m.id) })}>
                {m.name}
              </Chip>
            ))}
          </Section>
        )}
      </PopoverContent>
    </Popover>
  );
}
