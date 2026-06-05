export interface QuizQuestion {
  question: string;
  questionEn?: string;
  options: string[];
  optionsEn?: string[];
  correctAnswerIndex: number;
}

export interface Lesson {
  id: string;
  title: string;
  titleEn?: string;
  duration: string;
  durationEn?: string;
  watched: boolean;
  content?: string; // For written/text lessons
  contentEn?: string;
  videoUrl?: string; // For video lessons (e.g. YouTube URL)
  transcription?: string; // French transcript
  transcriptionEn?: string; // English transcript
  quiz?: QuizQuestion[]; // 10 questions quiz
}

export interface CourseModule {
  title: string;
  titleEn?: string;
  unlocked: boolean;
  videos: Lesson[];
}

export interface Course {
  id: string;
  title: string;
  titleEn?: string;
  duration: string;
  durationEn?: string;
  difficulty: string;
  difficultyEn?: string;
  desc: string;
  descEn?: string;
  price: string;
  priceEn?: string;
  type: "video" | "written";
  features: string[];
  featuresEn?: string[];
  audience: string[];
  audienceEn?: string[];
  skills: string[];
  skillsEn?: string[];
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
  const topicEn = topic === "Marketing Digital" ? "Digital Marketing" 
                : topic === "Proposition de Valeur" ? "Value Proposition" 
                : topic;
  return [
    {
      question: `Quelle est la règle d'or en ${topic} ?`,
      questionEn: `What is the golden rule in ${topicEn}?`,
      options: ["Parler uniquement de son produit", "Comprendre et cibler le besoin du client", "Faire les publicités les plus chères", "Attendre que les clients viennent d'eux-mêmes"],
      optionsEn: ["Speak only about your product", "Understand and target the customer's need", "Make the most expensive ads", "Wait for customers to come by themselves"],
      correctAnswerIndex: 1,
    },
    {
      question: `Quel indicateur mesure directement la rentabilité en ${topic} ?`,
      questionEn: `Which indicator directly measures profitability in ${topicEn}?`,
      options: ["Le nombre de J'aime", "Le ROAS (Retour sur dépenses publicitaires)", "Le taux de clics (CTR)", "Le nombre de partages"],
      optionsEn: ["Number of Likes", "ROAS (Return on Ad Spend)", "Click-Through Rate (CTR)", "Number of shares"],
      correctAnswerIndex: 1,
    },
    {
      question: "Que signifie le pixel de suivi ou API de conversion ?",
      questionEn: "What does the tracking pixel or conversion API mean?",
      options: ["Un outil de design d'images", "Un script pour suivre les actions des visiteurs sur le site", "Un moyen de bloquer les publicités des concurrents", "Un logiciel de facturation"],
      optionsEn: ["An image design tool", "A script to track visitor actions on the website", "A way to block competitors' ads", "A billing software"],
      correctAnswerIndex: 1,
    },
    {
      question: "Pour rédiger une offre irrésistible, que doit-on mettre en avant ?",
      questionEn: "To write an irresistible offer, what should be highlighted?",
      options: ["La liste technique des fonctionnalités", "La transformation et les bénéfices pour le client", "Le logo de l'entreprise en grand", "Le fait que vous soyez le meilleur"],
      optionsEn: ["The technical list of features", "The transformation and benefits for the customer", "The company logo in large format", "The fact that you are the best"],
      correctAnswerIndex: 1,
    },
    {
      question: "Qu'est-ce que le 'Retargeting' (reciblage) ?",
      questionEn: "What is 'Retargeting'?",
      options: ["Changer de pays cible pour ses ventes", "Diffuser des publicités aux personnes ayant déjà interagi avec la marque", "Supprimer les anciennes publicités", "Trouver de nouveaux mots-clés"],
      optionsEn: ["Change target country for sales", "Deliver ads to people who have already interacted with the brand", "Delete old advertisements", "Find new keywords"],
      correctAnswerIndex: 1,
    },
    {
      question: "Quel format publicitaire mobile génère actuellement le plus d'engagement ?",
      questionEn: "Which mobile ad format currently generates the most engagement?",
      options: ["Les bannières statiques", "Les vidéos courtes de type Reels/TikTok", "Les longs articles textuels", "Les e-mails sans mise en forme"],
      optionsEn: ["Static banners", "Short videos like Reels/TikTok", "Long text articles", "Unformatted emails"],
      correctAnswerIndex: 1,
    },
    {
      question: "Quel outil IA permet de générer des scripts de vente persuasifs ?",
      questionEn: "Which AI tool allows you to generate persuasive sales scripts?",
      options: ["Midjourney", "ChatGPT", "CapCut", "Excel"],
      optionsEn: ["Midjourney", "ChatGPT", "CapCut", "Excel"],
      correctAnswerIndex: 1,
    },
    {
      question: "Quelle action principale définit la conversion ?",
      questionEn: "What main action defines conversion?",
      options: ["La visite de la page d'accueil", "L'accomplissement de l'action business souhaitée (achat, formulaire rempli)", "Le clic sur le logo", "La fermeture de l'onglet"],
      optionsEn: ["Home page visit", "Completion of the desired business action (purchase, filled form)", "Clicking on the logo", "Closing the tab"],
      correctAnswerIndex: 1,
    },
    {
      question: "Comment teste-t-on l'efficacité de deux visuels publicitaires ?",
      questionEn: "How do you test the effectiveness of two ad visuals?",
      options: ["Par des tests A/B en distribuant le budget équitablement", "En demandant l'avis de sa famille", "En lançant les deux sur un compte personnel", "En choisissant celui qui plaît le plus au graphiste"],
      optionsEn: ["Through A/B testing by distributing the budget equally", "By asking one's family for advice", "By launching both on a personal account", "By choosing the one the graphic designer likes best"],
      correctAnswerIndex: 0,
    },
    {
      question: "Quelle est la principale source de trafic organique gratuite ?",
      questionEn: "What is the main source of free organic traffic?",
      options: ["La publicité Google Ads", "Le référencement naturel (SEO) et les réseaux sociaux", "L'achat de listes d'e-mails", "Les flyers imprimés"],
      optionsEn: ["Google Ads advertising", "Natural search engine optimization (SEO) and social networks", "Buying email lists", "Printed flyers"],
      correctAnswerIndex: 1,
    },
  ];
};

export const defaultCourses: Course[] = [
  {
    id: "marketing-digital-pro",
    title: "Marketing Digital Professionnel",
    titleEn: "Professional Digital Marketing",
    duration: "6 semaines",
    durationEn: "6 weeks",
    difficulty: "Tous niveaux",
    difficultyEn: "All levels",
    price: "Sur devis",
    priceEn: "On quote",
    desc: "Acquérez les compétences indispensables pour piloter des stratégies d'acquisition clients rentables. Une formation pratique combinant cours en ligne, coaching individuel et cas pratiques réels sur le marché d'Afrique Centrale.",
    descEn: "Acquire the essential skills to drive profitable client acquisition strategies. A practical training combining online courses, 1-on-1 coaching, and real case studies in the Central African market.",
    type: "video",
    features: [
      "Création de tunnels d'acquisition",
      "Lancement de campagnes Facebook & Instagram Ads",
      "Tracking des conversions & pixels",
      "Reporting & Optimisation de budget",
    ],
    featuresEn: [
      "Creation of acquisition funnels",
      "Launching Facebook & Instagram Ads campaigns",
      "Conversion tracking & pixels",
      "Reporting & Budget optimization",
    ],
    audience: [
      "Entrepreneurs et fondateurs de PME voulant automatiser leurs ventes",
      "Responsables marketing cherchant à se moderniser",
      "Étudiants en quête de compétences recherchées sur le marché de l'emploi",
    ],
    audienceEn: [
      "Entrepreneurs and SMB founders wanting to automate their sales",
      "Marketing managers looking to modernize",
      "Students looking for highly sought-after skills in the job market",
    ],
    skills: [
      "Définition de personas et parcours d'achat",
      "Mise en place de pixels de tracking (Meta Pixel, Google Analytics)",
      "Lancement de campagnes publicitaires Facebook & Instagram Ads",
      "Écriture de textes persuasifs (Copywriting)",
      "Optimisation du Return on Ad Spend (ROAS)",
    ],
    skillsEn: [
      "Defining personas and buying journeys",
      "Setting up tracking pixels (Meta Pixel, Google Analytics)",
      "Launching Facebook & Instagram Ads campaigns",
      "Writing persuasive copy (Copywriting)",
      "Optimizing Return on Ad Spend (ROAS)",
    ],
    modules: [
      {
        title: "Module 1 : Les Fondations du Marketing Digital",
        titleEn: "Module 1: Foundations of Digital Marketing",
        unlocked: true,
        videos: [
          {
            id: "mdp-v1",
            title: "1.1 Comprendre le comportement du consommateur moderne",
            titleEn: "1.1 Understanding Modern Consumer Behavior",
            duration: "10:30",
            durationEn: "10:30",
            watched: true,
            videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            transcription: "Bienvenue dans cette leçon. Aujourd'hui nous allons étudier la psychologie du client moderne. Le consommateur digital ne veut plus qu'on lui vende quelque chose, il veut acheter de lui-même grâce à la confiance et à l'éducation...",
            transcriptionEn: "Welcome to this lesson. Today we will study the psychology of the modern customer. The digital consumer no longer wants to be sold to; they want to buy on their own through trust and education...",
            quiz: generateDefaultQuiz("Marketing Digital"),
          },
          {
            id: "mdp-v2",
            title: "1.2 Définir sa proposition de valeur unique",
            titleEn: "1.2 Defining Your Unique Value Proposition",
            duration: "15:10",
            durationEn: "15:10",
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
    id: "social-media-manager",
    title: "Social Media Manager",
    titleEn: "Social Media Manager",
    duration: "8 semaines",
    durationEn: "8 weeks",
    difficulty: "Intermédiaire à Avancé",
    difficultyEn: "Intermediate to Advanced",
    price: "Sur devis",
    priceEn: "On quote",
    desc: "Devenez un Social Media Manager d'élite. Apprenez à concevoir des stratégies éditoriales complexes, à piloter la production de contenu vidéo, et à analyser l'impact business sur Instagram, Snap, Facebook et TikTok.",
    descEn: "Become an elite Social Media Manager. Learn to design complex editorial strategies, drive short-form video production, and analyze business impact on Instagram, Snap, Facebook, and TikTok.",
    type: "video",
    features: [
      "Stratégie de contenu multicanale",
      "Production vidéo short-form (Reels/TikTok/Shorts)",
      "Analyse de metrics d'engagement et ROI",
      "Gestion d'équipe créative",
    ],
    featuresEn: [
      "Multi-channel content strategy",
      "Short-form video production (Reels/TikTok/Shorts)",
      "Analysis of engagement metrics and ROI",
      "Creative team management",
    ],
    audience: [
      "Community Managers souhaitant monter en compétences",
      "Consultants indépendants et créateurs de contenu",
      "Responsables de marque"
    ],
    audienceEn: [
      "Community Managers wishing to upgrade their skills",
      "Freelance consultants and content creators",
      "Brand managers"
    ],
    skills: [
      "Création de chartes éditoriales avancées",
      "Scénarisation et production vidéo short-form",
      "Interprétation de dashboards statistiques",
      "Stratégie de personal branding"
    ],
    skillsEn: [
      "Creating advanced editorial guidelines",
      "Scripting and producing short-form video",
      "Interpreting statistical dashboards",
      "Personal branding strategy"
    ],
    modules: [
      {
        title: "Module 1 : Stratégie de Marque sur les Réseaux Sociaux",
        titleEn: "Module 1: Brand Strategy on Social Media",
        unlocked: true,
        videos: [
          {
            id: "smm-v1",
            title: "1.1 Auditer et structurer une présence de marque",
            titleEn: "1.1 Auditing and Structuring a Brand Presence",
            duration: "12:45",
            durationEn: "12:45",
            watched: true,
            videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            transcription: "Auditer sa marque est la première étape d'une présence d'élite. Nous allons analyser la bio, le feed, et identifier les failles du tunnel d'acquisition organique...",
            transcriptionEn: "Auditing your brand is the first step to an elite presence. We will analyze the bio, feed, and identify flaws in the organic acquisition funnel...",
            quiz: generateDefaultQuiz("Social Media Management")
          }
        ]
      }
    ]
  },
  {
    id: "community-management",
    title: "Community Management & Croissance",
    titleEn: "Community Management & Growth",
    duration: "4 semaines",
    durationEn: "4 weeks",
    difficulty: "Débutant à Intermédiaire",
    difficultyEn: "Beginner to Intermediate",
    price: "Sur devis",
    priceEn: "On quote",
    desc: "Apprenez à gérer, animer et faire grandir des communautés sur Facebook, Instagram et TikTok pour des entreprises locales.",
    descEn: "Learn to manage, moderate, and grow communities on Facebook, Instagram, and TikTok for local businesses.",
    type: "written",
    features: [
      "Création de calendriers éditoriaux",
      "Maîtrise de Canva pour les designs professionnels",
      "Copywriting et rédactions accrocheuses",
      "Gestion de la modération client",
    ],
    featuresEn: [
      "Creation of editorial calendars",
      "Mastering Canva for professional designs",
      "Copywriting and catchy headlines",
      "Customer moderation management",
    ],
    audience: [
      "Futurs community managers cherchant à se lancer en freelance",
      "Propriétaires de commerces souhaitant développer leur visibilité locale",
      "Chargés de communication en reconversion",
    ],
    audienceEn: [
      "Future community managers looking to launch as freelancers",
      "Business owners wanting to develop their local visibility",
      "Communication officers in career transition",
    ],
    skills: [
      "Création de chartes éditoriales et calendriers de posts",
      "Conception graphique rapide sur Canva Pro",
      "Techniques d'animation de communautés Facebook & Instagram",
      "Gestion de la modération de messagerie et de commentaires",
    ],
    skillsEn: [
      "Creating editorial guidelines and post calendars",
      "Quick graphic design on Canva Pro",
      "Techniques to engage Facebook & Instagram communities",
      "Managing message and comment moderation",
    ],
    modules: [
      {
        title: "Module 1 : Rôle du Community Manager au Cameroun",
        titleEn: "Module 1: Role of Community Manager in Cameroon",
        unlocked: true,
        videos: [
          {
            id: "cm-w1",
            title: "1.1 Écosystème local des réseaux sociaux",
            titleEn: "1.1 Local Social Media Ecosystem",
            duration: "Lecture : 10 min",
            durationEn: "Reading: 10 min",
            watched: true,
            content: "L'écosystème numérique en Afrique centrale, et particulièrement au Cameroun, connaît une dynamique unique caractérisée par la prédominance de Facebook pour les affaires...",
            contentEn: "The digital ecosystem in Central Africa, and particularly in Cameroon, experiences a unique dynamic characterized by the predominance of Facebook for business...",
            quiz: generateDefaultQuiz("Community Management"),
          },
        ],
      },
    ],
  }
];

export const getCourses = (): Course[] => {
  const data = localStorage.getItem("gln_courses_db");
  let courses: Course[] = [];
  try {
    courses = data ? JSON.parse(data) : [...defaultCourses];
  } catch {
    courses = [...defaultCourses];
  }

  // Force sync English properties if they are missing or if new default courses need to be injected
  let needsSave = false;
  
  if (!courses.some((c: any) => c.id === "social-media-manager")) {
    courses = [...defaultCourses];
    needsSave = true;
  } else {
    courses = courses.map(c => {
      const defaultCourse = defaultCourses.find(dc => dc.id === c.id);
      if (defaultCourse) {
        if (!c.titleEn || !c.descEn || !c.featuresEn || !c.durationEn) {
          needsSave = true;
          return {
            ...c,
            titleEn: defaultCourse.titleEn,
            descEn: defaultCourse.descEn,
            durationEn: defaultCourse.durationEn,
            difficultyEn: defaultCourse.difficultyEn,
            priceEn: defaultCourse.priceEn,
            featuresEn: defaultCourse.featuresEn,
            audienceEn: defaultCourse.audienceEn,
            skillsEn: defaultCourse.skillsEn,
            modules: c.modules.map(mod => {
              const defMod = defaultCourse.modules.find(dm => dm.title === mod.title || dm.titleEn === mod.titleEn);
              if (defMod) {
                return {
                  ...mod,
                  titleEn: defMod.titleEn,
                  videos: mod.videos.map(vid => {
                    const defVid = defMod.videos.find(dv => dv.id === vid.id);
                    if (defVid) {
                      return {
                        ...vid,
                        titleEn: defVid.titleEn,
                        durationEn: defVid.durationEn,
                        contentEn: defVid.contentEn,
                        transcriptionEn: defVid.transcriptionEn
                      };
                    }
                    return vid;
                  })
                };
              }
              return mod;
            })
          };
        }
      }
      return c;
    });
  }

  if (needsSave || !data) {
    localStorage.setItem("gln_courses_db", JSON.stringify(courses));
  }
  return courses;
};

export const saveCourses = (courses: Course[]) => {
  localStorage.setItem("gln_courses_db", JSON.stringify(courses));
};
