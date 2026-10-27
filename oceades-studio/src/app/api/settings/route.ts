import { NextResponse } from "next/server";
import { settingsSchema } from "@/lib/domain/schemas";
import { getSettings, saveSettings } from "@/lib/server/repositories/members";
import { readJson, route } from "@/lib/server/errors";

export const dynamic = "force-dynamic";
export const GET = route(async () => NextResponse.json(await getSettings()));
export const PUT = route(async (request) => NextResponse.json(await saveSettings(settingsSchema.parse(await readJson(request)))));
