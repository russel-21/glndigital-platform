// Agent Phase 1 — Audit (see CLAUDE.md, "Feature en cours de cadrage :
// automatisation reseaux sociaux par agents IA", sections 3 et 4).
//
// SCOPE (strict — do not extend without explicit validation from Russel):
//   - Input: a `social_connections.id`.
//   - Output: one new row in `audit_snapshots` holding raw factual metrics
//     for that account, sourced from Zernio (or mock data — see
//     _shared/zernioClient.ts), tagged with `source` + `extracted_at`.
//   - This function NEVER interprets, scores, or diagnoses. No ratio is
//     computed if either operand is unavailable — the Zernio adapter already
//     enforces this via the DONNEE_INDISPONIBLE sentinel; this function just
//     stores what it's given.
//   - No human validation gate here: per CLAUDE.md's phase table, Phase 1 is
//     "Validation humaine requise: Non". The gate belongs to Phase 2
//     (Diagnostic), which is out of scope for this function.
//   - Admin-only: this is an internal GLN-staff tool, not a client-facing
//     self-serve flow (that's the Phase 5 OAuth "Connecter mon compte" flow,
//     also out of scope here).
//
// Auth model: the caller's own JWT is used for every DB operation (no
// service-role key involved), so Postgres RLS enforces the admin-only rule
// on its own — this function does not duplicate that check beyond calling
// public.is_admin() up front to fail fast with a clear message.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { fetchAccountMetrics, type Platform } from "../_shared/zernioClient.ts";

interface RequestBody {
  social_connection_id?: string;
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
    return jsonResponse(500, {
      error: "SUPABASE_URL / SUPABASE_ANON_KEY non configurés côté fonction.",
    });
  }

  // Scoped to the caller's own JWT — every query below runs under RLS as
  // this user, so `public.is_admin()` is what actually gates access.
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: isAdmin, error: adminCheckError } = await supabase.rpc(
    "is_admin",
  );
  if (adminCheckError) {
    return jsonResponse(500, {
      error: `Échec de la vérification admin : ${adminCheckError.message}`,
    });
  }
  if (!isAdmin) {
    return jsonResponse(403, {
      error: "Réservé aux administrateurs GLN Digital.",
    });
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
    .select("id, platform, account_handle, zernio_account_id")
    .eq("id", socialConnectionId)
    .maybeSingle();

  if (connectionError) {
    return jsonResponse(500, {
      error: `Lecture de social_connections impossible : ${connectionError.message}`,
    });
  }
  if (!connection) {
    return jsonResponse(404, {
      error: `Aucun social_connections avec l'id ${socialConnectionId}.`,
    });
  }

  const result = await fetchAccountMetrics(
    connection.platform as Platform,
    connection.account_handle,
    connection.zernio_account_id,
  );

  const { data: snapshot, error: insertError } = await supabase
    .from("audit_snapshots")
    .insert({
      social_connection_id: connection.id,
      platform: connection.platform,
      source: result.source,
      extracted_at: result.extractedAt,
      metrics: result.ok ? result.metrics : null,
      raw_response: result.rawResponse ?? null,
      is_mock: result.isMock,
      error: result.ok ? null : result.error,
    })
    .select()
    .single();

  if (insertError) {
    return jsonResponse(500, {
      error: `Snapshot non enregistré : ${insertError.message}`,
    });
  }

  return jsonResponse(result.ok ? 200 : 502, {
    snapshot,
    ok: result.ok,
    is_mock: result.isMock,
    ...(result.ok ? {} : { error: result.error }),
  });
});
