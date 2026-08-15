// Phase 2 (Diagnostic) data layer — see CLAUDE.md, "Feature en cours de
// cadrage : automatisation reseaux sociaux par agents IA", sections 3 et 4.
//
// SCOPE (strict): typed read/write access to diagnostic_screenshots and
// diagnostics (see
// supabase/migrations/20260810210000_create_phase2_diagnostic_tables.sql),
// screenshot upload to the private "diagnostic-screenshots" Storage bucket,
// a wrapper to invoke the phase2-diagnostic edge function, and the human
// validation gate (approve/reject) — a real state transition, not a log
// line. This module never interprets the AI output itself; it only moves
// data and enforces the review-status gate.

import { supabase } from "@/integrations/supabase/client";

export interface DiagnosticScreenshot {
  id: string;
  social_connection_id: string;
  storage_path: string;
  label: string;
  uploaded_by: string | null;
  created_at: string;
}

export type ConfidenceLevel = "Élevé" | "Moyen" | "Faible";

export interface DiagnosticHypothesis {
  statement: string;
  confidence: ConfidenceLevel;
  based_on: string[];
}

export type ReviewStatus = "pending_review" | "approved" | "rejected";

export interface Diagnostic {
  id: string;
  social_connection_id: string;
  audit_snapshot_id: string | null;
  screenshot_ids: string[];
  conclusive: boolean | null;
  hypotheses: DiagnosticHypothesis[] | null;
  missing_data: string[] | null;
  summary: string | null;
  is_mock: boolean;
  error: string | null;
  review_status: ReviewStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
}

export const uploadDiagnosticScreenshot = async (
  socialConnectionId: string,
  file: File,
  label: string,
): Promise<DiagnosticScreenshot> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ext = file.name.split(".").pop() || "png";
  const storagePath = `${socialConnectionId}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("diagnostic-screenshots")
    .upload(storagePath, file, { contentType: file.type || undefined });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from("diagnostic_screenshots")
    .insert({
      social_connection_id: socialConnectionId,
      storage_path: storagePath,
      label: label.trim() || file.name,
      uploaded_by: user?.id ?? null,
    })
    .select()
    .single();

  if (error) {
    // Best-effort cleanup — don't leave an orphaned file if the metadata
    // insert failed (e.g. RLS edge case). Not awaited-critical: if this
    // also fails, the storage object is merely unreferenced, not harmful.
    await supabase.storage.from("diagnostic-screenshots").remove([storagePath]);
    throw error;
  }
  return data as DiagnosticScreenshot;
};

export const fetchDiagnosticScreenshots = async (
  socialConnectionId: string,
): Promise<DiagnosticScreenshot[]> => {
  const { data, error } = await supabase
    .from("diagnostic_screenshots")
    .select("*")
    .eq("social_connection_id", socialConnectionId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as DiagnosticScreenshot[];
};

export const getDiagnosticScreenshotUrl = async (storagePath: string): Promise<string> => {
  const { data, error } = await supabase.storage
    .from("diagnostic-screenshots")
    .createSignedUrl(storagePath, 60 * 10); // 10 min — admin preview only
  if (error) throw error;
  return data.signedUrl;
};

export const deleteDiagnosticScreenshot = async (screenshot: DiagnosticScreenshot): Promise<void> => {
  const { error: dbError } = await supabase
    .from("diagnostic_screenshots")
    .delete()
    .eq("id", screenshot.id);
  if (dbError) throw dbError;
  await supabase.storage.from("diagnostic-screenshots").remove([screenshot.storage_path]);
};

export const fetchDiagnostics = async (socialConnectionId: string): Promise<Diagnostic[]> => {
  const { data, error } = await supabase
    .from("diagnostics")
    .select("*")
    .eq("social_connection_id", socialConnectionId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as Diagnostic[];
};

export interface TriggerDiagnosticResult {
  ok: boolean;
  diagnostic: Diagnostic;
  error?: string;
}

/** Invokes the phase2-diagnostic edge function. Refuses client-side too
 * (screenshotIds.length === 0) so the UI never even attempts a request the
 * function would reject — same rule enforced in two places on purpose. */
export const triggerPhase2Diagnostic = async (
  socialConnectionId: string,
  screenshotIds: string[],
  auditSnapshotId?: string,
): Promise<TriggerDiagnosticResult> => {
  if (screenshotIds.length === 0) {
    throw new Error("Au moins une capture d'écran est requise pour générer un diagnostic.");
  }

  const { data, error } = await supabase.functions.invoke("phase2-diagnostic", {
    body: {
      social_connection_id: socialConnectionId,
      screenshot_ids: screenshotIds,
      ...(auditSnapshotId ? { audit_snapshot_id: auditSnapshotId } : {}),
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

  return data as TriggerDiagnosticResult;
};

/** The human validation gate — a real state transition an admin performs
 * explicitly in the UI. Nothing in this codebase auto-approves a
 * diagnostic. Phase 3 (not yet built) must check review_status ===
 * 'approved' before consuming a diagnostics row. */
export const reviewDiagnostic = async (
  diagnosticId: string,
  decision: "approved" | "rejected",
  notes?: string,
): Promise<void> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("diagnostics")
    .update({
      review_status: decision,
      reviewed_by: user?.id ?? null,
      reviewed_at: new Date().toISOString(),
      review_notes: notes?.trim() || null,
    })
    .eq("id", diagnosticId);
  if (error) throw error;
};
