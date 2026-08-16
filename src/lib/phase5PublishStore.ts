// Phase 5 (Publication) data layer — see CLAUDE.md, "Feature en cours de
// cadrage : automatisation reseaux sociaux par agents IA", sections 3 et 4.
//
// SCOPE (strict): typed read access to scheduled_publications +
// publication_log, and a wrapper to invoke the phase5-publish edge
// function in its two modes (schedule a new one / execute an existing
// pending one). No human validation gate here — Phase 5 doesn't introduce
// one (CLAUDE.md table: "Validation humaine requise : Non"), it only
// checks the upstream Phase 4a approval already happened.

import { supabase } from "@/integrations/supabase/client";

export type PublicationStatus = "scheduled" | "published" | "failed" | "cancelled";

export interface ContentSnapshot {
  caption: string;
  hook: string;
  script: string;
  calendar_working_title: string;
  calendar_platform: string;
}

export interface ScheduledPublication {
  id: string;
  content_draft_id: string;
  social_connection_id: string;
  content_snapshot: ContentSnapshot;
  scheduled_at: string;
  status: PublicationStatus;
  is_mock: boolean;
  platform_post_id: string | null;
  error: string | null;
  published_at: string | null;
  created_at: string;
}

export interface PublicationLogEntry {
  id: string;
  scheduled_publication_id: string;
  event: "scheduled" | "publish_attempted" | "published" | "failed" | "cancelled";
  detail: string | null;
  occurred_at: string;
}

export const fetchScheduledPublications = async (socialConnectionId: string): Promise<ScheduledPublication[]> => {
  const { data, error } = await supabase
    .from("scheduled_publications")
    .select("*")
    .eq("social_connection_id", socialConnectionId)
    .order("scheduled_at", { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as ScheduledPublication[];
};

export interface PublishResult {
  ok: boolean;
  scheduled_publication: ScheduledPublication;
  executed: boolean;
  error?: string;
}

const invokePhase5 = async (body: Record<string, unknown>): Promise<PublishResult> => {
  const { data, error } = await supabase.functions.invoke("phase5-publish", { body });
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
  return data as PublishResult;
};

/** Schedules an approved content_drafts row for publication. If
 * scheduledAt is now-or-past, the edge function also executes the publish
 * immediately (see phase5-publish's two-mode design). */
export const schedulePublication = async (
  contentDraftId: string,
  scheduledAt: string,
): Promise<PublishResult> => invokePhase5({ content_draft_id: contentDraftId, scheduled_at: scheduledAt });

/** Manually executes an existing 'scheduled' row now — stands in for a
 * real cron trigger, which isn't built yet (see CLAUDE.md). */
export const executeScheduledPublication = async (
  scheduledPublicationId: string,
): Promise<PublishResult> => invokePhase5({ scheduled_publication_id: scheduledPublicationId });
