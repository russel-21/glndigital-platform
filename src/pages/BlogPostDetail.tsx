import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, User, Clock, MessageCircle } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

interface PostDetail {
  title: string;
  category: string;
  date: string;
  author: string;
  readTime: string;
  content: string[];
}

const postsData: Record<string, { fr: PostDetail; en: PostDetail }> = {
  "pourquoi-likes-ne-vendent-plus": {
    fr: {
      title: "Pourquoi les likes sur Facebook ne vendent plus au Cameroun en 2026",
      category: "Stratégie Digitale",
      date: "24 Mai 2026",
      author: "Russel N. (GLN DIGITAL)",
      readTime: "5 min de lecture",
      content: [
        "Dans l'écosystème commercial camerounais, de nombreuses entreprises commettent encore l'erreur classique d'assimiler les likes de leur page Facebook à un chiffre d'affaires. Or, la réalité de l'algorithme de Meta est implacable : la portée organique (gratuite) ne touche aujourd'hui que moins de 2% de vos abonnés.",
        "Si vous gérez une page de boutique, d'hôtel, ou de service à Douala, compter uniquement sur la publication régulière de photos de vos produits ne suffit plus pour payer vos charges. C'est ce qu'on appelle la visibilité passive. Elle flatte l'ego, mais ne remplit pas le compte en banque.",
        "Pour transformer vos réseaux sociaux en machines à générer du chiffre d'affaires, vous devez mettre en place un système d'acquisition actif. Cela passe par :",
        "1. La Publicité Meta Ads ciblée : investissez un budget quotidien précis en ciblant la bonne audience géographique (Douala, Yaoundé, Bafoussam) et les bons intérêts d'achat.",
        "2. Des Tunnels WhatsApp Business : redirigez vos prospects chauds directement vers votre messagerie WhatsApp pour assurer un closing commercial humain et rapide.",
        "3. Des Offres Irrésistibles : proposez des packs, des bonus ou des audits gratuits plutôt que de simples fiches produits génériques."
      ]
    },
    en: {
      title: "Why Facebook likes no longer sell in Cameroon in 2026",
      category: "Digital Strategy",
      date: "May 24, 2026",
      author: "Russel N. (GLN DIGITAL)",
      readTime: "5 min read",
      content: [
        "In the Cameroonian business ecosystem, many companies still make the classic mistake of equating likes on their Facebook page to revenue. However, the reality of Meta's algorithm is unforgiving: organic (free) reach currently touches less than 2% of your followers.",
        "If you manage a page for a shop, hotel, or service in Douala, relying solely on regular posting of product photos is no longer enough to pay your bills. This is called passive visibility. It flatters the ego, but does not fill the bank account.",
        "To turn your social media into revenue-generating engines, you must set up an active acquisition system. This involves:",
        "1. Targeted Meta Ads: invest a precise daily budget targeting the right geographic audience (Douala, Yaoundé, Bafoussam) and the right buying interests.",
        "2. WhatsApp Business Funnels: redirect your hot prospects directly to your WhatsApp messaging to ensure human and rapid commercial closing.",
        "3. Irresistible Offers: offer packages, bonuses, or free audits rather than simple generic product sheets."
      ]
    }
  },
  "erreurs-meta-ads-cameroun": {
    fr: {
      title: "Les 5 erreurs courantes sur Facebook Ads qui détruisent votre budget publicitaire",
      category: "Publicité Meta Ads",
      date: "18 Mai 2026",
      author: "Russel N. (GLN DIGITAL)",
      readTime: "8 min de lecture",
      content: [
        "Le bouton 'Booster la publication' est sans doute l'outil le plus rentable... pour Facebook, pas pour vous. Au Cameroun, de nombreux entrepreneurs débutants cliquent sur ce bouton magique dans l'espoir d'obtenir des clients, mais finissent par gaspiller 50 000 ou 100 000 FCFA sans résultats tangibles.",
        "Voici les erreurs majeures à corriger immédiatement dans vos campagnes publicitaires :",
        "1. Ne pas configurer le Business Manager : utilisez le gestionnaire de publicité professionnel pour accéder à tous les outils de ciblage avancés.",
        "2. Cibler l'ensemble du pays sans distinction : si votre produit ou votre service est disponible à Douala, excluez les autres régions si vous n'avez pas de logistique de livraison fiable.",
        "3. Négliger le Copywriting : vos publicités doivent interpeller le prospect dans les 3 premières secondes. Utilisez des crochets accrocheurs et parlez des bénéfices de votre offre.",
        "4. Manque de tracking : n'oubliez pas d'installer le Pixel Meta ou l'API de Conversion si vous vendez via un site internet."
      ]
    },
    en: {
      title: "5 Common Facebook Ads Mistakes That Destroy Your Ad Budget",
      category: "Meta Ads Advertising",
      date: "May 18, 2026",
      author: "Russel N. (GLN DIGITAL)",
      readTime: "8 min read",
      content: [
        "The 'Boost Post' button is undoubtedly the most profitable tool... for Facebook, not for you. In Cameroon, many beginner entrepreneurs click this magic button hoping to get clients, but end up wasting 50,000 or 100,000 FCFA without tangible results.",
        "Here are the major errors to fix immediately in your advertising campaigns:",
        "1. Not setting up Business Manager: use the professional ad manager to access all advanced targeting tools.",
        "2. Targeting the entire country without distinction: if your product or service is available in Douala, exclude other regions if you do not have a reliable delivery logistics.",
        "3. Neglecting Copywriting: your ads must hook the prospect within the first 3 seconds. Use catchy hooks and talk about the benefits of your offer.",
        "4. Lack of tracking: do not forget to install the Meta Pixel or Conversion API if you sell via a website."
      ]
    }
  },
  "outils-ia-community-manager": {
    fr: {
      title: "5 outils d'Intelligence Artificielle indispensables pour un Community Manager au Cameroun",
      category: "Community Management",
      date: "12 Mai 2026",
      author: "L'équipe GLN ACADÉMIE",
      readTime: "6 min de lecture",
      content: [
        "Le métier de Community Manager évolue à une vitesse fulgurante. Avec l'apparition de l'intelligence artificielle générative, vous pouvez aujourd'hui accomplir en une heure des tâches de rédaction et de design qui vous prenaient autrefois une journée entière.",
        "Voici la sélection GLN des 5 outils IA incontournables :",
        "1. ChatGPT : pour rédiger vos calendriers éditoriaux, structurer vos idées d'accroches publicitaires et corriger les fautes d'orthographe.",
        "2. Canva AI (Éditeur Magique) : pour effacer des objets, modifier des images ou générer des templates graphiques personnalisés en quelques clics.",
        "3. CapCut (Sous-titrage Automatique) : indispensable pour ajouter des sous-titres animés et dynamiques sur vos vidéos courtes (TikTok/Reels).",
        "4. ElevenLabs : pour cloner des voix off de haute qualité et donner un aspect professionnel à vos podcasts ou vidéos promotionnelles.",
        "5. Claude.ai : excellent outil alternatif pour rédiger des textes de vente avec un ton très naturel et persuasif."
      ]
    },
    en: {
      title: "5 Essential AI Tools for a Community Manager in Cameroon",
      category: "Community Management",
      date: "May 12, 2026",
      author: "GLN ACADEMY Team",
      readTime: "6 min read",
      content: [
        "The Community Manager profession is evolving at lightning speed. With the advent of generative AI, you can now complete in one hour writing and design tasks that used to take you a whole day.",
        "Here is the GLN selection of the 5 essential AI tools:",
        "1. ChatGPT: to write your editorial calendars, structure your hook ideas, and correct spelling errors.",
        "2. Canva AI (Magic Editor): to erase objects, modify images, or generate customized graphic templates in a few clicks.",
        "3. CapCut (Auto Captions): essential for adding animated and dynamic subtitles to your short videos (TikTok/Reels).",
        "4. ElevenLabs: to clone high-quality voiceovers and give a professional look to your podcasts or promotional videos.",
        "5. Claude.ai: excellent alternative tool for writing sales copy with a very natural and persuasive tone."
      ]
    }
  }
};

const BlogPostDetail = () => {
  const { id } = useParams();
  const { language } = useLanguage();
  const postGroup = id ? postsData[id] : null;
  const post = postGroup ? (postGroup[language] || postGroup.fr) : null;

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-24 text-center">
        <div>
          <h2 className="text-2xl font-bold mb-4">
            {language === "fr" ? "Article non trouvé" : "Article not found"}
          </h2>
          <Link to="/blog" className="text-primary hover:underline">
            {language === "fr" ? "Retourner au blog" : "Back to blog"}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4 md:px-8 max-w-3xl">
        <Link to="/blog" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          {language === "fr" ? "Retour au blog" : "Back to blog"}
        </Link>

        {/* Article Meta */}
        <div className="space-y-4 mb-8">
          <span className="text-xs bg-primary/10 text-primary font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">
            {post.category}
          </span>
          <h1 className="font-heading text-3xl md:text-4xl font-extrabold leading-tight text-foreground">
            {post.title}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-2">
            <span className="flex items-center gap-1">
              <User className="w-4 h-4 text-primary" />
              {post.author}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {post.date}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {post.readTime}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="border border-border/40 bg-card rounded-2xl p-6 md:p-10 space-y-6 text-muted-foreground text-sm md:text-base leading-relaxed mb-12">
          {post.content.map((pText, idx) => (
            <p key={idx}>{pText}</p>
          ))}
        </div>

        {/* Action Sidebar/Box */}
        <div className="p-6 rounded-2xl bg-secondary/30 border border-border/60 text-center space-y-4">
          <h3 className="font-heading font-bold text-lg text-foreground">
            {language === "fr" ? "Besoin d'un accompagnement sur-mesure au Cameroun ?" : "Need customized support in Cameroon?"}
          </h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            {language === "fr"
              ? "Ne laissez pas votre marketing au hasard. Nos experts GLN DIGITAL conçoivent vos publicités et gèrent vos pages pour générer de vrais clients."
              : "Do not leave your marketing to chance. Our GLN DIGITAL experts design your ads and manage your pages to generate real clients."}
          </p>
          <a
            href="https://wa.me/237692062677"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold text-xs gap-2 hover:opacity-90 transition-opacity shadow-glow items-center"
          >
            <MessageCircle className="w-4 h-4 fill-current" />
            {language === "fr" ? "Discuter sur WhatsApp" : "Chat on WhatsApp"}
          </a>
        </div>
      </div>
    </div>
  );
};

export default BlogPostDetail;
