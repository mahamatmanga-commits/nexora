"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  isValid,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import {
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Lightbulb,
  List,
  Plus,
  Square,
} from "lucide-react";
import { ACTIVITIES, COLOR_MODE_LABELS, type ColorMode, type Status } from "@/lib/domain/constants";
import { useData } from "@/lib/client/store";
import { capitalize, dayKey, fmt } from "@/lib/dates";
import { useMediaQuery } from "@/lib/client/use-media-query";
import { usePostEditor } from "@/components/posts/post-editor-provider";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/input";
import { Segmented } from "@/components/ui/misc";
import { cn } from "@/lib/utils";
import { applyFilters, EMPTY_FILTERS, FilterBar, type Filters } from "./filters";
import { DndBoard } from "./dnd-board";
import { IdeasInbox } from "./ideas-inbox";
import { KanbanView } from "./kanban-view";
import { ListView } from "./list-view";
import { MonthView } from "./month-view";
import { PostChip, type ChipContext } from "./post-chip";
import { TimeGridView } from "./time-grid-view";
import { ColorLegend } from "./legend";

export type CalendarMode = "mois" | "semaine" | "jour" | "liste" | "kanban";
const MODES: CalendarMode[] = ["mois", "semaine", "jour", "liste", "kanban"];

function usePersistentState<T extends string>(key: string, initial: T, allowed: readonly T[]) {
  const [value, setValue] = React.useState<T>(initial);
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(key) as T | null;
      if (stored && allowed.includes(stored)) setValue(stored);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const update = React.useCallback(
    (v: T) => {
      setValue(v);
      try {
        localStorage.setItem(key, v);
      } catch {}
    },
    [key],
  );
  return [value, update] as const;
}

export function CalendarPage() {
  const params = useSearchParams();
  const router = useRouter();
  const { posts, campaigns, updatePost } = useData();
  const { openPost, openNew } = usePostEditor();

  const urlMode = params.get("vue") as CalendarMode | null;
  const [storedMode, setStoredMode] = usePersistentState<CalendarMode>("oceades.calendar.mode", "mois", MODES);
  const mode: CalendarMode = urlMode && MODES.includes(urlMode) ? urlMode : storedMode;
  const [colorMode, setColorMode] = usePersistentState<ColorMode>("oceades.calendar.color", "activity", ["activity", "platform", "status", "campaign"]);
  const [anchor, setAnchor] = React.useState<Date>(() => {
    const d = params.get("date");
    const parsed = d ? parseISO(d) : null;
    return parsed && isValid(parsed) ? parsed : new Date();
  });
  const [filters, setFilters] = React.useState<Filters>(() => {
    const c = params.get("campagne");
    const a = params.get("activite") as Filters["activities"][number] | null;
    return { ...EMPTY_FILTERS, ...(c && { campaignIds: [c] }), ...(a && ACTIVITIES.includes(a) && { activities: [a] }) };
  });
  const [showInbox, setShowInbox] = React.useState(true);

  // Une campagne passée dans l'URL positionne le calendrier sur son début.
  React.useEffect(() => {
    const c = campaigns.find((x) => x.id === params.get("campagne"));
    if (c && !params.get("date")) setAnchor(parseISO(c.startDate));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setMode(m: CalendarMode) {
    setStoredMode(m);
    if (urlMode) {
      const next = new URLSearchParams(params);
      next.delete("vue");
      router.replace(`/calendrier${next.size ? `?${next}` : ""}`);
    }
  }

  const campaignMap = React.useMemo(() => new Map(campaigns.map((c) => [c.id, c])), [campaigns]);
  const ctx: ChipContext = { colorMode, campaigns: campaignMap, onOpen: openPost };
  const filtered = React.useMemo(() => applyFilters(posts, filters, campaigns), [posts, filters, campaigns]);
  const ideas = filtered.filter((p) => !p.scheduledAt);

  // Période affichée
  const range = React.useMemo(() => {
    switch (mode) {
      case "semaine":
        return { start: startOfWeek(anchor, { weekStartsOn: 1 }), end: endOfWeek(anchor, { weekStartsOn: 1 }) };
      case "jour":
        return { start: anchor, end: anchor };
      default:
        return { start: startOfMonth(anchor), end: endOfMonth(anchor) };
    }
  }, [mode, anchor]);
  const inRange = filtered.filter((p) => {
    if (!p.scheduledAt) return false;
    const k = p.scheduledAt.slice(0, 10);
    return k >= dayKey(range.start) && k <= dayKey(range.end);
  });

  function shift(direction: 1 | -1) {
    if (mode === "semaine") setAnchor((a) => addWeeks(a, direction));
    else if (mode === "jour") setAnchor((a) => addDays(a, direction));
    else setAnchor((a) => addMonths(a, direction));
  }

  // Raccourcis : ← → pour naviguer, T pour aujourd'hui.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea, select, [role=dialog], [role=menu]") || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowLeft") shift(-1);
      else if (e.key === "ArrowRight") shift(1);
      else if (e.key.toLowerCase() === "t") setAnchor(new Date());
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const title =
    mode === "semaine"
      ? `${fmt(range.start, "d MMM")} – ${fmt(range.end, "d MMM yyyy")}`
      : mode === "jour"
        ? capitalize(fmt(anchor, "EEEE d MMMM yyyy"))
        : capitalize(fmt(anchor, "MMMM yyyy"));

  const defaultsFromFilters = {
    ...(filters.activities.length === 1 && { activity: filters.activities[0] }),
    ...(filters.platforms.length === 1 && { platform: filters.platforms[0] }),
    ...(filters.campaignIds.length === 1 && { campaignId: filters.campaignIds[0] }),
  };
  const createAt = (scheduledAt: string) => openNew({ scheduledAt, ...defaultsFromFilters });
  const goToDay = (d: Date) => {
    setAnchor(d);
    setMode("jour");
  };

  const isXl = useMediaQuery("(min-width: 1280px)");
  const showSide = (mode === "mois" || mode === "semaine" || mode === "jour") && showInbox;

  return (
    <DndBoard ctx={ctx}>
      <div className="flex h-[calc(100dvh-3.5rem)] flex-col gap-3 p-4 lg:h-dvh lg:p-6">
        {/* Barre d'outils */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon-sm" onClick={() => shift(-1)} aria-label="Période précédente">
              <ChevronLeft />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setAnchor(new Date())}>
              Aujourd'hui
            </Button>
            <Button variant="outline" size="icon-sm" onClick={() => shift(1)} aria-label="Période suivante">
              <ChevronRight />
            </Button>
          </div>
          <h1 className="min-w-[10ch] text-lg font-semibold tracking-tight sm:text-xl" aria-live="polite">
            {title}
          </h1>
          <span className="hidden text-xs text-muted-foreground md:inline">
            {mode === "kanban" ? `${filtered.length} publications` : `${inRange.length} publication${inRange.length > 1 ? "s" : ""}`}
          </span>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Segmented
              value={mode}
              onChange={setMode}
              options={[
                { value: "mois", label: "Mois", icon: <CalendarDays /> },
                { value: "semaine", label: "Semaine", icon: <CalendarRange /> },
                { value: "jour", label: "Jour", icon: <Square /> },
                { value: "liste", label: "Liste", icon: <List /> },
                { value: "kanban", label: "Kanban", icon: <Columns3 /> },
              ]}
            />
            <Button onClick={() => openNew({ scheduledAt: mode === "jour" ? `${dayKey(anchor)}T12:00` : null, ...defaultsFromFilters })}>
              <Plus /> <span className="hidden sm:inline">Nouvelle publication</span>
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FilterBar filters={filters} onChange={setFilters} campaigns={campaigns} className="flex-1" />
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Couleurs
            <NativeSelect value={colorMode} onChange={(e) => setColorMode(e.target.value as ColorMode)} className="h-8 w-[130px] text-xs" aria-label="Colorer les publications par">
              {(Object.keys(COLOR_MODE_LABELS) as ColorMode[]).map((m) => (
                <option key={m} value={m}>{COLOR_MODE_LABELS[m]}</option>
              ))}
            </NativeSelect>
          </label>
          {(mode === "mois" || mode === "semaine" || mode === "jour") && (
            <Button variant={showInbox ? "secondary" : "outline"} size="sm" onClick={() => setShowInbox((v) => !v)} aria-pressed={showInbox}>
              <Lightbulb /> Idées {ideas.length > 0 && <span className="tabular">({ideas.length})</span>}
            </Button>
          )}
        </div>
        <ColorLegend mode={colorMode} campaigns={campaigns} />

        {/* Zone principale */}
        <div className={cn("grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)] gap-3", showSide && isXl && "grid-cols-[minmax(0,1fr)_260px]")}>
          <div className={cn("min-h-0 min-w-0", mode === "liste" || mode === "kanban" ? "overflow-y-auto scrollbar-thin" : "overflow-auto")}>
            {mode === "mois" && (
              <MonthView anchor={anchor} posts={filtered} campaigns={campaigns} ctx={ctx} onCreate={(day) => createAt(`${day}T12:00`)} onSelectDay={goToDay} />
            )}
            {mode === "semaine" && (
              <TimeGridView
                days={eachDayOfInterval({ start: range.start, end: range.end })}
                posts={filtered}
                campaigns={campaigns}
                ctx={ctx}
                onCreate={createAt}
                onSelectDay={goToDay}
              />
            )}
            {mode === "jour" && (
              <div className="grid h-full gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
                <TimeGridView days={[anchor]} posts={filtered} campaigns={campaigns} ctx={ctx} onCreate={createAt} />
                <div className="flex flex-col gap-2 overflow-y-auto scrollbar-thin">
                  <h2 className="text-sm font-semibold">Au programme</h2>
                  {inRange.map((p) => (
                    <PostChip key={p.id} post={p} ctx={ctx} variant="card" />
                  ))}
                  {!inRange.length && <p className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">Rien de prévu ce jour-là. Cliquez sur un créneau horaire pour créer une publication.</p>}
                </div>
              </div>
            )}
            {mode === "liste" && (
              <ListView
                posts={[...inRange, ...ideas]}
                ctx={ctx}
                campaigns={campaignMap}
                onStatusChange={(id, status: Status) => void updatePost(id, { status })}
              />
            )}
            {mode === "kanban" && <KanbanView posts={filtered} ctx={ctx} onCreate={(status) => openNew({ status, ...defaultsFromFilters })} />}
          </div>
          {showSide && isXl && (
            <div className="min-h-0">
              <IdeasInbox ideas={ideas} ctx={ctx} defaultActivity={filters.activities.length === 1 ? filters.activities[0] : undefined} />
            </div>
          )}
        </div>
        {showSide && !isXl && (
          <div>
            <details className="rounded-xl border bg-card">
              <summary className="cursor-pointer list-none px-3 py-2 text-sm font-medium">
                <Lightbulb className="mr-1.5 inline h-4 w-4 text-amber-500" /> Idées à planifier ({ideas.length})
              </summary>
              <div className="max-h-72 p-1">
                <IdeasInbox ideas={ideas} ctx={ctx} defaultActivity={filters.activities.length === 1 ? filters.activities[0] : undefined} />
              </div>
            </details>
          </div>
        )}
      </div>
    </DndBoard>
  );
}

