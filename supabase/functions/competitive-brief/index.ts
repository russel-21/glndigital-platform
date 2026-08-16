// Competitive brief generator — separate feature, NOT one of the 7 phases.
// See DECISIONS-VEILLE-CONCURRENTIELLE.md for full context.
//
// SCOPE (strict — do not extend without explicit validation from Russel):
//   - Input: a competitor name + optional admin-provided research notes.
//   - Output: one new row in `competitive_briefs`.
//   - Admin-only: internal GLN-staff tool, not client-facing.
//   - No review_status gate — this is a document-generation utility, not a
//     step in the 7-phase validation pipeline.
//
// Auth model: the caller's own JWT is used for every DB operation (no
// service-role key involved), so Postgres RLS enforces the admin-only rule
// on its own — this function calls public.is_admin() up front only to fail
// fast with a clear message.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { generateCompetitiveBrief } from "../_shared/competitiveBriefClient.ts";

interface RequestBody {
  competitor_name?: string;
  admin_notes?: string;
}

Deno.serve(async (req: Request) => {
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

  const competitorName = body.competitor_name?.trim();
  if (!competitorName) {
    return jsonResponse(400, { error: "competitor_name est requis." });
  }

  const result = await generateCompetitiveBrief(competitorName, body.admin_notes ?? "");

  const { data: briefRow, error: insertError } = await supabase
    .from("competitive_briefs")
    .insert({
      competitor_name: competitorName,
      admin_notes: body.admin_notes ?? null,
      brief_content: result.payload?.brief_content ?? null,
      sources: result.payload?.sources ?? null,
      is_mock: false,
      error: result.ok ? null : result.error,
    })
    .select()
    .single();
  if (insertError) {
    return jsonResponse(500, { error: `Brief non enregistré : ${insertError.message}` });
  }

  return jsonResponse(result.ok ? 200 : 502, {
    ok: result.ok,
    brief: briefRow,
    ...(result.ok ? {} : { error: result.error }),
  });
});
