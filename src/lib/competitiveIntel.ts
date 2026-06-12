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

export const defaultCompetitiveIntel: CompetitiveProfile[] = [
  {
    id: "soro-2026-06-12",
    productName: "Soro",
    companyName: "DIGIMERI OU",
    website: "https://trysoro.com",
    category: "SEO autopilot and AI content publishing",
    scrapedAt: "2026-06-12",
    sourceUrls: [
      "https://trysoro.com/",
      "https://trysoro.com/pricing"
    ],
    positioning: "SEO autopilot that researches keywords, writes optimized articles, and publishes content automatically for Google and AI discovery.",
    funnelSummary: [
      "Paid traffic sends visitors to a quiz/landing page with an automation promise.",
      "The offer reduces friction by asking for a website URL and promising setup in minutes.",
      "The product value is framed around daily publishing, buyer keywords, Google visibility, and ChatGPT visibility.",
      "The pricing page reinforces risk reversal with support, secure checkout, and a money-back guarantee."
    ],
    pricingSignals: [
      "Public pricing page starts from 39 USD per month.",
      "Plans indicate 30 to unlimited articles per month depending on subscription.",
      "The page promotes flexible monthly plans with no minimum commitment.",
      "A 14-day money-back guarantee is presented as risk reversal."
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
      "Webhooks / custom integrations"
    ],
    languageSupport: "50+ languages according to the public pricing page.",
    metricClaims: [
      {
        label: "Published content",
        value: "200k+ articles",
        context: "Homepage performance/social proof claim."
      },
      {
        label: "Search impressions",
        value: "1.6B impressions",
        context: "Homepage performance/social proof claim."
      },
      {
        label: "Search clicks",
        value: "30M clicks",
        context: "Homepage performance/social proof claim."
      },
      {
        label: "Trust signal",
        value: "4.9 Trustpilot rating",
        context: "Footer/pricing trust signal."
      }
    ],
    features: [
      {
        name: "Keyword research",
        category: "seo",
        description: "Identifies search topics likely to attract buyers.",
        glnOpportunity: "Add buyer-intent keywords plus WhatsApp intent, local city terms, and campaign angles."
      },
      {
        name: "Daily article generation",
        category: "content",
        description: "Creates long-form SEO articles on a recurring schedule.",
        glnOpportunity: "Generate articles, Reels scripts, WhatsApp scripts, ad angles, and landing-page copy together."
      },
      {
        name: "Auto publishing",
        category: "publishing",
        description: "Publishes content directly to connected CMS platforms.",
        glnOpportunity: "Add approval workflows for GLN experts, then publish to site and social channels."
      },
      {
        name: "Google + AI optimization",
        category: "ai",
        description: "Frames content for Google ranking and AI-answer visibility.",
        glnOpportunity: "Optimize for Google, ChatGPT, WhatsApp conversion, Meta Ads, and local proof signals."
      },
      {
        name: "Brand voice learning",
        category: "ai",
        description: "Learns tone and style from the connected website.",
        glnOpportunity: "Learn brand voice from website, social pages, testimonials, WhatsApp conversations, and offer details."
      },
      {
        name: "Internal/external linking",
        category: "seo",
        description: "Adds links to strengthen topical relevance.",
        glnOpportunity: "Add links plus conversion routes: audit, service pages, proforma, WhatsApp CTA, and retargeting pages."
      },
      {
        name: "AI image generation",
        category: "content",
        description: "Creates visuals for articles.",
        glnOpportunity: "Generate campaign visual briefs and creative directions for designers, not only blog images."
      }
    ],
    gapsForGLN: [
      "Soro is centered on SEO articles; GLN can combine SEO, social media, Meta Ads, WhatsApp closing, proforma, and CRM follow-up.",
      "Soro's public funnel is global and self-serve; GLN can localize for Cameroon, Douala, Yaounde, and Central Africa.",
      "Soro optimizes visibility; GLN should optimize visibility plus lead qualification and sales conversion.",
      "Soro appears content-first; GLN can be diagnosis-first with audit scores, competitor benchmark, and a commercial action plan."
    ],
    glnCounterPositioning: [
      "From SEO autopilot to acquisition autopilot.",
      "From daily articles to daily content, ads, WhatsApp scripts, and conversion assets.",
      "From traffic growth to qualified leads and signed clients.",
      "From generic global SEO to local market execution for Cameroon and Africa."
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
