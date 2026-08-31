// Agent Phase 3 — Stratégie de contenu (see CLAUDE.md, "Feature en cours de
// cadrage : automatisation reseaux sociaux par agents IA", sections 3 et 4).
//
// SCOPE (strict — do not extend without explicit validation from Russel):
//   - Input: a `social_connections.id`, and either a specific
//     `diagnostics.id` or none (defaults to the latest APPROVED diagnostic
//     for that connection).
//   - **Hard requirement**: refuses outright if no diagnostic with
//     review_status = 'approved' exists for that connection. Per CLAUDE.md,
//     Phase 3 must consume an already-human-validated Phase 2 diagnostic —
//     never a pending or rejected one, and never audit_snapshots directly.
//   - Output: one new row in `content_strategies` holding content pillars +
//     a 4-week editorial calendar + the real, timestamped web sources for
//     any trend claim used. No caption/script text, no visuals — that's
//     Phase 4a/4b, out of scope here.
//   - Every inserted row starts at review_status = 'pending_review'. This
//     function NEVER sets it to 'approved' — that's a human action in the
//     admin UI, same real blocking gate as Phase 2.
//   - Admin-only: internal GLN-staff tool, not client-facing.
//
// Auth model: the caller's own JWT is used for every DB operation (no
// service-role key involved), so Postgres RLS enforces the admin-only rule
// on its own — this function calls public.is_admin() up front only to fail
// fast with a clear message.

import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rateLimit.ts";
import { generateContentStrategy } from "../_shared/claudeClient.ts";

interface RequestBody {
  social_connection_id?: string;
  diagnostic_id?: string;
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

  const rateLimitError = await checkRateLimit(supabase, `phase3-strategy:${socialConnectionId}`);
  if (rateLimitError) {
    return jsonResponse(429, { error: rateLimitError });
  }

  const { data: connection, error: connectionError } = await supabase
    .from("social_connections")
    .select("id, platform, account_handle")
    .eq("id", socialConnectionId)
    .maybeSingle();
  if (connectionError) {
    return jsonResponse(500, { error: `Lecture de social_connections impossible : ${connectionError.message}` });
  }
  if (!connection) {
    return jsonResponse(404, { error: `Aucun social_connections avec l'id ${socialConnectionId}.` });
  }

  // Resolve the diagnostic to build on: the one explicitly passed, or the
  // most recently APPROVED one for this connection. Either way, it MUST be
  // approved — this is the hard gate CLAUDE.md requires between Phase 2
  // and Phase 3.
  let diagnosticQuery = supabase
    .from("diagnostics")
    .select("id, social_connection_id, review_status, summary, hypotheses, missing_data, conclusive")
    .eq("social_connection_id", socialConnectionId)
    .eq("review_status", "approved")
    .order("reviewed_at", { ascending: false })
    .limit(1);
  if (body.diagnostic_id) {
    diagnosticQuery = supabase
      .from("diagnostics")
      .select("id, social_connection_id, review_status, summary, hypotheses, missing_data, conclusive")
      .eq("id", body.diagnostic_id);
  }
  const { data: diagnostics, error: diagnosticError } = await diagnosticQuery;
  if (diagnosticError) {
    return jsonResponse(500, { error: `Lecture de diagnostics impossible : ${diagnosticError.message}` });
  }
  const diagnostic = diagnostics?.[0];
  if (!diagnostic) {
    return jsonResponse(404, {
      error:
        "Aucun diagnostic APPROUVÉ trouvé pour ce compte. La Phase 3 exige un diagnostic Phase 2 validé " +
        "par un humain (onglet Phase 2, bouton « Approuver ») avant de pouvoir générer une stratégie.",
    });
  }
  if (diagnostic.social_connection_id !== socialConnectionId) {
    return jsonResponse(400, { error: "Ce diagnostic n'appartient pas à ce compte." });
  }
  if (diagnostic.review_status !== "approved") {
    return jsonResponse(400, {
      error: `Ce diagnostic n'est pas approuvé (statut actuel : ${diagnostic.review_status}). ` +
        "La Phase 3 exige un diagnostic validé par un humain.",
    });
  }

  // Same audit_snapshots resolution as Phase 2, for the factual metrics summary.
  const { data: snapshots, error: snapshotError } = await supabase
    .from("audit_snapshots")
    .select("source, extracted_at, metrics, is_mock, error")
    .eq("social_connection_id", socialConnectionId)
    .order("extracted_at", { ascending: false })
    .limit(1);
  if (snapshotError) {
    return jsonResponse(500, { error: `Lecture de audit_snapshots impossible : ${snapshotError.message}` });
  }
  const snapshot = snapshots?.[0];

  const metricsSummaryText = buildMetricsSummary(connection, snapshot);
  const diagnosticSummaryText = buildDiagnosticSummary(diagnostic);

  const result = await generateContentStrategy(
    metricsSummaryText,
    diagnosticSummaryText,
    connection.platform,
    connection.account_handle,
  );

  const { data: strategyRow, error: insertError } = await supabase
    .from("content_strategies")
    .insert({
      social_connection_id: connection.id,
      diagnostic_id: diagnostic.id,
      pillars: result.payload?.pillars ?? null,
      editorial_calendar: result.payload?.editorial_calendar ?? null,
      trends_used: result.payload?.trends_used ?? null,
      summary: result.payload?.summary ?? null,
      is_mock: false,
      error: result.ok ? null : result.error,
    })
    .select()
    .single();

  if (insertError) {
    return jsonResponse(500, { error: `Stratégie non enregistrée : ${insertError.message}` });
  }

  return jsonResponse(result.ok ? 200 : 502, {
    strategy: strategyRow,
    ok: result.ok,
    ...(result.ok ? {} : { error: result.error }),
  });
});

function buildMetricsSummary(
  connection: { platform: string; account_handle: string },
  snapshot?: { source: string; extracted_at: string; metrics: unknown; is_mock: boolean; error: string | null },
): string {
  if (!snapshot) {
    return `Plateforme : ${connection.platform}\nCompte : ${connection.account_handle}\nAucune donnée Phase 1 disponible.`;
  }
  const lines = [
    `Plateforme : ${connection.platform}`,
    `Compte : ${connection.account_handle}`,
    `Source des données : ${snapshot.source}${snapshot.is_mock ? " (DONNÉES FACTICES — is_mock=true)" : ""}`,
    `Date d'extraction : ${snapshot.extracted_at}`,
  ];
  if (snapshot.metrics) {
    lines.push(`Métriques : ${JSON.stringify(snapshot.metrics, null, 2)}`);
  }
  return lines.join("\n");
}

function buildDiagnosticSummary(diagnostic: {
  summary: string | null;
  hypotheses: unknown;
  missing_data: unknown;
  conclusive: boolean | null;
}): string {
  const lines = [
    `Concluant : ${diagnostic.conclusive === false ? "Non" : "Oui"}`,
    `Résumé : ${diagnostic.summary ?? "aucun"}`,
  ];
  if (diagnostic.hypotheses) {
    lines.push(`Hypothèses : ${JSON.stringify(diagnostic.hypotheses, null, 2)}`);
  }
  if (diagnostic.missing_data) {
    lines.push(`Données manquantes signalées : ${JSON.stringify(diagnostic.missing_data)}`);
  }
  return lines.join("\n");
}
