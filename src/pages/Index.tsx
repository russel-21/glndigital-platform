import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, BarChart3, Target, Users, Zap, TrendingUp, CheckCircle2, MessageCircle, Play, GraduationCap, Bell, FileText } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { getNotificationsForUser, getNotifications, Notification, markAsRead } from "@/lib/notificationsStore";
import heroBg from "@/assets/hero-bg.jpg";
import TestimonialsSection from "@/components/TestimonialsSection";
import PortfolioSection from "@/components/PortfolioSection";
import SiteContentBlocks from "@/components/SiteContentBlocks";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.6 } }),
};

const getBenefits = (language: string) => [
  language === "fr" ? "Plus de visibilité qualifiée et de notoriété de marque au Cameroun" : "More qualified visibility and brand awareness in Cameroon",
  language === "fr" ? "Plus de messages prospects entrants sur WhatsApp" : "More incoming prospect messages on WhatsApp",
  language === "fr" ? "Plus de leads qualifiés prêts à acheter" : "More qualified leads ready to buy",
  language === "fr" ? "Plus de ventes régulières et d'abonnements" : "More regular sales and subscriptions",
  language === "fr" ? "Une image de marque premium et haut de gamme" : "A premium and high-end brand image",
];

const getStats = (language: string) => [
  { value: "+10", label: language === "fr" ? "Marques leaders accompagnées" : "Leading brands supported" },
  { value: "+100", label: language === "fr" ? "Contenus viraux & visuels créés" : "Viral content & visuals created" },
  { value: "+500K", label: language === "fr" ? "Personnes touchées au Cameroun" : "People reached in Cameroon" },
];

const getTrustLogos = (language: string) => [
  { name: "Vendôme Hôtel", type: language === "fr" ? "Hôtellerie" : "Hospitality" },
  { name: "Residence HMR", type: language === "fr" ? "Immobilier" : "Real Estate" },
  { name: "Pacifik", type: language === "fr" ? "Restauration" : "Catering" },
  { name: "Hotelsoft", type: "SaaS / Tech" },
  { name: "Cadafi Cosmetik", type: language === "fr" ? "Cosmétique" : "Cosmetics" },
  { name: "Kymo Cosmetics", type: language === "fr" ? "Cosmétique" : "Cosmetics" },
];

const getServicesOverview = (language: string) => [
  {
    title: "Social Media Management",
    desc: language === "fr"
      ? "Nous gérons vos pages Facebook, Instagram et TikTok pour développer votre visibilité au Cameroun."
      : "We manage your Facebook, Instagram, and TikTok pages to grow your visibility in Cameroon.",
    action: language === "fr" ? "Demander un devis" : "Request a quote",
    link: "/services"
  },
  {
    title: "Publicité Meta Ads",
    desc: language === "fr"
      ? "Campagnes Facebook & Instagram optimisées pour attirer des prospects qualifiés et générer des ventes."
      : "Optimized Facebook & Instagram campaigns to attract qualified prospects and generate sales.",
    action: language === "fr" ? "Lancer une campagne" : "Launch a campaign",
    link: "/services"
  },
  {
    title: language === "fr" ? "Création de site internet" : "Website Creation",
    desc: language === "fr"
      ? "Sites modernes, rapides, responsive et optimisés conversion (hôtels, e-commerce, immobilier)."
      : "Modern, fast, responsive websites optimized for conversion (hotels, e-commerce, real estate).",
    action: language === "fr" ? "Créer mon site" : "Create my website",
    link: "/services"
  },
  {
    title: language === "fr" ? "Création de contenu" : "Content Creation",
    desc: language === "fr"
      ? "Des contenus qui captent l'attention en 3 secondes : Reels, vidéos courtes, affiches publicitaires."
      : "Content that captures attention in 3 seconds: Reels, short videos, advertising posters.",
    action: language === "fr" ? "Créer mon contenu" : "Create my content",
    link: "/services"
  }
];

const getFormationsOverview = (language: string) => [
  {
    title: language === "fr" ? "Marketing Digital Professionnel" : "Professional Digital Marketing",
    desc: language === "fr"
      ? "Apprenez la stratégie, les Meta Ads, la génération de clients et les tunnels de vente simples."
      : "Learn strategy, Meta Ads, customer generation, and simple sales funnels.",
    duration: language === "fr" ? "6 semaines" : "6 weeks",
    price: language === "fr" ? "Sur devis" : "Upon quote"
  },
  {
    title: "Community Management",
    desc: language === "fr"
      ? "Maîtrisez Facebook, Instagram, TikTok, la planification de contenu et Canva."
      : "Master Facebook, Instagram, TikTok, content scheduling, and Canva.",
    duration: language === "fr" ? "4 semaines" : "4 weeks",
    price: language === "fr" ? "Sur devis" : "Upon quote"
  },
  {
    title: language === "fr" ? "Création de contenu & IA" : "Content Creation & AI",
    desc: language === "fr"
      ? "Apprenez Canva, CapCut, ChatGPT et l'IA vidéo pour booster votre image de marque."
      : "Learn Canva, CapCut, ChatGPT, and video AI to boost your brand image.",
    duration: language === "fr" ? "3 semaines" : "3 weeks",
    price: language === "fr" ? "Sur devis" : "Upon quote"
  }
];

const getSteps = (language: string) => [
  {
    step: "01",
    name: language === "fr" ? "Audit gratuit" : "Free Audit",
    desc: language === "fr" ? "Analyse complète de votre présence actuelle et identification des failles." : "Comprehensive analysis of your current presence and identification of gaps."
  },
  {
    step: "02",
    name: language === "fr" ? "Stratégie personnalisée" : "Custom Strategy",
    desc: language === "fr" ? "Création d'un plan d'action sur-mesure orienté vers vos objectifs business." : "Creation of a tailor-made action plan oriented towards your business goals."
  },
  {
    step: "03",
    name: language === "fr" ? "Mise en place" : "Implementation",
    desc: language === "fr" ? "Production de contenus premium, lancement de campagnes et développement de sites." : "Production of premium content, launching campaigns, and developing websites."
  },
  {
    step: "04",
    name: language === "fr" ? "Optimisation continue" : "Continuous Optimization",
    desc: language === "fr" ? "Analyse des chiffres, reporting et amélioration constante des performances." : "Analysis of figures, reporting, and constant performance improvement."
  }
];

const Index = () => {
  const { language, t } = useLanguage();

  const stats = getStats(language);
  const trustLogos = getTrustLogos(language);
  const servicesOverview = getServicesOverview(language);
  const formationsOverview = getFormationsOverview(language);
  const steps = getSteps(language);

  const [visitorNotifs, setVisitorNotifs] = useState<Notification[]>([]);
  const [completedAuditNotif, setCompletedAuditNotif] = useState<Notification | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const mockAdmin = localStorage.getItem("gln_mock_admin_session") === "true";
      const mockUser = localStorage.getItem("gln_mock_user_logged_in") === "true";
      if (mockAdmin || mockUser) {
        setIsLoggedIn(true);
        return;
      }
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setIsLoggedIn(true);
        }
      } catch (err) {
        console.warn("Could not check auth session in Index.tsx:", err);
      }
    };
    checkSession();
  }, []);

  useEffect(() => {
    if (isLoggedIn) return;

    const handleVisitorNotifs = () => {
      const email = localStorage.getItem("gln_visitor_email") || undefined;
      const phone = localStorage.getItem("gln_visitor_phone") || undefined;
      if (email || phone) {
        const notifs = getNotificationsForUser(email, phone);
        setVisitorNotifs(notifs.filter(n => n.status === "unread"));
        
        // Find if there is any completed audit among unread notifications
        const completed = notifs.find(n => n.type === "audit_completed" && n.status === "unread");
        if (completed) {
          setCompletedAuditNotif(completed);
        } else {
          setCompletedAuditNotif(null);
        }
      }
    };

    handleVisitorNotifs();

    window.addEventListener("gln_notifications_changed", handleVisitorNotifs);
    return () => {
      window.removeEventListener("gln_notifications_changed", handleVisitorNotifs);
    };
  }, [isLoggedIn]);

  return (
    <div className="min-h-screen pt-20 md:pt-24">
      <SiteContentBlocks page="home" />
      {/* Premium Notification Modal for Completed Audit */}
      {completedAuditNotif && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-card border border-primary/45 rounded-3xl p-6 md:p-8 max-w-md w-full text-center space-y-6 shadow-glow relative"
          >
            <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto text-primary animate-bounce">
              <Bell className="w-8 h-8" />
            </div>
            
            <div className="space-y-2">
              <span className="bg-primary/20 text-primary text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                {language === "fr" ? "Diagnostic Prêt & Solutions Disponibles" : "Diagnostic Ready & Solutions Available"}
              </span>
              <h2 className="font-heading text-xl font-bold text-foreground">
                {language === "fr" 
                  ? `Votre Audit Gratuit pour "${completedAuditNotif.companyName}" est disponible !`
                  : `Your Free Audit for "${completedAuditNotif.companyName}" is ready!`}
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {language === "fr"
                  ? "Nos 7 moteurs IA ont détecté des anomalies critiques sur votre canal. Nous y avons joint une facture proforma décrivant les solutions d'acquisition pour résoudre votre problème exact."
                  : "Our 7 AI Engines have detected critical anomalies on your channel. We have attached a proforma invoice detailing the exact solutions to solve it."}
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <Link
                to={`/audit/rapport/${completedAuditNotif.auditId}`}
                onClick={() => {
                  markAsRead(completedAuditNotif.id);
                  setCompletedAuditNotif(null);
                }}
                className="w-full bg-gradient-primary text-primary-foreground font-bold text-xs py-3 rounded-xl hover:opacity-95 transition-all shadow-glow flex items-center justify-center gap-2 animate-pulse"
              >
                <FileText className="w-4 h-4" />
                {language === "fr" ? "Consulter mon Rapport & Proforma" : "Check my Report & Proforma"}
              </Link>
              <button
                onClick={() => {
                  markAsRead(completedAuditNotif.id);
                  setCompletedAuditNotif(null);
                }}
                className="text-xs text-muted-foreground hover:text-foreground font-semibold py-1.5 transition-colors"
              >
                {language === "fr" ? "Ignorer pour le moment" : "Ignorer"}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Visitor Notifications (for disconnected users) */}
      {!isLoggedIn && visitorNotifs.length > 0 && (
        <div className="fixed inset-x-3 bottom-16 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:max-w-sm sm:w-full bg-card/95 border border-primary/30 rounded-2xl p-3 sm:p-4 shadow-glow z-50 animate-bounce-slow text-xs text-foreground backdrop-blur flex flex-col gap-3">
          <div className="flex justify-between items-center border-b border-border/40 pb-2">
            <div className="flex items-center gap-1.5 font-bold">
              <Bell className="w-4 h-4 text-primary animate-pulse" />
              <span>{language === "fr" ? "Suivi de votre audit gratuit" : "Free Audit Tracking"}</span>
            </div>
            <button 
              onClick={() => {
                const email = localStorage.getItem("gln_visitor_email") || undefined;
                const phone = localStorage.getItem("gln_visitor_phone") || undefined;
                if (email || phone) {
                  const all = getNotifications();
                  const updated = all.map(n => {
                    if (n.email === email || n.phone === phone) {
                      return { ...n, status: "read" as const };
                    }
                    return n;
                  });
                  localStorage.setItem("gln_notifications_db", JSON.stringify(updated));
                  window.dispatchEvent(new Event("gln_notifications_changed"));
                }
              }}
              className="text-muted-foreground hover:text-foreground text-xs font-black px-1.5"
            >
              ×
            </button>
          </div>
          <div className="space-y-2">
            {visitorNotifs.map(notif => (
              <div key={notif.id} className="p-2 rounded bg-secondary/50 border border-border/40 flex flex-col gap-1.5">
                <p className="font-semibold text-foreground">
                  {language === "fr" ? notif.messageFr : notif.messageEn}
                </p>
                <div className="flex justify-between items-center">
                  <span className="text-[9px] text-muted-foreground">
                    {new Date(notif.createdAt).toLocaleDateString()}
                  </span>
                  {notif.type === "audit_completed" && (
                    <Link 
                      to={`/audit/rapport/${notif.auditId}`}
                      onClick={() => {
                        const all = getNotifications();
                        const updated = all.map(n => n.id === notif.id ? { ...n, status: "read" as const } : n);
                        localStorage.setItem("gln_notifications_db", JSON.stringify(updated));
                        window.dispatchEvent(new Event("gln_notifications_changed"));
                      }}
                      className="bg-primary text-primary-foreground text-[9px] font-bold py-1 px-2.5 rounded hover:opacity-90 transition-all flex items-center gap-1 shadow-glow"
                    >
                      <FileText className="w-2.5 h-2.5" />
                      {language === "fr" ? "Voir le rapport" : "View Report"}
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
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
                {t("hero.badge")}
              </span>
            </motion.div>

            <motion.h1 variants={fadeUp} className="font-heading text-4xl md:text-6xl font-bold leading-tight mb-6">
              {t("hero.title_part1")}{" "}
              <span className="text-gradient-primary">{t("hero.title_part2")}</span>.
            </motion.h1>

            <motion.p variants={fadeUp} className="text-lg md:text-xl text-muted-foreground mb-8 max-w-3xl leading-relaxed">
              {t("hero.description")}
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-wrap gap-4 mb-10">
              <a
                href="https://wa.me/237692062677"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-primary text-primary-foreground px-8 py-4 rounded-lg font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity shadow-glow"
              >
                <MessageCircle className="w-5 h-5 fill-current" />
                {t("services.cta")}
              </a>
              <Link
                to="/audit"
                className="border border-border bg-secondary/50 text-foreground px-8 py-4 rounded-lg font-semibold hover:bg-secondary transition-colors"
              >
                {t("hero.cta_audit")}
              </Link>
              <Link
                to="/formations"
                className="border border-primary/30 text-primary px-8 py-4 rounded-lg font-semibold hover:bg-primary/10 transition-colors flex items-center gap-2"
              >
                <GraduationCap className="w-5 h-5" />
                {t("hero.cta_courses")}
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Authority & Trust Logos */}
      <section className="py-12 border-y border-border/50 bg-secondary/20">
        <div className="container mx-auto px-4 md:px-8">
          <p className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-8">
            {language === "fr" ? "Ils font confiance à GLN DIGITAL" : "They trust GLN DIGITAL"}
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
              {language === "fr" ? "Nos Services Premium" : "Our Premium Services"}
            </span>
            <h2 className="font-heading text-3xl md:text-4xl font-bold mt-4 mb-6">
              {language === "fr" ? (
                <>Vos réseaux sociaux doivent générer des <span className="text-gradient-primary">opportunités</span>, pas seulement des likes.</>
              ) : (
                <>Your social media must generate <span className="text-gradient-primary">opportunities</span>, not just likes.</>
              )}
            </h2>
            <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
              {language === "fr"
                ? "Nous construisons des systèmes d'acquisition clients complets de la visibilité jusqu'à la conversion."
                : "We build complete customer acquisition systems from visibility to conversion."}
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
              {language === "fr" ? "Académie GLN" : "GLN Academy"}
            </span>
            <h2 className="font-heading text-3xl md:text-4xl font-bold mt-4 mb-6">
              {language === "fr" ? "Formez-vous aux métiers d'avenir du digital" : "Train for the digital professions of the future"}
            </h2>
            <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
              {language === "fr"
                ? "Des formations pratiques, certifiantes et adaptées au marché pour propulser votre carrière ou votre business."
                : "Practical, certifying, and market-adapted training to boost your career or business."}
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
                  {language === "fr" ? "Découvrir le programme" : "Discover the program"}
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
            {language === "fr" ? (
              <>Pourquoi choisir <span className="text-gradient-primary">GLN DIGITAL</span> ?</>
            ) : (
              <>Why choose <span className="text-gradient-primary">GLN DIGITAL</span>?</>
            )}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="p-6 rounded-xl bg-card border border-border/40">
              <div className="bg-primary/10 w-12 h-12 rounded-xl flex items-center justify-center text-primary mb-4 font-bold text-xl">01</div>
              <h3 className="font-heading font-bold text-lg mb-2">
                {language === "fr" ? "Stratégie orientée résultats" : "Results-oriented strategy"}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {language === "fr"
                  ? "Nous construisons un système digital de bout en bout axé sur vos conversions réelles, pas sur des métriques inutiles."
                  : "We build an end-to-end digital system focused on your actual conversions, not vanity metrics."}
              </p>
            </div>
            <div className="p-6 rounded-xl bg-card border border-border/40">
              <div className="bg-primary/10 w-12 h-12 rounded-xl flex items-center justify-center text-primary mb-4 font-bold text-xl">02</div>
              <h3 className="font-heading font-bold text-lg mb-2">
                {language === "fr" ? "Accompagnement humain" : "Human support"}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {language === "fr"
                  ? "Un suivi rigoureux et un conseil régulier pour assurer l'évolution de vos équipes et de vos processus digitaux."
                  : "Rigorous follow-up and regular advising to ensure the growth of your teams and digital processes."}
              </p>
            </div>
            <div className="p-6 rounded-xl bg-card border border-border/40">
              <div className="bg-primary/10 w-12 h-12 rounded-xl flex items-center justify-center text-primary mb-4 font-bold text-xl">03</div>
              <h3 className="font-heading font-bold text-lg mb-2">
                {language === "fr" ? "Solutions complètes" : "Complete solutions"}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {language === "fr"
                  ? "Du branding à la création de contenu jusqu'à la publicité Meta Ads et le site web, vous disposez d'un seul partenaire."
                  : "From branding to content creation, to Meta Ads and websites, you have a single partner."}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How we work */}
      <section className="py-20">
        <div className="container mx-auto px-4 md:px-8">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-center mb-16">
            {language === "fr" ? "Notre processus de travail" : "Our workflow process"}
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
            {language === "fr" ? "Votre entreprise mérite des clients réels." : "Your business deserves real clients."}
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            {language === "fr"
              ? "Prêt à transformer votre visibilité en croissance économique tangible ? Lancez votre audit gratuit dès aujourd'hui."
              : "Ready to turn your visibility into tangible economic growth? Launch your free audit today."}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href="https://wa.me/237692062677"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-primary text-primary-foreground px-8 py-4 rounded-lg font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity shadow-glow"
            >
              <MessageCircle className="w-5 h-5 fill-current" />
              {language === "fr" ? "Parler sur WhatsApp" : "Talk on WhatsApp"}
            </a>
            <Link
              to="/audit"
              className="border border-border text-foreground bg-secondary/50 px-8 py-4 rounded-lg font-semibold hover:bg-secondary transition-colors"
            >
              {language === "fr" ? "Obtenir mon audit gratuit" : "Get my free audit"}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
