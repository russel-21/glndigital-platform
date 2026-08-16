// Phase 6 (Engagement communautaire) data layer — see CLAUDE.md, "Feature
// en cours de cadrage : automatisation reseaux sociaux par agents IA",
// sections 3 et 4.
//
// SCOPE (strict): typed read access to engagement_items, a wrapper to
// invoke the phase6-engagement edge function, and marking an item
// "handled" once a human has replied directly on the real platform.
// `human_notes` is for the admin's own reference only — this module never
// sends anything anywhere; there is no "send reply" function here by
// design (see CLAUDE.md: Phase 6 is detection + notification only).

import { supabase } from "@/integrations/supabase/client";

export interface EngagementItem {
  id: string;
  social_connection_id: string;
  platform_comment_id: string;
  kind: "comment" | "dm";
  author_handle: string | null;
  content: string;
  posted_at: string | null;
  needs_response: boolean | null;
  classification_rationale: string | null;
  is_mock: boolean;
  error: string | null;
  handled: boolean;
  handled_by: string | null;
  handled_at: string | null;
  human_notes: string | null;
  created_at: string;
}

export const fetchEngagementItems = async (socialConnectionId: string): Promise<EngagementItem[]> => {
  const { data, error } = await supabase
    .from("engagement_items")
    .select("*")
    .eq("social_connection_id", socialConnectionId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as EngagementItem[];
};

export interface TriggerCheckResult {
  ok: boolean;
  new_items_count: number;
  needs_response_count: number;
  items: EngagementItem[];
  error?: string;
}

export const triggerPhase6Check = async (socialConnectionId: string): Promise<TriggerCheckResult> => {
  const { data, error } = await supabase.functions.invoke("phase6-engagement", {
    body: { social_connection_id: socialConnectionId },
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
  return data as TriggerCheckResult;
};

/** Marks an item as handled — the human has already written and sent
 * their own reply directly on the real platform, outside this tool.
 * `notes` is optional free text for the admin's own record only. */
export const markEngagementItemHandled = async (id: string, notes?: string): Promise<void> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("engagement_items")
    .update({
      handled: true,
      handled_by: user?.id ?? null,
      handled_at: new Date().toISOString(),
      human_notes: notes?.trim() || null,
    })
    .eq("id", id);
  if (error) throw error;
};
