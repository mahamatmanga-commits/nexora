"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  addDays,
  addMonths,
  endOfMonth,
  isAfter,
  startOfDay,
  startOfMonth,
  subDays,
} from "date-fns";
import {
  AlertTriangle,
  ArrowRight,
  CalendarCheck2,
  CalendarClock,
  CheckCircle2,
  Clock,
  Hammer,
  Repeat2,
  Scale,
  Sparkles,
  Wand2,
} from "lucide-react";
import {
  ACTIVITIES,
  ACTIVITY_COLORS,
  ACTIVITY_LABELS,
  PLATFORMS,
  PLATFORM_COLORS,
  PLATFORM_LABELS,
  PRODUCTION_STATUSES,
  STATUSES,
  STATUS_COLORS,
  STATUS_LABELS,
} from "@/lib/domain/constants";
import type { Post } from "@/lib/domain/types";
import { useData } from "@/lib/client/store";
import { capitalize, dayKey, fmt, parseLocal, timeOf } from "@/lib/dates";
import { deadlineLabel, deadlineLevel } from "@/lib/insights/alerts";
import { balanceAlerts } from "@/lib/insights/balance";
import { allRepetitions } from "@/lib/insights/repetition";
import { momentsBetween } from "@/lib/insights/seasonal";
import { usePostEditor } from "@/components/posts/post-editor-provider";
import { ActivityBadge, PlatformIcon, StatusBadge } from "@/components/posts/post-badges";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader, Progress, Segmented } from "@/components/ui/misc";
import { cn } from "@/lib/utils";
import { HorizontalBars, SegmentedBar } from "./charts";

type Period = "7j" | "30j" | "mois" | "mois+1" | "passe";

function periodRange(period: Period, now = new Date()): { start: Date; end: Date; label: string } {
  const today = startOfDay(now);
  switch (period) {
    case "7j":
      return { start: today, end: addDays(today, 7), label: "7 prochains jours" };
    case "30j":
      return { start: today, end: addDays(today, 30), label: "30 prochains jours" };
    case "mois+1": {
      const s = startOfMonth(addMonths(now, 1));
      return { start: s, end: addDays(endOfMonth(s), 1), label: capitalize(fmt(s, "MMMM yyyy")) };
    }
    case "passe":
      return { start: subDays(today, 30), end: addDays(today, 1), label: "30 derniers jours" };
    default:
      return { start: startOfMonth(now), end: addDays(endOfMonth(now), 1), label: capitalize(fmt(now, "MMMM yyyy")) };
  }
}

function Kpi({ icon, label, value, hint, tone, href }: { icon: React.ReactNode; label: string; value: number; hint?: string; tone?: string; href?: string }) {
  const body = (
    <Card className={cn("h-full p-4 transition-shadow", href && "hover:shadow-md")}>
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <span className="grid h-7 w-7 place-items-center rounded-md [&_svg]:h-4 [&_svg]:w-4" style={{ backgroundColor: `${tone}1f`, color: tone }}>
          {icon}
        </span>
        {label}
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight tabular">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
  return href ? <Link href={href} className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{body}</Link> : body;
}

export function DashboardPage() {
  const { posts, campaigns, ai } = useData();
  const { openPost } = usePostEditor();
  const router = useRouter();
  const [period, setPeriod] = React.useState<Period>("mois");
  const range = periodRange(period);
  const now = new Date();

  const inPeriod = posts.filter((p) => {
    if (!p.scheduledAt) return false;
    const d = parseLocal(p.scheduledAt);
    return d >= range.start && d < range.end;
  });

  const scheduled = inPeriod.filter((p) => p.status === "programme").length;
  const production = inPeriod.filter((p) => PRODUCTION_STATUSES.includes(p.status)).length;
  const toValidate = posts.filter((p) => p.status === "a_valider").length;
  const late = posts.filter((p) => deadlineLevel(p, now) === "late");
  const risky = posts.filter((p) => deadlineLevel(p, now) === "risk");
  const ideas = posts.filter((p) => !p.scheduledAt).length;

  const upcoming = posts
    .filter((p) => p.scheduledAt && isAfter(parseLocal(p.scheduledAt), now) && p.status !== "publie")
    .slice(0, 7);

  const activityData = ACTIVITIES.map((a) => ({
    key: a,
    label: ACTIVITY_LABELS[a],
    value: inPeriod.filter((p) => p.activity === a).length,
    color: ACTIVITY_COLORS[a],
  }));
  const platformData = PLATFORMS.map((p) => ({
    key: p,
    label: PLATFORM_LABELS[p],
    value: inPeriod.filter((x) => x.platform === p).length,
    color: PLATFORM_COLORS[p],
  }));
  const statusData = STATUSES.map((s) => ({
    key: s,
    label: STATUS_LABELS[s],
    value: inPeriod.filter((p) => p.status === s).length,
    color: STATUS_COLORS[s],
  }));

  const today = dayKey(now);
  const activeCampaigns = campaigns.filter((c) => c.endDate >= today).slice(0, 4);
  const balance = balanceAlerts(inPeriod);
  const repetitions = allRepetitions(posts.filter((p) => p.scheduledAt && parseLocal(p.scheduledAt) >= subDays(now, 21))).slice(0, 4);
  const moments = momentsBetween(now, addDays(now, 45)).slice(0, 4);
  const postById = new Map(posts.map((p) => [p.id, p]));

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-8">
      <PageHeader title="Tableau de bord" description={`Vue d'ensemble de la communication · ${capitalize(fmt(now, "EEEE d MMMM"))}`}>
        <Segmented
          value={period}
          onChange={setPeriod}
          options={[
            { value: "7j", label: "7 jours" },
            { value: "30j", label: "30 jours" },
            { value: "mois", label: "Ce mois" },
            { value: "mois+1", label: "Mois prochain" },
            { value: "passe", label: "30 j passés" },
          ]}
        />
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon={<CalendarCheck2 />} label="Programmées" value={scheduled} hint={range.label} tone="#0ca678" href="/calendrier?vue=liste" />
        <Kpi icon={<Hammer />} label="En production" value={production} hint={`À produire + en production · ${range.label.toLowerCase()}`} tone="#1c7ed6" href="/production" />
        <Kpi icon={<Clock />} label="À valider" value={toValidate} hint="Toutes périodes confondues" tone="#ae3ec9" href="/production" />
        <Kpi icon={<AlertTriangle />} label="En retard" value={late.length} hint={risky.length ? `+ ${risky.length} à risque sous 72 h` : "Aucun contenu à risque"} tone="#e03131" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-start justify-between">
            <div>
              <CardTitle>Prochaines publications</CardTitle>
              <CardDescription>Ce qui part bientôt, et où en est la production</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/calendrier">
                Calendrier <ArrowRight />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col divide-y">
            {upcoming.map((p) => {
              const level = deadlineLevel(p, now);
              return (
                <button key={p.id} type="button" onClick={() => openPost(p.id)} className="-mx-2 flex items-center gap-3 rounded-md px-2 py-2.5 text-left transition-colors hover:bg-accent/60">
                  <div className="w-14 shrink-0 text-center">
                    <p className="text-[11px] uppercase text-muted-foreground">{fmt(parseLocal(p.scheduledAt!), "EEE d")}</p>
                    <p className="text-xs font-medium tabular">{timeOf(p.scheduledAt!)}</p>
                  </div>
                  <span className="h-8 w-1 shrink-0 rounded-full" style={{ backgroundColor: ACTIVITY_COLORS[p.activity] }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.title}</p>
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <PlatformIcon platform={p.platform} /> {PLATFORM_LABELS[p.platform]} · {ACTIVITY_LABELS[p.activity]}
                    </p>
                  </div>
                  {level === "risk" && <span className="hidden text-[11px] font-medium text-amber-600 sm:inline">{deadlineLabel(p, now)}</span>}
                  <StatusBadge status={p.status} />
                </button>
              );
            })}
            {!upcoming.length && <EmptyState title="Rien de prévu prochainement">Utilisez « Construire mon planning » pour préparer les semaines à venir.</EmptyState>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Alertes
            </CardTitle>
            <CardDescription>Retards, répétitions et équilibre éditorial</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {late.map((p) => (
              <AlertRow key={p.id} tone="red" icon={<CalendarClock />} onClick={() => openPost(p.id)} title={p.title} text={`${deadlineLabel(p, now)} · ${STATUS_LABELS[p.status]}`} />
            ))}
            {risky.slice(0, 3).map((p) => (
              <AlertRow key={p.id} tone="amber" icon={<Clock />} onClick={() => openPost(p.id)} title={p.title} text={`${deadlineLabel(p, now)} · encore « ${STATUS_LABELS[p.status]} »`} />
            ))}
            {repetitions.map((r) => (
              <AlertRow
                key={`${r.postId}-${r.otherId}`}
                tone="amber"
                icon={<Repeat2 />}
                onClick={() => openPost(r.postId)}
                title={`Risque de répétition`}
                text={`« ${postById.get(r.postId)?.title} » et « ${r.otherTitle} » (${r.daysApart} j d'écart)`}
              />
            ))}
            {balance.slice(0, 3).map((b) => (
              <AlertRow key={`${b.dimension}-${b.key}`} tone="blue" icon={<Scale />} title={`Équilibre : ${b.label}`} text={b.message} onClick={() => router.push("/planning")} />
            ))}
            {!late.length && !risky.length && !repetitions.length && !balance.length && (
              <div className="flex items-center gap-2 rounded-md bg-emerald-500/10 px-3 py-2.5 text-xs text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4" /> Tout est sous contrôle.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Répartition par activité</CardTitle>
            <CardDescription>{range.label} · {inPeriod.length} publication(s) — cliquez pour filtrer</CardDescription>
          </CardHeader>
          <CardContent>
            {inPeriod.length ? <HorizontalBars data={activityData} onSelect={(k) => router.push(`/calendrier?vue=liste&activite=${k}`)} /> : <EmptyState title="Aucune publication sur la période" />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Répartition par plateforme</CardTitle>
            <CardDescription>{range.label}</CardDescription>
          </CardHeader>
          <CardContent>{inPeriod.length ? <HorizontalBars data={platformData} /> : <EmptyState title="Aucune publication sur la période" />}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pipeline de production</CardTitle>
            <CardDescription>Statut des contenus · {range.label.toLowerCase()}</CardDescription>
          </CardHeader>
          <CardContent>{inPeriod.length ? <SegmentedBar data={statusData} /> : <EmptyState title="Aucune publication sur la période" />}</CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-start justify-between">
            <div>
              <CardTitle>Campagnes en cours et à venir</CardTitle>
              <CardDescription>Avancement : part des contenus programmés ou publiés</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/campagnes">
                Campagnes <ArrowRight />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {activeCampaigns.map((c) => {
              const items = posts.filter((p) => p.campaignId === c.id);
              const done = items.filter((p) => p.status === "programme" || p.status === "publie").length;
              const running = c.startDate <= today;
              return (
                <Link key={c.id} href={`/calendrier?campagne=${c.id}`} className="rounded-lg border p-3 transition-colors hover:bg-accent/50">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                    <span className="truncate text-sm font-medium">{c.name}</span>
                    <span className={cn("ml-auto rounded px-1.5 text-[10px] font-medium", running ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground")}>
                      {running ? "En cours" : "À venir"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {fmt(parseLocal(`${c.startDate}T00:00`), "d MMM")} → {fmt(parseLocal(`${c.endDate}T00:00`), "d MMM")} · {items.length} contenu(s)
                  </p>
                  <div className="mt-2.5 flex items-center gap-2">
                    <Progress value={items.length ? (done / items.length) * 100 : 0} color={c.color} />
                    <span className="text-[11px] tabular text-muted-foreground">{done}/{items.length}</span>
                  </div>
                </Link>
              );
            })}
            {!activeCampaigns.length && <EmptyState className="sm:col-span-2" title="Aucune campagne en cours" />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Temps forts à venir
            </CardTitle>
            <CardDescription>Suggestions saisonnières des 45 prochains jours</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {moments.map((m) => (
              <div key={m.id} className="text-sm">
                <p className="font-medium">
                  {m.name}{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    · {fmt(parseLocal(`${m.start}T00:00`), "d MMM")} – {fmt(parseLocal(`${m.end}T00:00`), "d MMM")}
                  </span>
                </p>
                <ul className="mt-1 flex flex-col gap-0.5">
                  {Object.entries(m.ideas)
                    .slice(0, 2)
                    .map(([activity, list]) => (
                      <li key={activity} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <ActivityBadge activity={activity as Post["activity"]} />
                        <span className="truncate">{list?.[0]}</span>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
            <div className="mt-1 flex flex-wrap gap-2 border-t pt-3">
              <Button size="sm" variant="outline" asChild>
                <Link href="/planning">
                  <Wand2 /> Construire mon planning
                </Link>
              </Button>
              <Button size="sm" variant="ghost" asChild>
                <Link href="/assistant">
                  <Sparkles /> Assistant IA{!ai.enabled && " (inactif)"}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">
        {ideas} idée(s) non planifiée(s) dans la boîte à idées. Les statistiques de performance des réseaux sociaux ne sont pas affichées :
        elles proviendront d'imports ou d'intégrations autorisées (voir Paramètres).
      </p>
    </div>
  );
}

function AlertRow({ icon, title, text, tone, onClick }: { icon: React.ReactNode; title: string; text: string; tone: "red" | "amber" | "blue"; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-start gap-2.5 rounded-md px-3 py-2 text-left text-xs transition-colors [&_svg]:mt-0.5 [&_svg]:h-3.5 [&_svg]:w-3.5 [&_svg]:shrink-0",
        tone === "red" && "bg-red-500/10 text-red-800 hover:bg-red-500/15 dark:text-red-200",
        tone === "amber" && "bg-amber-500/10 text-amber-900 hover:bg-amber-500/15 dark:text-amber-200",
        tone === "blue" && "bg-sky-500/10 text-sky-900 hover:bg-sky-500/15 dark:text-sky-200",
      )}
    >
      {icon}
      <span className="min-w-0">
        <span className="block truncate font-medium">{title}</span>
        <span className="block opacity-80">{text}</span>
      </span>
    </button>
  );
}
