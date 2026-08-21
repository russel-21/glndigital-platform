export interface CompetitiveFeature {
  name: string;
  category: "seo" | "content" | "publishing" | "ai" | "analytics" | "conversion" | "support";
  description: string;
  glnOpportunity: string;
}

export interface CompetitiveMetricClaim {
  label: string;
  value: string;
  context: string;
}

export interface CompetitiveProfile {
  id: string;
  productName: string;
  companyName: string;
  website: string;
  category: string;
  scrapedAt: string;
  sourceUrls: string[];
  positioning: string;
  funnelSummary: string[];
  pricingSignals: string[];
  integrations: string[];
  languageSupport: string;
  metricClaims: CompetitiveMetricClaim[];
  features: CompetitiveFeature[];
  gapsForGLN: string[];
  glnCounterPositioning: string[];
  dataConfidence: "low" | "medium" | "high";
}

// Libellés d'affichage FR pour les valeurs d'enum (types conservés en
// anglais côté code — ce sont des identifiants techniques internes — mais
// jamais affichés tels quels dans l'admin ; voir CompetitiveIntelAdmin
// dans src/pages/Admin.tsx).
export const DATA_CONFIDENCE_LABELS: Record<CompetitiveProfile["dataConfidence"], string> = {
  low: "Faible",
  medium: "Moyenne",
  high: "Élevée",
};

export const FEATURE_CATEGORY_LABELS: Record<CompetitiveFeature["category"], string> = {
  seo: "SEO",
  content: "Contenu",
  publishing: "Publication",
  ai: "IA",
  analytics: "Analytique",
  conversion: "Conversion",
  support: "Support",
};

export const defaultCompetitiveIntel: CompetitiveProfile[] = [
  {
    id: "soro-2026-06-12",
    productName: "Soro",
    companyName: "DIGIMERI OU",
    website: "https://trysoro.com",
    category: "Pilote automatique SEO et publication de contenu par IA",
    scrapedAt: "2026-06-12",
    sourceUrls: [
      "https://trysoro.com/",
      "https://trysoro.com/pricing"
    ],
    positioning: "Pilote automatique SEO qui recherche des mots-clés, rédige des articles optimisés et publie du contenu automatiquement pour la découverte via Google et les IA.",
    funnelSummary: [
      "Le trafic payant envoie les visiteurs vers une page de destination/quiz avec une promesse d'automatisation.",
      "L'offre réduit la friction en demandant simplement l'URL du site et en promettant une mise en place en quelques minutes.",
      "La valeur du produit est présentée autour de la publication quotidienne, des mots-clés acheteurs, de la visibilité Google et de la visibilité ChatGPT.",
      "La page de tarification renforce la réduction du risque perçu avec le support, un paiement sécurisé et une garantie de remboursement."
    ],
    pricingSignals: [
      "La page de tarification publique démarre à 39 USD par mois.",
      "Les formules indiquent de 30 à un nombre illimité d'articles par mois selon l'abonnement.",
      "La page met en avant des formules mensuelles flexibles sans engagement minimum.",
      "Une garantie de remboursement de 14 jours est présentée pour réduire le risque perçu."
    ],
    integrations: [
      "WordPress",
      "Shopify",
      "Wix",
      "Webflow",
      "Notion",
      "HubSpot",
      "Ghost",
      "Next.js",
      "Webhooks / intégrations personnalisées"
    ],
    languageSupport: "50+ langues selon la page de tarification publique.",
    metricClaims: [
      {
        label: "Contenu publié",
        value: "200k+ articles",
        context: "Affirmation de preuve sociale/performance sur la page d'accueil."
      },
      {
        label: "Impressions de recherche",
        value: "1,6 Md d'impressions",
        context: "Affirmation de preuve sociale/performance sur la page d'accueil."
      },
      {
        label: "Clics de recherche",
        value: "30 M de clics",
        context: "Affirmation de preuve sociale/performance sur la page d'accueil."
      },
      {
        label: "Signal de confiance",
        value: "Note Trustpilot de 4,9",
        context: "Signal de confiance en pied de page/tarification."
      }
    ],
    features: [
      {
        name: "Recherche de mots-clés",
        category: "seo",
        description: "Identifie des sujets de recherche susceptibles d'attirer des acheteurs.",
        glnOpportunity: "Ajouter des mots-clés à intention d'achat, une intention WhatsApp, des termes de villes locales et des angles de campagne."
      },
      {
        name: "Génération quotidienne d'articles",
        category: "content",
        description: "Crée des articles SEO longs selon un calendrier récurrent.",
        glnOpportunity: "Générer ensemble des articles, des scripts de Reels, des scripts WhatsApp, des angles publicitaires et des textes de pages de destination."
      },
      {
        name: "Publication automatique",
        category: "publishing",
        description: "Publie le contenu directement sur les plateformes CMS connectées.",
        glnOpportunity: "Ajouter des circuits de validation pour les experts GLN, puis publier sur le site et les réseaux sociaux."
      },
      {
        name: "Optimisation Google + IA",
        category: "ai",
        description: "Structure le contenu pour le classement Google et la visibilité dans les réponses IA.",
        glnOpportunity: "Optimiser pour Google, ChatGPT, la conversion WhatsApp, Meta Ads et les signaux de preuve locaux."
      },
      {
        name: "Apprentissage du ton de marque",
        category: "ai",
        description: "Apprend le ton et le style à partir du site connecté.",
        glnOpportunity: "Apprendre le ton de marque à partir du site, des pages sociales, des témoignages, des conversations WhatsApp et des détails de l'offre."
      },
      {
        name: "Maillage interne/externe",
        category: "seo",
        description: "Ajoute des liens pour renforcer la pertinence thématique.",
        glnOpportunity: "Ajouter des liens ainsi que des parcours de conversion : audit, pages de services, proforma, appel à l'action WhatsApp et pages de reciblage."
      },
      {
        name: "Génération d'images par IA",
        category: "content",
        description: "Crée des visuels pour les articles.",
        glnOpportunity: "Générer des briefs visuels de campagne et des directions créatives pour les designers, pas seulement des images de blog."
      }
    ],
    gapsForGLN: [
      "Soro se concentre sur les articles SEO ; GLN peut combiner SEO, réseaux sociaux, Meta Ads, closing WhatsApp, proforma et suivi CRM.",
      "Le tunnel public de Soro est global et en libre-service ; GLN peut se localiser pour le Cameroun, Douala, Yaoundé et l'Afrique Centrale.",
      "Soro optimise la visibilité ; GLN devrait optimiser la visibilité ainsi que la qualification des leads et la conversion commerciale.",
      "Soro semble privilégier le contenu en premier ; GLN peut privilégier le diagnostic en premier avec des scores d'audit, un benchmark concurrentiel et un plan d'action commercial."
    ],
    glnCounterPositioning: [
      "Du pilote automatique SEO au pilote automatique d'acquisition.",
      "Des articles quotidiens au contenu quotidien, aux publicités, aux scripts WhatsApp et aux supports de conversion.",
      "De la croissance du trafic aux leads qualifiés et clients signés.",
      "D'un SEO global générique à une exécution locale pour le marché du Cameroun et de l'Afrique."
    ],
    dataConfidence: "high"
  },
  {
    id: "nuelink-2026-06-12",
    productName: "Nuelink",
    companyName: "Nuelink",
    website: "https://nuelink.com",
    category: "Planification, automatisation et analytique des réseaux sociaux",
    scrapedAt: "2026-06-12",
    sourceUrls: [
      "https://nuelink.com/",
      "https://nuelink.com/pricing",
      "https://nuelink.com/features"
    ],
    positioning: "Plateforme d'automatisation des réseaux sociaux qui planifie, republie en croisé, recycle, analyse et publie automatiquement du contenu sur les principaux réseaux sociaux.",
    funnelSummary: [
      "Le trafic payant met en avant une promesse d'automatisation faisant gagner du temps pour les créateurs, vendeurs e-commerce, agences et petites entreprises.",
      "La page d'accueil présente le produit comme un moteur de réseaux sociaux « configurez et oubliez », connecté aux blogs, boutiques, podcasts, avis et flux RSS.",
      "Le parcours de conversion met en avant un essai gratuit de 7 jours, une mise en place rapide, de multiples réseaux sociaux et une remise annuelle d'anniversaire.",
      "Le discours produit se positionne face aux outils de planification en réunissant automatisation, republication croisée, recyclage de contenu evergreen, commentaires, analytique et assistance IA."
    ],
    pricingSignals: [
      "La tarification annuelle publique d'anniversaire démarre à 12 USD/mois pour l'offre Standard, soit 144 USD payés annuellement.",
      "Premium est affiché à 32 USD/mois en annuel, Business à 52 USD/mois en annuel, Agency à 85,3 USD/mois en annuel, et Agency-Plus à 152 USD/mois en annuel.",
      "Les formules évoluent selon le nombre de marques, membres, réseaux sociaux, automatisations, collections, crédits IA, emplacements de lien en bio et taille de la file d'attente.",
      "La page de tarification indique 0 USD à payer aujourd'hui pour l'essai gratuit, ainsi qu'une offre annuelle « 4 mois offerts » active autour de la campagne de juin 2026."
    ],
    integrations: [
      "Facebook",
      "Instagram",
      "TikTok",
      "LinkedIn",
      "X / Twitter",
      "Pinterest",
      "YouTube",
      "Threads",
      "Bluesky",
      "Google Business",
      "Telegram",
      "Mastodon",
      "Shopify",
      "Etsy",
      "WooCommerce",
      "Wix",
      "Squarespace",
      "Weebly",
      "WordPress",
      "Substack",
      "RSS",
      "Spotify Podcasts",
      "Zapier",
      "IFTTT",
      "Make",
      "Pabbly",
      "Canva",
      "API publique",
      "Accès MCP"
    ],
    languageSupport: "Ne met pas l'accent en premier lieu sur la couverture linguistique ; se positionne plutôt sur la publication multiplateforme et l'automatisation.",
    metricClaims: [
      {
        label: "Utilisateurs",
        value: "60 000+ créateurs et entreprises",
        context: "Affirmation de preuve sociale sur la page d'accueil."
      },
      {
        label: "Publications publiées",
        value: "15 M+ publications",
        context: "Affirmation de preuve sociale sur la page d'accueil."
      },
      {
        label: "Pays",
        value: "90+ pays",
        context: "Affirmation de preuve sociale sur la page d'accueil."
      },
      {
        label: "Note des avis",
        value: "4,9/5 sur plus de 600 avis",
        context: "Signal de confiance sur la page d'accueil et de tarification."
      },
      {
        label: "Automatisations",
        value: "45 automatisations natives",
        context: "Argument différenciateur mis en avant sur la page d'accueil."
      }
    ],
    features: [
      {
        name: "Planification multiplateforme",
        category: "publishing",
        description: "Planifie et publie du contenu sur 12 grandes plateformes sociales depuis un seul tableau de bord.",
        glnOpportunity: "Construire la planification GLN autour des campagnes, offres, audits, appels à l'action WhatsApp et calendriers de publication locaux."
      },
      {
        name: "Automatisations",
        category: "publishing",
        description: "Transforme automatiquement les nouveaux articles de blog, produits, podcasts, avis et éléments RSS en publications sociales.",
        glnOpportunity: "Générer des supports d'acquisition à partir des audits, services, témoignages, proformas et offres produits, pas seulement des flux sources."
      },
      {
        name: "Parcours de republication croisée",
        category: "content",
        description: "Recycle les publications entre plateformes comme Instagram Reels, TikTok, YouTube Shorts, Facebook, Threads, Bluesky et LinkedIn.",
        glnOpportunity: "Ajouter des règles de format locales, des accroches, des sous-titres et des variantes d'appel à l'action propres à chaque plateforme pour les audiences camerounaises."
      },
      {
        name: "Collections et file d'attente",
        category: "content",
        description: "Organise les publications par thème/campagne et les diffuse progressivement via des files d'attente et calendriers programmés.",
        glnOpportunity: "Créer des collections de campagnes GLN : notoriété, preuve, offre, traitement des objections, reciblage et suivi WhatsApp."
      },
      {
        name: "Boîte de réception des commentaires",
        category: "conversion",
        description: "Centralise les commentaires et mentions des réseaux sociaux pour un engagement plus rapide.",
        glnOpportunity: "Transformer les commentaires en leads avec des étiquettes de qualification, un transfert vers WhatsApp, une attribution à un closer et un statut CRM."
      },
      {
        name: "Analytique et publications les plus performantes",
        category: "analytics",
        description: "Suit les abonnés, vues, engagement, impressions, clics, publications les plus performantes, statistiques de liens et de hashtags.",
        glnOpportunity: "Relier l'analytique sociale aux indicateurs de revenu : leads WhatsApp, coût par lead, rendez-vous, proformas et affaires conclues."
      },
      {
        name: "Assistant IA Nue",
        category: "ai",
        description: "Aide pour les idées, légendes, hashtags, reformulations et brouillons de publications.",
        glnOpportunity: "Faire de l'IA GLN un outil axé stratégie en premier : diagnostic d'audit, stratégie de campagne, textes publicitaires, scripts WhatsApp, pages de destination et suivi commercial."
      },
      {
        name: "Accès API publique et MCP",
        category: "ai",
        description: "Propose une publication programmatique et une intégration de workflow pour les outils et agents IA.",
        glnOpportunity: "Exposer plus tard des API de workflow GLN pour l'ingestion d'audits, la génération de contenu, la validation de publication et la synchronisation CRM."
      },
      {
        name: "Lien en bio et liens courts",
        category: "conversion",
        description: "Fournit des mini pages de destination et des liens courts traçables.",
        glnOpportunity: "Créer des pages bio GLN qui priorisent l'audit, WhatsApp, les offres, les témoignages et les pixels de reciblage de campagne."
      }
    ],
    gapsForGLN: [
      "Nuelink privilégie l'automatisation en premier ; GLN peut privilégier l'acquisition en premier en reliant l'activité sociale aux audits, proformas, conversion WhatsApp et résultats CRM.",
      "Nuelink optimise les opérations de contenu ; GLN devrait optimiser le diagnostic business, la qualité de l'offre, la rentabilité des campagnes et le workflow des closers.",
      "Nuelink prend en charge de nombreux canaux ; GLN peut se démarquer grâce à la connaissance du marché local, des textes en français/anglais adaptés au Cameroun et une conversion axée WhatsApp en priorité.",
      "Nuelink centralise les commentaires ; GLN peut classer les commentaires en leads chauds, objections, problèmes de support ou opportunités de vente additionnelle.",
      "Nuelink se positionne sur l'API publique/MCP ; GLN peut préparer de futurs workflows d'agents pour l'exécution audit-vers-campagne."
    ],
    glnCounterPositioning: [
      "De la planification des réseaux sociaux à l'orchestration de l'acquisition commerciale.",
      "De la republication croisée à des campagnes de conversion spécifiques à chaque canal.",
      "Des légendes générées par IA au diagnostic, à la stratégie, aux scripts, pages de destination et proformas générés par IA.",
      "De l'analytique d'engagement à l'analytique du revenu et des leads WhatsApp.",
      "D'une automatisation générique à une exécution localisée pour les entreprises du Cameroun et d'Afrique."
    ],
    dataConfidence: "high"
  }
];

export const getCompetitiveIntel = (): CompetitiveProfile[] => {
  const data = localStorage.getItem("gln_competitive_intel_db");
  if (!data) {
    localStorage.setItem("gln_competitive_intel_db", JSON.stringify(defaultCompetitiveIntel));
    return defaultCompetitiveIntel;
  }

  try {
    return JSON.parse(data);
  } catch {
    return defaultCompetitiveIntel;
  }
};

export const saveCompetitiveIntel = (profiles: CompetitiveProfile[]) => {
  localStorage.setItem("gln_competitive_intel_db", JSON.stringify(profiles));
};

export const resetCompetitiveIntel = () => {
  saveCompetitiveIntel(defaultCompetitiveIntel);
  return defaultCompetitiveIntel;
};
