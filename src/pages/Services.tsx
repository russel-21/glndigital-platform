import { motion } from "framer-motion";
import { Share2, Megaphone, Camera, Layout, GraduationCap, ArrowRight, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import SiteContentBlocks from "@/components/SiteContentBlocks";

const services = [
  {
    icon: Share2,
    titleFr: "Gestion des réseaux sociaux (Social Media)",
    titleEn: "Social Media Management",
    problemFr: "Vos pages manquent d'animation, de visuels professionnels et ne génèrent aucun contact qualifié.",
    problemEn: "Your pages lack animation, professional visuals, and generate no qualified contacts.",
    solutionFr: "Une prise en main globale de votre communication sur Facebook, Instagram et TikTok.",
    solutionEn: "Global management of your communication on Facebook, Instagram, and TikTok.",
    benefitFr: "Développement rapide de la visibilité, de la crédibilité et flux constant de prospects locaux.",
    benefitEn: "Rapid visibility and credibility growth and a constant flow of local leads.",
    itemsFr: [
      "Stratégie de contenu & Ligne éditoriale",
      "Conception graphique premium (Canva/Photoshop)",
      "Rédaction de posts engageants (Copywriting)",
      "Planification et publication",
      "Gestion et réponses aux messages/commentaires clients (Modération)",
    ],
    itemsEn: [
      "Content strategy & Editorial line",
      "Premium graphic design (Canva/Photoshop)",
      "Engaging post writing (Copywriting)",
      "Scheduling and publishing",
      "Management and responses to customer messages/comments (Moderation)",
    ],
  },
  {
    icon: Megaphone,
    titleFr: "Publicité Meta Ads (Facebook & Instagram Ads)",
    titleEn: "Meta Ads Advertising (Facebook & Instagram Ads)",
    problemFr: "Les publications organiques ne suffisent plus et vous gaspillez du budget publicitaire sans retour sur investissement.",
    problemEn: "Organic posts are no longer enough and you waste advertising budget with no return on investment.",
    solutionFr: "Conception de campagnes publicitaires ultra-ciblées axées sur la vente et la génération de leads.",
    solutionEn: "Design of ultra-targeted ad campaigns focused on sales and lead generation.",
    benefitFr: "Acquisition immédiate de prospects qualifiés prêts à acheter vos produits ou services.",
    benefitEn: "Immediate acquisition of qualified leads ready to buy your products or services.",
    itemsFr: [
      "Configuration et sécurisation de Meta Business Manager",
      "Ciblage géographique précis (Douala, Yaoundé, International)",
      "Création de visuels et vidéos publicitaires à fort impact",
      "A/B Testing (audiences et visuels)",
      "Optimisation quotidienne pour réduire le coût par prospect",
    ],
    itemsEn: [
      "Meta Business Manager setup and security",
      "Precise geographic targeting (Douala, Yaoundé, International)",
      "Creation of high-impact ad visuals and videos",
      "A/B Testing (audiences and visuals)",
      "Daily optimization to reduce cost per lead",
    ],
  },
  {
    icon: Layout,
    titleFr: "Création de site internet professionnel",
    titleEn: "Professional Website Creation",
    problemFr: "Vous n'avez pas de site web, ou votre site actuel est lent, obsolète et n'inspire pas confiance.",
    problemEn: "You don't have a website, or your current site is slow, outdated, and does not inspire confidence.",
    solutionFr: "Développement de sites internet modernes, ultra-rapides, responsive et optimisés pour Google (SEO).",
    solutionEn: "Development of modern, ultra-fast, responsive websites optimized for Google (SEO).",
    benefitFr: "Crédibilité maximale auprès de vos clients et automatisation de votre acquisition (hôtels, e-commerce, immobilier).",
    benefitEn: "Maximum credibility with your clients and automation of your acquisition (hotels, e-commerce, real estate).",
    itemsFr: [
      "Sites vitrines pour entreprises et cabinets",
      "Plateformes pour hôtels et réservations directes",
      "Boutiques e-commerce avec paiement Mobile Money intégré",
      "Optimisation SEO pour apparaître sur Google au Cameroun",
      "Maintenance technique et sécurisation",
    ],
    itemsEn: [
      "Showcase websites for businesses and offices",
      "Platforms for hotels and direct bookings",
      "E-commerce stores with integrated Mobile Money payment",
      "SEO optimization to appear on Google in Cameroon",
      "Technical maintenance and security",
    ],
  },
  {
    icon: Camera,
    titleFr: "Création de contenu vidéo & Visuels",
    titleEn: "Video Content & Visuals Creation",
    problemFr: "Votre marque manque de dynamisme et vos vidéos ne parviennent pas à retenir l'attention sur TikTok ou les Reels.",
    problemEn: "Your brand lacks dynamism and your videos fail to capture attention on TikTok or Reels.",
    solutionFr: "Production de vidéos courtes, dynamiques et percutantes conçues pour capter l'audience en 3 secondes.",
    solutionEn: "Production of short, dynamic, and powerful videos designed to capture the audience in 3 seconds.",
    benefitFr: "Augmentation exponentielle de l'engagement et mémorisation forte de votre marque.",
    benefitEn: "Exponential increase in engagement and strong brand recall.",
    itemsFr: [
      "Scripts de vidéos courtes optimisés pour la rétention",
      "Montage dynamique (Reels, TikTok, Shorts)",
      "Création de podcasts visuels et interviews",
      "Affiches publicitaires et infographies",
    ],
    itemsEn: [
      "Short video scripts optimized for retention",
      "Dynamic editing (Reels, TikTok, Shorts)",
      "Creation of visual podcasts and interviews",
      "Advertising posters and infographics",
    ],
  },
  {
    icon: GraduationCap,
    titleFr: "Formation & Accompagnement Marketing Digital",
    titleEn: "Digital Marketing Training & Coaching",
    problemFr: "Vous ou vos équipes manquez de compétences pour piloter efficacement votre marketing digital en interne.",
    problemEn: "You or your teams lack the skills to effectively manage your digital marketing in-house.",
    solutionFr: "Formations pratiques et intensives adaptées aux réalités du marché africain.",
    solutionEn: "Practical and intensive training adapted to the realities of the African market.",
    benefitFr: "Maîtrise totale des outils et autonomie complète pour générer du chiffre d'affaires.",
    benefitEn: "Total mastery of tools and complete autonomy to generate revenue.",
    itemsFr: [
      "Formation Community Management (Canva, Planification)",
      "Formation Meta Ads de débutant à expert",
      "Formation IA & productivité (ChatGPT, IA visuelles)",
      "Coaching stratégique individuel (1-on-1)",
    ],
    itemsEn: [
      "Community Management training (Canva, Scheduling)",
      "Meta Ads training from beginner to expert",
      "AI & productivity training (ChatGPT, visual AIs)",
      "One-on-one strategic coaching",
    ],
  },
];

const Services = () => {
  const { language } = useLanguage();

  return (
    <div className="min-h-screen pt-24 pb-16">
      <SiteContentBlocks page="services" />
      <div className="container mx-auto px-4 md:px-8">
        {/* Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="bg-primary/10 text-primary text-xs font-semibold px-4 py-1.5 rounded-full border border-primary/20">
            {language === "fr" ? "Nos Services" : "Our Services"}
          </span>
          <h1 className="font-heading text-4xl md:text-5xl font-bold mt-6 mb-4">
            {language === "fr" ? (
              <>Des solutions pour <span className="text-gradient-primary">générer des clients</span></>
            ) : (
              <>Solutions to <span className="text-gradient-primary">generate customers</span></>
            )}
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-base">
            {language === "fr"
              ? "Nous n'effectuons pas de simples tâches techniques : nous concevons des systèmes complets de conversion pour votre entreprise."
              : "We don't just perform simple technical tasks: we design complete conversion systems for your business."}
          </p>
        </motion.div>

        {/* Services List */}
        <div className="space-y-12 max-w-5xl mx-auto">
          {services.map((s, i) => {
            const title = language === "fr" ? s.titleFr : s.titleEn;
            const problem = language === "fr" ? s.problemFr : s.problemEn;
            const solution = language === "fr" ? s.solutionFr : s.solutionEn;
            const benefit = language === "fr" ? s.benefitFr : s.benefitEn;
            const items = language === "fr" ? s.itemsFr : s.itemsEn;

            return (
              <motion.div
                key={s.titleFr}
                className="bg-card border border-border rounded-2xl p-6 md:p-10 hover:border-primary/30 transition-colors"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <div className="flex flex-col lg:flex-row lg:items-start gap-8">
                  {/* Icon */}
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                    <s.icon className="w-7 h-7 text-primary" />
                  </div>

                  {/* Details */}
                  <div className="flex-1 space-y-6">
                    <div>
                      <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground mb-4">{title}</h2>
                      
                      {/* Grid Problème/Solution/Bénéfice */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="p-4 rounded-xl bg-secondary/20 border border-border/40">
                          <span className="text-xs font-bold text-destructive uppercase block mb-1">
                            {language === "fr" ? "Le problème" : "The problem"}
                          </span>
                          <p className="text-xs text-muted-foreground leading-relaxed">{problem}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-secondary/20 border border-border/40">
                          <span className="text-xs font-bold text-primary uppercase block mb-1">
                            {language === "fr" ? "Notre solution" : "Our solution"}
                          </span>
                          <p className="text-xs text-muted-foreground leading-relaxed">{solution}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                          <span className="text-xs font-bold text-primary uppercase block mb-1">
                            {language === "fr" ? "Le bénéfice clé" : "Key benefit"}
                          </span>
                          <p className="text-xs text-foreground font-medium leading-relaxed">{benefit}</p>
                        </div>
                      </div>
                    </div>

                    {/* List Items */}
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-3">
                        {language === "fr" ? "Ce que comprend cette offre :" : "What this offer includes:"}
                      </h4>
                      <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {items.map((item) => (
                          <li key={item} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-border/40">
                      <a
                        href={`https://wa.me/237692062677?text=${language === "fr" ? "Bonjour,%20je%20suis%20intéressé%20par%20votre%20service%20:%20" : "Hello,%20I%20am%20interested%20in%20your%20service%20:%20"}${encodeURIComponent(title)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 hover:opacity-90 transition-opacity"
                      >
                        <MessageCircle className="w-4 h-4 fill-current" />
                        {language === "fr" ? "En discuter sur WhatsApp" : "Discuss on WhatsApp"}
                      </a>
                      <Link
                        to="/contact"
                        className="border border-border hover:bg-secondary text-foreground px-5 py-2.5 rounded-lg text-xs font-semibold transition-colors"
                      >
                        {language === "fr" ? "Demander un devis personnalisé" : "Request a custom quote"}
                      </Link>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Services;
