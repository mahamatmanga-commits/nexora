"use client";

import * as React from "react";
import { toast } from "sonner";
import { CheckCircle2, Database, Download, FileJson, FileSpreadsheet, KeyRound, Lock, Trash2 } from "lucide-react";
import { api } from "@/lib/client/api";
import { useData } from "@/lib/client/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { AiDisabledNotice } from "@/components/ai/ai-disabled";

const ROADMAP = [
  ["Authentification et comptes", "Connexion via Supabase Auth (e-mail / SSO), une session par membre de l'équipe."],
  ["Rôles et permissions", "Lecteur, rédacteur, validateur, administrateur — par exemple seul un validateur passe un contenu en « Programmé »."],
  ["Base PostgreSQL partagée", "Le schéma est prêt dans supabase/migrations/0001_init.sql ; les dépôts de données sont isolés dans src/lib/server/repositories."],
  ["Stockage médias distant", "Supabase Storage (URL signées, upload résumable) derrière l'interface StorageAdapter."],
  ["Sauvegardes automatiques", "Sauvegarde quotidienne de la base et des médias ; aujourd'hui : export JSON manuel ci-dessus."],
  ["Connexions aux plateformes", "Import des statistiques via les API officielles (Meta, TikTok, LinkedIn) après autorisation — aucune métrique n'est inventée en attendant."],
];

export function SettingsPage() {
  const { ai, posts, campaigns, media, reload } = useData();
  const demoPosts = posts.filter((p) => p.isDemo).length;
  const demoCampaigns = campaigns.filter((c) => c.isDemo).length;

  async function removeDemo() {
    if (!window.confirm(`Supprimer ${demoPosts} publication(s) et ${demoCampaigns} campagne(s) de démonstration ? Vos propres données ne sont pas touchées.`)) return;
    try {
      await api("/api/demo", { method: "DELETE" });
      await reload();
      toast.success("Données de démonstration supprimées");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
  }

  return (
    <div className="flex max-w-4xl flex-col gap-6 p-4 lg:p-8">
      <PageHeader title="Paramètres" description="Données, sauvegardes, assistant IA et feuille de route." />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><KeyRound className="h-4 w-4" /> Assistant IA</CardTitle>
          <CardDescription>Intégration côté serveur uniquement.</CardDescription>
        </CardHeader>
        <CardContent>
          {ai.enabled ? (
            <p className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Activé — modèle <code className="rounded bg-muted px-1 text-xs">{ai.model}</code></p>
          ) : (
            <AiDisabledNotice />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Database className="h-4 w-4" /> Données</CardTitle>
          <CardDescription>
            {posts.length} publication(s) · {campaigns.length} campagne(s) · {media.length} média(s). Base SQLite locale (<code className="text-xs">data/oceades.db</code>), fichiers dans <code className="text-xs">storage/</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <a href="/api/export"><FileSpreadsheet /> Export CSV des publications</a>
          </Button>
          <Button variant="outline" asChild>
            <a href="/api/backup"><FileJson /> Sauvegarde complète (JSON)</a>
          </Button>
          <Button variant="ghost" asChild>
            <a href="/api/posts" target="_blank" rel="noreferrer"><Download /> API JSON</a>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Trash2 className="h-4 w-4" /> Données de démonstration</CardTitle>
          <CardDescription>Les exemples livrés avec l'application sont marqués « Démo ». Supprimez-les quand vous commencez à travailler avec vos propres contenus.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={removeDemo} disabled={!demoPosts && !demoCampaigns}>
            <Trash2 /> Supprimer les données de démo ({demoPosts + demoCampaigns})
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Lock className="h-4 w-4" /> Prochaines étapes (version multi-utilisateur)</CardTitle>
          <CardDescription>Fonctionnalités prévues, pas encore actives dans cette version locale.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col divide-y text-sm">
            {ROADMAP.map(([title, text]) => (
              <li key={title} className="py-2.5">
                <p className="font-medium">{title}</p>
                <p className="text-muted-foreground">{text}</p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
