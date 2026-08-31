// Agent Phase 2 — Diagnostic (see CLAUDE.md, "Feature en cours de cadrage :
// automatisation reseaux sociaux par agents IA", sections 3 et 4).
//
// SCOPE (strict — do not extend without explicit validation from Russel):
//   - Input: a `social_connections.id`, optionally a specific
//     `audit_snapshots.id` to reason from (defaults to the latest one for
//     that connection), and a list of already-uploaded
//     `diagnostic_screenshots.id`s.
//   - Output: one new row in `diagnostics` holding hypotheses (each with an
//     explicit confidence level and a `based_on` trace back to Phase 1 data
//     or a screenshot), missing-data callouts, and a summary. Never a
//     score, never a recommendation — that's out of scope for this agent.
//   - Refuses outright if zero screenshots are provided: per CLAUDE.md,
//     Phase 2 without visual support is incomplete, not just weaker.
//   - No mock mode: unlike Phase 1's Zernio adapter (where the real API
//     contract was genuinely unknown), the Claude API contract used here is
//     fully known and implemented for real. If ANTHROPIC_API_KEY isn't
//     configured, this returns a clear "not configured" error rather than
//     fabricating a fake diagnostic — there's nothing to reasonably mock
//     for a reasoning task like this.
//   - Every inserted row starts at review_status = 'pending_review'. This
//     function NEVER sets it to 'approved' — that is a human action taken
//     in the admin UI (CLAUDE.md: Phase 2 requires human validation before
//     Phase 3, implemented as a real gate, not a log line).
//   - Admin-only: internal GLN-staff tool, not client-facing.
//
// Auth model: the caller's own JWT is used for every DB + Storage
// operation (no service-role key involved), so Postgres RLS enforces the
// admin-only rule on its own — this function calls public.is_admin() up
// front only to fail fast with a clear message.

import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rateLimit.ts";
import { generateDiagnostic, type ScreenshotInput } from "../_shared/claudeClient.ts";

interface RequestBody {
  social_connection_id?: string;
  audit_snapshot_id?: string;
  screenshot_ids?: string[];
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

  const rateLimitError = await checkRateLimit(supabase, `phase2-diagnostic:${socialConnectionId}`);
  if (rateLimitError) {
    return jsonResponse(429, { error: rateLimitError });
  }

  const screenshotIds = body.screenshot_ids ?? [];
  if (screenshotIds.length === 0) {
    return jsonResponse(400, {
      error: "Au moins une capture d'écran est requise pour générer un diagnostic (Phase 2).",
    });
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

  // Resolve the audit_snapshot to reason from: the one explicitly passed,
  // or the most recent one for this connection.
  let snapshotQuery = supabase
    .from("audit_snapshots")
    .select("id, source, extracted_at, metrics, is_mock, error")
    .eq("social_connection_id", socialConnectionId)
    .order("extracted_at", { ascending: false })
    .limit(1);
  if (body.audit_snapshot_id) {
    snapshotQuery = supabase
      .from("audit_snapshots")
      .select("id, source, extracted_at, metrics, is_mock, error")
      .eq("id", body.audit_snapshot_id);
  }
  const { data: snapshots, error: snapshotError } = await snapshotQuery;
  if (snapshotError) {
    return jsonResponse(500, { error: `Lecture de audit_snapshots impossible : ${snapshotError.message}` });
  }
  const snapshot = snapshots?.[0];
  if (!snapshot) {
    return jsonResponse(404, {
      error: "Aucun audit_snapshots trouvé pour ce compte — lance d'abord un audit Phase 1.",
    });
  }

  const { data: screenshotRows, error: screenshotsError } = await supabase
    .from("diagnostic_screenshots")
    .select("id, storage_path, label")
    .eq("social_connection_id", socialConnectionId)
    .in("id", screenshotIds);
  if (screenshotsError) {
    return jsonResponse(500, { error: `Lecture de diagnostic_screenshots impossible : ${screenshotsError.message}` });
  }
  if (!screenshotRows || screenshotRows.length === 0) {
    return jsonResponse(404, { error: "Aucune des captures fournies n'a été trouvée pour ce compte." });
  }

  const screenshots: ScreenshotInput[] = [];
  for (const row of screenshotRows) {
    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from("diagnostic-screenshots")
      .download(row.storage_path);
    if (downloadError || !fileBlob) {
      return jsonResponse(500, {
        error: `Téléchargement de la capture "${row.label}" impossible : ${downloadError?.message ?? "inconnu"}`,
      });
    }
    const arrayBuffer = await fileBlob.arrayBuffer();
    const base64 = encodeBase64(new Uint8Array(arrayBuffer));
    const mediaType = guessMediaType(row.storage_path);
    screenshots.push({ base64, mediaType, label: row.label });
  }

  const metricsSummaryText = buildMetricsSummary(connection, snapshot);

  const result = await generateDiagnostic(metricsSummaryText, screenshots);

  const { data: diagnosticRow, error: insertError } = await supabase
    .from("diagnostics")
    .insert({
      social_connection_id: connection.id,
      audit_snapshot_id: snapshot.id,
      screenshot_ids: screenshotRows.map((r) => r.id),
      conclusive: result.payload?.conclusive ?? null,
      hypotheses: result.payload?.hypotheses ?? null,
      missing_data: result.payload?.missing_data ?? null,
      summary: result.payload?.summary ?? null,
      is_mock: false,
      error: result.ok ? null : result.error,
    })
    .select()
    .single();

  if (insertError) {
    return jsonResponse(500, { error: `Diagnostic non enregistré : ${insertError.message}` });
  }

  return jsonResponse(result.ok ? 200 : 502, {
    diagnostic: diagnosticRow,
    ok: result.ok,
    ...(result.ok ? {} : { error: result.error }),
  });
});

function buildMetricsSummary(
  connection: { platform: string; account_handle: string },
  snapshot: { source: string; extracted_at: string; metrics: unknown; is_mock: boolean; error: string | null },
): string {
  const lines = [
    `Plateforme : ${connection.platform}`,
    `Compte : ${connection.account_handle}`,
    `Source des données : ${snapshot.source}${snapshot.is_mock ? " (DONNÉES FACTICES — is_mock=true)" : ""}`,
    `Date d'extraction : ${snapshot.extracted_at}`,
  ];
  if (snapshot.error) {
    lines.push(`Erreur d'extraction Phase 1 : ${snapshot.error}`);
  }
  if (snapshot.metrics) {
    lines.push(`Métriques : ${JSON.stringify(snapshot.metrics, null, 2)}`);
  } else {
    lines.push("Métriques : aucune (extraction Phase 1 échouée)");
  }
  return lines.join("\n");
}

function guessMediaType(path: string): "image/png" | "image/jpeg" | "image/webp" | "image/gif" {
  const lower = path.toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  return "image/png";
}

function encodeBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}
