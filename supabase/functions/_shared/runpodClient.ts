// RunPod adapter — Phase 4b (Production visuelle/vidéo) compute backend.
//
// SCOPE (strict — do not extend without explicit validation from Russel):
// submit one already-uploaded media file to a RunPod Serverless GPU worker
// for exactly one of four operations (image_enhance / video_upscale /
// video_highlights / visual_from_media — see the phase4b_visual_jobs table
// and CLAUDE.md's Phase 4b row), and report back job status. Never
// generates media from nothing — the worker always starts from a submitted
// file, never a prompt alone.
//
// Contract verified 2026-08-28 directly against RunPod's official docs
// (docs.runpod.io/serverless/endpoints/send-requests and
// .../operation-reference) — base URL, auth header, request/response shape
// all confirmed from there, not guessed. The RunPod *worker* itself (the
// Docker image containing Real-ESRGAN/Video2X/FFmpeg + the Python handler
// that this client's jobs run against) is a separate deployable artifact —
// see runpod-worker/ at the repo root — not part of this Supabase project.
//
// Async by design: video jobs can take minutes, far past what a Supabase
// Edge Function may block on. submitJob() only ever calls RunPod's async
// /run endpoint (never /runsync) and returns immediately with a job id;
// checkJobStatus() is polled separately (from the admin UI, the same
// react-query-refetch pattern already used elsewhere in this project — no
// new cron/scheduler introduced here, matching the Phase 5 precedent of
// not inventing scheduling infrastructure that hasn't been decided on).
//
// Worker teardown: RunPod Serverless workers are spun up per-request and
// torn down by RunPod's own infrastructure the moment the handler function
// returns (success or failure) — there is no persistent instance this
// codebase must remember to stop. The one thing this client DOES control
// is guarding against a hung/crashed worker still being billed: every
// submitJob() call sets policy.executionTimeout so RunPod force-kills (and
// stops billing) a worker that runs past a sane ceiling even if it never
// returns cleanly.
//
// Mock mode: identical pattern to zernioClient.ts. Without RUNPOD_API_KEY,
// submitJob()/checkJobStatus() return clearly-marked mock results (no real
// GPU job, no output file produced) so the rest of the pipeline (DB,
// Storage, RLS, admin UI, review gate) can be built and tested end-to-end
// before Russel's RunPod account/key exist. With the key set, real calls
// are made — no separate "not implemented" stub is needed here (unlike
// Zernio at the time), because RunPod's contract above is fully verified.

const RUNPOD_BASE_URL = "https://api.runpod.ai/v2";

export type Phase4bOperation =
  | "image_enhance"
  | "video_upscale"
  | "video_highlights"
  | "visual_from_media";

/** Per-operation ceiling passed as policy.executionTimeout (milliseconds)
 * on every submitJob() call — the one explicit "kill it even if it hung"
 * mechanism this client provides, per CLAUDE.md's requirement that a
 * failed/stuck job must not keep a worker (and its billing) running
 * forever. Video jobs get more headroom than images; see the Phase 1
 * architecture note in CLAUDE.md for the reasoning behind these numbers. */
const EXECUTION_TIMEOUT_MS: Record<Phase4bOperation, number> = {
  image_enhance: 2 * 60 * 1000, // 2 min
  video_upscale: 15 * 60 * 1000, // 15 min
  video_highlights: 15 * 60 * 1000, // 15 min
  visual_from_media: 5 * 60 * 1000, // 5 min
};

export class RunpodApiError extends Error {}

export interface SubmitJobResult {
  ok: boolean;
  isMock: boolean;
  /** RunPod's own job id (real or "mock_job_..."). Stored on the
   * phase4b_visual_jobs row and used for every subsequent status check. */
  runpodJobId?: string;
  rawResponse?: unknown;
  error?: string;
}

/** Submits one job to the RunPod Serverless endpoint. `inputUrl` must be a
 * URL RunPod's worker can download the source media from (a Supabase
 * Storage signed URL, short-lived, admin-only per the phase4b-media bucket
 * policy). The worker returns the processed result as base64 in its own
 * job output (see JobStatusResult.outputBase64) — deliberately NOT an
 * upload directly from the worker to Supabase Storage: that would need
 * either Supabase credentials handed to a third-party service (a bigger
 * trust extension than anything else in this project) or Supabase's
 * signed-upload-URL raw HTTP contract, which isn't documented precisely
 * enough to implement without guessing it. Routing the file back through
 * this edge function's own already-authenticated Supabase client avoids
 * both problems, at the cost of base64 overhead for large video files —
 * a known, accepted limitation (see phase4b-process/index.ts). */
export async function submitJob(
  operation: Phase4bOperation,
  inputUrl: string,
  instructions: string | null,
): Promise<SubmitJobResult> {
  const apiKey = Deno.env.get("RUNPOD_API_KEY");
  const endpointId = Deno.env.get("RUNPOD_ENDPOINT_ID");

  if (!apiKey || !endpointId) {
    return {
      ok: true,
      isMock: true,
      runpodJobId: `mock_job_${crypto.randomUUID()}`,
      rawResponse: {
        mock: true,
        note:
          "RUNPOD_API_KEY / RUNPOD_ENDPOINT_ID non configurés — aucun traitement réel n'a eu lieu. " +
          "Aucun fichier de sortie n'est produit en mode mock.",
        operation,
      },
    };
  }

  try {
    const res = await fetch(`${RUNPOD_BASE_URL}/${endpointId}/run`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: {
          operation,
          input_url: inputUrl,
          instructions: instructions ?? "",
        },
        policy: {
          executionTimeout: EXECUTION_TIMEOUT_MS[operation],
        },
      }),
    });

    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const detail =
        (body && typeof body === "object" && "error" in body && String((body as Record<string, unknown>).error)) ||
        `HTTP ${res.status}`;
      throw new RunpodApiError(`RunPod (/run) a répondu une erreur : ${detail}`);
    }

    const jobId = body && typeof body === "object" ? (body as Record<string, unknown>).id : undefined;
    if (typeof jobId !== "string") {
      throw new RunpodApiError("RunPod (/run) n'a renvoyé aucun id de job exploitable.");
    }

    return { ok: true, isMock: false, runpodJobId: jobId, rawResponse: body };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, isMock: false, error: message };
  }
}

export interface JobStatusResult {
  ok: boolean;
  isMock: boolean;
  /** Normalized against RunPod's own status values (IN_QUEUE / IN_PROGRESS
   * / COMPLETED / FAILED / CANCELLED / TIMED_OUT), kept verbatim — the
   * caller maps this to phase4b_visual_jobs.status, not this client. */
  runpodStatus?: string;
  /** True once RunPod itself reports COMPLETED. Does NOT by itself mean
   * outputBase64 is present/valid — the caller must still decode it and
   * check its size before writing it to Storage and treating the job as
   * done (see phase4b-process/index.ts). */
  completed?: boolean;
  failed?: boolean;
  /** Base64-encoded processed file, present only when completed is true
   * and the worker's handler returned one — see submitJob's doc comment
   * for why this travels through RunPod's own response instead of a
   * direct worker-to-Storage upload. */
  outputBase64?: string;
  outputContentType?: string;
  error?: string;
  rawResponse?: unknown;
}

export async function checkJobStatus(runpodJobId: string): Promise<JobStatusResult> {
  const apiKey = Deno.env.get("RUNPOD_API_KEY");
  const endpointId = Deno.env.get("RUNPOD_ENDPOINT_ID");

  if (!apiKey || !endpointId || runpodJobId.startsWith("mock_job_")) {
    // Mock jobs "complete" the instant they're checked — there is never a
    // real queue to wait on. No output file is produced (see submitJob).
    return {
      ok: true,
      isMock: true,
      runpodStatus: "COMPLETED",
      completed: true,
      failed: false,
      rawResponse: { mock: true, note: "Job factice — aucun fichier de sortie réel." },
    };
  }

  try {
    const res = await fetch(`${RUNPOD_BASE_URL}/${endpointId}/status/${runpodJobId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const detail =
        (body && typeof body === "object" && "error" in body && String((body as Record<string, unknown>).error)) ||
        `HTTP ${res.status}`;
      throw new RunpodApiError(`RunPod (/status) a répondu une erreur : ${detail}`);
    }

    const status = body && typeof body === "object" ? (body as Record<string, unknown>).status : undefined;
    if (typeof status !== "string") {
      throw new RunpodApiError("RunPod (/status) n'a renvoyé aucun statut exploitable.");
    }

    // The worker's handler return value (see runpod-worker/handler.py) is
    // expected to shape its result as {output_base64, content_type} on
    // success — read defensively since this is our own contract, not
    // RunPod's, and a worker bug should surface as a clear error, not a
    // silent undefined.
    const output = body && typeof body === "object" ? (body as Record<string, unknown>).output : undefined;
    const outputObj = output && typeof output === "object" ? (output as Record<string, unknown>) : undefined;
    const outputBase64 = typeof outputObj?.output_base64 === "string" ? outputObj.output_base64 : undefined;
    const outputContentType = typeof outputObj?.content_type === "string" ? outputObj.content_type : undefined;

    return {
      ok: true,
      isMock: false,
      runpodStatus: status,
      completed: status === "COMPLETED",
      failed: status === "FAILED" || status === "CANCELLED" || status === "TIMED_OUT",
      outputBase64,
      outputContentType,
      rawResponse: body,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, isMock: false, error: message };
  }
}
