import { NextResponse } from "next/server";
import { listPatchSchema } from "@/lib/domain/schemas";
import { deleteList, updateList } from "@/lib/server/repositories/boards";
import { readJson, route } from "@/lib/server/errors";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = route<Ctx>(async (request, { params }) =>
  NextResponse.json(await updateList((await params).id, listPatchSchema.parse(await readJson(request)))),
);

export const DELETE = route<Ctx>(async (_r, { params }) => {
  await deleteList((await params).id);
  return new NextResponse(null, { status: 204 });
});
