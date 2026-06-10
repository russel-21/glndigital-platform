import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";
import SocialLinks from "./SocialLinks";
import { useLanguage } from "@/hooks/useLanguage";

const Footer = () => {
  const { language } = useLanguage();
  const [settings, setSettings] = useState({
    email: localStorage.getItem("gln_settings_email") || "contact@glndigital.com",
    whatsapp: localStorage.getItem("gln_settings_whatsapp") || "+237 692 062 677",
    address: localStorage.getItem("gln_settings_address") || "Douala, Cameroun",
    availability: localStorage.getItem("gln_settings_availability") || "Disponible 24h/24 et 7j/7",
  });

  useEffect(() => {
    const handleStorageChange = () => {
      setSettings({
        email: localStorage.getItem("gln_settings_email") || "contact@glndigital.com",
        whatsapp: localStorage.getItem("gln_settings_whatsapp") || "+237 692 062 677",
        address: localStorage.getItem("gln_settings_address") || "Douala, Cameroun",
        availability: localStorage.getItem("gln_settings_availability") || "Disponible 24h/24 et 7j/7",
      });
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const whatsappRaw = settings.whatsapp.replace(/[+\s-]/g, "");

  const translations = {
    fr: {
      desc: "Votre entreprise mérite plus que des likes. Elle mérite des clients réels. Écosystème d'acquisition et de formation marketing digital.",
      navTitle: "Navigation",
      contactTitle: "Contact",
      emailLabel: "Email pro :",
      whatsappLabel: "WhatsApp direct :",
      availabilityLabel: "Disponibilite :",
      followTitle: "Suivez notre croissance",
      followDesc: "Cabinet de formation agréé et agence d'accompagnement de croissance digitale pour PME & Grandes Entreprises.",
      rights: "Tous droits réservés.",
      privacy: "Confidentialité",
      navHome: "Accueil",
      navAbout: "À propos",
      navServices: "Services",
      navCourses: "Formations",
      navPortfolio: "Portfolio",
      navBlog: "Blog & Astuces",
      navPartner: "Devenir Partenaire",
    },
    en: {
      desc: "Your business deserves more than likes. It deserves real clients. Digital marketing acquisition and training ecosystem.",
      navTitle: "Navigation",
      contactTitle: "Contact",
      emailLabel: "Pro Email:",
      whatsappLabel: "Direct WhatsApp:",
      availabilityLabel: "Availability:",
      followTitle: "Follow our growth",
      followDesc: "Certified training cabinet and digital growth support agency for SMBs & Large Enterprises.",
      rights: "All rights reserved.",
      privacy: "Privacy Policy",
      navHome: "Home",
      navAbout: "About",
      navServices: "Services",
      navCourses: "Courses",
      navPortfolio: "Portfolio",
      navBlog: "Blog & Tips",
      navPartner: "Become Partner",
    }
  };

  const t = language === "fr" ? translations.fr : translations.en;

  return (
    <footer className="border-t border-border bg-card">
      <div className="container mx-auto px-4 md:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <img src={logo} alt="GLN Digital logo" className="h-10 w-auto" />
              <h3 className="font-heading text-xl font-bold">
                <span className="text-gradient-primary">GLN</span> DIGITAL
              </h3>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
              {t.desc}
            </p>
            <div className="pt-2">
              <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                {language === "fr" ? settings.address : (settings.address === "Douala, Cameroun" ? "Douala, Cameroon" : settings.address)}
              </span>
            </div>
          </div>

          <div>
            <h4 className="font-heading font-semibold mb-4 text-foreground">{t.navTitle}</h4>
            <div className="flex flex-col gap-2">
              {[
                { label: t.navHome, path: "/" },
                { label: t.navAbout, path: "/a-propos" },
                { label: t.navServices, path: "/services" },
                { label: t.navCourses, path: "/formations" },
                { label: t.navPortfolio, path: "/portfolio" },
                { label: t.navBlog, path: "/blog" },
                { label: t.navPartner, path: "/partenaires" },
              ].map((item) => (
                <Link key={item.path} to={item.path} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-heading font-semibold mb-4 text-foreground">{t.contactTitle}</h4>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <p className="pt-1">
                <span className="block text-foreground font-medium">{t.emailLabel}</span>
                <a href={`mailto:${settings.email}`} className="hover:text-primary transition-colors">{settings.email}</a>
              </p>
              <p>
                <span className="block text-foreground font-medium">{t.whatsappLabel}</span>
                <a href={`https://wa.me/${whatsappRaw}`} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors text-primary font-semibold">{settings.whatsapp}</a>
              </p>
              <p>
                <span className="block text-foreground font-medium">{t.availabilityLabel}</span>
                <span>{settings.availability}</span>
              </p>
            </div>
          </div>

          <div>
            <h4 className="font-heading font-semibold mb-4 text-foreground">{t.followTitle}</h4>
            <SocialLinks />
            <p className="text-xs text-muted-foreground mt-6 leading-relaxed">
              {t.followDesc}
            </p>
          </div>
        </div>

        <div className="border-t border-border mt-10 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} GLN DIGITAL. {t.rights}</p>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <Link to="/cgu" className="hover:text-primary transition-colors">CGU</Link>
            <Link to="/confidentialite" className="hover:text-primary transition-colors">{t.privacy}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
