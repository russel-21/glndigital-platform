// Agent Phase 5 — Publication (see CLAUDE.md, "Feature en cours de cadrage
// : automatisation reseaux sociaux par agents IA", sections 3 et 4).
//
// SCOPE (strict — do not extend without explicit validation from Russel):
//   - Four modes in this one function (still one agent, one
//     responsibility: "Programmation et diffusion multi-plateforme"):
//     (1) `content_draft_id` + `scheduled_at` → create a new
//         scheduled_publications row from an APPROVED content_drafts row,
//         freezing its exact content. If `scheduled_at` is now-or-past,
//         also executes the publish immediately.
//     (2) `scheduled_publication_id` (+ no action, or action: "execute")
//         → execute an existing 'scheduled' row's publish now (manual
//         trigger standing in for a real cron scheduler, which is NOT
//         built yet — see CLAUDE.md État d'avancement for why).
//     (3) `scheduled_publication_id` + `action: "reschedule"` +
//         `scheduled_at` → change a pending row's scheduled time. Only
//         `scheduled_at` changes — the frozen content_snapshot never does
//         (see rule below). Executes immediately if the new time is due.
//     (4) `scheduled_publication_id` + `action: "cancel"` → mark a
//         pending row 'cancelled'. Only ever available while still
//         'scheduled' — a published/failed row can't be un-published from
//         here.
//   - No human validation gate here (per CLAUDE.md's Phase 5 table): the
//     content was already approved upstream in Phase 4a. This function
//     only checks that upstream approval happened — it never introduces a
//     new review step.
//   - The exact content that gets published is always the frozen
//     `content_snapshot` captured at scheduling time — never a live
//     re-read of content_drafts, and reschedule/cancel never touch it
//     either — per CLAUDE.md: "aucune modification silencieuse entre
//     validation et publication".
//   - Every state transition is appended to `publication_log`
//     (append-only) — CLAUDE.md: "Log horodaté de traçabilité".
//   - Admin-only: internal GLN-staff tool, not client-facing.
//
// Auth model: the caller's own JWT is used for every DB operation (no
// service-role key involved), so Postgres RLS enforces the admin-only rule
// on its own — this function calls public.is_admin() up front only to fail
// fast with a clear message.

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { publishPost, type Platform } from "../_shared/zernioClient.ts";
import { checkRateLimit } from "../_shared/rateLimit.ts";

type LogEventType = "scheduled" | "publish_attempted" | "published" | "failed" | "cancelled";

interface RequestBody {
  content_draft_id?: string;
  scheduled_at?: string;
  scheduled_publication_id?: string;
  action?: "execute" | "cancel" | "reschedule";
}

interface ContentSnapshot {
  caption: string;
  hook: string;
  script: string;
  calendar_working_title: string;
  calendar_platform: string;
}

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

  const logEvent = async (scheduledPublicationId: string, event: LogEventType, detail?: string) => {
    await supabase.from("publication_log").insert({
      scheduled_publication_id: scheduledPublicationId,
      event,
      detail: detail ?? null,
    });
  };

  // ── Modes 2-4: act on an already-scheduled row ──
  if (body.scheduled_publication_id && !body.content_draft_id) {
    const { data: existing, error: fetchError } = await supabase
      .from("scheduled_publications")
      .select("id, social_connection_id, content_snapshot, status")
      .eq("id", body.scheduled_publication_id)
      .maybeSingle();
    if (fetchError) {
      return jsonResponse(500, { error: `Lecture de scheduled_publications impossible : ${fetchError.message}` });
    }
    if (!existing) {
      return jsonResponse(404, { error: "Publication planifiée introuvable." });
    }

    // ── Mode 4: cancel ──
    if (body.action === "cancel") {
      if (existing.status !== "scheduled") {
        return jsonResponse(400, { error: `Impossible d'annuler : statut actuel "${existing.status}", pas "scheduled".` });
      }
      const { data: updated, error: updateError } = await supabase
        .from("scheduled_publications")
        .update({ status: "cancelled" })
        .eq("id", existing.id)
        .select()
        .single();
      if (updateError) {
        return jsonResponse(500, { error: `Annulation impossible : ${updateError.message}` });
      }
      await logEvent(existing.id, "cancelled");
      return jsonResponse(200, { ok: true, scheduled_publication: updated, executed: false });
    }

    // ── Mode 3: reschedule ──
    if (body.action === "reschedule") {
      if (existing.status !== "scheduled") {
        return jsonResponse(400, { error: `Impossible de reprogrammer : statut actuel "${existing.status}", pas "scheduled".` });
      }
      if (!body.scheduled_at) {
        return jsonResponse(400, { error: "scheduled_at est requis pour reprogrammer." });
      }
      const { data: rescheduled, error: rescheduleError } = await supabase
        .from("scheduled_publications")
        .update({ scheduled_at: body.scheduled_at })
        .eq("id", existing.id)
        .select()
        .single();
      if (rescheduleError) {
        return jsonResponse(500, { error: `Reprogrammation impossible : ${rescheduleError.message}` });
      }
      await logEvent(existing.id, "scheduled", `Reprogrammé pour ${body.scheduled_at}`);

      const newTimeMs = new Date(body.scheduled_at).getTime();
      if (!Number.isNaN(newTimeMs) && newTimeMs <= Date.now()) {
        return await executePublish(
          supabase,
          existing.id,
          existing.social_connection_id,
          existing.content_snapshot as ContentSnapshot,
          logEvent,
          jsonResponse,
        );
      }
      return jsonResponse(200, { ok: true, scheduled_publication: rescheduled, executed: false });
    }

    // ── Mode 2: execute now (default action) ──
    if (existing.status !== "scheduled") {
      return jsonResponse(400, { error: `Cette publication n'est plus en attente (statut : ${existing.status}).` });
    }
    return await executePublish(
      supabase,
      existing.id,
      existing.social_connection_id,
      existing.content_snapshot as ContentSnapshot,
      logEvent,
      jsonResponse,
    );
  }

  // ── Mode 1: create a new scheduled_publications row from an approved draft ──
  const contentDraftId = body.content_draft_id;
  if (!contentDraftId || !body.scheduled_at) {
    return jsonResponse(400, { error: "content_draft_id et scheduled_at sont requis (ou scheduled_publication_id + action)." });
  }

  const { data: draft, error: draftError } = await supabase
    .from("content_drafts")
    .select("id, social_connection_id, review_status, caption, hook, script, calendar_working_title, calendar_platform")
    .eq("id", contentDraftId)
    .maybeSingle();
  if (draftError) {
    return jsonResponse(500, { error: `Lecture de content_drafts impossible : ${draftError.message}` });
  }
  if (!draft) {
    return jsonResponse(404, { error: `Aucun content_drafts avec l'id ${contentDraftId}.` });
  }
  if (draft.review_status !== "approved") {
    return jsonResponse(400, {
      error: `Ce brouillon n'est pas approuvé (statut actuel : ${draft.review_status}). ` +
        "La Phase 5 exige un contenu validé par un humain en Phase 4a.",
    });
  }

  const contentSnapshot: ContentSnapshot = {
    caption: draft.caption ?? "",
    hook: draft.hook ?? "",
    script: draft.script ?? "",
    calendar_working_title: draft.calendar_working_title,
    calendar_platform: draft.calendar_platform,
  };

  const { data: scheduled, error: insertError } = await supabase
    .from("scheduled_publications")
    .insert({
      content_draft_id: draft.id,
      social_connection_id: draft.social_connection_id,
      content_snapshot: contentSnapshot,
      scheduled_at: body.scheduled_at,
      status: "scheduled",
    })
    .select()
    .single();
  if (insertError) {
    return jsonResponse(500, { error: `Planification non enregistrée : ${insertError.message}` });
  }

  await logEvent(scheduled.id, "scheduled", `Planifié pour ${body.scheduled_at}`);

  const scheduledAtMs = new Date(body.scheduled_at).getTime();
  if (Number.isNaN(scheduledAtMs) || scheduledAtMs > Date.now()) {
    // Future date: left as 'scheduled'. NOTE: no cron job exists yet to
    // fire this automatically at the right time — see CLAUDE.md. An admin
    // must call this function again with scheduled_publication_id once
    // that time comes, or a future pass adds real scheduled execution.
    return jsonResponse(200, { ok: true, scheduled_publication: scheduled, executed: false });
  }

  return await executePublish(supabase, scheduled.id, draft.social_connection_id, contentSnapshot, logEvent, jsonResponse);
});

async function executePublish(
  supabase: SupabaseClient,
  scheduledPublicationId: string,
  socialConnectionId: string,
  content: ContentSnapshot,
  logEvent: (id: string, event: LogEventType, detail?: string) => Promise<void>,
  jsonResponse: (status: number, body: unknown) => Response,
): Promise<Response> {
  const rateLimitError = await checkRateLimit(supabase, `phase5-publish:${socialConnectionId}`);
  if (rateLimitError) {
    return jsonResponse(429, { error: rateLimitError });
  }

  const { data: connection, error: connectionError } = await supabase
    .from("social_connections")
    .select("platform, account_handle, zernio_account_id")
    .eq("id", socialConnectionId)
    .maybeSingle();
  if (connectionError || !connection) {
    return jsonResponse(500, { error: `Lecture de social_connections impossible : ${connectionError?.message ?? "introuvable"}` });
  }

  await logEvent(scheduledPublicationId, "publish_attempted");

  const result = await publishPost(
    connection.platform as Platform,
    connection.account_handle,
    connection.zernio_account_id,
    { caption: content.caption, hook: content.hook, script: content.script },
  );

  const { data: updated, error: updateError } = await supabase
    .from("scheduled_publications")
    .update({
      status: result.ok ? "published" : "failed",
      is_mock: result.isMock,
      platform_post_id: result.platformPostId ?? null,
      error: result.ok ? null : result.error,
      published_at: result.ok ? result.publishedAt : null,
    })
    .eq("id", scheduledPublicationId)
    .select()
    .single();
  if (updateError) {
    return jsonResponse(500, { error: `Mise à jour de scheduled_publications impossible : ${updateError.message}` });
  }

  await logEvent(scheduledPublicationId, result.ok ? "published" : "failed", result.ok ? undefined : result.error);

  return jsonResponse(result.ok ? 200 : 502, {
    ok: result.ok,
    scheduled_publication: updated,
    executed: true,
    ...(result.ok ? {} : { error: result.error }),
  });
}
