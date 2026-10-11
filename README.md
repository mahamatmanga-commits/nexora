# NOVA — Landing page SaaS

Landing page premium pour **NOVA**, plateforme fictive de pilotage marketing (réseaux sociaux, campagnes, contenus, statistiques, clients).

Dark mode bleu nuit, Liquid Glass / glassmorphism, halos bleus maîtrisés, animations au scroll et micro-interactions.

## Stack

- React 18 + Vite 5
- Tailwind CSS 3
- lucide-react (icônes d'interface), glyphes de réseaux dessinés en SVG
- Polices auto-hébergées : Inter & Space Grotesk (`@fontsource-variable`)
- Graphiques en SVG natif (aucune librairie de charts)

## Démarrer

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # build de production dans dist/
npm run preview
```

## Structure

```
src/
  components/
    ui/          # briques réutilisables
      GlassCard, Button, Badge, SectionHeading, Reveal, AnimatedNumber,
      Progress, Glow, Logo, Charts (AreaChart, BarChart, Donut, Sparkline), BrandIcons
    sections/    # sections de la page
      Navbar, Hero (+ DashboardPreview), LogoCloud, DashboardSection, Features (Bento),
      Integrations, Collaboration, Pricing, FinalCTA, Footer
  hooks/         # useInView, useCountUp, usePointerGlow
  data/content.js  # données fictives (KPI, séries, tarifs, liens)
  index.css      # utilitaires glass, reveal, gradients
```

## Effets

- **Glass** : `.glass` / `.glass-strong` (fond translucide, `backdrop-filter`, bordure lumineuse en dégradé via masque, reflet supérieur).
- **Scroll reveal** : `<Reveal delay={…}>` (fondu + translation + dé-flou via IntersectionObserver).
- **Chiffres animés** : `<AnimatedNumber value={…} />` (formatage `fr-FR`).
- **Spotlight** : les cartes `interactive` suivent le curseur.
- **Hero** : inclinaison 3D de l'aperçu du dashboard selon la souris, puces flottantes.
- **Graphiques** : tracé animé, survol avec crosshair et infobulle.
- `prefers-reduced-motion` respecté.

## Mini-jeu : NOVA Run

Coureur sans fin en canvas 2D (sans dépendance), servi sur **`/runner/`** (`npm run dev` → http://localhost:5173/runner/).

- **Contrôles** : `Espace` / `↑` / clic / toucher pour sauter (maintenir = saut plus haut), `↓` / `S` / clic droit / bouton « Glisser » pour glisser (en l'air : descente rapide), `P` pause, `M` son.
- **Obstacles procéduraux** : blocs bas et hauts, lasers (à glisser dessous), drones (sauter ou glisser), puis enchaînements (paires, triples, laser + bloc…). Les écarts se resserrent et les motifs se complexifient au fil du temps ; chaque motif est généré pour rester franchissable à la vitesse courante.
- **Rampes de vitesse** : palier toutes les 14 s (bannière « Vitesse x… »), jusqu'à ~2,45x.
- **Combo** : chaque obstacle franchi prolonge le combo (fenêtre de 3,2 s) ; multiplicateur +1 tous les 5 combos (max x8), bonus « Juste ! » pour un passage au ras.
- **Record** persistant dans `localStorage` (`nova-run:best`).
- **Animations** : squash & stretch au saut et à l'atterrissage, poussière, traînée de vitesse, collision avec hit-stop, ralenti, secousse, flash et éclats ; écran de fin avec redémarrage. `prefers-reduced-motion` respecté.

Code : `runner/index.html`, `src/runner/main.js`, `src/runner/runner.css` (entrée ajoutée dans `vite.config.js`).
