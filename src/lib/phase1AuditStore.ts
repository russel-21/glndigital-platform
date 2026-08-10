// Phase 1 (Audit) data layer — see CLAUDE.md, "Feature en cours de cadrage :
// automatisation reseaux sociaux par agents IA", sections 3 (tableau des
// phases) et 4 (regles anti-hallucination).
//
// SCOPE (strict): typed read/write access to the two Phase 1 Supabase tables
// (social_connections, audit_snapshots — see
// supabase/migrations/20260809120000_create_phase1_audit_tables.sql) plus a
// thin wrapper around the phase1-audit edge function. This module never
// interprets, scores or diagnoses — it only moves data between the admin UI
// and Postgres/the edge function. Both tables are gated by public.is_admin()
// RLS, so every function here assumes the signed-in Supabase user is an
// admin; there is no separate auth check on the client side.
//
// The generated Database type (src/integrations/supabase/types.ts) only
// knows these two tables' columns as broad `string`/`Json` — the `as
// SocialConnection[]` / `as AuditSnapshot[]` casts below narrow that down to
// this module's stricter domain types (Platform union, NormalizedAuditMetrics
// shape), same as any other typed read from a jsonb/text column.

import { supabase } from "@/integrations/supabase/client";

export type Platform = "meta_facebook" | "meta_instagram" | "tiktok" | "youtube";

export const PLATFORM_LABELS: Record<Platform, string> = {
  meta_facebook: "Facebook",
  meta_instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
};

export type ConnectionStatus = "not_connected" | "pending" | "connected" | "error";

export interface SocialConnection {
  id: string;
  client_profile_id: string | null;
  platform: Platform;
  account_handle: string;
  zernio_account_id: string | null;
  connection_status: ConnectionStatus;
  created_at: string;
  updated_at: string;
}

/** Mirrors the DONNEE_INDISPONIBLE sentinel from
 * supabase/functions/_shared/zernioClient.ts — a field is either a real,
 * factual value or this exact string, never a guess. */
export type MaybeUnavailable<T> = T | "donnée_indisponible";

export interface NormalizedAuditMetrics {
  followers_count: MaybeUnavailable<number>;
  following_count: MaybeUnavailable<number>;
  posts_count: MaybeUnavailable<number>;
  engagement_rate: MaybeUnavailable<number>;
  avg_likes_per_post: MaybeUnavailable<number>;
  avg_comments_per_post: MaybeUnavailable<number>;
  last_post_at: MaybeUnavailable<string>;
  account_created_at: MaybeUnavailable<string>;
  verified: MaybeUnavailable<boolean>;
  bio_text: MaybeUnavailable<string>;
  platform_specific: Record<string, MaybeUnavailable<number | string>>;
}

export interface AuditSnapshot {
  id: string;
  social_connection_id: string;
  platform: Platform;
  source: string;
  extracted_at: string;
  metrics: NormalizedAuditMetrics | null;
  raw_response: unknown;
  is_mock: boolean;
  error: string | null;
  created_at: string;
}

export const fetchSocialConnections = async (): Promise<SocialConnection[]> => {
  const { data, error } = await supabase
    .from("social_connections")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as SocialConnection[];
};

export interface NewSocialConnectionInput {
  platform: Platform;
  account_handle: string;
  zernio_account_id?: string | null;
  client_profile_id?: string | null;
}

export const createSocialConnection = async (
  input: NewSocialConnectionInput,
): Promise<SocialConnection> => {
  const { data, error } = await supabase
    .from("social_connections")
    .insert({
      platform: input.platform,
      account_handle: input.account_handle.trim(),
      zernio_account_id: input.zernio_account_id?.trim() || null,
      client_profile_id: input.client_profile_id || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as SocialConnection;
};

export const deleteSocialConnection = async (id: string): Promise<void> => {
  const { error } = await supabase.from("social_connections").delete().eq("id", id);
  if (error) throw error;
};

export const fetchAuditSnapshots = async (
  socialConnectionId: string,
): Promise<AuditSnapshot[]> => {
  const { data, error } = await supabase
    .from("audit_snapshots")
    .select("*")
    .eq("social_connection_id", socialConnectionId)
    .order("extracted_at", { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as AuditSnapshot[];
};

export interface TriggerAuditResult {
  ok: boolean;
  is_mock: boolean;
  snapshot: AuditSnapshot;
  error?: string;
}

/** Invokes the phase1-audit edge function for one social_connections row.
 * The Supabase client attaches the signed-in admin's session JWT
 * automatically; the function re-checks public.is_admin() server-side (see
 * supabase/functions/phase1-audit/index.ts), so there is no separate auth
 * wiring needed here. No interpretation happens on the client either — this
 * just returns whatever factual snapshot (or explicit error) the function
 * produced. */
export const triggerPhase1Audit = async (
  socialConnectionId: string,
): Promise<TriggerAuditResult> => {
  const { data, error } = await supabase.functions.invoke("phase1-audit", {
    body: { social_connection_id: socialConnectionId },
  });

  if (error) {
    // supabase-js only populates `error` for network failures or non-2xx
    // responses; the function's own JSON body (with its French error
    // message) is usually still readable off error.context — surface that
    // instead of the generic "Edge Function returned a non-2xx status code".
    const context = (error as { context?: Response }).context;
    let detail: string | undefined;
    if (context && typeof context.json === "function") {
      try {
        detail = (await context.json())?.error;
      } catch {
        // no JSON body to read — fall back to the generic message below
      }
    }
    throw new Error(detail || error.message);
  }

  return data as TriggerAuditResult;
};
