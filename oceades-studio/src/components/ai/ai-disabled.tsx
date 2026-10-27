import { KeyRound } from "lucide-react";

/** Bannière affichée quand aucune clé API n'est configurée : les fonctions IA sont désactivées, rien n'est simulé. */
export function AiDisabledNotice({ context }: { context?: string }) {
  return (
    <div className="flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
      <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
      <div className="flex flex-col gap-1">
        <p className="font-medium">Assistant IA désactivé</p>
        <p className="text-muted-foreground">
          Aucune clé API n'est configurée sur le serveur, la génération de contenus est donc indisponible{context ? ` (${context})` : ""}. Aucun résultat
          n'est simulé. Pour l'activer, ajoutez <code className="rounded bg-muted px-1 text-xs">ANTHROPIC_API_KEY=…</code> dans le fichier{" "}
          <code className="rounded bg-muted px-1 text-xs">.env.local</code> à la racine du projet puis redémarrez l'application. La clé reste côté serveur et
          n'est jamais transmise au navigateur.
        </p>
      </div>
    </div>
  );
}
