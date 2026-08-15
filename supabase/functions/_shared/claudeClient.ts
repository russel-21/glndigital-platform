// Claude (Anthropic) adapter — Phase 2 (Diagnostic) agent's only AI call site.
//
// SCOPE (strict — do not extend without explicit validation from Russel):
//   - Input: a text summary of Phase 1 factual metrics + at least one
//     admin-uploaded screenshot.
//   - Output: a structured diagnostic (hypotheses with explicit confidence
//     levels + a list of missing data), nothing else. No scoring, no
//     recommendations, no content generation — that's later phases.
//   - Every hypothesis must be traceable to a specific Phase 1 field or a
//     screenshot observation (`based_on`), never asserted as fact. See
//     CLAUDE.md, "Feature en cours de cadrage", rule 4 (Phase 2).
//
// Model: claude-sonnet-5 — chosen for cost, since this runs on every
// admin-triggered diagnostic rather than as a one-off task: ~$3/$15 per
// million tokens (input/output), $2/$10 introductory through 2026-08-31,
// vs. ~$5/$25 for claude-opus-5. Vision-capable (high-resolution image
// input) and supports schema-constrained JSON output. To use Opus instead
// (higher quality, ~1.7x the cost), change MODEL below — nothing else in
// this file or its caller needs to change.

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
