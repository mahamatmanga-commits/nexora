import { NextResponse } from "next/server";
import { generateIdeas, ideasRequestSchema } from "@/lib/server/ai";
import { errorResponse, readJson } from "@/lib/server/errors";

export const maxDuration = 300;

/** Génère des propositions. Rien n'est enregistré ni publié : l'utilisateur valide chaque idée. */
export async function POST(request: Request) {
  try {
    const input = ideasRequestSchema.parse(await readJson(request));
    return NextResponse.json({ ideas: await generateIdeas(input) });
  } catch (error) {
    return errorResponse(error);
  }
}
