// Portfolio data for the /portfolio page (src/pages/Portfolio.tsx).
//
// Mocked/local for now, on purpose (Étape 1 of the portfolio redesign):
// no Supabase table backs this yet. The shape below is deliberately the
// one a future `portfolio_projects` table would use, so swapping this
// static array for a real query later only touches this file, not the
// page itself — `image`/`gallery`/`video` already exist as optional
// fields for that reason, even though every project below sets them to
// null (no real project photos/videos available yet — see Portfolio.tsx's
// placeholder rendering for how that's handled honestly instead of using
// stock/fake imagery).

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
  /** Secondary/gallery images, for a future project detail page. */
  gallery: string[];
  /** Optional project video, for a future project detail page. */
  video: string | null;
  featured: boolean;
}

export const portfolioProjects: PortfolioProject[] = [
  {
    id: "vendome-hotel",
    slug: "vendome-hotel",
    title: "Vendôme Hôtel",
    category: "social-media",
    description:
      "Gestion et développement de la présence digitale d'un établissement hôtelier.",
    services: ["Social Media Management", "Création de contenu", "Communication digitale"],
    duration: "4 mois",
    image: null,
    gallery: [],
    video: null,
    featured: false,
  },
  {
    id: "residence-hmr",
    slug: "residence-hmr",
    title: "Résidence HMR",
    category: "social-media",
    description:
      "Développement de la communication digitale et mise en valeur de l'expérience client.",
    services: ["Social Media Management", "Content Strategy", "Communication digitale"],
    duration: "4 mois",
    image: null,
    gallery: [],
    video: null,
    featured: false,
  },
  {
    id: "pacifik",
    slug: "pacifik",
    title: "PACIFIK SARL",
    category: "creation-web",
    description:
      "Accompagnement digital d'un projet e-commerce et développement de sa présence en ligne.",
    services: ["E-commerce", "Marketing digital", "Présence digitale"],
    duration: "8 mois",
    image: null,
    gallery: [],
    video: null,
    featured: false,
  },
  {
    id: "hotelsoft",
    slug: "hotelsoft",
    title: "Hotelsoft",
    category: "strategie-digitale",
    description:
      "Développement de la visibilité digitale d'une solution dédiée au secteur hôtelier.",
    services: ["Marketing digital", "Communication", "Stratégie digitale"],
    duration: "4 mois",
    image: null,
    gallery: [],
    video: null,
    featured: false,
  },
  {
    id: "kymo-cosmetics",
    slug: "kymo-cosmetics",
    title: "Kymo Cosmetics",
    category: "social-media",
    description:
      "Développement de la présence digitale d'une marque dans l'univers des cosmétiques.",
    services: ["Social Media Management", "Création de contenu", "Communication digitale"],
    duration: "6 semaines",
    image: null,
    gallery: [],
    video: null,
    featured: false,
  },
  {
    id: "cadafi-cosmedik",
    slug: "cadafi-cosmedik",
    title: "Cadafi Cosmedik",
    category: "social-media",
    description:
      "Accompagnement de la présence digitale et de la communication d'une marque cosmétique.",
    services: ["Community Management", "Content Strategy", "Communication digitale"],
    duration: "1 an",
    image: null,
    gallery: [],
    video: null,
    featured: false,
  },
  {
    id: "gln-digital",
    slug: "gln-digital",
    title: "GLN DIGITAL",
    category: "creation-web",
    description: "Conception et développement de l'écosystème digital de GLN DIGITAL.",
    services: ["Web", "Marketing digital", "Plateforme digitale"],
    duration: "Projet en évolution",
    image: null,
    gallery: [],
    video: null,
    featured: false,
  },
];
