export interface Lesson {
  id: string;
  title: string;
  duration: string;
  watched: boolean;
  content?: string; // For written/text lessons
  videoUrl?: string; // For video lessons
}

export interface CourseModule {
  title: string;
  unlocked: boolean;
  videos: Lesson[];
}

export interface Course {
  id: string;
  title: string;
  duration: string;
  difficulty: string;
  desc: string;
  price: string;
  type: "video" | "written";
  features: string[];
  audience: string[];
  skills: string[];
  modules: CourseModule[];
}

export const defaultCourses: Course[] = [
  {
    id: "marketing-digital-pro",
    title: "Marketing Digital Professionnel",
    duration: "6 semaines",
    difficulty: "Tous niveaux",
    price: "Sur devis",
    desc: "Acquérez les compétences indispensables pour piloter des stratégies d'acquisition clients rentables. Une formation pratique combinant cours en ligne, coaching individuel et cas pratiques réels sur le marché d'Afrique Centrale.",
    type: "video",
    features: [
      "Création de tunnels d'acquisition",
      "Lancement de campagnes Facebook & Instagram Ads",
      "Tracking des conversions & pixels",
      "Reporting & Optimisation de budget",
    ],
    audience: [
      "Entrepreneurs et fondateurs de PME voulant automatiser leurs ventes",
      "Responsables marketing cherchant à se moderniser",
      "Étudiants en quête de compétences recherchées sur le marché de l'emploi",
    ],
    skills: [
      "Définition de personas et parcours d'achat",
      "Mise en place de pixels de tracking (Meta Pixel, Google Analytics)",
      "Lancement de campagnes publicitaires Facebook & Instagram Ads",
      "Écriture de textes persuasifs (Copywriting)",
      "Optimisation du Return on Ad Spend (ROAS)",
    ],
    modules: [
      {
        title: "Module 1 : Les Fondations du Marketing Digital",
        unlocked: true,
        videos: [
          { id: "mdp-v1", title: "1.1 Comprendre le comportement du consommateur moderne", duration: "12:35", watched: true, videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4" },
          { id: "mdp-v2", title: "1.2 Définir sa proposition de valeur unique", duration: "18:40", watched: false, videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4" },
          { id: "mdp-v3", title: "1.3 Cartographier le tunnel de vente", duration: "15:20", watched: false, videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4" },
        ],
      },
      {
        title: "Module 2 : La Publicité Meta Ads de A à Z",
        unlocked: true,
        videos: [
          { id: "mdp-v4", title: "2.1 Paramétrage optimal du Business Manager", duration: "14:15", watched: false, videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4" },
          { id: "mdp-v5", title: "2.2 Comprendre l'algorithme et la structure de campagne", duration: "22:10", watched: false, videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4" },
        ],
      },
    ],
  },
  {
    id: "community-management",
    title: "Community Management & Croissance",
    duration: "4 semaines",
    difficulty: "Débutant à Intermédiaire",
    price: "Sur devis",
    desc: "Apprenez à gérer, animer et faire grandir des communautés sur Facebook, Instagram et TikTok pour des entreprises locales.",
    type: "written",
    features: [
      "Création de calendriers éditoriaux",
      "Maîtrise de Canva pour les designs professionnels",
      "Copywriting et rédactions accrocheuses",
      "Gestion de la modération client",
    ],
    audience: [
      "Futurs community managers cherchant à se lancer en freelance",
      "Propriétaires de commerces souhaitant développer leur visibilité locale",
      "Chargés de communication en reconversion",
    ],
    skills: [
      "Création de chartes éditoriales et calendriers de posts",
      "Conception graphique rapide sur Canva Pro",
      "Techniques d'animation de communautés Facebook & Instagram",
      "Gestion de la modération de messagerie et de commentaires",
    ],
    modules: [
      {
        title: "Module 1 : Rôle du Community Manager au Cameroun",
        unlocked: true,
        videos: [
          { id: "cm-w1", title: "1.1 Écosystème local des réseaux sociaux", duration: "Lecture : 10 min", watched: true, content: "L'écosystème numérique en Afrique centrale, et particulièrement au Cameroun, connaît une dynamique unique caractérisée par la prédominance de Facebook pour les affaires..." },
          { id: "cm-w2", title: "1.2 Audit et analyse d'une page existante", duration: "Lecture : 15 min", watched: false, content: "Pour auditer une page de marque, commencez par évaluer le taux d'engagement, la régularité des posts, le style visuel et le temps de réponse aux commentaires..." },
        ],
      },
    ],
  },
  {
    id: "creation-contenu-ia",
    title: "Création de contenu & IA générative",
    duration: "3 semaines",
    difficulty: "Tous niveaux",
    price: "Sur devis",
    desc: "Boostez votre productivité avec l'intelligence artificielle. Utilisez ChatGPT, Midjourney et CapCut pour vos visuels et vidéos.",
    type: "video",
    features: [
      "Prompts avancés pour la création de contenu",
      "Montage vidéo dynamique sur smartphone (CapCut)",
      "Automatisation de votre branding avec l'IA",
      "Création de scripts de vidéos courtes virales",
    ],
    audience: [
      "Créateurs de contenu et blogueurs",
      "Social Media Managers voulant automatiser leur flux de travail",
      "Entrepreneurs pressés souhaitant produire des visuels rapidement",
    ],
    skills: [
      "Rédaction de prompts avancés pour ChatGPT",
      "Génération d'images et d'assets avec les IA visuelles",
      "Montage rapide et dynamique de Reels & TikTok sur CapCut",
      "Automatisation de la création de visuels en lot",
    ],
    modules: [
      {
        title: "Module 1 : ChatGPT & Ingénierie de Prompts",
        unlocked: true,
        videos: [
          { id: "ia-v1", title: "1.1 Formuler des prompts efficaces pour le marketing", duration: "10:15", watched: false, videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4" },
        ],
      },
    ],
  },
];

export const getCourses = (): Course[] => {
  const data = localStorage.getItem("gln_courses_db");
  if (!data) {
    localStorage.setItem("gln_courses_db", JSON.stringify(defaultCourses));
    return defaultCourses;
  }
  return JSON.parse(data);
};

export const saveCourses = (courses: Course[]) => {
  localStorage.setItem("gln_courses_db", JSON.stringify(courses));
};
