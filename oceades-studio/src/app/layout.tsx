import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Sidebar } from "@/components/layout/sidebar";
import { AppGate } from "@/components/layout/app-gate";

export const metadata: Metadata = {
  title: { default: "Océades Studio", template: "%s · Océades Studio" },
  description: "Calendrier éditorial et pilotage de la communication des Océades.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafb" },
    { media: "(prefers-color-scheme: dark)", color: "#0c151c" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body>
        <Providers>
          <div className="flex min-h-dvh flex-col lg:flex-row">
            <Sidebar />
            <main className="min-w-0 flex-1">
              <AppGate>{children}</AppGate>
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
