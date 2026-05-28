/**
 * Extracts embed URL from various video platform links
 */
export function getEmbedUrl(url: string): string | null {
  if (!url) return null;

  // YouTube
  const ytMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;

  // Facebook video
  if (url.includes("facebook.com") || url.includes("fb.watch")) {
    return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false`;
  }

  // TikTok
  const ttMatch = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/);
  if (ttMatch) return `https://www.tiktok.com/embed/v2/${ttMatch[1]}`;

  // If it's already an embed URL or unknown, return as-is
  if (url.includes("embed")) return url;

  return null;
}

export function getPlatformLabel(platform: string | null): string {
  const labels: Record<string, string> = {
    meta: "Meta Ads",
    tiktok: "TikTok",
    google_ads: "Google Ads",
    youtube: "YouTube",
    facebook: "Facebook",
    other: "Autre",
  };
  return platform ? labels[platform] || platform : "Autre";
}
