import React, { createContext, useContext, useState, useEffect } from "react";

type Language = "fr" | "en";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  fr: {
    // Navbar & Common
    "nav.home": "Accueil",
    "nav.about": "À propos",
    "nav.services": "Services",
    "nav.courses": "Formations",
    "nav.partnerships": "Partenariats",
    "nav.portfolio": "Portefeuille",
    "nav.blog": "Blog",
    "nav.login": "Se connecter / S'inscrire",
    "nav.cta": "Audit gratuit",
    "nav.dashboard": "Mon Tableau de bord",
    "nav.switch_student": "Basculer vers l'Espace Élève",
    "nav.switch_partner": "Basculer vers Espace Partenaire",
    "nav.join_partner": "Devenir Partenaire / Closer",
    "nav.join_student": "Rejoindre l'Académie",
    "nav.logout": "Se déconnecter",
    "nav.connected_as": "Connecté :",

    // Hero
    "hero.badge": "L'ÉLITE DU COPYWRITING & DE L'ACQUISITION CLIENT",
    "hero.title_part1": "Propulsez vos ventes avec",
    "hero.title_part2": "une acquisition digitale d'élite",
    "hero.description": "Nous combinons copywriting persuasif, tunnels de vente avancés et campagnes de publicité chirurgicales pour multiplier votre chiffre d'affaires à Douala, au Cameroun et à l'international.",
    "hero.cta_audit": "Obtenir mon audit gratuit",
    "hero.cta_courses": "Découvrir nos formations",

    // Trust
    "trust.title": "Ils nous font confiance pour leur croissance",

    // Stats
    "stats.projects": "Projets Livrés",
    "stats.students": "Élèves Formés",
    "stats.revenue": "Chiffre d'Affaires Généré",
    "stats.satisfaction": "Satisfaction Client",

    // Services Page
    "services.title": "Nos Services d'Acquisition Client",
    "services.subtitle": "Des solutions sur-mesure pour transformer vos visiteurs en clients fidèles.",
    "services.problem": "Le Problème :",
    "services.solution": "Notre Solution :",
    "services.benefit": "Bénéfice Clé :",
    "services.cta": "Discuter de mon projet sur WhatsApp",

    // Auth
    "auth.title_login": "Se connecter",
    "auth.title_signup": "Créer un compte GLN",
    "auth.desc_login": "Accédez à votre espace sécurisé",
    "auth.desc_signup": "Rejoignez l'académie ou le réseau de partenaires",
    "auth.google_btn": "Continuer avec Google",
    "auth.or_email": "Ou utiliser l'e-mail",
    "auth.fullname_label": "Nom complet (pour vos certificats)",
    "auth.phone_label": "Téléphone avec code pays (Ex: +237 692062677)",
    "auth.company_label": "Nom de l'entreprise (Factures & Prestations)",
    "auth.role_label": "Votre Rôle principal",
    "auth.role_student": "Élève / Étudiant (Accès cours)",
    "auth.role_partner": "Partenaire / Closer (Réseau commercial)",
    "auth.email_label": "Adresse E-mail",
    "auth.password_label": "Mot de passe",
    "auth.trust_device": "Faire confiance à cet appareil (Rester connecté)",
    "auth.signup_btn": "Créer mon compte",
    "auth.signin_btn": "Se connecter",
    "auth.has_account": "Déjà un compte ? Connectez-vous",
    "auth.no_account": "Pas encore de compte ? Créez-en un",
  },
  en: {
    // Navbar & Common
    "nav.home": "Home",
    "nav.about": "About",
    "nav.services": "Services",
    "nav.courses": "Courses",
    "nav.partnerships": "Partnerships",
    "nav.portfolio": "Portfolio",
    "nav.blog": "Blog",
    "nav.login": "Login / Sign Up",
    "nav.cta": "Free Audit",
    "nav.dashboard": "My Dashboard",
    "nav.switch_student": "Switch to Student Space",
    "nav.switch_partner": "Switch to Partner Space",
    "nav.join_partner": "Become Partner / Closer",
    "nav.join_student": "Join the Academy",
    "nav.logout": "Log Out",
    "nav.connected_as": "Connected:",

    // Hero
    "hero.badge": "THE ELITE OF COPYWRITING & CUSTOMER ACQUISITION",
    "hero.title_part1": "Boost your sales with",
    "hero.title_part2": "elite digital acquisition",
    "hero.description": "We combine persuasive copywriting, advanced sales funnels, and surgical ad campaigns to multiply your revenue in Douala, Cameroon, and worldwide.",
    "hero.cta_audit": "Get my free audit",
    "hero.cta_courses": "Explore our courses",

    // Trust
    "trust.title": "They trust us with their growth",

    // Stats
    "stats.projects": "Projects Delivered",
    "stats.students": "Students Trained",
    "stats.revenue": "Revenue Generated",
    "stats.satisfaction": "Client Satisfaction",

    // Services Page
    "services.title": "Our Customer Acquisition Services",
    "services.subtitle": "Tailored solutions to turn your visitors into loyal clients.",
    "services.problem": "The Problem:",
    "services.solution": "Our Solution:",
    "services.benefit": "Key Benefit:",
    "services.cta": "Discuss my project on WhatsApp",

    // Auth
    "auth.title_login": "Log In",
    "auth.title_signup": "Create a GLN Account",
    "auth.desc_login": "Access your secure space",
    "auth.desc_signup": "Join the academy or the partner network",
    "auth.google_btn": "Continue with Google",
    "auth.or_email": "Or use email",
    "auth.fullname_label": "Full name (for your certificates)",
    "auth.phone_label": "Phone with country code (Ex: +237 692062677)",
    "auth.company_label": "Company name (Invoices & Services)",
    "auth.role_label": "Your main Role",
    "auth.role_student": "Student (Course Access)",
    "auth.role_partner": "Partner / Closer (Sales Network)",
    "auth.email_label": "Email Address",
    "auth.password_label": "Password",
    "auth.trust_device": "Trust this device (Keep me logged in)",
    "auth.signup_btn": "Create my account",
    "auth.signin_btn": "Log In",
    "auth.has_account": "Already have an account? Log in",
    "auth.no_account": "Don't have an account? Create one",
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>("fr");

  useEffect(() => {
    // 1. Check local storage preference
    const savedLang = localStorage.getItem("gln_pref_lang") as Language;
    if (savedLang === "fr" || savedLang === "en") {
      setLanguageState(savedLang);
    } else {
      // 2. Fallback to browser language
      const browserLang = navigator.language || (navigator as any).userLanguage || "fr";
      const detected = browserLang.toLowerCase().startsWith("en") ? "en" : "fr";
      setLanguageState(detected);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("gln_pref_lang", lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || translations["fr"][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
