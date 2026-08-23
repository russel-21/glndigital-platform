// Zernio adapter — Phase 1 (Audit) data source, Phase 5 (Publication)
// distribution channel, AND Phase 6 (Engagement) comment/DM source. Three
// agents, three functions below (fetchAccountMetrics / publishPost /
// fetchComments) — same external aggregator, but kept as separate
// functions so each phase stays independently swappable and none
// implicitly depends on another's shape. See CLAUDE.md, section "Feature
// en cours de cadrage", rules 3 and 4, and the project-wide instruction
// that all social API integration goes through Zernio, never a direct
// Meta/TikTok/YouTube connector.
//
// fetchAccountMetrics() SCOPE: return factual, per-platform account metrics
// for a single account, tagged with where they came from and when they
// were extracted. Must never estimate, score, or interpret — that's the
// Diagnostic agent's job (Phase 2), not this one.
//
// STATUS (2026-08-22): fetchAccountMetrics() is now REAL — Russel created a
// Zernio account and connected a first Facebook Page, and this file was
// implemented directly against Zernio's official OpenAPI spec
// (docs.zernio.com/api/openapi, read in full on 2026-08-22 — base URL,
// bearer-token auth, endpoint paths, default metrics and response envelope
// all confirmed from that spec, none guessed). Base URL is
// https://zernio.com/api, auth is `Authorization: Bearer <ZERNIO_API_KEY>`.
//
// publishPost() and fetchComments() below are STILL NOT implemented — their
// endpoints/request shapes have not been verified yet, and guessing them
// would violate this project's own anti-hallucination rule (never present
// fabricated data/behavior as real). Same pattern as before for those two:
// mock (isMock: true) when ZERNIO_API_KEY is unset, explicit throw if it IS
// set. Verify each against the same OpenAPI spec before implementing, same
// way fetchAccountMetrics() was done.
//
// What Zernio's API does NOT expose for fetchAccountMetrics(), confirmed
// from the spec (not a bug here — there is nothing to fetch):
//   - bio_text, verified, account_created_at, last_post_at: not present on
//     any of facebook/instagram/tiktok/youtube's account or insights
//     schemas.
//   - following_count / posts_count: only present for some platforms
//     (Instagram: mediaCount; TikTok/YouTube: videoCount; Facebook Pages:
//     neither — Facebook Pages have no "following" concept and Zernio's
//     Page insights don't include a post count).
//   - engagement_rate / avg_likes_per_post / avg_comments_per_post: Zernio's
//     insights endpoints return aggregate counters (e.g. page_post_
//     engagements, accounts_engaged) over a date range, not a per-post
//     average or a ratio against a comparable base — computing one here
//     would be exactly the kind of invented interpretation CLAUDE.md's
//     Phase 1 rule forbids ("pas de ratio si une valeur manque / pas
//     d'interprétation"). The raw counters are kept in platform_specific
//     instead, for the Phase 2 Diagnostic agent to reason about explicitly.
// All of the above are sentineled DONNEE_INDISPONIBLE rather than omitted.

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

/** A real call to Zernio's API was made and Zernio returned an error (bad
 * auth, missing scope, account not found, analytics add-on required, …).
 * Distinct from ZernioNotConfiguredError, which means "this codebase never
 * implemented the call" — this means "the call was made and Zernio said
 * no". Kept separate so the two failure modes are never confused in logs
 * or error messages surfaced to the admin. */
export class ZernioApiError extends Error {}

const ZERNIO_BASE_URL = "https://zernio.com/api/v1";

/** Analytics endpoint path per platform, verified against Zernio's OpenAPI
 * spec (docs.zernio.com/api/openapi) on 2026-08-22. All four share the same
 * response envelope (the spec itself notes this — historically named
 * InstagramAccountInsightsResponse, reused by every platform), so one
 * normalizer below handles all of them. */
const PLATFORM_ANALYTICS_PATH: Record<Platform, string> = {
  meta_facebook: "/analytics/facebook/page-insights",
  meta_instagram: "/analytics/instagram/account-insights",
  tiktok: "/analytics/tiktok/account-insights",
  youtube: "/analytics/youtube/channel-insights",
};

/** GET against Zernio's API with bearer auth. Throws ZernioApiError with
 * Zernio's own error message on any non-2xx response, rather than a
 * generic "request failed" — the exact wording (e.g. "Analytics add-on
 * required") is what tells an admin what to actually go do about it. */
async function zernioGet(
  apiKey: string,
  path: string,
  params: Record<string, string>,
): Promise<unknown> {
  const url = new URL(`${ZERNIO_BASE_URL}${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // No JSON body — fall back to a plain status-based message below.
  }

  if (!res.ok) {
    const bodyObj = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
    const detail =
      (bodyObj && typeof bodyObj.message === "string" && bodyObj.message) ||
      (bodyObj && typeof bodyObj.error === "string" && bodyObj.error) ||
      `HTTP ${res.status}`;
    throw new ZernioApiError(`Zernio (${path}) a répondu une erreur : ${detail}`);
  }

  return body;
}

/** Pulls this account's entry out of GET /v1/accounts/follower-stats's
 * `accounts` array (AccountWithFollowerStats[], keyed by Zernio's own _id —
 * there is no single-account "get by id" endpoint in the spec, so the list
 * response is filtered client-side here). */
function extractFollowerStatsEntry(raw: unknown, zernioAccountId: string): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null;
  const accounts = (raw as Record<string, unknown>).accounts;
  if (!Array.isArray(accounts)) return null;
  const match = accounts.find(
    (a) => a && typeof a === "object" && (a as Record<string, unknown>)._id === zernioAccountId,
  );
  return match && typeof match === "object" ? (match as Record<string, unknown>) : null;
}

/** Maps Zernio's follower-stats entry + platform-insights response into our
 * own NormalizedAuditMetrics contract. Every field not actually present in
 * Zernio's response stays DONNEE_INDISPONIBLE — see the file header for
 * exactly which fields that applies to and why. */
function normalizeZernioMetrics(
  platform: Platform,
  followerStatsRaw: unknown,
  insightsRaw: unknown,
  zernioAccountId: string,
): NormalizedAuditMetrics {
  const platform_specific: Record<string, MaybeUnavailable<number | string>> = {};

  let followers_count: MaybeUnavailable<number> = DONNEE_INDISPONIBLE;
  let following_count: MaybeUnavailable<number> = DONNEE_INDISPONIBLE;
  let posts_count: MaybeUnavailable<number> = DONNEE_INDISPONIBLE;

  const entry = extractFollowerStatsEntry(followerStatsRaw, zernioAccountId);
  if (entry) {
    if (typeof entry.currentFollowers === "number") {
      followers_count = entry.currentFollowers;
    }
    const stats = entry.accountStats;
    if (stats && typeof stats === "object") {
      const statsObj = stats as Record<string, unknown>;
      if (typeof statsObj.followingCount === "number") {
        following_count = statsObj.followingCount;
      }
      // Which counter means "posts" varies by platform (see file header) —
      // Facebook Pages have none of these fields at all.
      const postsField =
        platform === "meta_instagram" ? "mediaCount" : platform === "tiktok" || platform === "youtube" ? "videoCount" : null;
      if (postsField && typeof statsObj[postsField] === "number") {
        posts_count = statsObj[postsField] as number;
      }
    }
  }

  if (insightsRaw && typeof insightsRaw === "object") {
    const insightsObj = insightsRaw as Record<string, unknown>;
    const metricsObj = insightsObj.metrics;
    if (metricsObj && typeof metricsObj === "object") {
      for (const [key, val] of Object.entries(metricsObj as Record<string, unknown>)) {
        if (val && typeof val === "object" && typeof (val as Record<string, unknown>).total === "number") {
          platform_specific[key] = (val as Record<string, unknown>).total as number;
        }
      }
    }
    const unavailable = insightsObj.unavailableMetrics;
    if (Array.isArray(unavailable)) {
      for (const item of unavailable) {
        if (item && typeof item === "object" && typeof (item as Record<string, unknown>).metric === "string") {
          platform_specific[(item as Record<string, unknown>).metric as string] = DONNEE_INDISPONIBLE;
        }
      }
    }
  }

  return {
    followers_count,
    following_count,
    posts_count,
    engagement_rate: DONNEE_INDISPONIBLE,
    avg_likes_per_post: DONNEE_INDISPONIBLE,
    avg_comments_per_post: DONNEE_INDISPONIBLE,
    last_post_at: DONNEE_INDISPONIBLE,
    account_created_at: DONNEE_INDISPONIBLE,
    verified: DONNEE_INDISPONIBLE,
    bio_text: DONNEE_INDISPONIBLE,
    platform_specific,
  };
}

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

async function callRealZernioApi(
  apiKey: string,
  platform: Platform,
  _accountHandle: string,
  zernioAccountId: string | null,
): Promise<{ metrics: NormalizedAuditMetrics; rawResponse: unknown }> {
  if (!zernioAccountId) {
    throw new ZernioApiError(
      "Aucun identifiant de compte Zernio (zernio_account_id) n'est renseigné pour ce compte social — " +
        "va dans Zernio → Connections pour récupérer l'ID du compte connecté, puis renseigne-le dans la " +
        "fiche du compte dans l'admin GLN avant de relancer un audit.",
    );
  }

  const analyticsPath = PLATFORM_ANALYTICS_PATH[platform];

  const [followerStatsRaw, insightsRaw] = await Promise.all([
    zernioGet(apiKey, "/accounts/follower-stats", { accountIds: zernioAccountId }),
    zernioGet(apiKey, analyticsPath, { accountId: zernioAccountId }),
  ]);

  const metrics = normalizeZernioMetrics(platform, followerStatsRaw, insightsRaw, zernioAccountId);

  return {
    metrics,
    rawResponse: { followerStats: followerStatsRaw, insights: insightsRaw },
  };
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

// ─── Phase 5 (Publication) — publishPost() ──────────────────────
// SCOPE: publish one already-approved piece of content (caption + hook +
// optional script, see content_drafts) to one platform via Zernio.
// Confirms/echoes back exactly what was sent — the caller (edge function)
// is responsible for freezing the content snapshot before calling this, so
// nothing here can silently diverge from what a human approved (CLAUDE.md
// Phase 5 rule: "aucune modification silencieuse entre validation et
// publication"). No scheduling logic here — this only performs the actual
// publish/distribute call for content whose time has come.

export interface PublishContent {
  caption: string;
  hook: string;
  /** Empty string when not applicable. */
  script: string;
}

export interface ZernioPublishResult {
  ok: boolean;
  source: string;
  publishedAt: string;
  isMock: boolean;
  platformPostId?: string;
  rawResponse?: unknown;
  error?: string;
}

export async function publishPost(
  platform: Platform,
  accountHandle: string,
  zernioAccountId: string | null,
  content: PublishContent,
): Promise<ZernioPublishResult> {
  const apiKey = Deno.env.get("ZERNIO_API_KEY");
  const publishedAt = new Date().toISOString();

  if (!apiKey) {
    return buildMockPublishResult(platform, accountHandle, content, publishedAt);
  }

  try {
    const { platformPostId, rawResponse } = await callRealZernioPublishApi(
      apiKey,
      platform,
      accountHandle,
      zernioAccountId,
      content,
    );
    return {
      ok: true,
      source: `zernio:${platform}`,
      publishedAt,
      isMock: false,
      platformPostId,
      rawResponse,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      source: `zernio:${platform}`,
      publishedAt,
      isMock: false,
      error: message,
    };
  }
}

// deno-lint-ignore require-await
async function callRealZernioPublishApi(
  _apiKey: string,
  _platform: Platform,
  _accountHandle: string,
  _zernioAccountId: string | null,
  _content: PublishContent,
): Promise<{ platformPostId: string; rawResponse: unknown }> {
  throw new ZernioNotConfiguredError(
    "ZERNIO_API_KEY est défini mais l'appel réel de publication à l'API Zernio " +
      "n'est pas implémenté : les endpoints et le format de requête/réponse " +
      "n'ont pas été vérifiés contre la documentation officielle Zernio. " +
      "Complète callRealZernioPublishApi() dans " +
      "supabase/functions/_shared/zernioClient.ts une fois cette " +
      "documentation en main, plutôt que de deviner le contrat de l'API.",
  );
}

function buildMockPublishResult(
  platform: Platform,
  accountHandle: string,
  content: PublishContent,
  publishedAt: string,
): ZernioPublishResult {
  return {
    ok: true,
    source: `mock:${platform}`,
    publishedAt,
    isMock: true,
    platformPostId: `mock_post_${crypto.randomUUID()}`,
    rawResponse: {
      mock: true,
      note:
        "ZERNIO_API_KEY non configuré — aucune publication réelle n'a eu lieu. " +
        "Ceci simule uniquement la structure de réponse attendue.",
      accountHandle,
      content_echo: content,
    },
  };
}

// ─── Phase 6 (Engagement) — fetchComments() ─────────────────────
// SCOPE: return raw comments/DMs for one account since the last check —
// factual retrieval only, exactly like fetchAccountMetrics(). No
// classification, no interpretation happens in this file — "does this need
// a response" is the Diagnostic-style job of the Phase 6 agent's Claude
// call (see claudeClient.ts classifyEngagementItem()), not this adapter.

export interface RawEngagementItem {
  platformCommentId: string;
  kind: "comment" | "dm";
  authorHandle: string;
  content: string;
  postedAt: string;
}

export interface ZernioCommentsResult {
  ok: boolean;
  source: string;
  fetchedAt: string;
  isMock: boolean;
  items: RawEngagementItem[];
  rawResponse?: unknown;
  error?: string;
}

export async function fetchComments(
  platform: Platform,
  accountHandle: string,
  zernioAccountId: string | null,
): Promise<ZernioCommentsResult> {
  const apiKey = Deno.env.get("ZERNIO_API_KEY");
  const fetchedAt = new Date().toISOString();

  if (!apiKey) {
    return buildMockCommentsResult(platform, accountHandle, fetchedAt);
  }

  try {
    const { items, rawResponse } = await callRealZernioCommentsApi(apiKey, platform, accountHandle, zernioAccountId);
    return { ok: true, source: `zernio:${platform}`, fetchedAt, isMock: false, items, rawResponse };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, source: `zernio:${platform}`, fetchedAt, isMock: false, items: [], error: message };
  }
}

// deno-lint-ignore require-await
async function callRealZernioCommentsApi(
  _apiKey: string,
  _platform: Platform,
  _accountHandle: string,
  _zernioAccountId: string | null,
): Promise<{ items: RawEngagementItem[]; rawResponse: unknown }> {
  throw new ZernioNotConfiguredError(
    "ZERNIO_API_KEY est défini mais l'appel réel de récupération des commentaires à l'API Zernio " +
      "n'est pas implémenté : les endpoints et le format de réponse n'ont pas été vérifiés contre la " +
      "documentation officielle Zernio. Complète callRealZernioCommentsApi() dans " +
      "supabase/functions/_shared/zernioClient.ts une fois cette documentation en main, plutôt que de " +
      "deviner le contrat de l'API.",
  );
}

function buildMockCommentsResult(
  platform: Platform,
  accountHandle: string,
  fetchedAt: string,
): ZernioCommentsResult {
  // Two deliberately distinct examples — one that obviously needs a human
  // reply, one that obviously doesn't — so the Phase 6 classifier's output
  // is easy to sanity-check against mock data.
  const items: RawEngagementItem[] = [
    {
      platformCommentId: `mock_comment_${crypto.randomUUID()}`,
      kind: "comment",
      authorHandle: "mock_user_1",
      content: "[MOCK] Est-ce que vous livrez à Yaoundé ? Merci de me répondre svp.",
      postedAt: fetchedAt,
    },
    {
      platformCommentId: `mock_comment_${crypto.randomUUID()}`,
      kind: "comment",
      authorHandle: "mock_user_2",
      content: "[MOCK] Superbe publication, merci pour le partage !",
      postedAt: fetchedAt,
    },
  ];

  return {
    ok: true,
    source: `mock:${platform}`,
    fetchedAt,
    isMock: true,
    items,
    rawResponse: {
      mock: true,
      note:
        "ZERNIO_API_KEY non configuré — commentaires factices générés côté serveur, à ne jamais " +
        "présenter comme de vrais commentaires clients.",
      accountHandle,
    },
  };
}
