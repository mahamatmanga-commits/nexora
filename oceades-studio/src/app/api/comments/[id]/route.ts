import { NextResponse } from "next/server";
import { deleteComment } from "@/lib/server/repositories/cards";
import { route } from "@/lib/server/errors";

export const DELETE = route<{ params: Promise<{ id: string }> }>(async (_r, { params }) => {
  await deleteComment((await params).id);
  return new NextResponse(null, { status: 204 });
});
