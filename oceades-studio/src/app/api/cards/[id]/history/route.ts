import { NextResponse } from "next/server";
import { listEvents } from "@/lib/server/repositories/cards";
import { route } from "@/lib/server/errors";

export const GET = route<{ params: Promise<{ id: string }> }>(async (_r, { params }) => NextResponse.json(await listEvents((await params).id)));
