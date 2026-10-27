import { NextResponse } from "next/server";
import { z } from "zod";
import { importTrello, parseTrello, previewTrello } from "@/lib/server/trello-import";
import { authorOf, readJson, route, ValidationError } from "@/lib/server/errors";

const bodySchema = z.object({ mode: z.enum(["preview", "import"]), data: z.unknown(), skipDuplicates: z.boolean().default(true) });

/** Prévisualisation puis import d'un export JSON Trello. */
export const POST = route(async (request) => {
  const body = bodySchema.parse(await readJson(request));
  let data;
  try {
    data = parseTrello(body.data);
  } catch (e) {
    throw new ValidationError(e instanceof Error ? e.message : "Fichier invalide.");
  }
  if (body.mode === "preview") return NextResponse.json(previewTrello(data));
  return NextResponse.json(importTrello(data, { skipDuplicates: body.skipDuplicates, author: authorOf(request) }), { status: 201 });
});
