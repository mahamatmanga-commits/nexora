/**
 * Référentiels métier d'Océades Studio.
 * Les clés sont stockées en base ; libellés et couleurs servent à l'interface.
 */

/* ---------- Statut de production (un seul par carte) ---------- */

export const STATUSES = ["idee", "a_rediger", "a_tourner", "a_monter", "a_designer", "a_valider", "programme", "publie"] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_LABELS: Record<Status, string> = {
  idee: "Idée",
  a_rediger: "À rédiger",
  a_tourner: "À tourner",
  a_monter: "À monter",
  a_designer: "À designer",
  a_valider: "À valider",
  programme: "Programmé",
  publie: "Publié",
};

export const STATUS_COLORS: Record<Status, string> = {
  idee: "#8c9bab",
  a_rediger: "#e2b203",
  a_tourner: "#fea362",
  a_monter: "#f87168",
  a_designer: "#9f8fef",
  a_valider: "#579dff",
  programme: "#4bce97",
  publie: "#22a06b",
};

/** Statuts considérés comme « terminés » pour les alertes d'échéance. */
export const DONE_STATUSES: Status[] = ["programme", "publie"];
/** Statuts « en production » (dashboard, charge de travail). */
export const PRODUCTION_STATUSES: Status[] = ["a_rediger", "a_tourner", "a_monter", "a_designer"];

/* ---------- Étiquettes : familles indépendantes ---------- */

export const LABEL_FAMILIES = ["activite", "plateforme", "format", "production", "autre"] as const;
export type LabelFamily = (typeof LABEL_FAMILIES)[number];

export const LABEL_FAMILY_LABELS: Record<LabelFamily, string> = {
  activite: "Activité",
  plateforme: "Plateforme",
  format: "Format",
  production: "Production",
  autre: "Autres",
};

/** Palette d'étiquettes, sobre et lisible avec un texte blanc en clair comme en sombre. */
export const LABEL_PALETTE = [
  { name: "Vert", color: "#216e4e" },
  { name: "Jaune", color: "#7f5f01" },
  { name: "Orange", color: "#a54800" },
  { name: "Rouge", color: "#ae2e24" },
  { name: "Violet", color: "#5e4db2" },
  { name: "Bleu", color: "#0055cc" },
  { name: "Ciel", color: "#206a83" },
  { name: "Citron", color: "#4c6b1f" },
  { name: "Rose", color: "#943d73" },
  { name: "Océades", color: "#2c5a7a" },
  { name: "Ardoise", color: "#44546f" },
  { name: "Gris", color: "#596773" },
];

/** Étiquettes créées par défaut. La clé (key) relie une étiquette à un concept métier (IA, statistiques, déclinaisons). */
export const DEFAULT_LABELS: { family: LabelFamily; key: string; name: string; color: string }[] = [
  { family: "activite", key: "fitness", name: "Fitness", color: "#a54800" },
  { family: "activite", key: "musculation", name: "Musculation", color: "#5e4db2" },
  { family: "activite", key: "aquatique", name: "Aquatique", color: "#206a83" },
  { family: "activite", key: "institut", name: "Institut", color: "#943d73" },
  { family: "activite", key: "global", name: "Global Océades", color: "#2c5a7a" },
  { family: "plateforme", key: "instagram", name: "Instagram", color: "#44546f" },
  { family: "plateforme", key: "facebook", name: "Facebook", color: "#44546f" },
  { family: "plateforme", key: "tiktok", name: "TikTok", color: "#44546f" },
  { family: "plateforme", key: "linkedin", name: "LinkedIn", color: "#44546f" },
  { family: "plateforme", key: "meta_ads", name: "Meta Ads", color: "#44546f" },
  { family: "format", key: "reel", name: "Reel", color: "#596773" },
  { family: "format", key: "story", name: "Story", color: "#596773" },
  { family: "format", key: "carrousel", name: "Carrousel", color: "#596773" },
  { family: "format", key: "photo", name: "Photo", color: "#596773" },
  { family: "format", key: "video", name: "Vidéo", color: "#596773" },
  { family: "format", key: "publicite", name: "Publicité", color: "#596773" },
  { family: "format", key: "article", name: "Article", color: "#596773" },
  { family: "production", key: "p_idee", name: "Idée", color: "#7f5f01" },
  { family: "production", key: "p_tourner", name: "À tourner", color: "#7f5f01" },
  { family: "production", key: "p_monter", name: "À monter", color: "#7f5f01" },
  { family: "production", key: "p_designer", name: "À designer", color: "#7f5f01" },
  { family: "production", key: "p_rediger", name: "À rédiger", color: "#7f5f01" },
  { family: "production", key: "p_valider", name: "À valider", color: "#7f5f01" },
  { family: "production", key: "p_programme", name: "Programmé", color: "#216e4e" },
  { family: "production", key: "p_publie", name: "Publié", color: "#216e4e" },
];

export const ACTIVITY_KEYS = ["fitness", "musculation", "aquatique", "institut", "global"] as const;
export type ActivityKey = (typeof ACTIVITY_KEYS)[number];
export const PLATFORM_KEYS = ["instagram", "facebook", "tiktok", "linkedin", "meta_ads"] as const;
export type PlatformKey = (typeof PLATFORM_KEYS)[number];
export const FORMAT_KEYS = ["reel", "story", "carrousel", "photo", "video", "publicite", "article"] as const;
export type FormatKey = (typeof FORMAT_KEYS)[number];

/* ---------- Objectifs ---------- */

export const OBJECTIVES = ["notoriete", "engagement", "trafic", "conversion", "fidelisation"] as const;
export type Objective = (typeof OBJECTIVES)[number];
export const OBJECTIVE_LABELS: Record<Objective, string> = {
  notoriete: "Notoriété",
  engagement: "Engagement",
  trafic: "Trafic",
  conversion: "Conversion",
  fidelisation: "Fidélisation",
};

/* ---------- Listes et tableaux ---------- */

export const LIST_KINDS = ["normal", "ideas", "week", "done"] as const;
export type ListKind = (typeof LIST_KINDS)[number];

/** Couleurs d'accent possibles pour une liste (fine barre en tête de liste). */
export const LIST_COLORS = ["#4bce97", "#e2b203", "#fea362", "#f87168", "#9f8fef", "#579dff", "#6cc3e0", "#94c748", "#e774bb", "#8c9bab"];

/** Fonds de tableau (couleurs unies, sans dégradé). */
export const BOARD_BACKGROUNDS = [
  { name: "Océades", color: "#203849" },
  { name: "Graphite", color: "#1d2125" },
  { name: "Forêt", color: "#1f3b33" },
  { name: "Prune", color: "#36283f" },
  { name: "Brique", color: "#45291f" },
  { name: "Nuit", color: "#1c2b4a" },
  { name: "Ardoise", color: "#3b4655" },
  { name: "Sable", color: "#6b5d4a" },
];

/* ---------- Checklist ---------- */

export const DEFAULT_CHECKLIST = [
  "Idée validée",
  "Script rédigé",
  "Tournage effectué",
  "Montage terminé",
  "Visuel finalisé",
  "Description rédigée",
  "Validation obtenue",
  "Publication programmée",
  "Publication effectuée",
];

/* ---------- Médias, campagnes ---------- */

export const MEDIA_CATEGORIES = ["photo", "video", "miniature", "publicite", "logo", "document"] as const;
export type MediaCategory = (typeof MEDIA_CATEGORIES)[number];
export const MEDIA_CATEGORY_LABELS: Record<MediaCategory, string> = {
  photo: "Photo",
  video: "Vidéo",
  miniature: "Miniature",
  publicite: "Publicité",
  logo: "Logo",
  document: "Document",
};

export const CAMPAIGN_KINDS = ["campagne", "evenement"] as const;
export type CampaignKind = (typeof CAMPAIGN_KINDS)[number];
export const CAMPAIGN_KIND_LABELS: Record<CampaignKind, string> = { campagne: "Campagne", evenement: "Événement" };
export const CAMPAIGN_COLORS = ["#2c5a7a", "#a54800", "#206a83", "#943d73", "#5e4db2", "#216e4e", "#7f5f01", "#0055cc"];

/** Longueurs conseillées de légende par plateforme. */
export const CAPTION_LIMITS: Record<string, { max: number; recommended: number }> = {
  instagram: { max: 2200, recommended: 300 },
  facebook: { max: 63206, recommended: 400 },
  tiktok: { max: 4000, recommended: 150 },
  linkedin: { max: 3000, recommended: 700 },
  meta_ads: { max: 2200, recommended: 125 },
};

/** Couleurs des membres (avatars). */
export const MEMBER_COLORS = ["#2c5a7a", "#a54800", "#216e4e", "#5e4db2", "#943d73", "#206a83", "#7f5f01", "#ae2e24"];

/* ---------- Modèles de cartes ---------- */

export interface CardTemplate {
  id: string;
  name: string;
  labels: string[];
  objective?: Objective;
  hook?: string;
  brief?: string;
  script?: string;
  checklist: string[];
}

export const CARD_TEMPLATES: CardTemplate[] = [
  {
    id: "reel-fitness",
    name: "Reel fitness",
    labels: ["fitness", "instagram", "reel"],
    objective: "engagement",
    script: "0-3 s : accroche visuelle\n3-15 s : démonstration / coulisses\n15-25 s : conseil du coach\nFin : CTA",
    brief: "Format vertical 9:16, lumière naturelle du studio, 3 à 5 plans courts, son d'ambiance du cours.",
    checklist: ["Idée validée", "Script rédigé", "Tournage effectué", "Montage terminé", "Description rédigée", "Validation obtenue", "Publication programmée", "Publication effectuée"],
  },
  {
    id: "carrousel-pedago",
    name: "Carrousel pédagogique",
    labels: ["instagram", "carrousel"],
    objective: "engagement",
    script: "Slide 1 : titre accrocheur\nSlides 2-6 : un conseil par slide\nDernière slide : CTA (enregistrer, partager, réserver)",
    checklist: ["Idée validée", "Script rédigé", "Visuel finalisé", "Description rédigée", "Validation obtenue", "Publication programmée", "Publication effectuée"],
  },
  {
    id: "meta-ads",
    name: "Campagne Meta Ads",
    labels: ["meta_ads", "publicite"],
    objective: "conversion",
    brief: "Objectif publicitaire :\nAudience :\nBudget et durée :\nAccroche (3 premières secondes) :\nMessage clé :\nBouton d'action :\nFormats : 9:16, 4:5, 1:1",
    checklist: ["Idée validée", "Visuel finalisé", "Description rédigée", "Validation obtenue", "Audience paramétrée", "Publication programmée"],
  },
  {
    id: "soin",
    name: "Présentation d'un soin",
    labels: ["institut", "instagram", "reel"],
    objective: "conversion",
    brief: "Gros plans sur les gestes, ambiance apaisante, autorisation de la cliente à vérifier.",
    checklist: ["Idée validée", "Script rédigé", "Tournage effectué", "Montage terminé", "Description rédigée", "Validation obtenue", "Publication programmée", "Publication effectuée"],
  },
  {
    id: "temoignage",
    name: "Témoignage adhérent",
    labels: ["global", "instagram", "reel"],
    objective: "conversion",
    hook: "« … » — prénom, adhérent(e) depuis …",
    brief: "Interview courte (3 questions), plan serré + plans d'activité. Autorisation de diffusion signée obligatoire.",
    checklist: ["Idée validée", "Autorisation de diffusion signée", "Tournage effectué", "Montage terminé", "Description rédigée", "Validation obtenue", "Publication programmée", "Publication effectuée"],
  },
  {
    id: "promo",
    name: "Promotion commerciale",
    labels: ["global", "instagram", "facebook", "photo"],
    objective: "conversion",
    brief: "Offre, conditions, durée : à faire valider par la direction avant création du visuel.",
    checklist: ["Offre validée par la direction", "Visuel finalisé", "Description rédigée", "Mentions légales vérifiées", "Validation obtenue", "Publication programmée", "Publication effectuée"],
  },
  {
    id: "shooting",
    name: "Shooting photo",
    labels: ["photo"],
    brief: "Lieu :\nDate et horaire :\nPersonnes photographiées (autorisations) :\nListe des plans :\nMatériel :",
    checklist: ["Brief validé", "Autorisations à l'image collectées", "Shooting effectué", "Sélection des photos", "Retouches", "Import dans la médiathèque"],
  },
];
