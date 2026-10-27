import { NextResponse } from "next/server";
import { labelInputSchema } from "@/lib/domain/schemas";
import { createLabel, listLabels } from "@/lib/server/repositories/labels";
import { readJson, route } from "@/lib/server/errors";

export const dynamic = "force-dynamic";
export const GET = route(async () => NextResponse.json(await listLabels()));
export const POST = route(async (request) => NextResponse.json(await createLabel(labelInputSchema.parse(await readJson(request))), { status: 201 }));
