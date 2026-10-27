import { NextResponse } from "next/server";
import { postInputSchema } from "@/lib/domain/schemas";
import { createPost, listPosts } from "@/lib/server/repositories/posts";
import { errorResponse, readJson } from "@/lib/server/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await listPosts());
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const input = postInputSchema.parse(await readJson(request));
    return NextResponse.json(await createPost(input), { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
