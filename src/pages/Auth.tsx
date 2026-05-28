import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Mail, Lock, Phone, Building, User, LogIn, UserPlus, Chrome } from "lucide-react";
import { toast } from "sonner";

const Auth = () => {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form Fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [userRole, setUserRole] = useState<"student" | "partner">("student");

  // Check if user is already logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        redirectUser(session.user.id);
      }
    });
  }, []);

  const redirectUser = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();

      if (error || !data) {
        // Default redirect if profile record is not yet generated
        navigate("/eleve-dashboard");
        return;
      }

      if (data.role === "partner") {
        navigate("/partenaires-dashboard");
      } else {
        navigate("/eleve-dashboard");
      }
    } catch {
      navigate("/eleve-dashboard");
    }
  };

  // Google Sign-In
  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth-callback`,
        },
      });
      if (error) throw error;
    } catch (e) {
      toast.error((e as Error).message);
      setLoading(false);
    }
  };

  // Email Sign-In & Sign-Up
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validations
    if (phone && !/^\+?[0-9\s-]{8,20}$/.test(phone)) {
      toast.error("Format de numéro de téléphone invalide.");
      return;
    }

    if (password.length < 8) {
      toast.error("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    try {
      setLoading(true);
      if (isSignUp) {
        // Sign Up with Supabase Auth
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              phone: phone,
              company_name: companyName,
              role: userRole,
            }
          }
        });

        if (error) throw error;

        // Custom Profile Insertion (Fallback)
        if (data.user) {
          await supabase.from("profiles").upsert({
            id: data.user.id,
            full_name: fullName,
            phone: phone,
            company_name: companyName,
            role: userRole,
            email: email,
          });
        }

        toast.success("Inscription réussie !");
        redirectUser(data.user?.id || "");
      } else {
        // Sign In
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast.success("Connexion réussie !");
        redirectUser(data.user?.id || "");
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16 flex items-center justify-center bg-background">
      <motion.div
        className="w-full max-w-md p-8 rounded-3xl bg-card border border-border/60 shadow-glow"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="text-center mb-8">
          <h1 className="font-heading text-2xl font-extrabold text-foreground">
            {isSignUp ? "Créer un compte GLN" : "Se connecter"}
          </h1>
          <p className="text-xs text-muted-foreground mt-2">
            {isSignUp ? "Rejoignez l'académie ou le réseau de partenaires" : "Accédez à votre espace sécurisé"}
          </p>
        </div>

        {/* Google OAuth Button */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full bg-secondary hover:bg-secondary/80 border border-border/80 text-foreground py-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all mb-6"
        >
          <Chrome className="w-4 h-4 text-primary" />
          Continuer avec Google
        </button>

        <div className="relative flex items-center justify-center my-6">
          <div className="absolute inset-x-0 h-[1px] bg-border/60" />
          <span className="relative bg-card px-3 text-[10px] text-muted-foreground uppercase font-bold">Ou utiliser l'e-mail</span>
        </div>

        {/* Email Password Auth Form */}
        <form onSubmit={handleAuth} className="space-y-4">
          {isSignUp && (
            <>
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 block">Nom complet (pour vos certificats)</label>
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
                <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 block">Téléphone (Format international)</label>
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
                <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 block">Nom de l'entreprise (Facturation & Prestations)</label>
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
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value as "student" | "partner")}
                  className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="student">Élève / Étudiant (Accès cours)</option>
                  <option value="partner">Partenaire / Closer (Réseau commercial)</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 block">Adresse E-mail</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 w-4 h-4 text-muted-foreground" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-secondary border border-border rounded-xl pl-10 pr-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                placeholder="nom@exemple.com"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 block">Mot de passe</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 w-4 h-4 text-muted-foreground" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-secondary border border-border rounded-xl pl-10 pr-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-glow pt-4"
          >
            {isSignUp ? (
              <>
                <UserPlus className="w-4 h-4" />
                Créer mon compte
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                Se connecter
              </>
            )}
          </button>
        </form>

        <div className="text-center mt-6">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-xs text-primary hover:underline font-semibold"
          >
            {isSignUp ? "Déjà un compte ? Connectez-vous" : "Pas encore de compte ? Créez-en un"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
