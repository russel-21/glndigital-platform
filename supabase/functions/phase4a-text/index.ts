// Agent Phase 4a — Production texte (see CLAUDE.md, "Feature en cours de
// cadrage : automatisation reseaux sociaux par agents IA", sections 3 et 4).
//
// SCOPE (strict — do not extend without explicit validation from Russel):
//   - Input: a `social_connections.id`, a `content_strategies.id` (must be
//     APPROVED), and a `calendar_entry_index` into that strategy's
//     editorial_calendar array.
//   - **Hard requirement**: refuses outright if `social_connections.
//     brand_brief` is empty — per CLAUDE.md, every company/product fact in
//     Phase 4a output must come from a brand brief, never invented.
//   - **Hard requirement**: refuses if the referenced content_strategies
//     row isn't review_status = 'approved' — same Phase N -> Phase N+1
//     validation gate as Phase 2 -> Phase 3.
//   - Output: one new row in `content_drafts` (caption + hook + optional
//     script). No visuals, no scheduling — Phase 4b/5, out of scope here.
//   - Every inserted row starts at review_status = 'pending_review'. This
//     function NEVER sets it to 'approved' — that's a human action in the
//     admin UI ("Oui, relecture avant publication" per CLAUDE.md).
//   - Admin, OR the "client" role user who owns the target
//     social_connections row — see CLAUDE.md's client self-service plan
//     (2026-08-31) and _shared/authScope.ts. Same exception as Phase 2/3;
//     every other admin-facing capability in this app stays admin-only.
//
// Auth model: the caller's own JWT is used for every DB operation (no
// service-role key involved), so Postgres RLS enforces the actual
// admin-or-owning-client rule on its own — checkAdminOrOwningClient() only
// fails fast with a clear message before doing any real work.

import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rateLimit.ts";
import { generateContentDraft } from "../_shared/claudeClient.ts";
import { extractClaudeUsage, reconcileActionQuote } from "../_shared/quoteReconciliation.ts";
import { checkAdminOrOwningClient } from "../_shared/authScope.ts";

interface RequestBody {
  social_connection_id?: string;
  strategy_id?: string;
  calendar_entry_index?: number;
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
    return jsonResponse(500, {
      error: "SUPABASE_URL / SUPABASE_ANON_KEY non configurés côté fonction.",
    });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(400, { error: "Corps de requête JSON invalide." });
  }

  const socialConnectionId = body.social_connection_id;
  const strategyId = body.strategy_id;
  const calendarEntryIndex = body.calendar_entry_index;
  if (!socialConnectionId || !strategyId || calendarEntryIndex === undefined) {
    return jsonResponse(400, {
      error: "social_connection_id, strategy_id et calendar_entry_index sont requis.",
    });
  }

  const authScope = await checkAdminOrOwningClient(supabase, socialConnectionId);
  if (!authScope.ok) {
    return jsonResponse(authScope.status, { error: authScope.error });
  }

  const rateLimitError = await checkRateLimit(supabase, `phase4a-text:${socialConnectionId}:${calendarEntryIndex}`);
  if (rateLimitError) {
    return jsonResponse(429, { error: rateLimitError });
  }

  const { data: connection, error: connectionError } = await supabase
    .from("social_connections")
    .select("id, platform, account_handle, brand_brief")
    .eq("id", socialConnectionId)
    .maybeSingle();
  if (connectionError) {
    return jsonResponse(500, { error: `Lecture de social_connections impossible : ${connectionError.message}` });
  }
  if (!connection) {
    return jsonResponse(404, { error: `Aucun social_connections avec l'id ${socialConnectionId}.` });
  }
  if (!connection.brand_brief || !connection.brand_brief.trim()) {
    return jsonResponse(400, {
      error:
        "Aucun brand brief renseigné pour ce compte. La Phase 4a exige un brand brief (onglet " +
        "« Audit IA », section du compte) avant de pouvoir rédiger du contenu — sinon l'IA n'a aucune " +
        "source fiable sur l'entreprise.",
    });
  }

  const { data: strategy, error: strategyError } = await supabase
    .from("content_strategies")
    .select("id, social_connection_id, review_status, editorial_calendar, summary")
    .eq("id", strategyId)
    .maybeSingle();
  if (strategyError) {
    return jsonResponse(500, { error: `Lecture de content_strategies impossible : ${strategyError.message}` });
  }
  if (!strategy || strategy.social_connection_id !== socialConnectionId) {
    return jsonResponse(404, { error: "Stratégie introuvable pour ce compte." });
  }
  if (strategy.review_status !== "approved") {
    return jsonResponse(400, {
      error: `Cette stratégie n'est pas approuvée (statut actuel : ${strategy.review_status}). ` +
        "La Phase 4a exige une stratégie Phase 3 validée par un humain.",
    });
  }

  const calendar = (strategy.editorial_calendar ?? []) as Array<{
    day_offset: number;
    platform: string;
    pillar: string;
    format: string;
    working_title: string;
    brief: string;
  }>;
  const entry = calendar[calendarEntryIndex];
  if (!entry) {
    return jsonResponse(400, { error: `Aucune entrée de calendrier à l'index ${calendarEntryIndex}.` });
  }

  const result = await generateContentDraft(connection.brand_brief, entry, strategy.summary ?? "");

  const { data: draftRow, error: insertError } = await supabase
    .from("content_drafts")
    .insert({
      social_connection_id: connection.id,
      strategy_id: strategy.id,
      calendar_entry_index: calendarEntryIndex,
      calendar_day_offset: entry.day_offset,
      calendar_platform: entry.platform,
      calendar_working_title: entry.working_title,
      caption: result.payload?.caption ?? null,
      hook: result.payload?.hook ?? null,
      script: result.payload?.script || null,
      is_mock: false,
      error: result.ok ? null : result.error,
    })
    .select()
    .single();

  if (insertError) {
    return jsonResponse(500, { error: `Brouillon non enregistré : ${insertError.message}` });
  }

  if (result.ok) {
    const usage = extractClaudeUsage(result.raw_response);
    if (usage) {
      await reconcileActionQuote(supabase, connection.id, "phase4a_text", usage);
    }
  }

  return jsonResponse(result.ok ? 200 : 502, {
    draft: draftRow,
    ok: result.ok,
    ...(result.ok ? {} : { error: result.error }),
  });
});
