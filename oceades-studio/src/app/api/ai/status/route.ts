import { NextResponse } from "next/server";
import { AI_MODEL, isAiConfigured } from "@/lib/server/ai";

export const dynamic = "force-dynamic";

/** Indique seulement si l'IA est disponible (jamais la clé elle-même). */
export async function GET() {
  return NextResponse.json({ enabled: isAiConfigured(), model: isAiConfigured() ? AI_MODEL : null });
}
