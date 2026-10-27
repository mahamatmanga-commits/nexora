import { NextResponse } from "next/server";
import { labelPatchSchema } from "@/lib/domain/schemas";
import { deleteLabel, updateLabel } from "@/lib/server/repositories/labels";
import { readJson, route } from "@/lib/server/errors";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = route<Ctx>(async (request, { params }) => NextResponse.json(await updateLabel((await params).id, labelPatchSchema.parse(await readJson(request)))));
export const DELETE = route<Ctx>(async (_r, { params }) => NextResponse.json({ removedFromCards: await deleteLabel((await params).id) }));
