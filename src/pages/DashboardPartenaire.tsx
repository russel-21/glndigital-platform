import { useState } from "react";
import { motion } from "framer-motion";
import { DollarSign, Link, Users, TrendingUp, Download, MessageSquare, Clipboard, Check, Share2, Award } from "lucide-react";

// Mock partner profile & analytics data
const partner = {
  name: "Jean Dupuy",
  code: "GLN-JEAN",
  link: "https://glndigital1.vercel.app/ref/jean",
  level: "Conseiller Digital Certifié",
  badge: "Silver",
  stats: {
    clicks: 124,
    leads: 24,
    sales: 11,
    conversion: "45.8%",
    earnings: "182 000 FCFA"
  },
  pipeline: [
    { name: "Hôtel Saint-Georges", type: "Création Site Internet", status: "Closing effectué", commission: "45 000 FCFA" },
    { name: "Marie K. (Coiffure)", type: "Formation CM", status: "Paiement reçu", commission: "15 000 FCFA" },
    { name: "Cabinet Delta", type: "Publicité Meta Ads", status: "En négociation", commission: "Estimation: 30 000 FCFA" },
    { name: "Kossy Cosmetics", type: "Gestion Pages", status: "Nouveau lead", commission: "En cours" }
  ]
};

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/useLanguage";

const DashboardPartenaire = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [copied, setCopied] = useState<boolean>(false);
  const [profile, setProfile] = useState<any>(null);
  const [partnerCity, setPartnerCity] = useState<string>("");

  useEffect(() => {
    if (profile?.id) {
      const savedCity = localStorage.getItem(`gln_partner_city_${profile.id}`) || "";
      setPartnerCity(savedCity);
    }
  }, [profile]);

  // Auth Protection & Role verification
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      try {
        if (!session) {
          toast.error(language === "fr" ? "Veuillez vous connecter pour accéder à l'espace partenaire." : "Please log in to access the partner space.");
          navigate("/auth");
          return;
        }
        
        const { data: userProfile, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();
          
        if (error || !userProfile) {
          console.warn("Profile not found in database, falling back to simulated profile.");
          const simulatedEmail = session.user.email || "user@example.com";
          setProfile({
            id: session.user.id,
            email: simulatedEmail,
            full_name: session.user.user_metadata?.full_name || simulatedEmail.split('@')[0],
            phone: session.user.user_metadata?.phone || "+237692062677",
            roles: ["partner"],
            current_role: "partner"
          });
          return;
        }

        if (userProfile.current_role !== "partner") {
          toast.error(language === "fr" ? "Accès réservé. Rôle actuel non autorisé pour cet espace." : "Access denied. Current role not authorized for this space.");
          if (userProfile.current_role === "student") {
            navigate("/eleve-dashboard");
          } else {
            navigate("/auth");
          }
          return;
        }

        setProfile(userProfile);
      } catch (err) {
        console.error("DashboardPartenaire auth check error:", err);
        const simulatedEmail = session?.user?.email || "user@example.com";
        setProfile({
          id: session?.user?.id || "mock-id",
          email: simulatedEmail,
          full_name: session?.user?.user_metadata?.full_name || simulatedEmail.split('@')[0],
          phone: session?.user?.user_metadata?.phone || "+237692062677",
          roles: ["partner"],
          current_role: "partner"
        });
      }
    });
  }, [navigate, language]);

  const copyToClipboard = () => {
    const affiliateLink = `https://glndigital1.vercel.app/ref/${profile?.full_name?.toLowerCase().replace(/\s+/g, '-') || 'gln'}`;
    navigator.clipboard.writeText(affiliateLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveCity = () => {
    if (profile?.id) {
      localStorage.setItem(`gln_partner_city_${profile.id}`, partnerCity);
      toast.success(
        language === "fr" 
          ? `Ville "${partnerCity}" enregistrée avec succès !` 
          : `City "${partnerCity}" successfully saved!`
      );
    } else {
      localStorage.setItem(`gln_partner_city_guest`, partnerCity);
      toast.success(
        language === "fr" 
          ? `Ville "${partnerCity}" enregistrée !` 
          : `City "${partnerCity}" saved!`
      );
    }
  };

  const translations = {
    fr: {
      title: "Espace Partenaire",
      hello: "Bonjour",
      growthPartner: "Partenaire de croissance officiel GLN DIGITAL",
      level: "Niveau",
      certLevel: "Conseiller Digital Certifié",
      refLinkTitle: "Votre lien de recommandation unique",
      refLinkDesc: "Partagez ce lien avec vos prospects, vos clients ou sur vos réseaux sociaux. Chaque personne qui achète via ce lien vous rapporte des commissions automatiques.",
      copied: "Copié !",
      copyLink: "Copier le lien",
      clicks: "Clics de recommandation",
      leads: "Prospects générés",
      sales: "Ventes conclues",
      convRate: "Taux de conversion",
      earnings: "Commissions gagnées",
      pipelineTitle: "Pipeline & Suivi des ventes",
      colProspect: "Prospect / Entreprise",
      colService: "Service demandé",
      colStatus: "Statut",
      colCommission: "Commission",
      toolsTitle: "Outils & Kit de Vente",
      toolsDesc: "Téléchargez les ressources commerciales officielles créées par GLN DIGITAL pour closer vos prospects facilement.",
      whatsappScripts: "Scripts de vente WhatsApp",
      whatsappDesc: "Réponses aux objections clés",
      pricingBrochure: "Brochure Tarifs GLN DIGITAL",
      pricingDesc: "Formats PDF pour envoi direct",
      cityCardTitle: "Paramètres de localisation",
      cityCardDesc: "Renseignez votre ville actuelle pour nous aider à attribuer localement les demandes de services physiques.",
      cityLabel: "Ville de résidence",
      cityPlaceholder: "Ex: Douala, Yaoundé, Paris...",
      saveButton: "Enregistrer la ville",
      statusClosing: "Closing effectué",
      statusPaid: "Paiement reçu",
      statusNeg: "En négociation",
      statusNew: "Nouveau lead",
      estCommission: "Estimation: ",
      inProgress: "En cours"
    },
    en: {
      title: "Partner Space",
      hello: "Hello",
      growthPartner: "Official GLN DIGITAL Growth Partner",
      level: "Level",
      certLevel: "Certified Digital Advisor",
      refLinkTitle: "Your Unique Referral Link",
      refLinkDesc: "Share this link with your prospects, clients, or on social media. Every purchase made through this link earns you automatic commissions.",
      copied: "Copied!",
      copyLink: "Copy Link",
      clicks: "Referral Clicks",
      leads: "Leads Generated",
      sales: "Closed Sales",
      convRate: "Conversion Rate",
      earnings: "Earned Commissions",
      pipelineTitle: "Pipeline & Sales Tracking",
      colProspect: "Prospect / Company",
      colService: "Service Requested",
      colStatus: "Status",
      colCommission: "Commission",
      toolsTitle: "Sales Kit & Tools",
      toolsDesc: "Download the official sales resources created by GLN DIGITAL to easily close your prospects.",
      whatsappScripts: "WhatsApp Sales Scripts",
      whatsappDesc: "Answers to key objections",
      pricingBrochure: "GLN DIGITAL Pricing Brochure",
      pricingDesc: "PDF formats for direct sharing",
      cityCardTitle: "Location Settings",
      cityCardDesc: "Enter your current city to help us assign local physical service inquiries to you.",
      cityLabel: "City of residence",
      cityPlaceholder: "E.g., Douala, Yaounde, Paris...",
      saveButton: "Save City",
      statusClosing: "Closing done",
      statusPaid: "Payment received",
      statusNeg: "In negotiation",
      statusNew: "New lead",
      estCommission: "Estimate: ",
      inProgress: "In progress"
    }
  };

  const tPartner = language === "fr" ? translations.fr : translations.en;

  // Local helper to translate mock services & status on the fly
  const getServiceLabel = (type: string) => {
    if (language === "en") {
      if (type === "Création Site Internet") return "Website Creation";
      if (type === "Formation CM") return "CM Training";
      if (type === "Publicité Meta Ads") return "Meta Ads Advertising";
      if (type === "Gestion Pages") return "Page Management";
    }
    return type;
  };

  const getStatusLabel = (status: string) => {
    if (status === "Closing effectué") return tPartner.statusClosing;
    if (status === "Paiement reçu") return tPartner.statusPaid;
    if (status === "En négociation") return tPartner.statusNeg;
    if (status === "Nouveau lead") return tPartner.statusNew;
    return status;
  };

  const getCommissionLabel = (commission: string) => {
    if (language === "en" && commission.startsWith("Estimation: ")) {
      return commission.replace("Estimation: ", tPartner.estCommission);
    }
    if (language === "en" && commission === "En cours") {
      return tPartner.inProgress;
    }
    return commission;
  };

  return (
    <div className="min-h-screen pt-24 pb-16 bg-background">
      <div className="container mx-auto px-4 md:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="font-heading text-2xl md:text-3xl font-extrabold text-foreground">{tPartner.title}</h1>
            <p className="text-muted-foreground text-sm">
              {tPartner.hello}, <span className="text-primary font-semibold">{profile?.full_name || partner.name}</span> • {tPartner.growthPartner}
            </p>
          </div>
          <div className="flex items-center gap-2 bg-secondary px-4 py-2 rounded-xl border border-border">
            <Award className="w-5 h-5 text-accent" />
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">{tPartner.level}: {language === "fr" ? partner.level : tPartner.certLevel}</span>
          </div>
        </div>

        {/* Affiliate Quick Actions */}
        <div className="p-6 rounded-2xl bg-card border border-border/40 mb-8">
          <h3 className="font-heading font-bold text-lg mb-4">{tPartner.refLinkTitle}</h3>
          <p className="text-muted-foreground text-xs mb-4">
            {tPartner.refLinkDesc}
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 bg-secondary/40 border border-border rounded-xl px-4 py-3 flex items-center justify-between overflow-x-auto text-xs font-medium text-muted-foreground font-mono">
              {`https://glndigital1.vercel.app/ref/${profile?.full_name?.toLowerCase().replace(/\s+/g, '-') || 'gln'}`}
            </div>
            <button
              onClick={copyToClipboard}
              className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity text-xs whitespace-nowrap"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  {tPartner.copied}
                </>
              ) : (
                <>
                  <Clipboard className="w-4 h-4" />
                  {tPartner.copyLink}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Analytics Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {[
            { label: tPartner.clicks, value: partner.stats.clicks, icon: Share2, color: "text-blue-400" },
            { label: tPartner.leads, value: partner.stats.leads, icon: Users, color: "text-primary" },
            { label: tPartner.sales, value: partner.stats.sales, icon: Check, color: "text-green-400" },
            { label: tPartner.convRate, value: partner.stats.conversion, icon: TrendingUp, color: "text-accent" },
            { label: tPartner.earnings, value: partner.stats.earnings, icon: DollarSign, color: "text-amber-400" }
          ].map((st, idx) => (
            <div key={idx} className="p-5 rounded-2xl bg-card border border-border/40 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold text-muted-foreground uppercase leading-tight">{st.label}</span>
                <st.icon className={`w-4 h-4 ${st.color}`} />
              </div>
              <div className="text-xl md:text-2xl font-heading font-extrabold text-foreground mt-4">{st.value}</div>
            </div>
          ))}
        </div>

        {/* Pipeline & Sales Table + Settings */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sales Pipeline */}
          <div className="lg:col-span-2 space-y-6">
            <div className="p-6 rounded-2xl bg-card border border-border/40">
              <h3 className="font-heading font-bold text-lg mb-4 text-foreground">{tPartner.pipelineTitle}</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border/60 text-xs font-bold text-muted-foreground">
                      <th className="pb-3 pr-4">{tPartner.colProspect}</th>
                      <th className="pb-3 pr-4">{tPartner.colService}</th>
                      <th className="pb-3 pr-4">{tPartner.colStatus}</th>
                      <th className="pb-3 text-right">{tPartner.colCommission}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {partner.pipeline.map((item, idx) => (
                      <tr key={idx} className="border-b border-border/40 text-xs text-muted-foreground">
                        <td className="py-4 pr-4 font-semibold text-foreground">{item.name}</td>
                        <td className="py-4 pr-4">{getServiceLabel(item.type)}</td>
                        <td className="py-4 pr-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                            item.status === "Paiement reçu" || item.status === "Closing effectué"
                              ? "bg-green-500/10 text-green-400 border border-green-500/20"
                              : item.status === "En négociation"
                              ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                              : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                          }`}>
                            {getStatusLabel(item.status)}
                          </span>
                        </td>
                        <td className="py-4 text-right font-bold text-foreground">{getCommissionLabel(item.commission)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Location settings & Resources & Sales Kits */}
          <div className="space-y-6">
            {/* City Settings Card */}
            <div className="p-6 rounded-2xl bg-card border border-border/40">
              <h3 className="font-heading font-bold text-lg mb-2 text-foreground">{tPartner.cityCardTitle}</h3>
              <p className="text-muted-foreground text-xs mb-4">
                {tPartner.cityCardDesc}
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">
                    {tPartner.cityLabel}
                  </label>
                  <input
                    type="text"
                    value={partnerCity}
                    onChange={(e) => setPartnerCity(e.target.value)}
                    placeholder={tPartner.cityPlaceholder}
                    className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/50 transition-colors"
                  />
                </div>
                <button
                  onClick={handleSaveCity}
                  className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl font-bold hover:opacity-90 transition-opacity text-xs"
                >
                  {tPartner.saveButton}
                </button>
              </div>
            </div>

            {/* Sales Kits */}
            <div className="p-6 rounded-2xl bg-card border border-border/40">
              <h3 className="font-heading font-bold text-lg mb-4 text-foreground">{tPartner.toolsTitle}</h3>
              <p className="text-muted-foreground text-xs mb-6">
                {tPartner.toolsDesc}
              </p>
              <div className="space-y-3">
                <a
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  className="p-4 rounded-xl bg-secondary/30 border border-border hover:border-primary/30 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-5 h-5 text-primary" />
                    <div className="text-left">
                      <span className="text-xs font-bold block text-foreground">{tPartner.whatsappScripts}</span>
                      <span className="text-[10px] text-muted-foreground">{tPartner.whatsappDesc}</span>
                    </div>
                  </div>
                  <Download className="w-4 h-4 text-muted-foreground" />
                </a>
                <a
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  className="p-4 rounded-xl bg-secondary/30 border border-border hover:border-primary/30 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-5 h-5 text-primary" />
                    <div className="text-left">
                      <span className="text-xs font-bold block text-foreground">{tPartner.pricingBrochure}</span>
                      <span className="text-[10px] text-muted-foreground">{tPartner.pricingDesc}</span>
                    </div>
                  </div>
                  <Download className="w-4 h-4 text-muted-foreground" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPartenaire;
