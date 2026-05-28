import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { useState } from "react";
import MediaCard from "@/components/MediaCard";

const platforms = [
  { value: "all", label: "Tous" },
  { value: "meta", label: "Meta Ads" },
  { value: "tiktok", label: "TikTok" },
  { value: "google_ads", label: "Google Ads" },
  { value: "youtube", label: "YouTube" },
  { value: "facebook", label: "Facebook" },
  { value: "other", label: "Autre" },
];

const Portfolio = () => {
  const [filter, setFilter] = useState("all");

  const { data: media = [] } = useQuery({
    queryKey: ["portfolio-media"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portfolio_media")
        .select("*")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const filtered = filter === "all" ? media : media.filter((m) => m.platform === filter);

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4 md:px-8">
        <motion.h1
          className="font-heading text-4xl md:text-5xl font-bold text-center mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Notre <span className="text-gradient-primary">Portfolio</span>
        </motion.h1>
        <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-10">
          Nos campagnes publicitaires et réalisations sur toutes les plateformes.
        </p>

        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {platforms.map((p) => (
            <button
              key={p.value}
              onClick={() => setFilter(p.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                filter === p.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-20">Aucun contenu pour le moment.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((m, i) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <MediaCard item={m} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Portfolio;
