import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Clock,
  Share2,
  TrendingUp,
  Code2,
  Palette,
  Compass,
  Search,
  Target,
  Rocket,
  BarChart3,
  type LucideIcon,
} from "lucide-react";
import {
  portfolioProjects,
  PORTFOLIO_CATEGORY_LABELS,
  PORTFOLIO_CATEGORY_ORDER,
  type PortfolioCategory,
  type PortfolioProject,
} from "@/lib/portfolioProjects";

// Étape 1 of the portfolio redesign (see conversation for the full brief):
// a premium, UI-only page over local/mocked data. No Supabase table backs
// this yet on purpose (portfolio_media / MediaCard / PortfolioSection on
// the homepage are untouched and keep working exactly as before).

type FilterValue = "all" | PortfolioCategory;

const CATEGORY_ICONS: Record<PortfolioCategory, LucideIcon> = {
  "social-media": Share2,
  "publicite-digitale": TrendingUp,
  "creation-web": Code2,
  "branding-design": Palette,
  "strategie-digitale": Compass,
};

const APPROACH_STEPS: { number: string; icon: LucideIcon; title: string; description: string }[] = [
  {
    number: "01",
    icon: Search,
    title: "Analyser",
    description: "Comprendre l'entreprise, son marché, son audience et son environnement digital.",
  },
  {
    number: "02",
    icon: Target,
    title: "Stratégie",
    description: "Définir les priorités, les canaux et les actions à mettre en œuvre.",
  },
  {
    number: "03",
    icon: Rocket,
    title: "Exécuter",
    description: "Créer, publier, optimiser et déployer les actions digitales.",
  },
  {
    number: "04",
    icon: BarChart3,
    title: "Mesurer",
    description: "Analyser les données et améliorer continuellement les performances.",
  },
];

// No real project photography yet (see portfolioProjects.ts) — an honest,
// on-brand placeholder rather than stock/fake imagery: a muted panel with
// a faint category icon, in the same dark/orange palette as the rest of
// the site. Swapped automatically for project.image once real photos
// exist, no page changes needed.
const ProjectImagePlaceholder = ({ category }: { category: PortfolioCategory }) => {
  const Icon = CATEGORY_ICONS[category];
  return (
    <div className="w-full h-full bg-secondary flex items-center justify-center">
      <Icon className="w-12 h-12 text-primary/25" strokeWidth={1.5} />
    </div>
  );
};

const ProjectCard = ({ project, index }: { project: PortfolioProject; index: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay: (index % 3) * 0.08 }}
    className="group rounded-xl bg-card border border-border overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-primary/40"
  >
    <div className="relative w-full aspect-[16/9] overflow-hidden">
      {project.image ? (
        <img
          src={project.image}
          alt={project.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
      ) : (
        <div className="transition-transform duration-300 group-hover:scale-105 w-full h-full">
          <ProjectImagePlaceholder category={project.category} />
        </div>
      )}
      <div className="absolute inset-0 bg-background/0 group-hover:bg-background/10 transition-colors duration-300" />
    </div>

    <div className="p-5">
      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20 font-semibold">
        {PORTFOLIO_CATEGORY_LABELS[project.category]}
      </span>

      <h3 className="font-heading font-bold text-foreground text-lg mt-3 uppercase tracking-tight">
        {project.title}
      </h3>

      <p className="text-muted-foreground text-sm mt-2 leading-relaxed">{project.description}</p>

      <p className="text-xs text-muted-foreground/80 mt-3">{project.services.join(" • ")}</p>

      <div className="flex items-center justify-between mt-5 pt-4 border-t border-border/50">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="w-3.5 h-3.5" />
          {project.duration}
        </span>

        {/* No project detail pages yet (Étape 1 is UI-only) — shown but
            intentionally inert rather than linking to a 404 or a fake
            page. See the summary sent after this step. */}
        <span
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground/70 cursor-not-allowed select-none"
          title="Page détaillée du projet à venir"
        >
          Voir le projet
          <ArrowRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </div>
  </motion.div>
);

const Portfolio = () => {
  const [filter, setFilter] = useState<FilterValue>("all");

  // Page-specific SEO (mission section 13). No SEO/head library exists
  // anywhere in this project yet and adding one isn't indispensable for
  // two tags, so this sets them directly on mount and restores whatever
  // index.html originally had on unmount — scoped to this page only, the
  // rest of the site's SEO is untouched.
  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Portfolio | GLN DIGITAL";

    let meta = document.querySelector('meta[name="description"]');
    const previousDescription = meta?.getAttribute("content") ?? null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute(
      "content",
      "Découvrez les réalisations de GLN DIGITAL en marketing digital, social media, publicité, création web et stratégie digitale."
    );

    return () => {
      document.title = previousTitle;
      if (meta && previousDescription !== null) {
        meta.setAttribute("content", previousDescription);
      }
    };
  }, []);

  const filteredProjects = useMemo(
    () => (filter === "all" ? portfolioProjects : portfolioProjects.filter((p) => p.category === filter)),
    [filter]
  );

  return (
    <div className="min-h-screen pt-24 pb-16">
      {/* Hero */}
      <section className="container mx-auto px-4 md:px-8 text-center max-w-3xl">
        <motion.h1
          className="font-heading text-4xl md:text-5xl font-bold mb-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Nos <span className="text-gradient-primary">réalisations</span>
        </motion.h1>

        <motion.p
          className="text-foreground text-lg font-medium mb-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
        >
          Des stratégies digitales transformées en actions concrètes.
        </motion.p>

        <motion.p
          className="text-muted-foreground mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14 }}
        >
          Découvrez une sélection de projets réalisés en marketing digital, social media, publicité,
          création web et stratégie digitale.
        </motion.p>

        <motion.div
          className="flex flex-col items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <span className="text-xs bg-primary/10 text-primary px-4 py-1.5 rounded-full border border-primary/20 font-semibold uppercase tracking-wide">
            Projets sélectionnés
          </span>
          <span className="text-xs text-muted-foreground uppercase tracking-wide">
            Marketing • Social Media • Web • Stratégie
          </span>
        </motion.div>
      </section>

      {/* Filters */}
      <section className="container mx-auto px-4 md:px-8 mt-12 mb-10">
        <div className="overflow-x-auto -mx-4 px-4 md:overflow-visible md:mx-0 md:px-0">
          <div className="flex md:flex-wrap md:justify-center gap-2 min-w-max md:min-w-0">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wide transition-colors border whitespace-nowrap ${
                filter === "all"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
              }`}
            >
              Tous
            </button>
            {PORTFOLIO_CATEGORY_ORDER.map((category) => (
              <button
                key={category}
                onClick={() => setFilter(category)}
                className={`px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wide transition-colors border whitespace-nowrap ${
                  filter === category
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
                }`}
              >
                {PORTFOLIO_CATEGORY_LABELS[category]}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Projects grid */}
      <section className="container mx-auto px-4 md:px-8">
        {filteredProjects.length === 0 ? (
          <p className="text-center text-muted-foreground py-20">
            Aucun projet dans cette catégorie pour le moment.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project, i) => (
              <ProjectCard key={project.id} project={project} index={i} />
            ))}
          </div>
        )}
      </section>

      {/* Notre approche */}
      <section className="container mx-auto px-4 md:px-8 mt-24">
        <motion.div
          className="text-center max-w-2xl mx-auto mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">Notre approche</h2>
          <p className="text-muted-foreground">
            Chaque projet commence par une compréhension du problème avant de passer à l'action.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {APPROACH_STEPS.map((step, i) => (
            <motion.div
              key={step.number}
              className="bg-card border border-border rounded-2xl p-6"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="font-heading text-2xl font-bold text-primary/40">{step.number}</span>
                <step.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-heading font-bold text-foreground uppercase tracking-tight mb-2">
                {step.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Conversion CTA */}
      <section className="container mx-auto px-4 md:px-8 mt-24">
        <motion.div
          className="bg-card border border-border rounded-2xl p-8 md:p-14 text-center max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="font-heading text-2xl md:text-3xl font-bold mb-4">
            Votre projet pourrait être le prochain.
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Vous souhaitez améliorer votre présence digitale, développer votre visibilité ou structurer
            votre stratégie ?
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/audit"
              className="bg-gradient-primary text-primary-foreground px-6 py-3 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity shadow-glow"
            >
              Demander un audit gratuit
            </Link>
            <Link
              to="/contact"
              className="border border-border hover:bg-secondary text-foreground px-6 py-3 rounded-lg text-sm font-semibold transition-colors"
            >
              Parler à GLN DIGITAL
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  );
};

export default Portfolio;
