# Océades Studio

Tableau éditorial façon Trello pour piloter la communication digitale des Océades : tableaux, listes par semaine, cartes de contenu, étiquettes par familles, fiches détaillées, calendrier synchronisé, campagnes, médiathèque, assistant IA et import Trello.

## Démarrer

Prérequis : **Node.js 22.13 ou plus récent** (la base SQLite utilise le module intégré `node:sqlite`).

```bash
cd oceades-studio
npm install
npm run dev            # http://localhost:3000
```

Pour un usage quotidien, utilisez la version optimisée :

```bash
npm run build
npm start              # http://localhost:3000
```

Au premier lancement, la base `data/oceades.db` est créée avec le tableau « Planning éditorial Océades » (💡 IDÉES, quatre semaines, ✅ PUBLIÉS) et quelques cartes d'exemple marquées « Démo ». Pour les supprimer : **Paramètres → Données**.
Une base créée avec la première version de l'application est migrée automatiquement : les publications deviennent des cartes, sans rien supprimer.

### Options (`.env.local`)

```bash
cp .env.example .env.local
```

| Variable | Rôle |
|---|---|
| `ANTHROPIC_API_KEY` | Active l'assistant IA (clé lue côté serveur uniquement). Sans clé, les fonctions IA sont désactivées et rien n'est simulé. |
| `OCEADES_PASSWORD` | Demande un mot de passe pour ouvrir l'application (utile si elle est accessible sur le réseau). |
| `OCEADES_DATA_DIR`, `OCEADES_STORAGE_DIR` | Emplacements de la base et des fichiers médias. |

Pour repartir de zéro : `npm run db:reset` puis relancer.

## Utilisation

**Tableau** : glissez les cartes d'une liste à l'autre ou dans une même liste, et glissez une liste par son en-tête pour la déplacer. L'ordre est enregistré.

- Ajouter une carte : « + Ajouter une carte » en bas d'une liste (Entrée pour enchaîner, Échap pour fermer).
- Ajouter une liste : « + Ajouter une liste » à droite. Le raccourci « Sem. … » crée la semaine suivante avec le bon nom.
- Menu « … » d'une liste : ajouter une carte, créer depuis un modèle, trier par date, couleur, dupliquer, archiver.
- Menu « … » du tableau : renommer, fond, étiquettes, étiquettes compactes, éléments archivés, dupliquer, export CSV, archiver.
- Changer de tableau : cliquez sur son nom en haut à gauche.
- Recherche : touche `/`. Filtres : étiquettes (une même famille = OU, familles différentes = ET), statut, échéance, campagne, responsable.
- Cloche : alertes de production (retards, visuel manquant la veille, montage non terminé, programmé sans validation, campagne qui se termine, activité sous-représentée).

**Fiche d'une carte** (clic sur la carte) : tout s'enregistre automatiquement.

- En haut : étiquettes, statut, date de publication, responsable.
- Ensuite : description interne, contenu (accroche, texte du post, script, brief créatif, CTA), checklist avec progression, médias et couverture, commentaires et historique des modifications.
- À droite : objectif, campagne, cible, date de production, date limite de validation.
- Menu « … » de la fiche : dupliquer, décliner (Reel → Story, Reel → Carrousel, Instagram → Facebook, vidéo → brief Meta Ads), archiver. Les déclinaisons restent liées à l'original.

**Semaines et dates** : si la date d'une carte rangée dans une liste hebdomadaire change de semaine, une notification propose de la déplacer (et de créer la liste au besoin). Si vous déposez une carte datée dans une autre semaine, une notification propose d'ajuster la date. Rien n'est fait sans votre accord.

**Calendrier** : il affiche les mêmes cartes en vue mois, semaine, jour ou liste. Glisser une carte change sa date, et le tableau suit immédiatement. Un clic sur « + » crée une carte à cette date. Le bouton « Idées » liste les cartes sans date, à glisser sur un jour.

**Archives** : les cartes, listes et tableaux sont archivés, pas supprimés. On les restaure ou on les supprime définitivement depuis « Éléments archivés ».

## Ce qui fonctionne

| Étape | Contenu |
|---|---|
| 1. Trello éditorial | Tableaux multiples (créer, renommer, fond, dupliquer, archiver), listes personnalisables (créer, renommer, couleur, déplacer, dupliquer, archiver, compteur, ajout direct), cartes compactes (couverture, étiquettes, date, statut, plateformes, checklist, commentaires, pièces jointes, responsable), glisser-déposer cartes et listes avec ordre enregistré, fiche détaillée complète, checklist personnalisable, commentaires, historique, archives, sauvegarde automatique. |
| Étiquettes | Quatre familles (Activité, Plateforme, Format, Production) et des étiquettes libres. Création, renommage, couleur et suppression ; plusieurs étiquettes par carte ; filtres. Le statut de production reste un champ distinct. |
| 2. Calendrier | Vues mois, semaine, jour et liste, filtres par activité et plateforme, synchronisation avec le tableau, suggestion de semaine, retards signalés. |
| 3. Production | Campagnes (frise, brief, contenus, avancement, filtrage du tableau), modèles de cartes (Reel fitness, carrousel pédagogique, Meta Ads, soin, témoignage, promotion, shooting), alertes de production, vue de charge sur 14 jours (dates de production, de validation et de publication). |
| 4. IA | Assistant d'idées (« Propose-moi 5 idées de Reels… »), transformation en cartes après sélection. Depuis une carte : descriptions en plusieurs versions, script de Reel (accroche, plan par plan, voix off, textes à l'écran, CTA, durée), carrousel slide par slide. « Organiser mon mois » : répartition selon vos objectifs d'équilibre, campagnes, temps forts, formats récents et rythme souhaité, avec aperçu et validation avant tout ajout. |
| Intelligence locale | Détection de répétition, équilibre éditorial par rapport aux objectifs (Paramètres), banque d'idées, déclinaisons liées. Ces règles ne nécessitent pas d'IA. |
| 5. Avancé | Médiathèque (import par glisser-déposer, aperçu, activité, tags, droits d'utilisation, cartes liées, couverture), import Trello JSON (aperçu, étiquettes rapprochées par nom, doublons, éléments non récupérables signalés, import dans un nouveau tableau), statistiques de planning, export CSV, sauvegarde JSON, mot de passe d'accès optionnel. |

## Ce qui reste à faire

- **Comptes individuels et rôles** (Supabase Auth). Le schéma PostgreSQL, les rôles et les règles d'accès sont prêts dans `supabase/migrations/0001_init.sql`. Aujourd'hui, l'historique est signé avec le nom saisi dans Paramètres → Profil.
- **Synchronisation temps réel entre plusieurs postes** : elle viendra avec Supabase. En local, chaque poste recharge les données à l'ouverture.
- **Statistiques Meta et Instagram** : à connecter via les API officielles, après autorisation. Aucune donnée de performance n'est inventée.
- **Modèles de cartes modifiables** depuis l'interface (aujourd'hui, ils sont définis dans `src/lib/domain/constants.ts`).
- **Sauvegardes automatiques planifiées** ; la sauvegarde JSON est manuelle pour l'instant.

## Architecture

```
src/
  app/                  pages et routes API (boards, lists, cards, checklist, comments, labels, members,
                        settings, campaigns, media, ai, import/trello, export, backup, auth)
  components/
    board/              tableau : listes, cartes, glisser-déposer, menus, filtres, étiquettes, archives, alertes
    card/               fiche détaillée : champs auto-enregistrés, étiquettes, checklist, médias, IA, commentaires
    calendar/           calendrier synchronisé
    campaigns/ media/ ai/   campagnes, médiathèque, assistant
    ui/                 composants de base (Radix + Tailwind, façon shadcn/ui)
  lib/
    domain/             référentiels, types, schémas zod partagés client/serveur
    insights/           logique métier pure : alertes, équilibre, répétitions, saisons, planificateur
    server/             SQLite, migrations, dépôts, stockage des fichiers, IA, import Trello
    client/             store (mises à jour optimistes), synchronisation semaines/dates
supabase/migrations/    schéma PostgreSQL cible
```

**Choix techniques** : Next.js 15, TypeScript, Tailwind CSS, Radix UI, dnd-kit (glisser-déposer à la souris, au toucher et au clavier) et Lucide. Côté données, SQLite intégré à Node, derrière des dépôts asynchrones pour faciliter le passage à PostgreSQL. L'ordre des cartes et des listes utilise des positions fractionnaires : un déplacement ne réécrit qu'une ligne. Les dates sont stockées en heure locale des clubs, sans fuseau. Les fichiers sont écrits sur disque en flux, jamais dans la base. L'IA passe uniquement par le serveur, avec des sorties validées par schéma.
