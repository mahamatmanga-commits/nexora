import { NextResponse } from "next/server";
import { cardPatchSchema } from "@/lib/domain/schemas";
import { deleteCard, getCard, updateCard } from "@/lib/server/repositories/cards";
import { authorOf, readJson, route } from "@/lib/server/errors";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>(async (_r, { params }) => NextResponse.json(await getCard((await params).id)));

export const PATCH = route<Ctx>(async (request, { params }) =>
  NextResponse.json(await updateCard((await params).id, cardPatchSchema.parse(await readJson(request)), authorOf(request))),
);

/** Suppression définitive : uniquement pour une carte archivée. */
export const DELETE = route<Ctx>(async (_r, { params }) => {
  await deleteCard((await params).id);
  return new NextResponse(null, { status: 204 });
});
