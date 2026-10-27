"use client";

import * as React from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { ACTIVITY_KEYS, CAMPAIGN_COLORS, CAMPAIGN_KINDS, CAMPAIGN_KIND_LABELS, type ActivityKey } from "@/lib/domain/constants";
import { campaignInputSchema, type CampaignInput } from "@/lib/domain/schemas";
import type { Campaign } from "@/lib/domain/types";
import { useData } from "@/lib/client/store";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label, NativeSelect, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { dayKey } from "@/lib/dates";
import { addDays } from "date-fns";

type Errors = Partial<Record<keyof CampaignInput, string>>;

export function CampaignDialog({ open, onOpenChange, campaign }: { open: boolean; onOpenChange: (o: boolean) => void; campaign: Campaign | null }) {
  const { createCampaign, updateCampaign, deleteCampaign, cards, labels } = useData();
  const activityLabel = (k: ActivityKey) => labels.find((l) => l.key === k);
  const initial: CampaignInput = campaign
    ? {
        name: campaign.name,
        kind: campaign.kind,
        objective: campaign.objective,
        brief: campaign.brief,
        startDate: campaign.startDate,
        endDate: campaign.endDate,
        activities: campaign.activities,
        targetAudience: campaign.targetAudience,
        keyMessages: campaign.keyMessages,
        color: campaign.color,
      }
    : {
        name: "",
        kind: "campagne",
        objective: "",
        brief: "",
        startDate: dayKey(new Date()),
        endDate: dayKey(addDays(new Date(), 14)),
        activities: [],
        targetAudience: "",
        keyMessages: "",
        color: CAMPAIGN_COLORS[1],
      };
  const [form, setForm] = React.useState<CampaignInput>(initial);
  const [errors, setErrors] = React.useState<Errors>({});
  const [saving, setSaving] = React.useState(false);
  const set = <K extends keyof CampaignInput>(k: K, v: CampaignInput[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  async function save() {
    const parsed = campaignInputSchema.safeParse(form);
    if (!parsed.success) {
      const errs: Errors = {};
      for (const i of parsed.error.issues) errs[i.path[0] as keyof CampaignInput] ??= i.message;
      setErrors(errs);
      return;
    }
    setSaving(true);
    const res = campaign ? await updateCampaign(campaign.id, parsed.data) : await createCampaign(parsed.data);
    setSaving(false);
    if (res) {
      toast.success(campaign ? "Campagne mise à jour" : "Campagne créée");
      onOpenChange(false);
    }
  }

  async function remove() {
    if (!campaign) return;
    const count = cards.filter((p) => p.campaignId === campaign.id).length;
    if (!window.confirm(`Supprimer « ${campaign.name} » ?${count ? ` Les ${count} carte(s) associée(s) seront conservées mais détachées.` : ""}`)) return;
    if (await deleteCampaign(campaign.id)) {
      toast.success("Campagne supprimée");
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{campaign ? "Modifier la campagne" : "Nouvelle campagne"}</DialogTitle>
          <DialogDescription className="sr-only">Informations de la campagne</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 overflow-y-auto p-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="c-name">Nom</Label>
            <Input id="c-name" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Ex. Rentrée sportive 2027" autoFocus />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Type</Label>
            <NativeSelect value={form.kind} onChange={(e) => set("kind", e.target.value as CampaignInput["kind"])}>
              {CAMPAIGN_KINDS.map((k) => (
                <option key={k} value={k}>{CAMPAIGN_KIND_LABELS[k]}</option>
              ))}
            </NativeSelect>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Couleur</Label>
            <div className="flex h-9 items-center gap-1.5">
              {CAMPAIGN_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => set("color", c)}
                  className={cn("h-6 w-6 rounded-full ring-offset-2 ring-offset-card transition", form.color === c && "ring-2 ring-ring")}
                  style={{ backgroundColor: c }}
                  aria-label={`Couleur ${c}`}
                  aria-pressed={form.color === c}
                />
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="c-start">Début</Label>
            <Input id="c-start" type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
            {errors.startDate && <p className="text-xs text-destructive">{errors.startDate}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="c-end">Fin</Label>
            <Input id="c-end" type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} />
            {errors.endDate && <p className="text-xs text-destructive">{errors.endDate}</p>}
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label>Activités concernées</Label>
            <div className="flex flex-wrap gap-1.5">
              {ACTIVITY_KEYS.map((a) => {
                const on = form.activities.includes(a);
                const label = activityLabel(a);
                const color = label?.color ?? "#596773";
                return (
                  <button
                    key={a}
                    type="button"
                    aria-pressed={on}
                    onClick={() => set("activities", on ? form.activities.filter((x) => x !== a) : [...form.activities, a])}
                    className={cn("rounded-md border px-2.5 py-1 text-xs transition", on && "border-transparent font-medium")}
                    style={on ? { backgroundColor: color, color: "#fff" } : undefined}
                  >
                    {label?.name ?? a}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="c-obj">Objectif</Label>
            <Input id="c-obj" value={form.objective} onChange={(e) => set("objective", e.target.value)} placeholder="Ex. 150 séances d'essai réservées" />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="c-brief">Brief</Label>
            <Textarea id="c-brief" rows={3} value={form.brief} onChange={(e) => set("brief", e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="c-target">Public cible</Label>
            <Input id="c-target" value={form.targetAudience} onChange={(e) => set("targetAudience", e.target.value)} placeholder="Ex. Actifs 25-45 ans, anciens adhérents" />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="c-msg">Messages clés (un par ligne)</Label>
            <Textarea id="c-msg" rows={4} value={form.keyMessages} onChange={(e) => set("keyMessages", e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          {campaign && (
            <Button variant="ghost" className="mr-auto text-destructive hover:text-destructive" onClick={remove}>
              <Trash2 /> Supprimer
            </Button>
          )}
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Enregistrement…" : campaign ? "Enregistrer" : "Créer la campagne"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
