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
