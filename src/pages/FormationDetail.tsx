import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, MessageCircle, Clock, BookOpen, Award, GraduationCap } from "lucide-react";

const coursesData: Record<string, {
  title: string;
  duration: string;
  difficulty: string;
  price: string;
  desc: string;
  audience: string[];
  program: { module: string; lessons: string[] }[];
  skills: string[];
}> = {
  "marketing-digital-pro": {
    title: "Marketing Digital Professionnel",
    duration: "6 semaines (30 heures de cours)",
    difficulty: "Tous niveaux",
    price: "Sur devis",
    desc: "Acquérez les compétences indispensables pour piloter des stratégies d'acquisition clients rentables. Une formation pratique combinant cours en ligne, coaching individuel et cas pratiques réels sur le marché d'Afrique Centrale.",
    audience: [
      "Entrepreneurs et fondateurs de PME voulant automatiser leurs ventes",
      "Responsables marketing cherchant à se moderniser",
      "Étudiants en quête de compétences recherchées sur le marché de l'emploi",
    ],
    skills: [
      "Définition de personas et parcours d'achat",
      "Mise en place de pixels de tracking (Meta Pixel, Google Analytics)",
      "Lancement de campagnes publicitaires Facebook & Instagram Ads",
      "Écriture de textes persuasifs (Copywriting)",
      "Optimisation du Return on Ad Spend (ROAS)",
    ],
    program: [
      {
        module: "Module 1 : Les Fondations du Marketing Digital",
        lessons: ["Comprendre le comportement du consommateur moderne", "Définir sa proposition de valeur unique", "Cartographier le tunnel de vente"],
      },
      {
        module: "Module 2 : La Publicité Meta Ads de A à Z",
        lessons: ["Paramétrage optimal du Business Manager", "Comprendre l'algorithme et la structure de campagne", "Ciblage classique vs Ciblage avancé (Lookalike, Retargeting)"],
      },
      {
        module: "Module 3 : Créatifs publicitaires & Copywriting",
        lessons: ["Rédiger des accroches irrésistibles", "Créer des visuels qui convertissent", "L'art du storytelling publicitaire"],
      },
    ],
  },
  "community-management": {
    title: "Community Management & Croissance",
    duration: "4 semaines (20 heures de cours)",
    difficulty: "Débutant",
    price: "Sur devis",
    desc: "Apprenez à animer des réseaux sociaux de manière professionnelle. Cette formation vous enseigne comment structurer une stratégie d'animation, créer des visuels magnifiques et engager votre communauté.",
    audience: [
      "Futurs community managers cherchant à se lancer en freelance",
      "Propriétaires de commerces souhaitant développer leur visibilité locale",
      "Chargés de communication en reconversion",
    ],
    skills: [
      "Création de chartes éditoriales et calendriers de posts",
      "Conception graphique rapide sur Canva Pro",
      "Techniques d'animation de communautés Facebook & Instagram",
      "Gestion de la modération de messagerie et de commentaires",
    ],
    program: [
      {
        module: "Module 1 : Rôle du Community Manager au Cameroun",
        lessons: ["Comprendre l'écosystème local des réseaux sociaux", "Audit et analyse d'une page existante", "Définir la ligne éditoriale d'une marque"],
      },
      {
        module: "Module 2 : Conception visuelle et design",
        lessons: ["Les règles de base de la charte graphique", "Maîtrise complète de Canva pour le CM", "Création de Reels et infographies marquantes"],
      },
      {
        module: "Module 3 : Gestion quotidienne & Modération",
        lessons: ["Planifier et automatiser ses publications", "Gérer les avis négatifs et les crises", "Mise en place de scripts de réponses commerciales"],
      },
    ],
  },
  "creation-contenu-ia": {
    title: "Création de contenu & IA générative",
    duration: "3 semaines",
    difficulty: "Tous niveaux",
    price: "Sur devis",
    desc: "Découvrez comment utiliser l'intelligence artificielle pour décupler votre vitesse de création. Apprenez à générer des visuels, des scripts et des vidéos courtes virales avec ChatGPT et CapCut.",
    audience: [
      "Créateurs de contenu et blogueurs",
      "Social Media Managers voulant automatiser leur flux de travail",
      "Entrepreneurs pressés souhaitant produire des visuels rapidement",
    ],
    skills: [
      "Rédaction de prompts avancés pour ChatGPT",
      "Génération d'images et d'assets avec les IA visuelles",
      "Montage rapide et dynamique de Reels & TikTok sur CapCut",
      "Automatisation de la création de visuels en lot",
    ],
    program: [
      {
        module: "Module 1 : ChatGPT & Ingénierie de Prompts",
        lessons: ["Formuler des prompts pour obtenir des idées de posts", "Rédiger des scripts vidéo complets", "Traduire et adapter des tonalités"],
      },
      {
        module: "Module 2 : Montage vidéo dynamique (Smartphone/PC)",
        lessons: ["Les bases du montage sur CapCut", "Ajout de sous-titres animés et effets sonores", "Rythmer sa vidéo pour retenir l'attention"],
      },
      {
        module: "Module 3 : Productivité & Automatisation",
        lessons: ["Créer 30 visuels en 15 minutes avec Canva + IA", "Gérer ses contenus avec Notion", "Veille technologique sur les outils IA"],
      },
    ],
  },
  "freelancing-digital": {
    title: "Formation Freelance & Business Digital",
    duration: "4 semaines",
    difficulty: "Avancé",
    price: "Sur devis",
    desc: "Ne soyez plus un simple technicien : devenez un entrepreneur digital. Apprenez à trouver des clients haut de gamme à Douala, Yaoundé ou à l'étranger, à Closer vos contrats et à structurer votre activité de freelance.",
    audience: [
      "Freelances en marketing/design manquant de clients réguliers",
      "Étudiants sortant de formation souhaitant lancer leur propre activité",
      "Professionnels voulant vendre leurs compétences en ligne",
    ],
    skills: [
      "Création d'offres de services packagées haut de gamme",
      "Techniques de vente et closing (téléphone, WhatsApp)",
      "Rédaction de propositions commerciales irrésistibles",
      "Prospection passive et active (LinkedIn, Cold Email)",
    ],
    program: [
      {
        module: "Module 1 : Structurer son positionnement",
        lessons: ["Définir son client idéal (niche)", "Créer des offres packagées (abonnements vs forfaits)", "Calculer son Taux Journalier Moyen (TJM)"],
      },
      {
        module: "Module 2 : Acquisition & Closing",
        lessons: ["Techniques de prospection sur LinkedIn", "Conduire un appel de découverte avec un prospect", "Traiter les objections courantes ('C'est trop cher')"],
      },
      {
        module: "Module 3 : Gestion & Facturation",
        lessons: ["Rédiger des contrats et des CGV", "Mettre en place des outils de suivi client (Notion, Trello)", "Garantir des paiements sécurisés"],
      },
    ],
  },
};

const FormationDetail = () => {
  const { id } = useParams();
  const course = id ? coursesData[id] : null;

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-24 text-center">
        <div>
          <h2 className="text-2xl font-bold mb-4">Formation non trouvée</h2>
          <Link to="/formations" className="text-primary hover:underline">Retourner aux formations</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4 md:px-8 max-w-4xl">
        <Link to="/formations" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Retour aux formations
        </Link>

        {/* Hero Course */}
        <div className="border border-border/40 bg-card rounded-3xl p-6 md:p-10 mb-12">
          <div className="flex flex-wrap gap-3 mb-6">
            <span className="text-xs bg-primary/10 text-primary font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {course.duration}
            </span>
            <span className="text-xs bg-secondary text-muted-foreground font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              {course.difficulty}
            </span>
            <span className="text-xs bg-accent/10 text-accent font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5" />
              Certifiant
            </span>
          </div>

          <h1 className="font-heading text-3xl md:text-4xl font-extrabold mb-6 text-foreground">{course.title}</h1>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-8">{course.desc}</p>

          <div className="flex flex-wrap items-center justify-between gap-6 pt-6 border-t border-border/40">
            <div>
              <span className="text-xs text-muted-foreground uppercase block">Prix de la formation</span>
              <span className="text-2xl font-extrabold text-foreground">{course.price}</span>
            </div>
            <a
              href={`https://wa.me/237692062677?text=Bonjour,%20je%20souhaite%20en%20savoir%20plus%20sur%20la%20formation%20:%20${encodeURIComponent(course.title)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-primary text-primary-foreground px-8 py-4 rounded-lg font-bold flex items-center gap-2 hover:opacity-90 transition-opacity shadow-glow w-full sm:w-auto justify-center"
            >
              <MessageCircle className="w-5 h-5 fill-current" />
              S'inscrire via WhatsApp
            </a>
          </div>
        </div>

        {/* Grid Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {/* Public cible */}
          <div className="p-6 rounded-2xl bg-secondary/20 border border-border/40">
            <h3 className="font-heading font-bold text-lg mb-4 text-foreground flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary" />
              À qui s'adresse cette formation ?
            </h3>
            <ul className="space-y-3">
              {course.audience.map((item, idx) => (
                <li key={idx} className="flex gap-2 text-xs text-muted-foreground leading-relaxed">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Compétences acquises */}
          <div className="p-6 rounded-2xl bg-secondary/20 border border-border/40">
            <h3 className="font-heading font-bold text-lg mb-4 text-foreground flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              Compétences développées
            </h3>
            <ul className="space-y-3">
              {course.skills.map((skill, idx) => (
                <li key={idx} className="flex gap-2 text-xs text-muted-foreground leading-relaxed">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                  {skill}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Detailed Program */}
        <div className="space-y-6 mb-12">
          <h3 className="font-heading font-bold text-xl text-foreground">Programme détaillé des modules</h3>
          <div className="space-y-4">
            {course.program.map((prog, idx) => (
              <div key={idx} className="p-6 rounded-2xl bg-card border border-border/40">
                <h4 className="font-heading font-bold text-base text-foreground mb-3">{prog.module}</h4>
                <ul className="space-y-2">
                  {prog.lessons.map((lesson, lessonIdx) => (
                    <li key={lessonIdx} className="flex gap-2 text-xs text-muted-foreground">
                      <span className="text-primary font-semibold">{lessonIdx + 1}.</span>
                      {lesson}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormationDetail;
