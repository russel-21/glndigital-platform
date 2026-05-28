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

const DashboardPartenaire = () => {
  const [copied, setCopied] = useState<boolean>(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(partner.link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen pt-24 pb-16 bg-background">
      <div className="container mx-auto px-4 md:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="font-heading text-2xl md:text-3xl font-extrabold text-foreground">Espace Partenaire</h1>
            <p className="text-muted-foreground text-sm">
              Bonjour, <span className="text-primary font-semibold">{partner.name}</span> • Partenaire de croissance officiel GLN DIGITAL
            </p>
          </div>
          <div className="flex items-center gap-2 bg-secondary px-4 py-2 rounded-xl border border-border">
            <Award className="w-5 h-5 text-accent" />
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">Niveau: {partner.level}</span>
          </div>
        </div>

        {/* Affiliate Quick Actions */}
        <div className="p-6 rounded-2xl bg-card border border-border/40 mb-8">
          <h3 className="font-heading font-bold text-lg mb-4">Votre lien de recommandation unique</h3>
          <p className="text-muted-foreground text-xs mb-4">
            Partagez ce lien avec vos prospects, vos clients ou sur vos réseaux sociaux. Chaque personne qui achète via ce lien vous rapporte des commissions automatiques.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 bg-secondary/40 border border-border rounded-xl px-4 py-3 flex items-center justify-between overflow-x-auto text-xs font-medium text-muted-foreground font-mono">
              {partner.link}
            </div>
            <button
              onClick={copyToClipboard}
              className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity text-xs"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copié !
                </>
              ) : (
                <>
                  <Clipboard className="w-4 h-4" />
                  Copier le lien
                </>
              )}
            </button>
          </div>
        </div>

        {/* Analytics Statistics */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {[
            { label: "Clics de recommandation", value: partner.stats.clicks, icon: Share2, color: "text-blue-400" },
            { label: "Prospects générés", value: partner.stats.leads, icon: Users, color: "text-primary" },
            { label: "Ventes conclues", value: partner.stats.sales, icon: Check, color: "text-green-400" },
            { label: "Taux de conversion", value: partner.stats.conversion, icon: TrendingUp, color: "text-accent" },
            { label: "Commissions gagnées", value: partner.stats.earnings, icon: DollarSign, color: "text-amber-400" }
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

        {/* Pipeline & Sales Table */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sales Pipeline */}
          <div className="lg:col-span-2 space-y-6">
            <div className="p-6 rounded-2xl bg-card border border-border/40">
              <h3 className="font-heading font-bold text-lg mb-4 text-foreground">Pipeline & Suivi des ventes</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border/60 text-xs font-bold text-muted-foreground">
                      <th className="pb-3 pr-4">Prospect / Entreprise</th>
                      <th className="pb-3 pr-4">Service demandé</th>
                      <th className="pb-3 pr-4">Statut</th>
                      <th className="pb-3 text-right">Commission</th>
                    </tr>
                  </thead>
                  <tbody>
                    {partner.pipeline.map((item, idx) => (
                      <tr key={idx} className="border-b border-border/40 text-xs text-muted-foreground">
                        <td className="py-4 pr-4 font-semibold text-foreground">{item.name}</td>
                        <td className="py-4 pr-4">{item.type}</td>
                        <td className="py-4 pr-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                            item.status === "Paiement reçu" || item.status === "Closing effectué"
                              ? "bg-green-500/10 text-green-400 border border-green-500/20"
                              : item.status === "En négociation"
                              ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                              : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="py-4 text-right font-bold text-foreground">{item.commission}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Resources & Sales Kits */}
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-card border border-border/40">
              <h3 className="font-heading font-bold text-lg mb-4 text-foreground">Outils & Kit de Vente</h3>
              <p className="text-muted-foreground text-xs mb-6">
                Téléchargez les ressources commerciales officielles créées par GLN DIGITAL pour closer vos prospects facilement.
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
                      <span className="text-xs font-bold block text-foreground">Scripts de vente WhatsApp</span>
                      <span className="text-[10px] text-muted-foreground">Réponses aux objections clés</span>
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
                      <span className="text-xs font-bold block text-foreground">Brochure Tarifs GLN DIGITAL</span>
                      <span className="text-[10px] text-muted-foreground">Formats PDF pour envoi direct</span>
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
