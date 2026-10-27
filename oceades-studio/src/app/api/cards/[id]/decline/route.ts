import { NextResponse } from "next/server";
import { z } from "zod";
import { declineCard } from "@/lib/server/repositories/cards";
import { authorOf, readJson, route } from "@/lib/server/errors";

const schema = z.object({ title: z.string().trim().min(1).max(300), labelIds: z.array(z.string()).max(40), brief: z.string().max(10000).optional() });

/** Crée une déclinaison liée à la carte d'origine. */
export const POST = route<{ params: Promise<{ id: string }> }>(async (request, { params }) =>
  NextResponse.json(await declineCard((await params).id, schema.parse(await readJson(request)), authorOf(request)), { status: 201 }),
);
