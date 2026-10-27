import { NextResponse } from "next/server";
import { checklistItemPatchSchema } from "@/lib/domain/schemas";
import { deleteChecklistItem, updateChecklistItem } from "@/lib/server/repositories/cards";
import { authorOf, readJson, route } from "@/lib/server/errors";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = route<Ctx>(async (request, { params }) =>
  NextResponse.json(await updateChecklistItem((await params).id, checklistItemPatchSchema.parse(await readJson(request)), authorOf(request))),
);

export const DELETE = route<Ctx>(async (_r, { params }) => {
  await deleteChecklistItem((await params).id);
  return new NextResponse(null, { status: 204 });
});
