import { NextResponse } from "next/server";
import { mediaPatchSchema } from "@/lib/domain/schemas";
import { deleteMedia, updateMedia } from "@/lib/server/repositories/media";
import { errorResponse, readJson } from "@/lib/server/errors";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  try {
    const patch = mediaPatchSchema.parse(await readJson(request));
    return NextResponse.json(await updateMedia((await params).id, patch));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    await deleteMedia((await params).id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
