import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import MediaCard from "./MediaCard";

const PortfolioSection = () => {
  const { data: media = [] } = useQuery({
    queryKey: ["portfolio-media-home"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portfolio_media")
        .select("*")
        .order("display_order", { ascending: true })
        .limit(6);
      if (error) throw error;
      return data;
    },
  });

  if (media.length === 0) return null;

  return (
    <section className="py-20 bg-card">
      <div className="container mx-auto px-4 md:px-8">
        <motion.h2
          className="font-heading text-3xl md:text-4xl font-bold text-center mb-4"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          Nos <span className="text-gradient-primary">réalisations</span>
        </motion.h2>
        <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-14">
          Découvrez nos campagnes Meta, TikTok, Google Ads et plus encore.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {media.map((m, i) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <MediaCard item={m} />
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link
            to="/portfolio"
            className="inline-flex items-center gap-2 text-primary font-semibold hover:underline"
          >
            Voir tout le portfolio <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default PortfolioSection;
