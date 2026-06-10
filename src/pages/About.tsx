import { motion } from "framer-motion";
import { Search, Users, Lightbulb, PenTool, UserPlus, RefreshCw } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import SiteContentBlocks from "@/components/SiteContentBlocks";

const steps = [
  { icon: Search, labelFr: "Analyse du marché", labelEn: "Market analysis" },
  { icon: Users, labelFr: "Compréhension du client cible", labelEn: "Target client understanding" },
  { icon: Lightbulb, labelFr: "Construction d'une stratégie", labelEn: "Strategy building" },
  { icon: PenTool, labelFr: "Création du contenu", labelEn: "Content creation" },
  { icon: UserPlus, labelFr: "Acquisition de prospects", labelEn: "Lead acquisition" },
  { icon: RefreshCw, labelFr: "Optimisation continue", labelEn: "Continuous optimization" },
];

const About = () => {
  const { language } = useLanguage();

  return (
    <div className="min-h-screen pt-24 pb-16">
      <SiteContentBlocks page="about" />
      <div className="container mx-auto px-4 md:px-8">
        {/* Header */}
        <motion.div
          className="max-w-3xl mx-auto text-center mb-20"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="bg-primary/10 text-primary text-xs font-semibold px-4 py-1.5 rounded-full border border-primary/20">
            {language === "fr" ? "À propos" : "About"}
          </span>
          <h1 className="font-heading text-4xl md:text-5xl font-bold mt-6 mb-6">
            {language === "fr" ? (
              <>Qui sommes‑<span className="text-gradient-primary">nous</span> ?</>
            ) : (
              <>Who <span className="text-gradient-primary">we are</span></>
            )}
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            {language === "fr"
              ? "GLN DIGITAL est une agence spécialisée en marketing digital et acquisition client. Notre mission : aider les entreprises à utiliser Internet comme un véritable levier de croissance et non simplement comme une vitrine."
              : "GLN DIGITAL is an agency specialized in digital marketing and customer acquisition. Our mission: to help businesses use the Internet as a real growth driver rather than just a showcase."}
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
            <h2 className="font-heading text-2xl font-bold mb-4 text-gradient-primary">
              {language === "fr" ? "Notre vision" : "Our vision"}
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {language === "fr"
                ? "Le digital évolue rapidement. Les méthodes d'hier ne fonctionnent plus aujourd'hui. Notre objectif est d'apporter aux entreprises des méthodes actuelles, efficaces et adaptées aux comportements modernes des consommateurs."
                : "Digital is evolving rapidly. Yesterday's methods no longer work today. Our goal is to bring modern, effective methods to businesses, adapted to modern consumer behavior."}
            </p>
          </motion.div>

          <motion.div
            className="bg-card border border-border rounded-2xl p-8 md:p-10"
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="font-heading text-2xl font-bold mb-4 text-gradient-accent">
              {language === "fr" ? "Notre mission" : "Our mission"}
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {language === "fr"
                ? "Nous combinons stratégie, contenu et publicité pour transformer l'attention en revenus. Chaque étape suit un processus précis. Nous ne travaillons pas au hasard."
                : "We combine strategy, content, and advertising to turn attention into revenue. Every step follows a precise process. We do not work by chance."}
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
            {language === "fr" ? (
              <>Notre <span className="text-gradient-primary">approche</span></>
            ) : (
              <>Our <span className="text-gradient-primary">approach</span></>
            )}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {steps.map((s, i) => (
              <motion.div
                key={s.labelFr}
                className="bg-secondary/50 border border-border rounded-xl p-5 text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <s.icon className="w-7 h-7 text-primary mx-auto mb-3" />
                <span className="text-sm font-medium text-foreground">
                  {language === "fr" ? s.labelFr : s.labelEn}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default About;
