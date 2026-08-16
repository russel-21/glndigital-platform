// Phase 7 (Analyse/optimisation) data layer — see CLAUDE.md, "Feature en
// cours de cadrage : automatisation reseaux sociaux par agents IA",
// sections 3 et 4.
//
// SCOPE (strict): typed read access to performance_analyses and a wrapper
// to invoke the phase7-analysis edge function. No review_status gate here
// — CLAUDE.md's Phase 7 table row says "Validation humaine requise : Non".

import { supabase } from "@/integrations/supabase/client";

export interface MetricDelta {
  before: number;
  after: number;
  delta: number;
}

export interface PerformanceAnalysis {
  id: string;
  social_connection_id: string;
  baseline_snapshot_id: string;
  comparison_snapshot_id: string;
  metrics_delta: Record<string, MetricDelta> | null;
  analysis_summary: string | null;
  correlation_note: string | null;
  is_mock: boolean;
  error: string | null;
  created_at: string;
}

export const fetchPerformanceAnalyses = async (socialConnectionId: string): Promise<PerformanceAnalysis[]> => {
  const { data, error } = await supabase
    .from("performance_analyses")
    .select("*")
    .eq("social_connection_id", socialConnectionId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as PerformanceAnalysis[];
};

export interface TriggerAnalysisResult {
  ok: boolean;
  analysis: PerformanceAnalysis;
  error?: string;
}

/** Defaults to comparing the earliest vs. most recent audit_snapshots for
 * this connection when no explicit pair is given. */
export const triggerPhase7Analysis = async (
  socialConnectionId: string,
  baselineSnapshotId?: string,
  comparisonSnapshotId?: string,
): Promise<TriggerAnalysisResult> => {
  const { data, error } = await supabase.functions.invoke("phase7-analysis", {
    body: {
      social_connection_id: socialConnectionId,
      ...(baselineSnapshotId ? { baseline_snapshot_id: baselineSnapshotId } : {}),
      ...(comparisonSnapshotId ? { comparison_snapshot_id: comparisonSnapshotId } : {}),
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
  return data as TriggerAnalysisResult;
};
