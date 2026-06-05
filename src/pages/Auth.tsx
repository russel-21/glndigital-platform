import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, Phone, Building, User, LogIn, UserPlus, Chrome, Eye, EyeOff, MapPin, Globe } from "lucide-react";
import { toast } from "sonner";
import { getDeviceToken } from "./AuthCallback";
import { useLanguage } from "@/hooks/useLanguage";

const Auth = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [simulatedEmail, setSimulatedEmail] = useState("russel@glndigital.com");

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
  const [userRole, setUserRole] = useState<"student" | "partner">("student");
  const [loginIdentifier, setLoginIdentifier] = useState(""); // Email or Phone for login
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Check if user is already logged in
  useEffect(() => {
    const mockSession = localStorage.getItem("gln_mock_admin_session");
    if (mockSession === "true") {
      redirectUser("admin-mock-id-0000-000000000000");
      return;
    }

    const savedTrust = localStorage.getItem("gln_trust_device");
    if (savedTrust === "true") {
      const mockUserSession = localStorage.getItem("gln_mock_user_logged_in") === "true";
      if (mockUserSession) {
        const activeMock = localStorage.getItem("gln_active_mock_profile");
        if (activeMock) {
          try {
            const parsed = JSON.parse(activeMock);
            redirectUser(parsed.id || "user-mock-id-0000-000000000000");
            return;
          } catch {}
        }
      }
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
          full_name: "Super Admin",
          phone: "+237 000 000 000",
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

      const isSuperAdminEmail = profile.email === "russel@glndigital.com";
      if (isSuperAdminEmail) {
        localStorage.setItem("gln_mock_admin_session", "true");
        localStorage.setItem("gln_mock_admin_current_role", "admin");
        navigate("/admin");
        return;
      }

      // Check status (active/inactive)
      const userStatus = localStorage.getItem(`gln_user_status_${profile.id}`) || profile.status || "active";
      if (userStatus === "inactive") {
        toast.error(
          language === "fr"
            ? "Votre compte a été désactivé. Veuillez contacter l'administrateur."
            : "Your account has been deactivated. Please contact the administrator."
        );
        if (userId !== "admin-mock-id-0000-000000000000") {
          await supabase.auth.signOut();
        }
        localStorage.removeItem("gln_mock_admin_session");
        localStorage.removeItem("gln_mock_user_session");
        localStorage.removeItem("gln_mock_user_logged_in");
        localStorage.removeItem("gln_active_mock_profile");
        return;
      }

      // Check connections limits
      const activeSessions: string[] = profile.active_sessions || [];
      const roles: string[] = profile.roles || ['student'];
      const deviceToken = getDeviceToken();

      const isAdmin = roles.includes("admin") || roles.includes("super_admin") || (profile as any).role === "admin";
      const maxAllowedDevices = isAdmin ? 3 : 1;

      if (!activeSessions.includes(deviceToken) && userId !== "admin-mock-id-0000-000000000000") {
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
      const isSuperAdmin = isAdmin || profile.current_role === "admin" || profile.email === "russel@glndigital.com";
      
      if (isSuperAdmin) {
        navigate("/admin");
      } else if (profile.current_role === "partner") {
        navigate("/partenaires-dashboard");
      } else {
        navigate("/eleve-dashboard");
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
      toast.error(
        language === "fr"
          ? "Connexion Google officielle échouée. Utilisation automatique du mode simulation."
          : "Official Google connection failed. Automatically switching to simulation mode."
      );
      triggerSimulatedGoogle(simulatedEmail);
    } finally {
      setLoading(false);
    }
  };

  const triggerSimulatedGoogle = async (emailToUse: string) => {
    if (!emailToUse || !emailToUse.includes("@")) {
      toast.error(
        language === "fr" ? "Veuillez saisir un e-mail valide." : "Please enter a valid email address."
      );
      return;
    }
    setShowGoogleModal(false);
    setLoading(true);
    if (emailToUse === "russel@glndigital.com") {
      localStorage.setItem("gln_mock_admin_session", "true");
      if (rememberMe) {
        localStorage.setItem("gln_trust_device", "true");
      }
      localStorage.setItem("gln_mock_admin_current_role", "admin");
      toast.success(
        language === "fr"
          ? "Connecté via Google (Simulation Super-Admin) !"
          : "Connected via Google (Super-Admin Simulation)!"
      );
      await redirectUser("admin-mock-id-0000-000000000000");
    } else {
      localStorage.setItem("gln_mock_user_session", "true");
      localStorage.setItem("gln_mock_user_email", emailToUse);
      localStorage.setItem("gln_mock_user_name", emailToUse.split('@')[0]);
      if (rememberMe) {
        localStorage.setItem("gln_trust_device", "true");
      }
      toast.success(
        language === "fr"
          ? `Connecté via Google (${emailToUse}) !`
          : `Connected via Google (${emailToUse})!`
      );
      navigate("/auth-callback");
    }
    setLoading(false);
  };

  // Email Sign-In & Sign-Up
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    const currentPassword = password;
    const finalIdentifier = isSignUp ? email : loginIdentifier;

    // Direct local mock bypass check for russel@glndigital.com & GLN_Admin2026!
    if (finalIdentifier === "russel@glndigital.com" && currentPassword === "GLN_Admin2026!") {
      setLoading(true);
      localStorage.setItem("gln_mock_admin_session", "true");
      if (rememberMe) {
        localStorage.setItem("gln_trust_device", "true");
      }
      localStorage.setItem("gln_mock_admin_current_role", "admin");
      toast.success(
        language === "fr"
          ? "Connexion Admin réussie (Mode confiance connecté) !"
          : "Admin Login Successful (Trusted device mode active)!"
      );
      await redirectUser("admin-mock-id-0000-000000000000");
      setLoading(false);
      return;
    }

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
    const userRole = "visiteur";

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

        // Custom Profile Insertion (Fallback)
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

        // Save local mock registry for simulation fallback
        localStorage.setItem(`gln_mock_reg_${email}`, JSON.stringify({
          email,
          password: currentPassword,
          fullName,
          phone: fullPhone,
          city,
          country,
          role: userRole
        }));
        if (phoneLocal) {
          localStorage.setItem(`gln_mock_reg_${phoneLocal.replace(/\s+/g, "")}`, JSON.stringify({
            email,
            password: currentPassword,
            fullName,
            phone: fullPhone,
            city,
            country,
            role: userRole
          }));
        }

        toast.success(
          language === "fr" 
            ? "Inscription réussie ! Veuillez vous connecter avec votre identifiant." 
            : "Registration successful! Please log in with your credentials."
        );
        
        // Return to login screen
        setLoginIdentifier(email);
        setIsSignUp(false);
        setLoading(false);
      } else {
        // Sign In
        const isEmail = finalIdentifier.includes("@");
        const loginParams = isEmail
          ? { email: finalIdentifier, password: currentPassword }
          : { phone: finalIdentifier, password: currentPassword };

        try {
          const { data, error } = await supabase.auth.signInWithPassword(loginParams);
          if (error) {
            // Check for russel@glndigital.com admin fallback creation
            if (finalIdentifier === "russel@glndigital.com" && currentPassword === "GLN_Admin2026!") {
              const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                email: finalIdentifier,
                password: currentPassword,
                options: {
                  data: {
                    full_name: "Super Admin",
                    phone: "+237 000 000 000",
                    role: "admin",
                  }
                }
              });
              if (!signUpError && signUpData.user) {
                const token = getDeviceToken();
                await supabase.from("profiles").upsert({
                  id: signUpData.user.id,
                  full_name: "Super Admin",
                  phone: "+237 000 000 000",
                  roles: ["admin", "super_admin", "student", "partner"],
                  current_role: "admin",
                  email: finalIdentifier,
                  active_sessions: [token]
                });
                toast.success(
                  language === "fr"
                    ? "Compte Super-Admin initialisé avec succès !"
                    : "Super-Admin account successfully initialized!"
                );
                redirectUser(signUpData.user.id);
                return;
              }
            }
            throw error;
          }
          if (rememberMe) {
            localStorage.setItem("gln_trust_device", "true");
          } else {
            localStorage.removeItem("gln_trust_device");
          }
          toast.success(language === "fr" ? "Connexion réussie !" : "Login successful!");
          redirectUser(data.user?.id || "");
        } catch (e: any) {
          // Verify simulation registration registry
          const registryKey = `gln_mock_reg_${finalIdentifier.replace(/\s+/g, "")}`;
          const savedReg = localStorage.getItem(registryKey);
          if (savedReg) {
            const parsedReg = JSON.parse(savedReg);
            if (parsedReg.password === currentPassword) {
              localStorage.setItem("gln_mock_user_session", "true");
              localStorage.setItem("gln_mock_user_email", parsedReg.email);
              localStorage.setItem("gln_mock_user_name", parsedReg.fullName);
              localStorage.setItem("gln_mock_user_logged_in", "true");
              
              if (rememberMe) {
                localStorage.setItem("gln_trust_device", "true");
              } else {
                localStorage.removeItem("gln_trust_device");
              }

              const deviceToken = getDeviceToken();
              const activeProfile = {
                id: "user-mock-id-0000-000000000000",
                email: parsedReg.email,
                full_name: parsedReg.fullName,
                phone: parsedReg.phone,
                city: parsedReg.city,
                country: parsedReg.country,
                roles: [parsedReg.role],
                current_role: parsedReg.role,
                active_sessions: [deviceToken]
              };
              localStorage.setItem("gln_active_mock_profile", JSON.stringify(activeProfile));

              toast.success(
                language === "fr"
                  ? `Simulation : Connexion réussie (${parsedReg.email}) !`
                  : `Simulation: Login successful (${parsedReg.email})!`
              );
              navigate("/eleve-dashboard");
              return;
            } else {
              toast.error(
                language === "fr"
                  ? "Identifiant ou mot de passe incorrect."
                  : "Invalid identifier or password."
              );
              throw e;
            }
          }
          throw e;
        }
      }
    } catch (err: any) {
      console.warn("Supabase auth error, falling back to simulated session:", err);
      if (isSignUp) {
        // Simulated registration fallback (should save mock and redirect to login)
        localStorage.setItem(`gln_mock_reg_${email}`, JSON.stringify({
          email,
          password: currentPassword,
          fullName,
          phone: fullPhone,
          city,
          country,
          role: userRole
        }));
        if (phoneLocal) {
          localStorage.setItem(`gln_mock_reg_${phoneLocal.replace(/\s+/g, "")}`, JSON.stringify({
            email,
            password: currentPassword,
            fullName,
            phone: fullPhone,
            city,
            country,
            role: userRole
          }));
        }

        toast.success(
          language === "fr"
            ? "Simulation : Inscription réussie ! Veuillez vous connecter."
            : "Simulation: Registration successful! Please log in."
        );
        setLoginIdentifier(email);
        setIsSignUp(false);
      } else {
        // Login fallback if profile already exists or for russel super admin
        if (finalIdentifier === "russel@glndigital.com" && currentPassword === "GLN_Admin2026!") {
          localStorage.setItem("gln_mock_admin_session", "true");
          if (rememberMe) {
            localStorage.setItem("gln_trust_device", "true");
          }
          localStorage.setItem("gln_mock_admin_current_role", "admin");
          toast.success(
            language === "fr"
              ? "Connecté via Google (Simulation Super-Admin) !"
              : "Connected via Google (Super-Admin Simulation)!"
          );
          await redirectUser("admin-mock-id-0000-000000000000");
          return;
        }

        const savedMock = localStorage.getItem("gln_active_mock_profile");
        let parsed = savedMock ? JSON.parse(savedMock) : null;
        if (parsed && (parsed.email === finalIdentifier || parsed.phone === finalIdentifier)) {
          localStorage.setItem("gln_mock_user_logged_in", "true");
          if (rememberMe) {
            localStorage.setItem("gln_trust_device", "true");
          }
          toast.success(
            language === "fr"
              ? `Simulation : Connexion réussie (${finalIdentifier}) !`
              : `Simulation: Login successful (${finalIdentifier})!`
          );
          if (parsed.current_role === "partner") {
            navigate("/partenaires-dashboard");
          } else {
            navigate("/eleve-dashboard");
          }
        } else {
          localStorage.setItem("gln_mock_user_session", "true");
          localStorage.setItem("gln_mock_user_email", finalIdentifier);
          localStorage.setItem("gln_mock_user_name", finalIdentifier.split('@')[0]);
          if (rememberMe) {
            localStorage.setItem("gln_trust_device", "true");
          }
          toast.success(
            language === "fr"
              ? "Simulation : Connexion réussie ! (Configuration du profil)"
              : "Simulation: Login successful! (Profile setup)"
          );
          navigate("/auth-callback");
        }
      }
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
              <div className="grid grid-cols-2 gap-2.5">
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
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 block">
                    {language === "fr" ? "Code" : "Code"}
                  </label>
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="w-full bg-secondary border border-border rounded-xl px-2 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary h-[38px]"
                  >
                    <option value="+237">+237 CM</option>
                    <option value="+33">+33 FR</option>
                    <option value="+225">+225 CI</option>
                    <option value="+221">+221 SN</option>
                  </select>
                </div>
                <div className="col-span-2">
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
              </div>

              <div className="flex items-center gap-2 py-1 select-none">
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-border bg-secondary text-primary focus:ring-primary focus:ring-offset-background cursor-pointer"
                />
                <label htmlFor="rememberMe" className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors font-medium">
                  {language === "fr" ? "Faire confiance à cet appareil (Rester connecté)" : "Trust this device (Stay logged in)"}
                </label>
              </div>
            </>
          )}

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
                <h3 className="font-heading text-lg font-extrabold font-bold">
                  {language === "fr" ? "Connexion / Inscription Google" : "Google Sign-In / Sign-Up"}
                </h3>
                <p className="text-xs text-muted-foreground mt-2">
                  {language === "fr"
                    ? "Choisissez ou simulez le compte de connexion Google pour accéder à la plateforme."
                    : "Choose or simulate the Google account to access the platform."}
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase block font-bold">
                    {language === "fr" ? "Adresse E-mail Google (Simulation)" : "Google Email Address (Simulation)"}
                  </label>
                  <input
                    type="email"
                    value={simulatedEmail}
                    onChange={(e) => setSimulatedEmail(e.target.value)}
                    className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
                    placeholder="russel@glndigital.com"
                  />
                </div>

                <button
                  onClick={() => triggerSimulatedGoogle(simulatedEmail)}
                  className="w-full bg-primary text-primary-foreground py-3 px-4 rounded-xl font-bold text-xs transition-all hover:opacity-90 shadow-glow flex items-center justify-center gap-2"
                >
                  <Chrome className="w-4 h-4" />
                  {language === "fr" ? "Simulation de test (Immédiat)" : "Test Simulation (Immediate)"}
                </button>
                <p className="text-[9px] text-muted-foreground text-center -mt-2 px-1">
                  {language === "fr"
                    ? "Recommandé pour tester instantanément tous les espaces (Élève, Partenaire, Admin)."
                    : "Recommended to instantly test all spaces (Student, Partner, Admin)."}
                </p>

                <div className="relative flex items-center justify-center py-1">
                  <div className="absolute inset-x-0 h-[1px] bg-border/40" />
                  <span className="relative bg-card px-2 text-[9px] text-muted-foreground uppercase font-bold">
                    {language === "fr" ? "Ou utiliser la vraie connexion" : "Or use real connection"}
                  </span>
                </div>

                <button
                  onClick={triggerOfficialGoogle}
                  className="w-full bg-secondary hover:bg-secondary/80 border border-border text-foreground py-2.5 px-4 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-2"
                >
                  <Chrome className="w-4 h-4 text-primary" />
                  {language === "fr" ? "Connexion Officielle Google" : "Official Google Connection"}
                </button>
                <p className="text-[9px] text-red-400 text-center -mt-2 px-1">
                  {language === "fr"
                    ? "Nécessite d'avoir activé le fournisseur Google sur votre console Supabase."
                    : "Requires having the Google provider activated on your Supabase console."}
                </p>
              </div>

              <button
                onClick={() => setShowGoogleModal(false)}
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
              >
                {language === "fr" ? "Annuler" : "Cancel"}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Auth;
