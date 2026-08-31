// Shared per-resource cooldown for edge functions that call a paid
// third-party API (Zernio/Claude/RunPod) — see the migration that creates
// public.edge_function_rate_limits for the full rationale. Deliberately
// narrow scope: this is not a general API-abuse or per-user rate limiter,
// just a guard against the same resource being re-triggered again within a
// short window (a runaway loop, a double-click, a compromised session).

import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

const DEFAULT_COOLDOWN_MS = 2 * 60 * 1000; // 2 minutes

/** Checks the cooldown for `resourceKey` and records this call if allowed.
 * Returns null when the call may proceed, or a French error message ready
 * to hand back to the client (429) when still within cooldown. Callers
 * should namespace resourceKey per function (e.g. `phase1-audit:<id>`) so
 * two different phases rate-limiting the same underlying resource don't
 * collide with each other. */
export async function checkRateLimit(
  supabase: SupabaseClient,
  resourceKey: string,
  cooldownMs: number = DEFAULT_COOLDOWN_MS,
): Promise<string | null> {
  const { data } = await supabase
    .from("edge_function_rate_limits")
    .select("last_called_at")
    .eq("resource_key", resourceKey)
    .maybeSingle();

  const now = Date.now();
  if (data?.last_called_at) {
    const elapsed = now - new Date(data.last_called_at as string).getTime();
    if (elapsed < cooldownMs) {
      const waitSec = Math.ceil((cooldownMs - elapsed) / 1000);
      return `Trop d'appels rapprochés pour cette ressource — réessaie dans ${waitSec}s.`;
    }
  }

  await supabase
    .from("edge_function_rate_limits")
    .upsert({ resource_key: resourceKey, last_called_at: new Date(now).toISOString() });

  return null;
}
