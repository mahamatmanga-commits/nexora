import { NextResponse } from "next/server";
import { MEDIA_CATEGORIES, type MediaCategory } from "@/lib/domain/constants";
import { createMediaFromStream, listMedia } from "@/lib/server/repositories/media";
import { errorResponse, ValidationError } from "@/lib/server/errors";
import { isAllowedMime, MAX_UPLOAD_BYTES } from "@/lib/server/storage";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await listMedia());
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * Import d'un fichier : le corps de la requête EST le fichier (pas de multipart),
 * ce qui permet de l'écrire en flux sur le disque, même pour des vidéos de plusieurs centaines de Mo.
 * Métadonnées en paramètres d'URL : ?name=...&category=...
 */
export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const originalName = (url.searchParams.get("name") ?? "").trim();
    const mimeType = (request.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    const category = url.searchParams.get("category");
    if (!originalName) throw new ValidationError("Nom de fichier manquant.");
    if (!isAllowedMime(mimeType)) throw new ValidationError(`Type de fichier non pris en charge (${mimeType || "inconnu"}).`);
    if (category && !MEDIA_CATEGORIES.includes(category as MediaCategory)) throw new ValidationError("Catégorie inconnue.");
    const declared = Number(request.headers.get("content-length") ?? 0);
    if (declared > MAX_UPLOAD_BYTES) throw new ValidationError("Fichier trop volumineux.");
    if (!request.body) throw new ValidationError("Fichier vide.");
    const media = await createMediaFromStream({
      originalName,
      mimeType,
      category: (category as MediaCategory) ?? undefined,
      body: request.body,
      maxBytes: MAX_UPLOAD_BYTES,
    });
    return NextResponse.json(media, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
