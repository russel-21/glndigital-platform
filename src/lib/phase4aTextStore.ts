// Phase 4a (Production texte) data layer — see CLAUDE.md, "Feature en
// cours de cadrage : automatisation reseaux sociaux par agents IA",
// sections 3 et 4.
//
// SCOPE (strict): typed read access to content_drafts (see
// supabase/migrations/20260816120000_create_phase4a_text_tables.sql), a
// wrapper to invoke the phase4a-text edge function, and the human
// validation gate (approve/reject) — same shape as
// phase2DiagnosticStore.ts / phase3StrategyStore.ts. brand_brief itself
// lives on social_connections and is managed in phase1AuditStore.ts
// (updateBrandBrief) since it's a field on that table, not a new one.

import { supabase } from "@/integrations/supabase/client";

export type ReviewStatus = "pending_review" | "approved" | "rejected";

export interface ContentDraft {
  id: string;
  social_connection_id: string;
  strategy_id: string;
  calendar_entry_index: number;
  calendar_day_offset: number;
  calendar_platform: string;
  calendar_working_title: string;
  caption: string | null;
  hook: string | null;
  script: string | null;
  is_mock: boolean;
  error: string | null;
  review_status: ReviewStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
}

export const fetchContentDrafts = async (strategyId: string): Promise<ContentDraft[]> => {
  const { data, error } = await supabase
    .from("content_drafts")
    .select("*")
    .eq("strategy_id", strategyId)
    .order("calendar_entry_index", { ascending: true });
  if (error) throw error;
  return (data || []) as unknown as ContentDraft[];
};

export interface TriggerDraftResult {
  ok: boolean;
  draft: ContentDraft;
  error?: string;
}

/** Invokes the phase4a-text edge function for one calendar entry. The
 * function itself refuses without a brand_brief on the account and without
 * an APPROVED strategy — this wrapper doesn't duplicate those checks, it
 * just surfaces whatever the function says. */
export const triggerPhase4aDraft = async (
  socialConnectionId: string,
  strategyId: string,
  calendarEntryIndex: number,
): Promise<TriggerDraftResult> => {
  const { data, error } = await supabase.functions.invoke("phase4a-text", {
    body: {
      social_connection_id: socialConnectionId,
      strategy_id: strategyId,
      calendar_entry_index: calendarEntryIndex,
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

  return data as TriggerDraftResult;
};

/** The human validation gate — same real state transition as
 * reviewDiagnostic()/reviewContentStrategy(). Phase 5 (Publication, not yet
 * built) must check review_status === 'approved' before ever scheduling a
 * content_drafts row — CLAUDE.md requires relecture avant publication. */
export const reviewContentDraft = async (
  draftId: string,
  decision: "approved" | "rejected",
  notes?: string,
): Promise<void> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("content_drafts")
    .update({
      review_status: decision,
      reviewed_by: user?.id ?? null,
      reviewed_at: new Date().toISOString(),
      review_notes: notes?.trim() || null,
    })
    .eq("id", draftId);
  if (error) throw error;
};
