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
  },
  {
    id: "nuelink-2026-06-12",
    productName: "Nuelink",
    companyName: "Nuelink",
    website: "https://nuelink.com",
    category: "Social media scheduling, automation, and analytics",
    scrapedAt: "2026-06-12",
    sourceUrls: [
      "https://nuelink.com/",
      "https://nuelink.com/pricing",
      "https://nuelink.com/features"
    ],
    positioning: "Social media automation platform that schedules, crossposts, recycles, analyzes, and auto-publishes content across major social channels.",
    funnelSummary: [
      "Paid traffic promotes a time-saving automation promise for creators, ecommerce sellers, agencies, and small businesses.",
      "The homepage frames the product as a set-and-forget social media engine connected to blogs, stores, podcasts, reviews, and RSS sources.",
      "The conversion path emphasizes a 7-day free trial, fast setup, multiple social channels, and an anniversary yearly discount.",
      "The product story competes against schedulers by presenting automation, crossposting, evergreen recycling, comments, analytics, and AI assistance together."
    ],
    pricingSignals: [
      "Public yearly anniversary pricing starts at 12 USD/month for Standard with 144 USD paid yearly.",
      "Premium is shown at 32 USD/month yearly, Business at 52 USD/month yearly, Agency at 85.3 USD/month yearly, and Agency-Plus at 152 USD/month yearly.",
      "Plans scale by brands, members, social channels, automations, collections, AI credits, link-in-bio slots, and queue size.",
      "Pricing page indicates 0 USD due today for the free trial and a 4-months-free yearly offer active around the June 2026 campaign."
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
      "Public API",
      "MCP Access"
    ],
    languageSupport: "Not positioned primarily around language coverage; positioned around multi-platform publishing and automation.",
    metricClaims: [
      {
        label: "Users",
        value: "60,000+ creators and businesses",
        context: "Homepage social proof claim."
      },
      {
        label: "Posts published",
        value: "15M+ posts",
        context: "Homepage social proof claim."
      },
      {
        label: "Countries",
        value: "90+ countries",
        context: "Homepage social proof claim."
      },
      {
        label: "Review score",
        value: "4.9/5 from 600+ reviews",
        context: "Homepage and pricing trust signal."
      },
      {
        label: "Automations",
        value: "45 native automations",
        context: "Homepage differentiator claim."
      }
    ],
    features: [
      {
        name: "Multi-platform scheduling",
        category: "publishing",
        description: "Schedules and publishes content across 12 major social platforms from one dashboard.",
        glnOpportunity: "Build GLN scheduling around campaigns, offers, audits, WhatsApp CTA, and local posting calendars."
      },
      {
        name: "Automations",
        category: "publishing",
        description: "Turns new blog posts, products, podcasts, reviews, and RSS items into social posts automatically.",
        glnOpportunity: "Generate acquisition assets from audits, services, testimonials, proformas, and product offers, not only source feeds."
      },
      {
        name: "Crossposting routes",
        category: "content",
        description: "Repurposes posts between platforms such as Instagram Reels, TikTok, YouTube Shorts, Facebook, Threads, Bluesky, and LinkedIn.",
        glnOpportunity: "Add local format rules, hooks, subtitles, and platform-specific CTA variants for Cameroon audiences."
      },
      {
        name: "Collections and queue",
        category: "content",
        description: "Organizes posts by theme/campaign and drips them through scheduled queues and calendars.",
        glnOpportunity: "Create GLN campaign collections: awareness, proof, offer, objection handling, retargeting, and WhatsApp follow-up."
      },
      {
        name: "Comment inbox",
        category: "conversion",
        description: "Centralizes social comments and mentions for faster engagement.",
        glnOpportunity: "Turn comments into leads with qualification tags, WhatsApp handoff, closer assignment, and CRM status."
      },
      {
        name: "Analytics and top posts",
        category: "analytics",
        description: "Tracks followers, views, engagement, impressions, clicks, top posts, link insights, and hashtag insights.",
        glnOpportunity: "Connect social analytics to revenue metrics: WhatsApp leads, cost per lead, appointments, proformas, and closed deals."
      },
      {
        name: "Nue AI Assistant",
        category: "ai",
        description: "Assists with ideas, captions, hashtags, rewrites, and post drafts.",
        glnOpportunity: "Make GLN AI strategy-first: audit diagnosis, campaign strategy, ad copy, WhatsApp scripts, landing pages, and sales follow-up."
      },
      {
        name: "Public API and MCP access",
        category: "ai",
        description: "Offers programmatic publishing and workflow integration for tools and AI agents.",
        glnOpportunity: "Expose GLN workflow APIs later for audit ingestion, content generation, publication approval, and CRM sync."
      },
      {
        name: "Link in bio and short links",
        category: "conversion",
        description: "Provides mini landing pages and trackable short links.",
        glnOpportunity: "Create GLN bio pages that prioritize audit, WhatsApp, offers, testimonials, and campaign retargeting pixels."
      }
    ],
    gapsForGLN: [
      "Nuelink is automation-first; GLN can be acquisition-first by connecting social activity to audits, proformas, WhatsApp conversion, and CRM outcomes.",
      "Nuelink optimizes content operations; GLN should optimize business diagnosis, offer quality, campaign profitability, and closer workflow.",
      "Nuelink supports many channels; GLN can win with local market intelligence, French/English Cameroon copy, and WhatsApp-first conversion.",
      "Nuelink centralizes comments; GLN can classify comments as hot leads, objections, support issues, or upsell opportunities.",
      "Nuelink has public API/MCP positioning; GLN can prepare future agent workflows for audit-to-campaign execution."
    ],
    glnCounterPositioning: [
      "From social media scheduling to sales acquisition orchestration.",
      "From crossposting to channel-specific conversion campaigns.",
      "From AI captions to AI diagnosis, strategy, scripts, landing pages, and proformas.",
      "From engagement analytics to revenue and WhatsApp lead analytics.",
      "From generic automation to localized execution for Cameroon and African businesses."
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
