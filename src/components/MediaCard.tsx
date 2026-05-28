import { useState } from "react";
import { Play, Image as ImageIcon } from "lucide-react";
import { getEmbedUrl, getPlatformLabel } from "@/lib/embedUtils";
import { AspectRatio } from "@/components/ui/aspect-ratio";

interface MediaItem {
  id: string;
  title: string;
  description?: string | null;
  media_type: string;
  media_url?: string | null;
  embed_url?: string | null;
  platform?: string | null;
  thumbnail_url?: string | null;
}

const MediaCard = ({ item }: { item: MediaItem }) => {
  const [playing, setPlaying] = useState(false);
  const embedSrc = item.embed_url ? getEmbedUrl(item.embed_url) : null;

  return (
    <div className="rounded-xl bg-secondary/50 border border-border overflow-hidden hover:border-primary/30 transition-colors group">
      <AspectRatio ratio={16 / 9}>
        {item.media_type === "image" && item.media_url ? (
          <img
            src={item.media_url}
            alt={item.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : item.media_type === "embed" && embedSrc ? (
          playing ? (
            <iframe
              src={embedSrc}
              title={item.title}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <button
              onClick={() => setPlaying(true)}
              className="relative w-full h-full bg-muted flex items-center justify-center cursor-pointer"
            >
              {item.thumbnail_url ? (
                <img
                  src={item.thumbnail_url}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                  <Play className="w-12 h-12 text-primary" />
                </div>
              )}
              <div className="absolute inset-0 bg-background/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-primary rounded-full p-3">
                  <Play className="w-6 h-6 text-primary-foreground fill-primary-foreground" />
                </div>
              </div>
            </button>
          )
        ) : item.media_type === "video" && item.media_url ? (
          <video
            src={item.media_url}
            controls
            className="w-full h-full object-cover"
            preload="metadata"
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <ImageIcon className="w-10 h-10 text-muted-foreground" />
          </div>
        )}
      </AspectRatio>

      <div className="p-4">
        <div className="flex items-center gap-2 mb-1">
          {item.platform && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20">
              {getPlatformLabel(item.platform)}
            </span>
          )}
        </div>
        <h3 className="font-heading font-semibold text-foreground text-sm">{item.title}</h3>
        {item.description && (
          <p className="text-muted-foreground text-xs mt-1 line-clamp-2">{item.description}</p>
        )}
      </div>
    </div>
  );
};

export default MediaCard;
