import { NextResponse } from "next/server";
import { listInputSchema } from "@/lib/domain/schemas";
import { createList } from "@/lib/server/repositories/boards";
import { readJson, route } from "@/lib/server/errors";

export const POST = route(async (request) => NextResponse.json(await createList(listInputSchema.parse(await readJson(request))), { status: 201 }));
