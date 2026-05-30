export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
}

export interface Lesson {
  id: string;
  title: string;
  duration: string;
  watched: boolean;
  content?: string; // For written/text lessons
  videoUrl?: string; // For video lessons (e.g. YouTube URL)
  transcription?: string; // French transcript
  transcriptionEn?: string; // English transcript
  quiz?: QuizQuestion[]; // 10 questions quiz
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

// Helper to extract YouTube Video ID
export const getYoutubeId = (url: string): string | null => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

// Generate 10 standard mock quiz questions for a course
export const generateDefaultQuiz = (topic: string): QuizQuestion[] => {
  return [
    {
      question: `Quelle est la règle d'or en ${topic} ?`,
      options: ["Parler uniquement de son produit", "Comprendre et cibler le besoin du client", "Faire les publicités les plus chères", "Attendre que les clients viennent d'eux-mêmes"],
      correctAnswerIndex: 1,
    },
    {
      question: `Quel indicateur mesure directement la rentabilité en ${topic} ?`,
      options: ["Le nombre de J'aime", "Le ROAS (Retour sur dépenses publicitaires)", "Le taux de clics (CTR)", "Le nombre de partages"],
      correctAnswerIndex: 1,
    },
    {
      question: "Que signifie le pixel de suivi ou API de conversion ?",
      options: ["Un outil de design d'images", "Un script pour suivre les actions des visiteurs sur le site", "Un moyen de bloquer les publicités des concurrents", "Un logiciel de facturation"],
      correctAnswerIndex: 1,
    },
    {
      question: "Pour rédiger une offre irrésistible, que doit-on mettre en avant ?",
      options: ["La liste technique des fonctionnalités", "La transformation et les bénéfices pour le client", "Le logo de l'entreprise en grand", "Le fait que vous soyez le meilleur"],
      correctAnswerIndex: 1,
    },
    {
      question: "Qu'est-ce que le 'Retargeting' (reciblage) ?",
      options: ["Changer de pays cible pour ses ventes", "Diffuser des publicités aux personnes ayant déjà interagi avec la marque", "Supprimer les anciennes publicités", "Trouver de nouveaux mots-clés"],
      correctAnswerIndex: 1,
    },
    {
      question: "Quel format publicitaire mobile génère actuellement le plus d'engagement ?",
      options: ["Les bannières statiques", "Les vidéos courtes de type Reels/TikTok", "Les longs articles textuels", "Les e-mails sans mise en forme"],
      correctAnswerIndex: 1,
    },
    {
      question: "Quel outil IA permet de générer des scripts de vente persuasifs ?",
      options: ["Midjourney", "ChatGPT", "CapCut", "Excel"],
      correctAnswerIndex: 1,
    },
    {
      question: "Quelle action principale définit la conversion ?",
      options: ["La visite de la page d'accueil", "L'accomplissement de l'action business souhaitée (achat, formulaire rempli)", "Le clic sur le logo", "La fermeture de l'onglet"],
      correctAnswerIndex: 1,
    },
    {
      question: "Comment teste-t-on l'efficacité de deux visuels publicitaires ?",
      options: ["Par des tests A/B en distribuant le budget équitablement", "En demandant l'avis de sa famille", "En lançant les deux sur un compte personnel", "En choisissant celui qui plaît le plus au graphiste"],
      correctAnswerIndex: 0,
    },
    {
      question: "Quelle est la principale source de trafic organique gratuite ?",
      options: ["La publicité Google Ads", "Le référencement naturel (SEO) et les réseaux sociaux", "L'achat de listes d'e-mails", "Les flyers imprimés"],
      correctAnswerIndex: 1,
    },
  ];
};

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
          {
            id: "mdp-v1",
            title: "1.1 Comprendre le comportement du consommateur moderne",
            duration: "10:30",
            watched: true,
            videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", // Default YouTube url
            transcription: "Bienvenue dans cette leçon. Aujourd'hui nous allons étudier la psychologie du client moderne. Le consommateur digital ne veut plus qu'on lui vende quelque chose, il veut acheter de lui-même grâce à la confiance et à l'éducation...",
            transcriptionEn: "Welcome to this lesson. Today we will study the psychology of the modern customer. The digital consumer no longer wants to be sold to; they want to buy on their own through trust and education...",
            quiz: generateDefaultQuiz("Marketing Digital"),
          },
          {
            id: "mdp-v2",
            title: "1.2 Définir sa proposition de valeur unique",
            duration: "15:10",
            watched: false,
            videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            transcription: "La proposition de valeur est le coeur de votre business. Sans offre claire et bénéfice immédiat, vos campagnes publicitaires ne feront que brûler du budget publicitaire sans conversion.",
            transcriptionEn: "The value proposition is the heart of your business. Without a clear offer and immediate benefit, your ad campaigns will only burn budget without conversions.",
            quiz: generateDefaultQuiz("Proposition de Valeur"),
          },
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
          {
            id: "cm-w1",
            title: "1.1 Écosystème local des réseaux sociaux",
            duration: "Lecture : 10 min",
            watched: true,
            content: "L'écosystème numérique en Afrique centrale, et particulièrement au Cameroun, connaît une dynamique unique caractérisée par la prédominance de Facebook pour les affaires...",
            quiz: generateDefaultQuiz("Community Management"),
          },
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
