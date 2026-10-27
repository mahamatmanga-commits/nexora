import { NextResponse } from "next/server";
import { planRequestSchema, writePlanIdeas } from "@/lib/server/ai";
import { errorResponse, readJson } from "@/lib/server/errors";

export const maxDuration = 300;

/** Rédige les idées d'un planning proposé. Aucune écriture en base : l'import reste une action de l'utilisateur. */
export async function POST(request: Request) {
  try {
    const input = planRequestSchema.parse(await readJson(request));
    return NextResponse.json({ ideas: await writePlanIdeas(input) });
  } catch (error) {
    return errorResponse(error);
  }
}
