const shareUrl = encodeURIComponent("https://glndigital.com");
const shareText = encodeURIComponent("Découvrez GLN DIGITAL – Accélérez votre croissance digitale !");

const shareLinks = [
  { name: "WhatsApp", url: `https://wa.me/?text=${shareText}%20${shareUrl}`, color: "hover:text-[hsl(142,70%,45%)]" },
  { name: "Facebook", url: `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`, color: "hover:text-[hsl(220,46%,48%)]" },
  { name: "Telegram", url: `https://t.me/share/url?url=${shareUrl}&text=${shareText}`, color: "hover:text-[hsl(200,80%,50%)]" },
  { name: "X", url: `https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`, color: "hover:text-foreground" },
];

const ShareButtons = () => (
  <div className="flex items-center gap-3">
    <span className="text-xs text-muted-foreground font-medium">Partager :</span>
    {shareLinks.map((s) => (
      <a
        key={s.name}
        href={s.url}
        target="_blank"
        rel="noopener noreferrer"
        title={`Partager sur ${s.name}`}
        className={`text-muted-foreground transition-colors text-sm font-medium ${s.color}`}
      >
        {s.name}
      </a>
    ))}
  </div>
);

export default ShareButtons;
