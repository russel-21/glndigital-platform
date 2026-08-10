// Zernio adapter — Phase 1 (Audit) data source.
//
// SCOPE: this module's only job is to return factual, per-platform account
// metrics for a single account, tagged with where they came from and when
// they were extracted. It must never estimate, score, or interpret — that is
// the Diagnostic agent's job (Phase 2), not this one. See CLAUDE.md, section
// "Feature en cours de cadrage", rules 3 and 4.
//
// STATUS (2026-08-09): Russel does not have a Zernio account/API key yet, so
// the real HTTP integration below is intentionally NOT implemented — the
// exact endpoints, auth header format and response shape have not been
// verified against Zernio's official docs, and guessing them would violate
// this project's own anti-hallucination rule (never present fabricated data
// as real). Until a Zernio account exists:
//   - fetchAccountMetrics() always returns mock data (isMock: true) when
//     ZERNIO_API_KEY is unset, so the rest of the Phase 1 pipeline (DB,
//     RLS, edge function, "donnée_indisponible" handling) can be built and
//     tested end-to-end.
//   - if ZERNIO_API_KEY IS set, callFakeZernioApi() throws instead of
//     silently mocking, so a half-wired "real" call never gets mistaken for
//     one that actually talks to Zernio.
//
// TODO (once Zernio API access exists): implement callRealZernioApi() below
// using the official Zernio API docs — base URL, auth header, and the
// per-platform response shape all need to come from those docs, not from
// guessing. Keep the NormalizedAuditMetrics contract as the target shape and
// map Zernio's real response into it; nothing else in this codebase should
// need to change.

export type Platform = "meta_facebook" | "meta_instagram" | "tiktok" | "youtube";

/** Sentinel used everywhere a factual value could not be obtained from the
 * source API. Per CLAUDE.md Phase 1 rule: never guess, never omit silently —
 * mark it explicitly instead. Ratios/rates must not be computed if either
 * operand is this sentinel. */
export const DONNEE_INDISPONIBLE = "donnée_indisponible" as const;
export type MaybeUnavailable<T> = T | typeof DONNEE_INDISPONIBLE;

export interface NormalizedAuditMetrics {
  followers_count: MaybeUnavailable<number>;
  following_count: MaybeUnavailable<number>;
  posts_count: MaybeUnavailable<number>;
  /** Only ever a number if both the engagement total and the reach/follower
   * base it's divided by are themselves available — never estimated. */
  engagement_rate: MaybeUnavailable<number>;
  avg_likes_per_post: MaybeUnavailable<number>;
  avg_comments_per_post: MaybeUnavailable<number>;
  last_post_at: MaybeUnavailable<string>;
  account_created_at: MaybeUnavailable<string>;
  verified: MaybeUnavailable<boolean>;
  bio_text: MaybeUnavailable<string>;
  /** Anything platform-specific that doesn't fit the common shape above
   * (e.g. YouTube total view count, TikTok total likes). Same
   * DONNEE_INDISPONIBLE convention applies per key. */
  platform_specific: Record<string, MaybeUnavailable<number | string>>;
}

export interface ZernioFetchResult {
  ok: boolean;
  /** e.g. "zernio:meta_graph_api" once real, "mock:meta_facebook" in dev. */
  source: string;
  extractedAt: string;
  isMock: boolean;
  metrics?: NormalizedAuditMetrics;
  rawResponse?: unknown;
  error?: string;
}

export class ZernioNotConfiguredError extends Error {}

export async function fetchAccountMetrics(
  platform: Platform,
  accountHandle: string,
  zernioAccountId: string | null,
): Promise<ZernioFetchResult> {
  const apiKey = Deno.env.get("ZERNIO_API_KEY");
  const extractedAt = new Date().toISOString();

  if (!apiKey) {
    return buildMockResult(platform, accountHandle, extractedAt);
  }

  try {
    const { metrics, rawResponse } = await callRealZernioApi(
      apiKey,
      platform,
      accountHandle,
      zernioAccountId,
    );
    return {
      ok: true,
      source: `zernio:${platform}`,
      extractedAt,
      isMock: false,
      metrics,
      rawResponse,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      source: `zernio:${platform}`,
      extractedAt,
      isMock: false,
      error: message,
    };
  }
}

// deno-lint-ignore require-await
async function callRealZernioApi(
  _apiKey: string,
  _platform: Platform,
  _accountHandle: string,
  _zernioAccountId: string | null,
): Promise<{ metrics: NormalizedAuditMetrics; rawResponse: unknown }> {
  throw new ZernioNotConfiguredError(
    "ZERNIO_API_KEY est défini mais l'appel réel à l'API Zernio n'est pas " +
      "implémenté : les endpoints et le format de réponse n'ont pas été " +
      "vérifiés contre la documentation officielle Zernio. Complète " +
      "callRealZernioApi() dans supabase/functions/_shared/zernioClient.ts " +
      "une fois cette documentation en main, plutôt que de deviner le " +
      "contrat de l'API.",
  );
}

function buildMockResult(
  platform: Platform,
  accountHandle: string,
  extractedAt: string,
): ZernioFetchResult {
  // Deliberately round, obviously-fake numbers — never meant to look like a
  // real account's data. is_mock: true on the stored snapshot is the actual
  // safeguard; these values just avoid the temptation to eyeball them as
  // realistic.
  const metrics: NormalizedAuditMetrics = {
    followers_count: 1000,
    following_count: 100,
    posts_count: 42,
    engagement_rate: 0.03,
    avg_likes_per_post: 30,
    avg_comments_per_post: 2,
    last_post_at: extractedAt,
    account_created_at: DONNEE_INDISPONIBLE,
    verified: false,
    bio_text: `[MOCK] Compte de test pour ${accountHandle}`,
    platform_specific: {},
  };

  return {
    ok: true,
    source: `mock:${platform}`,
    extractedAt,
    isMock: true,
    metrics,
    rawResponse: {
      mock: true,
      note:
        "ZERNIO_API_KEY non configuré — données factices générées côté " +
        "serveur, à ne jamais présenter comme un audit réel.",
      accountHandle,
    },
  };
}
