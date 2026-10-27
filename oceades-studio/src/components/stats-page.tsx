"use client";

import * as React from "react";
import { addDays, endOfWeek, startOfDay, startOfWeek } from "date-fns";
import { DONE_STATUSES, type LabelFamily } from "@/lib/domain/constants";
import type { Card } from "@/lib/domain/types";
import { useData, useIndexes } from "@/lib/client/store";
import { cardLabels } from "@/lib/cards";
import { capitalize, dayKey, fmt, parseLocal } from "@/lib/dates";
import { balanceReport } from "@/lib/insights/balance";
import { productionAlerts } from "@/lib/insights/production-alerts";
import { useCardModal } from "@/components/card/card-modal-provider";
import { Segmented } from "@/components/ui/misc";
import { cn } from "@/lib/utils";

type Period = "semaine" | "30j" | "mois";

function Bars({ rows }: { rows: { key: string; name: string; color: string; value: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  const total = rows.reduce((s, r) => s + r.value, 0);
  return (
    <ul className="flex flex-col gap-2">
      {rows.map((r) => (
        <li key={r.key} className="grid grid-cols-[96px_1fr_56px] items-center gap-2 text-[12.5px]" title={`${r.name} : ${r.value}`}>
          <span className="truncate text-muted-foreground">{r.name}</span>
          <span className="h-2 overflow-hidden rounded-full bg-muted">
            <span className="block h-full rounded-full transition-all duration-500" style={{ width: `${(r.value / max) * 100}%`, backgroundColor: r.color }} />
          </span>
          <span className="text-right tabular">
            {r.value} <span className="text-muted-foreground">· {total ? Math.round((r.value / total) * 100) : 0} %</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function Panel({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border bg-card p-4", className)}>
      <h2 className="mb-3 text-[13px] font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function StatsPage() {
  const { cards, campaigns, labels, settings } = useData();
  const { labelById } = useIndexes();
  const { openCard } = useCardModal();
  const [period, setPeriod] = React.useState<Period>("30j");
  const now = new Date();
  const today = startOfDay(now);
  const active = cards.filter((c) => !c.archivedAt);
  const range =
    period === "semaine"
      ? { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) }
      : period === "mois"
        ? { start: new Date(now.getFullYear(), now.getMonth(), 1), end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59) }
        : { start: today, end: addDays(today, 30) };
  const inPeriod = active.filter((c) => c.scheduledAt && parseLocal(c.scheduledAt) >= range.start && parseLocal(c.scheduledAt) <= range.end);
  const thisWeek = active.filter((c) => c.scheduledAt && parseLocal(c.scheduledAt) >= startOfWeek(now, { weekStartsOn: 1 }) && parseLocal(c.scheduledAt) <= endOfWeek(now, { weekStartsOn: 1 }));
  const toValidate = active.filter((c) => c.status === "a_valider");
  const alerts = productionAlerts(cards, labelById, campaigns, settings);

  const distribution = (family: LabelFamily) =>
    labels
      .filter((l) => l.family === family)
      .map((l) => ({ key: l.id, name: l.name, color: family === "activite" ? l.color : "hsl(var(--primary))", value: inPeriod.filter((c) => c.labelIds.includes(l.id)).length }))
      .filter((r) => r.value > 0 || family === "activite");

  const balance = balanceReport(inPeriod, labelById, settings?.balanceTargets ?? {});

  // Charge de travail : 14 prochains jours, par type d'échéance.
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i));
  const open = active.filter((c) => !DONE_STATUSES.includes(c.status));
  const load = {
    Production: (d: string) => open.filter((c) => c.productionDate === d),
    Validation: (d: string) => open.filter((c) => c.validationDate === d),
    Publication: (d: string) => active.filter((c) => c.scheduledAt?.slice(0, 10) === d && c.status !== "publie"),
  };
  const dayTotal = (d: string) => new Set(Object.values(load).flatMap((f) => f(d).map((c) => c.id))).size;
  const maxLoad = Math.max(1, ...days.map((d) => dayTotal(dayKey(d))));
  const [dayDetail, setDayDetail] = React.useState<string | null>(null);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5 p-4 lg:p-8">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold tracking-tight">Statistiques</h1>
        <Segmented
          value={period}
          onChange={setPeriod}
          options={[
            { value: "semaine", label: "Cette semaine" },
            { value: "30j", label: "30 jours" },
            { value: "mois", label: "Ce mois" },
          ]}
          className="ml-auto"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Publications cette semaine", thisWeek.length],
          ["En attente de validation", toValidate.length],
          ["Prévues sur la période", inPeriod.length],
          ["Alertes", alerts.length],
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-xl border bg-card px-4 py-3">
            <p className="text-[12px] text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-semibold tabular">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Panel title="Par activité">
          <Bars rows={distribution("activite")} />
        </Panel>
        <Panel title="Par format">
          <Bars rows={distribution("format")} />
        </Panel>
        <Panel title="Par plateforme">
          <Bars rows={distribution("plateforme")} />
        </Panel>
      </div>

      <Panel title="Charge de production — 14 prochains jours">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[640px] border-separate border-spacing-1 text-[12px]">
            <thead>
              <tr>
                <th />
                {days.map((d) => (
                  <th key={dayKey(d)} className="font-normal text-muted-foreground">
                    <span className="block">{fmt(d, "EEEEE")}</span>
                    <span className="block tabular">{fmt(d, "d")}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(load).map(([name, fn]) => (
                <tr key={name}>
                  <th className="pr-2 text-left font-normal text-muted-foreground">{name}</th>
                  {days.map((d) => {
                    const n = fn(dayKey(d)).length;
                    return (
                      <td key={dayKey(d)} className="h-7 rounded text-center tabular" style={{ backgroundColor: n ? `hsl(var(--primary) / ${0.15 + (n / maxLoad) * 0.6})` : "hsl(var(--muted) / 0.6)" }}>
                        {n || ""}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr>
                <th className="pr-2 text-left font-normal">Total</th>
                {days.map((d) => {
                  const k = dayKey(d);
                  const n = dayTotal(k);
                  return (
                    <td key={k} className="text-center">
                      <button type="button" disabled={!n} onClick={() => setDayDetail(dayDetail === k ? null : k)} className={cn("h-7 w-full rounded tabular font-medium", n >= 4 ? "bg-[#ae2e24] text-white" : n >= 3 ? "bg-[#7f5f01] text-white" : "")}>
                        {n || ""}
                      </button>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
        {dayDetail && (
          <div className="mt-3 border-t pt-3">
            <p className="mb-1.5 text-[12px] font-medium">{capitalize(fmt(parseLocal(`${dayDetail}T00:00`), "EEEE d MMMM"))}</p>
            <ul className="flex flex-col gap-1">
              {[...new Map(Object.entries(load).flatMap(([name, fn]) => fn(dayDetail).map((c) => [c.id, { c, name }] as [string, { c: Card; name: string }]))).values()].map(({ c, name }) => (
                <li key={c.id}>
                  <button type="button" onClick={() => openCard(c.id)} className="text-[13px] hover:underline">
                    <span className="text-muted-foreground">{name} · </span>
                    {c.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Panel>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Équilibre éditorial (objectifs)">
          <ul className="flex flex-col gap-2.5">
            {balance.rows.map((r) => (
              <li key={r.key} className="text-[12.5px]">
                <div className="mb-1 flex justify-between">
                  <span>{r.name}</span>
                  <span className={cn("tabular text-muted-foreground", r.target - r.actual > 10 && "text-[#e2b203]")}>
                    {r.actual} % / objectif {r.target} %
                  </span>
                </div>
                <div className="relative h-2 rounded-full bg-muted">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, r.actual)}%`, backgroundColor: r.color }} />
                  <div className="absolute -top-0.5 h-3 w-0.5 rounded bg-foreground/70" style={{ left: `${Math.min(100, r.target)}%` }} title="Objectif" />
                </div>
              </li>
            ))}
          </ul>
          {balance.gaps.length > 0 && <p className="mt-3 text-[12.5px] text-muted-foreground">Recommandation : prévoir davantage de contenus {balance.gaps.map((g) => g.name).join(", ")}.</p>}
        </Panel>
        <Panel title="Campagnes">
          <ul className="flex flex-col gap-3">
            {campaigns
              .filter((c) => c.endDate >= dayKey(addDays(today, -7)))
              .map((c) => {
                const items = active.filter((x) => x.campaignId === c.id);
                const done = items.filter((x) => DONE_STATUSES.includes(x.status)).length;
                return (
                  <li key={c.id} className="text-[12.5px]">
                    <div className="mb-1 flex justify-between gap-2">
                      <span className="truncate">{c.name}</span>
                      <span className="tabular text-muted-foreground">
                        {done}/{items.length} · fin {fmt(parseLocal(`${c.endDate}T00:00`), "d MMM")}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full" style={{ width: `${items.length ? (done / items.length) * 100 : 0}%`, backgroundColor: c.color }} />
                    </div>
                  </li>
                );
              })}
          </ul>
        </Panel>
      </div>

      {alerts.length > 0 && (
        <Panel title="Alertes">
          <ul className="flex flex-col divide-y">
            {alerts.map((a) => (
              <li key={a.id}>
                <button type="button" disabled={!a.cardId} onClick={() => a.cardId && openCard(a.cardId)} className="flex w-full items-center gap-2.5 py-2 text-left text-[13px]">
                  <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", a.level === "high" ? "bg-[#f87168]" : "bg-[#e2b203]")} />
                  <span className="truncate">{a.title}</span>
                  <span className="ml-auto shrink-0 text-[12px] text-muted-foreground">{a.detail}</span>
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      )}
      <p className="text-[11.5px] text-muted-foreground">Ces chiffres décrivent votre planning. Les performances des réseaux (portée, engagement) pourront être importées après connexion autorisée aux comptes Meta et Instagram.</p>
    </div>
  );
}
