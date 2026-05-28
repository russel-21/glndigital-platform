import { motion } from "framer-motion";
import { Share2, Megaphone, Camera, Layout, GraduationCap, ArrowRight, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";

const services = [
  {
    icon: Share2,
    title: "Gestion des réseaux sociaux (Social Media)",
    problem: "Vos pages manquent d'animation, de visuels professionnels et ne génèrent aucun contact qualifié.",
    solution: "Une prise en main globale de votre communication sur Facebook, Instagram et TikTok.",
    benefit: "Développement rapide de la visibilité, de la crédibilité et flux constant de prospects locaux.",
    items: [
      "Stratégie de contenu & Ligne éditoriale",
      "Conception graphique premium (Canva/Photoshop)",
      "Rédaction de posts engageants (Copywriting)",
      "Planification et publication",
      "Gestion et réponses aux messages/commentaires clients (Modération)",
    ],
  },
  {
    icon: Megaphone,
    title: "Publicité Meta Ads (Facebook & Instagram Ads)",
    problem: "Les publications organiques ne suffisent plus et vous gaspillez du budget publicitaire sans retour sur investissement.",
    solution: "Conception de campagnes publicitaires ultra-ciblées axées sur la vente et la génération de leads.",
    benefit: "Acquisition immédiate de prospects qualifiés prêts à acheter vos produits ou services.",
    items: [
      "Configuration et sécurisation de Meta Business Manager",
      "Ciblage géographique précis (Douala, Yaoundé, International)",
      "Création de visuels et vidéos publicitaires à fort impact",
      "A/B Testing (audiences et visuels)",
      "Optimisation quotidienne pour réduire le coût par prospect",
    ],
  },
  {
    icon: Layout,
    title: "Création de site internet professionnel",
    problem: "Vous n'avez pas de site web, ou votre site actuel est lent, obsolète et n'inspire pas confiance.",
    solution: "Développement de sites internet modernes, ultra-rapides, responsive et optimisés pour Google (SEO).",
    benefit: "Crédibilité maximale auprès de vos clients et automatisation de votre acquisition (hôtels, e-commerce, immobilier).",
    items: [
      "Sites vitrines pour entreprises et cabinets",
      "Plateformes pour hôtels et réservations directes",
      "Boutiques e-commerce avec paiement Mobile Money intégré",
      "Optimisation SEO pour apparaître sur Google au Cameroun",
      "Maintenance technique et sécurisation",
    ],
  },
  {
    icon: Camera,
    title: "Création de contenu vidéo & Visuels",
    problem: "Votre marque manque de dynamisme et vos vidéos ne parviennent pas à retenir l'attention sur TikTok ou les Reels.",
    solution: "Production de vidéos courtes, dynamiques et percutantes conçues pour capter l'audience en 3 secondes.",
    benefit: "Augmentation exponentielle de l'engagement et mémorisation forte de votre marque.",
    items: [
      "Scripts de vidéos courtes optimisés pour la rétention",
      "Montage dynamique (Reels, TikTok, Shorts)",
      "Création de podcasts visuels et interviews",
      "Affiches publicitaires et infographies",
    ],
  },
  {
    icon: GraduationCap,
    title: "Formation & Accompagnement Marketing Digital",
    problem: "Vous ou vos équipes manquez de compétences pour piloter efficacement votre marketing digital en interne.",
    solution: "Formations pratiques et intensives adaptées aux réalités du marché africain.",
    benefit: "Maîtrise totale des outils et autonomie complète pour générer du chiffre d'affaires.",
    items: [
      "Formation Community Management (Canva, Planification)",
      "Formation Meta Ads de débutant à expert",
      "Formation IA & productivité (ChatGPT, IA visuelles)",
      "Coaching stratégique individuel (1-on-1)",
    ],
  },
];

const Services = () => (
  <div className="min-h-screen pt-24 pb-16">
    <div className="container mx-auto px-4 md:px-8">
      {/* Header */}
      <motion.div
        className="text-center mb-16"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <span className="bg-primary/10 text-primary text-xs font-semibold px-4 py-1.5 rounded-full border border-primary/20">
          Nos Services
        </span>
        <h1 className="font-heading text-4xl md:text-5xl font-bold mt-6 mb-4">
          Des solutions pour <span className="text-gradient-primary">générer des clients</span>
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto text-base">
          Nous n'effectuons pas de simples tâches techniques : nous concevons des systèmes complets de conversion pour votre entreprise.
        </p>
      </motion.div>

      {/* Services List */}
      <div className="space-y-12 max-w-5xl mx-auto">
        {services.map((s, i) => (
          <motion.div
            key={s.title}
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
                  <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground mb-4">{s.title}</h2>
                  
                  {/* Grid Problème/Solution/Bénéfice */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="p-4 rounded-xl bg-secondary/20 border border-border/40">
                      <span className="text-xs font-bold text-destructive uppercase block mb-1">Le problème</span>
                      <p className="text-xs text-muted-foreground leading-relaxed">{s.problem}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-secondary/20 border border-border/40">
                      <span className="text-xs font-bold text-primary uppercase block mb-1">Notre solution</span>
                      <p className="text-xs text-muted-foreground leading-relaxed">{s.solution}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                      <span className="text-xs font-bold text-primary uppercase block mb-1">Le bénéfice clé</span>
                      <p className="text-xs text-foreground font-medium leading-relaxed">{s.benefit}</p>
                    </div>
                  </div>
                </div>

                {/* List Items */}
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-3">Ce que comprend cette offre :</h4>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {s.items.map((item) => (
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
                    href={`https://wa.me/237692062677?text=Bonjour,%20je%20suis%20intéressé%20par%20votre%20service%20:%20${encodeURIComponent(s.title)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 hover:opacity-90 transition-opacity"
                  >
                    <MessageCircle className="w-4 h-4 fill-current" />
                    En discuter sur WhatsApp
                  </a>
                  <Link
                    to="/contact"
                    className="border border-border hover:bg-secondary text-foreground px-5 py-2.5 rounded-lg text-xs font-semibold transition-colors"
                  >
                    Demander un devis personnalisé
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </div>
);

export default Services;
