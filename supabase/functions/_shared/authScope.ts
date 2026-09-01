// Shared "admin OR owning client" authorization check.
//
// Most edge functions in this project are strictly admin-only (see each
// file's own is_admin() check). Phase 2/3/4a are the exception, per
// CLAUDE.md's client-role plan: a real "client" user can now trigger these
// three directly on their OWN social_connections row (each behind the
// cost-quote gate — see get-action-quote/index.ts), while everything else
// about the pipeline stays admin-only. This helper is that one shared
// ownership check, used only by those three functions.

import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

export type AuthScopeResult =
  | { ok: true; isAdmin: boolean }
  | { ok: false; status: number; error: string };

export async function checkAdminOrOwningClient(
  supabase: SupabaseClient,
  socialConnectionId: string,
): Promise<AuthScopeResult> {
  const { data: isAdmin, error: adminCheckError } = await supabase.rpc("is_admin");
  if (adminCheckError) {
    return { ok: false, status: 500, error: `Échec de la vérification admin : ${adminCheckError.message}` };
  }
  if (isAdmin) {
    return { ok: true, isAdmin: true };
  }

  const { data: userResult, error: userError } = await supabase.auth.getUser();
  if (userError || !userResult?.user) {
    return { ok: false, status: 401, error: "Session invalide ou expirée." };
  }

  const { data: connection, error: connectionError } = await supabase
    .from("social_connections")
    .select("client_profile_id")
    .eq("id", socialConnectionId)
    .maybeSingle();
  if (connectionError) {
    return { ok: false, status: 500, error: `Lecture de social_connections impossible : ${connectionError.message}` };
  }
  if (!connection || connection.client_profile_id !== userResult.user.id) {
    return {
      ok: false,
      status: 403,
      error: "Réservé aux administrateurs GLN Digital ou au client propriétaire de ce compte.",
    };
  }

  return { ok: true, isAdmin: false };
}
