# Océades Studio — calendrier éditorial

Outil de pilotage de la communication digitale des Océades (Fitness, Musculation, Aquatique, Institut) :
calendrier éditorial, fiches de publication, suivi de production, campagnes, médiathèque, assistant IA
et générateur de planning.

> Les contenus livrés au premier démarrage sont des **données de démonstration** (badge « Démo »).
> Supprimez-les en un clic dans **Paramètres → Données de démonstration**.

## Démarrer

Prérequis : **Node.js 22.13 ou plus récent** (la base SQLite utilise le module intégré `node:sqlite`, sans compilation native).

```bash
cd oceades-studio
npm install
npm run dev          # http://localhost:3000
```

Version de production :

```bash
npm run build
npm start            # http://localhost:3000
```

Au premier lancement, la base `data/oceades.db` est créée avec les données de démonstration.
Pour repartir de zéro : `npm run db:reset` puis relancer.

### Activer l'assistant IA (optionnel)

```bash
cp .env.example .env.local
# puis renseigner ANTHROPIC_API_KEY=… et redémarrer
```

La clé n'est lue que côté serveur (routes `/api/ai/*`) et n'est jamais envoyée au navigateur.
Sans clé, les boutons IA sont désactivés et un message l'explique : aucun résultat n'est simulé.
Le modèle par défaut est `claude-opus-5-5` (modifiable via `OCEADES_AI_MODEL`).

## Ce qui fonctionne

| Domaine | Fonctionnalités |
|---|---|
| **Calendrier** | Vues mois, semaine, jour, liste et Kanban ; création depuis un jour (bouton « + » ou double-clic) ou un créneau horaire ; glisser-déposer entre jours, créneaux et statuts (avec « Annuler ») ; Alt + déposer pour dupliquer ; plusieurs publications par jour (« + N autres ») ; recherche plein texte (`/`) ; filtres par activité, plateforme, statut, format, objectif et campagne ; coloration par activité, plateforme, statut ou campagne ; campagnes et temps forts affichés dans la grille ; navigation clavier (← → T, N pour créer). |
| **Fiches de publication** | Tous les champs (titre, date/heure, plateforme, activité, format, objectif, statut, description, accroche, CTA, visuels, notes, campagne) ; validation (zod) côté client et serveur ; compteur de caractères par plateforme ; duplication ; déclinaisons vers d'autres plateformes et formats ; checklist (visuel prêt, texte validé, date choisie, CTA présent, droits vérifiés) ; alertes de retard et de répétition. |
| **Boîte à idées** | Saisie express (titre + Entrée), idées non planifiées à glisser sur le calendrier. |
| **Production** | Kanban par statut avec glisser-déposer, filtres, progression de la checklist. |
| **Tableau de bord** | Programmées, en production, à valider, en retard ; répartition par activité et par plateforme ; pipeline des statuts ; prochaines publications ; campagnes en cours et leur avancement ; alertes (retards, contenus à risque sous 72 h, répétitions, équilibre éditorial) ; temps forts à venir ; filtres de période. Aucune métrique de performance n'est inventée. |
| **Campagnes** | Création et modification (nom, type campagne/événement, objectif, dates, activités, cible, messages clés, couleur) ; vue chronologique ; progression de la production ; liste des contenus ; lien vers le calendrier filtré. |
| **Médiathèque** | Import par glisser-déposer ou bouton avec progression ; aperçu image, vidéo (lecture avec Range) et PDF ; catégories, tags, recherche, droits d'utilisation, notes ; association aux publications ; téléchargement. Les fichiers sont écrits en flux sur disque (`storage/`), jamais dans la base (limite par défaut 1 Go, `OCEADES_MAX_UPLOAD_MB`). |
| **Assistant IA** | Formulaire activité, réseau, type, objectif, cible, période, ton, campagne, nombre de propositions ; génère idées, 3 accroches, légendes Instagram et Facebook, script de Reel, carrousel slide par slide, CTA, brief photo/vidéo et recommandation de format ; aperçu, modification, rejet, ajout au calendrier ou à la boîte à idées. Rien n'est publié automatiquement. |
| **Construire mon planning** | Mois, rythme hebdomadaire, activités à équilibrer, plateformes, jours et heures préférés ; analyse de l'existant (sous-représentation), alternance des formats, prise en compte des campagnes et des temps forts saisonniers, dates proposées ; aperçu du mois ; validation unitaire ou import de la sélection. Les publications existantes ne sont jamais modifiées. Avec une clé API, l'IA rédige l'idée de chaque créneau. |
| **Intelligence locale** | Détection de répétitions (similarité de vocabulaire sur 3 semaines), équilibre éditorial, suggestions saisonnières (calendrier français des temps forts), déclinaisons de contenus. Ces règles fonctionnent sans IA. |
| **Données** | Export CSV (compatible Excel), sauvegarde JSON complète, suppression des données de démo. |
| **Interface** | Mode clair et sombre (suit le système), responsive (menu latéral repliable, pastilles sur mobile), navigation clavier et lecteur d'écran pour le glisser-déposer, `prefers-reduced-motion` respecté. |

## À développer ensuite

- **Authentification et multi-utilisateur** : Supabase Auth, puis bascule des dépôts (`src/lib/server/repositories`) vers PostgreSQL. Le schéma, les rôles (lecteur, rédacteur, validateur, admin) et les règles RLS sont prêts dans `supabase/migrations/0001_init.sql`.
- **Stockage distant des médias** : Supabase Storage (URL signées, upload résumable) derrière l'interface `StorageAdapter` (`src/lib/server/storage.ts`).
- **Sauvegardes automatiques** et restauration depuis l'export JSON.
- **Historique des modifications** et commentaires de validation sur une fiche.
- **Connexions aux plateformes sociales** (Meta, TikTok, LinkedIn) pour importer les statistiques, uniquement via des intégrations autorisées.
- **Miniatures générées côté serveur** pour les vidéos lourdes (aujourd'hui, l'aperçu utilise la première image de la vidéo).
- **Tests automatisés dans le dépôt** : les parcours ont été vérifiés avec Playwright pendant le développement, mais aucune suite de tests n'est encore versionnée.

## Architecture

```
src/
  app/                    Pages (App Router) et routes API
    api/posts, campaigns, media, ai, export, backup, demo
  components/
    ui/                   Composants de base façon shadcn/ui (Radix + Tailwind)
    layout/               Navigation latérale, chargement
    calendar/             Vues mois/semaine/jour/liste/Kanban, filtres, glisser-déposer
    posts/                Fiche de publication, badges
    dashboard/ campaigns/ media/ ai/
  lib/
    domain/               Référentiels (libellés, couleurs), types, schémas zod partagés client/serveur
    insights/             Logique métier pure : retards, répétitions, équilibre, saisons, planificateur, déclinaisons
    server/               Base SQLite, dépôts, stockage de fichiers, IA, gestion des erreurs
    client/               Store React (mises à jour optimistes), client HTTP
supabase/migrations/      Schéma PostgreSQL cible
```

**Choix techniques**

- **Next.js 15 + TypeScript + Tailwind CSS**, composants façon **shadcn/ui** écrits dans le projet (Radix UI), icônes **Lucide**.
- **Calendrier sur mesure** (date-fns + dnd-kit) plutôt qu'une bibliothèque comme FullCalendar : il fallait une Kanban, une boîte à idées et des cibles de dépôt communes à toutes les vues, avec une apparence cohérente avec le reste de l'interface. dnd-kit gère souris, tactile et clavier.
- **SQLite intégré à Node** pour une persistance réelle dès la version locale, sans service à installer. Les accès passent par des dépôts asynchrones : passer à PostgreSQL ne changera pas l'interface ni les routes API.
- **Dates locales sans fuseau** (`2026-11-03T18:30`) : une publication prévue à 18h30 reste à 18h30 quel que soit le poste.
- **Validation partagée** : les mêmes schémas zod valident les formulaires et les routes API.
- **IA côté serveur uniquement**, sorties structurées validées par schéma, gestion explicite des erreurs (clé invalide, quota, refus, réponse incomplète).
- **Graphiques** : Recharts, avec des palettes vérifiées pour le daltonisme et des libellés directs (la couleur n'est jamais le seul indice).
