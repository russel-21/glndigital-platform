// Agent — Client self-service Zernio connect (zernio-connect)
//
// SCOPE: the only entry point for a "client" role user to start connecting
// their own social account through GLN's app. Returns a Zernio OAuth
// authUrl to redirect the client's own browser to — see
// supabase/functions/_shared/zernioClient.ts's file header for the full
// contract (verified against Zernio's OpenAPI spec, standard/non-headless
// mode, no server-side code-exchange step needed).
//
// Auth model differs from every other edge function in this project: those
// are all admin-only (public.is_admin()). This one is for a real "client"
// role user acting on their OWN account, so it only requires a valid
// session — no admin check, no service_role. Every DB read/write here
// still runs under the caller's own JWT, so RLS (20260831160000, client
// scoped to their own profiles/social_connections rows) is what actually
// gates this, same structural pattern as everywhere else — just a
// different role being allowed through.

import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders, ALLOWED_ORIGINS } from "../_shared/cors.ts";
import { createZernioProfile, getZernioConnectUrl, type Platform } from "../_shared/zernioClient.ts";

const SUPPORTED_PLATFORMS: Platform[] = ["meta_facebook", "meta_instagram", "tiktok", "youtube"];

interface RequestBody {
  platform?: string;
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

  const { data: userResult, error: userError } = await supabase.auth.getUser();
  if (userError || !userResult?.user) {
    return jsonResponse(401, { error: "Session invalide ou expirée." });
  }
  const userId = userResult.user.id;

  const apiKey = Deno.env.get("ZERNIO_API_KEY");
  if (!apiKey) {
    return jsonResponse(500, {
      error:
        "ZERNIO_API_KEY non configurée côté serveur — la connexion de compte n'est pas encore " +
        "disponible. Contacte l'administrateur.",
    });
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(400, { error: "Corps de requête JSON invalide." });
  }

  const platform = body.platform as Platform | undefined;
  if (!platform || !SUPPORTED_PLATFORMS.includes(platform)) {
    return jsonResponse(400, {
      error: `platform doit être l'un de : ${SUPPORTED_PLATFORMS.join(", ")}.`,
    });
  }

  try {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, zernio_profile_id")
      .eq("id", userId)
      .single();
    if (profileError || !profile) {
      return jsonResponse(500, { error: `Lecture du profil impossible : ${profileError?.message ?? "introuvable"}` });
    }

    let zernioProfileId = profile.zernio_profile_id as string | null;
    if (!zernioProfileId) {
      // First connect attempt for this client — create their Zernio
      // "Profile" once, then remember it. full_name falls back to the
      // user id so this never fails on a client who hasn't filled it in.
      const profileName = (profile.full_name as string | null)?.trim() || `GLN Client ${userId}`;
      zernioProfileId = await createZernioProfile(apiKey, profileName);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ zernio_profile_id: zernioProfileId })
        .eq("id", userId);
      if (updateError) {
        return jsonResponse(500, { error: `Échec de l'enregistrement du profil Zernio : ${updateError.message}` });
      }
    }

    // redirect_url must stay a trusted GLN origin — never client-supplied,
    // to avoid an open-redirect. Echo the caller's own Origin when it's in
    // the same allowlist CORS uses; otherwise fall back to the prod site.
    const origin = req.headers.get("Origin");
    const trustedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
    const redirectUrl = `${trustedOrigin}/client-dashboard`;

    const authUrl = await getZernioConnectUrl(apiKey, platform, zernioProfileId, redirectUrl);

    return jsonResponse(200, { authUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return jsonResponse(502, { error: message });
  }
});
