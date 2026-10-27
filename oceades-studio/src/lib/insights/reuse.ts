import {
  FORMAT_LABELS,
  PLATFORM_FORMATS,
  PLATFORM_LABELS,
  PLATFORMS,
  type Format,
  type Platform,
} from "@/lib/domain/constants";
import type { Post } from "@/lib/domain/types";

export interface ReuseSuggestion {
  platform: Platform;
  format: Format;
  label: string;
  why: string;
}

/** Équivalences de formats d'une plateforme à l'autre. */
const FORMAT_BRIDGES: Partial<Record<Format, Format[]>> = {
  reel: ["video", "story", "carrousel"],
  video: ["reel", "story"],
  carrousel: ["story", "photo", "reel"],
  photo: ["story", "carrousel"],
  story: ["reel", "photo"],
  publicite: ["story", "reel"],
};

const WHY: Partial<Record<Format, string>> = {
  reel: "Le même tournage peut être monté en format vertical court",
  video: "Réutiliser les rushes en vidéo native",
  carrousel: "Transformer les points clés en slides à enregistrer",
  story: "Relayer en story avec un sondage ou un lien",
  photo: "Extraire le meilleur visuel avec un texte court",
};

/** Propose des déclinaisons d'une publication pour d'autres plateformes ou formats. */
export function reuseSuggestions(post: Post): ReuseSuggestion[] {
  const suggestions: ReuseSuggestion[] = [];
  const targets = [post.format, ...(FORMAT_BRIDGES[post.format] ?? [])];
  for (const platform of PLATFORMS) {
    for (const format of targets) {
      if (platform === post.platform && format === post.format) continue;
      if (!PLATFORM_FORMATS[platform].includes(format)) continue;
      suggestions.push({
        platform,
        format,
        label: `${FORMAT_LABELS[format]} ${PLATFORM_LABELS[platform]}`,
        why: format === post.format ? `Même contenu adapté aux codes de ${PLATFORM_LABELS[platform]}` : WHY[format] ?? "",
      });
      break; // un seul format par plateforme, le plus proche
    }
  }
  // Variante de format sur la même plateforme.
  const sameplatform = (FORMAT_BRIDGES[post.format] ?? []).find((f) => PLATFORM_FORMATS[post.platform].includes(f));
  if (sameplatform) {
    suggestions.unshift({
      platform: post.platform,
      format: sameplatform,
      label: `${FORMAT_LABELS[sameplatform]} ${PLATFORM_LABELS[post.platform]}`,
      why: WHY[sameplatform] ?? "",
    });
  }
  const seen = new Set<string>();
  return suggestions.filter((s) => !seen.has(`${s.platform}-${s.format}`) && seen.add(`${s.platform}-${s.format}`)).slice(0, 5);
}
