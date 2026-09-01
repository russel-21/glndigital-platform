// Client self-service dashboard — see CLAUDE.md's "Feature en cours de
// cadrage" client-role plan (2026-08-31). Auth-gated to a real Supabase
// session (any role can land here technically, but only current_role ===
// "client" users are ever routed here — see Auth.tsx/AuthCallback.tsx/
// Navbar.tsx). Every read/write below relies on RLS
// (20260831160000_add_client_role.sql) to actually enforce that a client
// only ever sees/touches their OWN social_connections and everything
// hanging off them — this page does not re-implement that scoping.
//
// SCOPE: connect a social account (real Zernio OAuth, via zernio-connect),
// then read the full 7-phase pipeline for it, with two real actions —
// triggering Phase 2/3/4a generation (each behind a cost quote/accept gate,
// see QuotedActionButton below) and approving/rejecting Phase 3 strategies
// and Phase 4a drafts. Phase 4b/5/6/7 are read-only here — the client sees
// them but never triggers or approves anything there in this pass.

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Facebook, Instagram, Youtube, Music2, RefreshCw, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  type Platform,
  type SocialConnection,
  type AuditSnapshot,
  PLATFORM_LABELS,
  fetchSocialConnections,
  createSocialConnection,
  updateBrandBrief,
  fetchAuditSnapshots,
  triggerPhase1Audit,
} from "@/lib/phase1AuditStore";
import {
  type Diagnostic,
  type DiagnosticScreenshot,
  fetchDiagnostics,
  fetchDiagnosticScreenshots,
  uploadDiagnosticScreenshot,
  triggerPhase2Diagnostic,
} from "@/lib/phase2DiagnosticStore";
import {
  type ContentStrategy,
  fetchContentStrategies,
  triggerPhase3Strategy,
  reviewContentStrategy,
} from "@/lib/phase3StrategyStore";
import {
  type ContentDraft,
  fetchContentDrafts,
  triggerPhase4aDraft,
  reviewContentDraft,
} from "@/lib/phase4aTextStore";
import { type Phase4bVisualJob, PHASE4B_OPERATION_LABELS, PHASE4B_STATUS_LABELS, fetchPhase4bJobs } from "@/lib/phase4bVisualStore";
import { type ScheduledPublication, fetchScheduledPublications } from "@/lib/phase5PublishStore";
import { type EngagementItem, fetchEngagementItems } from "@/lib/phase6EngagementStore";
import { type PerformanceAnalysis, fetchPerformanceAnalyses } from "@/lib/phase7AnalysisStore";

const PLATFORM_ICONS: Record<Platform, typeof Facebook> = {
  meta_facebook: Facebook,
  meta_instagram: Instagram,
  tiktok: Music2,
  youtube: Youtube,
};

// ─── Cost quote gate — shared by every client-triggerable paid action ───
interface QuoteBreakdown {
  total_with_margin_usd: number;
  note?: string;
}
interface ActionQuote {
  id: string;
  estimated_cost_usd: number;
  cost_breakdown: QuoteBreakdown;
}

function QuotedActionButton({
  actionType,
  socialConnectionId,
  label,
  disabled,
  onAccepted,
}: {
  actionType: string;
  socialConnectionId: string;
  label: string;
  disabled?: boolean;
  onAccepted: () => Promise<void>;
}) {
  const [quote, setQuote] = useState<ActionQuote | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [running, setRunning] = useState(false);

  const requestQuote = async () => {
    setLoadingQuote(true);
    try {
      const { data, error } = await supabase.functions.invoke("get-action-quote", {
        body: { social_connection_id: socialConnectionId, action_type: actionType },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Devis refusé.");
      setQuote(data.quote as ActionQuote);
    } catch (e) {
      toast.error((e as Error).message || "Impossible d'obtenir un devis.");
    } finally {
      setLoadingQuote(false);
    }
  };

  const accept = async () => {
    if (!quote) return;
    setRunning(true);
    try {
      const { error: acceptError } = await supabase
        .from("client_action_quotes")
        .update({ accepted_at: new Date().toISOString() })
        .eq("id", quote.id);
      if (acceptError) throw acceptError;
      await onAccepted();
      setQuote(null);
    } catch (e) {
      toast.error((e as Error).message || "Erreur lors de l'exécution.");
    } finally {
      setRunning(false);
    }
  };

  if (quote) {
    return (
      <div className="p-3 rounded-xl bg-secondary/40 border border-primary/30 space-y-2">
        <p className="text-xs text-foreground">
          Coût estimé : <strong className="text-primary">${quote.estimated_cost_usd.toFixed(4)}</strong>
        </p>
        <p className="text-[10px] text-muted-foreground">
          {quote.cost_breakdown?.note || "Estimation avant exécution — le coût réel peut varier légèrement."}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={accept}
            disabled={running}
            className="bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-[11px] font-bold disabled:opacity-50"
          >
            {running ? "En cours..." : "J'accepte et je lance"}
          </button>
          <button
            type="button"
            onClick={() => setQuote(null)}
            className="text-[11px] text-muted-foreground hover:text-foreground px-2"
          >
            Annuler
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={requestQuote}
      disabled={disabled || loadingQuote}
      className="bg-secondary hover:bg-secondary/70 border border-border px-3 py-1.5 rounded-lg text-[11px] font-bold text-foreground disabled:opacity-50 flex items-center gap-1.5"
    >
      {loadingQuote && <Loader2 className="w-3 h-3 animate-spin" />}
      {label}
    </button>
  );
}

// ─── Main page ───

const DashboardClient = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{ id: string; full_name: string | null } | null>(null);

  const [connections, setConnections] = useState<SocialConnection[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [brandBrief, setBrandBrief] = useState("");
  const [savingBrief, setSavingBrief] = useState(false);

  const [snapshots, setSnapshots] = useState<AuditSnapshot[]>([]);
  const [screenshots, setScreenshots] = useState<DiagnosticScreenshot[]>([]);
  const [selectedScreenshotIds, setSelectedScreenshotIds] = useState<string[]>([]);
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);
  const [strategies, setStrategies] = useState<ContentStrategy[]>([]);
  const [drafts, setDrafts] = useState<ContentDraft[]>([]);
  const [visualJobs, setVisualJobs] = useState<Phase4bVisualJob[]>([]);
  const [publications, setPublications] = useState<ScheduledPublication[]>([]);
  const [engagementItems, setEngagementItems] = useState<EngagementItem[]>([]);
  const [analyses, setAnalyses] = useState<PerformanceAnalysis[]>([]);

  const selectedConnection = connections.find((c) => c.id === selectedId) || null;
  const latestApprovedStrategy = strategies.find((s) => s.review_status === "approved") || null;

  // ─── Auth check + Zernio OAuth callback handling ───
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Veuillez vous connecter pour accéder à votre espace client.");
        navigate("/auth");
        return;
      }

      const { data: userProfile, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("id", session.user.id)
        .single();
      if (error || !userProfile) {
        navigate("/auth-callback");
        return;
      }
      setProfile(userProfile);

      // Zernio redirects back here with these query params on a successful
      // connect (standard, non-headless flow — see zernio-connect's
      // header comment). No server-side exchange step needed.
      const params = new URLSearchParams(window.location.search);
      const connected = params.get("connected");
      const accountId = params.get("accountId");
      const username = params.get("username");
      if (connected && accountId) {
        try {
          const platform = ZERNIO_SLUG_TO_PLATFORM[connected];
          if (platform) {
            await createSocialConnection({
              platform,
              account_handle: username || accountId,
              zernio_account_id: accountId,
              client_profile_id: session.user.id,
            });
            toast.success(`Compte ${PLATFORM_LABELS[platform]} connecté avec succès !`);
          }
        } catch (e) {
          toast.error((e as Error).message || "Échec de l'enregistrement de la connexion.");
        }
        // Clean the URL so a refresh doesn't try to re-process it.
        window.history.replaceState({}, "", "/client-dashboard");
      }
      const errorParam = params.get("error");
      if (errorParam) {
        toast.error(`Échec de la connexion du compte (${errorParam}).`);
        window.history.replaceState({}, "", "/client-dashboard");
      }

      await refreshConnections();
      setLoading(false);
    };
    void init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshConnections = async () => {
    try {
      const rows = await fetchSocialConnections();
      setConnections(rows);
      if (rows.length > 0) {
        setSelectedId((current) => current ?? rows[0].id);
      }
    } catch (e) {
      toast.error((e as Error).message || "Impossible de charger vos comptes.");
    }
  };

  // ─── Load everything for the selected connection ───
  const loadConnectionData = useCallback(async (connectionId: string) => {
    try {
      const [snap, shots, diags, strats, jobs, pubs, engagement, perf] = await Promise.all([
        fetchAuditSnapshots(connectionId),
        fetchDiagnosticScreenshots(connectionId),
        fetchDiagnostics(connectionId),
        fetchContentStrategies(connectionId),
        fetchPhase4bJobs(connectionId),
        fetchScheduledPublications(connectionId),
        fetchEngagementItems(connectionId),
        fetchPerformanceAnalyses(connectionId),
      ]);
      setSnapshots(snap);
      setScreenshots(shots);
      setDiagnostics(diags);
      setStrategies(strats);
      setVisualJobs(jobs);
      setPublications(pubs);
      setEngagementItems(engagement);
      setAnalyses(perf);
      setSelectedScreenshotIds([]);
    } catch (e) {
      toast.error((e as Error).message || "Impossible de charger les données de ce compte.");
    }
  }, []);

  useEffect(() => {
    if (selectedConnection) {
      setBrandBrief(selectedConnection.brand_brief || "");
      void loadConnectionData(selectedConnection.id);
      setDrafts([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConnection?.id]);

  useEffect(() => {
    if (latestApprovedStrategy) {
      fetchContentDrafts(latestApprovedStrategy.id).then(setDrafts).catch(() => setDrafts([]));
    } else {
      setDrafts([]);
    }
  }, [latestApprovedStrategy]);

  // ─── Actions ───
  const handleConnect = async (platform: Platform) => {
    try {
      const { data, error } = await supabase.functions.invoke("zernio-connect", {
        body: { platform },
      });
      if (error) throw error;
      if (!data?.authUrl) throw new Error(data?.error || "Aucune URL de connexion reçue.");
      window.location.href = data.authUrl;
    } catch (e) {
      toast.error((e as Error).message || "Impossible de démarrer la connexion.");
    }
  };

  const handleSaveBrief = async () => {
    if (!selectedConnection) return;
    setSavingBrief(true);
    try {
      await updateBrandBrief(selectedConnection.id, brandBrief);
      toast.success("Brief de marque enregistré.");
      await refreshConnections();
    } catch (e) {
      toast.error((e as Error).message || "Échec de l'enregistrement.");
    } finally {
      setSavingBrief(false);
    }
  };

  const handleTriggerAudit = async () => {
    if (!selectedConnection) return;
    try {
      const result = await triggerPhase1Audit(selectedConnection.id);
      if (!result.ok) throw new Error(result.error || "Échec de l'audit.");
      toast.success("Audit lancé avec succès.");
      await loadConnectionData(selectedConnection.id);
    } catch (e) {
      toast.error((e as Error).message || "Échec de l'audit.");
    }
  };

  const handleUploadScreenshot = async (file: File) => {
    if (!selectedConnection) return;
    try {
      await uploadDiagnosticScreenshot(selectedConnection.id, file, file.name);
      toast.success("Capture ajoutée.");
      await loadConnectionData(selectedConnection.id);
    } catch (e) {
      toast.error((e as Error).message || "Échec de l'envoi de la capture.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 bg-background">
      <div className="container mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-foreground">
            Espace Client{profile?.full_name ? ` — ${profile.full_name}` : ""}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Connecte tes réseaux sociaux et suis leur gestion par GLN Digital.
          </p>
        </div>

        {/* ─── Connect / select account ─── */}
        <div className="stable-surface p-5 rounded-2xl bg-card border border-border/60 space-y-4">
          <h2 className="text-sm font-bold text-foreground">Mes comptes connectés</h2>

          {connections.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {connections.map((c) => {
                const Icon = PLATFORM_ICONS[c.platform];
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedId(c.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                      selectedId === c.id
                        ? "bg-primary border-primary text-primary-foreground"
                        : "bg-secondary border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {PLATFORM_LABELS[c.platform]} — {c.account_handle}
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2 border-t border-border/40">
            {(["meta_facebook", "meta_instagram", "tiktok", "youtube"] as Platform[]).map((p) => {
              const Icon = PLATFORM_ICONS[p];
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleConnect(p)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold bg-secondary hover:bg-secondary/70 border border-border text-foreground"
                >
                  <Icon className="w-3.5 h-3.5" />
                  Connecter {PLATFORM_LABELS[p]}
                </button>
              );
            })}
          </div>
        </div>

        {selectedConnection && (
          <>
            {/* ─── Brand brief ─── */}
            <div className="stable-surface p-5 rounded-2xl bg-card border border-border/60 space-y-3">
              <h2 className="text-sm font-bold text-foreground">Brief de marque</h2>
              <p className="text-[11px] text-muted-foreground">
                Toute information utilisée pour rédiger du contenu à ton nom vient de ce texte — jamais inventée.
              </p>
              <textarea
                value={brandBrief}
                onChange={(e) => setBrandBrief(e.target.value)}
                rows={4}
                className="w-full bg-secondary border border-border rounded-xl p-3 text-xs text-foreground focus:outline-none focus:border-primary"
                placeholder="Ex : notre entreprise vend..., notre ton est..., nos offres sont..."
              />
              <button
                type="button"
                onClick={handleSaveBrief}
                disabled={savingBrief}
                className="bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-[11px] font-bold disabled:opacity-50"
              >
                {savingBrief ? "Enregistrement..." : "Enregistrer le brief"}
              </button>
            </div>

            {/* ─── Phase 1 — Audit ─── */}
            <Section title="Phase 1 — Audit">
              <button
                type="button"
                onClick={handleTriggerAudit}
                className="bg-secondary hover:bg-secondary/70 border border-border px-3 py-1.5 rounded-lg text-[11px] font-bold text-foreground flex items-center gap-1.5 mb-3"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Lancer un audit
              </button>
              {snapshots.length === 0 ? (
                <Empty text="Aucun audit pour l'instant." />
              ) : (
                <SnapshotCard snapshot={snapshots[0]} />
              )}
            </Section>

            {/* ─── Phase 2 — Diagnostic ─── */}
            <Section title="Phase 2 — Diagnostic">
              <div className="space-y-2 mb-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files?.[0] && handleUploadScreenshot(e.target.files[0])}
                  className="text-[11px] text-muted-foreground"
                />
                {screenshots.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {screenshots.map((s) => (
                      <label key={s.id} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={selectedScreenshotIds.includes(s.id)}
                          onChange={(e) =>
                            setSelectedScreenshotIds((prev) =>
                              e.target.checked ? [...prev, s.id] : prev.filter((id) => id !== s.id),
                            )
                          }
                        />
                        {s.label}
                      </label>
                    ))}
                  </div>
                )}
                <QuotedActionButton
                  actionType="phase2_diagnostic"
                  socialConnectionId={selectedConnection.id}
                  label="Générer un diagnostic"
                  disabled={selectedScreenshotIds.length === 0}
                  onAccepted={async () => {
                    const result = await triggerPhase2Diagnostic(selectedConnection.id, selectedScreenshotIds);
                    if (!result.ok) throw new Error(result.error || "Échec du diagnostic.");
                    toast.success("Diagnostic généré.");
                    await loadConnectionData(selectedConnection.id);
                  }}
                />
              </div>
              {diagnostics.length === 0 ? (
                <Empty text="Aucun diagnostic pour l'instant." />
              ) : (
                <DiagnosticCard diagnostic={diagnostics[0]} />
              )}
            </Section>

            {/* ─── Phase 3 — Stratégie ─── */}
            <Section title="Phase 3 — Stratégie de contenu">
              <div className="mb-3">
                <QuotedActionButton
                  actionType="phase3_strategy"
                  socialConnectionId={selectedConnection.id}
                  label="Générer une stratégie"
                  disabled={!diagnostics.some((d) => d.review_status === "approved")}
                  onAccepted={async () => {
                    const result = await triggerPhase3Strategy(selectedConnection.id);
                    if (!result.ok) throw new Error(result.error || "Échec de la génération.");
                    toast.success("Stratégie générée.");
                    await loadConnectionData(selectedConnection.id);
                  }}
                />
                {!diagnostics.some((d) => d.review_status === "approved") && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Un diagnostic approuvé par GLN Digital est requis avant de générer une stratégie.
                  </p>
                )}
              </div>
              {strategies.length === 0 ? (
                <Empty text="Aucune stratégie pour l'instant." />
              ) : (
                <StrategyCard
                  strategy={strategies[0]}
                  onReview={async (decision) => {
                    await reviewContentStrategy(strategies[0].id, decision);
                    toast.success(decision === "approved" ? "Stratégie approuvée." : "Stratégie rejetée.");
                    await loadConnectionData(selectedConnection.id);
                  }}
                />
              )}
            </Section>

            {/* ─── Phase 4a — Production texte ─── */}
            <Section title="Phase 4a — Production texte">
              {!latestApprovedStrategy ? (
                <Empty text="Approuve une stratégie (Phase 3) pour générer des textes." />
              ) : !selectedConnection.brand_brief?.trim() ? (
                <Empty text="Renseigne un brief de marque ci-dessus avant de générer du texte." />
              ) : (
                <div className="space-y-3">
                  {(latestApprovedStrategy.editorial_calendar || []).map((entry, idx) => {
                    const existingDraft = drafts.find((d) => d.calendar_entry_index === idx);
                    return (
                      <div key={idx} className="p-3 rounded-xl bg-secondary/20 border border-border/40 space-y-2">
                        <p className="text-xs font-bold text-foreground">
                          J+{entry.day_offset} — {entry.platform} — {entry.working_title}
                        </p>
                        {existingDraft ? (
                          <DraftCard
                            draft={existingDraft}
                            onReview={async (decision) => {
                              await reviewContentDraft(existingDraft.id, decision);
                              toast.success(decision === "approved" ? "Texte approuvé." : "Texte rejeté.");
                              await loadConnectionData(selectedConnection.id);
                            }}
                          />
                        ) : (
                          <QuotedActionButton
                            actionType="phase4a_text"
                            socialConnectionId={selectedConnection.id}
                            label="Générer le texte"
                            onAccepted={async () => {
                              const result = await triggerPhase4aDraft(selectedConnection.id, latestApprovedStrategy.id, idx);
                              if (!result.ok) throw new Error(result.error || "Échec de la génération.");
                              toast.success("Texte généré.");
                              const refreshed = await fetchContentDrafts(latestApprovedStrategy.id);
                              setDrafts(refreshed);
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Section>

            {/* ─── Phase 4b — Production visuelle/vidéo (lecture seule) ─── */}
            <Section title="Phase 4b — Production visuelle/vidéo">
              <p className="text-[10px] text-muted-foreground mb-2">
                Déclenchée par l'équipe GLN Digital pour l'instant — tu vois ici l'avancement.
              </p>
              {visualJobs.length === 0 ? (
                <Empty text="Aucun traitement visuel pour l'instant." />
              ) : (
                <div className="space-y-2">
                  {visualJobs.map((job) => (
                    <div key={job.id} className="p-2.5 rounded-xl bg-secondary/20 border border-border/40 text-xs">
                      {PHASE4B_OPERATION_LABELS[job.operation_type]} — {PHASE4B_STATUS_LABELS[job.status]}
                      {job.is_mock && <span className="ml-2 text-[9px] text-amber-500 font-bold">MOCK</span>}
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* ─── Phase 5 — Publication (lecture seule) ─── */}
            <Section title="Phase 5 — Publication">
              {publications.length === 0 ? (
                <Empty text="Aucune publication programmée pour l'instant." />
              ) : (
                <div className="space-y-2">
                  {publications.map((pub) => (
                    <div key={pub.id} className="p-2.5 rounded-xl bg-secondary/20 border border-border/40 text-xs">
                      {pub.content_snapshot.calendar_working_title} —{" "}
                      {new Date(pub.scheduled_at).toLocaleString("fr-FR")} — {pub.status}
                      {pub.is_mock && <span className="ml-2 text-[9px] text-amber-500 font-bold">MOCK</span>}
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* ─── Phase 6 — Engagement (lecture seule) ─── */}
            <Section title="Phase 6 — Engagement">
              {engagementItems.length === 0 ? (
                <Empty text="Aucun commentaire/message détecté pour l'instant." />
              ) : (
                <div className="space-y-2">
                  {engagementItems.map((item) => (
                    <div
                      key={item.id}
                      className={`p-2.5 rounded-xl border text-xs ${
                        item.needs_response ? "bg-primary/10 border-primary/30" : "bg-secondary/20 border-border/40"
                      }`}
                    >
                      <span className="font-semibold">{item.author_handle || "Anonyme"}</span> : {item.content}
                      {item.needs_response && (
                        <span className="ml-2 text-[9px] text-primary font-bold uppercase">Réponse nécessaire</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* ─── Phase 7 — Analyse (lecture seule) ─── */}
            <Section title="Phase 7 — Analyse">
              {analyses.length === 0 ? (
                <Empty text="Aucune analyse pour l'instant." />
              ) : (
                <div className="space-y-2">
                  {analyses.map((a) => (
                    <div key={a.id} className="p-2.5 rounded-xl bg-secondary/20 border border-border/40 text-xs space-y-1">
                      <p>{a.analysis_summary}</p>
                      {a.correlation_note && <p className="text-muted-foreground italic">{a.correlation_note}</p>}
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </>
        )}
      </div>
    </div>
  );
};

const ZERNIO_SLUG_TO_PLATFORM: Record<string, Platform> = {
  facebook: "meta_facebook",
  instagram: "meta_instagram",
  tiktok: "tiktok",
  youtube: "youtube",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="stable-surface p-5 rounded-2xl bg-card border border-border/60"
    >
      <h2 className="text-sm font-bold text-foreground mb-3">{title}</h2>
      {children}
    </motion.div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-xs text-muted-foreground">{text}</p>;
}

function SnapshotCard({ snapshot }: { snapshot: AuditSnapshot }) {
  return (
    <div className="p-3 rounded-xl bg-secondary/20 border border-border/40 text-xs space-y-1">
      <p className="text-muted-foreground">
        Source : {snapshot.source} — {new Date(snapshot.extracted_at).toLocaleString("fr-FR")}
        {snapshot.is_mock && <span className="ml-2 text-[9px] text-amber-500 font-bold">MOCK</span>}
      </p>
      {snapshot.metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          <Metric label="Abonnés" value={snapshot.metrics.followers_count} />
          <Metric label="Abonnements" value={snapshot.metrics.following_count} />
          <Metric label="Publications" value={snapshot.metrics.posts_count} />
          <Metric label="Vérifié" value={snapshot.metrics.verified} />
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: unknown }) {
  return (
    <div>
      <p className="text-[9px] text-muted-foreground uppercase">{label}</p>
      <p className="text-xs font-bold text-foreground">{String(value)}</p>
    </div>
  );
}

function DiagnosticCard({ diagnostic }: { diagnostic: Diagnostic }) {
  return (
    <div className="p-3 rounded-xl bg-secondary/20 border border-border/40 text-xs space-y-2">
      <p className="text-muted-foreground">
        {new Date(diagnostic.created_at).toLocaleString("fr-FR")}
        {diagnostic.is_mock && <span className="ml-2 text-[9px] text-amber-500 font-bold">MOCK</span>}
      </p>
      {diagnostic.summary && <p>{diagnostic.summary}</p>}
      {diagnostic.hypotheses?.map((h, i) => (
        <div key={i} className="pl-2 border-l-2 border-primary/40">
          <p>{h.statement}</p>
          <p className="text-[10px] text-muted-foreground">Confiance : {h.confidence}</p>
        </div>
      ))}
    </div>
  );
}

function StrategyCard({
  strategy,
  onReview,
}: {
  strategy: ContentStrategy;
  onReview: (decision: "approved" | "rejected") => Promise<void>;
}) {
  return (
    <div className="p-3 rounded-xl bg-secondary/20 border border-border/40 text-xs space-y-2">
      <p className="text-muted-foreground">
        {new Date(strategy.created_at).toLocaleString("fr-FR")} — statut : {strategy.review_status}
        {strategy.is_mock && <span className="ml-2 text-[9px] text-amber-500 font-bold">MOCK</span>}
      </p>
      {strategy.summary && <p>{strategy.summary}</p>}
      {strategy.pillars?.map((p, i) => (
        <div key={i} className="pl-2 border-l-2 border-primary/40">
          <p className="font-semibold">{p.name}</p>
          <p className="text-muted-foreground">{p.description}</p>
        </div>
      ))}
      {strategy.review_status === "pending_review" && (
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={() => onReview("approved")}
            className="flex items-center gap-1 bg-green-600/20 text-green-500 border border-green-600/30 px-2.5 py-1 rounded-lg text-[11px] font-bold"
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Approuver
          </button>
          <button
            type="button"
            onClick={() => onReview("rejected")}
            className="flex items-center gap-1 bg-red-600/20 text-red-500 border border-red-600/30 px-2.5 py-1 rounded-lg text-[11px] font-bold"
          >
            <XCircle className="w-3.5 h-3.5" /> Rejeter
          </button>
        </div>
      )}
    </div>
  );
}

function DraftCard({
  draft,
  onReview,
}: {
  draft: ContentDraft;
  onReview: (decision: "approved" | "rejected") => Promise<void>;
}) {
  return (
    <div className="space-y-1.5">
      {draft.hook && <p className="font-semibold">{draft.hook}</p>}
      {draft.caption && <p className="text-muted-foreground">{draft.caption}</p>}
      <p className="text-[10px] text-muted-foreground">Statut : {draft.review_status}</p>
      {draft.review_status === "pending_review" && (
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={() => onReview("approved")}
            className="flex items-center gap-1 bg-green-600/20 text-green-500 border border-green-600/30 px-2.5 py-1 rounded-lg text-[11px] font-bold"
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Approuver
          </button>
          <button
            type="button"
            onClick={() => onReview("rejected")}
            className="flex items-center gap-1 bg-red-600/20 text-red-500 border border-red-600/30 px-2.5 py-1 rounded-lg text-[11px] font-bold"
          >
            <XCircle className="w-3.5 h-3.5" /> Rejeter
          </button>
        </div>
      )}
    </div>
  );
}

export default DashboardClient;
