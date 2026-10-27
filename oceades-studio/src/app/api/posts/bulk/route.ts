import { NextResponse } from "next/server";
import { z } from "zod";
import { postInputSchema } from "@/lib/domain/schemas";
import { createPosts } from "@/lib/server/repositories/posts";
import { errorResponse, readJson } from "@/lib/server/errors";

/** Import groupé (planning validé). Ajoute uniquement : aucune publication existante n'est modifiée. */
export async function POST(request: Request) {
  try {
    const inputs = z.array(postInputSchema).min(1).max(200).parse(await readJson(request));
    return NextResponse.json(await createPosts(inputs), { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
