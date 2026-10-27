"use client";

import * as React from "react";
import { AlertCircle, RotateCw } from "lucide-react";
import { useData } from "@/lib/client/store";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/misc";

/** Affiche un squelette pendant le premier chargement et une erreur claire si l'API est injoignable. */
export function AppGate({ children }: { children: React.ReactNode }) {
  const { ready, loadError, reload } = useData();
  if (!ready) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <Skeleton className="h-8 w-60" />
        <Skeleton className="h-4 w-96 max-w-full" />
        <Skeleton className="h-[60vh] w-full" />
      </div>
    );
  }
  if (loadError) {
    return (
      <div className="grid min-h-[70vh] place-items-center p-6">
        <div className="flex max-w-md flex-col items-center gap-3 text-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="font-medium">Impossible de charger les données</p>
          <p className="text-sm text-muted-foreground">{loadError}</p>
          <Button variant="outline" onClick={() => reload()}>
            <RotateCw /> Réessayer
          </Button>
        </div>
      </div>
    );
  }
  return <div className="animate-fade-in">{children}</div>;
}
