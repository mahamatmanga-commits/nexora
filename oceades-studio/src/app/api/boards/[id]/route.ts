import { NextResponse } from "next/server";
import { boardPatchSchema } from "@/lib/domain/schemas";
import { deleteBoard, getBoardData, updateBoard } from "@/lib/server/repositories/boards";
import { readJson, route } from "@/lib/server/errors";

type Ctx = { params: Promise<{ id: string }> };
export const dynamic = "force-dynamic";

export const GET = route<Ctx>(async (_r, { params }) => NextResponse.json(await getBoardData((await params).id)));

export const PATCH = route<Ctx>(async (request, { params }) =>
  NextResponse.json(await updateBoard((await params).id, boardPatchSchema.parse(await readJson(request)))),
);

/** Suppression définitive : uniquement pour un tableau déjà archivé. */
export const DELETE = route<Ctx>(async (_r, { params }) => {
  await deleteBoard((await params).id);
  return new NextResponse(null, { status: 204 });
});
