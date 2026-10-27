import { NextResponse } from "next/server";
import { memberInputSchema } from "@/lib/domain/schemas";
import { createMember, listMembers } from "@/lib/server/repositories/members";
import { readJson, route } from "@/lib/server/errors";

export const dynamic = "force-dynamic";
export const GET = route(async () => NextResponse.json(await listMembers()));
export const POST = route(async (request) => NextResponse.json(await createMember(memberInputSchema.parse(await readJson(request))), { status: 201 }));
