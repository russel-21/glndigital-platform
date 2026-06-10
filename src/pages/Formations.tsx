import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { GraduationCap, ArrowRight, Video, FileText, CheckCircle2, MessageCircle } from "lucide-react";
import { getCourses } from "@/lib/coursesStore";
import { useLanguage } from "@/hooks/useLanguage";
import SiteContentBlocks from "@/components/SiteContentBlocks";

const Formations = () => {
  const courses = getCourses();
  const { language } = useLanguage();

  return (
    <div className="min-h-screen pt-24 pb-16">
      <SiteContentBlocks page="formations" />
      <div className="container mx-auto px-4 md:px-8">
        {/* Title */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="bg-primary/10 text-primary text-xs font-semibold px-4 py-1.5 rounded-full border border-primary/20">
            {language === "fr" ? "Académie GLN DIGITAL" : "GLN DIGITAL Academy"}
          </span>
          <h1 className="font-heading text-4xl md:text-5xl font-bold mt-6 mb-4">
            {language === "fr" ? (
              <>Développez vos compétences aux <span className="text-gradient-primary">métiers du digital</span></>
            ) : (
              <>Develop your skills in <span className="text-gradient-primary">digital careers</span></>
            )}
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-base">
            {language === "fr"
              ? "Des programmes intensifs, orientés sur la pratique et l'atteinte de résultats concrets pour booster votre activité ou décrocher un emploi."
              : "Intensive, practice-oriented programs designed to achieve concrete results to boost your business or land a job."}
          </p>
        </motion.div>

        {/* Grid List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {courses.map((course, idx) => {
            const title = language === "fr" ? course.title : (course.titleEn || course.title);
            const duration = language === "fr" ? course.duration : (course.durationEn || course.duration);
            const difficulty = language === "fr" ? course.difficulty : (course.difficultyEn || course.difficulty);
            const desc = language === "fr" ? course.desc : (course.descEn || course.desc);
            const price = language === "fr" ? course.price : (course.priceEn || course.price);
            const features = language === "fr" ? course.features : (course.featuresEn || course.features);

            return (
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
                    <span className="text-xs text-primary font-bold bg-primary/10 px-3 py-1 rounded-full">{duration}</span>
                    <span className="text-xs text-muted-foreground font-medium">{difficulty}</span>
                  </div>
                  <h2 className="font-heading text-xl font-bold mb-3">{title}</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-6">{desc}</p>
                  
                  <div className="space-y-2 mb-6">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                      {language === "fr" ? "Ce que vous allez maîtriser :" : "What you will master:"}
                    </h4>
                    {features.map((feat) => (
                      <div key={feat} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-border/40 pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase block">
                      {language === "fr" ? "Tarif unique" : "Single price"}
                    </span>
                    <span className="text-lg font-bold text-foreground">{price}</span>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Link
                      to={`/formations/${course.id}`}
                      className="flex-1 sm:flex-none bg-secondary hover:bg-secondary/80 text-foreground text-center px-4 py-2.5 rounded-lg text-xs font-semibold border border-border"
                    >
                      {language === "fr" ? "Voir le programme" : "View program"}
                    </Link>
                    <a
                      href={`https://wa.me/237692062677?text=${language === "fr" ? "Bonjour,%20je%20souhaite%20m'inscrire%20à%20la%20formation%20:%20" : "Hello,%20I%20wish%20to%20enroll%20in%20the%20course%20:%20"}${encodeURIComponent(title)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 sm:flex-none bg-primary text-primary-foreground text-center px-4 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity"
                    >
                      <MessageCircle className="w-4 h-4 fill-current" />
                      {language === "fr" ? "S'inscrire" : "Enroll"}
                    </a>
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

export default Formations;
