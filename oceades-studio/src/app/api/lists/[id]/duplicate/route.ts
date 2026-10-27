import { NextResponse } from "next/server";
import { duplicateList } from "@/lib/server/repositories/boards";
import { authorOf, route } from "@/lib/server/errors";

export const POST = route<{ params: Promise<{ id: string }> }>(async (request, { params }) =>
  NextResponse.json(await duplicateList((await params).id, authorOf(request)), { status: 201 }),
);
