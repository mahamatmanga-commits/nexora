import { NextResponse } from "next/server";
import { boardInputSchema } from "@/lib/domain/schemas";
import { createBoard, listBoards } from "@/lib/server/repositories/boards";
import { readJson, route } from "@/lib/server/errors";

export const dynamic = "force-dynamic";

export const GET = route(async () => NextResponse.json(await listBoards()));

export const POST = route(async (request) => NextResponse.json(await createBoard(boardInputSchema.parse(await readJson(request))), { status: 201 }));
