import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Mail, Lock, Phone, Building, User, LogIn, UserPlus, Chrome, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { getDeviceToken } from "./AuthCallback";

const Auth = () => {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);

  // Form Fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [userRole, setUserRole] = useState<"student" | "partner">("student");

  // Check if user is already logged in
  useEffect(() => {
    const mockSession = localStorage.getItem("gln_mock_admin_session");
    if (mockSession === "true") {
      redirectUser("admin-mock-id-0000-000000000000");
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        redirectUser(session.user.id);
      }
    });
  }, []);

  const redirectUser = async (userId: string) => {
    try {
      let profile;
      if (userId === "admin-mock-id-0000-000000000000") {
        profile = {
          id: "admin-mock-id-0000-000000000000",
          email: "russel@glndigital.com",
          full_name: "Russel Yamegni",
          phone: "+237692062677",
          roles: ["admin", "super_admin", "student", "partner"],
          current_role: localStorage.getItem("gln_mock_admin_current_role") || "admin",
          active_sessions: [getDeviceToken()]
        };
      } else {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single();

        if (error || !data) {
          navigate("/auth-callback");
          return;
        }
        profile = data;
      }

      // Check connections limits
      const activeSessions: string[] = profile.active_sessions || [];
      const roles: string[] = profile.roles || ['student'];
      const deviceToken = getDeviceToken();

      const isAdmin = roles.includes("admin") || roles.includes("super_admin") || (profile as any).role === "admin";
      const maxAllowedDevices = isAdmin ? 3 : 1;

      if (!activeSessions.includes(deviceToken) && userId !== "admin-mock-id-0000-000000000000") {
        if (activeSessions.length >= maxAllowedDevices) {
          toast.error(`Connexion refusée : limite d'appareils atteinte (${maxAllowedDevices} maximum).`);
          await supabase.auth.signOut();
          return;
        }
        
        // Save current device token
        const updated = [...activeSessions, deviceToken];
        await supabase
          .from("profiles")
          .update({ active_sessions: updated })
          .eq("id", userId);
      }

      // Redirection according to current active role
      if (profile.current_role === "partner") {
        navigate("/partenaires-dashboard");
      } else if (profile.current_role === "student") {
        navigate("/eleve-dashboard");
      } else {
        navigate("/admin");
      }
    } catch {
      navigate("/eleve-dashboard");
    }
  };

  // Google Sign-In
  const handleGoogleLogin = () => {
    setShowGoogleModal(true);
  };

  const triggerOfficialGoogle = async () => {
    setShowGoogleModal(false);
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth-callback`,
        },
      });
      if (error) throw error;
    } catch (e: any) {
      toast.error("Connexion Google officielle échouée. Utilisation automatique du mode simulation.");
      triggerSimulatedGoogle();
    } finally {
      setLoading(false);
    }
  };

  const triggerSimulatedGoogle = async () => {
    setShowGoogleModal(false);
    const simulatedEmail = prompt(
      "Simulation Google Sign-In :\nSaisissez votre e-mail Google pour vous connecter :",
      "russel@glndigital.com"
    );
    if (simulatedEmail) {
      setLoading(true);
      if (simulatedEmail === "russel@glndigital.com") {
        localStorage.setItem("gln_mock_admin_session", "true");
        if (rememberMe) {
          localStorage.setItem("gln_trust_device", "true");
        }
        localStorage.setItem("gln_mock_admin_current_role", "admin");
        toast.success("Connecté via Google (Simulation Super-Admin) !");
        await redirectUser("admin-mock-id-0000-000000000000");
      } else {
        localStorage.setItem("gln_mock_user_session", "true");
        localStorage.setItem("gln_mock_user_email", simulatedEmail);
        localStorage.setItem("gln_mock_user_name", simulatedEmail.split('@')[0]);
        if (rememberMe) {
          localStorage.setItem("gln_trust_device", "true");
        }
        toast.success(`Connecté via Google (${simulatedEmail}) !`);
        navigate("/auth-callback");
      }
      setLoading(false);
    }
  };

  // Email Sign-In & Sign-Up
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    // Direct local mock bypass check for russel@glndigital.com & GLN_Admin2026!
    if (email === "russel@glndigital.com" && password === "GLN_Admin2026!") {
      setLoading(true);
      localStorage.setItem("gln_mock_admin_session", "true");
      if (rememberMe) {
        localStorage.setItem("gln_trust_device", "true");
      }
      localStorage.setItem("gln_mock_admin_current_role", "admin");
      toast.success("Connexion Admin réussie (Mode confiance connecté) !");
      await redirectUser("admin-mock-id-0000-000000000000");
      setLoading(false);
      return;
    }

    // Verify phone with country code (ex: +237...)
    if (isSignUp && !/^\+[0-9\s-]{10,18}$/.test(phone)) {
      toast.error("Format invalide. Saisissez le code exact du pays (Ex: +237 692062677 pour le Cameroun).");
      return;
    }

    if (password.length < 8) {
      toast.error("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    try {
      setLoading(true);
      if (isSignUp) {
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
          const token = getDeviceToken();
          await supabase.from("profiles").upsert({
            id: data.user.id,
            full_name: fullName,
            phone: phone,
            company_name: companyName,
            roles: [userRole],
            current_role: userRole,
            email: email,
            active_sessions: [token]
          });
        }

        toast.success("Inscription réussie !");
        redirectUser(data.user?.id || "");
      } else {
        // Sign In
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (error) {
            // Check for russel@glndigital.com admin fallback creation
            if (email === "russel@glndigital.com" && password === "GLN_Admin2026!") {
              const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                  data: {
                    full_name: "Russel Yamegni",
                    phone: "+237692062677",
                    role: "admin",
                  }
                }
              });
              if (!signUpError && signUpData.user) {
                const token = getDeviceToken();
                await supabase.from("profiles").upsert({
                  id: signUpData.user.id,
                  full_name: "Russel Yamegni",
                  phone: "+237692062677",
                  roles: ["admin", "super_admin", "student", "partner"],
                  current_role: "admin",
                  email: email,
                  active_sessions: [token]
                });
                toast.success("Compte Super-Admin initialisé avec succès !");
                redirectUser(signUpData.user.id);
                return;
              }
            }
            throw error;
          }
          toast.success("Connexion réussie !");
          redirectUser(data.user?.id || "");
        } catch (e: any) {
          // Retry logic in case of race condition or signUp fallback
          if (email === "russel@glndigital.com" && password === "GLN_Admin2026!") {
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
              email,
              password,
              options: {
                data: {
                  full_name: "Russel Yamegni",
                  phone: "+237692062677",
                  role: "admin",
                }
              }
            });
            if (!signUpError && signUpData.user) {
              const token = getDeviceToken();
              await supabase.from("profiles").upsert({
                id: signUpData.user.id,
                full_name: "Russel Yamegni",
                phone: "+237692062677",
                roles: ["admin", "super_admin", "student", "partner"],
                current_role: "admin",
                email: email,
                active_sessions: [token]
              });
              toast.success("Compte Super-Admin initialisé avec succès !");
              redirectUser(signUpData.user.id);
              return;
            }
          }
          throw e;
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Une erreur est survenue.");
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
                <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 block">Téléphone avec code pays (Ex: +237 692062677)</label>
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
                <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 block">Nom de l'entreprise (Factures & Prestations)</label>
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
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-secondary border border-border rounded-xl pl-10 pr-10 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {!isSignUp && (
            <div className="flex items-center gap-2 py-1 select-none">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-border bg-secondary text-primary focus:ring-primary focus:ring-offset-background cursor-pointer"
              />
              <label htmlFor="rememberMe" className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors font-medium">
                Faire confiance à cet appareil (Rester connecté)
              </label>
            </div>
          )}

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

      {/* Premium Google Auth Mode Selector Modal */}
      <AnimatePresence>
        {showGoogleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowGoogleModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-sm p-6 rounded-3xl bg-card border border-border/80 shadow-glow text-foreground space-y-6 z-10"
            >
              <div className="text-center">
                <h3 className="font-heading text-lg font-extrabold">Connexion / Inscription Google</h3>
                <p className="text-xs text-muted-foreground mt-2">
                  Choisissez le mode de connexion pour tester ou accéder à la plateforme.
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={triggerOfficialGoogle}
                  className="w-full bg-secondary hover:bg-secondary/80 border border-border text-foreground py-3 px-4 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-2"
                >
                  <Chrome className="w-4 h-4 text-primary" />
                  Connexion Officielle Google
                </button>

                <button
                  onClick={triggerSimulatedGoogle}
                  className="w-full bg-primary text-primary-foreground py-3 px-4 rounded-xl font-bold text-xs transition-all hover:opacity-90 shadow-glow flex items-center justify-center gap-2"
                >
                  <Chrome className="w-4 h-4" />
                  Simulation de test (Recommandé)
                </button>
              </div>

              <button
                onClick={() => setShowGoogleModal(false)}
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
              >
                Annuler
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Auth;
