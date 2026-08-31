// Agent Phase 4b — Production visuelle/vidéo (see CLAUDE.md, "Feature en
// cours de cadrage : automatisation reseaux sociaux par agents IA",
// sections 3 et 4).
//
// SCOPE (strict — do not extend without explicit validation from Russel):
//   - Two modes, selected by which fields are present in the request body:
//     1. Create + submit: { social_connection_id, operation_type,
//        input_storage_path, instructions? } — creates a phase4b_visual_jobs
//        row, generates a short-lived signed URL for the already-uploaded
//        input file (uploaded client-side by the admin, see
//        src/lib/phase4bVisualStore.ts — this function never receives raw
//        file bytes directly), submits the job to RunPod, and returns the
//        row (status: 'processing', or 'failed' if submission itself
//        failed).
//     2. Check status: { job_id } — polls RunPod for one existing job. If
//        RunPod reports COMPLETED, decodes the worker's base64 output,
//        verifies it's non-empty, uploads it to Storage, and marks the row
//        'completed' with output_storage_path set. If RunPod reports a
//        terminal failure state, marks the row 'failed' with the error. If
//        still in progress, returns the row unchanged. Called repeatedly
//        from the admin UI (react-query poll) while status = 'processing'
//        — no cron/webhook involved, matching this project's existing
//        "no scheduler built yet" stance from Phase 5.
//   - Never generates a visual/video from nothing — input_storage_path
//     must reference an admin-submitted file; operation_type is one of the
//     four fixed values in the phase4b_visual_jobs check constraint.
//   - review_status starts at 'pending_review' on every created row and is
//     never advanced by this function — CLAUDE.md's Phase 4b row requires
//     human quality validation; the admin approves/rejects in the UI
//     (src/lib/phase4bVisualStore.ts's reviewPhase4bJob()).
//   - Admin-only: internal GLN-staff tool, not client-facing.
//
// Auth model: the caller's own JWT is used for every DB + Storage
// operation (no service-role key involved), so Postgres RLS enforces the
// admin-only rule on its own — this function calls public.is_admin() up
// front only to fail fast with a clear message. RUNPOD_API_KEY is the only
// secret this function reads that isn't the caller's own credentials.

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { submitJob, checkJobStatus, type Phase4bOperation } from "../_shared/runpodClient.ts";
import { checkRateLimit } from "../_shared/rateLimit.ts";

interface RequestBody {
  social_connection_id?: string;
  operation_type?: Phase4bOperation;
  input_storage_path?: string;
  instructions?: string;
  job_id?: string;
}

const VALID_OPERATIONS: Phase4bOperation[] = [
  "image_enhance",
  "video_upscale",
  "video_highlights",
  "visual_from_media",
];

const MEDIA_BUCKET = "phase4b-media";

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

  const { data: isAdmin, error: adminCheckError } = await supabase.rpc("is_admin");
  if (adminCheckError) {
    return jsonResponse(500, { error: `Échec de la vérification admin : ${adminCheckError.message}` });
  }
  if (!isAdmin) {
    return jsonResponse(403, { error: "Réservé aux administrateurs GLN Digital." });
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(400, { error: "Corps de requête JSON invalide." });
  }

  // ─── Mode: check status of an existing job ──────────────────────
  if (body.job_id) {
    return await handleCheckStatus(supabase, body.job_id, jsonResponse);
  }

  // ─── Mode: create + submit a new job ────────────────────────────
  const socialConnectionId = body.social_connection_id;
  const operationType = body.operation_type;
  const inputStoragePath = body.input_storage_path;

  if (!socialConnectionId) {
    return jsonResponse(400, { error: "social_connection_id est requis." });
  }

  const rateLimitError = await checkRateLimit(supabase, `phase4b-process:${socialConnectionId}`);
  if (rateLimitError) {
    return jsonResponse(429, { error: rateLimitError });
  }

  if (!operationType || !VALID_OPERATIONS.includes(operationType)) {
    return jsonResponse(400, {
      error: `operation_type doit être l'un de : ${VALID_OPERATIONS.join(", ")}.`,
    });
  }
  if (!inputStoragePath) {
    return jsonResponse(400, {
      error: "input_storage_path est requis — soumets d'abord le média via l'admin avant de lancer un traitement.",
    });
  }

  const { data: connection, error: connectionError } = await supabase
    .from("social_connections")
    .select("id")
    .eq("id", socialConnectionId)
    .maybeSingle();
  if (connectionError) {
    return jsonResponse(500, { error: `Lecture de social_connections impossible : ${connectionError.message}` });
  }
  if (!connection) {
    return jsonResponse(404, { error: `Aucun social_connections avec l'id ${socialConnectionId}.` });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: jobRow, error: insertError } = await supabase
    .from("phase4b_visual_jobs")
    .insert({
      social_connection_id: socialConnectionId,
      operation_type: operationType,
      instructions: body.instructions?.trim() || null,
      input_storage_path: inputStoragePath,
      status: "pending",
      requested_by: user?.id ?? null,
    })
    .select()
    .single();
  if (insertError) {
    return jsonResponse(500, { error: `Job Phase 4b non enregistré : ${insertError.message}` });
  }

  // Short-lived signed URL — long enough for RunPod to fetch the file
  // promptly after job submission, not meant to stay valid for the whole
  // (possibly multi-minute) processing duration.
  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from(MEDIA_BUCKET)
    .createSignedUrl(inputStoragePath, 60 * 10); // 10 min
  if (signedUrlError || !signedUrlData) {
    await supabase
      .from("phase4b_visual_jobs")
      .update({ status: "failed", error: `URL signée d'entrée impossible : ${signedUrlError?.message ?? "inconnu"}` })
      .eq("id", jobRow.id);
    return jsonResponse(500, { error: `URL signée d'entrée impossible : ${signedUrlError?.message ?? "inconnu"}` });
  }

  const submitResult = await submitJob(operationType, signedUrlData.signedUrl, body.instructions?.trim() || null);

  if (!submitResult.ok || !submitResult.runpodJobId) {
    const { data: failedRow } = await supabase
      .from("phase4b_visual_jobs")
      .update({ status: "failed", error: submitResult.error ?? "Soumission RunPod échouée sans détail." })
      .eq("id", jobRow.id)
      .select()
      .single();
    return jsonResponse(502, { ok: false, job: failedRow ?? jobRow, error: submitResult.error });
  }

  const { data: processingRow, error: updateError } = await supabase
    .from("phase4b_visual_jobs")
    .update({
      status: "processing",
      runpod_job_id: submitResult.runpodJobId,
      is_mock: submitResult.isMock,
    })
    .eq("id", jobRow.id)
    .select()
    .single();
  if (updateError) {
    return jsonResponse(500, { error: `Job Phase 4b non mis à jour après soumission : ${updateError.message}` });
  }

  return jsonResponse(200, { ok: true, job: processingRow });
});

async function handleCheckStatus(
  supabase: SupabaseClient,
  jobId: string,
  jsonResponse: (status: number, body: unknown) => Response,
): Promise<Response> {
  const { data: job, error: fetchError } = await supabase
    .from("phase4b_visual_jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle();
  if (fetchError) {
    return jsonResponse(500, { error: `Lecture du job Phase 4b impossible : ${fetchError.message}` });
  }
  if (!job) {
    return jsonResponse(404, { error: `Aucun phase4b_visual_jobs avec l'id ${jobId}.` });
  }

  // Already terminal — nothing to poll, return as-is (idempotent).
  if (job.status === "completed" || job.status === "failed") {
    return jsonResponse(200, { ok: true, job });
  }
  if (!job.runpod_job_id) {
    return jsonResponse(200, { ok: true, job });
  }

  const statusResult = await checkJobStatus(job.runpod_job_id);

  if (!statusResult.ok) {
    // Transient check failure (network, RunPod hiccup) — leave the job
    // 'processing' rather than marking it failed on a status-check error;
    // the next poll tries again. Only a RunPod-reported terminal failure
    // (below) marks the job itself as failed.
    return jsonResponse(200, { ok: true, job, warning: statusResult.error });
  }

  if (statusResult.failed) {
    const { data: failedRow, error: updateError } = await supabase
      .from("phase4b_visual_jobs")
      .update({
        status: "failed",
        runpod_status: statusResult.runpodStatus,
        error: `RunPod a signalé l'échec du job (${statusResult.runpodStatus}).`,
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId)
      .select()
      .single();
    if (updateError) {
      return jsonResponse(500, { error: `Job Phase 4b non mis à jour (échec) : ${updateError.message}` });
    }
    return jsonResponse(200, { ok: true, job: failedRow });
  }

  if (!statusResult.completed) {
    // Still IN_QUEUE / IN_PROGRESS.
    const { data: refreshedRow } = await supabase
      .from("phase4b_visual_jobs")
      .update({ runpod_status: statusResult.runpodStatus })
      .eq("id", jobId)
      .select()
      .single();
    return jsonResponse(200, { ok: true, job: refreshedRow ?? job });
  }

  // COMPLETED. Mock jobs never have a real output file — mark completed
  // without one, clearly flagged via is_mock (already set at creation).
  if (job.is_mock) {
    const { data: completedRow, error: updateError } = await supabase
      .from("phase4b_visual_jobs")
      .update({ status: "completed", runpod_status: statusResult.runpodStatus, completed_at: new Date().toISOString() })
      .eq("id", jobId)
      .select()
      .single();
    if (updateError) {
      return jsonResponse(500, { error: `Job Phase 4b non mis à jour (mock) : ${updateError.message}` });
    }
    return jsonResponse(200, { ok: true, job: completedRow });
  }

  if (!statusResult.outputBase64) {
    const { data: failedRow, error: updateError } = await supabase
      .from("phase4b_visual_jobs")
      .update({
        status: "failed",
        runpod_status: statusResult.runpodStatus,
        error: "RunPod a signalé COMPLETED mais n'a renvoyé aucun fichier de sortie exploitable.",
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId)
      .select()
      .single();
    if (updateError) {
      return jsonResponse(500, { error: `Job Phase 4b non mis à jour (sortie manquante) : ${updateError.message}` });
    }
    return jsonResponse(200, { ok: true, job: failedRow });
  }

  let outputBytes: Uint8Array;
  try {
    outputBytes = decodeBase64(statusResult.outputBase64);
  } catch {
    const { data: failedRow } = await supabase
      .from("phase4b_visual_jobs")
      .update({
        status: "failed",
        runpod_status: statusResult.runpodStatus,
        error: "Le fichier de sortie renvoyé par RunPod n'a pas pu être décodé (base64 invalide).",
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId)
      .select()
      .single();
    return jsonResponse(200, { ok: true, job: failedRow });
  }

  // Integrity check before ever proposing this file for download, per the
  // explicit requirement: never hand back a truncated/corrupt file.
  if (outputBytes.length === 0) {
    const { data: failedRow } = await supabase
      .from("phase4b_visual_jobs")
      .update({
        status: "failed",
        runpod_status: statusResult.runpodStatus,
        error: "Le fichier de sortie renvoyé par RunPod est vide (0 octet) — traitement considéré comme échoué.",
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId)
      .select()
      .single();
    return jsonResponse(200, { ok: true, job: failedRow });
  }

  const outputPath = `output/${job.social_connection_id}/${jobId}${guessExtension(statusResult.outputContentType)}`;
  const { error: uploadError } = await supabase.storage
    .from("phase4b-media")
    .upload(outputPath, outputBytes, {
      contentType: statusResult.outputContentType || "application/octet-stream",
      upsert: true,
    });
  if (uploadError) {
    const { data: failedRow } = await supabase
      .from("phase4b_visual_jobs")
      .update({
        status: "failed",
        runpod_status: statusResult.runpodStatus,
        error: `Fichier de sortie reçu mais non enregistré côté Storage : ${uploadError.message}`,
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId)
      .select()
      .single();
    return jsonResponse(200, { ok: true, job: failedRow });
  }

  const { data: completedRow, error: updateError } = await supabase
    .from("phase4b_visual_jobs")
    .update({
      status: "completed",
      runpod_status: statusResult.runpodStatus,
      output_storage_path: outputPath,
      completed_at: new Date().toISOString(),
    })
    .eq("id", jobId)
    .select()
    .single();
  if (updateError) {
    return jsonResponse(500, { error: `Job Phase 4b non mis à jour (terminé) : ${updateError.message}` });
  }

  return jsonResponse(200, { ok: true, job: completedRow });
}

function decodeBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function guessExtension(contentType: string | undefined): string {
  switch (contentType) {
    case "image/png":
      return ".png";
    case "image/jpeg":
      return ".jpg";
    case "image/webp":
      return ".webp";
    case "video/mp4":
      return ".mp4";
    case "video/webm":
      return ".webm";
    default:
      return "";
  }
}
