import { useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Clock } from "lucide-react";
import { toast } from "sonner";
import { portfolioProjects, PORTFOLIO_CATEGORY_LABELS } from "@/lib/portfolioProjects";
import { ProjectImagePlaceholder } from "./Portfolio";

// Étape 4 of the portfolio work: one case-study page per project at
// /portfolio/[slug]. Pure display over the same local portfolioProjects.ts
// data the /portfolio grid already uses — no new data source, no section
// rendered for content a project doesn't have (gallery, stats). Every
// piece of text here comes straight from that file; nothing is reworded
// or invented for this page.
const PortfolioDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const project = portfolioProjects.find((p) => p.slug === slug);

  // Invalid/unknown slug -> a clean bounce back to /portfolio rather than
  // the site's generic (English, off-brand) NotFound page — consistent
  // with how this app already handles other "that didn't resolve" cases
  // (e.g. Auth.tsx/AuthCallback.tsx: toast + redirect).
  useEffect(() => {
    if (!project) {
      toast.error("Projet introuvable.");
      navigate("/portfolio", { replace: true });
    }
  }, [project, navigate]);

  // Page-specific SEO, same mechanism as Portfolio.tsx (mission section:
  // "title et meta description dynamiques par projet, basés sur le nom et
  // la catégorie") — set on mount, restored on unmount.
  useEffect(() => {
    if (!project) return;

    const previousTitle = document.title;
    document.title = `${project.title} | Portfolio GLN DIGITAL`;

    let meta = document.querySelector('meta[name="description"]');
    const previousDescription = meta?.getAttribute("content") ?? null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute(
      "content",
      `${project.title} — étude de cas ${PORTFOLIO_CATEGORY_LABELS[project.category]} par GLN DIGITAL (${project.duration}).`
    );

    return () => {
      document.title = previousTitle;
      if (meta && previousDescription !== null) {
        meta.setAttribute("content", previousDescription);
      }
    };
  }, [project]);

  // Redirect is in flight (effect above) — render nothing rather than a
  // half-built page for an invalid slug.
  if (!project) return null;

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4 md:px-8 max-w-4xl">
        <Link
          to="/portfolio"
          className="inline-flex items-center gap-1.5 border border-border hover:bg-secondary text-foreground px-4 py-2 rounded-lg text-xs font-semibold transition-colors mb-8"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Retour au portfolio
        </Link>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <span className="inline-flex text-[10px] font-bold uppercase tracking-wide text-primary bg-primary/10 border border-primary/20 rounded-full px-2.5 py-1 mb-4">
            {PORTFOLIO_CATEGORY_LABELS[project.category]}
          </span>
          <h1 className="font-heading text-3xl md:text-5xl font-bold uppercase tracking-tight mb-3">
            {project.title}
          </h1>
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            {project.duration}
          </span>
        </motion.div>

        {/* Main image */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="relative w-full aspect-[16/9] rounded-xl overflow-hidden border border-border mb-12"
        >
          {project.imageType === "real" && project.image ? (
            <img
              src={project.image}
              alt={project.imageAlt}
              className="w-full h-full object-cover"
            />
          ) : (
            <ProjectImagePlaceholder project={project} />
          )}
        </motion.div>

        {/* Le contexte */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12"
        >
          <h2 className="font-heading text-2xl font-bold mb-4">Le contexte</h2>
          <p className="text-muted-foreground leading-relaxed">{project.description}</p>
        </motion.section>

        {/* Notre mission */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12"
        >
          <h2 className="font-heading text-2xl font-bold mb-4">Notre mission</h2>
          <ul className="space-y-2.5">
            {project.services.map((service) => (
              <li key={service} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                {service}
              </li>
            ))}
          </ul>
        </motion.section>

        {/* Galerie — only if this project has secondary photos */}
        {project.gallery.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <h2 className="font-heading text-2xl font-bold mb-4">Galerie</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {project.gallery.map((src, i) => (
                <div
                  key={src}
                  className="relative w-full aspect-[16/9] rounded-xl overflow-hidden border border-border"
                >
                  <img
                    src={src}
                    alt={`${project.imageAlt} — photo ${i + 2}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Résultats observés — only if real, verified stats exist for
            this project. Each tile keeps value + period together so a
            number is never shown without its honest measurement window. */}
        {project.stats && project.stats.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <h2 className="font-heading text-2xl font-bold mb-4">Résultats observés</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {project.stats.map((stat) => (
                <div key={stat.label} className="bg-card border border-border rounded-xl p-5">
                  <div className="font-heading text-2xl font-bold text-primary">{stat.value}</div>
                  <div className="text-sm text-foreground font-medium mt-1">{stat.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">{stat.period}</div>
                </div>
              ))}
            </div>
          </motion.section>
        )}
      </div>

      {/* Conversion CTA — identical content/markup to /portfolio's CTA
          (mission: "identique à celle de la page /portfolio"); kept as a
          separate copy rather than a shared component so this step never
          has to touch Portfolio.tsx's own CTA section. */}
      <section className="container mx-auto px-4 md:px-8 mt-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-card border border-border rounded-2xl p-8 md:p-14 text-center max-w-3xl mx-auto"
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

export default PortfolioDetail;
