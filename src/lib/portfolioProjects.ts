// Portfolio data for the /portfolio page (src/pages/Portfolio.tsx).
//
// Mocked/local for now, on purpose (Étape 1 of the portfolio redesign):
// no Supabase table backs this yet. The shape below is deliberately the
// one a future `portfolio_projects` table would use, so swapping this
// static array for a real query later only touches this file, not the
// page itself — `image`/`gallery`/`video`/`imageType` already exist for
// that reason, even though every project below has `image: null` and
// `imageType: "placeholder"` (no real project photos/videos available yet
// — see Portfolio.tsx's placeholder rendering for how that's handled
// honestly instead of using stock/fake imagery).
//
// Étape 2 (2026-09-06): descriptions/services updated to real, verified
// copy, and a `stats` field was added per project where a real, verified
// number was provided. Russel confirmed the "Total actuel" period wording
// for snapshot counts (see PortfolioProjectStat below) the same day.
// `stats` is now rendered on the 5 projects that have it (Étape 2.1,
// same day).
//
// Étape 3 (2026-09-06): first 4 real photos wired in (vendome-hotel,
// residence-hmr, kymo-cosmetics, cadafi-cosmedik) — files live in
// public/images/portfolio/, provided by Russel and renamed here from
// their original messy save-as names (spaces/parentheses/accents,
// double ".jpg.png" extension from being saved as PNG despite the
// original .jpg naming) to plain kebab-case. PACIFIK, Hotelsoft and
// GLN DIGITAL deliberately left on imageType: "placeholder" — not yet
// provided, not guessed at.

export type PortfolioCategory =
  | "social-media"
  | "publicite-digitale"
  | "creation-web"
  | "branding-design"
  | "strategie-digitale";

export const PORTFOLIO_CATEGORY_LABELS: Record<PortfolioCategory, string> = {
  "social-media": "Social Media",
  "publicite-digitale": "Publicité Digitale",
  "creation-web": "Création Web",
  "branding-design": "Branding & Design",
  "strategie-digitale": "Stratégie Digitale",
};

// Display order for the filter bar (mission section 3) — "Branding & Design"
// currently matches none of the 7 projects below, but stays selectable: a
// premium agency's category list shouldn't visibly change shape just
// because inventory happens to be thin in one category right now.
export const PORTFOLIO_CATEGORY_ORDER: PortfolioCategory[] = [
  "social-media",
  "publicite-digitale",
  "creation-web",
  "branding-design",
  "strategie-digitale",
];

/**
 * One verified, real data point about a project (e.g. a follower count or
 * an engagement change). Never invented — only added when the number was
 * explicitly provided and confirmed real.
 *
 * `period` exists specifically so a stat is never shown without its honest
 * measurement window (a snapshot total vs. a change "over the last 28
 * days" mean very different things, and mission Étape 2 was explicit that
 * a period-scoped stat must never read like a lifetime mission total).
 * Values here use "Total actuel" for a plain snapshot count (followers as
 * of now) rather than reusing the "28 derniers jours" wording that only
 * actually applies to the two change/growth metrics — confirmed with
 * Russel (2026-09-06), not just a proposal anymore. Still not rendered
 * anywhere; that's a separate, not-yet-requested step.
 */
export interface PortfolioProjectStat {
  /** What the number measures, e.g. "Abonnés", "Interactions". */
  label: string;
  /** The verified value as given, e.g. "2 417" or "+290,9%". */
  value: string;
  /** Honest measurement window — always shown alongside `value` once used. */
  period: string;
}

export interface PortfolioProject {
  id: string;
  slug: string;
  title: string;
  category: PortfolioCategory;
  description: string;
  services: string[];
  duration: string;
  /** Main project image. null until real assets are provided. */
  image: string | null;
  /** Accessible alt text for `image`, ready even before it exists. */
  imageAlt: string;
  /**
   * "real" once `image` is an actual project photo; "placeholder" while
   * Portfolio.tsx is rendering the on-brand placeholder panel instead.
   * Lets the card (or a future detail page) tell the two apart without
   * re-deriving it from whether `image` happens to be null.
   */
  imageType: "real" | "placeholder";
  /** Secondary/gallery images, for a future project detail page. */
  gallery: string[];
  /** Optional project video, for a future project detail page. */
  video: string | null;
  featured: boolean;
  /** Verified real stats, if any were provided. Not yet rendered — see the interface doc above. */
  stats?: PortfolioProjectStat[];
}

export const portfolioProjects: PortfolioProject[] = [
  {
    id: "vendome-hotel",
    slug: "vendome-hotel",
    title: "Vendôme Hôtel",
    category: "social-media",
    description:
      "Gestion et développement de la présence digitale d'un établissement hôtelier premium à Douala : contenu événementiel, offres promotionnelles et animation de la page Facebook.",
    services: ["Social Media Management", "Community Management", "Création de contenu"],
    duration: "4 mois",
    image: "/images/portfolio/vendome-hotel-1.png",
    imageAlt: "Vendôme Hôtel — gestion des réseaux sociaux par GLN Digital",
    imageType: "real",
    // Second real photo provided for this project — no detail page exists
    // yet to show a gallery, but the field was already there for this.
    gallery: ["/images/portfolio/vendome-hotel-2.png"],
    video: null,
    featured: false,
    stats: [
      { label: "Abonnés", value: "2 417", period: "Total actuel" },
      { label: "Interactions", value: "+290,9 %", period: "Sur les 28 derniers jours (vs période précédente)" },
      { label: "Vues", value: "+60 %", period: "Sur les 28 derniers jours" },
    ],
  },
  {
    id: "residence-hmr",
    slug: "residence-hmr",
    title: "Résidence HMR",
    category: "social-media",
    description:
      "Développement de la communication digitale d'une résidence hôtelière à Douala : mise en valeur du cadre, des services (piscine, restauration) et des offres, à travers des contenus événementiels réguliers.",
    services: ["Social Media Management", "Création de contenu", "Communication digitale"],
    duration: "4 mois",
    image: "/images/portfolio/residence-hmr-1.png",
    imageAlt: "Résidence HMR — communication digitale par GLN Digital",
    imageType: "real",
    gallery: [],
    video: null,
    featured: false,
    stats: [{ label: "Abonnés", value: "232", period: "Total actuel" }],
  },
  {
    id: "pacifik",
    slug: "pacifik",
    title: "PACIFIK SARL",
    category: "creation-web",
    description:
      "Conception et développement de la plateforme e-commerce Pacifik (pacifik.pro), puis accompagnement de sa transformation en application mobile PacifikApp.",
    services: ["Développement web", "E-commerce", "Accompagnement produit"],
    duration: "8 mois",
    image: null,
    imageAlt: "PACIFIK SARL — accompagnement e-commerce par GLN Digital",
    imageType: "placeholder",
    gallery: [],
    video: null,
    featured: false,
    stats: [{ label: "Abonnés Facebook", value: "22 000", period: "Total actuel" }],
    // Collaboration terminée — information interne communiquée pour Étape 2,
    // volontairement non affichée sur la carte publique (mission Étape 2).
  },
  {
    id: "hotelsoft",
    slug: "hotelsoft",
    title: "Hotelsoft",
    category: "strategie-digitale",
    description:
      "Accompagnement stratégique de Hotelsoft, plateforme de réservation hôtelière camerounaise référençant une cinquantaine d'établissements : structuration de la communication et supports marketing.",
    services: ["Stratégie digitale", "Marketing digital", "Supports de communication"],
    duration: "4 mois",
    image: null,
    imageAlt: "Hotelsoft — stratégie digitale par GLN Digital",
    imageType: "placeholder",
    gallery: [],
    video: null,
    featured: false,
    stats: [{ label: "Abonnés", value: "5 000", period: "Total actuel" }],
  },
  {
    id: "kymo-cosmetics",
    slug: "kymo-cosmetics",
    title: "Kymo Cosmetics",
    category: "social-media",
    description:
      "Gestion de la présence digitale d'une marque camerounaise de cosmétiques : mise en valeur produits, contenu éducatif et promotion de formations en cosmétique.",
    services: ["Social Media Management", "Création de contenu", "Community Management"],
    duration: "6 semaines",
    image: "/images/portfolio/kymo-cosmetics-1.png",
    imageAlt: "Kymo Cosmetics — présence digitale par GLN Digital",
    imageType: "real",
    gallery: [],
    video: null,
    featured: false,
    // Collaboration terminée — information interne communiquée pour Étape 2,
    // volontairement non affichée sur la carte publique (mission Étape 2).
    // Aucune stat vérifiée fournie pour ce projet.
  },
  {
    id: "cadafi-cosmedik",
    slug: "cadafi-cosmedik",
    title: "Cadafi Cosmedik",
    category: "social-media",
    description:
      "Gestion sur un an de la présence digitale d'une entreprise camerounaise de cosmétiques : contenu produit, formation et animation de communauté.",
    services: ["Social Media Management", "Community Management", "Création de contenu"],
    duration: "1 an",
    image: "/images/portfolio/cadafi-cosmetik-1.png",
    imageAlt: "Cadafi Cosmedik — communication digitale par GLN Digital",
    imageType: "real",
    gallery: [],
    video: null,
    featured: false,
    stats: [{ label: "Abonnés", value: "22 000", period: "Total actuel" }],
  },
  {
    id: "gln-digital",
    slug: "gln-digital",
    title: "GLN DIGITAL",
    category: "creation-web",
    description:
      "Conception et développement continu de l'écosystème digital de GLN DIGITAL : plateforme web, identité de marque et présence sur les réseaux sociaux.",
    services: ["Web", "Marketing digital", "Plateforme digitale"],
    duration: "Projet en évolution",
    image: null,
    imageAlt: "GLN DIGITAL — écosystème digital de l'agence",
    imageType: "placeholder",
    gallery: [],
    video: null,
    // The one project explicitly marked featured for this step (mission
    // section 6) — GLN Digital's own platform. ProjectCard gives it a
    // wider (2-column) footprint on tablet/desktop; nothing else changes
    // based on this flag yet.
    featured: true,
  },
];
