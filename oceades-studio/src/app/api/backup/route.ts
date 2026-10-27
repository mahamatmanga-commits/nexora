import { listCampaigns } from "@/lib/server/repositories/campaigns";
import { listMedia } from "@/lib/server/repositories/media";
import { listPosts } from "@/lib/server/repositories/posts";
import { errorResponse } from "@/lib/server/errors";

export const dynamic = "force-dynamic";

/** Sauvegarde JSON complète des données (hors fichiers médias, qui restent dans le dossier storage/). */
export async function GET() {
  try {
    const [posts, campaigns, media] = await Promise.all([listPosts(), listCampaigns(), listMedia()]);
    const body = JSON.stringify({ app: "oceades-studio", version: 1, exportedAt: new Date().toISOString(), posts, campaigns, media }, null, 2);
    const stamp = new Date().toISOString().slice(0, 10);
    return new Response(body, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="oceades-sauvegarde-${stamp}.json"`,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
