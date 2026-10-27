"use client";

import * as React from "react";
import { toast } from "sonner";
import { CheckCircle2, FileJson, FileSpreadsheet, Trash2, Upload, X } from "lucide-react";
import type { Settings } from "@/lib/domain/types";
import { api, AUTHOR_KEY, currentAuthor } from "@/lib/client/api";
import { useData } from "@/lib/client/store";
import { Avatar } from "@/components/board/bits";
import { LabelsManager } from "@/components/board/labels-manager";
import { AiDisabledNotice } from "@/components/ai/ai-disabled";
import { cn } from "@/lib/utils";

const SECTIONS = [
  ["profil", "Profil"],
  ["equipe", "Équipe"],
  ["etiquettes", "Étiquettes"],
  ["checklist", "Checklist type"],
  ["equilibre", "Équilibre éditorial"],
  ["trello", "Import Trello"],
  ["donnees", "Données"],
  ["ia", "Assistant IA"],
] as const;
type Section = (typeof SECTIONS)[number][0];

export function SettingsPage() {
  const [section, setSection] = React.useState<Section>("profil");
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-4 lg:flex-row lg:p-8">
      <nav className="flex shrink-0 gap-1 overflow-x-auto lg:w-44 lg:flex-col" aria-label="Sections des paramètres">
        <h1 className="mb-2 hidden px-2 text-xl font-semibold tracking-tight lg:block">Paramètres</h1>
        {SECTIONS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setSection(id)}
            className={cn("h-8 shrink-0 rounded-md px-2 text-left text-[13px] text-muted-foreground hover:bg-accent hover:text-foreground", section === id && "bg-accent text-foreground")}
          >
            {label}
          </button>
        ))}
      </nav>
      <div className="min-w-0 flex-1">
        {section === "profil" && <Profile />}
        {section === "equipe" && <Team />}
        {section === "etiquettes" && <LabelsSection />}
        {section === "checklist" && <ChecklistTemplate />}
        {section === "equilibre" && <Balance />}
        {section === "trello" && <TrelloImport />}
        {section === "donnees" && <DataSection />}
        {section === "ia" && <AiSection />}
      </div>
    </div>
  );
}

function Title({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-[15px] font-semibold">{children}</h2>
      {hint && <p className="mt-0.5 text-[12.5px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

const input = "h-8 rounded-md border bg-card px-2.5 text-[13px] outline-none focus:ring-2 focus:ring-ring/40";
const primary = "h-8 rounded-md bg-primary px-3 text-[13px] font-medium text-primary-foreground disabled:opacity-50";

function Profile() {
  const [name, setName] = React.useState("");
  React.useEffect(() => setName(currentAuthor()), []);
  return (
    <section>
      <Title hint="Utilisé pour signer vos commentaires et l'historique des cartes sur cet appareil.">Profil</Title>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          try {
            localStorage.setItem(AUTHOR_KEY, name.trim());
            toast.success("Nom enregistré");
          } catch {}
        }}
      >
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Votre nom" aria-label="Votre nom" className={cn(input, "w-64")} />
        <button type="submit" className={primary}>
          Enregistrer
        </button>
      </form>
    </section>
  );
}

function Team() {
  const { members, createMember, deleteMember } = useData();
  const [name, setName] = React.useState("");
  return (
    <section>
      <Title hint="Les membres peuvent être désignés responsables d'une carte.">Équipe</Title>
      <ul className="mb-3 flex flex-col divide-y rounded-lg border bg-card">
        {members.map((m) => (
          <li key={m.id} className="flex items-center gap-2.5 px-3 py-2">
            <Avatar member={m} size={26} className="ring-0" />
            <span className="flex-1 text-[13px]">{m.name}</span>
            <button
              type="button"
              onClick={() => window.confirm(`Retirer ${m.name} de l'équipe ? Les cartes concernées n'auront plus de responsable.`) && deleteMember(m.id)}
              className="grid h-7 w-7 place-items-center rounded text-muted-foreground hover:text-destructive"
              aria-label={`Retirer ${m.name}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
        {!members.length && <li className="px-3 py-3 text-[13px] text-muted-foreground">Aucun membre.</li>}
      </ul>
      <form
        className="flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (name.trim() && (await createMember(name.trim()))) setName("");
        }}
      >
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom" aria-label="Nom du membre" className={cn(input, "w-64")} />
        <button type="submit" disabled={!name.trim()} className={primary}>
          Ajouter
        </button>
      </form>
    </section>
  );
}

function LabelsSection() {
  const { labels } = useData();
  const [open, setOpen] = React.useState(false);
  return (
    <section>
      <Title hint="Activité, plateforme, format, production et étiquettes libres. Couleurs et noms modifiables.">Étiquettes</Title>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {labels.map((l) => (
          <span key={l.id} className="inline-flex h-6 items-center rounded px-2 text-[12px] font-medium text-white" style={{ backgroundColor: l.color }}>
            {l.name}
          </span>
        ))}
      </div>
      <button type="button" onClick={() => setOpen(true)} className={primary}>
        Gérer les étiquettes
      </button>
      {open && <LabelsManager open onOpenChange={setOpen} />}
    </section>
  );
}

function useSettingsDraft() {
  const { settings, saveSettings } = useData();
  const [draft, setDraft] = React.useState<Settings | null>(settings);
  React.useEffect(() => setDraft(settings), [settings]);
  return { draft, setDraft, save: async () => draft && (await saveSettings(draft)) && toast.success("Enregistré") };
}

function ChecklistTemplate() {
  const { draft, setDraft, save } = useSettingsDraft();
  const [text, setText] = React.useState("");
  if (!draft) return null;
  const items = draft.defaultChecklist;
  return (
    <section>
      <Title hint="Ajoutée automatiquement à chaque nouvelle carte.">Checklist type</Title>
      <label className="mb-3 flex items-center gap-2 text-[13px]">
        <input type="checkbox" checked={draft.autoChecklist} onChange={(e) => setDraft({ ...draft, autoChecklist: e.target.checked })} />
        Appliquer aux nouvelles cartes
      </label>
      <ol className="mb-3 flex flex-col divide-y rounded-lg border bg-card">
        {items.map((it, i) => (
          <li key={`${it}-${i}`} className="flex items-center gap-2 px-3 py-1.5 text-[13px]">
            <span className="w-5 text-[11px] tabular text-muted-foreground">{i + 1}</span>
            <span className="flex-1">{it}</span>
            <button type="button" onClick={() => setDraft({ ...draft, defaultChecklist: items.filter((_, n) => n !== i) })} className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:text-destructive" aria-label={`Retirer ${it}`}>
              <X className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ol>
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && text.trim()) {
              setDraft({ ...draft, defaultChecklist: [...items, text.trim()] });
              setText("");
            }
          }}
          placeholder="Nouvel élément (Entrée)"
          aria-label="Nouvel élément"
          className={cn(input, "w-64")}
        />
        <button type="button" onClick={save} className={primary}>
          Enregistrer
        </button>
      </div>
    </section>
  );
}

function Balance() {
  const { labels } = useData();
  const { draft, setDraft, save } = useSettingsDraft();
  if (!draft) return null;
  const acts = labels.filter((l) => l.family === "activite" && l.key && l.key !== "global");
  const total = acts.reduce((s, l) => s + (draft.balanceTargets[l.key!] ?? 0), 0);
  return (
    <section>
      <Title hint="Répartition souhaitée des contenus par activité. Sert aux alertes, aux statistiques et à « Organiser mon mois ».">Équilibre éditorial</Title>
      <div className="flex max-w-md flex-col gap-3">
        {acts.map((l) => {
          const v = draft.balanceTargets[l.key!] ?? 0;
          return (
            <label key={l.id} className="flex items-center gap-3 text-[13px]">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: l.color }} />
              <span className="w-28">{l.name}</span>
              <input type="range" min={0} max={100} step={5} value={v} onChange={(e) => setDraft({ ...draft, balanceTargets: { ...draft.balanceTargets, [l.key!]: Number(e.target.value) } })} className="flex-1 accent-[hsl(var(--primary))]" aria-label={l.name} />
              <span className="w-10 text-right tabular">{v} %</span>
            </label>
          );
        })}
        <p className={cn("text-[12px] text-muted-foreground", total !== 100 && "text-[#e2b203]")}>Total : {total} %{total !== 100 && " (idéalement 100 %)"}</p>
        <button type="button" onClick={save} className={cn(primary, "self-start")}>
          Enregistrer
        </button>
      </div>
    </section>
  );
}

interface Preview {
  boardName: string;
  lists: { name: string; kind: string; cards: number; archived: boolean }[];
  cards: number;
  archivedCards: number;
  labels: { name: string; color: string; matched: string | null }[];
  checklistItems: number;
  comments: number;
  attachments: number;
  members: string[];
  duplicates: { title: string; existingIn: string }[];
  warnings: string[];
}

function TrelloImport() {
  const { reload, selectBoard } = useData();
  const [data, setData] = React.useState<unknown>(null);
  const [preview, setPreview] = React.useState<Preview | null>(null);
  const [skip, setSkip] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const json = JSON.parse(await file.text());
      const p = await api<Preview>("/api/import/trello", { method: "POST", json: { mode: "preview", data: json } });
      setData(json);
      setPreview(p);
    } catch (e) {
      toast.error(e instanceof SyntaxError ? "Fichier JSON illisible." : e instanceof Error ? e.message : "Import impossible");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function confirm() {
    setBusy(true);
    try {
      const res = await api<{ boardId: string; cards: number; skipped: number }>("/api/import/trello", { method: "POST", json: { mode: "import", data, skipDuplicates: skip } });
      toast.success(`${res.cards} carte(s) importée(s)${res.skipped ? `, ${res.skipped} doublon(s) ignoré(s)` : ""}`);
      setPreview(null);
      setData(null);
      await reload();
      await selectBoard(res.boardId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import impossible");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <Title hint="Dans Trello : menu du tableau → Imprimer, exporter et partager → Exporter au format JSON. Le tableau Trello n'est jamais modifié.">Import Trello</Title>
      {!preview ? (
        <>
          <button type="button" onClick={() => fileRef.current?.click()} disabled={busy} className={cn(primary, "inline-flex items-center gap-1.5")}>
            <Upload className="h-4 w-4" /> Choisir le fichier JSON
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => onFile(e.target.files?.[0])} />
        </>
      ) : (
        <div className="flex flex-col gap-4 rounded-lg border bg-card p-4">
          <div>
            <p className="text-[14px] font-medium">{preview.boardName}</p>
            <p className="text-[12.5px] text-muted-foreground">
              {preview.lists.length} listes · {preview.cards} cartes{preview.archivedCards ? ` (+ ${preview.archivedCards} archivées)` : ""} · {preview.labels.length} étiquettes · {preview.checklistItems} éléments de checklist · {preview.comments} commentaires · {preview.attachments} pièces jointes
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {preview.lists.map((l, i) => (
              <span key={i} className={cn("rounded-md bg-muted px-2 py-1 text-[12px]", l.archived && "opacity-50")}>
                {l.name} <span className="text-muted-foreground">· {l.cards}</span>
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {preview.labels.map((l, i) => (
              <span key={i} className="inline-flex h-6 items-center gap-1 rounded px-2 text-[12px] text-white" style={{ backgroundColor: l.color }} title={l.matched ? `Associée à l'étiquette existante « ${l.matched} »` : "Nouvelle étiquette"}>
                {l.name}
                {l.matched && <CheckCircle2 className="h-3 w-3" />}
              </span>
            ))}
          </div>
          {preview.duplicates.length > 0 && (
            <div className="rounded-md bg-[#7f5f01]/15 p-3 text-[12.5px]">
              <p className="mb-1 font-medium">{preview.duplicates.length} doublon(s) possible(s)</p>
              <ul className="mb-2 max-h-28 overflow-y-auto text-muted-foreground">
                {preview.duplicates.map((d, i) => (
                  <li key={i}>
                    « {d.title} » existe déjà dans {d.existingIn}
                  </li>
                ))}
              </ul>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={skip} onChange={(e) => setSkip(e.target.checked)} /> Ignorer ces cartes
              </label>
            </div>
          )}
          <ul className="list-inside list-disc text-[12px] text-muted-foreground">
            {preview.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
          <div className="flex gap-2">
            <button type="button" onClick={confirm} disabled={busy} className={primary}>
              Importer dans un nouveau tableau
            </button>
            <button type="button" onClick={() => setPreview(null)} className="h-8 rounded-md px-3 text-[13px] text-muted-foreground hover:bg-accent">
              Annuler
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function DataSection() {
  const { cards, campaigns, reload } = useData();
  const demo = cards.filter((c) => c.isDemo).length + campaigns.filter((c) => c.isDemo).length;
  return (
    <section className="flex flex-col gap-6">
      <div>
        <Title hint="Base locale : data/oceades.db · fichiers : storage/">Données</Title>
        <div className="flex flex-wrap gap-2">
          <a href="/api/export" className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-card px-3 text-[13px] hover:bg-accent">
            <FileSpreadsheet className="h-4 w-4" /> Export CSV
          </a>
          <a href="/api/backup" className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-card px-3 text-[13px] hover:bg-accent">
            <FileJson className="h-4 w-4" /> Sauvegarde JSON
          </a>
        </div>
      </div>
      {demo > 0 && (
        <div>
          <Title hint="Les exemples livrés avec l'application.">Données de démonstration</Title>
          <button
            type="button"
            onClick={async () => {
              if (!window.confirm(`Supprimer ${demo} élément(s) de démonstration ? Vos propres données ne sont pas touchées.`)) return;
              await api("/api/demo", { method: "DELETE" });
              await reload();
              toast.success("Données de démonstration supprimées");
            }}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-card px-3 text-[13px] hover:bg-accent"
          >
            <Trash2 className="h-4 w-4" /> Supprimer ({demo})
          </button>
        </div>
      )}
      <div>
        <Title hint="Prévu pour la version multi-utilisateur (Supabase) : comptes, rôles, sauvegardes automatiques, statistiques Meta et Instagram après autorisation.">À venir</Title>
      </div>
    </section>
  );
}

function AiSection() {
  const { ai } = useData();
  return (
    <section>
      <Title>Assistant IA</Title>
      {ai.enabled ? (
        <p className="flex items-center gap-2 text-[13px]">
          <CheckCircle2 className="h-4 w-4 text-[#4bce97]" /> Activé · modèle {ai.model}
        </p>
      ) : (
        <AiDisabledNotice />
      )}
    </section>
  );
}

