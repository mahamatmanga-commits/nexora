import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { deleteDemoData } from "@/lib/server/seed";
import { errorResponse } from "@/lib/server/errors";

/** Supprime toutes les données de démonstration (publications et campagnes marquées « Démo »). */
export async function DELETE() {
  try {
    deleteDemoData(getDb());
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
