import { NextResponse } from "next/server";
import { memberPatchSchema } from "@/lib/domain/schemas";
import { deleteMember, updateMember } from "@/lib/server/repositories/members";
import { readJson, route } from "@/lib/server/errors";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = route<Ctx>(async (request, { params }) => NextResponse.json(await updateMember((await params).id, memberPatchSchema.parse(await readJson(request)))));
export const DELETE = route<Ctx>(async (_r, { params }) => {
  await deleteMember((await params).id);
  return new NextResponse(null, { status: 204 });
});
