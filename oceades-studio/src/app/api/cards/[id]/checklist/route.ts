import { NextResponse } from "next/server";
import { checklistItemInputSchema } from "@/lib/domain/schemas";
import { addChecklistItem } from "@/lib/server/repositories/cards";
import { authorOf, readJson, route } from "@/lib/server/errors";

export const POST = route<{ params: Promise<{ id: string }> }>(async (request, { params }) => {
  const input = checklistItemInputSchema.parse(await readJson(request));
  return NextResponse.json(await addChecklistItem((await params).id, input.text, authorOf(request), input.position), { status: 201 });
});
