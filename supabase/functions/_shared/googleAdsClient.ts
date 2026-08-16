// Google Ads API adapter — keyword research only. Separate feature, NOT one
// of the 7 phases. See DECISIONS-VEILLE-CONCURRENTIELLE.md for full context.
//
// SCOPE (strict — do not extend without explicit validation from Russel):
//   - Only `generateKeywordIdeas` (Keyword Planner "keyword ideas" endpoint).
//   - Two allowed inputs: a list of seed keywords, and/or a page URL whose
//     content Google uses to suggest related keywords. A page URL CAN be a
//     competitor's page — that is normal, documented Keyword Planner usage
//     and is what DECISIONS-VEILLE-CONCURRENTIELLE.md calls "recherche
//     générale de mots-clés" (built). It is NOT the same as, and must never
//     be confused with, "mots-clés de ciblage réel d'un concurrent" (a
//     concurrent's actual private campaign targeting) — that data is never
//     exposed by this or any Google Ads endpoint, and building anything that
//     claims to show it was explicitly abandoned in that decision doc.
//   - Never returns budget or campaign-performance figures — this endpoint
//     doesn't expose them, so there is nothing to guess here.
//
// Contract verified 2026-08-17 against three independent official Google
// sources (REST reference samples page, the official google-ads-python
// example on GitHub, and Google's own indexed devsite content) — corroborated
// enough to implement for real, unlike Zernio (never verified against any
// official doc, hence still stubbed there). If Google changes this contract,
// update here — do not silently patch around a failing call by guessing.
//
// Auth: standard Google Ads API OAuth2 (refresh-token flow) + developer
// token + optional login-customer-id (manager account) header — all read
// from Supabase Edge Function secrets, never hardcoded, never asked of the
// user in chat.
//
// Anti-hallucination: this module never invents a language or geo target —
// both are required inputs from the caller (resource name strings like
// "languageConstants/1002" / "geoTargetConstants/2120"). Guessing a language
// or country ID would be exactly the kind of invented data this project's
// rules forbid, so none is defaulted here.

const API_VERSION = "v18";
const OAUTH_TOKEN_URL = "https://www.googleapis.com/oauth2/v3/token";

export interface KeywordResearchInput {
  keywords?: string[];
  pageUrl?: string;
  /** e.g. "languageConstants/1002" (French). Never guessed — must be supplied by the caller. */
  languageResourceName: string;
  /** e.g. ["geoTargetConstants/2120"] (Cameroon). Never guessed — must be supplied by the caller. */
  geoTargetConstantResourceNames: string[];
  /** Overrides GOOGLE_ADS_CUSTOMER_ID if provided. Digits only, no dashes. */
  customerId?: string;
  includeAdultKeywords?: boolean;
}

export interface KeywordIdea {
  text: string;
  avg_monthly_searches: number | "donnée_indisponible";
  competition: string;
  competition_index: number | "donnée_indisponible";
  low_top_of_page_bid_micros: number | "donnée_indisponible";
  high_top_of_page_bid_micros: number | "donnée_indisponible";
}

export interface KeywordResearchResult {
  ok: boolean;
  ideas?: KeywordIdea[];
  error?: string;
}

interface GoogleAdsCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  developerToken: string;
  loginCustomerId?: string;
  defaultCustomerId?: string;
}

function readCredentials(): GoogleAdsCredentials | { missing: string[] } {
  const clientId = Deno.env.get("GOOGLE_ADS_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_ADS_CLIENT_SECRET");
  const refreshToken = Deno.env.get("GOOGLE_ADS_REFRESH_TOKEN");
  const developerToken = Deno.env.get("GOOGLE_ADS_DEVELOPER_TOKEN");
  const loginCustomerId = Deno.env.get("GOOGLE_ADS_LOGIN_CUSTOMER_ID") ?? undefined;
  const defaultCustomerId = Deno.env.get("GOOGLE_ADS_CUSTOMER_ID") ?? undefined;

  const missing: string[] = [];
  if (!clientId) missing.push("GOOGLE_ADS_CLIENT_ID");
  if (!clientSecret) missing.push("GOOGLE_ADS_CLIENT_SECRET");
  if (!refreshToken) missing.push("GOOGLE_ADS_REFRESH_TOKEN");
  if (!developerToken) missing.push("GOOGLE_ADS_DEVELOPER_TOKEN");
  if (missing.length > 0) return { missing };

  return {
    clientId: clientId!,
    clientSecret: clientSecret!,
    refreshToken: refreshToken!,
    developerToken: developerToken!,
    loginCustomerId,
    defaultCustomerId,
  };
}

async function fetchAccessToken(creds: GoogleAdsCredentials): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
    refresh_token: creds.refreshToken,
  });

  const res = await fetch(OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { ok: false, error: `Échec du rafraîchissement du token OAuth2 Google (${res.status}) : ${text}` };
  }

  const json = await res.json() as { access_token?: string };
  if (!json.access_token) {
    return { ok: false, error: "Réponse OAuth2 Google sans access_token." };
  }
  return { ok: true, token: json.access_token };
}

function normalizeMicros(value: unknown): number | "donnée_indisponible" {
  return typeof value === "number" ? value : "donnée_indisponible";
}

export async function generateKeywordIdeas(input: KeywordResearchInput): Promise<KeywordResearchResult> {
  const creds = readCredentials();
  if ("missing" in creds) {
    return {
      ok: false,
      error: `API Google Ads non configurée côté serveur — secrets manquants : ${creds.missing.join(", ")}.`,
    };
  }

  if ((!input.keywords || input.keywords.length === 0) && !input.pageUrl) {
    return { ok: false, error: "Fournis au moins un mot-clé ou une URL de page." };
  }
  if (!input.languageResourceName) {
    return { ok: false, error: "languageResourceName est requis (ex. \"languageConstants/1002\") — jamais deviné automatiquement." };
  }
  if (!input.geoTargetConstantResourceNames || input.geoTargetConstantResourceNames.length === 0) {
    return { ok: false, error: "geoTargetConstantResourceNames est requis (ex. [\"geoTargetConstants/2120\"]) — jamais deviné automatiquement." };
  }

  const customerId = (input.customerId ?? creds.defaultCustomerId)?.replace(/-/g, "");
  if (!customerId) {
    return { ok: false, error: "Aucun customerId Google Ads fourni (ni en paramètre, ni via GOOGLE_ADS_CUSTOMER_ID)." };
  }

  const tokenResult = await fetchAccessToken(creds);
  if (!tokenResult.ok) {
    return { ok: false, error: tokenResult.error };
  }

  const hasKeywords = input.keywords && input.keywords.length > 0;
  const hasUrl = Boolean(input.pageUrl);
  const seed = hasKeywords && hasUrl
    ? { keywordAndUrlSeed: { url: input.pageUrl, keywords: input.keywords } }
    : hasUrl
    ? { urlSeed: { url: input.pageUrl } }
    : { keywordSeed: { keywords: input.keywords } };

  const requestBody = {
    language: input.languageResourceName,
    geoTargetConstants: input.geoTargetConstantResourceNames,
    keywordPlanNetwork: "GOOGLE_SEARCH_AND_PARTNERS",
    includeAdultKeywords: input.includeAdultKeywords ?? false,
    ...seed,
  };

  const headers: Record<string, string> = {
    Authorization: `Bearer ${tokenResult.token}`,
    "developer-token": creds.developerToken,
    "Content-Type": "application/json",
  };
  if (creds.loginCustomerId) {
    headers["login-customer-id"] = creds.loginCustomerId.replace(/-/g, "");
  }

  const url = `https://googleads.googleapis.com/${API_VERSION}/customers/${customerId}:generateKeywordIdeas`;

  try {
    const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(requestBody) });
    const json = await res.json().catch(() => null);

    if (!res.ok) {
      const message = json?.error?.message ?? JSON.stringify(json) ?? `HTTP ${res.status}`;
      return { ok: false, error: `Erreur API Google Ads (${res.status}) : ${message}` };
    }

    const results = Array.isArray(json?.results) ? json.results : [];
    const ideas: KeywordIdea[] = results.map((r: Record<string, unknown>) => {
      const metrics = (r.keywordIdeaMetrics ?? {}) as Record<string, unknown>;
      return {
        text: typeof r.text === "string" ? r.text : "donnée_indisponible",
        avg_monthly_searches: typeof metrics.avgMonthlySearches === "string" || typeof metrics.avgMonthlySearches === "number"
          ? Number(metrics.avgMonthlySearches)
          : "donnée_indisponible",
        competition: typeof metrics.competition === "string" ? metrics.competition : "donnée_indisponible",
        competition_index: typeof metrics.competitionIndex === "string" || typeof metrics.competitionIndex === "number"
          ? Number(metrics.competitionIndex)
          : "donnée_indisponible",
        low_top_of_page_bid_micros: normalizeMicros(
          typeof metrics.lowTopOfPageBidMicros === "string" ? Number(metrics.lowTopOfPageBidMicros) : metrics.lowTopOfPageBidMicros,
        ),
        high_top_of_page_bid_micros: normalizeMicros(
          typeof metrics.highTopOfPageBidMicros === "string" ? Number(metrics.highTopOfPageBidMicros) : metrics.highTopOfPageBidMicros,
        ),
      };
    });

    return { ok: true, ideas };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Échec de l'appel à l'API Google Ads : ${message}` };
  }
}
