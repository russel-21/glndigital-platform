import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, Phone, Mail, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import SocialLinks from "@/components/SocialLinks";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";

const Contact = () => {
  const { toast } = useToast();
  const { language } = useLanguage();
  const [form, setForm] = useState({ name: "", company: "", phone: "", goal: "", message: "" });

  useEffect(() => {
    const loadProfile = async () => {
      const mockAdmin = localStorage.getItem("gln_mock_admin_session") === "true";
      const mockUser = localStorage.getItem("gln_mock_user_logged_in") === "true";

      if (mockAdmin) {
        setForm((prev) => ({
          ...prev,
          name: "Super Admin",
          phone: "+237 000 000 000"
        }));
        return;
      }

      if (mockUser) {
        const activeMock = localStorage.getItem("gln_active_mock_profile");
        if (activeMock) {
          try {
            const parsed = JSON.parse(activeMock);
            setForm((prev) => ({
              ...prev,
              name: parsed.full_name || "",
              phone: parsed.phone || "",
              company: parsed.company_name && !parsed.company_name.startsWith("{") ? parsed.company_name : ""
            }));
          } catch {}
        }
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .single();
          if (profile) {
            setForm((prev) => ({
              ...prev,
              name: profile.full_name || "",
              phone: profile.phone || "",
              company: profile.company_name && !profile.company_name.startsWith("{") ? profile.company_name : ""
            }));
          }
        }
      } catch (err) {
        console.warn("Could not load user profile for pre-filling contact form:", err);
      }
    };

    loadProfile();
  }, []);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const messageGreeting = language === "fr" ? "Bonjour GLN DIGITAL!" : "Hello GLN DIGITAL!";
    const labelName = language === "fr" ? "Nom" : "Name";
    const labelCompany = language === "fr" ? "Entreprise" : "Company";
    const labelPhone = language === "fr" ? "Téléphone" : "Phone";
    const labelGoal = language === "fr" ? "Objectif" : "Goal";
    const labelMessage = language === "fr" ? "Message" : "Message";

    const text = encodeURIComponent(
      `${messageGreeting}\n\n${labelName}: ${form.name}\n${labelCompany}: ${form.company}\n${labelPhone}: ${form.phone}\n${labelGoal}: ${form.goal}\n\n${labelMessage}:\n${form.message}`
    );
    window.open(`https://wa.me/237692062677?text=${text}`, "_blank");
    toast({
      title: language === "fr" ? "Message envoyé !" : "Message sent!",
      description: language === "fr" ? "Nous vous répondrons dans les plus brefs délais." : "We will respond as soon as possible."
    });
  };

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4 md:px-8">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="bg-primary/10 text-primary text-xs font-semibold px-4 py-1.5 rounded-full border border-primary/20">
            Contact
          </span>
          <h1 className="font-heading text-4xl md:text-5xl font-bold mt-6 mb-4">
            {language === "fr" ? (
              <>Parlons de votre <span className="text-gradient-primary">projet</span></>
            ) : (
              <>Let's talk about your <span className="text-gradient-primary">project</span></>
            )}
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {language === "fr"
              ? "Expliquez‑nous votre activité et vos objectifs. Nous vous proposerons une stratégie adaptée."
              : "Tell us about your business and goals. We will propose an adapted strategy."}
          </p>
        </motion.div>

        <div className="grid md:grid-cols-5 gap-10 max-w-5xl mx-auto">
          {/* Info */}
          <motion.div
            className="md:col-span-2 space-y-6"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">WhatsApp</p>
                  <a href="https://wa.me/237692062677" className="font-medium text-foreground hover:text-primary transition-colors">
                    +237 692 062 677
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <a href="mailto:glndigital0@gmail.com" className="font-medium text-foreground hover:text-primary transition-colors">
                    glndigital0@gmail.com
                  </a>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6">
              <h3 className="font-heading font-semibold mb-4 text-foreground">
                {language === "fr" ? "Réseaux sociaux" : "Social networks"}
              </h3>
              <SocialLinks />
            </div>
          </motion.div>

          {/* Form */}
          <motion.form
            onSubmit={handleSubmit}
            className="md:col-span-3 bg-card border border-border rounded-2xl p-6 md:p-8 space-y-5"
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">
                  {language === "fr" ? "Nom *" : "Name *"}
                </label>
                <input
                  required
                  maxLength={100}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">
                  {language === "fr" ? "Nom de l'entreprise (facultatif)" : "Company name (optional)"}
                </label>
                <input
                  maxLength={100}
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">
                  {language === "fr" ? "Téléphone" : "Phone"}
                </label>
                <input
                  type="tel"
                  maxLength={20}
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">
                  {language === "fr" ? "Objectif principal" : "Main goal"}
                </label>
                <input
                  maxLength={200}
                  value={form.goal}
                  onChange={(e) => setForm({ ...form, goal: e.target.value })}
                  className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">
                {language === "fr" ? "Message *" : "Message *"}
              </label>
              <textarea
                required
                maxLength={1000}
                rows={4}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-gradient-primary text-primary-foreground py-3 rounded-lg font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-glow"
            >
              {language === "fr" ? "Demander mon audit gratuit" : "Request my free audit"} <Send className="w-4 h-4" />
            </button>
          </motion.form>
        </div>
      </div>
    </div>
  );
};

export default Contact;
