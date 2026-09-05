import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Lock, Eye, EyeOff, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/useLanguage";

// Landing page for the link sent by supabase.auth.resetPasswordForEmail()
// (triggered from the "Mot de passe oublié ?" screen in Auth.tsx). Supabase
// uses the implicit flow by default in this project (client.ts doesn't
// override flowType), so the recovery tokens arrive in the URL hash and the
// SDK's own initialize() consumes them before this component can attach a
// listener — exactly the same timing as the Google OAuth callback in
// AuthCallback.tsx, so this follows that file's proven pattern: an
// onAuthStateChange listener for events that fire after mount, PLUS an
// immediate getSession() check to catch one that already fired.
const ResetPassword = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [checking, setChecking] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) {
        setHasRecoverySession(true);
        setChecking(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setHasRecoverySession(true);
      }
      setChecking(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      toast.error(
        language === "fr"
          ? "Le mot de passe doit contenir au moins 8 caractères."
          : "Password must contain at least 8 characters."
      );
      return;
    }
    if (password !== confirmPassword) {
      toast.error(language === "fr" ? "Les mots de passe ne correspondent pas." : "Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      // Force a fresh login afterward — standard for a security-sensitive
      // change like this, and consistent with how this app already treats
      // account creation: a clean re-entry with the new credentials rather
      // than silently carrying over whatever session state got here.
      await supabase.auth.signOut();
      toast.success(
        language === "fr"
          ? "Mot de passe mis à jour. Connectez-vous avec votre nouveau mot de passe."
          : "Password updated. Log in with your new password."
      );
      navigate("/auth");
    } catch (err: unknown) {
      toast.error(
        (err as Error)?.message ||
          (language === "fr" ? "Une erreur est survenue. Veuillez réessayer." : "An error occurred. Please try again.")
      );
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-muted-foreground">
            {language === "fr" ? "Vérification du lien..." : "Verifying link..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 flex items-center justify-center bg-background">
      <motion.div
        className="stable-surface w-full max-w-md p-5 sm:p-8 rounded-2xl sm:rounded-3xl bg-card border border-border/60 shadow-glow"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {!hasRecoverySession ? (
          <div className="text-center space-y-4">
            <KeyRound className="w-10 h-10 text-muted-foreground mx-auto" />
            <h1 className="font-heading text-xl font-extrabold text-foreground">
              {language === "fr" ? "Lien invalide ou expiré" : "Invalid or expired link"}
            </h1>
            <p className="text-xs text-muted-foreground">
              {language === "fr"
                ? "Ce lien de réinitialisation n'est plus valide. Demandez-en un nouveau depuis la page de connexion."
                : "This reset link is no longer valid. Request a new one from the login page."}
            </p>
            <button
              onClick={() => navigate("/auth")}
              className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold text-xs hover:opacity-90 transition-all shadow-glow"
            >
              {language === "fr" ? "Retour à la connexion" : "Back to login"}
            </button>
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <h1 className="font-heading text-2xl font-extrabold text-foreground">
                {language === "fr" ? "Nouveau mot de passe" : "New password"}
              </h1>
              <p className="text-xs text-muted-foreground mt-2">
                {language === "fr"
                  ? "Choisissez un nouveau mot de passe pour votre compte."
                  : "Choose a new password for your account."}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 block">
                  {language === "fr" ? "Nouveau mot de passe (8 caractères min) *" : "New password (8 chars min) *"}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-muted-foreground" />
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

              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 block">
                  {language === "fr" ? "Confirmer le mot de passe *" : "Confirm password *"}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-secondary border border-border rounded-xl pl-10 pr-10 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-glow"
              >
                {language === "fr" ? "Mettre à jour le mot de passe" : "Update password"}
              </button>
            </form>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default ResetPassword;
