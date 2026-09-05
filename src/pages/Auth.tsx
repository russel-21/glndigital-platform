import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Mail, Lock, Phone, Building, User, LogIn, UserPlus, Chrome, Eye, EyeOff, MapPin, Globe } from "lucide-react";
import { toast } from "sonner";
import { getDeviceToken } from "./AuthCallback";
import { useLanguage } from "@/hooks/useLanguage";
import { countryCodes } from "@/lib/countryCodes";
import { REMEMBER_ME_KEY } from "@/integrations/supabase/client";

const TRUST_DEVICE_MS = 90 * 24 * 60 * 60 * 1000;

const rememberTrustedDevice = () => {
  localStorage.setItem("gln_trust_device", "true");
  localStorage.setItem("gln_trust_device_until", String(Date.now() + TRUST_DEVICE_MS));
};

const clearTrustedDevice = () => {
  localStorage.removeItem("gln_trust_device");
  localStorage.removeItem("gln_trust_device_until");
};

const hasValidTrustedDevice = () => {
  const legacyTrust = localStorage.getItem("gln_trust_device") === "true";
  const trustedUntil = Number(localStorage.getItem("gln_trust_device_until") || "0");

  if (!legacyTrust) return false;
  if (!trustedUntil) {
    rememberTrustedDevice();
    return true;
  }
  if (trustedUntil > Date.now()) return true;

  clearTrustedDevice();
  return false;
};

const Auth = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form Fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [countryCode, setCountryCode] = useState("+237");
  const [phoneLocal, setPhoneLocal] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("Cameroun");
  const [companyName, setCompanyName] = useState("");
  const [signupRole, setSignupRole] = useState<"student" | "partner" | "client">("student");
  const [loginIdentifier, setLoginIdentifier] = useState(""); // Email or Phone for login

  // "Mot de passe oublié ?" — email-only for now. Login above also accepts a
  // phone number, but that's cosmetic: signUp() only ever writes the phone
  // into user_metadata (not the real auth.users.phone column that
  // signInWithPassword({ phone }) reads), so no account here actually has a
  // usable phone identity yet, and this project has no SMS provider
  // configured either — a phone-based recovery would just be a button that
  // silently does nothing. Flagged to Russel rather than built to pretend.
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  // Check if user is already logged in only when this device is trusted.
  useEffect(() => {
    if (!hasValidTrustedDevice()) {
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        redirectUser(session.user.id);
      }
    });
  }, []);

  // `knownProfile`: signup already has the exact row it just upserted in
  // hand, so it's passed straight through here instead of being re-read.
  // Skipping that re-fetch isn't just an optimization — right after an
  // upsert, a `.single()` select can transiently 406 (no row visible yet)
  // and fall into the catch-all below, which used to be harmless (it only
  // ran on a real login, well after signup's write had long settled) but
  // would now silently misroute a fresh partner/client to /eleve-dashboard
  // if the auto-login-after-signup path relied on a re-fetch instead.
  const redirectUser = async (
    userId: string,
    knownProfile?: { id: string; status?: string; active_sessions?: string[]; roles?: string[]; current_role?: string }
  ) => {
    try {
      let profile = knownProfile;
      if (!profile) {
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

      // Check status (active/inactive)
      const userStatus = localStorage.getItem(`gln_user_status_${profile.id}`) || profile.status || "active";
      if (userStatus === "inactive") {
        toast.error(
          language === "fr"
            ? "Votre compte a été désactivé. Veuillez contacter l'administrateur."
            : "Your account has been deactivated. Please contact the administrator."
        );
        await supabase.auth.signOut();
        return;
      }

      // Check connections limits
      const activeSessions: string[] = profile.active_sessions || [];
      const roles: string[] = profile.roles || ['student'];
      const deviceToken = getDeviceToken();

      const isAdmin = roles.includes("admin") || roles.includes("super_admin");
      const maxAllowedDevices = isAdmin ? 3 : 1;

      if (!activeSessions.includes(deviceToken)) {
        if (activeSessions.length >= maxAllowedDevices) {
          toast.error(
            language === "fr"
              ? `Connexion refusée : limite d'appareils atteinte (${maxAllowedDevices} maximum).`
              : `Connection denied: device limit reached (${maxAllowedDevices} maximum).`
          );
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
      const isSuperAdmin = isAdmin || profile.current_role === "admin" || profile.current_role === "super_admin";

      if (isSuperAdmin) {
        navigate("/admin");
      } else if (profile.current_role === "partner") {
        navigate("/partenaires-dashboard");
      } else if (profile.current_role === "student") {
        navigate("/eleve-dashboard");
      } else if (profile.current_role === "client") {
        navigate("/client-dashboard");
      } else {
        navigate("/");
      }
    } catch {
      navigate("/eleve-dashboard");
    }
  };

  // Google Sign-In
  const handleGoogleLogin = () => {
    triggerOfficialGoogle(isSignUp ? "signup" : "login");
  };

  const triggerOfficialGoogle = async (mode: "signup" | "login" = "login") => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth-callback?mode=${mode}`,
        },
      });
      if (error) throw error;
    } catch (e: any) {
      const message = e?.message || "";
      const isProviderDisabled = message.toLowerCase().includes("provider") || message.toLowerCase().includes("unsupported");
      toast.error(
        language === "fr"
          ? isProviderDisabled
            ? "Google n'est pas encore activé dans Supabase. Activez le fournisseur Google puis réessayez."
            : "Connexion Google échouée. Vérifiez la configuration OAuth et les URLs de redirection."
          : isProviderDisabled
            ? "Google is not enabled in Supabase yet. Enable the Google provider and try again."
            : "Google sign-in failed. Check the OAuth configuration and redirect URLs."
      );
    } finally {
      setLoading(false);
    }
  };

  // Email Sign-In & Sign-Up
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    const currentPassword = password;
    const finalIdentifier = isSignUp ? email : loginIdentifier;

    if (isSignUp) {
      if (!fullName.trim()) {
        toast.error(language === "fr" ? "Veuillez entrer votre nom et prénom." : "Please enter your full name.");
        return;
      }
      if (!email.trim() || !email.includes("@")) {
        toast.error(language === "fr" ? "Veuillez entrer un e-mail valide." : "Please enter a valid email.");
        return;
      }
      if (!city.trim() || !country.trim()) {
        toast.error(language === "fr" ? "Veuillez entrer votre ville et pays." : "Please enter your city and country.");
        return;
      }
      if (!phoneLocal.trim()) {
        toast.error(language === "fr" ? "Veuillez entrer votre numéro de téléphone." : "Please enter your phone number.");
        return;
      }
      if (currentPassword.length < 8) {
        toast.error(
          language === "fr"
            ? "Le mot de passe doit contenir au moins 8 caractères."
            : "Password must contain at least 8 characters."
        );
        return;
      }
      if (currentPassword !== confirmPassword) {
        toast.error(
          language === "fr"
            ? "Les mots de passe ne correspondent pas."
            : "Passwords do not match."
        );
        return;
      }
    }

    const fullPhone = `${countryCode} ${phoneLocal.trim()}`;
    // Role chosen explicitly via the selector below — student/partner/
    // client are the three self-service entry points; admin/super_admin
    // are never self-assignable (RLS blocks it, see
    // 20260612223000_harden_rls_policies.sql).
    const userRole = signupRole;

    // Written before the auth call so the custom storage adapter in
    // client.ts (which reads this key on every session write) already
    // knows where to put the session it's about to receive.
    localStorage.setItem(REMEMBER_ME_KEY, String(rememberMe));

    try {
      setLoading(true);
      if (isSignUp) {
        // Sign Up
        const { data, error } = await supabase.auth.signUp({
          email,
          password: currentPassword,
          options: {
            data: {
              full_name: fullName,
              phone: fullPhone,
              company_name: "",
              role: userRole,
              city,
              country,
            }
          }
        });

        if (error) throw error;

        // Supabase Auth doesn't create a public.profiles row on its own —
        // this app's authorization model (roles/current_role) lives there,
        // so it's created explicitly right after signup.
        if (data.user) {
          const token = getDeviceToken();
          await supabase.from("profiles").upsert({
            id: data.user.id,
            full_name: fullName,
            phone: fullPhone,
            company_name: "",
            roles: [userRole],
            current_role: userRole,
            email: email,
            active_sessions: [token]
          });
        }

        // This project's Supabase instance doesn't require email
        // confirmation (verified against the real signUp() response), so a
        // session normally comes back immediately — sign the person straight
        // into their new space, "remembered" or not per their choice, same
        // as a real account-creation flow (Google included) rather than
        // bouncing them back to a login form for credentials they just typed.
        if (data.session) {
          if (rememberMe) {
            rememberTrustedDevice();
          } else {
            clearTrustedDevice();
          }
          toast.success(
            language === "fr" ? "Compte créé ! Bienvenue." : "Account created! Welcome."
          );
          redirectUser(data.user?.id || "", {
            id: data.user?.id || "",
            status: "active",
            active_sessions: [getDeviceToken()],
            roles: [userRole],
            current_role: userRole,
          });
        } else {
          // Defensive fallback only — kept in case email confirmation is
          // ever turned on for this project, where signUp() returns no
          // session and a real login step afterwards is unavoidable.
          toast.success(
            language === "fr"
              ? "Inscription réussie ! Veuillez vous connecter avec votre identifiant."
              : "Registration successful! Please log in with your credentials."
          );
          setLoginIdentifier(email);
          setIsSignUp(false);
        }
      } else {
        // Sign In
        const isEmail = finalIdentifier.includes("@");
        const loginParams = isEmail
          ? { email: finalIdentifier, password: currentPassword }
          : { phone: finalIdentifier, password: currentPassword };

        const { data, error } = await supabase.auth.signInWithPassword(loginParams);
        if (error) throw error;

        if (rememberMe) {
          rememberTrustedDevice();
        } else {
          clearTrustedDevice();
        }
        toast.success(language === "fr" ? "Connexion réussie !" : "Login successful!");
        redirectUser(data.user?.id || "");
      }
    } catch (err: any) {
      toast.error(
        err?.message ||
          (language === "fr" ? "Une erreur est survenue. Veuillez réessayer." : "An error occurred. Please try again.")
      );
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim() || !forgotEmail.includes("@")) {
      toast.error(language === "fr" ? "Veuillez entrer un e-mail valide." : "Please enter a valid email.");
      return;
    }

    try {
      setForgotLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;

      // Supabase's /recover endpoint returns success whether or not the
      // email matches an account (avoids leaking which emails are
      // registered) — so the message below is deliberately non-committal,
      // same reason Google's own "check your email" screen is.
      setForgotSent(true);
    } catch (err: unknown) {
      toast.error(
        (err as Error)?.message ||
          (language === "fr" ? "Une erreur est survenue. Veuillez réessayer." : "An error occurred. Please try again.")
      );
    } finally {
      setForgotLoading(false);
    }
  };

  if (showForgotPassword) {
    return (
      <div className="min-h-screen pt-24 pb-16 px-4 flex items-center justify-center bg-background">
        <motion.div
          className="stable-surface w-full max-w-md p-5 sm:p-8 rounded-2xl sm:rounded-3xl bg-card border border-border/60 shadow-glow"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-center mb-8">
            <h1 className="font-heading text-2xl font-extrabold text-foreground">
              {language === "fr" ? "Mot de passe oublié" : "Forgot password"}
            </h1>
            <p className="text-xs text-muted-foreground mt-2">
              {forgotSent
                ? (language === "fr"
                    ? "Si un compte existe avec cet e-mail, un lien de réinitialisation vient d'être envoyé."
                    : "If an account exists for that email, a reset link was just sent.")
                : (language === "fr"
                    ? "Entrez votre e-mail, nous vous enverrons un lien pour choisir un nouveau mot de passe."
                    : "Enter your email and we'll send you a link to set a new password.")}
            </p>
          </div>

          {!forgotSent && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 block">
                  {language === "fr" ? "Adresse E-mail *" : "Email Address *"}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-muted-foreground" />
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full bg-secondary border border-border rounded-xl pl-10 pr-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                    placeholder={language === "fr" ? "nom@exemple.com" : "name@example.com"}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={forgotLoading}
                className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-glow"
              >
                {language === "fr" ? "Envoyer le lien" : "Send link"}
              </button>
            </form>
          )}

          <div className="text-center mt-6">
            <button
              type="button"
              onClick={() => {
                setShowForgotPassword(false);
                setForgotSent(false);
                setForgotEmail("");
              }}
              className="text-xs text-primary hover:underline font-semibold"
            >
              {language === "fr" ? "Retour à la connexion" : "Back to login"}
            </button>
          </div>
        </motion.div>
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
        <div className="text-center mb-8">
          <h1 className="font-heading text-2xl font-extrabold text-foreground">
            {isSignUp
              ? (language === "fr" ? "Créer un compte GLN" : "Create a GLN account")
              : (language === "fr" ? "Se connecter" : "Log In")}
          </h1>
          <p className="text-xs text-muted-foreground mt-2">
            {isSignUp
              ? (language === "fr" ? "Rejoignez l'académie ou le réseau de partenaires" : "Join the academy or partner network")
              : (language === "fr" ? "Accédez à votre espace sécurisé" : "Access your secure workspace")}
          </p>
        </div>

        {/* Google OAuth Button */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full bg-secondary hover:bg-secondary/80 border border-border/80 text-foreground py-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all mb-6"
        >
          <Chrome className="w-4 h-4 text-primary" />
          {language === "fr" ? "Continuer avec Google" : "Continue with Google"}
        </button>

        <div className="relative flex items-center justify-center my-6">
          <div className="absolute inset-x-0 h-[1px] bg-border/60" />
          <span className="relative bg-card px-3 text-[10px] text-muted-foreground uppercase font-bold">
            {language === "fr" ? "Ou utiliser l'e-mail" : "Or use email"}
          </span>
        </div>

        {/* Email Password Auth Form */}
        <form onSubmit={handleAuth} className="space-y-4">
          {isSignUp ? (
            <>
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 block">
                  {language === "fr" ? "Je m'inscris en tant que *" : "I'm signing up as *"}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["student", "partner", "client"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setSignupRole(r)}
                      className={`px-2 py-2 rounded-xl text-[11px] font-bold uppercase border transition-colors ${
                        signupRole === r
                          ? "bg-primary border-primary text-primary-foreground"
                          : "bg-secondary border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {r === "student"
                        ? (language === "fr" ? "Élève" : "Student")
                        : r === "partner"
                          ? (language === "fr" ? "Partenaire" : "Partner")
                          : (language === "fr" ? "Client" : "Client")}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5">
                  {signupRole === "client"
                    ? (language === "fr"
                        ? "Espace pour connecter tes réseaux sociaux et suivre leur gestion par GLN Digital."
                        : "Space to connect your social accounts and follow GLN Digital's management of them.")
                    : signupRole === "partner"
                      ? (language === "fr" ? "Programme partenaire / closer." : "Partner / closer program.")
                      : (language === "fr" ? "Accès à l'Académie et aux formations." : "Access to the Academy and courses.")}
                </p>
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 block">
                  {language === "fr" ? "Nom et Prénom *" : "Full Name *"}
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-secondary border border-border rounded-xl pl-10 pr-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                    placeholder={language === "fr" ? "Jean Dupont" : "John Doe"}
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 block">
                  {language === "fr" ? "Adresse E-mail *" : "Email Address *"}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-muted-foreground" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-secondary border border-border rounded-xl pl-10 pr-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                    placeholder={language === "fr" ? "nom@exemple.com" : "name@example.com"}
                  />
                </div>
              </div>

              {/* Ville et Pays Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 block">
                    {language === "fr" ? "Ville *" : "City *"}
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-3.5 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full bg-secondary border border-border rounded-xl pl-10 pr-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                      placeholder="Douala"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 block">
                    {language === "fr" ? "Pays *" : "Country *"}
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-3.5 top-3.5 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      required
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full bg-secondary border border-border rounded-xl pl-10 pr-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                      placeholder="Cameroun"
                    />
                  </div>
                </div>
              </div>

              {/* Phone Input Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="sm:col-span-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 block">
                    {language === "fr" ? "Code" : "Code"}
                  </label>
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="w-full bg-secondary border border-border rounded-xl px-2 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary h-[38px]"
                  >
                    {countryCodes.map((c) => (
                      <option key={`${c.country}-${c.code}`} value={c.code}>
                        {c.code} ({c.country}) - {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 block">
                    {language === "fr" ? "Numéro de téléphone *" : "Phone Number *"}
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-3.5 w-4 h-4 text-muted-foreground" />
                    <input
                      type="tel"
                      required
                      value={phoneLocal}
                      onChange={(e) => setPhoneLocal(e.target.value)}
                      className="w-full bg-secondary border border-border rounded-xl pl-10 pr-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                      placeholder="6xx xxx xxx"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 block">
                  {language === "fr" ? "Mot de passe (8 caractères min) *" : "Password (8 chars min) *"}
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
                  {language === "fr" ? "Confirmer le mot de passe *" : "Confirm Password *"}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-muted-foreground" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-secondary border border-border rounded-xl pl-10 pr-10 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-3 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 block">
                  {language === "fr" ? "E-mail ou Téléphone" : "Email or Phone"}
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    required
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    className="w-full bg-secondary border border-border rounded-xl pl-10 pr-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                    placeholder={language === "fr" ? "nom@exemple.com ou 6xxxxxxxx" : "name@example.com or phone"}
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 block">
                  {language === "fr" ? "Mot de passe" : "Password"}
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
                <div className="text-right mt-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(loginIdentifier.includes("@") ? loginIdentifier : "");
                      setShowForgotPassword(true);
                    }}
                    className="text-[11px] text-primary hover:underline font-semibold"
                  >
                    {language === "fr" ? "Mot de passe oublié ?" : "Forgot password?"}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Shared by both signup and login — Supabase actually honors this
              now (see REMEMBER_ME_KEY in client.ts), so it needs to be set
              before either submits, not just before a login. */}
          <div className="flex items-center gap-2 py-1 select-none">
            <input
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-border bg-secondary text-primary focus:ring-primary focus:ring-offset-background cursor-pointer"
            />
            <label htmlFor="rememberMe" className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors font-medium">
              {language === "fr" ? "Rester connecté sur cet appareil" : "Stay signed in on this device"}
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-glow pt-4"
          >
            {isSignUp ? (
              <>
                <UserPlus className="w-4 h-4" />
                {language === "fr" ? "Créer mon compte" : "Create my account"}
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                {language === "fr" ? "Se connecter" : "Log In"}
              </>
            )}
          </button>
        </form>

        <div className="text-center mt-6">
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-xs text-primary hover:underline font-semibold"
          >
            {isSignUp
              ? (language === "fr" ? "Déjà un compte ? Connectez-vous" : "Already have an account? Log in")
              : (language === "fr" ? "Pas encore de compte ? Créez-en un" : "No account yet? Create one")}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
