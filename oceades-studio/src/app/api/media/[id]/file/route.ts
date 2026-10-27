import { NextResponse } from "next/server";
import { getMediaRow } from "@/lib/server/repositories/media";
import { errorResponse } from "@/lib/server/errors";
import { storage } from "@/lib/server/storage";

/** Diffusion du fichier, avec prise en charge des requêtes Range (lecture vidéo et navigation dans la timeline). */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const row = await getMediaRow((await params).id);
    const stat = await storage.stat(row.storage_key);
    if (!stat) return NextResponse.json({ error: "Fichier absent du stockage." }, { status: 404 });
    const headers: Record<string, string> = {
      "Content-Type": row.mime_type,
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    };
    // Les SVG importés ne doivent pas pouvoir exécuter de script.
    if (row.mime_type === "image/svg+xml") {
      headers["Content-Security-Policy"] = "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox";
    }
    if (new URL(request.url).searchParams.has("download")) {
      headers["Content-Disposition"] = `attachment; filename*=UTF-8''${encodeURIComponent(row.original_name)}`;
    }
    const range = request.headers.get("range");
    const match = range?.match(/^bytes=(\d*)-(\d*)$/);
    if (match && stat.size > 0) {
      let start = match[1] ? Number(match[1]) : stat.size - Number(match[2]);
      let end = match[1] && match[2] ? Number(match[2]) : stat.size - 1;
      start = Math.max(0, start);
      end = Math.min(end, stat.size - 1);
      if (start > end) return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${stat.size}` } });
      return new NextResponse(storage.read(row.storage_key, { start, end }), {
        status: 206,
        headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${stat.size}`, "Content-Length": String(end - start + 1) },
      });
    }
    return new NextResponse(storage.read(row.storage_key), {
      headers: { ...headers, "Content-Length": String(stat.size) },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
