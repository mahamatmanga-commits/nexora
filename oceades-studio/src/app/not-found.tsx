import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-[70vh] place-items-center p-6 text-center">
      <div>
        <p className="text-sm text-muted-foreground">Erreur 404</p>
        <h1 className="mt-1 text-xl font-semibold">Page introuvable</h1>
        <Link href="/" className="mt-4 inline-block text-sm text-primary underline-offset-4 hover:underline">Retour au tableau de bord</Link>
      </div>
    </div>
  );
}
