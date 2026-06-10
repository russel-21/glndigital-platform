import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { getActiveSiteContentBlocks, SiteContentPage, SiteContentBlock } from "@/lib/siteContent";

const SiteContentBlocks = ({ page }: { page: SiteContentPage }) => {
  const [blocks, setBlocks] = useState<SiteContentBlock[]>(() => getActiveSiteContentBlocks(page));

  useEffect(() => {
    const refresh = () => setBlocks(getActiveSiteContentBlocks(page));
    window.addEventListener("gln-site-content-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("gln-site-content-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [page]);

  if (!blocks.length) return null;

  return (
    <section className="container mx-auto px-4 md:px-8 py-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {blocks.map((block) => (
          <article key={block.id} className="rounded-xl border border-border bg-card p-6">
            <h2 className="font-heading text-xl font-bold text-foreground mb-3">{block.title}</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{block.body}</p>
            {block.ctaLabel && block.ctaUrl && (
              <Link
                to={block.ctaUrl}
                className="inline-flex items-center gap-2 mt-5 text-sm font-semibold text-primary hover:underline"
              >
                {block.ctaLabel}
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </article>
        ))}
      </div>
    </section>
  );
};

export default SiteContentBlocks;
