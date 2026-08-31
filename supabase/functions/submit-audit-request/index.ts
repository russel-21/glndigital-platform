// Agent — Public audit-request intake (submit-audit-request)
//
// SCOPE: the only entry point for creating public.audit_requests rows from
// the public, unauthenticated "Audit gratuit" form
// (src/pages/AuditPage.tsx). Verifies a Cloudflare Turnstile token
// server-side, then inserts the row. Nothing else — no scoring, no
// interpretation of the submitted data.
//
// Why service_role, unlike every other edge function in this project (which
// forward the caller's own JWT and let RLS/public.is_admin() decide): there
// is no JWT here — this is a public form, the visitor is never
// authenticated. RLS can't gate an anonymous insert by identity, so this
// function itself becomes the trust boundary: verify Turnstile, THEN — and
// only then — perform a privileged insert. The RLS policy that used to
// allow inserting here directly ("Anyone can submit audit requests") was
// dropped in 20260831140000_close_direct_audit_request_insert.sql
// specifically so this function is the only way in — otherwise a bot could
// just call the Supabase REST API directly and skip Turnstile entirely.
//
// STATUS (2026-08-31): TURNSTILE_SECRET_KEY is not configured yet. Same
// convention as Zernio/Anthropic/RunPod elsewhere in this project —
// verification is skipped (never faked as "passed") when the secret isn't
// set, so the form keeps working exactly as it does today until Russel
// creates a Cloudflare account and adds the key. Once set, verification
// becomes mandatory: a missing/invalid token is rejected with a clear
// error, not silently ignored.

import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

interface RequestBody {
  request?: Record<string, unknown>;
  turnstileToken?: string;
}

interface TurnstileVerifyResponse {
  success?: boolean;
  "error-codes"?: string[];
}

async function verifyTurnstile(
  token: string | undefined,
  secretKey: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!token) {
    return { ok: false, error: "Vérification anti-spam manquante (token Turnstile absent)." };
  }

  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ secret: secretKey, response: token }),
  });

  const body = (await res.json().catch(() => null)) as TurnstileVerifyResponse | null;
  if (!body?.success) {
    const detail = body?.["error-codes"]?.join(", ") || "réponse invalide de Cloudflare";
    return { ok: false, error: `Vérification anti-spam échouée : ${detail}` };
  }

  return { ok: true };
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

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(400, { error: "Corps de requête JSON invalide." });
  }

  const request = body.request;
  if (!request || typeof request !== "object") {
    return jsonResponse(400, { error: "Le champ 'request' (AuditRequest) est requis." });
  }

  const id = typeof request.id === "string" ? request.id : null;
  const email = typeof request.email === "string" ? request.email : null;
  const phone = typeof request.phone === "string" ? request.phone : null;
  const clientName = typeof request.clientName === "string" ? request.clientName : null;
  if (!id || !email || !phone || !clientName) {
    return jsonResponse(400, { error: "id, email, phone et clientName sont requis dans 'request'." });
  }

  const turnstileSecret = Deno.env.get("TURNSTILE_SECRET_KEY");
  if (turnstileSecret) {
    const verification = await verifyTurnstile(body.turnstileToken, turnstileSecret);
    if (!verification.ok) {
      return jsonResponse(400, { error: verification.error });
    }
  }
  // else: TURNSTILE_SECRET_KEY not configured — see file header. This is
  // the documented "not yet set up" state, not a silent bypass.

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(500, { error: "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY non configurés côté fonction." });
  }
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { error } = await supabase.from("audit_requests").upsert({
    id,
    email,
    phone,
    client_name: clientName,
    company_name: typeof request.companyName === "string" ? request.companyName : null,
    status: typeof request.status === "string" ? request.status : "pending",
    payload: request,
    created_at: typeof request.createdAt === "string" ? request.createdAt : new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return jsonResponse(500, { error: `Enregistrement de la demande d'audit impossible : ${error.message}` });
  }

  return jsonResponse(200, { ok: true });
});
