// Agent Phase 6 — Engagement communautaire (see CLAUDE.md, "Feature en
// cours de cadrage : automatisation reseaux sociaux par agents IA",
// sections 3 et 4).
//
// SCOPE (strict — do not extend without explicit validation from Russel):
//   - Input: a `social_connections.id`.
//   - Fetches new comments/DMs via Zernio (mocked without ZERNIO_API_KEY,
//     same as Phase 1/5), classifies each NEW one (deduped by
//     platform_comment_id) with needs_response + a rationale, and inserts
//     one `engagement_items` row per item.
//   - **Absolute rule, enforced structurally, not just documented**: this
//     function never generates, stores, or sends a reply. There is no
//     reply/suggestion field anywhere in its request or response shape —
//     see claudeClient.ts classifyEngagementItem() for why. Per CLAUDE.md:
//     "Aucune réponse n'est générée ni publiée automatiquement par
//     l'agent, y compris pour les questions simples."
//   - No human validation gate on the DETECTION itself (CLAUDE.md doesn't
//     require one for Phase 6 — the actual gate is that a human must
//     write and send any reply themselves, entirely outside this
//     function). Items just land in the admin UI, sorted by
//     needs_response, for a human to notice and act on directly on the
//     real platform.
//   - Admin-only: internal GLN-staff tool, not client-facing.
//
// Auth model: the caller's own JWT is used for every DB operation (no
// service-role key involved), so Postgres RLS enforces the admin-only rule
// on its own — this function calls public.is_admin() up front only to fail
// fast with a clear message.

import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rateLimit.ts";
import { fetchComments, type Platform } from "../_shared/zernioClient.ts";
import { classifyEngagementItem } from "../_shared/claudeClient.ts";
import { extractClaudeUsage, reconcileActionQuote } from "../_shared/quoteReconciliation.ts";

interface RequestBody {
  social_connection_id?: string;
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

  const socialConnectionId = body.social_connection_id;
  if (!socialConnectionId) {
    return jsonResponse(400, { error: "social_connection_id est requis." });
  }

  const rateLimitError = await checkRateLimit(supabase, `phase6-engagement:${socialConnectionId}`);
  if (rateLimitError) {
    return jsonResponse(429, { error: rateLimitError });
  }

  const { data: connection, error: connectionError } = await supabase
    .from("social_connections")
    .select("id, platform, account_handle, zernio_account_id")
    .eq("id", socialConnectionId)
    .maybeSingle();
  if (connectionError) {
    return jsonResponse(500, { error: `Lecture de social_connections impossible : ${connectionError.message}` });
  }
  if (!connection) {
    return jsonResponse(404, { error: `Aucun social_connections avec l'id ${socialConnectionId}.` });
  }

  const commentsResult = await fetchComments(
    connection.platform as Platform,
    connection.account_handle,
    connection.zernio_account_id,
  );
  if (!commentsResult.ok) {
    return jsonResponse(502, { error: `Échec de récupération des commentaires : ${commentsResult.error}` });
  }

  const { data: existingRows } = await supabase
    .from("engagement_items")
    .select("platform_comment_id")
    .eq("social_connection_id", socialConnectionId);
  const existingIds = new Set((existingRows ?? []).map((r) => r.platform_comment_id));

  const newItems = commentsResult.items.filter((item) => !existingIds.has(item.platformCommentId));

  const insertedRows = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  for (const item of newItems) {
    const classification = await classifyEngagementItem(item.content, connection.platform);
    const usage = extractClaudeUsage(classification.raw_response);
    if (usage) {
      totalInputTokens += usage.input_tokens;
      totalOutputTokens += usage.output_tokens;
    }
    const { data: row, error: insertError } = await supabase
      .from("engagement_items")
      .insert({
        social_connection_id: connection.id,
        platform_comment_id: item.platformCommentId,
        kind: item.kind,
        author_handle: item.authorHandle,
        content: item.content,
        posted_at: item.postedAt,
        needs_response: classification.payload?.needs_response ?? null,
        classification_rationale: classification.payload?.rationale ?? null,
        is_mock: commentsResult.isMock,
        error: classification.ok ? null : classification.error,
      })
      .select()
      .single();
    if (insertError) {
      return jsonResponse(500, { error: `Enregistrement d'un engagement_items impossible : ${insertError.message}` });
    }
    insertedRows.push(row);
  }

  // One reconciliation for the whole run (classifyEngagementItem runs once
  // per new item, so usage is summed across the loop) rather than per item.
  if (totalInputTokens > 0 || totalOutputTokens > 0) {
    await reconcileActionQuote(supabase, connection.id, "phase6_engagement", {
      input_tokens: totalInputTokens,
      output_tokens: totalOutputTokens,
    });
  }

  return jsonResponse(200, {
    ok: true,
    new_items_count: insertedRows.length,
    needs_response_count: insertedRows.filter((r) => r.needs_response).length,
    items: insertedRows,
  });
});
