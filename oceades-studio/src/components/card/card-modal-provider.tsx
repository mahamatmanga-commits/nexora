"use client";

import * as React from "react";
import { CardModal } from "./card-modal";

interface Ctx {
  openCard: (id: string) => void;
  closeCard: () => void;
}

const CardModalContext = React.createContext<Ctx | null>(null);

/** Fiche détaillée d'une carte, ouverte par-dessus la vue courante (tableau, calendrier, campagnes…). */
export function CardModalProvider({ children }: { children: React.ReactNode }) {
  const [cardId, setCardId] = React.useState<string | null>(null);
  const value = React.useMemo<Ctx>(() => ({ openCard: setCardId, closeCard: () => setCardId(null) }), []);
  return (
    <CardModalContext.Provider value={value}>
      {children}
      {cardId && <CardModal key={cardId} cardId={cardId} onClose={() => setCardId(null)} onSwitch={setCardId} />}
    </CardModalContext.Provider>
  );
}

export function useCardModal() {
  const ctx = React.useContext(CardModalContext);
  if (!ctx) throw new Error("useCardModal doit être utilisé dans <CardModalProvider>");
  return ctx;
}
