// Agent — Cost quote before a paid action (get-action-quote)
//
// SCOPE: computes and logs an estimated cost (Claude and/or RunPod usage,
// GLN's margin included) for one client-triggered action, BEFORE that
// action's own edge function (phase2-diagnostic, phase3-strategy, etc.) is
// ever called. Returns the estimate to the client for explicit accept —
// see src/pages/DashboardClient.tsx for the accept step, which flips
// accepted_at on the row this function inserts, and CLAUDE.md for why
// Zernio's own cost (billed per connected account/month, not per action)
// is deliberately excluded here.
//
// This function never calls Claude or RunPod itself — it only reads
// phase_pricing_config (admin-set starting estimates, not measurements —
// see that table's migration) and does arithmetic. Real per-token/
// per-GPU-second rates below are verified figures (Claude Sonnet 5 pricing,
// RunPod RTX 4090 serverless pricing, both checked 2026-08-31) — not
// invented.
//
// Auth model: same as zernio-connect — any authenticated "client" acting on
// their own resource, not admin-only. RLS (client_action_quotes,
// phase_pricing_config, social_connections) is what actually gates access.

import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { CLAUDE_INPUT_USD_PER_MILLION, CLAUDE_OUTPUT_USD_PER_MILLION, RUNPOD_USD_PER_GPU_HOUR } from "../_shared/pricingRates.ts";

interface RequestBody {
  social_connection_id?: string;
  action_type?: string;
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

  const { data: userResult, error: userError } = await supabase.auth.getUser();
  if (userError || !userResult?.user) {
    return jsonResponse(401, { error: "Session invalide ou expirée." });
  }
  const userId = userResult.user.id;

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(400, { error: "Corps de requête JSON invalide." });
  }

  const socialConnectionId = body.social_connection_id;
  const actionType = body.action_type;
  if (!socialConnectionId || !actionType) {
    return jsonResponse(400, { error: "social_connection_id et action_type sont requis." });
  }

  // Ownership check: RLS would also enforce this on the eventual insert, but
  // failing fast here gives a clear 404 instead of an opaque RLS rejection.
  const { data: connection, error: connectionError } = await supabase
    .from("social_connections")
    .select("id, client_profile_id")
    .eq("id", socialConnectionId)
    .maybeSingle();
  if (connectionError) {
    return jsonResponse(500, { error: `Lecture de social_connections impossible : ${connectionError.message}` });
  }
  if (!connection || connection.client_profile_id !== userId) {
    return jsonResponse(404, { error: "Compte social introuvable pour cet utilisateur." });
  }

  const { data: pricing, error: pricingError } = await supabase
    .from("phase_pricing_config")
    .select("*")
    .eq("action_type", actionType)
    .maybeSingle();
  if (pricingError) {
    return jsonResponse(500, { error: `Lecture de phase_pricing_config impossible : ${pricingError.message}` });
  }
  if (!pricing) {
    return jsonResponse(400, { error: `Aucune configuration de prix pour action_type "${actionType}".` });
  }

  const marginMultiplier = 1 + Number(pricing.margin_pct) / 100;
  let baseCostUsd = 0;
  const breakdown: Record<string, unknown> = {
    margin_pct: pricing.margin_pct,
    action_type: actionType,
  };

  if (pricing.estimated_gpu_seconds != null) {
    const gpuCost = (pricing.estimated_gpu_seconds / 3600) * RUNPOD_USD_PER_GPU_HOUR;
    baseCostUsd += gpuCost;
    breakdown.estimated_gpu_seconds = pricing.estimated_gpu_seconds;
    breakdown.runpod_usd_per_gpu_hour = RUNPOD_USD_PER_GPU_HOUR;
    breakdown.gpu_cost_usd = Number(gpuCost.toFixed(4));
  }
  if (pricing.estimated_input_tokens != null || pricing.estimated_output_tokens != null) {
    const inputCost = ((pricing.estimated_input_tokens ?? 0) / 1_000_000) * CLAUDE_INPUT_USD_PER_MILLION;
    const outputCost = ((pricing.estimated_output_tokens ?? 0) / 1_000_000) * CLAUDE_OUTPUT_USD_PER_MILLION;
    baseCostUsd += inputCost + outputCost;
    breakdown.estimated_input_tokens = pricing.estimated_input_tokens;
    breakdown.estimated_output_tokens = pricing.estimated_output_tokens;
    breakdown.claude_usd_per_million_input = CLAUDE_INPUT_USD_PER_MILLION;
    breakdown.claude_usd_per_million_output = CLAUDE_OUTPUT_USD_PER_MILLION;
    breakdown.claude_cost_usd = Number((inputCost + outputCost).toFixed(4));
  }

  const estimatedCostUsd = Number((baseCostUsd * marginMultiplier).toFixed(4));
  breakdown.base_cost_usd = Number(baseCostUsd.toFixed(4));
  breakdown.total_with_margin_usd = estimatedCostUsd;
  breakdown.is_estimate = true;
  breakdown.note =
    pricing.notes ??
    "Estimation avant exécution — le coût réel peut varier légèrement selon l'usage réel.";

  const { data: quote, error: insertError } = await supabase
    .from("client_action_quotes")
    .insert({
      social_connection_id: socialConnectionId,
      client_profile_id: userId,
      action_type: actionType,
      estimated_cost_usd: estimatedCostUsd,
      cost_breakdown: breakdown,
    })
    .select()
    .single();
  if (insertError) {
    return jsonResponse(500, { error: `Enregistrement du devis impossible : ${insertError.message}` });
  }

  return jsonResponse(200, { ok: true, quote });
});
