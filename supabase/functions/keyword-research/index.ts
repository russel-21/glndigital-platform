// General keyword research — separate feature, NOT one of the 7 phases.
// See DECISIONS-VEILLE-CONCURRENTIELLE.md for full context.
//
// SCOPE (strict — do not extend without explicit validation from Russel):
//   - Thin wrapper around googleAdsClient.generateKeywordIdeas(): takes
//     seed keywords and/or a page URL (which MAY be a competitor's page —
//     see the scope comment in googleAdsClient.ts for why that's allowed and
//     what it is NOT the same as), returns Google's keyword ideas as-is.
//   - Admin-only: internal GLN-staff tool, not client-facing.
//   - Stateless on purpose: results are not persisted to a table. This is a
//     live lookup tool, not a document-generation feature like the
//     competitive brief — no DB architecture was approved for storing
//     keyword-research history, so none was created.
//   - No review_status gate — not part of the 7-phase validation pipeline.
//
// Auth model: identical to every other admin-only edge function in this
// project — the caller's own JWT is used for the is_admin() check, no
// service-role key.

import { getCorsHeaders } from "../_shared/cors.ts";
import { generateKeywordIdeas, type KeywordResearchInput } from "../_shared/googleAdsClient.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

interface RequestBody {
  keywords?: string[];
  page_url?: string;
  language_resource_name?: string;
  geo_target_constant_resource_names?: string[];
  customer_id?: string;
  include_adult_keywords?: boolean;
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const jsonResponse = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Méthode non supportée, utilise POST." });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse(401, { error: "En-tête Authorization manquant." });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) {
    return jsonResponse(500, { error: "SUPABASE_URL / SUPABASE_ANON_KEY non configurés côté fonction." });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: isAdmin, error: adminCheckError } = await supabase.rpc("is_admin");
  if (adminCheckError) {
    return jsonResponse(500, { error: `Échec de la vérification admin : ${adminCheckError.message}` });
  }
  if (!isAdmin) {
    return jsonResponse(403, { error: "Réservé aux administrateurs GLN Digital." });
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(400, { error: "Corps de requête JSON invalide." });
  }

  const input: KeywordResearchInput = {
    keywords: body.keywords?.map((k) => k.trim()).filter(Boolean),
    pageUrl: body.page_url?.trim() || undefined,
    languageResourceName: body.language_resource_name?.trim() ?? "",
    geoTargetConstantResourceNames: body.geo_target_constant_resource_names ?? [],
    customerId: body.customer_id?.trim(),
    includeAdultKeywords: body.include_adult_keywords,
  };

  const result = await generateKeywordIdeas(input);

  return jsonResponse(result.ok ? 200 : 400, result);
});
