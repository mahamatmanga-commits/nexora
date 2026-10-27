/**
 * Référentiels métier d'Océades Studio.
 * Les valeurs (clés) sont stockées en base ; les libellés et couleurs servent à l'interface.
 */

export const PLATFORMS = ["instagram", "facebook", "tiktok", "linkedin"] as const;
export const ACTIVITIES = ["fitness", "musculation", "aquatique", "institut", "global"] as const;
export const FORMATS = ["reel", "story", "carrousel", "photo", "video", "publicite"] as const;
export const OBJECTIVES = ["notoriete", "engagement", "trafic", "conversion", "fidelisation"] as const;
export const STATUSES = ["idee", "a_produire", "en_production", "a_valider", "programme", "publie"] as const;
export const MEDIA_CATEGORIES = ["photo", "video", "miniature", "publicite", "logo", "document"] as const;
export const CAMPAIGN_KINDS = ["campagne", "evenement"] as const;

export type Platform = (typeof PLATFORMS)[number];
export type Activity = (typeof ACTIVITIES)[number];
export type Format = (typeof FORMATS)[number];
export type Objective = (typeof OBJECTIVES)[number];
export type Status = (typeof STATUSES)[number];
export type MediaCategory = (typeof MEDIA_CATEGORIES)[number];
export type CampaignKind = (typeof CAMPAIGN_KINDS)[number];

export const PLATFORM_LABELS: Record<Platform, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
};

export const ACTIVITY_LABELS: Record<Activity, string> = {
  fitness: "Fitness",
  musculation: "Musculation",
  aquatique: "Aquatique",
  institut: "Institut",
  global: "Global",
};

export const FORMAT_LABELS: Record<Format, string> = {
  reel: "Reel",
  story: "Story",
  carrousel: "Carrousel",
  photo: "Photo",
  video: "Vidéo",
  publicite: "Publicité",
};

export const OBJECTIVE_LABELS: Record<Objective, string> = {
  notoriete: "Notoriété",
  engagement: "Engagement",
  trafic: "Trafic",
  conversion: "Conversion",
  fidelisation: "Fidélisation",
};

export const STATUS_LABELS: Record<Status, string> = {
  idee: "Idée",
  a_produire: "À produire",
  en_production: "En production",
  a_valider: "À valider",
  programme: "Programmé",
  publie: "Publié",
};

export const MEDIA_CATEGORY_LABELS: Record<MediaCategory, string> = {
  photo: "Photographie",
  video: "Vidéo",
  miniature: "Miniature",
  publicite: "Visuel publicitaire",
  logo: "Logo",
  document: "Document de campagne",
};

export const CAMPAIGN_KIND_LABELS: Record<CampaignKind, string> = {
  campagne: "Campagne",
  evenement: "Événement",
};

/** Couleurs d'identification (hex) — choisies pour rester lisibles en clair comme en sombre. */
export const ACTIVITY_COLORS: Record<Activity, string> = {
  fitness: "#e8590c",
  musculation: "#5f3dc4",
  aquatique: "#0b97ad",
  institut: "#c2255c",
  global: "#3b7fc4",
};

export const PLATFORM_COLORS: Record<Platform, string> = {
  instagram: "#d6336c",
  facebook: "#1c7ed6",
  tiktok: "#0ca678",
  linkedin: "#0b5394",
};

export const STATUS_COLORS: Record<Status, string> = {
  idee: "#868e96",
  a_produire: "#e67700",
  en_production: "#1c7ed6",
  a_valider: "#ae3ec9",
  programme: "#0ca678",
  publie: "#4263eb",
};

export const FORMAT_COLORS: Record<Format, string> = {
  reel: "#e64980",
  story: "#f59f00",
  carrousel: "#4263eb",
  photo: "#12b886",
  video: "#7048e8",
  publicite: "#fa5252",
};

export const OBJECTIVE_COLORS: Record<Objective, string> = {
  notoriete: "#4dabf7",
  engagement: "#f783ac",
  trafic: "#ffa94d",
  conversion: "#51cf66",
  fidelisation: "#9775fa",
};

/** Palette proposée pour les campagnes. */
export const CAMPAIGN_COLORS = ["#203849", "#e8590c", "#0c8599", "#c2255c", "#5f3dc4", "#2b8a3e", "#e67700", "#1971c2"];

/** Statuts considérés comme « en cours de production » pour le dashboard. */
export const PRODUCTION_STATUSES: Status[] = ["a_produire", "en_production"];
/** Statuts au-delà desquels une publication n'est plus « en retard ». */
export const DONE_STATUSES: Status[] = ["programme", "publie"];

/** Longueurs indicatives de légende par plateforme (limites officielles ou recommandées). */
export const CAPTION_LIMITS: Record<Platform, { max: number; recommended: number }> = {
  instagram: { max: 2200, recommended: 300 },
  facebook: { max: 63206, recommended: 400 },
  tiktok: { max: 4000, recommended: 150 },
  linkedin: { max: 3000, recommended: 700 },
};

/** Les formats disponibles par plateforme (pour guider la saisie et les déclinaisons). */
export const PLATFORM_FORMATS: Record<Platform, Format[]> = {
  instagram: ["reel", "story", "carrousel", "photo", "publicite"],
  facebook: ["reel", "story", "carrousel", "photo", "video", "publicite"],
  tiktok: ["video", "carrousel", "publicite"],
  linkedin: ["carrousel", "photo", "video", "publicite"],
};

export type ColorMode = "activity" | "platform" | "status" | "campaign";
export const COLOR_MODE_LABELS: Record<ColorMode, string> = {
  activity: "Activité",
  platform: "Plateforme",
  status: "Statut",
  campaign: "Campagne",
};

export const CHECKLIST_ITEMS = [
  { key: "visualReady", label: "Visuel prêt", auto: false },
  { key: "textValidated", label: "Texte validé", auto: false },
  { key: "dateChosen", label: "Date choisie", auto: true },
  { key: "ctaPresent", label: "CTA présent", auto: true },
  { key: "rightsChecked", label: "Droits d'utilisation des médias vérifiés", auto: false },
] as const;
export type ChecklistKey = (typeof CHECKLIST_ITEMS)[number]["key"];
