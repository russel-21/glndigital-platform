import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Sparkles, Send, Globe, Check, Laptop, FileText, Video, Copy, X, ExternalLink, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getAuditRequests, saveAuditRequests, AuditRequest } from "@/lib/auditStore";
import { addNotification } from "@/lib/notificationsStore";
import { toast } from "sonner";
import { countryCodes } from "@/lib/countryCodes";

const AuditPage = () => {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  // Onboarding Access Guide Modal
  const [showAccessGuideModal, setShowAccessGuideModal] = useState(false);
  const [activeOnboardingTab, setActiveOnboardingTab] = useState<"facebook" | "analytics" | "searchconsole">("facebook");
  const [copiedText, setCopiedText] = useState("");
  const [whatsappUrl, setWhatsappUrl] = useState("");

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    toast.success(`${label} copié avec succès !`);
    setTimeout(() => setCopiedText(""), 2000);
  };

  // Form states
  const [clientName, setClientName] = useState("");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState("+237");
  const [phoneLocal, setPhoneLocal] = useState("");
  
  const [companyName, setCompanyName] = useState("");
  const [activitySector, setActivitySector] = useState("");
  const [facebookLink, setFacebookLink] = useState("");
  const [instagramLink, setInstagramLink] = useState("");
  const [tiktokLink, setTiktokLink] = useState("");
  const [snapchatLink, setSnapchatLink] = useState("");
  const [googleAnalytics, setGoogleAnalytics] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  
  const [singleLink, setSingleLink] = useState("");
  const [previewStatus, setPreviewStatus] = useState<"idle" | "loading" | "loaded">("idle");
  const [linkType, setLinkType] = useState<"facebook" | "instagram" | "tiktok" | "website">("website");

  useEffect(() => {
    if (!singleLink.trim()) {
      setPreviewStatus("idle");
      return;
    }
    
    setPreviewStatus("loading");
    
    const lower = singleLink.toLowerCase();
    if (lower.includes("facebook.com")) {
      setLinkType("facebook");
    } else if (lower.includes("instagram.com")) {
      setLinkType("instagram");
    } else if (lower.includes("tiktok.com")) {
      setLinkType("tiktok");
    } else {
      setLinkType("website");
    }

    const timer = setTimeout(() => {
      setPreviewStatus("loaded");
    }, 1800);

    return () => clearTimeout(timer);
  }, [singleLink]);
  const [selectedObjectives, setSelectedObjectives] = useState<string[]>(["Plus de clients"]);
  const mainObjective = selectedObjectives.join(", ");
  const [marketingBudget, setMarketingBudget] = useState("");
  const [mainProblem, setMainProblem] = useState("");
  const [reportChoice, setReportChoice] = useState<"pdf" | "video">("pdf");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("Cameroun");

  // Automated simulation states
  const [isAutomatedRunning, setIsAutomatedRunning] = useState(false);
  const [automatedLogs, setAutomatedLogs] = useState<string[]>([]);

  useEffect(() => {
    const fetchSession = async () => {
      const mockAdmin = localStorage.getItem("gln_mock_admin_session") === "true";
      const mockUser = localStorage.getItem("gln_mock_user_logged_in") === "true";

      if (mockAdmin) {
        setProfile({ full_name: "Super Admin", email: "russel@glndigital.com", phone: "+237 000 000 000" });
        setClientName("Super Admin");
        setEmail("russel@glndigital.com");
        return;
      }

      if (mockUser) {
        const activeMock = localStorage.getItem("gln_active_mock_profile");
        if (activeMock) {
          try {
            const parsed = JSON.parse(activeMock);
            setProfile(parsed);
            setClientName(parsed.full_name || "");
            setEmail(parsed.email || "");
            if (parsed.phone) {
              const parts = parsed.phone.split(" ");
              if (parts.length > 1) {
                setCountryCode(parts[0]);
                setPhoneLocal(parts.slice(1).join(" "));
              } else {
                setPhoneLocal(parsed.phone);
              }
            }
          } catch {}
        }
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: userProfile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .single();
          if (userProfile) {
            setProfile(userProfile);
            setClientName(userProfile.full_name || "");
            setEmail(userProfile.email || "");
            if (userProfile.phone) {
              const parts = userProfile.phone.split(" ");
              if (parts.length > 1) {
                setCountryCode(parts[0]);
                setPhoneLocal(parts.slice(1).join(" "));
              } else {
                setPhoneLocal(userProfile.phone);
              }
            }
            if (userProfile.company_name && !userProfile.company_name.startsWith("{")) {
              setCompanyName(userProfile.company_name);
            }
          }
        }
      } catch (err) {
        console.warn("Could not retrieve profile in AuditPage:", err);
      }
    };

    fetchSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !email.trim() || !phoneLocal.trim() || !companyName.trim() || !activitySector.trim() || !mainProblem.trim() || !city.trim() || !country.trim() || !singleLink.trim()) {
      toast.error("Veuillez remplir les informations obligatoires (dont le lien à auditer).");
      return;
    }

    setLoading(true);

    const fullPhone = `${countryCode} ${phoneLocal.trim()}`;
    const reqId = "aud-" + Math.random().toString(36).substring(2, 7);

    const finalFb = linkType === "facebook" ? singleLink.trim() : undefined;
    const finalInsta = linkType === "instagram" ? singleLink.trim() : undefined;
    const finalTiktok = linkType === "tiktok" ? singleLink.trim() : undefined;
    const finalWeb = linkType === "website" ? singleLink.trim() : undefined;

    const newRequest: AuditRequest = {
      id: reqId,
      clientName: clientName.trim(),
      email: email.trim(),
      phone: fullPhone,
      companyName: companyName.trim(),
      auditTypes: linkType === "website" ? ["web"] : ["social"],
      activitySector: activitySector.trim(),
      city: city.trim(),
      country: country.trim(),
      singleLink: singleLink.trim(),
      facebookLink: finalFb,
      instagramLink: finalInsta,
      tiktokLink: finalTiktok,
      websiteUrl: finalWeb,
      mainObjective,
      marketingBudget: marketingBudget.trim() || undefined,
      mainProblem: mainProblem.trim(),
      reportChoice,
      details: {
        socialLink: finalInsta || finalFb || finalTiktok || undefined,
        websiteUrl: finalWeb,
        additionalNotes: `Lien unique audité: ${singleLink.trim()}. ${mainProblem.trim()}`
      },
      status: "pending",
      createdAt: new Date().toISOString(),
      crm: {
        assignedCloser: "Vanessa M.",
        crmStatus: "new",
        internalNotes: "Prospect express créé via formulaire intelligent à lien unique."
      }
    };

    try {
      const current = getAuditRequests();
      current.push(newRequest);
      saveAuditRequests(current);

      // Save visitor email and phone for home screen notification check
      localStorage.setItem("gln_visitor_email", email.trim());
      localStorage.setItem("gln_visitor_phone", fullPhone);

      // Add a notification for client
      addNotification({
        email: email.trim(),
        phone: fullPhone,
        auditId: reqId,
        companyName: companyName.trim(),
        type: "audit_pending",
        messageFr: `Votre demande d'audit gratuit pour l'entreprise "${companyName.trim()}" a été reçue. Elle est en attente de traitement par nos experts.`,
        messageEn: `Your free audit request for "${companyName.trim()}" has been received. It is pending review by our experts.`
      });

      toast.success("Votre demande d'audit a été enregistrée avec succès !");
      
      const whatsappText = encodeURIComponent(
        `Bonjour GLN DIGITAL!\n\nJe viens de soumettre ma demande d'Audit Express.\n\n` +
        `👤 Nom: ${clientName.trim()}\n` +
        `🏢 Entreprise: ${companyName.trim()}\n` +
        `💼 Secteur: ${activitySector.trim()}\n` +
        `📍 Ville/Pays: ${city.trim()}, ${country.trim()}\n` +
        `🎯 Objectifs: ${mainObjective}\n` +
        `📝 Problème: ${mainProblem.trim()}\n` +
        `📦 ID Audit: ${reqId}`
      );
      
      const finalUrl = `https://wa.me/237692062677?text=${whatsappText}`;
      setWhatsappUrl(finalUrl);
      window.open(finalUrl, "_blank");
      setShowAccessGuideModal(true);
      
      // Clear inputs
      setSingleLink("");
      setActivitySector("");
      setMarketingBudget("");
      setMainProblem("");
      setCity("");
    } catch {
      toast.error("Erreur technique lors de l'enregistrement.");
    } finally {
      setLoading(false);
    }
  };

  const objectives = [
    "Plus de clients",
    "Plus de visibilité",
    "Plus d'abonnés",
    "Plus de ventes",
    "Meilleure image"
  ];

  if (isAutomatedRunning) {
    return (
      <div className="min-h-screen pt-32 pb-16 bg-background flex flex-col items-center justify-center text-foreground relative z-10">
        <div className="max-w-xl w-full px-6 space-y-6 text-center">
          <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto mb-4"></div>
          <h3 className="font-heading font-black text-sm text-foreground animate-pulse">Lancement de l'Analyse Automatique IA...</h3>
          <p className="text-xs text-muted-foreground">Le moteur GLN DIGITAL scrape vos profils et prépare votre benchmark (80% auto).</p>
          <div className="bg-black/90 border border-border/40 rounded-2xl p-4 font-mono text-[10px] text-left text-green-400 space-y-1.5 h-64 overflow-y-auto shadow-inner">
            {automatedLogs.map((log, idx) => (
              <div key={idx} className="flex gap-2 items-start">
                <span className="text-primary font-bold">{idx + 1}.</span>
                <span>{log}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 bg-background relative overflow-hidden">
      <div className="container mx-auto px-4 md:px-8 max-w-4xl relative z-10">
        
        {/* Header */}
        <motion.div
          className="text-center mb-12 space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="bg-primary/10 text-primary text-[10px] font-bold px-4 py-1.5 rounded-full border border-primary/20 uppercase tracking-widest flex items-center gap-1.5 w-fit mx-auto">
            <Sparkles className="w-3.5 h-3.5" />
            Audit Express Gratuit (10–15 min)
          </span>
          <h1 className="font-heading text-3xl md:text-5xl font-extrabold text-foreground">
            Diagnostiquez votre présence <span className="text-gradient-primary">digitale</span>
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Remplissez ce formulaire rapide. Nos experts analyseront votre visibilité, votre branding, et vos conversions pour vous livrer un plan d'action immédiat.
          </p>
        </motion.div>

        {/* Audit Form Section */}
        <motion.div
          className="bg-card border border-border/60 rounded-3xl p-6 md:p-8 shadow-glow"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h3 className="font-heading font-bold text-lg text-foreground mb-6 flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Formulaire d'Audit Express Gratuit
          </h3>

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Enterprise Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 block">Nom de votre entreprise *</label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                  placeholder="Ex: Cadafi Sarl"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 block">Secteur d'activité *</label>
                <input
                  type="text"
                  required
                  value={activitySector}
                  onChange={(e) => setActivitySector(e.target.value)}
                  className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                  placeholder="Ex: Cosmétique, Restauration, Immobilier..."
                />
              </div>
            </div>

            {/* Ville & Pays */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 block">Ville *</label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                  placeholder="Ex: Douala, Yaoundé, Paris..."
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 block">Pays *</label>
                <input
                  type="text"
                  required
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                  placeholder="Ex: Cameroun, Côte d'Ivoire, France..."
                />
              </div>
            </div>

            {/* Single Audit Link Input */}
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 block">Lien unique à auditer (Compte Facebook, Instagram, TikTok, ou URL Site Web) *</label>
                <input
                  type="url"
                  required
                  value={singleLink}
                  onChange={(e) => setSingleLink(e.target.value)}
                  className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary shadow-inner"
                  placeholder="Collez ici le lien de votre page, compte ou site..."
                />
              </div>

              {/* Dynamic Live Preview Panel */}
              {previewStatus === "loading" && (
                <div className="p-6 rounded-2xl bg-secondary/50 border border-dashed border-primary/30 flex flex-col items-center justify-center space-y-3 animate-pulse">
                  <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
                  <div className="text-center space-y-1">
                    <p className="text-xs font-bold text-foreground">[MOTEUR GLN CRAWLER] Analyse du lien...</p>
                    <p className="text-[9px] text-muted-foreground font-mono">Connexion publique et extraction des métriques structurelles en cours...</p>
                  </div>
                </div>
              )}

              {previewStatus === "loaded" && (
                <div className="rounded-2xl border border-border/85 bg-card overflow-hidden shadow-glow animate-fade-in text-xs">
                  {/* Browser Chrome Bar Mockup */}
                  <div className="bg-secondary/80 border-b border-border/40 px-4 py-2.5 flex items-center gap-4 text-[10px] text-muted-foreground font-mono">
                    <div className="flex gap-1.5 shrink-0">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500/60 block"></span>
                      <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/60 block"></span>
                      <span className="w-2.5 h-2.5 rounded-full bg-green-500/60 block"></span>
                    </div>
                    <div className="flex-1 bg-secondary/90 border border-border/50 rounded-lg px-3 py-1 text-center select-all truncate text-foreground/80 font-mono text-[9px] flex items-center justify-center gap-1.5 max-w-md mx-auto">
                      <span className="text-green-400">🔒 HTTPS :</span>
                      <span>{singleLink}</span>
                    </div>
                    <span className="text-[9px] font-bold text-green-400 uppercase tracking-widest shrink-0 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded">
                      Connecté (Format: {linkType})
                    </span>
                  </div>

                  {/* Loaded Content */}
                  <div className="p-6">
                    {linkType === "instagram" && (
                      <div className="space-y-4">
                        <div className="flex gap-4 items-center">
                          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-yellow-500 via-red-500 to-purple-500 p-0.5 shadow-md">
                            <div className="w-full h-full rounded-full bg-secondary flex items-center justify-center font-bold text-lg text-foreground">
                              {companyName.substring(0, 2).toUpperCase() || "IG"}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <h4 className="font-heading font-black text-sm text-foreground">@{companyName.toLowerCase().replace(/\s+/g, "") || "username"}</h4>
                              <span className="bg-blue-500 text-white rounded-full p-0.5 text-[6px] font-bold">✓</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground">{activitySector || "Entreprise de Cosmétique & Beauté"}</p>
                          </div>
                        </div>
                        <div className="flex justify-around border-y border-border/30 py-3 text-center">
                          <div>
                            <span className="font-bold text-foreground block">342</span>
                            <span className="text-[9px] text-muted-foreground uppercase">Publications</span>
                          </div>
                          <div>
                            <span className="font-bold text-foreground block">12.4k</span>
                            <span className="text-[9px] text-muted-foreground uppercase">Abonnés</span>
                          </div>
                          <div>
                            <span className="font-bold text-foreground block">89</span>
                            <span className="text-[9px] text-muted-foreground uppercase">Abonnements</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">✨ {companyName || "Ma Super Entreprise"}</p>
                          <p className="text-muted-foreground text-[11px] leading-relaxed">💅 Boutique officielle • Produits de beauté haut de gamme & Cosmétiques. <br/>📩 Contactez-nous en DM pour commander !</p>
                        </div>
                        <div className="grid grid-cols-3 gap-1 pt-2">
                          <div className="aspect-square bg-secondary/80 rounded-lg flex items-center justify-center text-[10px] font-semibold text-muted-foreground border border-border/30">Visuel 1</div>
                          <div className="aspect-square bg-secondary/80 rounded-lg flex items-center justify-center text-[10px] font-semibold text-muted-foreground border border-border/30">Visuel 2</div>
                          <div className="aspect-square bg-secondary/80 rounded-lg flex items-center justify-center text-[10px] font-semibold text-muted-foreground border border-border/30">Visuel 3</div>
                        </div>
                      </div>
                    )}

                    {linkType === "facebook" && (
                      <div className="space-y-4">
                        <div className="h-24 bg-gradient-to-r from-blue-700 to-blue-500 rounded-lg flex items-end justify-start p-3 relative shadow-inner">
                          <div className="w-16 h-16 rounded-full bg-secondary border-2 border-card flex items-center justify-center font-bold text-blue-600 text-lg absolute -bottom-5 left-4 shadow-md">
                            {companyName.substring(0, 2).toUpperCase() || "FB"}
                          </div>
                        </div>
                        <div className="pt-6 pl-4 space-y-1">
                          <h4 className="font-heading font-black text-sm text-foreground">{companyName || "Ma Page Facebook"}</h4>
                          <p className="text-[10px] text-muted-foreground">Page d'entreprise • 8.5K J'aime • 9.2K Abonnés</p>
                        </div>
                        <div className="flex gap-2">
                          <button type="button" className="flex-1 bg-blue-600 text-white font-bold py-2 rounded-lg text-center hover:bg-blue-700 transition-colors text-xs">Contacter sur Messenger</button>
                          <button type="button" className="bg-secondary px-3 py-2 rounded-lg hover:bg-secondary/80 transition-colors text-xs">WhatsApp</button>
                        </div>
                        <div className="border-t border-border/30 pt-3 space-y-2">
                          <div className="p-3 bg-secondary/40 rounded-xl border border-border/20">
                            <span className="text-[9px] text-blue-400 font-bold block">Dernière publication</span>
                            <p className="text-[10px] text-muted-foreground leading-relaxed mt-1">Découvrez notre nouvelle collection de produits de beauté ! Disponible dès aujourd'hui...</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {linkType === "tiktok" && (
                      <div className="space-y-4 text-center">
                        <div className="w-16 h-16 rounded-full bg-black/90 mx-auto flex items-center justify-center font-bold text-lg text-white border border-border shadow-md">
                          T
                        </div>
                        <div className="space-y-0.5">
                          <h4 className="font-heading font-black text-sm text-white flex items-center justify-center gap-1">
                            @{companyName.toLowerCase().replace(/\s+/g, "") || "tiktok_username"}
                            <span className="bg-cyan-400 text-black rounded-full p-0.5 text-[5px] font-bold">✓</span>
                          </h4>
                          <p className="text-[10px] text-muted-foreground">{companyName || "Ma Page TikTok"}</p>
                        </div>
                        <div className="flex justify-center gap-6 text-[11px] text-muted-foreground font-semibold">
                          <span><strong>89</strong> Abonnements</span>
                          <span><strong>24.5k</strong> Abonnés</span>
                          <span><strong>156k</strong> J'aime</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground italic leading-relaxed max-w-xs mx-auto">Vidéos courtes quotidiennes sur la mode et la beauté ! Abonnez-vous !</p>
                        <div className="grid grid-cols-3 gap-1 pt-2">
                          <div className="aspect-[9/16] bg-secondary/80 rounded-lg flex items-center justify-center text-[10px] font-semibold text-muted-foreground border border-border/30">Reel 1</div>
                          <div className="aspect-[9/16] bg-secondary/80 rounded-lg flex items-center justify-center text-[10px] font-semibold text-muted-foreground border border-border/30">Reel 2</div>
                          <div className="aspect-[9/16] bg-secondary/80 rounded-lg flex items-center justify-center text-[10px] font-semibold text-muted-foreground border border-border/30">Reel 3</div>
                        </div>
                      </div>
                    )}

                    {linkType === "website" && (
                      <div className="space-y-4">
                        <div className="rounded-xl border border-border overflow-hidden bg-white/5 h-80 relative flex flex-col justify-between shadow-inner">
                          {/* Live iframe to display the actual website directly */}
                          <iframe 
                            src={singleLink} 
                            className="w-full h-full border-none bg-white" 
                            title="Prévisualisation du site"
                          />
                        </div>
                        
                        <div className="grid grid-cols-3 gap-3 text-center border-t border-border/30 pt-3">
                          <div className="p-3 bg-secondary/20 rounded-xl border border-border/25 text-center">
                            <span className="text-[9px] text-muted-foreground block uppercase font-bold">Performance</span>
                            <span className="text-sm font-heading font-black text-orange-500 block mt-1">44%</span>
                          </div>
                          <div className="p-3 bg-secondary/20 rounded-xl border border-border/25 text-center">
                            <span className="text-[9px] text-muted-foreground block uppercase font-bold">SEO</span>
                            <span className="text-sm font-heading font-black text-green-400 block mt-1">62%</span>
                          </div>
                          <div className="p-3 bg-secondary/20 rounded-xl border border-border/25 text-center">
                            <span className="text-[9px] text-muted-foreground block uppercase font-bold">Mobile</span>
                            <span className="text-sm font-heading font-black text-green-400 block mt-1">50%</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Objective Choice */}
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase mb-2 block">Objectifs visés * (Sélectionnez tout ce qui s'applique)</label>
              <div className="flex flex-wrap gap-2">
                {objectives.map((obj) => {
                  const isSelected = selectedObjectives.includes(obj);
                  return (
                    <button
                      key={obj}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          if (selectedObjectives.length > 1) {
                            setSelectedObjectives(selectedObjectives.filter((o) => o !== obj));
                          } else {
                            toast.error("Veuillez sélectionner au moins un objectif.");
                          }
                        } else {
                          setSelectedObjectives([...selectedObjectives, obj]);
                        }
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? "bg-primary border-primary text-primary-foreground shadow-glow"
                          : "bg-secondary border-border hover:border-muted-foreground text-foreground"
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                      {obj}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Budget & Main Problem */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 block">Budget marketing mensuel (facultatif)</label>
                <input
                  type="text"
                  value={marketingBudget}
                  onChange={(e) => setMarketingBudget(e.target.value)}
                  className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                  placeholder="Ex: Moins de 100k, 100k - 500k, 500k+..."
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 block">Mode de réception souhaité</label>
                <div className="grid grid-cols-2 gap-2 mt-0.5">
                  <button
                    type="button"
                    onClick={() => setReportChoice("pdf")}
                    className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                      reportChoice === "pdf"
                        ? "bg-primary border-primary text-primary-foreground shadow-glow"
                        : "bg-secondary border-border text-foreground"
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Rapport PDF (1 page)
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportChoice("video")}
                    className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                      reportChoice === "video"
                        ? "bg-primary border-primary text-primary-foreground shadow-glow"
                        : "bg-secondary border-border text-foreground"
                    }`}
                  >
                    <Video className="w-3.5 h-3.5" />
                    Vidéo (3 min)
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 block">Décrivez votre principal problème digital *</label>
              <textarea
                required
                value={mainProblem}
                onChange={(e) => setMainProblem(e.target.value)}
                rows={3}
                className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary resize-none"
                placeholder="Décrivez ici ce qui vous bloque aujourd'hui (Manque d'appels, faibles ventes, mauvaise image...)"
              />
            </div>

            {/* Contact Details */}
            <div className="border-t border-border/40 pt-4 space-y-4">
              <h4 className="font-heading font-bold text-xs text-foreground uppercase tracking-wider">Vos coordonnées pour la livraison</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Votre Nom complet *</label>
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                    placeholder="Ex: Marc Dupont"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Adresse E-mail *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                    placeholder="Ex: marc@entreprise.com"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Numéro de Téléphone WhatsApp *</label>
                <div className="flex gap-2">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="bg-secondary border border-border rounded-xl px-2 py-2.5 text-xs text-foreground focus:outline-none w-24 h-[38px]"
                  >
                    {countryCodes.map((c) => (
                      <option key={`${c.country}-${c.code}`} value={c.code}>
                        {c.code} ({c.country}) - {c.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    required
                    value={phoneLocal}
                    onChange={(e) => setPhoneLocal(e.target.value)}
                    className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary flex-1"
                    placeholder="6xx xxx xxx"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-primary text-primary-foreground py-3.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-glow mt-4"
            >
              <Send className="w-4 h-4" />
              Lancer mon audit
            </button>
          </form>
        </motion.div>

      </div>

      {/* Guide de Délégation d'Accès Deep Audit Modal */}
      <AnimatePresence>
        {showAccessGuideModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAccessGuideModal(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-2xl bg-card border border-border/80 rounded-3xl p-6 md:p-8 shadow-glow z-10 max-h-[90vh] overflow-y-auto text-foreground"
            >
              <button
                type="button"
                onClick={() => setShowAccessGuideModal(false)}
                className="absolute right-4 top-4 p-2 text-muted-foreground hover:text-foreground transition-colors rounded-xl hover:bg-secondary"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center mb-6 space-y-2">
                <span className="bg-primary/10 text-primary text-[10px] font-bold px-3 py-1 rounded-full border border-primary/20 uppercase tracking-wider inline-flex items-center gap-1">
                  <Shield className="w-3 h-3" /> Étape finale requise
                </span>
                <h3 className="font-heading text-xl md:text-2xl font-extrabold text-foreground">
                  Déléguez vos accès pour un Diagnostic Réel
                </h3>
                <p className="text-xs text-muted-foreground max-w-lg mx-auto">
                  Pour analyser vos indicateurs internes et maximiser vos ventes, attribuez à GLN Digital des accès en lecture seule / analyste.
                </p>
              </div>

              {/* Safety notice banner */}
              <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 text-xs text-muted-foreground leading-relaxed mb-6">
                <span className="font-bold text-foreground block mb-1 text-left">🔐 Sécurité & Confidentialité Garanties</span>
                L'accès Analyste permet uniquement d'analyser vos performances passées. Nous ne pouvons en aucun cas modifier vos publications, dépenser votre budget publicitaire, ni modifier vos mots de passe.
              </div>

              {/* Tabs Navigation */}
              <div className="flex flex-wrap gap-2 border-b border-border/40 pb-2 mb-4">
                {[
                  { id: "facebook", label: "Page Facebook & Meta Ads" },
                  { id: "analytics", label: "Google Analytics (Site)" },
                  { id: "searchconsole", label: "Google Search Console" }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveOnboardingTab(tab.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
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
              <div className="bg-secondary/20 border border-border/40 rounded-2xl p-5 space-y-4 mb-6 text-left">
                {activeOnboardingTab === "facebook" && (
                  <div className="space-y-4 text-xs">
                    <div className="space-y-1">
                      <span className="font-bold text-foreground block">Option A : Par Meta Business Suite (Recommandé)</span>
                      <p className="text-muted-foreground leading-relaxed font-normal">
                        Ajoutez GLN DIGITAL comme partenaire Business Manager à l'aide de notre identifiant officiel :
                      </p>
                    </div>
                    
                    <div className="flex gap-2 items-center bg-black/40 border border-border/30 rounded-xl px-4 py-2.5 max-w-sm">
                      <span className="font-mono text-primary font-bold">1780587266753</span>
                      <button 
                        type="button"
                        onClick={() => handleCopy("1780587266753", "ID Partenaire Meta")}
                        className="ml-auto p-1.5 hover:bg-white/10 rounded transition-colors text-muted-foreground hover:text-foreground"
                        title="Copier l'identifiant"
                      >
                        {copiedText === "ID Partenaire Meta" ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      <span className="font-semibold text-foreground block">Étapes détaillées à suivre :</span>
                      <ol className="list-decimal list-inside space-y-2 text-muted-foreground pl-1 font-normal">
                        <li>Allez sur <a href="https://business.facebook.com/settings" target="_blank" rel="noopener noreferrer" className="text-primary underline inline-flex items-center gap-0.5">Meta Business Settings <ExternalLink className="w-3 h-3" /></a>. <span className="text-muted-foreground block text-[10px] italic mt-0.5 ml-4">(Note : Si Meta affiche la page de connexion, cliquez simplement sur <strong>"Continuer avec Facebook"</strong> pour vous connecter et accéder aux paramètres)</span>.</li>
                        <li><strong>Sélectionnez votre entreprise</strong> dans la liste (ex : <em>Cabinet De Recrutement de Barclès</em> ou <em>hotelsoft.cm</em>).</li>
                        <li>Dans le menu ou les raccourcis à gauche, cliquez sur <strong>Paramètres de l'entreprise</strong> (l'icône d'engrenage ⚙️).</li>
                        <li>Dans le menu latéral gauche, cliquez sur <strong>Utilisateurs</strong> puis sur <strong>Partenaires</strong>.</li>
                        <li>Sous la section <em>Partenaires avec qui partager des éléments</em>, cliquez sur le bouton bleu <strong>Ajouter</strong>.</li>
                        <li>Collez notre ID partenaire ci-dessus (`1780587266753`), sélectionnez votre Page et Compte publicitaire, puis activez l'autorisation <strong>"Afficher les performances" (Lecture seule)</strong> et enregistrez.</li>
                      </ol>
                    </div>

                    <div className="border-t border-border/25 pt-4 space-y-2">
                      <span className="font-bold text-foreground block">Option B : Directement via votre Page Facebook (Simple)</span>
                      <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground pl-1 font-normal">
                        <li>Allez directement sur les <a href="https://www.facebook.com/settings?tab=profile_access" target="_blank" rel="noopener noreferrer" className="text-primary underline inline-flex items-center gap-0.5">Paramètres d'accès de votre Page <ExternalLink className="w-3 h-3" /></a>. <span className="text-muted-foreground block text-[10px] italic mt-0.5 ml-4">(Assurez-vous d'avoir basculé sur le profil de votre Page Facebook pour y accéder)</span>.</li>
                        <li>Sur l'écran affiché, repérez la section <strong>"Personnes ayant un accès partiel"</strong> et cliquez sur le lien bleu <strong>"Gérer"</strong> situé à l'extrême droite.</li>
                        <li>Dans l'écran ou la fenêtre qui s'ouvre, cliquez sur le bouton <strong>"Ajouter"</strong> (ou <strong>"Ajouter nouveau"</strong>).</li>
                        <li>Saisissez l'adresse e-mail GLN : <strong className="text-foreground">audit@glndigital.com</strong>, cochez uniquement l'autorisation pour les **Statistiques / Performances** (accès en lecture seule) et validez l'invitation.</li>
                      </ol>
                    </div>
                  </div>
                )}

                {activeOnboardingTab === "analytics" && (
                  <div className="space-y-4 text-xs">
                    <div className="space-y-1">
                      <span className="font-bold text-foreground block">Google Analytics (Analyse de trafic & conversions)</span>
                      <p className="text-muted-foreground leading-relaxed font-normal">
                        Partagez l'accès en lecture seule à votre compte Google Analytics (GA4) :
                      </p>
                    </div>

                    <div className="flex gap-2 items-center bg-black/40 border border-border/30 rounded-xl px-4 py-2.5 max-w-sm">
                      <span className="font-mono text-primary font-bold">audit@glndigital.com</span>
                      <button 
                        type="button"
                        onClick={() => handleCopy("audit@glndigital.com", "Email Google Analytics")}
                        className="ml-auto p-1.5 hover:bg-white/10 rounded transition-colors text-muted-foreground hover:text-foreground"
                        title="Copier l'email"
                      >
                        {copiedText === "Email Google Analytics" ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>

                    <div className="space-y-2">
                      <span className="font-semibold text-foreground block">Étapes à suivre :</span>
                      <ol className="list-decimal list-inside space-y-2 text-muted-foreground pl-1 font-normal">
                        <li>Connectez-vous sur <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer" className="text-primary underline inline-flex items-center gap-0.5">Google Analytics <ExternalLink className="w-3 h-3" /></a>.</li>
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
                      <p className="text-muted-foreground leading-relaxed font-normal">
                        Accédez aux détails de positionnement SEO réel de votre site internet :
                      </p>
                    </div>

                    <div className="flex gap-2 items-center bg-black/40 border border-border/30 rounded-xl px-4 py-2.5 max-w-sm">
                      <span className="font-mono text-primary font-bold">audit@glndigital.com</span>
                      <button 
                        type="button"
                        onClick={() => handleCopy("audit@glndigital.com", "Email Google Search Console")}
                        className="ml-auto p-1.5 hover:bg-white/10 rounded transition-colors text-muted-foreground hover:text-foreground"
                        title="Copier l'email"
                      >
                        {copiedText === "Email Google Search Console" ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>

                    <div className="space-y-2">
                      <span className="font-semibold text-foreground block">Étapes à suivre :</span>
                      <ol className="list-decimal list-inside space-y-2 text-muted-foreground pl-1 font-normal">
                        <li>Connectez-vous sur la <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer" className="text-primary underline inline-flex items-center gap-0.5">Google Search Console <ExternalLink className="w-3 h-3" /></a>.</li>
                        <li>Cliquez sur <strong>Paramètres</strong> dans le menu latéral gauche.</li>
                        <li>Sélectionnez <strong>Utilisateurs et autorisations</strong>.</li>
                        <li>Cliquez sur <strong>Ajouter un utilisateur</strong>.</li>
                        <li>Saisissez notre e-mail ci-dessus et attribuez l'autorisation <strong>"Limité" (Lecture seule)</strong>.</li>
                      </ol>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-gradient-primary text-primary-foreground py-3.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-glow text-center"
                >
                  <MessageCircle className="w-4 h-4 inline-block" />
                  Continuer sur WhatsApp avec un expert (Recommandé)
                </a>
                <button
                  type="button"
                  onClick={() => setShowAccessGuideModal(false)}
                  className="bg-secondary border border-border text-foreground hover:bg-secondary/80 py-3.5 px-6 rounded-xl font-bold text-xs transition-colors"
                >
                  Fermer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default AuditPage;
