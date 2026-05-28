import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Phone, Building, User, Save, LogOut } from "lucide-react";
import { toast } from "sonner";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sessionUser, setSessionUser] = useState<any>(null);

  // Form profile completion fields
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [role, setRole] = useState<"student" | "partner">("student");
  const [needsCompletion, setNeedsCompletion] = useState(false);

  useEffect(() => {
    // Listen for auth state changes
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        setSessionUser(session.user);
        // Check if profile exists
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();

        if (error || !profile || !profile.full_name || !profile.phone) {
          // Profile needs information completion
          setFullName(session.user.user_metadata?.full_name || "");
          setPhone(session.user.user_metadata?.phone || "");
          setCompanyName(session.user.user_metadata?.company_name || "");
          setNeedsCompletion(true);
          setLoading(false);
        } else {
          // Profile is complete, redirect according to role
          if (profile.role === "partner") {
            navigate("/partenaires-dashboard");
          } else {
            navigate("/eleve-dashboard");
          }
        }
      } else {
        setLoading(false);
        navigate("/auth");
      }
    });
  }, [navigate]);

  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!/^\+?[0-9\s-]{8,20}$/.test(phone)) {
      toast.error("Format de numéro de téléphone invalide.");
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.from("profiles").upsert({
        id: sessionUser.id,
        email: sessionUser.email,
        full_name: fullName,
        phone: phone,
        company_name: companyName,
        role: role,
      });

      if (error) throw error;
      toast.success("Profil complété avec succès !");

      if (role === "partner") {
        navigate("/partenaires-dashboard");
      } else {
        navigate("/eleve-dashboard");
      }
    } catch (e) {
      toast.error((e as Error).message);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-muted-foreground">Vérification de votre compte...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 flex items-center justify-center bg-background">
      {needsCompletion && (
        <motion.div
          className="w-full max-w-md p-8 rounded-3xl bg-card border border-border/60 shadow-glow"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="text-center mb-8">
            <h1 className="font-heading text-2xl font-extrabold text-foreground">Complétez votre profil</h1>
            <p className="text-xs text-muted-foreground mt-2">
              Quelques détails sont requis pour la facturation et l'édition de vos certificats de formation.
            </p>
          </div>

          <form onSubmit={handleCompleteProfile} className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 block">Nom complet (Certificats)</label>
              <div className="relative">
                <User className="absolute left-3.5 top-3 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-secondary border border-border rounded-xl pl-10 pr-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                  placeholder="Jean Dupont"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 block">Téléphone (Format mondial)</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-3 w-4 h-4 text-muted-foreground" />
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-secondary border border-border rounded-xl pl-10 pr-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                  placeholder="+237 692 062 677"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 block">Nom de l'entreprise (Factures & Devis)</label>
              <div className="relative">
                <Building className="absolute left-3.5 top-3 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full bg-secondary border border-border rounded-xl pl-10 pr-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                  placeholder="GLN Digital Sarl"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 block">Votre Rôle principal</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as "student" | "partner")}
                className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
              >
                <option value="student">Élève / Étudiant (Accès cours)</option>
                <option value="partner">Partenaire / Closer (Réseau commercial)</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-glow"
            >
              <Save className="w-4 h-4" />
              Enregistrer mon profil
            </button>
          </form>
        </motion.div>
      )}
    </div>
  );
};

export default AuthCallback;
