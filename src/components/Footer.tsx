import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";
import SocialLinks from "./SocialLinks";

const Footer = () => {
  const [settings, setSettings] = useState({
    email: localStorage.getItem("gln_settings_email") || "contact@glndigital.com",
    whatsapp: localStorage.getItem("gln_settings_whatsapp") || "+237 692 062 677",
    address: localStorage.getItem("gln_settings_address") || "Douala, Cameroun",
    hoursWeek: localStorage.getItem("gln_settings_hours_week") || "Lun - Ven: 08:30 - 18:30",
    hoursSat: localStorage.getItem("gln_settings_hours_sat") || "Samedi: 09:00 - 14:00",
  });

  useEffect(() => {
    const handleStorageChange = () => {
      setSettings({
        email: localStorage.getItem("gln_settings_email") || "contact@glndigital.com",
        whatsapp: localStorage.getItem("gln_settings_whatsapp") || "+237 692 062 677",
        address: localStorage.getItem("gln_settings_address") || "Douala, Cameroun",
        hoursWeek: localStorage.getItem("gln_settings_hours_week") || "Lun - Ven: 08:30 - 18:30",
        hoursSat: localStorage.getItem("gln_settings_hours_sat") || "Samedi: 09:00 - 14:00",
      });
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const whatsappRaw = settings.whatsapp.replace(/[+\s-]/g, "");

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
              Votre entreprise mérite plus que des likes. Elle mérite des clients réels. Écosystème d'acquisition et de formation marketing digital.
            </p>
            <div className="pt-2">
              <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                {settings.address}
              </span>
            </div>
          </div>

          <div>
            <h4 className="font-heading font-semibold mb-4 text-foreground">Navigation</h4>
            <div className="flex flex-col gap-2">
              {[
                { label: "Accueil", path: "/" },
                { label: "À propos", path: "/a-propos" },
                { label: "Services", path: "/services" },
                { label: "Formations", path: "/formations" },
                { label: "Portfolio", path: "/portfolio" },
                { label: "Blog & Astuces", path: "/blog" },
                { label: "Devenir Partenaire", path: "/partenaires" },
              ].map((item) => (
                <Link key={item.path} to={item.path} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-heading font-semibold mb-4 text-foreground">Horaires & Contact</h4>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <p>{settings.hoursWeek}</p>
              <p>{settings.hoursSat}</p>
              <p className="pt-2">
                <span className="block text-foreground font-medium">Email pro:</span>
                <a href={`mailto:${settings.email}`} className="hover:text-primary transition-colors">{settings.email}</a>
              </p>
              <p>
                <span className="block text-foreground font-medium">WhatsApp direct:</span>
                <a href={`https://wa.me/${whatsappRaw}`} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors text-primary font-semibold">{settings.whatsapp}</a>
              </p>
            </div>
          </div>

          <div>
            <h4 className="font-heading font-semibold mb-4 text-foreground">Suivez notre croissance</h4>
            <SocialLinks />
            <p className="text-xs text-muted-foreground mt-6 leading-relaxed">
              Cabinet de formation agréé et agence d'accompagnement de croissance digitale pour PME & Grandes Entreprises.
            </p>
          </div>
        </div>

        <div className="border-t border-border mt-10 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} GLN DIGITAL. Tous droits réservés.</p>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <Link to="/cgu" className="hover:text-primary transition-colors">CGU</Link>
            <Link to="/confidentialite" className="hover:text-primary transition-colors">Confidentialité</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
