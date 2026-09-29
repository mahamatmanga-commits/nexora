/* Fictional but realistic demo data for the NOVA landing page. */

export const navLinks = [
  { label: 'Produit', href: '#dashboard' },
  { label: 'Solutions', href: '#fonctionnalites' },
  { label: 'Tarifs', href: '#tarifs' },
  { label: 'Ressources', href: '#equipe' },
]

export const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']

export const kpis = [
  {
    label: 'Impressions',
    value: 4.82,
    decimals: 2,
    suffix: ' M',
    delta: '+18,4 %',
    trend: [32, 35, 34, 40, 38, 44, 47, 45, 52, 55, 58, 63],
  },
  {
    label: 'Taux d’engagement',
    value: 6.7,
    decimals: 1,
    suffix: ' %',
    delta: '+1,2 pt',
    trend: [4.8, 5.1, 5.0, 5.4, 5.3, 5.8, 5.6, 6.0, 6.2, 6.1, 6.5, 6.7],
  },
  {
    label: 'Nouveaux abonnés',
    value: 28460,
    decimals: 0,
    prefix: '+',
    delta: '+24,1 %',
    trend: [1.2, 1.5, 1.4, 1.8, 2.0, 1.9, 2.3, 2.4, 2.6, 2.5, 2.9, 3.2],
  },
  {
    label: 'Conversions',
    value: 3942,
    decimals: 0,
    delta: '+11,8 %',
    trend: [210, 240, 232, 260, 255, 290, 300, 296, 320, 335, 342, 368],
  },
]

export const performance = {
  labels: months,
  series: [
    {
      name: 'Engagement',
      color: '#47a6ff',
      data: [182, 204, 198, 236, 228, 262, 281, 274, 312, 336, 351, 389],
    },
    {
      name: 'Portée organique',
      color: '#8b9cff',
      data: [140, 152, 160, 171, 180, 188, 196, 210, 218, 229, 241, 256],
    },
    {
      name: 'Objectif',
      color: 'rgba(203,213,245,0.55)',
      dashed: true,
      data: [170, 180, 190, 200, 210, 220, 230, 240, 250, 260, 270, 280],
    },
  ],
}

export const weeklyPosts = {
  labels: ['L', 'M', 'M', 'J', 'V', 'S', 'D'],
  data: [42, 58, 51, 74, 66, 38, 29],
  highlight: 3,
}

export const channelSplit = [
  { label: 'Instagram', value: 38, color: '#47a6ff' },
  { label: 'LinkedIn', value: 24, color: '#7c8cff' },
  { label: 'TikTok', value: 22, color: '#9fd4ff' },
  { label: 'Autres', value: 16, color: 'rgba(148,180,255,0.35)' },
]

export const topCampaigns = [
  { name: 'Lancement Printemps', client: 'Maison Aurèle', roi: '+312 %', progress: 86 },
  { name: 'Rentrée Digitale', client: 'Studio Kora', roi: '+188 %', progress: 64 },
  { name: 'Black Friday Teasing', client: 'Lumen Sport', roi: '+142 %', progress: 41 },
]

export const pricing = [
  {
    name: 'Starter',
    description: 'Pour les indépendants qui veulent structurer leur présence.',
    monthly: 29,
    yearly: 23,
    cta: 'Démarrer l’essai',
    features: [
      '5 comptes sociaux connectés',
      '1 espace de travail',
      'Calendrier éditorial',
      'Analytics essentiels (90 jours)',
      '3 rapports automatiques / mois',
    ],
  },
  {
    name: 'Pro',
    description: 'Pour les équipes marketing qui pilotent à la donnée.',
    monthly: 79,
    yearly: 63,
    featured: true,
    cta: 'Commencer avec Pro',
    features: [
      '25 comptes sociaux connectés',
      '5 membres inclus',
      'Campagnes multicanales',
      'Analytics avancés & benchmarks',
      'Rapports illimités en marque blanche',
      'Workflows de validation',
    ],
  },
  {
    name: 'Agency',
    description: 'Pour les agences qui gèrent des dizaines de marques.',
    monthly: 199,
    yearly: 159,
    cta: 'Parler à un expert',
    features: [
      'Comptes & clients illimités',
      '20 membres inclus',
      'Portail client dédié',
      'API & intégrations sur-mesure',
      'SSO, rôles avancés & audit',
      'Customer Success Manager',
    ],
  },
]

export const footerColumns = [
  {
    title: 'Produit',
    links: ['Analytics', 'Publication', 'Calendrier', 'Campagnes', 'Rapports', 'Nouveautés'],
  },
  {
    title: 'Solutions',
    links: ['Agences', 'Équipes marketing', 'Freelances', 'E-commerce', 'Grands comptes'],
  },
  {
    title: 'Ressources',
    links: ['Blog', 'Guides', 'Webinars', 'Centre d’aide', 'API', 'Statut'],
  },
  {
    title: 'Entreprise',
    links: ['À propos', 'Carrières', 'Presse', 'Partenaires', 'Contact'],
  },
]
