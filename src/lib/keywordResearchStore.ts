// General keyword research data layer — separate feature, NOT one of the 7
// phases. See DECISIONS-VEILLE-CONCURRENTIELLE.md for full context and what
// was explicitly abandoned (never revisit those without Russel).
//
// SCOPE (strict): a single wrapper to invoke the keyword-research edge
// function. Deliberately stateless — no table backs this module, results
// are not persisted (see the scope comment in
// supabase/functions/keyword-research/index.ts for why).

import { supabase } from "@/integrations/supabase/client";

export interface KeywordIdea {
  text: string;
  avg_monthly_searches: number | "donnée_indisponible";
  competition: string;
  competition_index: number | "donnée_indisponible";
  low_top_of_page_bid_micros: number | "donnée_indisponible";
  high_top_of_page_bid_micros: number | "donnée_indisponible";
}

export interface KeywordResearchInput {
  keywords?: string[];
  pageUrl?: string;
  languageResourceName: string;
  geoTargetConstantResourceNames: string[];
  customerId?: string;
  includeAdultKeywords?: boolean;
}

export interface KeywordResearchResult {
  ok: boolean;
  ideas?: KeywordIdea[];
  error?: string;
}

export const researchKeywords = async (input: KeywordResearchInput): Promise<KeywordResearchResult> => {
  const { data, error } = await supabase.functions.invoke("keyword-research", {
    body: {
      keywords: input.keywords,
      page_url: input.pageUrl,
      language_resource_name: input.languageResourceName,
      geo_target_constant_resource_names: input.geoTargetConstantResourceNames,
      customer_id: input.customerId,
      include_adult_keywords: input.includeAdultKeywords,
    },
  });
  if (error) {
    const context = (error as { context?: Response }).context;
    let detail: string | undefined;
    if (context && typeof context.json === "function") {
      try {
        detail = (await context.json())?.error;
      } catch {
        // no JSON body to read — fall back to the generic message below
      }
    }
    throw new Error(detail || error.message);
  }
  return data as KeywordResearchResult;
};
