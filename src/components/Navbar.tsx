import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, User, LogOut, ChevronDown, RefreshCw, PlusCircle, Shield, ShieldAlert, Globe } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { toast } from "sonner";
import logo from "@/assets/logo.png";

const Navbar = () => {
  const { t, language, setLanguage } = useLanguage();
  const [open, setOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { label: t("nav.home"), path: "/" },
    { label: t("nav.about"), path: "/a-propos" },
    { label: t("nav.services"), path: "/services" },
    { label: t("nav.courses"), path: "/formations" },
    { label: t("nav.partnerships"), path: "/partenaires" },
    { label: t("nav.portfolio"), path: "/portfolio" },
    { label: t("nav.blog"), path: "/blog" },
  ];

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [location.pathname]);

  const fetchProfile = async (userId: string) => {
    const userStatus = localStorage.getItem(`gln_user_status_${userId}`) || "active";
    if (userStatus === "inactive") {
      // Deactivated user: force sign out
      localStorage.removeItem("gln_trust_device");
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      toast.error("Votre compte a été désactivé par un administrateur.");
      navigate("/auth");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      if (!error && data) {
        setProfile(data);
      }
    } catch (err) {
      console.error("Error fetching profile in Navbar:", err);
    }
  };

  const handleSignOut = async () => {
    localStorage.removeItem("gln_trust_device");

    try {
      const deviceToken = localStorage.getItem("gln_device_token");
      if (user && deviceToken && profile) {
        const updatedSessions = (profile.active_sessions || []).filter((s: string) => s !== deviceToken);
        await supabase
          .from("profiles")
          .update({ active_sessions: updatedSessions })
          .eq("id", user.id);
      }
    } catch (err) {
      console.error("Error during session logout cleanup:", err);
    }
    await supabase.auth.signOut();
    toast.success("Déconnexion réussie !");
    setDropdownOpen(false);
    navigate("/");
  };

  const switchRole = async (newRole: string) => {
    if (!user || !profile) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ current_role: newRole })
        .eq("id", user.id);

      if (error) throw error;

      toast.success(`Rôle basculé : ${newRole === 'student' ? 'Élève' : 'Partenaire'}`);
      setProfile((prev: any) => prev ? { ...prev, current_role: newRole } : null);
      setDropdownOpen(false);
      
      if (newRole === "partner") {
        navigate("/partenaires-dashboard");
      } else {
        navigate("/eleve-dashboard");
      }
    } catch (err: any) {
      toast.error(err.message || "Erreur lors du basculement.");
    }
  };

  const addAndSwitchRole = async (newRole: string) => {
    if (!user || !profile) return;

    try {
      const updatedRoles = [...(profile.roles || []), newRole];
      const { error } = await supabase
        .from("profiles")
        .update({ roles: updatedRoles, current_role: newRole })
        .eq("id", user.id);

      if (error) throw error;

      toast.success(`Nouveau rôle activé : ${newRole === 'student' ? 'Élève' : 'Partenaire'}`);
      setProfile((prev: any) => prev ? { ...prev, roles: updatedRoles, current_role: newRole } : null);
      setDropdownOpen(false);

      if (newRole === "partner") {
        navigate("/partenaires-dashboard");
      } else {
        navigate("/eleve-dashboard");
      }
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'activation.");
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="container mx-auto px-4 md:px-8 flex items-center justify-between h-16 md:h-20">
        <Link to="/" className="flex min-w-0 items-center gap-2">
          <img src={logo} alt="GLN Digital logo" className="h-9 sm:h-10 md:h-12 w-auto shrink-0" />
          <span className="font-heading text-lg sm:text-xl md:text-2xl font-bold tracking-tight truncate">
            <span className="text-gradient-primary">GLN</span>{" "}
            <span className="text-foreground">DIGITAL</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`text-sm font-medium transition-colors hover:text-primary ${
                location.pathname === item.path ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {item.label}
            </Link>
          ))}

          {/* User Menu or Login link */}
          {user && profile ? (
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl bg-secondary/80 hover:bg-secondary border border-border/80 text-foreground transition-all"
              >
                <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                  {profile.full_name?.charAt(0) || "U"}
                </div>
                <span className="max-w-[120px] truncate">{profile.full_name}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary uppercase font-extrabold tracking-wider">
                  {profile.current_role === 'student' ? 'Élève' : profile.current_role === 'partner' ? 'Partenaire' : profile.current_role}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2 w-64 rounded-2xl bg-card border border-border/60 p-2 shadow-glow z-50 text-foreground"
                  >
                    <div className="px-3 py-2.5 border-b border-border/50">
                      <p className="text-xs font-bold truncate">{profile.full_name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{profile.email}</p>
                    </div>

                    <div className="py-1.5 space-y-1">
                      {/* Admin panel link — separate from "Mon Tableau de bord" below, which
                          only ever targets the student/partner dashboards. Without this, an
                          admin/super_admin account had no way to reach /admin from the navbar
                          at all (bug found 2026-08-22: current_role="admin" silently fell
                          through to the student dashboard). */}
                      {(profile.roles?.includes('admin') || profile.roles?.includes('super_admin')) && (
                        <Link
                          to="/admin"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 w-full text-left px-3 py-2 rounded-xl text-xs hover:bg-secondary transition-colors font-semibold"
                        >
                          <ShieldAlert className="w-4 h-4 text-primary" />
                          Panneau d'administration
                        </Link>
                      )}

                      {/* Dashboard Link based on active role */}
                      <Link
                        to={profile.current_role === 'partner' ? '/partenaires-dashboard' : '/eleve-dashboard'}
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 w-full text-left px-3 py-2 rounded-xl text-xs hover:bg-secondary transition-colors"
                      >
                        <Shield className="w-4 h-4 text-primary" />
                        Mon Tableau de bord
                      </Link>

                      {/* Switch options */}
                      {profile.roles?.includes('student') && profile.current_role !== 'student' && (
                        <button
                          onClick={() => switchRole('student')}
                          className="flex items-center gap-2.5 w-full text-left px-3 py-2 rounded-xl text-xs hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <RefreshCw className="w-4 h-4 text-blue-400" />
                          Basculer vers l'Espace Élève
                        </button>
                      )}

                      {profile.roles?.includes('partner') && profile.current_role !== 'partner' && (
                        <button
                          onClick={() => switchRole('partner')}
                          className="flex items-center gap-2.5 w-full text-left px-3 py-2 rounded-xl text-xs hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <RefreshCw className="w-4 h-4 text-amber-400" />
                          Basculer vers Espace Partenaire
                        </button>
                      )}

                      {/* Option to join/activate the other role */}
                      {!profile.roles?.includes('partner') && (
                        <button
                          onClick={() => addAndSwitchRole('partner')}
                          className="flex items-center gap-2.5 w-full text-left px-3 py-2 rounded-xl text-xs text-primary hover:bg-primary/5 transition-colors font-semibold"
                        >
                          <PlusCircle className="w-4 h-4" />
                          Devenir Partenaire / Closer
                        </button>
                      )}

                      {!profile.roles?.includes('student') && (
                        <button
                          onClick={() => addAndSwitchRole('student')}
                          className="flex items-center gap-2.5 w-full text-left px-3 py-2 rounded-xl text-xs text-primary hover:bg-primary/5 transition-colors font-semibold"
                        >
                          <PlusCircle className="w-4 h-4" />
                          Rejoindre l'Académie
                        </button>
                      )}
                    </div>

                    <div className="border-t border-border/50 pt-1.5 mt-1">
                      <button
                        onClick={handleSignOut}
                        className="flex items-center gap-2.5 w-full text-left px-3 py-2 rounded-xl text-xs text-red-400 hover:bg-red-500/10 transition-colors font-medium"
                      >
                        <LogOut className="w-4 h-4" />
                        Se déconnecter
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <Link
              to="/auth"
              className="text-xs font-semibold px-3 py-1.5 rounded-md border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
            >
              {t("nav.login")}
            </Link>
          )}

          <Link
            to="/audit"
            className="bg-gradient-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity shadow-glow"
          >
            {t("nav.cta")}
          </Link>

          {/* Premium Language Switcher Toggle */}
          <button
            onClick={() => setLanguage(language === "fr" ? "en" : "fr")}
            className="text-xs font-bold px-2.5 py-1.5 rounded-xl bg-secondary/80 hover:bg-secondary border border-border/80 text-foreground transition-all flex items-center gap-1.5"
            title={language === "fr" ? "Switch to English" : "Basculer en Français"}
          >
            <Globe className="w-3.5 h-3.5 text-primary" />
            <span>{language === "fr" ? "FR" : "EN"}</span>
          </button>
        </div>

        {/* Mobile toggle */}
        <button onClick={() => setOpen(!open)} className="md:hidden text-foreground">
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden glass border-t border-border max-h-[calc(100dvh-4rem)] overflow-y-auto"
          >
            <div className="flex flex-col px-4 py-4 pb-6 gap-3">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setOpen(false)}
                  className={`text-sm font-medium py-2 ${
                    location.pathname === item.path ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              ))}

              {user && profile ? (
                <div className="border-t border-border/20 pt-3 mt-1 space-y-2">
                  <div className="px-2 py-1 text-xs text-muted-foreground">
                    Connecté : <span className="text-foreground font-bold">{profile.full_name}</span>
                  </div>
                  
                  {/* Admin panel link — see desktop dropdown above for why this is separate
                      from "Mon Tableau de bord" (that link never reached /admin). */}
                  {(profile.roles?.includes('admin') || profile.roles?.includes('super_admin')) && (
                    <Link
                      to="/admin"
                      onClick={() => setOpen(false)}
                      className="block text-sm py-2 text-primary font-semibold"
                    >
                      Panneau d'administration
                    </Link>
                  )}

                  {/* Dashboard link */}
                  <Link
                    to={profile.current_role === 'partner' ? '/partenaires-dashboard' : '/eleve-dashboard'}
                    onClick={() => setOpen(false)}
                    className="block text-sm py-2 text-primary font-semibold"
                  >
                    Mon Tableau de bord ({profile.current_role === 'student' ? 'Élève' : profile.current_role === 'partner' ? 'Partenaire' : profile.current_role})
                  </Link>

                  {/* Switch roles mobile */}
                  {profile.roles?.includes('student') && profile.current_role !== 'student' && (
                    <button
                      onClick={() => { switchRole('student'); setOpen(false); }}
                      className="flex items-center gap-2 w-full text-left py-2 text-xs text-muted-foreground"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Basculer vers l'Espace Élève
                    </button>
                  )}

                  {profile.roles?.includes('partner') && profile.current_role !== 'partner' && (
                    <button
                      onClick={() => { switchRole('partner'); setOpen(false); }}
                      className="flex items-center gap-2 w-full text-left py-2 text-xs text-muted-foreground"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Basculer vers Espace Partenaire
                    </button>
                  )}

                  {/* Join other role mobile */}
                  {!profile.roles?.includes('partner') && (
                    <button
                      onClick={() => { addAndSwitchRole('partner'); setOpen(false); }}
                      className="w-full text-left py-2 text-xs text-primary font-semibold"
                    >
                      + Devenir Partenaire / Closer
                    </button>
                  )}

                  {!profile.roles?.includes('student') && (
                    <button
                      onClick={() => { addAndSwitchRole('student'); setOpen(false); }}
                      className="w-full text-left py-2 text-xs text-primary font-semibold"
                    >
                      + Rejoindre l'Académie
                    </button>
                  )}

                  <button
                    onClick={() => { handleSignOut(); setOpen(false); }}
                    className="flex items-center gap-2 w-full text-left py-2 text-sm text-red-400 font-semibold"
                  >
                    <LogOut className="w-4 h-4" /> Se déconnecter
                  </button>
                </div>
              ) : (
                <Link
                  to="/auth"
                  onClick={() => setOpen(false)}
                  className="text-sm font-semibold py-2 text-primary border-t border-border/20 mt-1"
                >
                  {t("nav.login")}
                </Link>
              )}

              <Link
                to="/audit"
                onClick={() => setOpen(false)}
                className="bg-gradient-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-semibold text-center mt-2 shadow-glow"
              >
                {t("nav.cta")}
              </Link>

              {/* Mobile Language Switcher */}
              <div className="flex items-center justify-between border-t border-border/20 pt-3 mt-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5" /> Langue / Language
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setLanguage("fr"); setOpen(false); }}
                    className={`text-xs px-2.5 py-1 rounded-md font-bold ${language === "fr" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground border border-border"}`}
                  >
                    FR
                  </button>
                  <button
                    onClick={() => { setLanguage("en"); setOpen(false); }}
                    className={`text-xs px-2.5 py-1 rounded-md font-bold ${language === "en" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground border border-border"}`}
                  >
                    EN
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
