import { KeyRound } from "lucide-react";

/** Signale sobrement que l'IA est désactivée (aucune clé API côté serveur) ; aucun résultat n'est simulé. */
export function AiDisabledNotice() {
  return (
    <p className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-[12.5px] text-muted-foreground">
      <KeyRound className="h-4 w-4 shrink-0" />
      Génération désactivée : ajoutez ANTHROPIC_API_KEY dans .env.local puis redémarrez l'application.
    </p>
  );
}
