"use client";

import * as React from "react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { DataProvider } from "@/lib/client/store";
import { CardModalProvider } from "@/components/card/card-modal-provider";
import { TooltipProvider } from "@/components/ui/tooltip";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" disableTransitionOnChange>
      <TooltipProvider delayDuration={300}>
        <DataProvider>
          <CardModalProvider>{children}</CardModalProvider>
        </DataProvider>
      </TooltipProvider>
      <Toaster position="bottom-right" theme="system" style={{ pointerEvents: "auto" }} toastOptions={{ classNames: { toast: "!bg-popover !text-popover-foreground !border-border" } }} />
    </ThemeProvider>
  );
}
