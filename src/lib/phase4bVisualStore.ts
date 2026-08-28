// Phase 4b (Production visuelle/vidéo) data layer — see CLAUDE.md,
// "Feature en cours de cadrage : automatisation reseaux sociaux par agents
// ia", sections 3 et 4.
//
// SCOPE (strict): typed read/write access to phase4b_visual_jobs (see
// supabase/migrations/20260828120000_create_phase4b_visual_tables.sql),
// media upload to the private "phase4b-media" Storage bucket, wrappers to
// invoke the phase4b-process edge function (create + poll-status modes),
// and the human validation gate (approve/reject) — a real state
// transition, matching Phase 2/3/4a. Never generates media from nothing;
// every job always starts from a file uploaded here first.

import { supabase } from "@/integrations/supabase/client";

export type Phase4bOperation = "image_enhance" | "video_upscale" | "video_highlights" | "visual_from_media";
export type Phase4bJobStatus = "pending" | "processing" | "completed" | "failed";
export type ReviewStatus = "pending_review" | "approved" | "rejected";

export const PHASE4B_OPERATION_LABELS: Record<Phase4bOperation, string> = {
  image_enhance: "Amélioration qualité image",
  video_upscale: "Amélioration qualité vidéo",
  video_highlights: "Meilleurs moments (vidéo)",
  visual_from_media: "Visuel à partir du média",
};

export const PHASE4B_STATUS_LABELS: Record<Phase4bJobStatus, string> = {
  pending: "En attente",
  processing: "En traitement",
  completed: "Terminé",
  failed: "Échoué",
};

export interface Phase4bVisualJob {
  id: string;
  social_connection_id: string;
  operation_type: Phase4bOperation;
  instructions: string | null;
  input_storage_path: string;
  output_storage_path: string | null;
  status: Phase4bJobStatus;
  runpod_job_id: string | null;
  runpod_status: string | null;
  is_mock: boolean;
  error: string | null;
  review_status: ReviewStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  requested_by: string | null;
  created_at: string;
  completed_at: string | null;
}

const BUCKET = "phase4b-media";

/** Uploads the submitted media file to Storage only — does not create a
 * job row or trigger any processing by itself (see triggerPhase4bJob). */
export const uploadPhase4bMedia = async (socialConnectionId: string, file: File): Promise<string> => {
  const ext = file.name.split(".").pop() || "bin";
  const storagePath = `input/${socialConnectionId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, { contentType: file.type || undefined });
  if (error) throw error;

  return storagePath;
};

export interface TriggerJobResult {
  ok: boolean;
  job: Phase4bVisualJob;
  error?: string;
}

const unwrapFunctionError = async (error: unknown, fallbackMessage: string): Promise<never> => {
  const context = (error as { context?: Response }).context;
  let detail: string | undefined;
  if (context && typeof context.json === "function") {
    try {
      detail = (await context.json())?.error;
    } catch {
      // no JSON body to read — fall back to the generic message below
    }
  }
  throw new Error(detail || fallbackMessage);
};

/** Creates a phase4b_visual_jobs row for an already-uploaded file (see
 * uploadPhase4bMedia) and submits it to RunPod. Returns the job in
 * 'processing' status (or 'failed' if submission itself failed) — never
 * waits for the job to actually finish; poll with checkPhase4bJobStatus. */
export const triggerPhase4bJob = async (
  socialConnectionId: string,
  operationType: Phase4bOperation,
  inputStoragePath: string,
  instructions?: string,
): Promise<TriggerJobResult> => {
  const { data, error } = await supabase.functions.invoke("phase4b-process", {
    body: {
      social_connection_id: socialConnectionId,
      operation_type: operationType,
      input_storage_path: inputStoragePath,
      ...(instructions?.trim() ? { instructions: instructions.trim() } : {}),
    },
  });
  if (error) {
    return unwrapFunctionError(error, error.message);
  }
  return data as TriggerJobResult;
};

/** Polls RunPod once for one job's current status via the edge function
 * (RUNPOD_API_KEY never reaches the browser) and returns the possibly-
 * updated row. Call this repeatedly (e.g. react-query refetchInterval)
 * while a job's status is 'processing' — no webhook/cron involved. */
export const checkPhase4bJobStatus = async (jobId: string): Promise<TriggerJobResult> => {
  const { data, error } = await supabase.functions.invoke("phase4b-process", {
    body: { job_id: jobId },
  });
  if (error) {
    return unwrapFunctionError(error, error.message);
  }
  return data as TriggerJobResult;
};

export const fetchPhase4bJobs = async (socialConnectionId: string): Promise<Phase4bVisualJob[]> => {
  const { data, error } = await supabase
    .from("phase4b_visual_jobs")
    .select("*")
    .eq("social_connection_id", socialConnectionId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as Phase4bVisualJob[];
};

/** Signed URL for previewing/downloading either the submitted input or the
 * processed output — 10 min expiry, admin-only per the bucket's RLS. */
export const getPhase4bMediaUrl = async (storagePath: string): Promise<string> => {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, 60 * 10);
  if (error) throw error;
  return data.signedUrl;
};

/** The human validation gate — CLAUDE.md's Phase 4b row requires quality
 * validation before anything produced here is treated as usable. Nothing
 * in this codebase auto-approves a phase4b_visual_jobs row. */
export const reviewPhase4bJob = async (
  jobId: string,
  decision: "approved" | "rejected",
  notes?: string,
): Promise<void> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("phase4b_visual_jobs")
    .update({
      review_status: decision,
      reviewed_by: user?.id ?? null,
      reviewed_at: new Date().toISOString(),
      review_notes: notes?.trim() || null,
    })
    .eq("id", jobId);
  if (error) throw error;
};
