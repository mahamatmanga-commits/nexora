import { addDays, endOfMonth, format, isWithinInterval, lastDayOfMonth, parseISO, startOfMonth } from "date-fns";
import type { ActivityKey as Activity } from "@/lib/domain/constants";

/**
 * Temps forts saisonniers et commerciaux (France), avec des pistes éditoriales propres aux Océades.
 * Ces pistes sont des règles éditoriales rédigées à la main, pas des contenus générés par IA.
 */
export interface SeasonalMoment {
  id: string;
  name: string;
  start: string; // AAAA-MM-JJ
  end: string;
  ideas: Partial<Record<Activity, string[]>>;
}

function nthWeekday(year: number, month: number, weekday: number, n: number): Date {
  // month : 0-11, weekday : 0 (dim) - 6 (sam)
  const first = new Date(year, month, 1);
  const offset = (weekday - first.getDay() + 7) % 7;
  return new Date(year, month, 1 + offset + (n - 1) * 7);
}

function lastWeekday(year: number, month: number, weekday: number): Date {
  const last = lastDayOfMonth(new Date(year, month, 1));
  const offset = (last.getDay() - weekday + 7) % 7;
  return addDays(last, -offset);
}

const d = (date: Date) => format(date, "yyyy-MM-dd");

export function seasonalMoments(year: number): SeasonalMoment[] {
  const blackFriday = addDays(nthWeekday(year, 10, 4, 4), 1); // vendredi suivant le 4e jeudi de novembre
  const fallBack = lastWeekday(year, 9, 0);
  const springForward = lastWeekday(year, 2, 0);
  const mothersDay = lastWeekday(year, 4, 0); // simplification : dernier dimanche de mai
  const fathersDay = nthWeekday(year, 5, 0, 3);
  const m = (month: number) => startOfMonth(new Date(year, month, 1));

  return [
    {
      id: "resolutions",
      name: "Bonnes résolutions",
      start: `${year}-01-01`,
      end: `${year}-01-31`,
      ideas: {
        fitness: ["Programme « reprise en douceur » sur 4 semaines", "Les cours idéaux pour débuter"],
        musculation: ["Bilan de départ avec un coach : à quoi ça sert ?", "Se fixer un objectif réaliste"],
        aquatique: ["L'aquagym, la résolution qui tient", "Nager pour se remettre au sport sans douleur"],
        institut: ["Détox après les fêtes : soin du corps", "Un rituel bien-être par mois"],
      },
    },
    {
      id: "saint-valentin",
      name: "Saint-Valentin",
      start: `${year}-02-01`,
      end: `${year}-02-14`,
      ideas: {
        institut: ["Massage duo / carte cadeau à offrir", "Head Spa : le cadeau original"],
        fitness: ["Cours à faire à deux", "Challenge en binôme"],
        aquatique: ["Aquabike en duo"],
      },
    },
    {
      id: "heure-ete",
      name: "Passage à l'heure d'été",
      start: d(addDays(springForward, -3)),
      end: d(addDays(springForward, 3)),
      ideas: {
        fitness: ["Profiter des soirées plus longues : les cours de 19h"],
        global: ["Adapter son rythme de sommeil et d'entraînement"],
      },
    },
    {
      id: "printemps",
      name: "Retour du printemps",
      start: `${year}-03-20`,
      end: `${year}-04-30`,
      ideas: {
        fitness: ["Se remettre en mouvement avec le retour du soleil"],
        musculation: ["Programme 8 semaines avant l'été"],
        institut: ["LPG : préparer sa silhouette", "Soin éclat de printemps"],
      },
    },
    {
      id: "pre-ete",
      name: "Préparation de l'été",
      start: `${year}-05-01`,
      end: `${year}-06-20`,
      ideas: {
        musculation: ["Gainage et posture : les essentiels"],
        aquatique: ["Réapprendre à nager avant les vacances", "Aquafitness : tonifier en douceur"],
        institut: ["Soins du corps avant l'été", "Préparer sa peau au soleil"],
      },
    },
    {
      id: "fete-meres",
      name: "Fête des mères",
      start: d(addDays(mothersDay, -12)),
      end: d(mothersDay),
      ideas: { institut: ["Carte cadeau soin visage ou massage", "Coffret bien-être Head Spa"] },
    },
    {
      id: "fete-peres",
      name: "Fête des pères",
      start: d(addDays(fathersDay, -10)),
      end: d(fathersDay),
      ideas: { musculation: ["Séance coaching à offrir"], institut: ["Massage sportif à offrir"] },
    },
    {
      id: "ete",
      name: "Été",
      start: `${year}-07-01`,
      end: `${year}-08-31`,
      ideas: {
        aquatique: ["Activités aquatiques pour rester au frais", "Stages de natation enfants / ados"],
        fitness: ["Planning d'été : les cours maintenus"],
        institut: ["Soin après-soleil", "Jambes légères : drainage"],
      },
    },
    {
      id: "rentree",
      name: "Rentrée sportive",
      start: `${year}-08-25`,
      end: `${year}-09-30`,
      ideas: {
        fitness: ["Nouveau planning de cours de la saison", "Quel cours collectif est fait pour vous ?"],
        musculation: ["Reprendre après l'été sans se blesser"],
        aquatique: ["Inscriptions aquagym / aquabike de la saison"],
        institut: ["Soin « retour de vacances » pour prolonger le hâle"],
        global: ["Offre de rentrée et séances d'essai"],
      },
    },
    {
      id: "octobre-rose",
      name: "Octobre rose",
      start: `${year}-10-01`,
      end: `${year}-10-31`,
      ideas: {
        fitness: ["Cours solidaire Octobre rose"],
        aquatique: ["Les bienfaits de l'activité aquatique après un cancer (avec un professionnel)"],
        global: ["Mobilisation des équipes pour la prévention"],
      },
    },
    {
      id: "heure-hiver",
      name: "Passage à l'heure d'hiver",
      start: d(addDays(fallBack, -3)),
      end: d(addDays(fallBack, 4)),
      ideas: {
        fitness: ["Garder la motivation quand il fait nuit tôt"],
        institut: ["Lutter contre la fatigue saisonnière : massage"],
      },
    },
    {
      id: "mois-sans-tabac",
      name: "Mois sans tabac",
      start: `${year}-11-01`,
      end: `${year}-11-30`,
      ideas: { fitness: ["Le sport, allié pour arrêter de fumer"], aquatique: ["Retrouver son souffle à la piscine"] },
    },
    {
      id: "black-friday",
      name: "Black Friday",
      start: d(addDays(blackFriday, -7)),
      end: d(addDays(blackFriday, 3)),
      ideas: {
        global: ["Offre abonnement : expliquer clairement les conditions"],
        institut: ["Cartes soins à tarif préférentiel"],
      },
    },
    {
      id: "noel",
      name: "Fêtes de fin d'année",
      start: `${year}-12-01`,
      end: `${year}-12-31`,
      ideas: {
        institut: ["Cartes cadeaux soins et Head Spa", "Calendrier de l'Avent bien-être"],
        fitness: ["Cours spéciaux de fin d'année", "Rester actif pendant les fêtes"],
        aquatique: ["Planning des vacances de Noël"],
        musculation: ["Programme anti-excès des fêtes, sans culpabiliser"],
      },
    },
  ];
}

/** Temps forts qui chevauchent une période donnée (années consécutives prises en compte). */
export function momentsBetween(from: Date, to: Date): SeasonalMoment[] {
  const years = new Set([from.getFullYear(), to.getFullYear()]);
  const all = [...years].flatMap(seasonalMoments);
  return all.filter((m) => parseISO(m.start) <= to && parseISO(m.end) >= from);
}

export function momentsOn(date: Date): SeasonalMoment[] {
  return seasonalMoments(date.getFullYear()).filter((m) =>
    isWithinInterval(date, { start: parseISO(m.start), end: parseISO(m.end) }),
  );
}

export function monthBounds(year: number, month: number) {
  const start = startOfMonth(new Date(year, month, 1));
  return { start, end: endOfMonth(start) };
}
