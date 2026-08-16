// Competitive brief generator data layer — separate feature, NOT one of the
// 7 phases. See DECISIONS-VEILLE-CONCURRENTIELLE.md for full context and
// what was explicitly abandoned (never revisit those without Russel).
//
// SCOPE (strict): typed read access to competitive_briefs, and a wrapper to
// invoke the competitive-brief edge function. Deliberately named/kept
// separate from src/lib/competitiveIntel.ts, which is an unrelated existing
// feature (GLN's own SaaS/agency-tool competitors, not client ad
// competitors).
//
import { supabase } from "@/integrations/supabase/client";

export interface BriefSource {
  claim: string;
  source_url: string;
  source_title: string;
  retrieved_at: string;
}

export interface CompetitiveBrief {
  id: string;
  competitor_name: string;
  admin_notes: string | null;
  brief_content: string | null;
  sources: BriefSource[] | null;
  is_mock: boolean;
  error: string | null;
  created_at: string;
}

export const fetchCompetitiveBriefs = async (): Promise<CompetitiveBrief[]> => {
  const { data, error } = await supabase
    .from("competitive_briefs")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as CompetitiveBrief[];
};

export interface GenerateBriefResult {
  ok: boolean;
  brief: CompetitiveBrief;
  error?: string;
}

export const generateCompetitiveBrief = async (
  competitorName: string,
  adminNotes?: string,
): Promise<GenerateBriefResult> => {
  const { data, error } = await supabase.functions.invoke("competitive-brief", {
    body: { competitor_name: competitorName, admin_notes: adminNotes || undefined },
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
  return data as GenerateBriefResult;
};
