import { NextResponse } from "next/server";
import { z } from "zod";
import { localDateTime } from "@/lib/domain/schemas";
import { duplicatePost } from "@/lib/server/repositories/posts";
import { errorResponse } from "@/lib/server/errors";

const bodySchema = z.object({ scheduledAt: localDateTime.nullable().optional() }).default({});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const text = await request.text();
    const body = bodySchema.parse(text ? JSON.parse(text) : {});
    return NextResponse.json(await duplicatePost((await params).id, body.scheduledAt), { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
