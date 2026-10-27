"use client";

import * as React from "react";
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface Datum {
  key: string;
  label: string;
  value: number;
  color: string;
}

function ChartTooltip({ active, payload, total }: { active?: boolean; payload?: { payload: Datum }[]; total: number }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-md">
      <div className="flex items-center gap-1.5 font-medium">
        <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: d.color }} />
        {d.label}
      </div>
      <div className="mt-0.5 tabular text-muted-foreground">
        {d.value} publication{d.value > 1 ? "s" : ""} · {total ? Math.round((d.value / total) * 100) : 0} %
      </div>
    </div>
  );
}

/**
 * Barres horizontales : comparaison de volumes par catégorie.
 * Les catégories sont nommées sur l'axe et la valeur est écrite au bout de la barre :
 * la couleur n'est jamais le seul porteur d'information.
 */
export function HorizontalBars({ data, onSelect }: { data: Datum[]; onSelect?: (key: string) => void }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div style={{ height: Math.max(120, data.length * 36) }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 36, bottom: 0, left: 0 }} barCategoryGap={8}>
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="label"
            width={96}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
          />
          <Tooltip cursor={{ fill: "hsl(var(--muted))", radius: 6 }} content={<ChartTooltip total={total} />} />
          <Bar
            dataKey="value"
            radius={[0, 4, 4, 0]}
            maxBarSize={20}
            onClick={(d: { payload?: Datum }) => d.payload && onSelect?.(d.payload.key)}
            className={onSelect ? "cursor-pointer" : undefined}
            isAnimationActive
            animationDuration={500}
          >
            {data.map((d) => (
              <Cell key={d.key} fill={d.color} />
            ))}
            <LabelList dataKey="value" position="right" offset={8} fill="hsl(var(--foreground))" fontSize={12} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Barre segmentée (part du tout) pour le pipeline de production, avec légende chiffrée. */
export function SegmentedBar({ data }: { data: Datum[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const [hover, setHover] = React.useState<string | null>(null);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-3 w-full gap-[2px] overflow-hidden rounded-full bg-muted" role="img" aria-label="Répartition par statut">
        {data
          .filter((d) => d.value > 0)
          .map((d) => (
            <div
              key={d.key}
              className="h-full transition-opacity first:rounded-l-full last:rounded-r-full"
              style={{ width: `${(d.value / total) * 100}%`, backgroundColor: d.color, opacity: hover && hover !== d.key ? 0.35 : 1 }}
              onMouseEnter={() => setHover(d.key)}
              onMouseLeave={() => setHover(null)}
              title={`${d.label} : ${d.value}`}
            />
          ))}
      </div>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
        {data.map((d) => (
          <li
            key={d.key}
            className="flex items-center gap-2 text-xs"
            onMouseEnter={() => setHover(d.key)}
            onMouseLeave={() => setHover(null)}
          >
            <span className="h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: d.color }} />
            <span className="truncate text-muted-foreground">{d.label}</span>
            <span className="ml-auto font-medium tabular">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
