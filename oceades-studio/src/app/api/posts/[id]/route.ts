import { NextResponse } from "next/server";
import { postPatchSchema } from "@/lib/domain/schemas";
import { deletePost, getPost, updatePost } from "@/lib/server/repositories/posts";
import { errorResponse, readJson } from "@/lib/server/errors";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    return NextResponse.json(await getPost((await params).id));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: Ctx) {
  try {
    const patch = postPatchSchema.parse(await readJson(request));
    return NextResponse.json(await updatePost((await params).id, patch));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    await deletePost((await params).id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
