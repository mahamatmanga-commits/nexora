import { NextResponse } from "next/server";
import { duplicateCard } from "@/lib/server/repositories/cards";
import { authorOf, route } from "@/lib/server/errors";

export const POST = route<{ params: Promise<{ id: string }> }>(async (request, { params }) =>
  NextResponse.json(await duplicateCard((await params).id, authorOf(request)), { status: 201 }),
);
