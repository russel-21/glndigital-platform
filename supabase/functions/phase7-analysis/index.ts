// Agent Phase 7 — Analyse/optimisation (see CLAUDE.md, "Feature en cours
// de cadrage : automatisation reseaux sociaux par agents IA", sections 3
// et 4).
//
// SCOPE (strict — do not extend without explicit validation from Russel):
//   - Input: a `social_connections.id`, and optionally two specific
//     `audit_snapshots.id`s (baseline + comparison). Defaults to the
//     earliest and the most recent snapshot for that connection.
//   - **Interpretation flagged for Russel to correct if wrong**: CLAUDE.md
//     asks for "comparaison performance prévue vs réelle", but nothing in
//     this system currently produces a predicted figure — Phase 3/4a don't
//     forecast engagement numbers. Rather than invent one, this function
//     compares two REAL Phase 1 snapshots (an earlier one standing in for
//     "expected continuation" and a later one as "actual") — both are
//     factual, neither is fabricated.
//   - Deltas between the two snapshots are computed HERE, in code, not by
//     the model — and only when both operands are real numbers (never a
//     "donnée_indisponible" sentinel on either side), matching Phase 1's
//     own no-ratio-if-missing rule.
//   - No human validation gate (CLAUDE.md's Phase 7 table row: "Non").
//   - Admin-only: internal GLN-staff tool, not client-facing.
//
// Auth model: the caller's own JWT is used for every DB operation (no
// service-role key involved), so Postgres RLS enforces the admin-only rule
// on its own — this function calls public.is_admin() up front only to fail
// fast with a clear message.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { analyzePerformance } from "../_shared/claudeClient.ts";

interface RequestBody {
  social_connection_id?: string;
  baseline_snapshot_id?: string;
  comparison_snapshot_id?: string;
}

interface Metrics {
  [key: string]: unknown;
}

Deno.serve(async (req: Request) => {
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

  let baseline, comparison;
  if (body.baseline_snapshot_id && body.comparison_snapshot_id) {
    const [{ data: b }, { data: c }] = await Promise.all([
      supabase.from("audit_snapshots").select("*").eq("id", body.baseline_snapshot_id).maybeSingle(),
      supabase.from("audit_snapshots").select("*").eq("id", body.comparison_snapshot_id).maybeSingle(),
    ]);
    baseline = b;
    comparison = c;
  } else {
    const { data: snapshots, error: snapshotsError } = await supabase
      .from("audit_snapshots")
      .select("*")
      .eq("social_connection_id", socialConnectionId)
      .order("extracted_at", { ascending: true });
    if (snapshotsError) {
      return jsonResponse(500, { error: `Lecture de audit_snapshots impossible : ${snapshotsError.message}` });
    }
    if (!snapshots || snapshots.length < 2) {
      return jsonResponse(400, {
        error: "Au moins deux audits Phase 1 sont nécessaires pour une analyse (un plus ancien, un plus récent).",
      });
    }
    baseline = snapshots[0];
    comparison = snapshots[snapshots.length - 1];
  }

  if (!baseline || !comparison) {
    return jsonResponse(404, { error: "Un des deux relevés Phase 1 est introuvable." });
  }
  if (baseline.id === comparison.id) {
    return jsonResponse(400, { error: "Le relevé de référence et de comparaison doivent être différents." });
  }
  if (!baseline.metrics || !comparison.metrics) {
    return jsonResponse(400, { error: "L'un des deux relevés n'a pas de métriques exploitables (extraction échouée)." });
  }

  const metricsDelta = computeDeltas(baseline.metrics as Metrics, comparison.metrics as Metrics);

  const result = await analyzePerformance(
    connection.account_handle,
    connection.platform,
    formatSnapshot(baseline),
    formatSnapshot(comparison),
    JSON.stringify(metricsDelta, null, 2),
  );

  const { data: analysisRow, error: insertError } = await supabase
    .from("performance_analyses")
    .insert({
      social_connection_id: connection.id,
      baseline_snapshot_id: baseline.id,
      comparison_snapshot_id: comparison.id,
      metrics_delta: metricsDelta,
      analysis_summary: result.payload?.summary ?? null,
      correlation_note: result.payload?.correlation_note ?? null,
      is_mock: Boolean(baseline.is_mock || comparison.is_mock),
      error: result.ok ? null : result.error,
    })
    .select()
    .single();
  if (insertError) {
    return jsonResponse(500, { error: `Analyse non enregistrée : ${insertError.message}` });
  }

  return jsonResponse(result.ok ? 200 : 502, {
    ok: result.ok,
    analysis: analysisRow,
    ...(result.ok ? {} : { error: result.error }),
  });
});

/** Only numeric fields present (not the donnée_indisponible sentinel) on
 * BOTH sides get a delta — same "no ratio if either operand is missing"
 * discipline as Phase 1's own metrics. Arithmetic lives here, in code, not
 * in the model. */
function computeDeltas(before: Metrics, after: Metrics): Record<string, { before: number; after: number; delta: number }> {
  const deltas: Record<string, { before: number; after: number; delta: number }> = {};
  for (const key of Object.keys(before)) {
    const beforeVal = before[key];
    const afterVal = after[key];
    if (
      typeof beforeVal === "number" &&
      typeof afterVal === "number" &&
      beforeVal !== null &&
      afterVal !== null
    ) {
      deltas[key] = { before: beforeVal, after: afterVal, delta: afterVal - beforeVal };
    }
  }
  return deltas;
}

function formatSnapshot(snapshot: { source: string; extracted_at: string; metrics: unknown; is_mock: boolean }): string {
  return (
    `Source : ${snapshot.source}${snapshot.is_mock ? " (DONNÉES FACTICES — is_mock=true)" : ""}\n` +
    `Extrait le : ${snapshot.extracted_at}\n` +
    `Métriques : ${JSON.stringify(snapshot.metrics, null, 2)}`
  );
}
