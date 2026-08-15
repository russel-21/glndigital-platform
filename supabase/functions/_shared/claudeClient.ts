// Claude (Anthropic) adapter — shared by the Phase 2 (Diagnostic) and
// Phase 3 (Stratégie) agents. Each phase's SCOPE is documented above its
// own function below — do not let one phase's function call into another's
// helpers beyond the shared `client`/`MODEL` setup. See CLAUDE.md, "Feature
// en cours de cadrage", section 7: "Respecter strictement le découpage en
// 7 skills/agents séparés — ne pas fusionner les responsabilités."
//
// Model: claude-sonnet-5 — chosen for cost, since this runs on every
// admin-triggered call rather than as a one-off task: ~$3/$15 per
// million tokens (input/output), $2/$10 introductory through 2026-08-31,
// vs. ~$5/$25 for claude-opus-5. Vision-capable (high-resolution image
// input) and supports schema-constrained JSON output. To use Opus instead
// (higher quality, ~1.7x the cost), change MODEL below — nothing else in
// this file or its callers needs to change.

import Anthropic from "npm:@anthropic-ai/sdk";

const MODEL = "claude-sonnet-5";

export type ConfidenceLevel = "Élevé" | "Moyen" | "Faible";

export interface DiagnosticHypothesis {
  statement: string;
  confidence: ConfidenceLevel;
  /** Which Phase 1 metric field(s) or screenshot observation(s) this is grounded in. Never empty. */
  based_on: string[];
}

export interface DiagnosticPayload {
  /** false when there isn't enough data/screenshots to ground any hypothesis —
   * per CLAUDE.md: "diagnostic non concluant" must be an explicit, real outcome. */
  conclusive: boolean;
  hypotheses: DiagnosticHypothesis[];
  missing_data: string[];
  summary: string;
}

export interface DiagnosticResult {
  ok: boolean;
  payload?: DiagnosticPayload;
  raw_response?: unknown;
  error?: string;
}

export interface ScreenshotInput {
  base64: string;
  mediaType: "image/png" | "image/jpeg" | "image/webp" | "image/gif";
  label: string;
}

const DIAGNOSTIC_SCHEMA = {
  type: "object",
  properties: {
    conclusive: {
      type: "boolean",
      description:
        "false if the provided Phase 1 data and screenshots are not sufficient to ground any hypothesis",
    },
    hypotheses: {
      type: "array",
      items: {
        type: "object",
        properties: {
          statement: {
            type: "string",
            description:
              "A probabilistic statement (e.g. 'les données suggèrent X, confiance moyenne') — never asserted as certain fact",
          },
          confidence: { type: "string", enum: ["Élevé", "Moyen", "Faible"] },
          based_on: {
            type: "array",
            items: { type: "string" },
            description:
              "Which specific Phase 1 metric field(s) or screenshot observation(s) ground this hypothesis. Never empty.",
          },
        },
        required: ["statement", "confidence", "based_on"],
        additionalProperties: false,
      },
    },
    missing_data: {
      type: "array",
      items: { type: "string" },
      description: "Data that would be needed to strengthen or complete the diagnostic but wasn't available",
    },
    summary: { type: "string" },
  },
  required: ["conclusive", "hypotheses", "missing_data", "summary"],
  additionalProperties: false,
} as const;

const SYSTEM_PROMPT = `Tu es l'agent Phase 2 (Diagnostic) de la plateforme GLN Digital.

SCOPE STRICT : tu identifies des problèmes probables à partir (1) des données factuelles Phase 1 fournies et (2) des captures d'écran fournies. Tu ne fais QUE ça.

RÈGLES OBLIGATOIRES (anti-hallucination, non négociables) :
1. Chaque hypothèse doit être explicitement reliée à une donnée de la Phase 1 ou à une observation précise d'une capture d'écran — jamais tirée de connaissances générales sur les réseaux sociaux ou le marketing.
2. Formulation probabiliste obligatoire pour chaque hypothèse ("les données suggèrent X", "cela pourrait indiquer Y") — jamais de certitude affirmée.
3. Chaque hypothèse a un niveau de confiance explicite : Élevé, Moyen, ou Faible.
4. Si les données ou captures fournies sont insuffisantes pour émettre une hypothèse solide, marque conclusive=false et explique dans missing_data ce qui manque — ne comble jamais les trous en devinant.
5. N'invente aucun chiffre, aucune statistique, aucune tendance qui ne soit pas explicitement présente dans les données ou visible sur les captures fournies.
6. Ne fais aucune recommandation d'action — ce n'est pas ton rôle (Phase 3).

Réponds uniquement dans le format JSON structuré demandé.`;

// ─── Phase 2 (Diagnostic) — SCOPE ───────────────────────────────
//   - Input: a text summary of Phase 1 factual metrics + at least one
//     admin-uploaded screenshot.
//   - Output: a structured diagnostic (hypotheses with explicit confidence
//     levels + a list of missing data), nothing else. No scoring, no
//     recommendations, no content generation — that's Phase 3/4.
//   - Every hypothesis must be traceable to a specific Phase 1 field or a
//     screenshot observation (`based_on`), never asserted as fact.
export async function generateDiagnostic(
  metricsSummaryText: string,
  screenshots: ScreenshotInput[],
): Promise<DiagnosticResult> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    return { ok: false, error: "ANTHROPIC_API_KEY non configurée côté serveur." };
  }
  if (screenshots.length === 0) {
    // Hard requirement from CLAUDE.md: a diagnostic without visual support
    // is incomplete. Refuse rather than silently proceeding text-only.
    return { ok: false, error: "Au moins une capture d'écran est requise pour générer un diagnostic." };
  }

  const client = new Anthropic({ apiKey });

  const imageBlocks = screenshots.flatMap((s) => [
    { type: "text" as const, text: `Capture : ${s.label}` },
    {
      type: "image" as const,
      source: { type: "base64" as const, media_type: s.mediaType, data: s.base64 },
    },
  ]);

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      thinking: { type: "adaptive" },
      output_config: {
        effort: "high",
        format: { type: "json_schema", schema: DIAGNOSTIC_SCHEMA },
      },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: `Données factuelles Phase 1 (source unique de vérité) :\n${metricsSummaryText}` },
            ...imageBlocks,
          ],
        },
      ],
    });

    if (response.stop_reason === "refusal") {
      return { ok: false, error: "Requête refusée par les filtres de sécurité du modèle." };
    }

    const textBlock = response.content.find(
      (b): b is Anthropic.TextBlock => b.type === "text",
    );
    if (!textBlock) {
      return { ok: false, error: "Réponse du modèle sans contenu texte exploitable.", raw_response: response };
    }

    let payload: DiagnosticPayload;
    try {
      payload = JSON.parse(textBlock.text);
    } catch {
      return { ok: false, error: "Réponse du modèle non conforme au JSON attendu.", raw_response: textBlock.text };
    }

    return { ok: true, payload, raw_response: response };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}

// ─── Phase 3 (Stratégie de contenu) — SCOPE ─────────────────────
//   - Input: Phase 1 factual metrics summary + an APPROVED Phase 2
//     diagnostic's summary/hypotheses. The edge function caller is
//     responsible for only ever passing an approved diagnostic — this
//     function does not re-check that itself.
//   - Output: content pillars + a 4-week editorial calendar (~2-3 posts/
//     week — Russel's explicit decision, see CLAUDE.md), nothing else.
//     No caption/script text, no visuals — that's Phase 4a/4b.
//   - Every "current trend" claim MUST come from a real, timestamped web
//     search this call performs (web_search tool) — never from training
//     memory. Every trend claim used must be listed in `trends_used` with
//     its source URL and the date it was retrieved.
//   - No competitor references: Phase 1 as built does not collect
//     competitor data (only the audited account's own metrics), so per
//     CLAUDE.md's "competitor references must come from Phase 1 data
//     only" rule, this agent is instructed to never invent competitor
//     comparisons — there is nothing to reference yet.

export interface ContentPillar {
  name: string;
  description: string;
  /** Tied back to a specific Phase 1 metric or Phase 2 hypothesis — never generic. */
  rationale: string;
}

export interface EditorialCalendarEntry {
  /** Days from the strategy's generation date, 0-27 (4-week horizon). */
  day_offset: number;
  platform: string;
  /** Must match one of the pillars' `name` field. */
  pillar: string;
  format: string;
  working_title: string;
  brief: string;
}

export interface TrendSource {
  claim: string;
  source_url: string;
  source_title: string;
  /** ISO date this was found via the web_search tool call in this run. */
  retrieved_at: string;
}

export interface StrategyPayload {
  pillars: ContentPillar[];
  editorial_calendar: EditorialCalendarEntry[];
  trends_used: TrendSource[];
  summary: string;
}

export interface StrategyResult {
  ok: boolean;
  payload?: StrategyPayload;
  raw_response?: unknown;
  error?: string;
}

const STRATEGY_SCHEMA = {
  type: "object",
  properties: {
    pillars: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          rationale: {
            type: "string",
            description: "Tied to a specific Phase 1 metric or Phase 2 hypothesis, never generic",
          },
        },
        required: ["name", "description", "rationale"],
        additionalProperties: false,
      },
    },
    editorial_calendar: {
      type: "array",
      items: {
        type: "object",
        properties: {
          day_offset: { type: "integer", description: "Days from today, 0-27" },
          platform: { type: "string" },
          pillar: { type: "string", description: "Must match one of the pillars' name field" },
          format: { type: "string" },
          working_title: { type: "string" },
          brief: { type: "string" },
        },
        required: ["day_offset", "platform", "pillar", "format", "working_title", "brief"],
        additionalProperties: false,
      },
    },
    trends_used: {
      type: "array",
      items: {
        type: "object",
        properties: {
          claim: { type: "string" },
          source_url: { type: "string" },
          source_title: { type: "string" },
          retrieved_at: { type: "string", description: "ISO date this was found via web search" },
        },
        required: ["claim", "source_url", "source_title", "retrieved_at"],
        additionalProperties: false,
      },
    },
    summary: { type: "string" },
  },
  required: ["pillars", "editorial_calendar", "trends_used", "summary"],
  additionalProperties: false,
} as const;

const STRATEGY_SYSTEM_PROMPT = `Tu es l'agent Phase 3 (Stratégie de contenu) de la plateforme GLN Digital.

SCOPE STRICT : tu proposes des piliers de contenu et un calendrier éditorial de 4 semaines (environ 2 à 3 publications par semaine) à partir (1) des données factuelles Phase 1 et (2) d'un diagnostic Phase 2 déjà validé par un humain. Tu ne rédiges AUCUN texte de publication, script ou visuel — ce n'est pas ton rôle (Phase 4).

RÈGLES OBLIGATOIRES (anti-hallucination, non négociables) :
1. Chaque pilier de contenu doit être explicitement relié à une donnée Phase 1 ou une hypothèse du diagnostic Phase 2 fourni (champ "rationale").
2. INTERDICTION ABSOLUE de citer une "tendance actuelle" sans avoir réellement effectué une recherche web via l'outil de recherche fourni — jamais depuis ta mémoire d'entraînement. Chaque tendance utilisée doit apparaître dans "trends_used" avec son URL source réelle et sa date de récupération.
3. AUCUNE référence à un concurrent : aucune donnée concurrentielle n'a été collectée en Phase 1 pour ce compte — n'invente jamais de comparaison avec un concurrent.
4. Le calendrier doit couvrir exactement 4 semaines (day_offset de 0 à 27), avec environ 2 à 3 publications par semaine, pas plus.
5. Chaque entrée du calendrier doit référencer un pilier existant (même valeur que le champ "name" d'un pilier).

Réponds uniquement dans le format JSON structuré demandé.`;

export async function generateContentStrategy(
  metricsSummaryText: string,
  diagnosticSummaryText: string,
  platform: string,
  accountHandle: string,
): Promise<StrategyResult> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    return { ok: false, error: "ANTHROPIC_API_KEY non configurée côté serveur." };
  }

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 5 }],
      output_config: {
        effort: "high",
        format: { type: "json_schema", schema: STRATEGY_SCHEMA },
      },
      system: STRATEGY_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content:
            `Compte : ${accountHandle} (${platform})\n\n` +
            `Données factuelles Phase 1 :\n${metricsSummaryText}\n\n` +
            `Diagnostic Phase 2 (validé par un humain) :\n${diagnosticSummaryText}\n\n` +
            `Recherche les tendances réelles et actuelles pertinentes pour ce secteur/cette plateforme ` +
            `avant de construire la stratégie.`,
        },
      ],
    });

    if (response.stop_reason === "refusal") {
      return { ok: false, error: "Requête refusée par les filtres de sécurité du modèle." };
    }
    if (response.stop_reason === "pause_turn") {
      return {
        ok: false,
        error: "La recherche web a dépassé la limite d'itérations du modèle — réessaie.",
        raw_response: response,
      };
    }

    // Multiple text blocks can appear when the model narrates between web
    // searches — the final JSON answer is the LAST text block, not the
    // first (unlike generateDiagnostic above, which never uses tools and
    // so never has this ambiguity).
    const textBlocks = response.content.filter(
      (b): b is Anthropic.TextBlock => b.type === "text",
    );
    const textBlock = textBlocks[textBlocks.length - 1];
    if (!textBlock) {
      return { ok: false, error: "Réponse du modèle sans contenu texte exploitable.", raw_response: response };
    }

    let payload: StrategyPayload;
    try {
      payload = JSON.parse(textBlock.text);
    } catch {
      return { ok: false, error: "Réponse du modèle non conforme au JSON attendu.", raw_response: textBlock.text };
    }

    return { ok: true, payload, raw_response: response };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}
