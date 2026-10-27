"use client";

import * as React from "react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { DataProvider } from "@/lib/client/store";
import { PostEditorProvider } from "@/components/posts/post-editor-provider";
import { TooltipProvider } from "@/components/ui/tooltip";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <TooltipProvider delayDuration={300}>
        <DataProvider>
          <PostEditorProvider>{children}</PostEditorProvider>
        </DataProvider>
      </TooltipProvider>
      <Toaster position="bottom-right" richColors closeButton />
    </ThemeProvider>
  );
}
