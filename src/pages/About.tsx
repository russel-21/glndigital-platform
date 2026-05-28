import { motion } from "framer-motion";
import { Search, Users, Lightbulb, PenTool, UserPlus, RefreshCw } from "lucide-react";

const steps = [
  { icon: Search, label: "Analyse du marché" },
  { icon: Users, label: "Compréhension du client cible" },
  { icon: Lightbulb, label: "Construction d'une stratégie" },
  { icon: PenTool, label: "Création du contenu" },
  { icon: UserPlus, label: "Acquisition de prospects" },
  { icon: RefreshCw, label: "Optimisation continue" },
];

const About = () => (
  <div className="min-h-screen pt-24 pb-16">
    <div className="container mx-auto px-4 md:px-8">
      {/* Header */}
      <motion.div
        className="max-w-3xl mx-auto text-center mb-20"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <span className="bg-primary/10 text-primary text-xs font-semibold px-4 py-1.5 rounded-full border border-primary/20">
          À propos
        </span>
        <h1 className="font-heading text-4xl md:text-5xl font-bold mt-6 mb-6">
          Qui sommes‑<span className="text-gradient-primary">nous</span> ?
        </h1>
        <p className="text-muted-foreground text-lg leading-relaxed">
          GLN DIGITAL est une agence spécialisée en marketing digital et acquisition client. Notre mission : aider les entreprises à utiliser Internet comme un véritable levier de croissance et non simplement comme une vitrine.
        </p>
      </motion.div>

      {/* Vision */}
      <div className="grid md:grid-cols-2 gap-12 mb-20">
        <motion.div
          className="bg-card border border-border rounded-2xl p-8 md:p-10"
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="font-heading text-2xl font-bold mb-4 text-gradient-primary">Notre vision</h2>
          <p className="text-muted-foreground leading-relaxed">
            Le digital évolue rapidement. Les méthodes d'hier ne fonctionnent plus aujourd'hui. Notre objectif est d'apporter aux entreprises des méthodes actuelles, efficaces et adaptées aux comportements modernes des consommateurs.
          </p>
        </motion.div>

        <motion.div
          className="bg-card border border-border rounded-2xl p-8 md:p-10"
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="font-heading text-2xl font-bold mb-4 text-gradient-accent">Notre mission</h2>
          <p className="text-muted-foreground leading-relaxed">
            Nous combinons stratégie, contenu et publicité pour transformer l'attention en revenus. Chaque étape suit un processus précis. Nous ne travaillons pas au hasard.
          </p>
        </motion.div>
      </div>

      {/* Approach */}
      <motion.div
        className="max-w-3xl mx-auto"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
      >
        <h2 className="font-heading text-3xl font-bold text-center mb-12">
          Notre <span className="text-gradient-primary">approche</span>
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {steps.map((s, i) => (
            <motion.div
              key={s.label}
              className="bg-secondary/50 border border-border rounded-xl p-5 text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
            >
              <s.icon className="w-7 h-7 text-primary mx-auto mb-3" />
              <span className="text-sm font-medium text-foreground">{s.label}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  </div>
);

export default About;
