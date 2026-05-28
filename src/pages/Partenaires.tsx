import { useState } from "react";
import { motion } from "framer-motion";
import { Award, ShieldCheck, Star, Users, ArrowRight, BookOpen, UserCheck, MessageCircle } from "lucide-react";

const partnerTypes = [
  {
    type: "Ambassadeur",
    commission: "10% - 20%",
    desc: "Recommandez nos formations ou services digitaux à votre réseau. Idéal pour les étudiants, freelances et créateurs de contenu.",
    features: [
      "Lien affilié de tracking unique",
      "Kit de visuels et bannières promotionnelles",
      "Paiements mensuels garantis par Mobile Money",
    ],
  },
  {
    type: "Conseiller Digital",
    commission: "15% - 25%",
    desc: "Qualifiez les besoins des PME locales (Douala/Yaoundé) et proposez nos services d'agence en tant que représentant officiel certifié.",
    features: [
      "Mini-formation gratuite aux services GLN",
      "Fiche profil partenaire sur notre plateforme",
      "Scripts de prospection et brochures professionnelles",
    ],
  },
  {
    type: "Closer Certifié",
    commission: "20% - 35%",
    desc: "Prenez en main les leads chauds générés par nos publicités, organisez des rendez-vous et concluez les ventes de services.",
    features: [
      "Accès prioritaire à notre CRM de prospects",
      "Badge officiel de Closer Certifié GLN DIGITAL",
      "Coaching commercial hebdomadaire",
    ],
  },
];

const Partenaires = () => {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    city: "Douala",
    type: "Ambassadeur",
    experience: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4 md:px-8 max-w-5xl">
        {/* Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="bg-primary/10 text-primary text-xs font-semibold px-4 py-1.5 rounded-full border border-primary/20">
            Programme Partenaires GLN
          </span>
          <h1 className="font-heading text-4xl md:text-5xl font-bold mt-6 mb-4">
            Développez vos revenus en représentant des <span className="text-gradient-primary">solutions crédibles</span>
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-base">
            Devenez ambassadeur, conseiller ou closer officiel certifié par GLN DIGITAL et touchez des commissions attractives sur le marché camerounais.
          </p>
        </motion.div>

        {/* Partenariats Options Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {partnerTypes.map((pt, idx) => (
            <motion.div
              key={pt.type}
              className="p-6 md:p-8 rounded-2xl bg-card border border-border/40 hover:border-primary/20 transition-colors flex flex-col justify-between"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.08 }}
            >
              <div>
                <span className="text-xs text-primary font-bold tracking-wider block mb-1">Commission : {pt.commission}</span>
                <h3 className="font-heading text-lg font-bold mb-3">{pt.type}</h3>
                <p className="text-muted-foreground text-xs leading-relaxed mb-6">{pt.desc}</p>
                <div className="space-y-2 mb-6">
                  {pt.features.map((feat, fidx) => (
                    <div key={fidx} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
              <Link
                to="/partenaires-dashboard"
                className="w-full bg-secondary hover:bg-primary/20 text-center py-2.5 rounded-lg font-semibold text-xs border border-border transition-colors block"
              >
                Accéder au Dashboard
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Application Form */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h2 className="font-heading text-2xl font-bold">Pourquoi nous rejoindre ?</h2>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-heading font-bold text-sm">Crédibilité totale</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Vous vendez des services d'une agence ayant fait ses preuves avec des clients comme Vendôme Hôtel ou Résidence HMR.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-heading font-bold text-sm">Formation & Certification</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Nous vous formons aux techniques de vente et objections pour vous garantir des résultats rapides.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 md:p-8 rounded-2xl bg-card border border-border/40">
            <h3 className="font-heading font-bold text-lg mb-6">Rejoindre le réseau de partenaires</h3>
            {submitted ? (
              <div className="text-center py-8 space-y-4">
                <ShieldCheck className="w-12 h-12 text-primary mx-auto" />
                <h4 className="font-heading font-bold text-lg">Candidature reçue !</h4>
                <p className="text-xs text-muted-foreground">
                  Nous analysons votre profil et vous contacterons sous 48 heures pour valider votre accès.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Nom complet</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                    placeholder="Votre nom complet"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">Téléphone (WhatsApp)</label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                      placeholder="+237 6xx xxx xxx"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">Ville de résidence</label>
                    <select
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                    >
                      <option value="Douala">Douala</option>
                      <option value="Yaoundé">Yaoundé</option>
                      <option value="Autre">Autre</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Rôle visé</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                  >
                    <option value="Ambassadeur">Ambassadeur (Recommandation)</option>
                    <option value="Conseiller Digital">Conseiller Digital (Représentant)</option>
                    <option value="Closer Certifié">Closer Certifié (Closer CRM)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Motivation / Expérience (Facultatif)</label>
                  <textarea
                    value={formData.experience}
                    onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                    className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary h-20 resize-none"
                    placeholder="Parlez-nous brièvement de votre parcours"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-bold text-xs flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                >
                  Envoyer ma candidature
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Partenaires;
