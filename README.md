> **Nouveau : [Océades Studio](./oceades-studio/README.md)** — tableau éditorial façon Trello pour les Océades (Next.js), dans le dossier `oceades-studio/`.

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
