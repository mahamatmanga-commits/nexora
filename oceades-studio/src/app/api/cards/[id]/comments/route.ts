import { NextResponse } from "next/server";
import { commentInputSchema } from "@/lib/domain/schemas";
import { addComment, listComments } from "@/lib/server/repositories/cards";
import { authorOf, readJson, route } from "@/lib/server/errors";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>(async (_r, { params }) => NextResponse.json(await listComments((await params).id)));

export const POST = route<Ctx>(async (request, { params }) =>
  NextResponse.json(await addComment((await params).id, commentInputSchema.parse(await readJson(request)).body, authorOf(request)), { status: 201 }),
);
