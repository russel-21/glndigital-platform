import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Shield, BarChart2, Laptop, MessageCircle, AlertTriangle, Lightbulb, 
  ArrowLeft, Share2, Printer, CheckCircle, Info, Star, ThumbsUp, ThumbsDown, Globe, Target, Camera, Copy, Check
} from "lucide-react";
import { getAuditRequests, AuditRequest } from "@/lib/auditStore";
import { toast } from "sonner";

const AuditReportDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [request, setRequest] = useState<AuditRequest | null>(null);
  const [activeOnboardingTab, setActiveOnboardingTab] = useState<"facebook" | "analytics" | "searchconsole">("facebook");
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    toast.success(`${label} copié dans le presse-papier !`);
    setTimeout(() => setCopiedText(null), 2000);
  };

  useEffect(() => {
    if (!id) return;
    const all = getAuditRequests();
    const found = all.find((r) => r.id === id);
    if (found) {
      setRequest(found);
    } else {
      toast.error("Rapport d'audit introuvable.");
      navigate("/");
    }
  }, [id, navigate]);

  if (!request) {
    return (
      <div className="min-h-screen pt-32 pb-16 bg-background flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin mb-4"></div>
        <p className="text-muted-foreground text-sm">Chargement du rapport d'audit...</p>
      </div>
    );
  }

  const { report, clientName, companyName, auditTypes, createdAt, status } = request;

  if (status !== "completed" || !report) {
    return (
      <div className="min-h-screen pt-32 pb-16 bg-background container mx-auto px-4 max-w-3xl text-center space-y-6">
        <div className="p-8 rounded-3xl bg-card border border-border/60 shadow-glow space-y-4">
          <Info className="w-12 h-12 text-primary mx-auto" />
          <h2 className="font-heading text-2xl font-bold text-foreground">Audit en cours de traitement</h2>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
            L'audit demandé pour <strong>{companyName || clientName}</strong> est actuellement en cours d'analyse par nos experts.
            Vous serez notifié dès que votre rapport détaillé sera disponible.
          </p>
          <div className="pt-4">
            <Link to="/" className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:underline">
              <ArrowLeft className="w-4 h-4" />
              Retour à l'accueil
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isExpressAudit = report.visibilityScore !== undefined;

  // Calculate scores for standard grid audit
  const getGridAverage = (grid: any) => {
    if (!grid) return 0;
    const values = Object.values(grid) as { score: number }[];
    if (values.length === 0) return 0;
    const sum = values.reduce((acc, curr) => acc + curr.score, 0);
    return Math.round((sum / values.length) * 10) / 10;
  };

  const socialAvg = getGridAverage(report.socialGrid);
  const adsAvg = getGridAverage(report.adsGrid);
  const webAvg = getGridAverage(report.webGrid);
  const businessAvg = getGridAverage(report.businessGrid);

  const activeAvgs = [
    auditTypes.includes("social") && socialAvg ? socialAvg : null,
    auditTypes.includes("ads") && adsAvg ? adsAvg : null,
    auditTypes.includes("web") && webAvg ? webAvg : null,
    auditTypes.includes("business") && businessAvg ? businessAvg : null,
  ].filter((v) => v !== null) as number[];

  const globalScoreGrid = activeAvgs.length > 0 
    ? Math.round((activeAvgs.reduce((a, b) => a + b, 0) / activeAvgs.length) * 10) / 10
    : 0;

  // Express audit overall score out of 10
  const expressGlobalScore = isExpressAudit
    ? Math.round(((report.visibilityScore || 0) + (report.brandingScore || 0) + (report.conversionScore || 0)) / 3 * 10) / 10
    : 0;

  const getScoreColor = (score: number, max: 5 | 10 = 5) => {
    const ratio = score / max;
    if (ratio >= 0.8) return "text-green-400 border-green-500/20 bg-green-500/10";
    if (ratio >= 0.5) return "text-orange-400 border-orange-500/20 bg-orange-500/10";
    return "text-red-400 border-red-500/20 bg-red-500/10";
  };

  const getScoreProgressColor = (score: number, max: 5 | 10 = 5) => {
    const ratio = score / max;
    if (ratio >= 0.8) return "bg-green-500";
    if (ratio >= 0.5) return "bg-orange-500";
    return "bg-red-500";
  };

  const handleShare = () => {
    const shareUrl = window.location.href;
    const scoreStr = isExpressAudit ? `${expressGlobalScore}/10` : `${globalScoreGrid}/5`;
    const shareText = `Découvrez le rapport d'audit digital express pour ${companyName || clientName} sur GLN DIGITAL. Note : ${scoreStr}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText + "\n\n" + shareUrl)}`;
    window.open(whatsappUrl, "_blank");
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen pt-24 pb-16 bg-background relative overflow-hidden print:pt-4 print:pb-4 print:bg-white print:text-black">
      {/* Decorative Blurs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none print:hidden"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl pointer-events-none print:hidden"></div>

      <div className="container mx-auto px-4 md:px-8 max-w-5xl relative z-10">
        
        {/* Top Navigation */}
        <div className="flex justify-between items-center mb-8 print:hidden">
          <Link 
            to="/admin" 
            className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à l'administration
          </Link>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint} className="flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-xl bg-secondary/80 border border-border/80 text-foreground hover:bg-secondary transition-all">
              <Printer className="w-3.5 h-3.5" />
              Imprimer / PDF
            </button>
            <button onClick={handleShare} className="flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-xl bg-gradient-primary text-primary-foreground hover:opacity-90 transition-all shadow-glow">
              <Share2 className="w-3.5 h-3.5" />
              Partager
            </button>
          </div>
        </div>

        {/* Brand Header for Printing */}
        <div className="hidden print:flex items-center justify-between border-b border-gray-200 pb-6 mb-6">
          <div className="flex items-center gap-2">
            <span className="font-heading text-2xl font-black text-primary">GLN DIGITAL</span>
          </div>
          <div className="text-right text-xs text-gray-500">
            <p>{isExpressAudit ? "Audit Digital Express (10-15 min)" : "Rapport d'Audit de Performance"}</p>
            <p>Date : {new Date(createdAt).toLocaleDateString("fr-FR")}</p>
          </div>
        </div>

        {/* Header Overview Card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 bg-card border border-border/60 rounded-3xl p-6 md:p-8 flex flex-col justify-between shadow-glow print:border-gray-200 print:shadow-none print:bg-white">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-primary/10 text-primary text-[10px] font-bold px-3 py-1 rounded-full border border-primary/20 uppercase tracking-widest print:border-gray-200 print:text-black">
                  {isExpressAudit ? "Audit Express 10-15 min" : "Diagnostic Complet"}
                </span>
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                  Généré le {new Date(createdAt).toLocaleDateString("fr-FR")}
                </span>
              </div>
              <h1 className="font-heading text-3xl font-extrabold text-foreground print:text-black">
                {isExpressAudit ? "Diagnostic Express :" : "Audit Digital :"} <span className="text-gradient-primary print:text-black">{companyName || clientName}</span>
              </h1>
              {request.activitySector && (
                <p className="text-xs text-muted-foreground font-semibold">Secteur : {request.activitySector}</p>
              )}
              <p className="text-xs md:text-sm text-muted-foreground leading-relaxed print:text-black mt-2">
                {report.overallSummary || "Voici l'analyse rapide de votre présence digitale et nos recommandations prioritaires pour optimiser votre visibilité, votre image de marque et vos performances commerciales."}
              </p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 border-t border-border/40 pt-6 print:border-gray-200">
              <div>
                <span className="text-[9px] uppercase font-bold text-muted-foreground block">Client / Prospect</span>
                <span className="text-xs font-semibold text-foreground print:text-black">{clientName}</span>
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold text-muted-foreground block">WhatsApp Direct</span>
                <span className="text-xs font-semibold text-foreground print:text-black">{request.phone}</span>
              </div>
              {(request.facebookLink || request.instagramLink || request.tiktokLink || request.snapchatLink) && (
                <div>
                  <span className="text-[9px] uppercase font-bold text-muted-foreground block">Réseaux Sociaux</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {request.facebookLink && (
                      <a href={request.facebookLink} target="_blank" rel="noreferrer" className="px-2 py-0.5 rounded bg-secondary text-[10px] hover:text-primary transition-colors">FB</a>
                    )}
                    {request.instagramLink && (
                      <a href={request.instagramLink} target="_blank" rel="noreferrer" className="px-2 py-0.5 rounded bg-secondary text-[10px] hover:text-primary transition-colors">IG</a>
                    )}
                    {request.tiktokLink && (
                      <a href={request.tiktokLink} target="_blank" rel="noreferrer" className="px-2 py-0.5 rounded bg-secondary text-[10px] hover:text-primary transition-colors">TikTok</a>
                    )}
                    {request.snapchatLink && (
                      <a href={request.snapchatLink} target="_blank" rel="noreferrer" className="px-2 py-0.5 rounded bg-secondary text-[10px] hover:text-primary transition-colors">Snap</a>
                    )}
                  </div>
                </div>
              )}
              {(request.websiteUrl || request.googleAnalytics) && (
                <div>
                  <span className="text-[9px] uppercase font-bold text-muted-foreground block">Web & Analytics</span>
                  <div className="flex flex-col gap-0.5 mt-1 text-[10px]">
                    {request.websiteUrl && (
                      <a href={request.websiteUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline truncate block">Site Web</a>
                    )}
                    {request.googleAnalytics && (
                      <span className="text-foreground truncate block" title={request.googleAnalytics}>GA: {request.googleAnalytics}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Scores Overview Badge Card */}
          <div className="bg-card border border-border/60 rounded-3xl p-6 flex flex-col items-center justify-center text-center shadow-glow print:border-gray-200 print:shadow-none print:bg-white">
            <span className="text-[10px] font-bold uppercase text-muted-foreground mb-4">Note Globale</span>
            <div className="relative w-32 h-32 flex items-center justify-center rounded-full bg-secondary/30 border border-border/60 mb-4 print:border-gray-200">
              <div className="absolute inset-2 rounded-full border-2 border-dashed border-border/40 print:border-gray-200"></div>
              <div className="text-center z-10">
                <span className="text-4xl font-extrabold font-heading text-gradient-primary print:text-black">
                  {isExpressAudit ? expressGlobalScore : globalScoreGrid}
                </span>
                <span className="text-xs text-muted-foreground block">sur {isExpressAudit ? "10" : "5"}</span>
              </div>
            </div>
            
            <div className={`text-xs px-4 py-1.5 rounded-full border font-bold ${getScoreColor(isExpressAudit ? expressGlobalScore : globalScoreGrid, isExpressAudit ? 10 : 5)}`}>
              {isExpressAudit 
                ? (expressGlobalScore >= 8 ? "Excellente visibilité" : expressGlobalScore >= 5 ? "Améliorations requises" : "Présence critique")
                : (globalScoreGrid >= 4 ? "Performance Excellente" : globalScoreGrid >= 2.5 ? "Optimisations Requises" : "À refaire d'urgence")
              }
            </div>
          </div>
        </div>

        {/* Section: Express Audit Visual Scores / Grids */}
        {isExpressAudit ? (
          <div className="bg-card border border-border/60 rounded-3xl p-6 space-y-6 mb-8 print:border-gray-200 print:bg-white">
            <h3 className="font-heading font-bold text-sm text-foreground flex items-center gap-2 border-b border-border/40 pb-3 print:text-black">
              <BarChart2 className="w-5 h-5 text-primary" />
              Évaluation Express du Site & Réseaux Sociaux
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Visibility */}
              <div className="space-y-2 p-4 rounded-2xl bg-secondary/30 border border-border/40">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-muted-foreground">Visibilité</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded border ${getScoreColor(report.visibilityScore || 0, 10)}`}>
                    {report.visibilityScore}/10
                  </span>
                </div>
                <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                  <div className={`h-full ${getScoreProgressColor(report.visibilityScore || 0, 10)}`} style={{ width: `${((report.visibilityScore || 0) / 10) * 100}%` }}></div>
                </div>
                <p className="text-[10px] text-muted-foreground italic leading-relaxed pt-1">Analyse du référencement et de l'accessibilité sur Facebook, Instagram, TikTok et le Web.</p>
              </div>

              {/* Branding */}
              <div className="space-y-2 p-4 rounded-2xl bg-secondary/30 border border-border/40">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-muted-foreground">Branding / Image</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded border ${getScoreColor(report.brandingScore || 0, 10)}`}>
                    {report.brandingScore}/10
                  </span>
                </div>
                <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                  <div className={`h-full ${getScoreProgressColor(report.brandingScore || 0, 10)}`} style={{ width: `${((report.brandingScore || 0) / 10) * 100}%` }}></div>
                </div>
                <p className="text-[10px] text-muted-foreground italic leading-relaxed pt-1">Cohérence visuelle, qualité des visuels de profil/couverture, professionnalisme des bios.</p>
              </div>

              {/* Conversion */}
              <div className="space-y-2 p-4 rounded-2xl bg-secondary/30 border border-border/40">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-muted-foreground">Conversion</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded border ${getScoreColor(report.conversionScore || 0, 10)}`}>
                    {report.conversionScore}/10
                  </span>
                </div>
                <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                  <div className={`h-full ${getScoreProgressColor(report.conversionScore || 0, 10)}`} style={{ width: `${((report.conversionScore || 0) / 10) * 100}%` }}></div>
                </div>
                <p className="text-[10px] text-muted-foreground italic leading-relaxed pt-1">Clarté des appels à l'action (CTA), accessibilité de WhatsApp et fluidité des tunnels de vente.</p>
              </div>
            </div>

            {report.scoringChecklist && (
              <div className="mt-6 pt-6 border-t border-border/40 space-y-4">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Critères de l'Audit GLN (Détails de l'Évaluation Globale)</span>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-[10px]">
                  {/* Visibilité */}
                  <div className="space-y-2">
                    <span className="font-bold text-foreground print:text-black uppercase">Visibilité ({report.visibilityScore}/10)</span>
                    <ul className="space-y-1.5">
                      {[
                        { key: "fbActive", label: "Page Facebook active (+2 pts)" },
                        { key: "instaActive", label: "Instagram configuré (+2 pts)" },
                        { key: "tiktokActive", label: "TikTok/Shorts actif (+2 pts)" },
                        { key: "seoLocal", label: "SEO local / GMB actif (+2 pts)" },
                        { key: "reachGood", label: "Portée organique > 1k (+2 pts)" }
                      ].map((item) => {
                        const val = (report.scoringChecklist?.visibility as any)?.[item.key];
                        return (
                          <li key={item.key} className="flex items-center gap-1.5">
                            {val ? (
                              <span className="text-green-500 font-bold">✓</span>
                            ) : (
                              <span className="text-red-500 font-bold">✗</span>
                            )}
                            <span className={val ? "text-slate-300 print:text-black" : "text-muted-foreground line-through"}>{item.label}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  {/* Branding */}
                  <div className="space-y-2">
                    <span className="font-bold text-foreground print:text-black uppercase">Branding & Image ({report.brandingScore}/10)</span>
                    <ul className="space-y-1.5">
                      {[
                        { key: "coherentGraphics", label: "Charte graphique propre (+2 pts)" },
                        { key: "highQualityPhotos", label: "Photos réelles de qualité (+2 pts)" },
                        { key: "videoReelsUsed", label: "Format Reels régulier (+2 pts)" },
                        { key: "clearBio", label: "Bio & Promesse claires (+2 pts)" },
                        { key: "socialProof", label: "Avis clients & Preuves (+2 pts)" }
                      ].map((item) => {
                        const val = (report.scoringChecklist?.branding as any)?.[item.key];
                        return (
                          <li key={item.key} className="flex items-center gap-1.5">
                            {val ? (
                              <span className="text-green-500 font-bold">✓</span>
                            ) : (
                              <span className="text-red-500 font-bold">✗</span>
                            )}
                            <span className={val ? "text-slate-300 print:text-black" : "text-muted-foreground line-through"}>{item.label}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  {/* Conversion */}
                  <div className="space-y-2">
                    <span className="font-bold text-foreground print:text-black uppercase">Conversion ({report.conversionScore}/10)</span>
                    <ul className="space-y-1.5">
                      {[
                        { key: "whatsappCtaActive", label: "WhatsApp direct configuré (+2 pts)" },
                        { key: "linktreeCtaClear", label: "Tunnel Linktree de bio (+2 pts)" },
                        { key: "fastLandingPage", label: "Site rapide / Landing Page (+2 pts)" },
                        { key: "metaPixelInstalled", label: "Pixel Meta / Tag Google (+2 pts)" },
                        { key: "metaAdsCampaignActive", label: "Campagnes Meta Ads (+2 pts)" }
                      ].map((item) => {
                        const val = (report.scoringChecklist?.conversion as any)?.[item.key];
                        return (
                          <li key={item.key} className="flex items-center gap-1.5">
                            {val ? (
                              <span className="text-green-500 font-bold">✓</span>
                            ) : (
                              <span className="text-red-500 font-bold">✗</span>
                            )}
                            <span className={val ? "text-slate-300 print:text-black" : "text-muted-foreground line-through"}>{item.label}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Old Grid layout (For compatibility with custom audits) */
          <div className="space-y-6 mb-8">
            <h2 className="font-heading text-lg font-bold text-foreground flex items-center gap-2 print:text-black">
              <BarChart2 className="w-5 h-5 text-primary" />
              Analyse Détaillée par Canaux
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {auditTypes.includes("social") && report.socialGrid && (
                <div className="bg-card border border-border/60 rounded-3xl p-6 space-y-4 print:border-gray-200 print:bg-white">
                  <div className="flex justify-between items-center border-b border-border/40 pb-3">
                    <h3 className="font-heading font-bold text-sm text-foreground flex items-center gap-2">
                      <MessageCircle className="w-4 h-4 text-primary" /> Réseaux Sociaux
                    </h3>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded border ${getScoreColor(socialAvg, 5)}`}>{socialAvg}/5</span>
                  </div>
                  <div className="space-y-3 text-xs">
                    {Object.keys(report.socialGrid).map((key) => {
                      const item = (report.socialGrid as any)[key];
                      return (
                        <div key={key}>
                          <div className="flex justify-between text-[11px] mb-1">
                            <span className="font-semibold text-muted-foreground">{key === "profileBranding" ? "Branding" : key === "contentQuality" ? "Contenu" : key === "engagement" ? "Engagement" : "Conversion"}</span>
                            <span className="font-bold text-foreground">{item.score}/5</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground italic">{item.notes}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {auditTypes.includes("web") && report.webGrid && (
                <div className="bg-card border border-border/60 rounded-3xl p-6 space-y-4 print:border-gray-200 print:bg-white">
                  <div className="flex justify-between items-center border-b border-border/40 pb-3">
                    <h3 className="font-heading font-bold text-sm text-foreground flex items-center gap-2">
                      <Laptop className="w-4 h-4 text-blue-500" /> Site Web & Performance
                    </h3>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded border ${getScoreColor(webAvg, 5)}`}>{webAvg}/5</span>
                  </div>
                  <div className="space-y-3 text-xs">
                    {Object.keys(report.webGrid).map((key) => {
                      const item = (report.webGrid as any)[key];
                      return (
                        <div key={key}>
                          <div className="flex justify-between text-[11px] mb-1">
                            <span className="font-semibold text-muted-foreground">{key}</span>
                            <span className="font-bold text-foreground">{item.score}/5</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground italic">{item.notes}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Section: Social & Web Metrics (Moteurs 1 & 2) */}
        {(report.socialMetrics || report.channelsMetrics || report.webMetrics) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 text-foreground">
            {report.channelsMetrics && Object.keys(report.channelsMetrics).length > 0 ? (
              <div className="space-y-6 md:col-span-2">
                <h3 className="font-heading font-black text-base text-primary uppercase tracking-wider flex items-center gap-2 border-b border-border/40 pb-3">
                  <Share2 className="w-5 h-5" />
                  Moteur 1 : Audit Détaillé des Réseaux Sociaux
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Object.entries(report.channelsMetrics).map(([channel, metrics]) => {
                    if (!metrics) return null;
                    return (
                      <div key={channel} className="bg-card border border-border/60 rounded-3xl p-6 space-y-4 print:border-gray-200 print:bg-white print:text-black">
                        <div className="flex justify-between items-center border-b border-border/40 pb-2">
                          <span className="font-heading font-bold text-sm text-foreground uppercase tracking-wide flex items-center gap-1.5 print:text-black">
                            <span className="w-2 h-2 rounded-full bg-primary"></span>
                            {channel}
                          </span>
                          <span className="bg-primary/10 text-primary border border-primary/20 text-[9px] font-bold px-2 py-0.5 rounded-full">
                            Score: {metrics.profileScore}/10
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="p-2.5 bg-secondary/35 rounded-xl border border-border/30">
                            <span className="text-[9px] text-muted-foreground uppercase block font-semibold">Abonnés</span>
                            <span className="text-xs font-bold text-foreground print:text-black">{metrics.followers || "N/A"}</span>
                          </div>
                          <div className="p-2.5 bg-secondary/35 rounded-xl border border-border/30">
                            <span className="text-[9px] text-muted-foreground uppercase block font-semibold">Engagement</span>
                            <span className="text-xs font-bold text-primary print:text-black">{metrics.engagementRate || "N/A"}</span>
                          </div>
                          <div className="p-2.5 bg-secondary/35 rounded-xl border border-border/30">
                            <span className="text-[9px] text-muted-foreground uppercase block font-semibold">Fréquence</span>
                            <span className="text-xs font-bold text-foreground print:text-black">{metrics.postFrequency || "N/A"}</span>
                          </div>
                          <div className="p-2.5 bg-secondary/35 rounded-xl border border-border/30">
                            <span className="text-[9px] text-muted-foreground uppercase block font-semibold">Portée Organique</span>
                            <span className="text-xs font-bold text-primary print:text-black">{metrics.organicReach || "N/A"}</span>
                          </div>
                        </div>

                        {/* Last Post Details */}
                        {metrics.lastPostDate && (
                          <div className="p-3.5 bg-secondary/35 rounded-xl border border-border/30 space-y-2">
                            <span className="text-[9px] text-primary uppercase font-extrabold block">Dernière publication (Détails du post)</span>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[10px]">
                              <div className="p-1.5 rounded bg-secondary/30">
                                <span className="text-[8px] text-muted-foreground block">Date</span>
                                <span className="font-bold text-foreground print:text-black">{metrics.lastPostDate}</span>
                              </div>
                              <div className="p-1.5 rounded bg-secondary/30">
                                <span className="text-[8px] text-muted-foreground block">Likes & Comms</span>
                                <span className="font-bold text-foreground print:text-black">{metrics.lastPostLikes ?? 0} 👍 / {metrics.lastPostComments ?? 0} 💬</span>
                              </div>
                              <div className="p-1.5 rounded bg-secondary/30">
                                <span className="text-[8px] text-muted-foreground block">Partages</span>
                                <span className="font-bold text-foreground print:text-black">{metrics.lastPostShares ?? 0} 🔁</span>
                              </div>
                              <div className="p-1.5 rounded bg-secondary/30">
                                <span className="text-[8px] text-muted-foreground block">Portée / Vues</span>
                                <span className="font-bold text-primary print:text-black">{metrics.lastPostViews ?? 0} 👁️</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Platform Details */}
                        <div className="space-y-3 pt-3 border-t border-border/20 text-xs">
                          {metrics.creationDate && (
                            <div>
                              <span className="text-[9px] text-muted-foreground uppercase font-bold">Historique / Ancienneté</span>
                              <p className="text-[11px] text-foreground font-semibold mt-0.5 print:text-black">{metrics.creationDate}</p>
                            </div>
                          )}

                          {(metrics.totalPosts !== undefined || metrics.photosCount !== undefined) && (
                            <div className="grid grid-cols-3 gap-2 text-center py-1 bg-secondary/20 rounded-lg">
                              <div>
                                <span className="text-[8px] text-muted-foreground block">Posts</span>
                                <span className="font-bold text-foreground text-[10px] print:text-black">{metrics.totalPosts || 0}</span>
                              </div>
                              <div>
                                <span className="text-[8px] text-muted-foreground block">Photos</span>
                                <span className="font-bold text-foreground text-[10px] print:text-black">{metrics.photosCount || 0}</span>
                              </div>
                              <div>
                                <span className="text-[8px] text-muted-foreground block">Vidéos/Reels</span>
                                <span className="font-bold text-foreground text-[10px] print:text-black">{(metrics.videosCount || 0) + (metrics.reelsCount || 0)}</span>
                              </div>
                            </div>
                          )}

                          {metrics.sponsoredPosts && (
                            <div>
                              <span className="text-[9px] text-muted-foreground uppercase font-bold">Historique Publicitaire (Meta Ads)</span>
                              <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5 p-2 rounded bg-secondary/10 print:text-black">{metrics.sponsoredPosts}</p>
                            </div>
                          )}

                          {metrics.campaignComparison && (
                            <div>
                              <span className="text-[9px] text-muted-foreground uppercase font-bold">Comparaison d'efficacité</span>
                              <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5 p-2 rounded bg-secondary/10 print:text-black">{metrics.campaignComparison}</p>
                            </div>
                          )}

                          {metrics.visibilityPitch && (
                            <div className="p-3.5 rounded-xl bg-gradient-to-r from-primary/10 to-orange-500/10 border border-primary/20 space-y-1.5">
                              <span className="text-[9px] text-primary uppercase font-black block">Plan d'action & Solutions de conversion</span>
                              <p className="text-[10px] text-foreground font-semibold leading-relaxed print:text-black">{metrics.visibilityPitch}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : report.socialMetrics ? (
              <div className="bg-card border border-border/60 rounded-3xl p-6 space-y-4 print:border-gray-200 print:bg-white print:text-black">
                <h3 className="font-heading font-bold text-sm text-foreground flex items-center gap-2 border-b border-border/40 pb-3 print:text-black">
                  <Share2 className="w-4 h-4 text-primary" />
                  Moteur 1 : Performances Sociales Réelles
                </h3>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-secondary/30 rounded-xl border border-border/40">
                    <span className="text-[10px] text-muted-foreground uppercase block font-semibold">Abonnés</span>
                    <span className="text-base font-bold text-foreground print:text-black">{report.socialMetrics.followers}</span>
                  </div>
                  <div className="p-3 bg-secondary/30 rounded-xl border border-border/40">
                    <span className="text-[10px] text-muted-foreground uppercase block font-semibold">Engagement</span>
                    <span className="text-base font-bold text-primary print:text-black">{report.socialMetrics.engagementRate}</span>
                  </div>
                  <div className="p-3 bg-secondary/30 rounded-xl border border-border/40">
                    <span className="text-[10px] text-muted-foreground uppercase block font-semibold">Fréquence</span>
                    <span className="text-base font-bold text-foreground print:text-black">{report.socialMetrics.postFrequency}</span>
                  </div>
                  <div className="p-3 bg-secondary/30 rounded-xl border border-border/40">
                    <span className="text-[10px] text-muted-foreground uppercase block font-semibold">Branding Profil</span>
                    <span className="text-base font-bold text-primary print:text-black">{report.socialMetrics.profileScore}/10</span>
                  </div>
                </div>

                {/* Advanced metrics details */}
                {(report.socialMetrics.creationDate || report.socialMetrics.totalPosts !== undefined) && (
                  <div className="border-t border-border/20 pt-4 space-y-4 text-xs">
                    <h4 className="font-heading text-xs font-bold text-primary uppercase">Moteur 1 : Diagnostic Profond d'Audience</h4>
                    
                    <div className="grid grid-cols-2 gap-3">
                      {report.socialMetrics.creationDate && (
                        <div className="p-2.5 rounded-lg bg-secondary/20">
                          <span className="text-[9px] text-muted-foreground block uppercase font-semibold">Ancienneté du compte</span>
                          <span className="font-semibold text-foreground print:text-black">{report.socialMetrics.creationDate}</span>
                        </div>
                      )}
                      {report.socialMetrics.totalPosts !== undefined && (
                        <div className="p-2.5 rounded-lg bg-secondary/20">
                          <span className="text-[9px] text-muted-foreground block uppercase font-semibold">Volume de publications</span>
                          <span className="font-semibold text-foreground print:text-black">{report.socialMetrics.totalPosts} posts au total</span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 rounded bg-secondary/15 border border-border/10">
                        <span className="text-[8px] text-muted-foreground block">Photos</span>
                        <span className="font-bold text-foreground print:text-black">{report.socialMetrics.photosCount || 0}</span>
                      </div>
                      <div className="p-2 rounded bg-secondary/15 border border-border/10">
                        <span className="text-[8px] text-muted-foreground block">Vidéos</span>
                        <span className="font-bold text-foreground print:text-black">{report.socialMetrics.videosCount || 0}</span>
                      </div>
                      <div className="p-2 rounded bg-secondary/15 border border-border/10">
                        <span className="text-[8px] text-muted-foreground block">Reels / Shorts</span>
                        <span className="font-bold text-foreground print:text-black">{report.socialMetrics.reelsCount || 0}</span>
                      </div>
                    </div>

                    {report.socialMetrics.organicReach && (
                      <div className="space-y-1">
                        <span className="text-[9px] text-muted-foreground uppercase font-bold">Portée & Visibilité</span>
                        <p className="text-[11px] text-foreground leading-relaxed print:text-black">
                          <strong>Portée Organique moyenne :</strong> {report.socialMetrics.organicReach}
                        </p>
                      </div>
                    )}

                    {report.socialMetrics.sponsoredPosts && (
                      <div className="space-y-1">
                        <span className="text-[9px] text-muted-foreground uppercase font-bold">Analyse des Publicités Sponsorisées</span>
                        <p className="text-[11px] text-muted-foreground leading-relaxed print:text-black bg-secondary/10 p-2.5 rounded-xl border border-border/10">
                          {report.socialMetrics.sponsoredPosts}
                        </p>
                      </div>
                    )}

                    {report.socialMetrics.campaignComparison && (
                      <div className="space-y-1">
                        <span className="text-[9px] text-muted-foreground uppercase font-bold">Comparaison & Efficacité des Campagnes</span>
                        <p className="text-[11px] text-muted-foreground leading-relaxed print:text-black bg-secondary/10 p-2.5 rounded-xl border border-border/10">
                          {report.socialMetrics.campaignComparison}
                        </p>
                      </div>
                    )}

                    {report.socialMetrics.visibilityPitch && (
                      <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-primary/10 to-orange-500/10 border border-primary/20 space-y-2">
                        <h5 className="font-heading text-xs font-bold text-primary flex items-center gap-1.5">
                          <Lightbulb className="w-4 h-4 text-primary animate-pulse" />
                          Plan d'action d'Acquisition Visibilité GLN (Recommandé)
                        </h5>
                        <p className="text-[11px] text-foreground font-medium leading-relaxed print:text-black">
                          {report.socialMetrics.visibilityPitch}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : null}

            {report.webMetrics && (
              <div className="bg-card border border-border/60 rounded-3xl p-6 space-y-4 print:border-gray-200 print:bg-white print:text-black">
                <h3 className="font-heading font-bold text-sm text-foreground flex items-center gap-2 border-b border-border/40 pb-3 print:text-black">
                  <Globe className="w-4 h-4 text-blue-400" />
                  Moteur 2 : Vitesse & Technique Web (Lighthouse)
                </h3>
                {(report.webMetrics.performanceScore === 0 && report.webMetrics.seoScore === 0 && report.webMetrics.mobileScore === 0) ? (
                  <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 text-center space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Aucun site web fourni par le client. L'audit de performance Lighthouse n'est pas applicable.
                    </p>
                    <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-xs font-bold text-primary mt-1">
                      💡 Recommandation : Concevoir et lancer une Landing Page Express optimisée pour l'acquisition et la conversion directe vers WhatsApp.
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2 bg-secondary/30 rounded-xl border border-border/40">
                        <span className="text-[9px] text-muted-foreground uppercase block font-semibold">Perf.</span>
                        <span className="text-sm font-bold text-orange-400 print:text-black">{report.webMetrics.performanceScore}%</span>
                      </div>
                      <div className="p-2 bg-secondary/30 rounded-xl border border-border/40">
                        <span className="text-[9px] text-muted-foreground uppercase block font-semibold">SEO</span>
                        <span className="text-sm font-bold text-green-400 print:text-black">{report.webMetrics.seoScore}%</span>
                      </div>
                      <div className="p-2 bg-secondary/30 rounded-xl border border-border/40">
                        <span className="text-[9px] text-muted-foreground uppercase block font-semibold">Mobile</span>
                        <span className="text-sm font-bold text-green-400 print:text-black">{report.webMetrics.mobileScore}%</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/20 text-[10px] text-muted-foreground print:text-black">
                      <div><span>FCP: </span><span className="font-bold text-foreground print:text-black">{report.webMetrics.fcp}s</span></div>
                      <div><span>LCP: </span><span className="font-bold text-foreground print:text-black">{report.webMetrics.lcp}s</span></div>
                      <div><span>CLS: </span><span className="font-bold text-foreground print:text-black">{report.webMetrics.cls}</span></div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Section: Benchmark Concurrentiel (Moteur 3) */}
        {report.competitors && report.competitors.length > 0 && (
          <div className="bg-card border border-border/60 rounded-3xl p-6 mb-8 print:border-gray-200 print:bg-white print:text-black text-foreground">
            <h3 className="font-heading font-bold text-sm text-foreground flex items-center gap-2 border-b border-border/40 pb-3 print:text-black">
              <BarChart2 className="w-4 h-4 text-primary" />
              Moteur 3 : Benchmark Concurrentiel (Positionnement)
            </h3>
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border/40 text-muted-foreground font-bold">
                    <th className="py-2 pr-2">Entreprise</th>
                    <th className="py-2 pr-2 text-center">Visibilité</th>
                    <th className="py-2 pr-2 text-center">Branding</th>
                    <th className="py-2 pr-2 text-center">Conversion</th>
                    <th className="py-2 text-right">Score Global</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/20 text-foreground font-bold bg-primary/5">
                    <td className="py-3 pr-2 text-primary">{companyName || clientName} (Vous)</td>
                    <td className="py-3 pr-2 text-center">{report.visibilityScore || 0}/10</td>
                    <td className="py-3 pr-2 text-center">{report.brandingScore || 0}/10</td>
                    <td className="py-3 pr-2 text-center">{report.conversionScore || 0}/10</td>
                    <td className="py-3 text-right text-primary">
                      {expressGlobalScore}/10
                    </td>
                  </tr>
                  {report.competitors.map((comp, idx) => (
                    <tr key={idx} className="border-b border-border/10 text-muted-foreground">
                      <td className="py-3 pr-2">{comp.name}</td>
                      <td className="py-3 pr-2 text-center">{comp.visibility}/10</td>
                      <td className="py-3 pr-2 text-center">{comp.branding}/10</td>
                      <td className="py-3 pr-2 text-center">{comp.conversion}/10</td>
                      <td className="py-3 text-right font-medium text-foreground print:text-black">{comp.global}/10</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Section: Screenshots & Annotations (Moteur 4) */}
        {report.screenshotAnnotations && report.screenshotAnnotations.length > 0 && (
          <div className="bg-card border border-border/60 rounded-3xl p-6 mb-8 print:border-gray-200 print:bg-white print:text-black text-foreground">
            <h3 className="font-heading font-bold text-sm text-foreground flex items-center gap-2 border-b border-border/40 pb-3 print:text-black">
              <Target className="w-4 h-4 text-primary" />
              Moteur 4 : Maquette de Capture d'Écran Annotée
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 items-center">
              {/* Visual Annotations Mock */}
              <div 
                className="relative aspect-[4/3] rounded-2xl border border-border/40 overflow-hidden bg-slate-900 shadow-inner max-w-sm mx-auto w-full select-none"
                style={(() => {
                  const rawLink = request.singleLink || "";
                  const isLinkFb = rawLink.toLowerCase().includes("facebook.com");
                  const isLinkInsta = rawLink.toLowerCase().includes("instagram.com");
                  const isLinkTiktok = rawLink.toLowerCase().includes("tiktok.com");
                  const isLinkSnap = rawLink.toLowerCase().includes("snapchat.com");
                  const isLinkYoutube = rawLink.toLowerCase().includes("youtube.com") || rawLink.toLowerCase().includes("youtu.be");
                  const isLinkWeb = rawLink.trim().length > 0 && !isLinkFb && !isLinkInsta && !isLinkTiktok && !isLinkSnap && !isLinkYoutube;

                  const fbUrl = request.facebookLink || (isLinkFb ? request.singleLink : "") || (request.details?.socialLink?.includes("facebook") ? request.details.socialLink : "");
                  const instaUrl = request.instagramLink || (isLinkInsta ? request.singleLink : "") || (request.details?.socialLink?.includes("instagram") ? request.details.socialLink : "");
                  const webUrl = request.websiteUrl || (isLinkWeb ? request.singleLink : "") || request.details?.websiteUrl || "";

                  const liveUrl = report.customScreenshot || (
                    report.screenshotType === "website" && webUrl ? `https://api.microlink.io?url=${encodeURIComponent(webUrl)}&screenshot=true&embed=screenshot.url` :
                    report.screenshotType === "facebook" && fbUrl ? `https://api.microlink.io?url=${encodeURIComponent(fbUrl)}&screenshot=true&embed=screenshot.url` :
                    report.screenshotType === "instagram" && instaUrl ? `https://api.microlink.io?url=${encodeURIComponent(instaUrl)}&screenshot=true&embed=screenshot.url` :
                    ""
                  );
                  return liveUrl ? { backgroundImage: `url(${liveUrl})`, backgroundSize: 'cover', backgroundPosition: 'top center' } : {};
                })()}
              >
                {(() => {
                  const rawLink = request.singleLink || "";
                  const isLinkFb = rawLink.toLowerCase().includes("facebook.com");
                  const isLinkInsta = rawLink.toLowerCase().includes("instagram.com");
                  const isLinkTiktok = rawLink.toLowerCase().includes("tiktok.com");
                  const isLinkSnap = rawLink.toLowerCase().includes("snapchat.com");
                  const isLinkYoutube = rawLink.toLowerCase().includes("youtube.com") || rawLink.toLowerCase().includes("youtu.be");
                  const isLinkWeb = rawLink.trim().length > 0 && !isLinkFb && !isLinkInsta && !isLinkTiktok && !isLinkSnap && !isLinkYoutube;

                  const fbUrl = request.facebookLink || (isLinkFb ? request.singleLink : "") || (request.details?.socialLink?.includes("facebook") ? request.details.socialLink : "");
                  const instaUrl = request.instagramLink || (isLinkInsta ? request.singleLink : "") || (request.details?.socialLink?.includes("instagram") ? request.details.socialLink : "");
                  const webUrl = request.websiteUrl || (isLinkWeb ? request.singleLink : "") || request.details?.websiteUrl || "";

                  const hasLiveUrl = report.customScreenshot || (
                    report.screenshotType === "website" && webUrl ||
                    report.screenshotType === "facebook" && fbUrl ||
                    report.screenshotType === "instagram" && instaUrl
                  );
                  return !hasLiveUrl;
                })() && (
                  <div className="p-6 text-center space-y-2 max-w-xs mx-auto flex flex-col items-center justify-center h-full">
                    <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                      <Camera className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-foreground">Aucune capture d'action disponible</p>
                      <p className="text-[8px] text-muted-foreground leading-relaxed">
                        L'auditeur n'a pas joint de capture d'écran réelle pour ce diagnostic.
                      </p>
                    </div>
                  </div>
                )}

                {/* Pins */}
                {report.screenshotAnnotations.map((pin, i) => (
                  <div 
                    key={pin.id}
                    style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
                    className={`absolute w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold text-[7px] text-white -ml-1.5 -mt-1.5 shadow-lg border border-white ${
                      pin.severity === "high" ? "bg-red-500" :
                      pin.severity === "medium" ? "bg-orange-500" :
                      "bg-amber-400"
                    }`}
                  >
                    {i + 1}
                  </div>
                ))}
              </div>

              {/* Critiques List */}
              <div className="space-y-3">
                <span className="text-[10px] font-bold text-muted-foreground uppercase block">Critiques Visuelles et Techniques</span>
                <div className="space-y-2">
                  {report.screenshotAnnotations.map((pin, idx) => (
                    <div key={pin.id} className="p-3 rounded-xl bg-secondary/30 border border-border/40 text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold text-white ${
                          pin.severity === "high" ? "bg-red-500" :
                          pin.severity === "medium" ? "bg-orange-500" :
                          "bg-amber-400"
                        }`}>
                          {idx + 1}
                        </span>
                        <span className="font-bold text-foreground print:text-black">{pin.title}</span>
                        <span className={`text-[8px] uppercase font-bold px-1.5 py-0.5 rounded border ml-auto ${
                          pin.severity === "high" ? "bg-red-500/15 text-red-400 border-red-500/20" :
                          pin.severity === "medium" ? "bg-orange-500/15 text-orange-400 border-orange-500/20" :
                          "bg-amber-400/15 text-amber-400 border-amber-400/20"
                        }`}>
                          {pin.severity}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">{pin.notes}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Strong & Weak Points (Only if Express Audit) */}
        {isExpressAudit && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Strong Points */}
            <div className="bg-card border border-green-500/20 rounded-3xl p-6 space-y-4 print:border-gray-200 print:bg-white">
              <h3 className="font-heading font-bold text-sm text-green-400 flex items-center gap-2 print:text-black">
                <ThumbsUp className="w-4 h-4 text-green-500" />
                Points forts identifiés
              </h3>
              {report.strongPoints && report.strongPoints.length > 0 ? (
                <ul className="space-y-2.5 text-xs text-muted-foreground print:text-black">
                  {report.strongPoints.map((item, idx) => (
                    <li key={idx} className="flex gap-2 items-start leading-relaxed">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0 mt-1.5"></span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground italic">Aucun point fort spécifique listé.</p>
              )}
            </div>

            {/* Weak Points */}
            <div className="bg-card border border-red-500/20 rounded-3xl p-6 space-y-4 print:border-gray-200 print:bg-white">
              <h3 className="font-heading font-bold text-sm text-red-400 flex items-center gap-2 print:text-black">
                <ThumbsDown className="w-4 h-4 text-red-500" />
                Points faibles relevés
              </h3>
              {report.weakPoints && report.weakPoints.length > 0 ? (
                <ul className="space-y-2.5 text-xs text-muted-foreground print:text-black">
                  {report.weakPoints.map((item, idx) => (
                    <li key={idx} className="flex gap-2 items-start leading-relaxed">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 mt-1.5"></span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground italic">Aucun point faible spécifique relevé.</p>
              )}
            </div>
          </div>
        )}

        {/* Standard Errors & Recommendations Lists (For both, but recommendations is key) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Recommendations List - Highlighted in Orange */}
          <div className="bg-card border border-orange-500/20 rounded-3xl p-6 space-y-4 print:border-gray-200 print:bg-white">
            <h3 className="font-heading font-bold text-sm text-orange-400 flex items-center gap-2 print:text-black">
              <Lightbulb className="w-4 h-4 text-orange-500" />
              Plan d'action & Recommandations
            </h3>

            {report.recommendations.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Aucune recommandation spécifique disponible.</p>
            ) : (
              <ul className="space-y-2.5 text-xs text-muted-foreground print:text-black">
                {report.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex gap-2 items-start leading-relaxed">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0 mt-1.5"></span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Loom Video Choice Alert or Info */}
          <div className="bg-card border border-border/60 rounded-3xl p-6 space-y-4 print:border-gray-200 print:bg-white flex flex-col justify-between">
            <div className="space-y-3">
              <h3 className="font-heading font-bold text-sm text-foreground flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                Détails de Livraison
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Ce diagnostic a été préparé suite à votre demande d'audit digital express.
                {request.reportChoice === "video" ? (
                  <span className="block mt-2 font-semibold text-primary">✓ Une vidéo explicative personnalisée Loom/WhatsApp de 3 minutes vous a également été envoyée par message.</span>
                ) : (
                  <span className="block mt-2 font-semibold text-primary">✓ Ce document sert de mini-rapport de 1 page récapitulatif pour vos équipes.</span>
                )}
              </p>
            </div>
            
            {request.details.additionalNotes && (
              <div className="pt-3 border-t border-border/40">
                <span className="text-[9px] uppercase font-bold text-muted-foreground block">Problème exprimé</span>
                <span className="text-[11px] italic text-muted-foreground block">"{request.details.additionalNotes}"</span>
              </div>
            )}
          </div>
        </div>

        {/* Proforma Invoice Section */}
        {request.proforma && (
          <div className="mt-12 bg-card border border-primary/20 rounded-3xl p-6 md:p-8 space-y-6 shadow-glow print:border-gray-200 print:bg-white print:text-black">
            <div className="flex justify-between items-center border-b border-border/40 pb-4">
              <div>
                <h3 className="font-heading font-black text-sm text-primary uppercase tracking-wide">
                  Facture Proforma
                </h3>
                <p className="text-[10px] text-muted-foreground">Numéro : {request.proforma.invoiceNumber}</p>
              </div>
              <div className="text-right text-[10px] text-muted-foreground font-mono">
                <p>Émetteur : GLN DIGITAL</p>
                <p>Cameroun, Douala</p>
              </div>
            </div>

            <div className="space-y-4">
              <span className="text-[10px] font-bold text-muted-foreground uppercase block">Solutions de visibilité & acquisition recommandées</span>
              
              <div className="divide-y divide-border/20 border-y border-border/20">
                {request.proforma.items.map((item, index) => (
                  <div key={index} className="py-3 flex justify-between gap-4 text-xs">
                    <div className="space-y-1 flex-1">
                      <p className="font-semibold text-foreground">{item.description}</p>
                    </div>
                    <div className="text-right font-mono font-bold text-foreground min-w-[100px]">
                      {item.price.toLocaleString("fr-FR")} FCFA
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center pt-4 text-sm font-bold text-foreground">
                <span>TOTAL H.T.</span>
                <span className="text-lg text-primary font-heading font-black">
                  {request.proforma.totalAmount.toLocaleString("fr-FR")} FCFA
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-secondary/40 border border-border/30 text-[11px] text-muted-foreground leading-relaxed space-y-1">
                <span className="font-bold text-foreground block">Conditions & Instructions de Règlement</span>
                <p>{request.proforma.paymentInstructions}</p>
              </div>
            </div>
          </div>
        )}

        {/* Deep Audit Access Wizard Section (Onboarding Guide for Clients) */}
        <div className="mt-12 bg-card border border-border/60 rounded-3xl p-6 md:p-8 space-y-6 print:hidden">
          <div className="space-y-2">
            <span className="bg-primary/10 text-primary text-[10px] font-bold px-3 py-1 rounded-full border border-primary/20 uppercase tracking-widest inline-flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              Accès Sécurisé
            </span>
            <h3 className="font-heading text-xl font-bold text-foreground">
              Débloquer mon Diagnostic Stratégique Approfondi (Gratuit)
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
              Pour une analyse chirurgicale de vos tunnels de conversion, de vos coûts d'acquisition Meta Ads et de vos mots-clés Google réels, accordez-nous un accès temporaire en <strong>Lecture Seule (Analyste / Lecteur)</strong>. Vous gardez le contrôle à 100%.
            </p>
          </div>

          {/* Reassurance Alert */}
          <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-start gap-2.5 text-xs text-green-400 leading-relaxed">
            <CheckCircle className="w-4.5 h-4.5 text-green-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-foreground block">🔐 Sécurité & Confidentialité Garanties</span>
              L'accès Analyste permet uniquement d'analyser vos performances passées. Nous ne pouvons en aucun cas modifier vos publications, dépenser votre budget publicitaire, ni modifier vos mots de passe.
            </div>
          </div>

          {/* Tabs Navigation */}
          <div className="flex flex-wrap gap-2 border-b border-border/40 pb-2">
            {[
              { id: "facebook", label: "Page Facebook & Meta Ads" },
              { id: "analytics", label: "Google Analytics (Site)" },
              { id: "searchconsole", label: "Google Search Console" }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveOnboardingTab(tab.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                  activeOnboardingTab === tab.id
                    ? "bg-primary border-primary text-primary-foreground shadow-glow"
                    : "bg-secondary border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tabs Content */}
          <div className="bg-secondary/20 border border-border/40 rounded-2xl p-5 space-y-4">
            {activeOnboardingTab === "facebook" && (
              <div className="space-y-4 text-xs">
                <div className="space-y-1">
                  <span className="font-bold text-foreground block">Option A : Par Meta Business Suite (Recommandé)</span>
                  <p className="text-muted-foreground leading-relaxed">
                    Ajoutez GLN DIGITAL comme partenaire Business Manager à l'aide de notre identifiant officiel :
                  </p>
                </div>
                
                <div className="flex gap-2 items-center bg-black/40 border border-border/30 rounded-xl px-4 py-2.5 max-w-sm">
                  <span className="font-mono text-primary font-bold">1780587266753</span>
                  <button 
                    onClick={() => handleCopy("1780587266753", "ID Partenaire Meta")}
                    className="ml-auto p-1.5 hover:bg-white/10 rounded transition-colors text-muted-foreground hover:text-foreground"
                    title="Copier l'identifiant"
                  >
                    {copiedText === "ID Partenaire Meta" ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                <div className="space-y-2.5">
                  <span className="font-semibold text-foreground block">Étapes détaillées pas-à-pas :</span>
                  <ol className="list-decimal list-inside space-y-2.5 text-muted-foreground pl-1">
                    <li><strong>Copiez notre identifiant partenaire</strong> ci-dessus (`1780587266753`).</li>
                    <li>Allez sur les <a href="https://www.facebook.com/settings?tab=profile_access" target="_blank" rel="noopener noreferrer" className="text-primary underline">Paramètres d'accès de votre Page</a>. <span className="text-muted-foreground block text-[10px] italic mt-0.5 ml-4">(Basculez sur le profil de votre Page Facebook si demandé)</span>.</li>
                    <li>Cliquez sur le lien bleu <strong>"Gérer"</strong> situé à droite de <strong>"Personnes ayant un accès partiel"</strong>.</li>
                    <li>Sur le pop-up qui s'affiche, cliquez sur le bouton bleu <strong>"Accéder à Meta Business Suite"</strong>.</li>
                    <li>Une fois sur la page de Meta Business Suite (comme sur votre écran) :
                      <ul className="list-disc list-inside pl-5 mt-1.5 space-y-1.5 text-[11px] italic text-muted-foreground">
                        <li>Dans le menu latéral gauche, sous <strong>Utilisateur(ice)s</strong>, cliquez précisément sur le bouton <strong>"Partenaires"</strong>.</li>
                        <li>Sur la page qui s'ouvre, cliquez sur le bouton bleu <strong>"Ajouter"</strong> (ou "Ajouter un partenaire").</li>
                        <li>Sélectionnez <strong>"Partager des éléments avec un partenaire"</strong>.</li>
                        <li>Collez l'identifiant partenaire copié : <strong className="text-foreground">1780587266753</strong>.</li>
                        <li>Sélectionnez votre Page, cochez uniquement l'autorisation pour les <strong>Statistiques / Performances</strong> (accès en lecture seule) et validez.</li>
                      </ul>
                    </li>
                  </ol>
                </div>
              </div>
            )}

            {activeOnboardingTab === "analytics" && (
              <div className="space-y-4 text-xs">
                <div className="space-y-1">
                  <span className="font-bold text-foreground block">Google Analytics (Analyse de trafic & conversions)</span>
                  <p className="text-muted-foreground leading-relaxed">
                    Partagez l'accès en lecture seule à votre compte Google Analytics (GA4) :
                  </p>
                </div>

                <div className="flex gap-2 items-center bg-black/40 border border-border/30 rounded-xl px-4 py-2.5 max-w-sm">
                  <span className="font-mono text-primary font-bold">audit@glndigital.com</span>
                  <button 
                    onClick={() => handleCopy("audit@glndigital.com", "Email Google Analytics")}
                    className="ml-auto p-1.5 hover:bg-white/10 rounded transition-colors text-muted-foreground hover:text-foreground"
                    title="Copier l'email"
                  >
                    {copiedText === "Email Google Analytics" ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                <div className="space-y-2">
                  <span className="font-semibold text-foreground block">Étapes à suivre :</span>
                  <ol className="list-decimal list-inside space-y-2 text-muted-foreground pl-1">
                    <li>Connectez-vous sur <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">Google Analytics</a>.</li>
                    <li>Cliquez sur la roue crantée <strong>Administration</strong> (en bas à gauche).</li>
                    <li>Sélectionnez <strong>Gestion des accès au compte</strong> ou <strong>à la propriété</strong>.</li>
                    <li>Cliquez sur le bouton bleu <strong>"+"</strong> en haut à droite &gt; <strong>Ajouter des utilisateurs</strong>.</li>
                    <li>Saisissez notre e-mail ci-dessus, et cochez uniquement le rôle <strong>Lecteur / Viewer</strong> (sans accès de modification).</li>
                  </ol>
                </div>
              </div>
            )}

            {activeOnboardingTab === "searchconsole" && (
              <div className="space-y-4 text-xs">
                <div className="space-y-1">
                  <span className="font-bold text-foreground block">Google Search Console (Mots-clés organiques & Référencement)</span>
                  <p className="text-muted-foreground leading-relaxed">
                    Accédez aux détails de positionnement SEO réel de votre site internet :
                  </p>
                </div>

                <div className="flex gap-2 items-center bg-black/40 border border-border/30 rounded-xl px-4 py-2.5 max-w-sm">
                  <span className="font-mono text-primary font-bold">audit@glndigital.com</span>
                  <button 
                    onClick={() => handleCopy("audit@glndigital.com", "Email Google Search Console")}
                    className="ml-auto p-1.5 hover:bg-white/10 rounded transition-colors text-muted-foreground hover:text-foreground"
                    title="Copier l'email"
                  >
                    {copiedText === "Email Google Search Console" ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                <div className="space-y-2">
                  <span className="font-semibold text-foreground block">Étapes à suivre :</span>
                  <ol className="list-decimal list-inside space-y-2 text-muted-foreground pl-1">
                    <li>Connectez-vous sur la <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer" className="text-primary underline">Google Search Console</a>.</li>
                    <li>Cliquez sur <strong>Paramètres</strong> dans le menu latéral gauche.</li>
                    <li>Sélectionnez <strong>Utilisateurs et autorisations</strong>.</li>
                    <li>Cliquez sur <strong>Ajouter un utilisateur</strong>.</li>
                    <li>Saisissez notre e-mail ci-dessus et attribuez l'autorisation <strong>"Limité" (Lecture seule)</strong>.</li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-12 p-6 md:p-8 rounded-3xl bg-secondary/30 border border-border/60 text-center space-y-4 print:hidden">
          <CheckCircle className="w-10 h-10 text-primary mx-auto animate-pulse" />
          <h3 className="font-heading text-lg font-bold text-foreground">Souhaitez-vous qu’on mette cela en place pour vous ?</h3>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-xl mx-auto">
            Nos équipes d'experts en acquisition et copywriting prennent en charge la résolution complète de ces points de blocage pour multiplier vos résultats commerciaux.
          </p>
          <div className="pt-2">
            <a 
              href={`https://wa.me/237692062677?text=Bonjour%20GLN%20DIGITAL%2C%20je%20viens%20d'analyser%20mon%20rapport%20d'audit%20express%20(ID%3A%20${id})%20et%20je%20souhaite%20que%20vous%20mettiez%20cela%20en%20place%20pour%20moi.`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-gradient-primary text-primary-foreground font-bold text-xs px-6 py-3 rounded-xl hover:opacity-90 transition-all shadow-glow"
            >
              <MessageCircle className="w-4 h-4" />
              Oui, mettre en place cela pour mon entreprise sur WhatsApp
            </a>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AuditReportDetail;
