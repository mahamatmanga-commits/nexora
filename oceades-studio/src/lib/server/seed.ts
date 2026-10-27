import "server-only";
import type { DatabaseSync } from "node:sqlite";
import { addDays, format } from "date-fns";
import type { PostInput } from "@/lib/domain/schemas";
import type { Status } from "@/lib/domain/constants";
import { insertCampaign } from "./repositories/campaigns";
import { insertPost } from "./repositories/posts";

/**
 * DONNÉES DE DÉMONSTRATION — marquées is_demo = 1 et signalées « Démo » dans l'interface.
 * Les dates sont calculées par rapport au jour d'installation pour que le calendrier soit
 * immédiatement parlant. Elles peuvent être supprimées en un clic depuis les Paramètres.
 */

const DEMO_NOTE = "Donnée de démonstration — à remplacer par vos contenus réels.";

export function seedDemoData(db: DatabaseSync) {
  const today = new Date();
  const day = (offset: number) => format(addDays(today, offset), "yyyy-MM-dd");
  const at = (offset: number, time: string) => `${day(offset)}T${time}`;

  db.exec("BEGIN");
  try {
    const essai = insertCampaign(
      db,
      {
        name: "Séances d'essai d'automne",
        kind: "campagne",
        objective: "Générer des inscriptions à une séance d'essai gratuite avant l'hiver.",
        startDate: day(-12),
        endDate: day(18),
        activities: ["fitness", "aquatique", "musculation"],
        targetAudience: "Actifs 25-45 ans du secteur, reprise du sport après l'été, personnes hésitantes.",
        keyMessages:
          "Une séance offerte, sans engagement.\nUn coach vous accueille et vous oriente.\nAquagym, cours collectifs ou plateau : vous choisissez.",
        color: "#0c8599",
      },
      { isDemo: true },
    );
    const blackFriday = insertCampaign(
      db,
      {
        name: "Black Friday Océades",
        kind: "campagne",
        objective: "Conversion : abonnements annuels et cartes Institut à tarif préférentiel.",
        startDate: day(22),
        endDate: day(34),
        activities: ["global", "institut", "fitness"],
        targetAudience: "Prospects ayant fait une séance d'essai, anciens adhérents, clientes Institut.",
        keyMessages:
          "Offre limitée dans le temps, conditions claires.\nValoriser l'accompagnement plutôt que le prix seul.",
        color: "#e8590c",
      },
      { isDemo: true },
    );
    const noel = insertCampaign(
      db,
      {
        name: "Noël — Cartes cadeaux Institut",
        kind: "campagne",
        objective: "Vendre des cartes cadeaux soins et Head Spa pour les fêtes.",
        startDate: day(30),
        endDate: day(58),
        activities: ["institut"],
        targetAudience: "Personnes cherchant un cadeau bien-être, conjoints, familles, comités d'entreprise.",
        keyMessages: "Offrir un vrai moment pour soi.\nCartes disponibles à l'accueil et sur demande.",
        color: "#c2255c",
      },
      { isDemo: true },
    );
    const jpo = insertCampaign(
      db,
      {
        name: "Journée portes ouvertes",
        kind: "evenement",
        objective: "Faire découvrir le club : démonstrations, mini-cours, visite de l'espace aquatique.",
        startDate: day(9),
        endDate: day(9),
        activities: ["global", "fitness", "aquatique", "musculation", "institut"],
        targetAudience: "Habitants du quartier, familles, curieux.",
        keyMessages: "Entrée libre toute la journée.\nCours découverte toutes les heures.",
        color: "#5f3dc4",
      },
      { isDemo: true },
    );

    const base = (p: Partial<PostInput> & Pick<PostInput, "title" | "platform" | "activity" | "format" | "objective">) =>
      ({
        scheduledAt: null,
        status: "idee" as Status,
        description: "",
        hook: "",
        cta: "",
        notes: DEMO_NOTE,
        campaignId: null,
        mediaIds: [],
        checklist: { visualReady: false, textValidated: false, rightsChecked: false },
        ...p,
      }) satisfies PostInput;

    const posts: PostInput[] = [
      base({
        title: "Coulisses du cours de RPM du lundi soir",
        scheduledAt: at(-9, "18:30"),
        platform: "instagram",
        activity: "fitness",
        format: "reel",
        objective: "engagement",
        status: "publie",
        hook: "Lundi 19h : la salle de RPM est pleine. On vous montre pourquoi.",
        description:
          "45 minutes, une playlist qui pousse et un coach qui ne vous lâche pas. Le RPM du lundi, c'est le rendez-vous de ceux qui démarrent la semaine en mouvement.\n\nPlaces limitées, réservation sur l'appli.",
        cta: "Réservez votre place sur l'appli",
        checklist: { visualReady: true, textValidated: true, rightsChecked: true },
      }),
      base({
        title: "Aquabike : 3 bénéfices pour les articulations",
        scheduledAt: at(-6, "12:15"),
        platform: "facebook",
        activity: "aquatique",
        format: "carrousel",
        objective: "notoriete",
        status: "publie",
        campaignId: essai,
        hook: "Pédaler dans l'eau, c'est vraiment plus doux pour les genoux ?",
        description:
          "Oui, et ce n'est pas qu'une impression. Portance de l'eau, massage naturel, résistance progressive : on vous explique en 3 slides pourquoi l'aquabike convient aussi à la reprise.",
        cta: "Testez une séance d'aquabike offerte",
        checklist: { visualReady: true, textValidated: true, rightsChecked: true },
      }),
      base({
        title: "Portrait coach : Karim, plateau musculation",
        scheduledAt: at(-4, "17:00"),
        platform: "instagram",
        activity: "musculation",
        format: "photo",
        objective: "fidelisation",
        status: "publie",
        hook: "Celui qui corrige votre squat avec le sourire.",
        description:
          "Karim accompagne les adhérents du plateau depuis 6 ans. Son conseil n°1 : « Mieux vaut 3 séances régulières qu'une semaine à fond puis plus rien. »",
        cta: "Prenez RDV pour un bilan avec l'équipe",
        checklist: { visualReady: true, textValidated: true, rightsChecked: true },
      }),
      base({
        title: "Séance d'essai : comment ça se passe ?",
        scheduledAt: at(-2, "19:00"),
        platform: "instagram",
        activity: "global",
        format: "story",
        objective: "conversion",
        status: "a_valider",
        campaignId: essai,
        hook: "Vous hésitez ? Voici votre première séance, étape par étape.",
        description: "Accueil, visite, cours au choix, petit bilan avec un coach. Sans engagement.",
        cta: "Réservez votre essai gratuit (lien en story)",
        notes: `${DEMO_NOTE}\nEn retard : à valider avant diffusion.`,
        checklist: { visualReady: true, textValidated: false, rightsChecked: true },
      }),
      base({
        title: "Head Spa : le rituel en 30 secondes",
        scheduledAt: at(-1, "11:00"),
        platform: "tiktok",
        activity: "institut",
        format: "video",
        objective: "notoriete",
        status: "en_production",
        hook: "Le soin dont tout le monde parle… filmé en vrai.",
        description: "Massage crânien, vapeur, soin du cuir chevelu : on vous montre le Head Spa des Océades sans filtre.",
        cta: "Réservez votre Head Spa à l'Institut",
        notes: `${DEMO_NOTE}\nMontage en cours, musique libre de droits à confirmer.`,
        checklist: { visualReady: false, textValidated: true, rightsChecked: false },
      }),
      base({
        title: "Planning des cours de la semaine",
        scheduledAt: at(0, "08:30"),
        platform: "facebook",
        activity: "fitness",
        format: "photo",
        objective: "trafic",
        status: "programme",
        hook: "Votre semaine sportive est prête.",
        description: "Pilates, Body Pump, Zumba, aquagym… Retrouvez tous les créneaux et réservez depuis l'application.",
        cta: "Consultez le planning complet",
        checklist: { visualReady: true, textValidated: true, rightsChecked: true },
      }),
      base({
        title: "Aquagym du matin : l'ambiance",
        scheduledAt: at(1, "09:00"),
        platform: "instagram",
        activity: "aquatique",
        format: "reel",
        objective: "engagement",
        status: "programme",
        campaignId: essai,
        hook: "9h, eau à 29°C, et une énergie incroyable.",
        description: "L'aquagym du mardi matin, c'est une bande de fidèles et une coach qui met l'ambiance. Rejoignez-les !",
        cta: "Une séance d'essai vous attend",
        checklist: { visualReady: true, textValidated: true, rightsChecked: true },
      }),
      base({
        title: "Les 5 erreurs à éviter au développé couché",
        scheduledAt: at(2, "18:00"),
        platform: "instagram",
        activity: "musculation",
        format: "carrousel",
        objective: "engagement",
        status: "a_valider",
        hook: "Erreur n°3 : presque tout le monde la fait.",
        description:
          "Coudes trop ouverts, fesses qui décollent, amplitude incomplète… Nos coachs décortiquent les erreurs les plus fréquentes.",
        cta: "Enregistrez ce post pour votre prochaine séance",
        checklist: { visualReady: true, textValidated: false, rightsChecked: true },
      }),
      base({
        title: "Soin visage de saison : préparer sa peau à l'hiver",
        scheduledAt: at(3, "12:30"),
        platform: "facebook",
        activity: "institut",
        format: "photo",
        objective: "conversion",
        status: "en_production",
        hook: "Froid, chauffage, fatigue : votre peau mérite un vrai soin.",
        description: "Notre soin hydratation intense de saison, 60 minutes pour retrouver une peau confortable.",
        cta: "Réservez votre soin à l'accueil",
        checklist: { visualReady: false, textValidated: false, rightsChecked: false },
      }),
      base({
        title: "Témoignage : Sophie, 3 mois de Pilates",
        scheduledAt: at(5, "18:30"),
        platform: "instagram",
        activity: "fitness",
        format: "reel",
        objective: "conversion",
        status: "a_produire",
        campaignId: essai,
        hook: "« Je n'avais jamais fait de sport. »",
        cta: "Commencez par une séance d'essai",
        notes: `${DEMO_NOTE}\nAutorisation de diffusion de l'adhérente à faire signer avant tournage.`,
      }),
      base({
        title: "LinkedIn — Les Océades recrutent des coachs",
        scheduledAt: at(6, "08:00"),
        platform: "linkedin",
        activity: "global",
        format: "photo",
        objective: "notoriete",
        status: "a_produire",
        hook: "Passionné(e) de sport et de transmission ? On vous attend.",
        cta: "Envoyez votre candidature",
      }),
      base({
        title: "Teaser Journée portes ouvertes",
        scheduledAt: at(7, "17:30"),
        platform: "instagram",
        activity: "global",
        format: "story",
        objective: "trafic",
        status: "a_produire",
        campaignId: jpo,
        hook: "J-2 : on ouvre toutes les portes du club.",
        cta: "Ajoutez la date à votre agenda",
      }),
      base({
        title: "Journée portes ouvertes — programme",
        scheduledAt: at(9, "09:00"),
        platform: "facebook",
        activity: "global",
        format: "carrousel",
        objective: "trafic",
        status: "en_production",
        campaignId: jpo,
        hook: "Aujourd'hui, le club est à vous.",
        description: "Mini-cours toutes les heures, visite de l'espace aquatique, démonstrations Institut.",
        cta: "Venez nous voir, entrée libre",
      }),
      base({
        title: "Live mini-cours aquafitness (JPO)",
        scheduledAt: at(9, "15:00"),
        platform: "instagram",
        activity: "aquatique",
        format: "video",
        objective: "engagement",
        status: "idee",
        campaignId: jpo,
      }),
      base({
        title: "Routine mobilité 5 minutes au bureau",
        scheduledAt: at(12, "12:00"),
        platform: "linkedin",
        activity: "fitness",
        format: "carrousel",
        objective: "notoriete",
        status: "idee",
        hook: "Assis toute la journée ? 5 minutes suffisent.",
      }),
      base({
        title: "LPG : comprendre la technique",
        scheduledAt: at(14, "18:00"),
        platform: "instagram",
        activity: "institut",
        format: "carrousel",
        objective: "notoriete",
        status: "idee",
      }),
      base({
        title: "Challenge squat de novembre",
        scheduledAt: at(16, "18:00"),
        platform: "tiktok",
        activity: "musculation",
        format: "video",
        objective: "engagement",
        status: "idee",
      }),
      base({
        title: "Black Friday — annonce de l'offre",
        scheduledAt: at(23, "08:00"),
        platform: "instagram",
        activity: "global",
        format: "publicite",
        objective: "conversion",
        status: "idee",
        campaignId: blackFriday,
        notes: `${DEMO_NOTE}\nConditions de l'offre à valider avec la direction.`,
      }),
      base({
        title: "Black Friday — cartes Institut",
        scheduledAt: at(25, "12:00"),
        platform: "facebook",
        activity: "institut",
        format: "photo",
        objective: "conversion",
        status: "idee",
        campaignId: blackFriday,
      }),
      base({
        title: "Idées cadeaux bien-être pour Noël",
        scheduledAt: at(32, "18:00"),
        platform: "instagram",
        activity: "institut",
        format: "carrousel",
        objective: "conversion",
        status: "idee",
        campaignId: noel,
      }),
      // Idées non planifiées (boîte à idées)
      base({
        title: "Avant/après d'une séance de natation technique",
        platform: "instagram",
        activity: "aquatique",
        format: "reel",
        objective: "engagement",
      }),
      base({
        title: "FAQ : que mettre dans son sac de sport ?",
        platform: "tiktok",
        activity: "fitness",
        format: "video",
        objective: "engagement",
      }),
      base({
        title: "Visite guidée du nouveau rack de musculation",
        platform: "instagram",
        activity: "musculation",
        format: "story",
        objective: "fidelisation",
      }),
    ];

    for (const p of posts) insertPost(db, p, { isDemo: true });
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function deleteDemoData(db: DatabaseSync) {
  db.exec("BEGIN");
  try {
    db.prepare("DELETE FROM posts WHERE is_demo = 1").run();
    db.prepare("DELETE FROM campaigns WHERE is_demo = 1").run();
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
