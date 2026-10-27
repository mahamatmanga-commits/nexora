"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { toast } from "sonner";
import {
  AlignLeft,
  Archive,
  ArchiveRestore,
  CalendarClock,
  Copy,
  FileText,
  GitBranch,
  MoreHorizontal,
  Plus,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { CAPTION_LIMITS, OBJECTIVES, OBJECTIVE_LABELS, STATUSES, STATUS_COLORS, STATUS_LABELS, type Objective, type Status } from "@/lib/domain/constants";
import type { Card } from "@/lib/domain/types";
import { mediaUrl, useData, useIndexes } from "@/lib/client/store";
import { useWeekSync } from "@/lib/client/use-week-sync";
import { cardLabels, dueLabel, dueState, labelKey } from "@/lib/cards";
import { fmt, parseLocal } from "@/lib/dates";
import { findRepetitions } from "@/lib/insights/repetition";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, LabelPill } from "@/components/board/bits";
import { Segmented } from "@/components/ui/misc";
import { cn } from "@/lib/utils";
import { ActivitySection } from "./activity-section";
import { AiMenu, AiResults, type AiResult } from "./ai-panel";
import { ChecklistSection } from "./checklist-section";
import { AutoTextarea, AutosaveTextarea, chipButton, MetaBlock, SectionTitle, useAutosave } from "./fields";
import { LabelPicker } from "./label-picker";
import { MediaSection } from "./media-section";

const FAMILY_ORDER = ["activite", "plateforme", "format", "production", "autre"];

type ContentTab = "hook" | "caption" | "script" | "brief" | "cta";
const CONTENT_TABS: { value: ContentTab; label: string; placeholder: string; rows: number }[] = [
  { value: "hook", label: "Accroche", placeholder: "Ce qui arrête le scroll dans les premières secondes", rows: 2 },
  { value: "caption", label: "Texte du post", placeholder: "Le texte qui accompagne la publication", rows: 6 },
  { value: "script", label: "Script", placeholder: "Plan par plan, voix off, textes à l'écran… ou déroulé des slides", rows: 6 },
  { value: "brief", label: "Brief créatif", placeholder: "Consignes pour la photo, la vidéo ou le visuel", rows: 4 },
  { value: "cta", label: "CTA", placeholder: "L'action attendue après la publication", rows: 1 },
];

/** Déclinaisons proposées à partir d'un contenu (les versions restent liées à l'original). */
const DECLINATIONS = [
  { id: "story", label: "Reel → Story", remove: ["format"], add: ["story"], suffix: "Story" },
  { id: "carrousel", label: "Reel → Carrousel", remove: ["format"], add: ["carrousel"], suffix: "Carrousel" },
  { id: "facebook", label: "Instagram → Facebook", remove: ["plateforme"], add: ["facebook"], suffix: "Facebook" },
  { id: "ads", label: "Vidéo organique → Brief Meta Ads", remove: ["plateforme", "format"], add: ["meta_ads", "publicite"], suffix: "Meta Ads" },
] as const;

export function CardModal({ cardId, onClose, onSwitch }: { cardId: string; onClose: () => void; onSwitch: (id: string) => void }) {
  const store = useData();
  const { cards, lists, members, campaigns, updateCard, duplicateCard, declineCard, deleteCard, createMember } = store;
  const { labelById, memberById, mediaById } = useIndexes();
  const { afterDateChange, afterListChange } = useWeekSync();
  const card = cards.find((c) => c.id === cardId);
  const [tab, setTab] = React.useState<ContentTab>(() => (card?.caption ? "caption" : "hook"));
  const [ai, setAi] = React.useState<{ result: AiResult | null; loading: boolean }>({ result: null, loading: false });
  const title = useAutosave(cardId, "title", card?.title ?? "");

  if (!card) return null;

  const list = lists.find((l) => l.id === card.listId);
  const labels = cardLabels(card, labelById).sort((a, b) => FAMILY_ORDER.indexOf(a.family) - FAMILY_ORDER.indexOf(b.family) || a.position - b.position);
  const platformKey = cardLabels(card, labelById, "plateforme").map(labelKey)[0] ?? "instagram";
  const limit = CAPTION_LIMITS[platformKey] ?? CAPTION_LIMITS.instagram;
  const assignee = card.assigneeId ? memberById.get(card.assigneeId) : undefined;
  const cover = card.coverMediaId ? mediaById.get(card.coverMediaId) : undefined;
  const due = dueState(card);
  const repetitions = findRepetitions(card, cards).slice(0, 2);
  const parent = card.parentCardId ? cards.find((c) => c.id === card.parentCardId) : undefined;
  const children = cards.filter((c) => c.parentCardId === card.id && !c.archivedAt);
  const tabDef = CONTENT_TABS.find((t) => t.value === tab)!;

  async function setDate(scheduledAt: string | null) {
    const ok = await updateCard(card!.id, { scheduledAt });
    if (ok) afterDateChange(card!, scheduledAt);
  }

  async function moveTo(listId: string) {
    const target = cards.filter((c) => c.listId === listId);
    const ok = await updateCard(card!.id, { listId, position: Math.max(0, ...target.map((c) => c.position)) + 1024 });
    if (ok) afterListChange(card!, listId);
  }

  async function setStatus(status: Status) {
    await updateCard(card!.id, { status });
    const done = lists.find((l) => l.kind === "done" && !l.archivedAt);
    if (status === "publie" && done && card!.listId !== done.id) {
      toast("Carte marquée comme publiée.", { action: { label: `Déplacer vers ${done.name}`, onClick: () => void moveTo(done.id) } });
    }
  }

  async function decline(d: (typeof DECLINATIONS)[number]) {
    const keep = card!.labelIds.filter((id) => !(d.remove as readonly string[]).includes(labelById.get(id)?.family ?? ""));
    const add = [...labelById.values()].filter((l) => l.key && (d.add as readonly string[]).includes(l.key)).map((l) => l.id);
    const created = await declineCard(card!.id, {
      title: `${card!.title} — ${d.suffix}`,
      labelIds: [...keep, ...add],
      brief: d.id === "ads" ? `Brief Meta Ads tiré de « ${card!.title} »\nObjectif publicitaire : \nAudience : \nAccroche (3 premières secondes) : ${card!.hook}\nMessage clé : \nCTA / bouton : ${card!.cta}\nFormats : 9:16 et 4:5` : undefined,
    });
    if (created) {
      toast.success("Déclinaison créée");
      onSwitch(created.id);
    }
  }

  async function archive() {
    if (await updateCard(card!.id, { archived: true })) {
      toast("Carte archivée", { action: { label: "Annuler", onClick: () => void updateCard(cardId, { archived: false }) } });
      onClose();
    }
  }

  return (
    <DialogPrimitive.Root open onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed inset-x-0 top-0 z-50 mx-auto flex max-h-dvh w-full max-w-[820px] flex-col overflow-hidden bg-popover shadow-2xl outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-2 sm:top-10 sm:max-h-[calc(100dvh-5rem)] sm:w-[calc(100vw-2rem)] sm:rounded-xl"
          aria-describedby={undefined}
          onOpenAutoFocus={(e) => e.preventDefault()}
          // Les notifications (ex. « Déplacer vers la semaine… ») restent cliquables sans fermer la fiche.
          onInteractOutside={(e) => {
            if ((e.target as HTMLElement | null)?.closest?.("[data-sonner-toaster]")) e.preventDefault();
          }}
        >
          {cover && (
            <div className="relative h-40 shrink-0 bg-muted">
              {cover.mimeType.startsWith("video/") ? (
                <video src={`${mediaUrl(cover.id)}#t=0.5`} preload="metadata" muted playsInline className="h-full w-full object-contain" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mediaUrl(cover.id)} alt="" className="h-full w-full object-contain" />
              )}
            </div>
          )}
          <div className="overflow-y-auto scrollbar-thin">
            {/* En-tête */}
            <div className="flex items-start gap-2 px-6 pb-2 pt-5">
              <div className="min-w-0 flex-1">
                <DialogPrimitive.Title asChild>
                  <AutoTextarea
                    value={title.value}
                    onChange={(e) => title.onChange(e.target.value.replace(/\n/g, " "))}
                    onBlur={title.flush}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), e.currentTarget.blur())}
                    minRows={1}
                    aria-label="Titre"
                    className="-ml-2 bg-transparent px-2 py-1 text-lg font-semibold leading-snug hover:bg-muted/60"
                  />
                </DialogPrimitive.Title>
                <div className="mt-0.5 flex items-center gap-1 text-[12.5px] text-muted-foreground">
                  dans la liste
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button type="button" className="rounded px-1 font-medium text-foreground/90 underline-offset-2 hover:underline">
                        {list?.name}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="max-h-80 w-64 overflow-y-auto">
                      <DropdownMenuLabel>Déplacer vers…</DropdownMenuLabel>
                      {lists
                        .filter((l) => !l.archivedAt)
                        .map((l) => (
                          <DropdownMenuItem key={l.id} disabled={l.id === card.listId} onSelect={() => moveTo(l.id)}>
                            {l.name}
                          </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {card.archivedAt && <span className="ml-2 rounded bg-[#7f5f01] px-1.5 text-[11px] text-white">Archivée</span>}
                  {card.isDemo && <span className="ml-2 rounded border border-dashed px-1 text-[10px] uppercase tracking-wide">Démo</span>}
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Actions de la carte">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                  <DropdownMenuItem
                    onSelect={async () => {
                      const copy = await duplicateCard(card.id);
                      if (copy) {
                        toast.success("Carte dupliquée");
                        onSwitch(copy.id);
                      }
                    }}
                  >
                    <Copy /> Dupliquer
                  </DropdownMenuItem>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <GitBranch /> Décliner
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-60">
                      {DECLINATIONS.map((d) => (
                        <DropdownMenuItem key={d.id} onSelect={() => decline(d)}>
                          {d.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuSeparator />
                  {card.archivedAt ? (
                    <>
                      <DropdownMenuItem onSelect={() => updateCard(card.id, { archived: false })}>
                        <ArchiveRestore /> Restaurer
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        destructive
                        onSelect={async () => {
                          if (window.confirm("Supprimer définitivement cette carte ? Cette action est irréversible.") && (await deleteCard(card.id))) onClose();
                        }}
                      >
                        <Trash2 /> Supprimer définitivement
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <DropdownMenuItem onSelect={archive}>
                      <Archive /> Archiver
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              <DialogPrimitive.Close className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Fermer">
                <X className="h-4 w-4" />
              </DialogPrimitive.Close>
            </div>

            <div className="grid gap-x-8 gap-y-6 px-6 pb-8 md:grid-cols-[minmax(0,1fr)_200px]">
              <div className="flex min-w-0 flex-col gap-6">
                {/* Méta : étiquettes, statut, date, responsable */}
                <div className="flex flex-wrap gap-x-6 gap-y-3">
                  <MetaBlock title="Étiquettes">
                    {labels.map((l) => (
                      <LabelPicker key={l.id} selected={card.labelIds} onChange={(ids) => updateCard(card.id, { labelIds: ids })}>
                        <button type="button" className="rounded">
                          <LabelPill label={l} className="h-7 px-2.5 text-[12px]" />
                        </button>
                      </LabelPicker>
                    ))}
                    <LabelPicker selected={card.labelIds} onChange={(ids) => updateCard(card.id, { labelIds: ids })}>
                      <button type="button" className={cn(chipButton, "w-7 justify-center px-0")} aria-label="Ajouter une étiquette">
                        <Plus className="h-4 w-4" />
                      </button>
                    </LabelPicker>
                  </MetaBlock>
                  <MetaBlock title="Statut">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button type="button" className={chipButton}>
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[card.status] }} />
                          {STATUS_LABELS[card.status]}
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        {STATUSES.map((s) => (
                          <DropdownMenuItem key={s} onSelect={() => setStatus(s)}>
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[s] }} />
                            {STATUS_LABELS[s]}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </MetaBlock>
                  <MetaBlock title="Publication">
                    <DateButton card={card} onChange={setDate} due={due} />
                  </MetaBlock>
                  <MetaBlock title="Responsable">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button type="button" className={cn(chipButton, assignee && "pl-1")}>
                          {assignee ? (
                            <>
                              <Avatar member={assignee} size={20} className="ring-0" />
                              {assignee.name}
                            </>
                          ) : (
                            <>
                              <UserPlus className="h-3.5 w-3.5" /> Assigner
                            </>
                          )}
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-56">
                        {members.map((m) => (
                          <DropdownMenuItem key={m.id} onSelect={() => updateCard(card.id, { assigneeId: m.id })}>
                            <Avatar member={m} size={20} className="ring-0" /> {m.name}
                          </DropdownMenuItem>
                        ))}
                        {card.assigneeId && <DropdownMenuItem onSelect={() => updateCard(card.id, { assigneeId: null })}>Retirer le responsable</DropdownMenuItem>}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onSelect={async () => {
                            const name = window.prompt("Nom du membre de l'équipe");
                            if (!name?.trim()) return;
                            const m = await createMember(name.trim());
                            if (m) await updateCard(card.id, { assigneeId: m.id });
                          }}
                        >
                          <UserPlus /> Ajouter un membre
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </MetaBlock>
                </div>

                {repetitions.length > 0 && (
                  <button type="button" onClick={() => onSwitch(repetitions[0].otherId)} className="-mt-2 rounded-md bg-[#7f5f01]/15 px-3 py-2 text-left text-[12.5px] text-foreground/90 hover:bg-[#7f5f01]/25">
                    Un contenu proche {repetitions[0].published ? "a déjà été publié" : "est déjà prévu"} récemment (« {repetitions[0].otherTitle} »). Souhaites-tu essayer un autre angle ?
                  </button>
                )}

                <section>
                  <SectionTitle icon={<AlignLeft />}>Description interne</SectionTitle>
                  <AutosaveTextarea cardId={card.id} field="description" value={card.description} placeholder="Contexte, consignes, informations utiles à l'équipe…" minRows={2} ariaLabel="Description interne" />
                </section>

                <section>
                  <SectionTitle icon={<FileText />} action={<AiMenu card={card} onResult={(result, loading) => setAi({ result, loading })} />}>
                    Contenu
                  </SectionTitle>
                  <Segmented value={tab} onChange={setTab} options={CONTENT_TABS.map((t) => ({ value: t.value, label: t.label + (card[t.value] ? " ·" : "") }))} className="mb-2 max-w-full overflow-x-auto" />
                  <AutosaveTextarea key={tab} cardId={card.id} field={tab} value={card[tab]} placeholder={tabDef.placeholder} minRows={tabDef.rows} ariaLabel={tabDef.label} />
                  {tab === "caption" && card.caption.length > 0 && (
                    <p className={cn("mt-1 text-right text-[11px] tabular text-muted-foreground", card.caption.length > limit.recommended && "text-[#e2b203]", card.caption.length > limit.max && "text-destructive")}>
                      {card.caption.length} / {limit.recommended} conseillés
                    </p>
                  )}
                  <div className="mt-2">
                    <AiResults card={card} result={ai.result} loading={ai.loading} onClose={() => setAi({ result: null, loading: false })} />
                  </div>
                </section>

                <ChecklistSection card={card} />
                <MediaSection card={card} />

                {(parent || children.length > 0) && (
                  <section>
                    <SectionTitle icon={<GitBranch />}>Versions</SectionTitle>
                    <ul className="flex flex-col gap-1">
                      {parent && (
                        <li>
                          <button type="button" onClick={() => onSwitch(parent.id)} className="text-[13px] text-primary hover:underline">
                            Original : {parent.title}
                          </button>
                        </li>
                      )}
                      {children.map((c) => (
                        <li key={c.id}>
                          <button type="button" onClick={() => onSwitch(c.id)} className="text-[13px] text-primary hover:underline">
                            {c.title}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                <ActivitySection cardId={card.id} />
              </div>

              {/* Informations secondaires */}
              <aside className="flex flex-col gap-4 self-start text-[13px] md:sticky md:top-0">
                <SideField label="Objectif">
                  <select
                    value={card.objective ?? ""}
                    onChange={(e) => updateCard(card.id, { objective: (e.target.value || null) as Objective | null })}
                    className="h-8 w-full rounded-md bg-muted px-2 text-[13px] outline-none hover:bg-accent focus:ring-2 focus:ring-ring/40"
                    aria-label="Objectif marketing"
                  >
                    <option value="">—</option>
                    {OBJECTIVES.map((o) => (
                      <option key={o} value={o}>
                        {OBJECTIVE_LABELS[o]}
                      </option>
                    ))}
                  </select>
                </SideField>
                <SideField label="Campagne">
                  <select
                    value={card.campaignId ?? ""}
                    onChange={(e) => updateCard(card.id, { campaignId: e.target.value || null })}
                    className="h-8 w-full rounded-md bg-muted px-2 text-[13px] outline-none hover:bg-accent focus:ring-2 focus:ring-ring/40"
                    aria-label="Campagne"
                  >
                    <option value="">—</option>
                    {campaigns.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </SideField>
                <SideField label="Cible">
                  <AutosaveTextarea cardId={card.id} field="target" value={card.target} placeholder="Ex. débutants, 25-40 ans" minRows={1} ariaLabel="Cible" className="px-2 py-1.5 text-[13px]" />
                </SideField>
                <SideField label="Production">
                  <input
                    type="date"
                    value={card.productionDate ?? ""}
                    onChange={(e) => updateCard(card.id, { productionDate: e.target.value || null })}
                    className="h-8 w-full rounded-md bg-muted px-2 text-[13px] outline-none hover:bg-accent focus:ring-2 focus:ring-ring/40"
                    aria-label="Date de production"
                  />
                </SideField>
                <SideField label="Validation avant le">
                  <input
                    type="date"
                    value={card.validationDate ?? ""}
                    onChange={(e) => updateCard(card.id, { validationDate: e.target.value || null })}
                    className="h-8 w-full rounded-md bg-muted px-2 text-[13px] outline-none hover:bg-accent focus:ring-2 focus:ring-ring/40"
                    aria-label="Date limite de validation"
                  />
                </SideField>
                <p className="text-[11px] text-muted-foreground">Créée le {fmt(new Date(card.createdAt), "d MMM yyyy")}</p>
              </aside>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function SideField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function DateButton({ card, onChange, due }: { card: Card; onChange: (v: string | null) => void; due: ReturnType<typeof dueState> }) {
  const [date, setDate] = React.useState(card.scheduledAt?.slice(0, 10) ?? "");
  const [time, setTime] = React.useState(card.scheduledAt?.slice(11, 16) ?? "12:00");
  React.useEffect(() => {
    setDate(card.scheduledAt?.slice(0, 10) ?? "");
    setTime(card.scheduledAt?.slice(11, 16) ?? "12:00");
  }, [card.scheduledAt]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(chipButton, due === "late" && "bg-[#ae2e24] text-white hover:bg-[#ae2e24]/90", due === "soon" && "bg-[#7f5f01] text-white hover:bg-[#7f5f01]/90", due === "done" && "bg-[#216e4e] text-white hover:bg-[#216e4e]/90")}
        >
          <CalendarClock className="h-3.5 w-3.5" />
          {card.scheduledAt ? fmt(parseLocal(card.scheduledAt), "d MMM 'à' HH:mm") : "Ajouter une date"}
          {(due === "late" || due === "soon") && <span className="text-[11px] opacity-90">· {dueLabel(card)}</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="flex w-64 flex-col gap-2">
        <p className="text-[13px] font-semibold">Date de publication</p>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-8 rounded-md border bg-card px-2 text-[13px]" aria-label="Date" />
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-8 rounded-md border bg-card px-2 text-[13px]" aria-label="Heure" />
        <div className="flex gap-2 pt-1">
          <button type="button" disabled={!date} onClick={() => onChange(`${date}T${time || "12:00"}`)} className="h-8 flex-1 rounded-md bg-primary text-[13px] font-medium text-primary-foreground disabled:opacity-50">
            Enregistrer
          </button>
          {card.scheduledAt && (
            <button type="button" onClick={() => onChange(null)} className="h-8 rounded-md px-3 text-[13px] text-muted-foreground hover:bg-accent">
              Retirer
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
