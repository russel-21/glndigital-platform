export type SiteContentPage =
  | "home"
  | "about"
  | "services"
  | "formations"
  | "partenaires"
  | "portfolio"
  | "blog";

export interface SiteContentBlock {
  id: string;
  page: SiteContentPage;
  title: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
  active: boolean;
  order: number;
}

const STORAGE_KEY = "gln_site_content_blocks";

export const siteContentPages: { value: SiteContentPage; label: string }[] = [
  { value: "home", label: "Accueil" },
  { value: "about", label: "A propos" },
  { value: "services", label: "Services" },
  { value: "formations", label: "Formations" },
  { value: "partenaires", label: "Partenaires" },
  { value: "portfolio", label: "Portefeuille" },
  { value: "blog", label: "Blog" },
];

export const getSiteContentBlocks = (): SiteContentBlock[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveSiteContentBlocks = (blocks: SiteContentBlock[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(blocks));
  window.dispatchEvent(new Event("gln-site-content-updated"));
};

export const getActiveSiteContentBlocks = (page: SiteContentPage) =>
  getSiteContentBlocks()
    .filter((block) => block.page === page && block.active)
    .sort((a, b) => a.order - b.order);
