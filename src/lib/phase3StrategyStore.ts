// Phase 3 (Stratégie de contenu) data layer — see CLAUDE.md, "Feature en
// cours de cadrage : automatisation reseaux sociaux par agents IA",
// sections 3 et 4.
//
// SCOPE (strict): typed read access to content_strategies (see
// supabase/migrations/20260815223000_create_phase3_strategy_tables.sql), a
// wrapper to invoke the phase3-strategy edge function, and the human
// validation gate (approve/reject). This module never interprets the AI
// output itself; it only moves data and enforces the review-status gate —
// same shape as phase2DiagnosticStore.ts.

import { supabase } from "@/integrations/supabase/client";

export interface ContentPillar {
  name: string;
  description: string;
  rationale: string;
}

export interface EditorialCalendarEntry {
  day_offset: number;
  platform: string;
  pillar: string;
  format: string;
  working_title: string;
  brief: string;
}

export interface TrendSource {
  claim: string;
  source_url: string;
  source_title: string;
  retrieved_at: string;
}

export type ReviewStatus = "pending_review" | "approved" | "rejected";

export interface ContentStrategy {
  id: string;
  social_connection_id: string;
  diagnostic_id: string;
  pillars: ContentPillar[] | null;
  editorial_calendar: EditorialCalendarEntry[] | null;
  trends_used: TrendSource[] | null;
  summary: string | null;
  is_mock: boolean;
  error: string | null;
  review_status: ReviewStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
}

export const fetchContentStrategies = async (socialConnectionId: string): Promise<ContentStrategy[]> => {
  const { data, error } = await supabase
    .from("content_strategies")
    .select("*")
    .eq("social_connection_id", socialConnectionId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as ContentStrategy[];
};

export interface TriggerStrategyResult {
  ok: boolean;
  strategy: ContentStrategy;
  error?: string;
}

/** Invokes the phase3-strategy edge function. The function itself refuses
 * to run without an APPROVED diagnostic for the connection — this wrapper
 * doesn't duplicate that check, it just surfaces whatever the function
 * says (including that specific refusal, in French, if it happens). */
export const triggerPhase3Strategy = async (
  socialConnectionId: string,
  diagnosticId?: string,
): Promise<TriggerStrategyResult> => {
  const { data, error } = await supabase.functions.invoke("phase3-strategy", {
    body: {
      social_connection_id: socialConnectionId,
      ...(diagnosticId ? { diagnostic_id: diagnosticId } : {}),
    },
  });

  if (error) {
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

  return data as TriggerStrategyResult;
};

/** The human validation gate — same real state transition as
 * reviewDiagnostic() in phase2DiagnosticStore.ts. Phase 4 (not yet built)
 * must check review_status === 'approved' before consuming a
 * content_strategies row. */
export const reviewContentStrategy = async (
  strategyId: string,
  decision: "approved" | "rejected",
  notes?: string,
): Promise<void> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("content_strategies")
    .update({
      review_status: decision,
      reviewed_by: user?.id ?? null,
      reviewed_at: new Date().toISOString(),
      review_notes: notes?.trim() || null,
    })
    .eq("id", strategyId);
  if (error) throw error;
};
