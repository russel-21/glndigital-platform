// Best-effort reconciliation of a client_action_quotes row with real usage,
// once the actual Claude/RunPod call it was quoted for has completed. See
// the migration creating client_action_quotes for the full rationale
// (phase_pricing_config holds starting estimates, not measurements — this
// is how real data eventually replaces them). Never throws: a failure here
// must never fail the phase function's own real response to its caller.

import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { CLAUDE_INPUT_USD_PER_MILLION, CLAUDE_OUTPUT_USD_PER_MILLION, RUNPOD_USD_PER_GPU_HOUR } from "./pricingRates.ts";

export interface ActualUsage {
  input_tokens?: number;
  output_tokens?: number;
  gpu_seconds?: number;
}

/** Extracts {input_tokens, output_tokens} from a Claude API raw_response
 * (as returned in every claudeClient.ts *Result on success). Returns null
 * if the shape doesn't match — e.g. raw_response was set to the raw text
 * string on a malformed-JSON failure path instead of the full response. */
export function extractClaudeUsage(rawResponse: unknown): { input_tokens: number; output_tokens: number } | null {
  if (!rawResponse || typeof rawResponse !== "object") return null;
  const usage = (rawResponse as Record<string, unknown>).usage;
  if (!usage || typeof usage !== "object") return null;
  const u = usage as Record<string, unknown>;
  if (typeof u.input_tokens !== "number" || typeof u.output_tokens !== "number") return null;
  return { input_tokens: u.input_tokens, output_tokens: u.output_tokens };
}

/** Writes actual_cost_usd/actual_usage onto the most recent accepted,
 * not-yet-reconciled client_action_quotes row for this resource+action.
 * No-ops (not an error) when no such quote exists — e.g. an admin
 * triggered the same phase directly, bypassing the client quote flow
 * entirely, which stays fully supported. */
export async function reconcileActionQuote(
  supabase: SupabaseClient,
  socialConnectionId: string,
  actionType: string,
  usage: ActualUsage,
): Promise<void> {
  try {
    const { data: quote } = await supabase
      .from("client_action_quotes")
      .select("id")
      .eq("social_connection_id", socialConnectionId)
      .eq("action_type", actionType)
      .not("accepted_at", "is", null)
      .is("actual_cost_usd", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!quote) return;

    let actualCostUsd = 0;
    if (usage.input_tokens != null) {
      actualCostUsd += (usage.input_tokens / 1_000_000) * CLAUDE_INPUT_USD_PER_MILLION;
    }
    if (usage.output_tokens != null) {
      actualCostUsd += (usage.output_tokens / 1_000_000) * CLAUDE_OUTPUT_USD_PER_MILLION;
    }
    if (usage.gpu_seconds != null) {
      actualCostUsd += (usage.gpu_seconds / 3600) * RUNPOD_USD_PER_GPU_HOUR;
    }

    await supabase
      .from("client_action_quotes")
      .update({ actual_cost_usd: Number(actualCostUsd.toFixed(4)), actual_usage: usage })
      .eq("id", quote.id);
  } catch {
    // Best-effort only — never let reconciliation failure affect the
    // caller's real response.
  }
}
