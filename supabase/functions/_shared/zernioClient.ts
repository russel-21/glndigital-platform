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
// STATUS (2026-08-29): publishPost() and fetchComments() are now REAL too —
// verified against the same Zernio OpenAPI spec (docs.zernio.com/api/openapi,
// re-fetched and re-read in full on 2026-08-29 — spec version 1.0.4).
//   - publishPost(): POST /v1/posts, one platform target per call,
//     publishNow: true. Confirmed synchronous (the "immediatePublish"
//     example in the spec shows platformPostId/platformPostUrl already
//     populated in the response), so a non-"published" per-platform status
//     is treated as a real failure, not "still working on it".
//   - fetchComments(): Zernio's Inbox Comments feature does NOT list tiktok
//     in its platform enum (GET /v1/inbox/comments) — confirmed absent from
//     the spec, not a mapping gap here. callRealZernioCommentsApi() throws
//     an explicit ZernioApiError for platform "tiktok" rather than
//     returning a silently-empty result. For the three platforms it does
//     support (facebook/instagram/youtube), fetching is a two-step fan-out:
//     GET /v1/inbox/comments lists POSTS that have comments, then GET
//     /v1/inbox/comments/{postId} fetches that post's actual comment
//     thread. Only the first page of each is walked in this pass (posts
//     and comment threads beyond the first page are not fetched) — a
//     deliberate scope simplification, not an oversight; dedup against
//     already-seen comments happens in phase6-engagement/index.ts via
//     platform_comment_id, so re-calling this on a schedule still surfaces
//     new top-of-thread comments over time.
//   - DMs are STILL NOT implemented for the real path (RawEngagementItem's
//     "dm" kind is never produced by callRealZernioCommentsApi()) — Zernio
//     exposes these via a materially different endpoint pair
//     (/v1/inbox/conversations + .../messages) that hasn't been wired up
//     yet. Same rule as everywhere else in this file: left unimplemented
//     and undocumented-as-done rather than faked.
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

/** Zernio's own platform slugs, verified against its OpenAPI spec (the
 * `platform` enum on PlatformTarget / GET /v1/inbox/comments), not guessed.
 * Our internal Platform type prefixes Meta platforms with "meta_" to keep
 * Facebook/Instagram unambiguous elsewhere in this codebase; Zernio itself
 * just uses "facebook"/"instagram". */
const PLATFORM_SLUG: Record<Platform, string> = {
  meta_facebook: "facebook",
  meta_instagram: "instagram",
  tiktok: "tiktok",
  youtube: "youtube",
};

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

/** POST against Zernio's API with bearer auth + JSON body. Unlike zernioGet,
 * callers here need the raw status/body pair (not just a thrown error) to
 * distinguish "Zernio rejected the whole request" from "Zernio accepted it
 * but one target platform failed to publish" — both surface as 2xx/4xx at
 * different levels in the /v1/posts response shape. */
async function zernioPost(
  apiKey: string,
  path: string,
  payload: unknown,
  extraHeaders?: Record<string, string>,
): Promise<{ status: number; body: unknown }> {
  const res = await fetch(`${ZERNIO_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...extraHeaders,
    },
    body: JSON.stringify(payload),
  });

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // No JSON body — fall back to a plain status-based message below.
  }

  return { status: res.status, body };
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

/** Verified against POST /v1/posts in Zernio's OpenAPI spec (2026-08-29,
 * spec version 1.0.4) — request shape, response shape (Post.platforms[] /
 * PlatformTarget), and the immediate-publish contract (publishNow: true
 * completes synchronously; platformPostId/platformPostUrl are already
 * populated in the response, per the spec's own "immediatePublish"
 * example) all come from that spec, none guessed. */
async function callRealZernioPublishApi(
  apiKey: string,
  platform: Platform,
  _accountHandle: string,
  zernioAccountId: string | null,
  content: PublishContent,
): Promise<{ platformPostId?: string; rawResponse: unknown }> {
  if (!zernioAccountId) {
    throw new ZernioApiError(
      "Aucun identifiant de compte Zernio (zernio_account_id) n'est renseigné pour ce compte social — " +
        "va dans Zernio → Connections pour récupérer l'ID du compte connecté avant de publier.",
    );
  }

  // Zernio's /v1/posts has a single "content" text field, no separate slot
  // for a "hook" — so the hook (attention-grabbing opening line, from Phase
  // 4a) leads the caption body. The shooting script is deliberately never
  // included: it's Phase 4b production guidance, not on-platform copy.
  const composedContent = content.hook.trim()
    ? `${content.hook.trim()}\n\n${content.caption.trim()}`
    : content.caption.trim();

  const platformSlug = PLATFORM_SLUG[platform];
  const requestId = crypto.randomUUID();
  const { status, body } = await zernioPost(
    apiKey,
    "/posts",
    {
      content: composedContent,
      platforms: [{ platform: platformSlug, accountId: zernioAccountId }],
      publishNow: true,
    },
    // Per the spec's idempotency contract: a unique x-request-id per
    // logical call prevents a network-retry from double-posting.
    { "x-request-id": requestId },
  );

  const bodyObj = body && typeof body === "object" ? (body as Record<string, unknown>) : null;

  if (status < 200 || status >= 300) {
    const detail = (bodyObj && typeof bodyObj.error === "string" && bodyObj.error) || `HTTP ${status}`;
    throw new ZernioApiError(`Zernio (/posts) a répondu une erreur lors de la publication : ${detail}`);
  }

  const post = bodyObj && typeof bodyObj.post === "object" ? (bodyObj.post as Record<string, unknown>) : null;
  const platformEntries =
    post && Array.isArray(post.platforms) ? (post.platforms as Record<string, unknown>[]) : [];
  // We only ever send one platform target, but find by slug rather than
  // assume index 0 in case Zernio ever reorders/dedupes the array.
  const target = platformEntries.find((p) => p.platform === platformSlug) ?? platformEntries[0];

  if (!target) {
    throw new ZernioApiError(
      "Zernio a répondu avec succès à la publication mais sans entrée de plateforme dans post.platforms — " +
        "réponse inattendue, à vérifier manuellement dans le tableau de bord Zernio.",
    );
  }

  const targetStatus = typeof target.status === "string" ? target.status : "unknown";
  // publishNow: true is documented as synchronous — a status other than
  // "published" here means the publish genuinely did not succeed, not that
  // it's still in progress.
  if (targetStatus !== "published") {
    const errorMessage =
      typeof target.errorMessage === "string" ? target.errorMessage : `statut Zernio inattendu : "${targetStatus}"`;
    throw new ZernioApiError(`Zernio n'a pas confirmé la publication (${platform}) : ${errorMessage}`);
  }

  return {
    platformPostId: typeof target.platformPostId === "string" ? target.platformPostId : undefined,
    rawResponse: body,
  };
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

/** Zernio's Inbox Comments platform slugs, verified against the `platform`
 * enum on GET /v1/inbox/comments (2026-08-29, spec version 1.0.4):
 * facebook, instagram, twitter, bluesky, threads, youtube, linkedin,
 * reddit, metaads. tiktok is deliberately absent from this map — it is NOT
 * in that enum, so there is no Inbox Comments endpoint to call for it. */
const INBOX_COMMENTS_PLATFORM: Partial<Record<Platform, string>> = {
  meta_facebook: "facebook",
  meta_instagram: "instagram",
  youtube: "youtube",
};

/** Verified against GET /v1/inbox/comments and GET /v1/inbox/comments/{postId}
 * in Zernio's OpenAPI spec (2026-08-29). Two-step fan-out: the first
 * endpoint lists POSTS that have comments (not the comments themselves),
 * the second fetches one post's actual comment thread. Only the first page
 * of each is walked — see the file header for why that's an accepted
 * scope simplification, not an oversight. */
async function callRealZernioCommentsApi(
  apiKey: string,
  platform: Platform,
  _accountHandle: string,
  zernioAccountId: string | null,
): Promise<{ items: RawEngagementItem[]; rawResponse: unknown }> {
  if (!zernioAccountId) {
    throw new ZernioApiError(
      "Aucun identifiant de compte Zernio (zernio_account_id) n'est renseigné pour ce compte social.",
    );
  }

  const inboxPlatform = INBOX_COMMENTS_PLATFORM[platform];
  if (!inboxPlatform) {
    throw new ZernioApiError(
      `Zernio n'expose pas de fonctionnalité "Inbox Comments" pour ${platform} — confirmé dans sa spec ` +
        "OpenAPI (l'enum platform de GET /v1/inbox/comments ne liste pas cette plateforme). Rien à " +
        "récupérer ici, ce n'est pas un bug de ce connecteur.",
    );
  }

  const postsRaw = await zernioGet(apiKey, "/inbox/comments", {
    accountId: zernioAccountId,
    platform: inboxPlatform,
    minComments: "1",
    limit: "25",
  });
  const postsObj = postsRaw && typeof postsRaw === "object" ? (postsRaw as Record<string, unknown>) : null;
  const posts = postsObj && Array.isArray(postsObj.data) ? (postsObj.data as Record<string, unknown>[]) : [];

  const items: RawEngagementItem[] = [];
  const rawThreads: unknown[] = [];

  for (const post of posts) {
    const postId = typeof post.id === "string" ? post.id : null;
    if (!postId) continue;

    const threadRaw = await zernioGet(apiKey, `/inbox/comments/${encodeURIComponent(postId)}`, {
      accountId: zernioAccountId,
      limit: "25",
    });
    rawThreads.push(threadRaw);

    const threadObj = threadRaw && typeof threadRaw === "object" ? (threadRaw as Record<string, unknown>) : null;
    const comments =
      threadObj && Array.isArray(threadObj.comments) ? (threadObj.comments as Record<string, unknown>[]) : [];

    for (const c of comments) {
      const id = typeof c.id === "string" ? c.id : null;
      const message = typeof c.message === "string" ? c.message : null;
      if (!id || message === null) continue;

      const from = c.from && typeof c.from === "object" ? (c.from as Record<string, unknown>) : null;
      const authorHandle =
        (from && typeof from.username === "string" && from.username) ||
        (from && typeof from.name === "string" && from.name) ||
        "unknown";
      const postedAt = typeof c.createdTime === "string" ? c.createdTime : new Date().toISOString();

      items.push({
        platformCommentId: id,
        kind: "comment",
        authorHandle,
        content: message,
        postedAt,
      });
    }
  }

  return { items, rawResponse: { posts: postsRaw, threads: rawThreads } };
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

// ─── Client self-service — Zernio Profiles & Connect ────────────
// SCOPE: lets a real "client" role user (not an admin) connect their own
// social account through GLN's app, without ever seeing ZERNIO_API_KEY.
// Verified against Zernio's OpenAPI spec (2026-08-31, spec version 1.0.4):
// a Zernio "Profile" (POST /v1/profiles — their own agency/workspace
// concept, distinct from this project's own `profiles` table) is the unit
// Zernio uses to isolate one client's connected accounts from another's,
// all under GLN's single Zernio subscription. GET /v1/connect/{platform}
// (standard, non-headless mode) returns an authUrl to redirect the client's
// own browser to — they complete the real OAuth consent themselves, Zernio
// hosts its own account/page-selection UI, then redirects back to
// redirect_url with the connection result already applied. No server-side
// "exchange code" step is needed for this mode (that endpoint exists only
// for headless/custom-UI integrations, not used here).

/** Creates a new Zernio "Profile" for a client who doesn't have one yet.
 * Zernio profile names must be unique per Zernio workspace (GLN's), so this
 * is called at most once per GLN client — the resulting id is cached on
 * that client's own profiles.zernio_profile_id row by the caller. */
export async function createZernioProfile(apiKey: string, name: string): Promise<string> {
  const { status, body } = await zernioPost(apiKey, "/profiles", { name });
  const bodyObj = body && typeof body === "object" ? (body as Record<string, unknown>) : null;

  if (status < 200 || status >= 300) {
    const detail = (bodyObj && typeof bodyObj.error === "string" && bodyObj.error) || `HTTP ${status}`;
    throw new ZernioApiError(`Zernio (/profiles) a répondu une erreur lors de la création du profil : ${detail}`);
  }

  const profile = bodyObj && typeof bodyObj.profile === "object" ? (bodyObj.profile as Record<string, unknown>) : null;
  const profileId = profile && typeof profile._id === "string" ? profile._id : null;
  if (!profileId) {
    throw new ZernioApiError(
      "Zernio a répondu avec succès à la création du profil mais sans profile._id — réponse inattendue.",
    );
  }
  return profileId;
}

/** Returns the OAuth authUrl to redirect a client's browser to for
 * connecting one platform into their own Zernio profile. `platform` here
 * uses this project's internal Platform type — mapped to Zernio's own slug
 * via PLATFORM_SLUG, same as callRealZernioPublishApi(). */
export async function getZernioConnectUrl(
  apiKey: string,
  platform: Platform,
  zernioProfileId: string,
  redirectUrl: string,
): Promise<string> {
  const platformSlug = PLATFORM_SLUG[platform];
  const raw = await zernioGet(apiKey, `/connect/${platformSlug}`, {
    profileId: zernioProfileId,
    redirect_url: redirectUrl,
  });
  const bodyObj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
  const authUrl = bodyObj && typeof bodyObj.authUrl === "string" ? bodyObj.authUrl : null;
  if (!authUrl) {
    throw new ZernioApiError(
      "Zernio a répondu avec succès à la demande de connexion mais sans authUrl — réponse inattendue.",
    );
  }
  return authUrl;
}
