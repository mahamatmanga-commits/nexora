import "server-only";
import type { DatabaseSync } from "node:sqlite";
import { addDays, format } from "date-fns";
import { DEFAULT_CHECKLIST, type Status } from "@/lib/domain/constants";
import { cardInputSchema } from "@/lib/domain/schemas";
import { mondayOf, parseLocal, weekListName } from "@/lib/dates";
import { insertBoard, insertDefaultLists, insertList } from "./repositories/boards";
import { insertCampaign } from "./repositories/campaigns";
import { insertCard } from "./repositories/cards";
import { ensureDefaultLabels, labelIdsByKey } from "./repositories/labels";

/**
 * DONNÉES DE DÉMONSTRATION — marquées is_demo = 1 (badge « Démo ») et supprimables en un clic dans les Paramètres.
 * Les dates sont calculées par rapport au jour d'installation.
 */

const DEMO_NOTE = "Donnée de démonstration — à remplacer par vos contenus.";

interface DemoCard {
  title: string;
  day?: number;
  time?: string;
  status: Status;
  labels: string[];
  objective?: string;
  campaign?: string;
  hook?: string;
  caption?: string;
  cta?: string;
  script?: string;
  brief?: string;
  description?: string;
  /** Nombre d'éléments cochés dans la checklist par défaut. */
  progress?: number;
}

export function seedDemoData(db: DatabaseSync) {
  const today = new Date();
  const day = (o: number) => format(addDays(today, o), "yyyy-MM-dd");

  db.exec("BEGIN");
  try {
    ensureDefaultLabels(db);
    const labels = labelIdsByKey(db);

    const campaigns: Record<string, string> = {
      essai: insertCampaign(
        db,
        {
          name: "Séances d'essai",
          kind: "campagne",
          objective: "Générer des réservations de séances d'essai gratuites.",
          brief: "Montrer l'accueil, l'accompagnement et la diversité des activités. Ton rassurant, sans pression commerciale.",
          startDate: day(-12),
          endDate: day(18),
          activities: ["fitness", "aquatique", "musculation"],
          targetAudience: "Actifs 25-45 ans, reprise du sport, personnes hésitantes.",
          keyMessages: "Une séance offerte, sans engagement.\nUn coach vous accueille et vous oriente.",
          color: "#206a83",
        },
        { isDemo: true },
      ),
      bf: insertCampaign(
        db,
        {
          name: "Black Friday",
          kind: "campagne",
          objective: "Abonnements annuels et cartes Institut.",
          brief: "Offre claire et limitée dans le temps. Valoriser l'accompagnement plutôt que le prix seul.",
          startDate: day(22),
          endDate: day(34),
          activities: ["global", "institut"],
          targetAudience: "Prospects, anciens adhérents, clientes Institut.",
          keyMessages: "Conditions lisibles.\nDurée limitée.",
          color: "#a54800",
        },
        { isDemo: true },
      ),
      noel: insertCampaign(
        db,
        {
          name: "Noël à l'institut",
          kind: "campagne",
          objective: "Cartes cadeaux soins et Head Spa.",
          brief: "Ambiance chaleureuse, gros plans sur les soins, mise en avant de la carte cadeau.",
          startDate: day(30),
          endDate: day(58),
          activities: ["institut"],
          targetAudience: "Personnes cherchant un cadeau bien-être.",
          keyMessages: "Offrir un vrai moment pour soi.",
          color: "#943d73",
        },
        { isDemo: true },
      ),
    };

    const boardId = insertBoard(db, "Planning éditorial Océades", "#203849");
    const lists = insertDefaultLists(db, boardId, today);
    const donePos = (db.prepare("SELECT position FROM lists WHERE id = ?").get(lists.done) as { position: number }).position;
    /** Liste de la semaine d'une date ; créée (avant « Publiés ») si elle n'existe pas encore. */
    const weekOf = (o: number) => {
      const monday = mondayOf(addDays(today, o));
      if (!lists[monday] && monday > mondayOf(today)) {
        const count = Object.keys(lists).length;
        lists[monday] = insertList(db, boardId, { name: weekListName(monday), kind: "week", weekStart: monday, position: donePos - 1024 / (count + 1) });
      }
      return lists[monday];
    };

    const cards: DemoCard[] = [
      { title: "Coulisses du cours de RPM du lundi soir", day: -6, time: "18:30", status: "publie", labels: ["fitness", "instagram", "reel"], objective: "engagement", hook: "Lundi 19h : la salle de RPM est pleine. On vous montre pourquoi.", progress: 9 },
      { title: "Aquabike : 3 bénéfices pour les articulations", day: -4, time: "12:15", status: "publie", labels: ["aquatique", "facebook", "carrousel"], objective: "notoriete", campaign: "essai", progress: 9 },
      { title: "Séance d'essai : comment ça se passe ?", day: -1, time: "19:00", status: "a_valider", labels: ["global", "instagram", "story"], objective: "conversion", campaign: "essai", hook: "Vous hésitez ? Voici votre première séance, étape par étape.", cta: "Réservez votre essai gratuit", progress: 6 },
      { title: "Head Spa : le rituel en 30 secondes", day: 1, time: "11:00", status: "a_monter", labels: ["institut", "tiktok", "video"], objective: "notoriete", hook: "Le soin dont tout le monde parle… filmé en vrai.", progress: 3, script: "0-3 s : gros plan vapeur, texte « Le Head Spa, vraiment ? »\n3-12 s : massage crânien\n12-25 s : soin du cuir chevelu, voix off douce\n25-30 s : cliente détendue + CTA" },
      { title: "Aquagym du matin : l'ambiance", day: 2, time: "09:00", status: "programme", labels: ["aquatique", "instagram", "reel"], objective: "engagement", campaign: "essai", hook: "9h, eau à 29°C, et une énergie incroyable.", cta: "Une séance d'essai vous attend", progress: 8 },
      { title: "Les 5 erreurs à éviter au développé couché", day: 3, time: "18:00", status: "a_designer", labels: ["musculation", "instagram", "carrousel"], objective: "engagement", hook: "Erreur n°3 : presque tout le monde la fait.", progress: 2 },
      { title: "Soin visage de saison", day: 4, time: "12:30", status: "a_rediger", labels: ["institut", "facebook", "photo"], objective: "conversion", progress: 1 },
      { title: "Témoignage : 3 mois de Pilates", day: 7, time: "18:30", status: "a_tourner", labels: ["fitness", "instagram", "reel"], objective: "conversion", campaign: "essai", brief: "Tournage au studio, lumière naturelle, autorisation de diffusion à faire signer.", progress: 1 },
      { title: "Les Océades recrutent des coachs", day: 8, time: "08:00", status: "a_rediger", labels: ["global", "linkedin", "photo"], objective: "notoriete" },
      { title: "Routine mobilité 5 minutes", day: 10, time: "12:00", status: "idee", labels: ["fitness", "linkedin", "carrousel"], objective: "notoriete" },
      { title: "LPG : comprendre la technique", day: 15, time: "18:00", status: "idee", labels: ["institut", "instagram", "carrousel"] },
      { title: "Challenge squat de novembre", day: 17, time: "18:00", status: "idee", labels: ["musculation", "tiktok", "video"] },
      { title: "Black Friday — annonce de l'offre", day: 23, time: "08:00", status: "idee", labels: ["global", "meta_ads", "publicite"], objective: "conversion", campaign: "bf" },
      { title: "Avant/après d'une séance de natation technique", status: "idee", labels: ["aquatique", "instagram", "reel"] },
      { title: "FAQ : que mettre dans son sac de sport ?", status: "idee", labels: ["fitness", "tiktok", "video"] },
      { title: "Idées cadeaux bien-être pour Noël", status: "idee", labels: ["institut", "instagram", "carrousel"], campaign: "noel" },
    ];

    for (const c of cards) {
      const scheduledAt = c.day !== undefined ? `${day(c.day)}T${c.time ?? "12:00"}` : null;
      let listId = lists.ideas;
      if (c.status === "publie") listId = lists.done;
      else if (scheduledAt) listId = weekOf(c.day!) ?? lists[mondayOf(today)];
      if (scheduledAt && parseLocal(scheduledAt) < today && c.status !== "publie") listId = lists[mondayOf(today)];
      insertCard(
        db,
        cardInputSchema.parse({
          listId,
          title: c.title,
          description: c.description ?? DEMO_NOTE,
          scheduledAt,
          status: c.status,
          objective: c.objective ?? null,
          campaignId: c.campaign ? campaigns[c.campaign] : null,
          hook: c.hook ?? "",
          caption: c.caption ?? "",
          cta: c.cta ?? "",
          script: c.script ?? "",
          brief: c.brief ?? "",
          labelIds: c.labels.map((k) => labels.get(k)).filter(Boolean),
        }),
        { isDemo: true, author: "Démo", checklist: DEFAULT_CHECKLIST.map((text, i) => ({ text, done: i < (c.progress ?? 0) })) },
      );
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function deleteDemoData(db: DatabaseSync) {
  db.exec("BEGIN");
  try {
    db.prepare("DELETE FROM cards WHERE is_demo = 1").run();
    db.prepare("DELETE FROM campaigns WHERE is_demo = 1").run();
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
