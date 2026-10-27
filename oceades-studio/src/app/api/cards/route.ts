import { NextResponse } from "next/server";
import { z } from "zod";
import { cardInputSchema } from "@/lib/domain/schemas";
import { createCard, getCard, insertCard, listAllActiveCards } from "@/lib/server/repositories/cards";
import { authorOf, readJson, route } from "@/lib/server/errors";
import { transaction } from "@/lib/server/db";

export const dynamic = "force-dynamic";

/** Toutes les cartes actives (tous tableaux) — statistiques et assistant. */
export const GET = route(async () => NextResponse.json(await listAllActiveCards()));

/** Crée une carte, ou plusieurs d'un coup si le corps est un tableau (import de propositions validées). */
export const POST = route(async (request) => {
  const body = await readJson(request);
  const author = authorOf(request);
  if (Array.isArray(body)) {
    const inputs = z.array(cardInputSchema).min(1).max(200).parse(body);
    const ids = transaction((db) => inputs.map((input) => insertCard(db, input, { author })));
    return NextResponse.json(await Promise.all(ids.map(getCard)), { status: 201 });
  }
  return NextResponse.json(await createCard(body, author), { status: 201 });
});
