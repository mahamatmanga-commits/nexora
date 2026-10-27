"use client";

import * as React from "react";
import { Bell, CheckCircle2 } from "lucide-react";
import { useData, useIndexes } from "@/lib/client/store";
import { productionAlerts } from "@/lib/insights/production-alerts";
import { useCardModal } from "@/components/card/card-modal-provider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/** Alertes de production : une cloche discrète, consultée à la demande. */
export function AlertsButton({ tone = "board" }: { tone?: "board" | "plain" }) {
  const { cards, campaigns, settings } = useData();
  const { labelById } = useIndexes();
  const { openCard } = useCardModal();
  const alerts = React.useMemo(() => productionAlerts(cards, labelById, campaigns, settings), [cards, labelById, campaigns, settings]);
  const high = alerts.some((a) => a.level === "high");

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "relative grid h-8 w-8 place-items-center rounded-md",
            tone === "board" ? "text-white/85 hover:bg-white/15" : "text-muted-foreground hover:bg-accent hover:text-foreground",
          )}
          aria-label={`Alertes de production (${alerts.length})`}
        >
          <Bell className="h-4 w-4" />
          {alerts.length > 0 && <span className={cn("absolute right-1.5 top-1.5 h-2 w-2 rounded-full ring-2 ring-black/20", high ? "bg-[#f87168]" : "bg-[#e2b203]")} />}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(92vw,340px)] p-0">
        <p className="border-b px-3 py-2 text-sm font-semibold">Alertes</p>
        <div className="max-h-[60vh] overflow-y-auto py-1 scrollbar-thin">
          {alerts.map((a) => (
            <button
              key={a.id}
              type="button"
              disabled={!a.cardId}
              onClick={() => a.cardId && openCard(a.cardId)}
              className="flex w-full items-start gap-2.5 px-3 py-2 text-left hover:bg-accent disabled:hover:bg-transparent"
            >
              <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", a.level === "high" ? "bg-[#f87168]" : "bg-[#e2b203]")} />
              <span className="min-w-0">
                <span className="block truncate text-[13px]">{a.title}</span>
                <span className="block text-xs text-muted-foreground">{a.detail}</span>
              </span>
            </button>
          ))}
          {!alerts.length && (
            <p className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-[#4bce97]" /> Rien à signaler.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
