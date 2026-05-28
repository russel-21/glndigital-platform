import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, BarChart3, Target, Users, Zap, TrendingUp, CheckCircle2, MessageCircle, Play, GraduationCap } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";
import TestimonialsSection from "@/components/TestimonialsSection";
import PortfolioSection from "@/components/PortfolioSection";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.6 } }),
};

const benefits = [
  "Plus de visibilité qualifiée et de notoriété de marque au Cameroun",
  "Plus de messages prospects entrants sur WhatsApp",
  "Plus de leads qualifiés prêts à acheter",
  "Plus de ventes régulières et d'abonnements",
  "Une image de marque premium et haut de gamme",
];

const stats = [
  { value: "+10", label: "Marques leaders accompagnées" },
  { value: "+100", label: "Contenus viraux & visuels créés" },
  { value: "+500K", label: "Personnes touchées au Cameroun" },
];

const trustLogos = [
  { name: "Vendôme Hôtel", type: "Hôtellerie" },
  { name: "Residence HMR", type: "Immobilier" },
  { name: "Pacifik", type: "Restauration" },
  { name: "Hotelsoft", type: "SaaS / Tech" },
  { name: "Cadafi Cosmetik", type: "Cosmétique" },
  { name: "Kymo Cosmetics", type: "Cosmétique" },
];

const servicesOverview = [
  {
    title: "Social Media Management",
    desc: "Nous gérons vos pages Facebook, Instagram et TikTok pour développer votre visibilité au Cameroun.",
    action: "Demander un devis",
    link: "/services"
  },
  {
    title: "Publicité Meta Ads",
    desc: "Campagnes Facebook & Instagram optimisées pour attirer des prospects qualifiés et générer des ventes.",
    action: "Lancer une campagne",
    link: "/services"
  },
  {
    title: "Création de site internet",
    desc: "Sites modernes, rapides, responsive et optimisés conversion (hôtels, e-commerce, immobilier).",
    action: "Créer mon site",
    link: "/services"
  },
  {
    title: "Création de contenu",
    desc: "Des contenus qui captent l'attention en 3 secondes : Reels, vidéos courtes, affiches publicitaires.",
    action: "Créer mon contenu",
    link: "/services"
  }
];

const formationsOverview = [
  {
    title: "Marketing Digital Professionnel",
    desc: "Apprenez la stratégie, les Meta Ads, la génération de clients et les tunnels de vente simples.",
    duration: "6 semaines",
    price: "Sur devis"
  },
  {
    title: "Community Management",
    desc: "Maîtrisez Facebook, Instagram, TikTok, la planification de contenu et Canva.",
    duration: "4 semaines",
    price: "Sur devis"
  },
  {
    title: "Création de contenu & IA",
    desc: "Apprenez Canva, CapCut, ChatGPT et l'IA vidéo pour booster votre image de marque.",
    duration: "3 semaines",
    price: "Sur devis"
  }
];

const steps = [
  { step: "01", name: "Audit gratuit", desc: "Analyse complète de votre présence actuelle et identification des failles." },
  { step: "02", name: "Stratégie personnalisée", desc: "Création d'un plan d'action sur-mesure orienté vers vos objectifs business." },
  { step: "03", name: "Mise en place", desc: "Production de contenus premium, lancement de campagnes et développement de sites." },
  { step: "04", name: "Optimisation continue", desc: "Analyse des chiffres, reporting et amélioration constante des performances." }
];

const Index = () => (
  <div className="min-h-screen pt-16 md:pt-20">
    {/* Hero Section */}
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      <div className="absolute inset-0">
        <img src={heroBg} alt="" className="w-full h-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/95 via-background/80 to-background" />
      </div>

      <div className="container relative mx-auto px-4 md:px-8 py-16">
        <motion.div
          className="max-w-4xl"
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
        >
          <motion.div variants={fadeUp} className="inline-block mb-6">
            <span className="bg-primary/10 text-primary text-xs font-semibold px-4 py-1.5 rounded-full border border-primary/20 tracking-wider uppercase">
              Écosystème de croissance digitale • Cameroun & International
            </span>
          </motion.div>

          <motion.h1 variants={fadeUp} className="font-heading text-4xl md:text-6xl font-bold leading-tight mb-6">
            Nous transformons votre présence digitale en{" "}
            <span className="text-gradient-primary">clients réels</span>.
          </motion.h1>

          <motion.p variants={fadeUp} className="text-lg md:text-xl text-muted-foreground mb-8 max-w-3xl leading-relaxed">
            Marketing digital, gestion des réseaux sociaux, publicité Meta Ads et création de sites web performants pour entreprises ambitieuses au Cameroun et à l'international.
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-wrap gap-4 mb-10">
            <a
              href="https://wa.me/237692062677"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-primary text-primary-foreground px-8 py-4 rounded-lg font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity shadow-glow"
            >
              <MessageCircle className="w-5 h-5 fill-current" />
              Parler sur WhatsApp
            </a>
            <Link
              to="/contact"
              className="border border-border bg-secondary/50 text-foreground px-8 py-4 rounded-lg font-semibold hover:bg-secondary transition-colors"
            >
              Demander mon audit gratuit
            </Link>
            <Link
              to="/formations"
              className="border border-primary/30 text-primary px-8 py-4 rounded-lg font-semibold hover:bg-primary/10 transition-colors flex items-center gap-2"
            >
              <GraduationCap className="w-5 h-5" />
              Découvrir les formations
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>

    {/* Authority & Trust Logos */}
    <section className="py-12 border-y border-border/50 bg-secondary/20">
      <div className="container mx-auto px-4 md:px-8">
        <p className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-8">
          Ils font confiance à GLN DIGITAL
        </p>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-6 md:gap-8 items-center justify-items-center">
          {trustLogos.map((logoItem) => (
            <div key={logoItem.name} className="text-center group">
              <span className="font-heading font-bold text-foreground/70 group-hover:text-primary transition-colors text-base md:text-lg block">
                {logoItem.name}
              </span>
              <span className="text-[10px] text-muted-foreground block tracking-wider uppercase mt-1">
                {logoItem.type}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Key Statistics */}
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center max-w-4xl mx-auto">
          {stats.map((stat, idx) => (
            <motion.div
              key={idx}
              className="p-6 rounded-2xl bg-card border border-border/40 shadow-glow"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
            >
              <div className="text-4xl md:text-5xl font-heading font-extrabold text-primary mb-2">
                {stat.value}
              </div>
              <div className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    {/* Section Services Premium */}
    <section className="py-20 bg-card/50 relative">
      <div className="container mx-auto px-4 md:px-8">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <span className="text-primary text-xs font-bold uppercase tracking-wider bg-primary/10 px-3 py-1 rounded-full">
            Nos Services Premium
          </span>
          <h2 className="font-heading text-3xl md:text-4xl font-bold mt-4 mb-6">
            Vos réseaux sociaux doivent générer des <span className="text-gradient-primary">opportunités</span>, pas seulement des likes.
          </h2>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
            Nous construisons des systèmes d'acquisition clients complets de la visibilité jusqu'à la conversion.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {servicesOverview.map((srv, idx) => (
            <motion.div
              key={idx}
              className="p-8 rounded-2xl bg-secondary/30 border border-border/60 hover:border-primary/40 transition-colors flex flex-col justify-between"
              whileHover={{ y: -5 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div>
                <h3 className="font-heading text-xl font-bold text-foreground mb-4">{srv.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-6">{srv.desc}</p>
              </div>
              <Link
                to={srv.link}
                className="text-primary font-semibold text-sm flex items-center gap-2 group mt-auto"
              >
                {srv.action} <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    {/* Section Formations */}
    <section className="py-20">
      <div className="container mx-auto px-4 md:px-8">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <span className="text-primary text-xs font-bold uppercase tracking-wider bg-primary/10 px-3 py-1 rounded-full">
            Académie GLN
          </span>
          <h2 className="font-heading text-3xl md:text-4xl font-bold mt-4 mb-6">
            Formez-vous aux métiers d'avenir du digital
          </h2>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
            Des formations pratiques, certifiantes et adaptées au marché pour propulser votre carrière ou votre business.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {formationsOverview.map((form, idx) => (
            <motion.div
              key={idx}
              className="p-6 rounded-2xl bg-secondary/30 border border-border/40 flex flex-col justify-between"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
            >
              <div>
                <span className="text-xs text-primary font-bold tracking-wider block mb-2">{form.duration}</span>
                <h3 className="font-heading text-lg font-bold mb-3">{form.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-6">{form.desc}</p>
              </div>
              <Link
                to="/formations"
                className="w-full bg-secondary hover:bg-primary/20 text-center py-2.5 rounded-lg font-semibold text-sm border border-border transition-colors block"
              >
                Découvrir le programme
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    {/* Why choose us */}
    <section className="py-20 bg-secondary/20">
      <div className="container mx-auto px-4 md:px-8">
        <h2 className="font-heading text-3xl md:text-4xl font-bold text-center mb-16">
          Pourquoi choisir <span className="text-gradient-primary">GLN DIGITAL</span> ?
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="p-6 rounded-xl bg-card border border-border/40">
            <div className="bg-primary/10 w-12 h-12 rounded-xl flex items-center justify-center text-primary mb-4 font-bold text-xl">01</div>
            <h3 className="font-heading font-bold text-lg mb-2">Stratégie orientée résultats</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Nous construisons un système digital de bout en bout axé sur vos conversions réelles, pas sur des métriques inutiles.
            </p>
          </div>
          <div className="p-6 rounded-xl bg-card border border-border/40">
            <div className="bg-primary/10 w-12 h-12 rounded-xl flex items-center justify-center text-primary mb-4 font-bold text-xl">02</div>
            <h3 className="font-heading font-bold text-lg mb-2">Accompagnement humain</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Un suivi rigoureux et un conseil régulier pour assurer l'évolution de vos équipes et de vos processus digitaux.
            </p>
          </div>
          <div className="p-6 rounded-xl bg-card border border-border/40">
            <div className="bg-primary/10 w-12 h-12 rounded-xl flex items-center justify-center text-primary mb-4 font-bold text-xl">03</div>
            <h3 className="font-heading font-bold text-lg mb-2">Solutions complètes</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Du branding à la création de contenu jusqu'à la publicité Meta Ads et le site web, vous disposez d'un seul partenaire.
            </p>
          </div>
        </div>
      </div>
    </section>

    {/* How we work */}
    <section className="py-20">
      <div className="container mx-auto px-4 md:px-8">
        <h2 className="font-heading text-3xl md:text-4xl font-bold text-center mb-16">
          Notre processus de travail
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
          {steps.map((st, idx) => (
            <div key={idx} className="relative">
              <span className="font-heading font-extrabold text-5xl text-border block mb-4">{st.step}</span>
              <h3 className="font-heading font-bold text-lg mb-2">{st.name}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{st.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Testimonials */}
    <TestimonialsSection />

    {/* Portfolio */}
    <PortfolioSection />

    {/* CTA Final */}
    <section className="py-24 bg-card relative overflow-hidden border-t border-border">
      <div className="container mx-auto px-4 md:px-8 text-center max-w-4xl relative z-10">
        <h2 className="font-heading text-3xl md:text-5xl font-bold mb-6">
          Votre entreprise mérite des clients réels.
        </h2>
        <p className="text-lg text-muted-foreground mb-8">
          Prêt à transformer votre visibilité en croissance économique tangible ? Lancez votre audit gratuit dès aujourd'hui.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <a
            href="https://wa.me/237692062677"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-primary text-primary-foreground px-8 py-4 rounded-lg font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity shadow-glow"
          >
            <MessageCircle className="w-5 h-5 fill-current" />
            Parler sur WhatsApp
          </a>
          <Link
            to="/contact"
            className="border border-border text-foreground bg-secondary/50 px-8 py-4 rounded-lg font-semibold hover:bg-secondary transition-colors"
          >
            Obtenir mon audit gratuit
          </Link>
        </div>
      </div>
    </section>
  </div>
);

export default Index;
