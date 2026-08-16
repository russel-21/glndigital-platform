// Claude (Anthropic) adapter for the competitive-brief edge function —
// deliberately a SEPARATE file from claudeClient.ts, which is documented
// as serving only the 7-phase agents (Phase 2/3/4a). This brief generator
// is explicitly NOT one of the 7 phases — see
// DECISIONS-VEILLE-CONCURRENTIELLE.md for the full context and what was
// abandoned.
//
// SCOPE (strict):
//   - Input: a competitor name + optional admin-provided notes (research
//     already gathered manually, e.g. via AdWhispr — this module never
//     calls any Meta/TikTok Ad Library API itself).
//   - Output: an exportable brief + the real, timestamped web sources used
//     — same sourcing discipline as generateContentStrategy() in
//     claudeClient.ts (Phase 3).
//   - INTERDICTION ABSOLUE d'afficher un budget publicitaire ou une
//     performance de campagne comme un fait : per
//     DECISIONS-VEILLE-CONCURRENTIELLE.md, Meta ne fournit pas ces données
//     pour les pubs commerciales hors UE/UK, donc toute valeur de ce type
//     serait une invention. If admin_notes happens to mention such a
//     figure, the brief may relay it as "selon les notes fournies", never
//     as a source-verified fact.
//   - Never claims to have queried a Meta/TikTok Ad Library directly —
//     this module has no such access (see DECISIONS-VEILLE-CONCURRENTIELLE.md).

import Anthropic from "npm:@anthropic-ai/sdk";

const MODEL = "claude-sonnet-5";

export interface BriefSource {
  claim: string;
  source_url: string;
  source_title: string;
  retrieved_at: string;
}

export interface CompetitiveBriefPayload {
  brief_content: string;
  sources: BriefSource[];
}

export interface CompetitiveBriefResult {
  ok: boolean;
  payload?: CompetitiveBriefPayload;
  raw_response?: unknown;
  error?: string;
}

const BRIEF_SCHEMA = {
  type: "object",
  properties: {
    brief_content: {
      type: "string",
      description: "The exportable brief itself, in French, structured with clear sections (positioning, public messaging, notable observations)",
    },
    sources: {
      type: "array",
      items: {
        type: "object",
        properties: {
          claim: { type: "string" },
          source_url: { type: "string" },
          source_title: { type: "string" },
          retrieved_at: { type: "string" },
        },
        required: ["claim", "source_url", "source_title", "retrieved_at"],
        additionalProperties: false,
      },
    },
  },
  required: ["brief_content", "sources"],
  additionalProperties: false,
} as const;

const BRIEF_SYSTEM_PROMPT = `Tu es l'agent de génération de brief concurrentiel publicitaire de GLN Digital — une brique séparée des 7 phases d'automatisation réseaux sociaux, pas l'une d'elles.

SCOPE STRICT : tu rédiges un brief exportable sur le positionnement marketing public d'un concurrent, à partir (1) des notes fournies par l'admin (recherche déjà faite manuellement, ex. via un outil comme AdWhispr) et (2) d'une vraie recherche web que tu effectues toi-même.

RÈGLES OBLIGATOIRES (anti-hallucination, non négociables) :
1. Tu n'as AUCUN accès direct à une bibliothèque de publicités Meta ou TikTok — ne prétends jamais avoir consulté leurs publicités directement. Base-toi uniquement sur les notes admin fournies et sur de vraies recherches web (positionnement public, site web, réseaux sociaux publics, articles).
2. INTERDICTION ABSOLUE de citer un budget publicitaire ou une performance de campagne comme un fait vérifié — ces données ne sont jamais disponibles publiquement. Si les notes admin mentionnent un chiffre de ce type, relaie-le explicitement comme "selon les notes fournies par l'équipe", jamais comme une donnée que tu as toi-même vérifiée.
3. Chaque affirmation factuelle doit venir soit des notes admin, soit d'une recherche web réelle que tu documentes dans "sources" avec URL et date de récupération — jamais de ta mémoire générale sur cette marque.
4. Si les notes admin et la recherche web ne donnent pas assez d'information, dis-le explicitement dans le brief plutôt que de combler les trous.

Réponds uniquement dans le format JSON structuré demandé.`;

export async function generateCompetitiveBrief(
  competitorName: string,
  adminNotes: string,
): Promise<CompetitiveBriefResult> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    return { ok: false, error: "ANTHROPIC_API_KEY non configurée côté serveur." };
  }

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 8000,
      thinking: { type: "adaptive" },
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 5 }],
      output_config: {
        effort: "high",
        format: { type: "json_schema", schema: BRIEF_SCHEMA },
      },
      system: BRIEF_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content:
            `Concurrent : ${competitorName}\n\n` +
            `Notes fournies par l'admin (recherche déjà faite manuellement) :\n${adminNotes || "Aucune note fournie."}\n\n` +
            `Recherche des informations publiques réelles sur ce concurrent avant de rédiger le brief.`,
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

    const textBlocks = response.content.filter(
      (b): b is Anthropic.TextBlock => b.type === "text",
    );
    const textBlock = textBlocks[textBlocks.length - 1];
    if (!textBlock) {
      return { ok: false, error: "Réponse du modèle sans contenu texte exploitable.", raw_response: response };
    }

    let payload: CompetitiveBriefPayload;
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
