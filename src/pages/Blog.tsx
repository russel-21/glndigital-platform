import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Calendar, User, ArrowRight, BookOpen } from "lucide-react";

// Mock posts ciblés SEO Cameroun/Douala
const blogPosts = [
  {
    id: "pourquoi-likes-ne-vendent-plus",
    title: "Pourquoi les likes sur Facebook ne vendent plus au Cameroun en 2026",
    excerpt: "Découvrez les failles de la simple visibilité organique et apprenez comment structurer un véritable système publicitaire pour attirer des clients qualifiés sur Douala et Yaoundé.",
    category: "Stratégie Digitale",
    date: "24 Mai 2026",
    author: "Russel N. (GLN DIGITAL)",
    readTime: "5 min de lecture"
  },
  {
    id: "erreurs-meta-ads-cameroun",
    title: "Les 5 erreurs courantes sur Facebook Ads qui détruisent votre budget publicitaire",
    excerpt: "Gaspillage de budget publicitaire, mauvais pixels, ciblage trop large... Évitez ces erreurs critiques et apprenez à configurer vos campagnes publicitaires avec un ciblage précis.",
    category: "Publicité Meta Ads",
    date: "18 Mai 2026",
    author: "Russel N. (GLN DIGITAL)",
    readTime: "8 min de lecture"
  },
  {
    id: "outils-ia-community-manager",
    title: "5 outils d'Intelligence Artificielle indispensables pour un Community Manager au Cameroun",
    excerpt: "De ChatGPT à CapCut, découvrez comment optimiser votre vitesse de production de visuels et de montages vidéos courts pour vos clients.",
    category: "Community Management",
    date: "12 Mai 2026",
    author: "L'équipe GLN ACADÉMIE",
    readTime: "6 min de lecture"
  }
];

const Blog = () => (
  <div className="min-h-screen pt-24 pb-16">
    <div className="container mx-auto px-4 md:px-8 max-w-5xl">
      {/* Header */}
      <motion.div
        className="text-center mb-16"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <span className="bg-primary/10 text-primary text-xs font-semibold px-4 py-1.5 rounded-full border border-primary/20">
          Blog & Astuces
        </span>
        <h1 className="font-heading text-4xl md:text-5xl font-bold mt-6 mb-4">
          Le Blog du <span className="text-gradient-primary">Marketing Digital</span>
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto text-base">
          Astuces de closing, tutoriels publicitaires Meta Ads et guides pratiques de community management pour accélérer votre business au Cameroun.
        </p>
      </motion.div>

      {/* Posts List */}
      <div className="space-y-8">
        {blogPosts.map((post, idx) => (
          <motion.article
            key={post.id}
            className="p-6 md:p-8 rounded-2xl bg-card border border-border/40 hover:border-primary/20 transition-colors flex flex-col md:flex-row gap-6 justify-between items-start"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.08 }}
          >
            <div className="flex-1 space-y-4">
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span className="text-primary font-bold bg-primary/10 px-2.5 py-1 rounded-full uppercase tracking-wider">{post.category}</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {post.date}
                </span>
                <span className="flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5" />
                  {post.readTime}
                </span>
              </div>

              <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground leading-tight hover:text-primary transition-colors">
                <Link to={`/blog/${post.id}`}>{post.title}</Link>
              </h2>

              <p className="text-muted-foreground text-sm leading-relaxed">{post.excerpt}</p>

              <div className="flex items-center gap-2 pt-2 text-xs font-semibold text-foreground">
                <User className="w-4 h-4 text-primary" />
                <span>Publié par {post.author}</span>
              </div>
            </div>

            <div className="w-full md:w-auto pt-4 md:pt-0 shrink-0 self-end">
              <Link
                to={`/blog/${post.id}`}
                className="w-full md:w-auto bg-secondary hover:bg-primary/10 border border-border text-foreground hover:text-primary py-3 px-6 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all group"
              >
                Lire l'article
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </motion.article>
        ))}
      </div>
    </div>
  </div>
);

export default Blog;
