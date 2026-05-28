import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { GraduationCap, ArrowRight, Video, FileText, CheckCircle2, MessageCircle } from "lucide-react";

const courses = [
  {
    id: "marketing-digital-pro",
    title: "Marketing Digital Professionnel",
    duration: "6 semaines",
    difficulty: "Tous niveaux",
    desc: "Devenez autonome pour acquérir des clients. Apprenez le ciblage, les tunnels de vente simples, et la publicité Meta Ads.",
    features: [
      "Création de tunnels d'acquisition",
      "Lancement de campagnes Facebook & Instagram Ads",
      "Tracking des conversions & pixels",
      "Reporting & Optimisation de budget",
    ],
    price: "Sur devis",
  },
  {
    id: "community-management",
    title: "Community Management & Croissance",
    duration: "4 semaines",
    difficulty: "Débutant à Intermédiaire",
    desc: "Apprenez à gérer, animer et faire grandir des communautés sur Facebook, Instagram et TikTok pour des entreprises locales.",
    features: [
      "Création de calendriers éditoriaux",
      "Maîtrise de Canva pour les designs professionnels",
      "Copywriting et rédactions accrocheuses",
      "Gestion de la modération client",
    ],
    price: "Sur devis",
  },
  {
    id: "creation-contenu-ia",
    title: "Création de contenu & IA générative",
    duration: "3 semaines",
    difficulty: "Tous niveaux",
    desc: "Boostez votre productivité avec l'intelligence artificielle. Utilisez ChatGPT, Midjourney et CapCut pour vos visuels et vidéos.",
    features: [
      "Prompts avancés pour la création de contenu",
      "Montage vidéo dynamique sur smartphone (CapCut)",
      "Automatisation de votre branding avec l'IA",
      "Création de scripts de vidéos courtes virales",
    ],
    price: "Sur devis",
  },
  {
    id: "freelancing-digital",
    title: "Formation Freelance & Business Digital",
    duration: "4 semaines",
    difficulty: "Avancé",
    desc: "Comment monétiser vos compétences digitales et trouver des clients réguliers au Cameroun et à l'international.",
    features: [
      "Positionnement et création d'offres de services",
      "Techniques de closing et pitch commercial",
      "Facturation et contrats pour freelances",
      "Recherche active de clients à distance",
    ],
    price: "Sur devis",
  },
];

const Formations = () => (
  <div className="min-h-screen pt-24 pb-16">
    <div className="container mx-auto px-4 md:px-8">
      {/* Title */}
      <motion.div
        className="text-center mb-16"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <span className="bg-primary/10 text-primary text-xs font-semibold px-4 py-1.5 rounded-full border border-primary/20">
          Académie GLN DIGITAL
        </span>
        <h1 className="font-heading text-4xl md:text-5xl font-bold mt-6 mb-4">
          Développez vos compétences aux <span className="text-gradient-primary">métiers du digital</span>
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto text-base">
          Des programmes intensifs, orientés sur la pratique et l'atteinte de résultats concrets pour booster votre activité ou décrocher un emploi.
        </p>
      </motion.div>

      {/* Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
        {courses.map((course, idx) => (
          <motion.div
            key={course.id}
            className="p-6 md:p-8 rounded-2xl bg-card border border-border/40 hover:border-primary/20 transition-colors flex flex-col justify-between"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.08 }}
          >
            <div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs text-primary font-bold bg-primary/10 px-3 py-1 rounded-full">{course.duration}</span>
                <span className="text-xs text-muted-foreground font-medium">{course.difficulty}</span>
              </div>
              <h2 className="font-heading text-xl font-bold mb-3">{course.title}</h2>
              <p className="text-muted-foreground text-sm leading-relaxed mb-6">{course.desc}</p>
              
              <div className="space-y-2 mb-6">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">Ce que vous allez maîtriser :</h4>
                {course.features.map((feat) => (
                  <div key={feat} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-border/40 pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-[10px] text-muted-foreground uppercase block">Tarif unique</span>
                <span className="text-lg font-bold text-foreground">{course.price}</span>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Link
                  to={`/formations/${course.id}`}
                  className="flex-1 sm:flex-none bg-secondary hover:bg-secondary/80 text-foreground text-center px-4 py-2.5 rounded-lg text-xs font-semibold border border-border"
                >
                  Voir le programme
                </Link>
                <a
                  href={`https://wa.me/237692062677?text=Bonjour,%20je%20souhaite%20m'inscrire%20à%20la%20formation%20:%20${encodeURIComponent(course.title)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-none bg-primary text-primary-foreground text-center px-4 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity"
                >
                  <MessageCircle className="w-4 h-4 fill-current" />
                  S'inscrire
                </a>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </div>
);

export default Formations;
