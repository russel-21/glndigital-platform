export interface AuditCriteria {
  score: number; // 1 to 5
  notes: string;
}

export interface SocialGrid {
  profileBranding: AuditCriteria; // photo, cover, bio, professionalism
  contentQuality: AuditCriteria; // coherence, visuels, hooks, frequency
  engagement: AuditCriteria; // likes, comments, reach
  conversion: AuditCriteria; // WhatsApp, contact button, clear offer, tunnel
}

export interface AdsGrid {
  targeting: AuditCriteria;
  creatives: AuditCriteria;
  message: AuditCriteria;
  objective: AuditCriteria;
  landingPage: AuditCriteria;
}

export interface WebGrid {
  speed: AuditCriteria;
  design: AuditCriteria;
  credibility: AuditCriteria;
  conversionCta: AuditCriteria;
  mobileResponsive: AuditCriteria;
  seoBasic: AuditCriteria;
}

export interface BusinessGrid {
  offer: AuditCriteria;
  differentiation: AuditCriteria;
  target: AuditCriteria;
  valueProposition: AuditCriteria;
}

export interface CompetitorData {
  name: string;
  visibility: number; // 0-10
  branding: number; // 0-10
  conversion: number; // 0-10
  global: number; // 0-10
}

export interface ScreenshotAnnotation {
  id: string;
  x: number; // percentage from left (0-100)
  y: number; // percentage from top (0-100)
  title: string;
  notes: string;
  severity: "low" | "medium" | "high";
}

export interface ChannelMetrics {
  followers: string;
  engagementRate: string;
  postFrequency: string;
  profileScore: number;
  creationDate?: string;
  totalPosts?: number;
  photosCount?: number;
  videosCount?: number;
  reelsCount?: number;
  sponsoredPosts?: string;
  campaignComparison?: string;
  organicReach?: string;
  sponsoredReach?: string;
  visibilityPitch?: string;
  lastPostDate?: string;
  lastPostLikes?: number;
  lastPostComments?: number;
  lastPostShares?: number;
  lastPostViews?: number;
}

export interface SocialMetrics {
  followers: string;
  engagementRate: string;
  postFrequency: string;
  profileScore: number;
  creationDate?: string;
  totalPosts?: number;
  photosCount?: number;
  videosCount?: number;
  reelsCount?: number;
  sponsoredPosts?: string;
  campaignComparison?: string;
  organicReach?: string;
  sponsoredReach?: string;
  visibilityPitch?: string;
  lastPostDate?: string;
  lastPostLikes?: number;
  lastPostComments?: number;
  lastPostShares?: number;
  lastPostViews?: number;
}

export interface WebMetrics {
  fcp: number; // seconds
  lcp: number; // seconds
  speedIndex: number; // seconds
  cls: number; // score
  performanceScore: number; // 0-100
  seoScore: number; // 0-100
  mobileScore: number; // 0-100
}

export interface ScoringChecklist {
  visibility: {
    fbActive: boolean;
    instaActive: boolean;
    tiktokActive: boolean;
    seoLocal: boolean;
    reachGood: boolean;
  };
  branding: {
    coherentGraphics: boolean;
    highQualityPhotos: boolean;
    videoReelsUsed: boolean;
    clearBio: boolean;
    socialProof: boolean;
  };
  conversion: {
    whatsappCtaActive: boolean;
    linktreeCtaClear: boolean;
    fastLandingPage: boolean;
    metaPixelInstalled: boolean;
    metaAdsCampaignActive: boolean;
  };
}

export interface AIGrowthSuite {
  acquisitionStrategy: string[];
  contentCalendar: string[];
  whatsappScripts: string[];
  landingPageSections: string[];
  seoKeywords: string[];
  executionPlan: string[];
}

export interface AuditReport {
  socialGrid?: SocialGrid;
  adsGrid?: AdsGrid;
  webGrid?: WebGrid;
  businessGrid?: BusinessGrid;
  generalErrors: string[];
  recommendations: string[];
  overallSummary: string;
  // Express Audit Fields
  visibilityScore?: number; // 0-10
  brandingScore?: number; // 0-10
  conversionScore?: number; // 0-10
  strongPoints?: string[];
  weakPoints?: string[];
  // 7 AI Engines Integration Fields
  competitors?: CompetitorData[];
  screenshotAnnotations?: ScreenshotAnnotation[];
  socialMetrics?: SocialMetrics;
  channelsMetrics?: {
    facebook?: ChannelMetrics;
    instagram?: ChannelMetrics;
    tiktok?: ChannelMetrics;
    snapchat?: ChannelMetrics;
    youtube?: ChannelMetrics;
    google?: ChannelMetrics;
  };
  webMetrics?: WebMetrics;
  aiTone?: "Growth" | "Branding" | "Technical" | "Direct";
  screenshotType?: "website" | "facebook" | "instagram";
  customScreenshot?: string;
  scoringChecklist?: ScoringChecklist;
  aiGrowthSuite?: AIGrowthSuite;
}

export interface CRMDetails {
  assignedCloser?: string;
  whatsappFollowupSent?: boolean;
  crmStatus?: "new" | "analyzing" | "closer_assigned" | "contacted" | "closed_won" | "closed_lost";
  internalNotes?: string;
}

export interface ProformaItem {
  description: string;
  price: number;
}

export interface ProformaInvoice {
  invoiceNumber: string;
  items: ProformaItem[];
  totalAmount: number;
  paymentInstructions: string;
}

export interface AuditRequest {
  id: string;
  clientName: string;
  email: string;
  phone: string;
  companyName?: string;
  auditTypes: ("social" | "ads" | "web" | "business")[];
  details: {
    socialLink?: string;
    websiteUrl?: string;
    hasAds?: boolean;
    additionalNotes?: string;
  };
  singleLink?: string;
  proforma?: ProformaInvoice;
  // Express Audit Form Fields
  activitySector?: string;
  city?: string;
  country?: string;
  facebookLink?: string;
  instagramLink?: string;
  tiktokLink?: string;
  snapchatLink?: string;
  youtubeLink?: string;
  googleAnalytics?: string;
  websiteUrl?: string;
  mainObjective?: string;
  marketingBudget?: string;
  mainProblem?: string;
  reportChoice?: "pdf" | "video";
  status: "pending" | "completed";
  createdAt: string;
  completedAt?: string;
  report?: AuditReport;
  crm?: CRMDetails;
}

export const defaultAuditRequests: AuditRequest[] = [
  {
    id: "aud-001",
    clientName: "Hôtel Bonapriso Douala",
    email: "contact@hotelbonapriso.cm",
    phone: "+237 670 112 233",
    companyName: "Hôtel Bonapriso",
    auditTypes: ["social", "web"],
    activitySector: "Hôtellerie",
    city: "Douala",
    country: "Cameroun",
    mainObjective: "Plus de clients",
    marketingBudget: "500k - 1M FCFA",
    mainProblem: "Nous n'arrivons pas à attirer les clients professionnels pour nos suites.",
    reportChoice: "pdf",
    details: {
      socialLink: "https://facebook.com/hotelbonaprisodouala",
      websiteUrl: "https://hotelbonaprisodouala.com",
      hasAds: false,
      additionalNotes: "Nous n'arrivons pas à attirer les clients professionnels pour nos suites."
    },
    status: "pending",
    createdAt: "2026-05-29T14:30:00Z",
    report: {
      visibilityScore: 5,
      brandingScore: 5,
      conversionScore: 4,
      strongPoints: ["Bonne localisation géographique en plein cœur de Douala.", "Bâtiment moderne avec de beaux visuels potentiels."],
      weakPoints: ["Site web lent sur mobile et non optimisé SEO local.", "Absence totale de publications vidéo/Reels sur les réseaux sociaux."],
      generalErrors: ["Le bouton de réservation sur le site renvoie une erreur 404.", "Aucun lien WhatsApp direct."],
      recommendations: ["Installer un widget de chat WhatsApp direct.", "Créer des vidéos de type visite guidée des suites."],
      overallSummary: "Diagnostic initial généré automatiquement. Prêt pour validation par l'expert GLN.",
      screenshotAnnotations: [
        { id: "pin-a1", x: 40, y: 15, title: "Bio Instagram incomplète", notes: "L'adresse et le numéro WhatsApp ne sont pas cliquables.", severity: "medium" },
        { id: "pin-a2", x: 60, y: 75, title: "CTA réservation introuvable", notes: "Le bouton de réservation est caché en bas de page.", severity: "high" }
      ],
      competitors: [
        { name: "Hôtel Krystal Douala", visibility: 8, branding: 7, conversion: 7, global: 7.3 },
        { name: "Star Land Hotel", visibility: 7, branding: 8, conversion: 6, global: 7.0 }
      ],
      socialMetrics: {
        followers: "2.4k",
        engagementRate: "1.2%",
        postFrequency: "1 post / semaine",
        profileScore: 5
      },
      webMetrics: {
        fcp: 2.9,
        lcp: 5.4,
        speedIndex: 3.8,
        cls: 0.18,
        performanceScore: 45,
        seoScore: 65,
        mobileScore: 55
      },
      aiTone: "Growth",
      screenshotType: "website"
    },
    crm: {
      assignedCloser: "Cedric Y.",
      crmStatus: "analyzing",
      internalNotes: "Prospect hôtelier à forte valeur ajoutée."
    }
  },
  {
    id: "aud-002",
    clientName: "Cadafi Cosmetik",
    email: "info@cadafi-cosmetik.com",
    phone: "+237 699 887 766",
    companyName: "Cadafi Cosmetik",
    auditTypes: ["social", "ads"],
    activitySector: "Cosmétique",
    city: "Yaoundé",
    country: "Cameroun",
    mainObjective: "Plus de ventes",
    marketingBudget: "100k - 500k FCFA",
    mainProblem: "Nos ventes stagnent malgré nos boosts de publications Facebook.",
    reportChoice: "pdf",
    details: {
      socialLink: "https://instagram.com/cadafi_cosmetik",
      hasAds: true,
      additionalNotes: "Nos ventes stagnent malgré nos boosts de publications Facebook."
    },
    status: "completed",
    createdAt: "2026-05-28T09:15:00Z",
    completedAt: "2026-05-29T10:00:00Z",
    report: {
      visibilityScore: 6,
      brandingScore: 5,
      conversionScore: 4,
      strongPoints: [
        "Identité visuelle existante et colorée.",
        "Photos de produits réelles et de bonne qualité."
      ],
      weakPoints: [
        "Boosting de publication brut inefficace (besoin de campagnes de conversion).",
        "Manque d'utilisation du format vidéo Reels."
      ],
      generalErrors: [
        "Utilisation de l'objectif Trafic/Boost au lieu de l'objectif Ventes dans le gestionnaire de publicités.",
        "Pas d'offre d'appel forte pour les nouveaux prospects."
      ],
      recommendations: [
        "Créer une campagne de conversion avec l'API WhatsApp Business.",
        "Produire 3 Reels par semaine basés sur l'application des produits et témoignages clients."
      ],
      overallSummary: "Cadafi Cosmetik possède d'excellents produits et une communauté de base. Cependant, le levier publicitaire est mal exploité. En passant du boost de posts à de réelles campagnes de vente par conversion Meta Ads, les résultats peuvent doubler sous 30 jours.",
      screenshotAnnotations: [
        { id: "pin-c1", x: 35, y: 25, title: "Manque d'offre d'appel en bio", notes: "La bio indique juste 'Commander en DM'. Il faut une offre d'appel irrésistible.", severity: "medium" },
        { id: "pin-c2", x: 70, y: 70, title: "Absence de vidéos de démonstration", notes: "Le feed Instagram est composé à 90% de photos de produits statiques.", severity: "high" }
      ],
      competitors: [
        { name: "Carimo Cosmétiques", visibility: 9, branding: 8, conversion: 8, global: 8.3 },
        { name: "Biopharma", visibility: 8, branding: 7, conversion: 6, global: 7.0 }
      ],
      socialMetrics: {
        followers: "12k",
        engagementRate: "2.8%",
        postFrequency: "2 posts / semaine",
        profileScore: 5
      },
      webMetrics: {
        fcp: 2.1,
        lcp: 4.2,
        speedIndex: 3.1,
        cls: 0.12,
        performanceScore: 68,
        seoScore: 80,
        mobileScore: 72
      },
      aiTone: "Growth",
      screenshotType: "instagram"
    },
    crm: {
      assignedCloser: "Vanessa M.",
      crmStatus: "closer_assigned",
      internalNotes: "Le prospect est chaud pour un accompagnement publicitaire."
    }
  }
];

export const getAuditRequests = (): AuditRequest[] => {
  const data = localStorage.getItem("gln_audits_db");
  if (!data) {
    localStorage.setItem("gln_audits_db", JSON.stringify(defaultAuditRequests));
    return defaultAuditRequests;
  }
  try {
    return JSON.parse(data);
  } catch {
    return defaultAuditRequests;
  }
};

export const saveAuditRequests = (requests: AuditRequest[]) => {
  localStorage.setItem("gln_audits_db", JSON.stringify(requests));
};

const toAuditRow = (request: AuditRequest) => ({
  id: request.id,
  email: request.email,
  phone: request.phone,
  client_name: request.clientName,
  company_name: request.companyName || null,
  status: request.status,
  payload: request as unknown as Json,
  created_at: request.createdAt,
  updated_at: new Date().toISOString(),
});

export const fetchRemoteAuditRequests = async (): Promise<AuditRequest[]> => {
  const { data, error } = await supabase
    .from("audit_requests")
    .select("payload")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map((row) => row.payload as unknown as AuditRequest).filter(Boolean);
};

export const upsertRemoteAuditRequest = async (request: AuditRequest) => {
  const { error } = await supabase
    .from("audit_requests")
    .upsert(toAuditRow(request));

  if (error) throw error;
};

export const saveRemoteAuditRequests = async (requests: AuditRequest[]) => {
  const { error } = await supabase
    .from("audit_requests")
    .upsert(requests.map(toAuditRow));

  if (error) throw error;
};

export const deleteRemoteAuditRequest = async (id: string) => {
  const { error } = await supabase
    .from("audit_requests")
    .delete()
    .eq("id", id);

  if (error) throw error;
};
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
