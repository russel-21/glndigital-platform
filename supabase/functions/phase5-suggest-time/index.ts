// Agent Phase 5 — Suggestion d'horaire de publication (see CLAUDE.md,
// "Feature en cours de cadrage : automatisation reseaux sociaux par agents
// IA", sections 3 et 4).
//
// SCOPE (strict — do not extend without explicit validation from Russel):
//   - Input: a `content_drafts.id` (must be APPROVED, same upstream gate
//     as actual publishing).
//   - Output: a purely ADVISORY day/time suggestion + rationale + real
//     web sources. Nothing is written to the database by this function —
//     it's a read-and-suggest helper, not a scheduling action. The actual
//     scheduled_publications row is only ever created by the admin's own
//     choice via phase5-publish, whether or not they followed this
//     suggestion.
//   - Never presents a fabricated "optimal time" — grounded in Phase 1
//     data for this account + the Phase 3 objective this post serves +
//     real, timestamped web search. See claudeClient.ts'
//     suggestPublishTime() for the full anti-hallucination contract.
//   - Admin-only: internal GLN-staff tool, not client-facing.
//
// Auth model: the caller's own JWT is used for every DB read (no
// service-role key involved), so Postgres RLS enforces the admin-only rule
// on its own — this function calls public.is_admin() up front only to fail
// fast with a clear message.

import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { suggestPublishTime } from "../_shared/claudeClient.ts";
import { extractClaudeUsage, reconcileActionQuote } from "../_shared/quoteReconciliation.ts";
import { checkRateLimit } from "../_shared/rateLimit.ts";

interface RequestBody {
  content_draft_id?: string;
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

  const contentDraftId = body.content_draft_id;
  if (!contentDraftId) {
    return jsonResponse(400, { error: "content_draft_id est requis." });
  }

  const rateLimitError = await checkRateLimit(supabase, `phase5-suggest-time:${contentDraftId}`);
  if (rateLimitError) {
    return jsonResponse(429, { error: rateLimitError });
  }

  const { data: draft, error: draftError } = await supabase
    .from("content_drafts")
    .select("id, social_connection_id, strategy_id, review_status, calendar_platform")
    .eq("id", contentDraftId)
    .maybeSingle();
  if (draftError) {
    return jsonResponse(500, { error: `Lecture de content_drafts impossible : ${draftError.message}` });
  }
  if (!draft) {
    return jsonResponse(404, { error: `Aucun content_drafts avec l'id ${contentDraftId}.` });
  }
  if (draft.review_status !== "approved") {
    return jsonResponse(400, { error: "Une suggestion d'horaire n'a de sens que pour un brouillon approuvé." });
  }

  const { data: connection, error: connectionError } = await supabase
    .from("social_connections")
    .select("platform, account_handle")
    .eq("id", draft.social_connection_id)
    .maybeSingle();
  if (connectionError || !connection) {
    return jsonResponse(500, { error: `Lecture de social_connections impossible : ${connectionError?.message ?? "introuvable"}` });
  }

  const { data: snapshots } = await supabase
    .from("audit_snapshots")
    .select("source, extracted_at, metrics, is_mock")
    .eq("social_connection_id", draft.social_connection_id)
    .order("extracted_at", { ascending: false })
    .limit(1);
  const snapshot = snapshots?.[0];

  const { data: strategy } = await supabase
    .from("content_strategies")
    .select("pillars, summary")
    .eq("id", draft.strategy_id)
    .maybeSingle();

  const metricsSummaryText = snapshot
    ? `Compte : ${connection.account_handle}\n` +
      `Source : ${snapshot.source}${snapshot.is_mock ? " (DONNÉES FACTICES — is_mock=true)" : ""}\n` +
      `Extrait le : ${snapshot.extracted_at}\n` +
      `Métriques : ${JSON.stringify(snapshot.metrics, null, 2)}`
    : `Compte : ${connection.account_handle}\nAucune donnée Phase 1 disponible.`;

  const objectiveContext = strategy
    ? `Résumé stratégie : ${strategy.summary ?? "aucun"}\nPiliers : ${JSON.stringify(strategy.pillars, null, 2)}`
    : "Aucune stratégie Phase 3 associée.";

  const result = await suggestPublishTime(metricsSummaryText, connection.platform, objectiveContext);

  if (result.ok) {
    const usage = extractClaudeUsage(result.raw_response);
    if (usage) {
      await reconcileActionQuote(supabase, draft.social_connection_id, "phase5_suggest_time", usage);
    }
  }

  return jsonResponse(result.ok ? 200 : 502, {
    ok: result.ok,
    suggestion: result.payload,
    ...(result.ok ? {} : { error: result.error }),
  });
});
