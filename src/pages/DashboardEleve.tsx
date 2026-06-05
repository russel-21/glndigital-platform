import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BookOpen, Award, PlayCircle, Lock, Download, AlertTriangle, EyeOff, FileText, Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/useLanguage";
// Mock student profile & content
const student = {
  name: "Russel N.",
  email: "russel@glndigital.com",
  level: "Master Ads",
  progress: 45,
  courses: [
    {
      id: "meta-ads",
      title: "Marketing Digital & Meta Ads Pro",
      modules: [
        {
          title: "Module 1 : Les Fondations du Tunnel Publicitaire",
          unlocked: true,
          videos: [
            { id: "v1", title: "1.1 Introduction au Copywriting publicitaire", duration: "12:35", watched: true },
            { id: "v2", title: "1.2 Définir son offre irrésistible", duration: "18:40", watched: false },
          ]
        },
        {
          title: "Module 2 : Configuration Technique Avancée",
          unlocked: true,
          videos: [
            { id: "v3", title: "2.1 Sécuriser son Business Manager", duration: "14:15", watched: false },
            { id: "v4", title: "2.2 Installer et tester l'API de Conversion", duration: "22:10", watched: false },
          ]
        },
        {
          title: "Module 3 : Analyse des métriques et Scaling (Verrouillé)",
          unlocked: false,
          videos: [
            { id: "v5", title: "3.1 Lire son dashboard Ads Manager", duration: "16:20", watched: false },
          ]
        }
      ]
    }
  ]
};

import { useNavigate, Link } from "react-router-dom";
import { getCourses, saveCourses, getYoutubeId } from "@/lib/coursesStore";
import { getAuditRequests } from "@/lib/auditStore";
import { getNotificationsForUser, markAsRead, markAllAsReadForUser, Notification } from "@/lib/notificationsStore";

const DashboardEleve = () => {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const courses = getCourses();
  const [activeCourse, setActiveCourse] = useState<any>(courses[0] || student.courses[0]);
  const [selectedVideo, setSelectedVideo] = useState<string>(activeCourse?.modules[0]?.videos[0]?.id || "v1");
  const [isSecure, setIsSecure] = useState<boolean>(true);
  const [profile, setProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"services" | "formations">("services");
  const [expandedService, setExpandedService] = useState<string | null>(null);
  const [serviceFeedback, setServiceFeedback] = useState<string>("");
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const handleNotificationsChanged = () => {
      if (profile?.email) {
        setNotifications(getNotificationsForUser(profile.email, profile.phone));
      }
    };
    
    handleNotificationsChanged();
    
    window.addEventListener("gln_notifications_changed", handleNotificationsChanged);
    return () => {
      window.removeEventListener("gln_notifications_changed", handleNotificationsChanged);
    };
  }, [profile]);

  // Find current user's audit request
  const allAudits = getAuditRequests();
  const userAudit = allAudits.find(
    (a) =>
      (a.email?.toLowerCase() === profile?.email?.toLowerCase() && profile?.email) ||
      (a.phone === profile?.phone && profile?.phone)
  );

  useEffect(() => {
    if (expandedService && profile?.id) {
      const fb = localStorage.getItem(`gln_feedback_${profile.id}_${expandedService}`) || "";
      setServiceFeedback(fb);
    }
  }, [expandedService, profile]);

  const handleSaveFeedback = (serviceId: string) => {
    if (!profile?.id) return;
    localStorage.setItem(`gln_feedback_${profile.id}_${serviceId}`, serviceFeedback);
    toast.success("Vos retours ont été enregistrés et transmis à l'équipe GLN Digital !");
  };

  // Quiz and Transcription states
  const [showQuizModal, setShowQuizModal] = useState<boolean>(false);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState<boolean>(false);
  const [transLang, setTransLang] = useState<"fr" | "en">("fr");

  // Official info form states
  const [formOfficialName, setFormOfficialName] = useState("");
  const [formCountryCode, setFormCountryCode] = useState("+237");
  const [formPhoneLocal, setFormPhoneLocal] = useState("");
  const [formBirthDate, setFormBirthDate] = useState("");
  const [formBirthPlace, setFormBirthPlace] = useState("");
  const [formIdNumber, setFormIdNumber] = useState("");

  // Parse official info from local storage or profile
  const localOfficialInfo = profile ? localStorage.getItem(`gln_official_info_${profile.id}`) : null;
  const parsedLocalInfo = localOfficialInfo ? JSON.parse(localOfficialInfo) : null;
  const officialInfo = parsedLocalInfo || (profile?.company_name?.startsWith("{") ? JSON.parse(profile.company_name) : null);

  const isProfileIncomplete = !profile?.full_name?.trim() || 
                              !profile?.phone?.trim() || 
                              profile?.phone === "+237 000 000 000" ||
                              !officialInfo?.birthDate || 
                              !officialInfo?.birthPlace || 
                              !officialInfo?.idNumber;

  useEffect(() => {
    if (profile) {
      setFormOfficialName(profile.full_name || "");
      if (profile.phone && profile.phone.includes(" ")) {
        const parts = profile.phone.split(" ");
        setFormCountryCode(parts[0]);
        setFormPhoneLocal(parts.slice(1).join(" "));
      } else if (profile.phone) {
        setFormPhoneLocal(profile.phone);
      }
      
      const localInfo = localStorage.getItem(`gln_official_info_${profile.id}`);
      let parsed = null;
      if (localInfo) {
        try { parsed = JSON.parse(localInfo); } catch {}
      } else if (profile.company_name?.startsWith("{")) {
        try { parsed = JSON.parse(profile.company_name); } catch {}
      }
      if (parsed) {
        setFormBirthDate(parsed.birthDate || "");
        setFormBirthPlace(parsed.birthPlace || "");
        setFormIdNumber(parsed.idNumber || "");
      }
    }
  }, [profile]);

  const handleSaveOfficialInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    if (!formOfficialName.trim() || !formBirthDate || !formBirthPlace.trim() || !formIdNumber.trim() || !formPhoneLocal.trim()) {
      toast.error("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    const fullPhone = `${formCountryCode} ${formPhoneLocal.trim()}`;
    const officialDetails = {
      birthDate: formBirthDate,
      birthPlace: formBirthPlace.trim(),
      idNumber: formIdNumber.trim()
    };

    try {
      const serialised = JSON.stringify(officialDetails);
      localStorage.setItem(`gln_official_info_${profile.id}`, serialised);

      // Save to Supabase (and profiles local state)
      if (profile.id !== "mock-id" && !profile.id.includes("mock")) {
        const { error } = await supabase
          .from("profiles")
          .update({
            full_name: formOfficialName.trim(),
            phone: fullPhone,
            company_name: serialised
          })
          .eq("id", profile.id);

        if (error) throw error;
      } else {
        // Mock update
        const mockProfile = {
          ...profile,
          full_name: formOfficialName.trim(),
          phone: fullPhone,
          company_name: serialised
        };
        localStorage.setItem("gln_active_mock_profile", JSON.stringify(mockProfile));
      }

      // Update local state profile
      setProfile((prev: any) => prev ? {
        ...prev,
        full_name: formOfficialName.trim(),
        phone: fullPhone,
        company_name: serialised
      } : null);

      toast.success("Fiche d'information officielle enregistrée. Accès aux cours débloqué !");
    } catch (err: any) {
      console.error("Error saving official info:", err);
      toast.error("Erreur de synchronisation. Sauvegarde locale effectuée.");
      
      // Local fallback representation
      const mockProfile = {
        ...profile,
        full_name: formOfficialName.trim(),
        phone: fullPhone,
        company_name: JSON.stringify(officialDetails)
      };
      setProfile(mockProfile);
    }
  };


  // Find current lesson/video object
  let currentLesson: any = null;
  for (const mod of activeCourse.modules) {
    const found = mod.videos.find((v: any) => v.id === selectedVideo);
    if (found) {
      currentLesson = found;
      break;
    }
  }
  if (!currentLesson && activeCourse.modules[0]?.videos[0]) {
    currentLesson = activeCourse.modules[0].videos[0];
  }

  // Auth Protection & Role verification
  useEffect(() => {
    // Check mock admin
    const mockAdmin = localStorage.getItem("gln_mock_admin_session") === "true";
    if (mockAdmin) {
      setProfile({
        full_name: "Russel Yamegni",
        email: "russel@glndigital.com",
        current_role: localStorage.getItem("gln_mock_admin_current_role") || "admin"
      });
      return;
    }

    // Check mock user
    const mockUser = localStorage.getItem("gln_mock_user_logged_in") === "true";
    if (mockUser) {
      const activeMock = localStorage.getItem("gln_active_mock_profile");
      if (activeMock) {
        setProfile(JSON.parse(activeMock));
      }
      return;
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      try {
        if (!session) {
          toast.error("Veuillez vous connecter pour accéder à l'espace élève.");
          navigate("/auth");
          return;
        }
        
        const { data: userProfile, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();
          
        if (error || !userProfile) {
          console.warn("Profile not found in database, falling back to simulated profile.");
          const simulatedEmail = session.user.email || "user@example.com";
          setProfile({
            id: session.user.id,
            email: simulatedEmail,
            full_name: session.user.user_metadata?.full_name || simulatedEmail.split('@')[0],
            phone: session.user.user_metadata?.phone || "+237692062677",
            roles: ["student"],
            current_role: "student"
          });
          return;
        }

        if (userProfile.current_role === "partner") {
          navigate("/partenaires-dashboard");
          return;
        }

        setProfile(userProfile);
      } catch (err) {
        console.error("DashboardEleve auth check error:", err);
        const simulatedEmail = session?.user?.email || "user@example.com";
        setProfile({
          id: session?.user?.id || "mock-id",
          email: simulatedEmail,
          full_name: session?.user?.user_metadata?.full_name || simulatedEmail.split('@')[0],
          phone: session?.user?.user_metadata?.phone || "+237692062677",
          roles: ["student"],
          current_role: "student"
        });
      }
    });
  }, [navigate]);

  // Anti-capture mechanism: Detect tab switching or window losing focus
  useEffect(() => {
    const handleBlur = () => {
      setIsSecure(false);
    };

    const handleFocus = () => {
      setIsSecure(true);
    };

    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);

    // Disable Right Click & F12 / common capture shortcut keys
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey && e.shiftKey && e.key === "I") || // DevTools
        (e.ctrlKey && e.key === "u") || // Source code
        e.key === "PrintScreen" || // PrtSc
        (e.metaKey && e.shiftKey && e.key === "s") // Windows Snipping
      ) {
        e.preventDefault();
        alert("Capture d'écran désactivée pour protéger les droits d'auteur.");
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("contextmenu", handleContextMenu);

    return () => {
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, []);

  const startQuiz = () => {
    setCurrentQuestionIdx(0);
    setSelectedAnswers({});
    setQuizScore(null);
    setQuizSubmitted(false);
    setShowQuizModal(true);
  };

  const handleQuizSubmit = () => {
    const questions = currentLesson?.quiz || [];
    if (questions.length === 0) return;

    let score = 0;
    questions.forEach((q: any, idx: number) => {
      if (selectedAnswers[idx] === q.correctAnswerIndex) {
        score++;
      }
    });

    setQuizScore(score);
    setQuizSubmitted(true);

    if (score >= 7) {
      // Mark current lesson as watched
      currentLesson.watched = true;

      // Find and unlock the next lesson/module
      let foundActive = false;
      let unlockedNext = false;

      const updatedCourses = courses.map((c: any) => {
        if (c.id === activeCourse.id) {
          const modUpdated = c.modules.map((mod: any, modIdx: number) => {
            const vidUpdated = mod.videos.map((vid: any, vidIdx: number) => {
              if (vid.id === currentLesson.id) {
                foundActive = true;
                return { ...vid, watched: true };
              }
              if (foundActive && !unlockedNext) {
                unlockedNext = true;
                return { ...vid, unlocked: true };
              }
              return vid;
            });
            return { ...mod, videos: vidUpdated };
          });

          // Check if we need to unlock the next module
          let checkFound = false;
          const finalModules = modUpdated.map((m: any, mIdx: number) => {
            if (m.videos.some((v: any) => v.id === currentLesson.id)) {
              checkFound = true;
            } else if (checkFound && !unlockedNext) {
              unlockedNext = true;
              return { ...m, unlocked: true };
            }
            return m;
          });

          return { ...c, modules: finalModules };
        }
        return c;
      });

      saveCourses(updatedCourses);
      const updatedActive = updatedCourses.find((c: any) => c.id === activeCourse.id);
      if (updatedActive) {
        setActiveCourse(updatedActive);
      }
      toast.success(`Bravo ! Vous avez réussi le quiz (${score}/10) et débloqué l'étape suivante.`);
    } else {
      toast.error(`Score insuffisant (${score}/10). Vous devez obtenir au moins 7/10 pour continuer.`);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16 bg-background relative select-none">
      <div className="container mx-auto px-4 md:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="font-heading text-2xl md:text-3xl font-extrabold text-foreground">
              {language === "fr" ? "Espace Connecté" : "Connected Space"}
            </h1>
            <p className="text-muted-foreground text-sm">
              {language === "fr" ? "Bonjour, " : "Hello, "}<span className="text-primary font-semibold">{profile?.full_name || student.name}</span> • {language === "fr" ? "Compte membre actif" : "Active member account"}
            </p>
          </div>
          <div className="flex items-center gap-2 bg-secondary px-4 py-2 rounded-xl border border-border">
            <Award className="w-5 h-5 text-accent" />
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">Badge: {student.level}</span>
          </div>
        </div>

        {/* Notifications Center */}
        {notifications.length > 0 && (
          <div className="mb-8 bg-card border border-border/60 rounded-3xl p-6 shadow-glow space-y-4">
            <div className="flex justify-between items-center border-b border-border/40 pb-3">
              <h3 className="font-heading font-bold text-sm text-foreground flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary animate-bounce-slow" />
                {language === "fr" ? "Notifications de suivi d'Audit" : "Audit Tracking Notifications"}
                {notifications.some(n => n.status === "unread") && (
                  <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                )}
              </h3>
              {notifications.some(n => n.status === "unread") && (
                <button 
                  onClick={() => markAllAsReadForUser(profile?.email, profile?.phone)}
                  className="text-[10px] text-primary hover:underline font-semibold"
                >
                  {language === "fr" ? "Tout marquer comme lu" : "Mark all as read"}
                </button>
              )}
            </div>
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
              {notifications.map((notif) => (
                <div 
                  key={notif.id} 
                  className={`p-3 rounded-2xl border text-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition-all ${
                    notif.status === "unread" 
                      ? "bg-primary/5 border-primary/20" 
                      : "bg-secondary/40 border-border/40 text-muted-foreground"
                  }`}
                >
                  <div className="space-y-1 flex-1">
                    <p className="font-medium text-foreground">
                      {language === "fr" ? notif.messageFr : notif.messageEn}
                    </p>
                    <span className="text-[9px] text-muted-foreground block">
                      {new Date(notif.createdAt).toLocaleString(language === "fr" ? "fr-FR" : "en-US")}
                    </span>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {notif.type === "audit_completed" && (
                      <Link 
                        to={`/audit/rapport/${notif.auditId}`}
                        onClick={() => markAsRead(notif.id)}
                        className="bg-primary text-primary-foreground text-[10px] font-bold h-7 px-3 rounded-lg flex items-center gap-1 hover:opacity-90 transition-all shadow-glow"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        {language === "fr" ? "Voir le rapport" : "View Report"}
                      </Link>
                    )}
                    {notif.status === "unread" && (
                      <button 
                        onClick={() => markAsRead(notif.id)}
                        className="text-[10px] text-muted-foreground hover:text-foreground border border-border px-2.5 py-1 rounded-lg hover:bg-secondary transition-all"
                      >
                        {language === "fr" ? "Marquer comme lu" : "Mark read"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex gap-6 border-b border-border/40 pb-px mb-8">
          <button
            onClick={() => setActiveTab("services")}
            className={`pb-4 text-sm font-bold uppercase tracking-wider transition-colors relative ${
              activeTab === "services"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {language === "fr" ? "Mes Services & Audits" : "My Services & Audits"}
            {activeTab === "services" && (
              <motion.div
                layoutId="activeTabUnderline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
          </button>
          <button
            onClick={() => setActiveTab("formations")}
            className={`pb-4 text-sm font-bold uppercase tracking-wider transition-colors relative ${
              activeTab === "formations"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {language === "fr" ? "Mes Formations (Académie)" : "My Courses (Academy)"}
            {activeTab === "formations" && (
              <motion.div
                layoutId="activeTabUnderline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
          </button>
        </div>

        {activeTab === "services" ? (
          /* Espace Services & Audits */
          <div className="space-y-8 animate-fade-in">
            {/* Audit Status Section */}
            {userAudit ? (
              userAudit.status === "completed" ? (
                <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 flex flex-col md:flex-row justify-between items-center gap-4 shadow-glow">
                  <div className="space-y-1">
                    <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                      {language === "fr" ? "Audit Finalisé" : "Audit Completed"}
                    </span>
                    <h3 className="font-heading font-bold text-lg text-foreground mt-2">
                      {language === "fr" ? "Votre Rapport d'Audit est Prêt !" : "Your Audit Report is Ready!"}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {language === "fr" ? "Consultez l'analyse stratégique complète de votre présence digitale." : "View the complete strategic analysis of your digital presence."}
                    </p>
                  </div>
                  <button
                    onClick={() => navigate(`/audit/rapport/${userAudit.id}`)}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs py-3 px-6 rounded-xl transition-all shadow-glow whitespace-nowrap"
                  >
                    {language === "fr" ? "Consulter le Rapport d'Audit" : "View Audit Report"}
                  </button>
                </div>
              ) : (
                <div className="p-6 rounded-3xl bg-secondary/40 border border-border/80 flex flex-col md:flex-row justify-between items-center gap-4 shadow-glow">
                  <div className="space-y-1">
                    <span className="bg-amber-500/20 text-amber-400 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                      {language === "fr" ? "Audit en cours de traitement" : "Audit Under Review"}
                    </span>
                    <h3 className="font-heading font-bold text-lg text-foreground mt-2">
                      {language === "fr" ? "Votre Audit Gratuit est en cours d'analyse" : "Your Free Audit is Under Analysis"}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {language === "fr" ? "Nos 7 moteurs d'IA analysent vos comptes et votre site web. L'équipe GLN finalise le diagnostic." : "Our 7 AI engines are analyzing your profiles and website. The GLN team is finalizing the diagnosis."}
                    </p>
                  </div>
                  <div className="bg-amber-500/20 text-amber-400 text-xs font-extrabold px-4 py-2 rounded-xl border border-amber-500/30 animate-pulse whitespace-nowrap">
                    {language === "fr" ? "80% Complété (IA)" : "80% Completed (AI)"}
                  </div>
                </div>
              )
            ) : (
              <div className="p-6 rounded-3xl bg-secondary/40 border border-border/80 flex flex-col md:flex-row justify-between items-center gap-4 shadow-glow">
                <div className="space-y-1">
                  <span className="bg-primary/20 text-primary text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    {language === "fr" ? "Audit Gratuit" : "Free Audit"}
                  </span>
                  <h3 className="font-heading font-bold text-lg text-foreground mt-2">
                    {language === "fr" ? "Prêt à propulser votre entreprise ?" : "Ready to boost your business?"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {language === "fr" ? "Demandez votre audit gratuit et laissez nos 7 moteurs d'IA identifier vos points de blocage." : "Request your free audit and let our 7 AI engines identify your bottleneck points."}
                  </p>
                </div>
                <button
                  onClick={() => navigate("/audit")}
                  className="bg-primary text-primary-foreground font-bold text-xs py-3 px-6 rounded-xl transition-all shadow-glow hover:opacity-90 whitespace-nowrap"
                >
                  {language === "fr" ? "Obtenir mon audit gratuit" : "Get my free audit"}
                </button>
              </div>
            )}

            {/* List of Services */}
            <div>
              <h2 className="font-heading text-xl font-bold text-foreground mb-6">
                {language === "fr" ? "Nos Services Stratégiques" : "Our Strategic Services"}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  {
                    id: "social-media",
                    title: language === "fr" ? "Gestion des réseaux sociaux (Social Media)" : "Social Media Management",
                    description: language === "fr"
                      ? "Optimisation de profils, production de contenu régulier, planification éditoriale et gestion de communauté."
                      : "Profile optimization, regular content production, editorial planning, and community management.",
                    deliverables: language === "fr"
                      ? ["Calendrier éditorial hebdomadaire", "Design de grilles graphiques (Figma/Canva)", "Scripts de Reels/Shorts"]
                      : ["Weekly editorial calendar", "Graphic grids design (Figma/Canva)", "Reels/Shorts scripts"],
                    icon: "📱",
                    color: "border-blue-500/20 hover:border-blue-500/40"
                  },
                  {
                    id: "meta-ads",
                    title: language === "fr" ? "Publicité Meta Ads (Facebook & Instagram)" : "Meta Ads Advertising (Facebook & Instagram)",
                    description: language === "fr"
                      ? "Campagnes d'acquisition de leads qualifiés, remarketing et optimisation de ROI publicitaire."
                      : "Qualified leads acquisition campaigns, remarketing, and advertising ROI optimization.",
                    deliverables: language === "fr"
                      ? ["Brouillons de textes publicitaires", "Visuels publicitaires de campagne", "Rapports de performance Ads Manager"]
                      : ["Ad copywriting drafts", "Campaign advertising visuals", "Ads Manager performance reports"],
                    icon: "📢",
                    color: "border-purple-500/20 hover:border-purple-500/40"
                  },
                  {
                    id: "web-dev",
                    title: language === "fr" ? "Création de site internet professionnel" : "Professional Website Creation",
                    description: language === "fr"
                      ? "Conception, développement sur-mesure ou CMS, référencement naturel (SEO) et intégration de CTA de conversion."
                      : "Design, custom or CMS development, search engine optimization (SEO), and integration of conversion CTAs.",
                    deliverables: language === "fr"
                      ? ["Maquettes Figma interactives", "Lien de Staging préproduction", "Optimisation Lighthouse & Core Web Vitals"]
                      : ["Interactive Figma mockups", "Staging preproduction link", "Lighthouse & Core Web Vitals optimization"],
                    icon: "💻",
                    color: "border-cyan-500/20 hover:border-cyan-500/40"
                  },
                  {
                    id: "video-creation",
                    title: language === "fr" ? "Création de contenu vidéo & Visuels" : "Video Content & Visuals Creation",
                    description: language === "fr"
                      ? "Rédaction de scripts, storyboards et montage vidéo professionnel optimisé pour Reels, TikTok et Shorts."
                      : "Script writing, storyboards, and professional video editing optimized for Reels, TikTok, and Shorts.",
                    deliverables: language === "fr"
                      ? ["Scripts de vidéos", "Vidéos montées (Full HD)", "Fichiers sources graphiques"]
                      : ["Video scripts", "Edited videos (Full HD)", "Graphic source files"],
                    icon: "🎥",
                    color: "border-red-500/20 hover:border-red-500/40"
                  },
                  {
                    id: "mentorship",
                    title: language === "fr" ? "Formation & Accompagnement Marketing Digital" : "Digital Marketing Training & Mentorship",
                    description: language === "fr"
                      ? "Mentoring personnalisé hebdomadaire en tête-à-tête avec un expert pour structurer vos tunnels de vente."
                      : "Weekly personalized 1-on-1 mentoring with an expert to structure your sales funnels.",
                    deliverables: language === "fr"
                      ? ["Plan d'action sur-mesure", "Accès à la bibliothèque de ressources", "Support direct 1-to-1"]
                      : ["Tailored action plan", "Access to resource library", "Direct 1-to-1 support"],
                    icon: "🎓",
                    color: "border-amber-500/20 hover:border-amber-500/40"
                  }
                ].map((service) => {
                  const isExpanded = expandedService === service.id;
                  const hasRequested = localStorage.getItem(`gln_service_requested_${profile?.id || "guest"}_${service.id}`) === "true";
                  
                  return (
                    <div
                      key={service.id}
                      className={`p-6 rounded-3xl bg-card border ${service.color} transition-all shadow-glow flex flex-col justify-between space-y-4`}
                    >
                      <div>
                        <div className="flex justify-between items-start">
                          <span className="text-3xl">{service.icon}</span>
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
                            hasRequested ? "bg-emerald-500/10 text-emerald-400" : "bg-secondary text-muted-foreground"
                          }`}>
                            {hasRequested 
                              ? (language === "fr" ? "Service Demandé" : "Service Requested") 
                              : (language === "fr" ? "Non demandé" : "Not requested")}
                          </span>
                        </div>
                        <h3 className="font-heading font-extrabold text-base mt-4 text-foreground">{service.title}</h3>
                        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{service.description}</p>
                      </div>

                      {isExpanded ? (
                        <div className="space-y-4 pt-4 border-t border-border/40 animate-fade-in">
                          <div className="space-y-2">
                            <h4 className="text-xs font-bold text-foreground">
                              {language === "fr" ? "Étapes de production :" : "Production stages:"}
                            </h4>
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-2 text-xs">
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                <span className="font-semibold text-foreground">
                                  {language === "fr" ? "Étape 1 : Réception du Brief (Validé)" : "Stage 1: Brief Received (Approved)"}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-xs">
                                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                <span className="font-semibold text-foreground">
                                  {language === "fr" ? "Étape 2 : Création des premières maquettes (En cours)" : "Stage 2: Mockups creation (In progress)"}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-xs">
                                <span className="w-2 h-2 rounded-full bg-secondary" />
                                <span className="font-semibold text-muted-foreground">
                                  {language === "fr" ? "Étape 3 : Livraison finale (En attente)" : "Stage 3: Final delivery (Pending)"}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <h4 className="text-xs font-bold text-foreground">
                              {language === "fr" ? "Livrables intermédiaires :" : "Intermediate deliverables:"}
                            </h4>
                            <div className="grid grid-cols-1 gap-2">
                              {service.deliverables.map((deliv, idx) => (
                                <div key={idx} className="flex justify-between items-center p-2.5 bg-secondary/50 rounded-xl border border-border/60 text-xs">
                                  <span className="font-medium text-foreground">{deliv}</span>
                                  <span className="text-[10px] text-amber-400 font-bold">
                                    {language === "fr" ? "En préparation" : "In preparation"}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase block">
                              {language === "fr" ? "Vos retours ou demandes de modifications :" : "Your feedback or revision requests:"}
                            </label>
                            <textarea
                              value={serviceFeedback}
                              onChange={(e) => setServiceFeedback(e.target.value)}
                              placeholder={language === "fr" ? "Écrivez vos remarques ici..." : "Write your remarks here..."}
                              className="w-full bg-secondary border border-border rounded-xl p-3 text-xs text-foreground focus:outline-none focus:border-primary min-h-[80px]"
                            />
                            <button
                              onClick={() => handleSaveFeedback(service.id)}
                              className="w-full bg-primary text-primary-foreground text-xs font-bold py-2.5 rounded-xl transition-all shadow-glow hover:opacity-90"
                            >
                              {language === "fr" ? "Transmettre mes retours" : "Submit feedback"}
                            </button>
                          </div>

                          <button
                            onClick={() => setExpandedService(null)}
                            className="w-full text-center text-xs text-muted-foreground hover:text-foreground font-semibold mt-2"
                          >
                            {language === "fr" ? "Réduire" : "Collapse"}
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2 pt-2">
                          <button
                            onClick={() => {
                              if (!hasRequested) {
                                  localStorage.setItem(`gln_service_requested_${profile?.id || "guest"}_${service.id}`, "true");
                                  toast.success(
                                    language === "fr" 
                                      ? `Votre demande pour le service "${service.title}" a été enregistrée !`
                                      : `Your request for the service "${service.title}" has been registered!`
                                  );
                                  setExpandedService(service.id);
                              } else {
                                setExpandedService(service.id);
                              }
                            }}
                            className="flex-1 bg-primary text-primary-foreground font-bold text-xs py-3 rounded-xl transition-all shadow-glow hover:opacity-90 text-center"
                          >
                            {hasRequested 
                              ? (language === "fr" ? "Suivre mon projet" : "Track my project")
                              : (language === "fr" ? "Demander ce service" : "Request this service")}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* Dashboard Grid for Formations */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
            {/* Main Content Area (Video Player & Info) */}
            <div className="lg:col-span-2 space-y-6">
              {isProfileIncomplete ? (
                <div className="bg-card border border-border/60 rounded-3xl p-6 md:p-8 space-y-6 shadow-glow">
                  <div className="text-center space-y-2 mb-4">
                    <span className="bg-primary/20 text-primary text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                      {language === "fr" ? "Fiche d'Information Officielle" : "Official Information Sheet"}
                    </span>
                    <h3 className="font-heading text-lg font-bold text-foreground">
                      {language === "fr" ? "Finalisez votre inscription à l'Académie" : "Finalize your Academy Registration"}
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      {language === "fr"
                        ? "Ces détails officiels conformes à votre carte nationale d'identité (CNI) ou acte de naissance sont indispensables pour le suivi et la délivrance de votre certificat de réussite officiel sécurisé par QR Code."
                        : "These official details corresponding to your national ID card (CNI) or birth certificate are essential for tracking and issuing your official QR Code secured completion certificate."}
                    </p>
                  </div>

                  <form onSubmit={handleSaveOfficialInfo} className="space-y-4 max-w-xl mx-auto">
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 block">
                        {language === "fr" ? "Nom complet officiel (Nom & Prénoms CNI) *" : "Official Full Name (CNI Last & First Names) *"}
                      </label>
                      <input
                        type="text"
                        required
                        value={formOfficialName}
                        onChange={(e) => setFormOfficialName(e.target.value)}
                        className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                        placeholder={language === "fr" ? "Ex: Jean-Pierre Yamegni" : "e.g., John Smith"}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 block">
                          {language === "fr" ? "Date de naissance *" : "Date of Birth *"}
                        </label>
                        <input
                          type="date"
                          required
                          value={formBirthDate}
                          onChange={(e) => setFormBirthDate(e.target.value)}
                          className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 block">
                          {language === "fr" ? "Lieu de naissance *" : "Place of Birth *"}
                        </label>
                        <input
                          type="text"
                          required
                          value={formBirthPlace}
                          onChange={(e) => setFormBirthPlace(e.target.value)}
                          className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                          placeholder={language === "fr" ? "Ex: Yaoundé" : "e.g., Douala"}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 block">
                          {language === "fr" ? "N° de CNI ou d'acte de naissance *" : "CNI or Birth Certificate No. *"}
                        </label>
                        <input
                          type="text"
                          required
                          value={formIdNumber}
                          onChange={(e) => setFormIdNumber(e.target.value)}
                          className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                          placeholder="Ex: 100456789"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 block">
                          {language === "fr" ? "Numéro de Téléphone *" : "Phone Number *"}
                        </label>
                        <div className="flex gap-2">
                          <select
                            value={formCountryCode}
                            onChange={(e) => setFormCountryCode(e.target.value)}
                            className="bg-secondary border border-border rounded-xl px-2 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary w-36"
                          >
                            <option value="+237">+237 (Cameroun)</option>
                            <option value="+225">+225 (Côte d'Ivoire)</option>
                            <option value="+221">+221 (Sénégal)</option>
                            <option value="+242">+242 (Congo-Brazzaville)</option>
                            <option value="+243">+243 (Congo-Kinshasa)</option>
                            <option value="+229">+229 (Bénin)</option>
                            <option value="+228">+228 (Togo)</option>
                            <option value="+241">+241 (Gabon)</option>
                            <option value="+235">+235 (Tchad)</option>
                            <option value="+226">+226 (Burkina Faso)</option>
                            <option value="+212">+212 (Maroc)</option>
                            <option value="+213">+213 (Algérie)</option>
                            <option value="+216">+216 (Tunisie)</option>
                            <option value="+20">+20 (Égypte)</option>
                            <option value="+27">+27 (Afrique du Sud)</option>
                            <option value="+234">+234 (Nigéria)</option>
                            <option value="+254">+254 (Kenya)</option>
                            <option value="+233">+233 (Ghana)</option>
                            <option value="+223">+223 (Mali)</option>
                            <option value="+227">+227 (Niger)</option>
                            <option value="+224">+224 (Guinée)</option>
                            <option value="+261">+261 (Madagascar)</option>
                            <option value="+236">+236 (Centrafrique)</option>
                            <option value="+222">+222 (Mauritanie)</option>
                            <option value="+250">+250 (Rwanda)</option>
                            <option value="+257">+257 (Burundi)</option>
                            <option value="+253">+253 (Djibouti)</option>
                            <option value="+240">+240 (Guinée Équatoriale)</option>
                            <option value="+244">+244 (Angola)</option>
                            <option value="+258">+258 (Mozambique)</option>
                            <option value="+238">+238 (Cap-Vert)</option>
                            <option value="+269">+269 (Comores)</option>
                            <option value="+230">+230 (Île Maurice)</option>
                            <option value="+248">+248 (Seychelles)</option>
                            <option value="+249">+249 (Soudan)</option>
                            <option value="+252">+252 (Somalie)</option>
                            <option value="+251">+251 (Éthiopie)</option>
                            <option value="+291">+291 (Érythrée)</option>
                            <option value="+211">+211 (Soudan du Sud)</option>
                            <option value="+256">+256 (Ouganda)</option>
                            <option value="+255">+255 (Tanzanie)</option>
                            <option value="+260">+260 (Zambie)</option>
                            <option value="+263">+263 (Zimbabwe)</option>
                            <option value="+265">+265 (Malawi)</option>
                            <option value="+264">+264 (Namibie)</option>
                            <option value="+267">+267 (Botswana)</option>
                            <option value="+266">+266 (Lesotho)</option>
                            <option value="+268">+268 (Eswatini)</option>
                            <option value="+220">+220 (Gambie)</option>
                            <option value="+232">+232 (Sierra Leone)</option>
                            <option value="+231">+231 (Libéria)</option>
                            <option value="+245">+245 (Guinée-Bissau)</option>
                            <option value="+239">+239 (Sao Tomé-et-Principe)</option>
                            <option value="+33">+33 (France)</option>
                            <option value="+32">+32 (Belgique)</option>
                            <option value="+41">+41 (Suisse)</option>
                            <option value="+1">+1 (Canada/USA)</option>
                          </select>
                          <input
                            type="tel"
                            required
                            value={formPhoneLocal}
                            onChange={(e) => setFormPhoneLocal(e.target.value)}
                            className="bg-secondary border border-border rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary flex-1"
                            placeholder="6xx xxx xxx"
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-gradient-primary text-primary-foreground py-3.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-glow mt-4"
                    >
                      {language === "fr" ? "Enregistrer et Débloquer la Formation" : "Save and Unlock Course"}
                    </button>
                  </form>
                </div>
              ) : (
                <>
                  <div className="relative aspect-video rounded-3xl overflow-hidden bg-black border border-border/60">
                    {/* Anti-Capture Overlay inside the video player */}
                    {!isSecure && (
                      <div className="absolute inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center text-center p-6">
                        <EyeOff className="w-12 h-12 text-primary mb-3 animate-pulse" />
                        <h3 className="font-heading text-lg font-bold text-foreground">
                          {language === "fr" ? "Lecteur Sécurisé GLN DIGITAL" : "GLN DIGITAL Secure Player"}
                        </h3>
                        <p className="text-[10px] text-muted-foreground mt-1 max-w-xs">
                          {language === "fr"
                            ? "Veuillez revenir sur l'onglet actif pour reprendre la lecture de votre vidéo."
                            : "Please return to the active tab to resume watching your video."}
                        </p>
                      </div>
                    )}

                    {/* Dynamic Watermark to deter recording */}
                    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-6 select-none opacity-[0.03] text-foreground font-semibold text-sm">
                      <div className="flex justify-between">
                        <span>GLN DIGITAL - {profile?.full_name || student.name}</span>
                        <span>{profile?.email || student.email}</span>
                      </div>
                      <div className="flex justify-center text-3xl font-extrabold text-center">
                        {language === "fr" ? "GLN ACADÉMIE - COMPTE SÉCURISÉ" : "GLN ACADEMY - SECURE ACCOUNT"}
                      </div>
                      <div className="flex justify-between">
                        <span>{language === "fr" ? "PROTÉGÉ CONTRE LA COPIE" : "COPY PROTECTED"}</span>
                        <span>IP: Cam-Net-Client</span>
                      </div>
                    </div>

                    {/* Secure Video Player / Written Lesson Content */}
                    {activeCourse.type === "written" || currentLesson?.content ? (
                      <div className="w-full h-full bg-zinc-900/60 p-6 md:p-8 overflow-y-auto select-none">
                        <div className="max-w-2xl mx-auto space-y-4 text-left">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] bg-primary/20 text-primary font-extrabold px-2 py-0.5 rounded uppercase">
                              {language === "fr" ? "Leçon Écrite" : "Written Lesson"}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {language === "fr" ? currentLesson?.duration : (currentLesson?.durationEn || currentLesson?.duration || "Reading")}
                            </span>
                          </div>
                          <h2 className="font-heading text-base md:text-lg font-bold text-foreground">
                            {language === "fr" ? currentLesson?.title : (currentLesson?.titleEn || currentLesson?.title)}
                          </h2>
                          <div className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                            {language === "fr" 
                              ? (currentLesson?.content || "Aucun contenu écrit rédigé pour cette leçon.") 
                              : (currentLesson?.contentEn || currentLesson?.content || "No written content has been drafted for this lesson.")}
                          </div>
                        </div>
                      </div>
                    ) : currentLesson?.videoUrl && getYoutubeId(currentLesson.videoUrl) ? (
                      <div className="w-full h-full bg-black relative">
                        <iframe
                          width="100%"
                          height="100%"
                          src={`https://www.youtube.com/embed/${getYoutubeId(currentLesson.videoUrl)}?autoplay=1&rel=0&modestbranding=1`}
                          title={language === "fr" ? currentLesson.title : (currentLesson.titleEn || currentLesson.title)}
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          className="w-full h-full"
                        ></iframe>
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-zinc-900 relative">
                        <div className="text-center p-6 space-y-4">
                          <PlayCircle className="w-16 h-16 text-primary mx-auto cursor-pointer hover:scale-105 transition-transform" />
                          <p className="text-xs text-muted-foreground uppercase tracking-widest">
                            {language === "fr" ? "Lecture sécurisée active" : "Secure playback active"}
                          </p>
                          <span className="text-xs bg-black/60 px-3 py-1 rounded text-red-400 font-bold flex items-center gap-1.5 justify-center border border-red-500/20">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {language === "fr" ? "Enregistrement d'écran interdit" : "Screen recording prohibited"}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Quiz & Transcription Panel */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Quiz / Exercises Card */}
                    {currentLesson?.quiz && (
                      <div className="p-6 rounded-2xl bg-card border border-border/40 flex flex-col justify-between space-y-4 shadow-glow">
                        <div>
                          <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded uppercase">
                            {language === "fr" ? "Exercice & Validation" : "Exercise & Validation"}
                          </span>
                          <h3 className="font-heading font-bold text-base mt-2 text-foreground">
                            {language === "fr" ? "Évaluez vos connaissances" : "Assess your knowledge"}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            {language === "fr"
                              ? "Validez cette leçon en répondant à 10 questions. Un quota de 7/10 (70%) est exigé pour débloquer la suite."
                              : "Validate this lesson by answering 10 questions. A score of 7/10 (70%) is required to unlock the next level."}
                          </p>
                        </div>
                        <button
                          onClick={startQuiz}
                          className="bg-primary text-primary-foreground font-bold text-xs py-3 rounded-xl w-full flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                        >
                          {language === "fr" ? "Débuter le Quiz (10 Questions)" : "Start the Quiz (10 Questions)"}
                        </button>
                      </div>
                    )}

                    {/* Transcription & Translation Card */}
                    <div className="p-6 rounded-2xl bg-card border border-border/40 flex flex-col justify-between space-y-4 shadow-glow">
                      <div>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] bg-accent/10 text-accent font-bold px-2 py-0.5 rounded uppercase">
                            {language === "fr" ? "Transcription IA" : "AI Transcript"}
                          </span>
                          <button
                            onClick={() => setTransLang(transLang === "fr" ? "en" : "fr")}
                            className="text-[10px] border border-border bg-secondary hover:bg-secondary/80 font-bold px-2.5 py-1 rounded-lg text-foreground flex items-center gap-1 transition-all"
                          >
                            {language === "fr" 
                              ? `Traduire en ${transLang === "fr" ? "English" : "Français"}` 
                              : `Translate to ${transLang === "fr" ? "English" : "French"}`}
                          </button>
                        </div>
                        <h3 className="font-heading font-bold text-base mt-2 text-foreground">
                          {language === "fr" ? "Transcription & Traduction" : "Transcription & Translation"}
                        </h3>
                        <div className="text-[11px] text-muted-foreground mt-2 max-h-[90px] overflow-y-auto bg-secondary/30 p-3 rounded-lg border border-border/20 italic leading-relaxed">
                          {transLang === "fr" 
                            ? (currentLesson?.transcription || (language === "fr" ? "Aucune transcription disponible pour cette leçon." : "No transcript available for this lesson.")) 
                            : (currentLesson?.transcriptionEn || (language === "fr" ? "Aucune traduction disponible pour cette leçon." : "No translation available for this lesson.")) }
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Resources Downloads & Security Note */}
                  <div className="p-6 rounded-2xl bg-card border border-border/40 shadow-glow">
                    <h3 className="font-heading font-bold text-lg mb-4">
                      {language === "fr" ? "Ressources & Supports du cours" : "Course Resources & Materials"}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <a
                        href="#"
                        onClick={(e) => e.preventDefault()}
                        className="p-4 rounded-xl bg-secondary/30 border border-border hover:border-primary/30 transition-colors flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-primary" />
                          <span className="text-xs font-semibold">
                            {language === "fr" ? "Calendrier éditorial template (Notion)" : "Editorial calendar template (Notion)"}
                          </span>
                        </div>
                        <Download className="w-4 h-4 text-muted-foreground" />
                      </a>
                      <a
                        href="#"
                        onClick={(e) => e.preventDefault()}
                        className="p-4 rounded-xl bg-secondary/30 border border-border hover:border-primary/30 transition-colors flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-primary" />
                          <span className="text-xs font-semibold">
                            {language === "fr" ? "Guide d'objections publicitaires (PDF)" : "Advertising objections guide (PDF)"}
                          </span>
                        </div>
                        <Download className="w-4 h-4 text-muted-foreground" />
                      </a>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Sidebar (Course Modules & Lessons) */}
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-card border border-border/40">
                <div className="mb-4">
                  <span className="text-xs text-muted-foreground uppercase block mb-1">
                    {language === "fr" ? "Votre formation" : "Your course"}
                  </span>
                  <h3 className="font-heading font-bold text-base text-foreground leading-tight">
                    {language === "fr" ? activeCourse.title : (activeCourse.titleEn || activeCourse.title)}
                  </h3>
                </div>

                {/* Progress bar */}
                <div className="space-y-2 mb-6">
                  <div className="flex justify-between text-xs font-bold text-muted-foreground">
                    <span>{language === "fr" ? "Progression globale" : "Overall progress"}</span>
                    <span className="text-primary">{student.progress}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${student.progress}%` }} />
                  </div>
                </div>

                {/* Modules list */}
                <div className="space-y-4">
                  {activeCourse.modules.map((mod, modIdx) => (
                    <div key={modIdx} className="space-y-2">
                      <div className="flex justify-between items-center text-xs font-semibold text-foreground">
                        <span className="truncate max-w-[90%]">
                          {language === "fr" ? mod.title : (mod.titleEn || mod.title)}
                        </span>
                        {!mod.unlocked && <Lock className="w-3.5 h-3.5 text-muted-foreground" />}
                      </div>

                      <div className="space-y-1.5 pl-3 border-l border-border/60">
                        {mod.videos.map((vid) => (
                          <div
                            key={vid.id}
                            onClick={() => mod.unlocked && setSelectedVideo(vid.id)}
                            className={`flex items-center justify-between p-2.5 rounded-lg text-xs cursor-pointer transition-colors ${
                              selectedVideo === vid.id
                                ? "bg-primary/10 text-primary font-bold"
                                : mod.unlocked
                                ? "text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
                                : "text-muted-foreground/40 cursor-not-allowed"
                            }`}
                          >
                            <span className="truncate">
                              {language === "fr" ? vid.title : (vid.titleEn || vid.title)}
                            </span>
                            <span className="text-[10px] opacity-70 font-semibold">
                              {language === "fr" ? vid.duration : (vid.durationEn || vid.duration)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quiz Modal */}
      {showQuizModal && currentLesson?.quiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-card border border-border/60 rounded-3xl p-6 md:p-8 space-y-6 shadow-glow relative select-none">
            {/* Header */}
            <div className="flex justify-between items-center pb-4 border-b border-border/40">
              <div>
                <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded uppercase">
                  {language === "fr" ? "Quiz validation" : "Quiz validation"}
                </span>
                <h3 className="font-heading font-bold text-base text-foreground mt-1">
                  {language === "fr" ? currentLesson.title : (currentLesson.titleEn || currentLesson.title)}
                </h3>
              </div>
              <button 
                onClick={() => setShowQuizModal(false)}
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
              >
                ✕
              </button>
            </div>

            {/* Quiz Body */}
            {!quizSubmitted ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>
                    {language === "fr" 
                      ? `Question ${currentQuestionIdx + 1} sur ${currentLesson.quiz.length}` 
                      : `Question ${currentQuestionIdx + 1} of ${currentLesson.quiz.length}`}
                  </span>
                  <span className="text-primary font-bold">
                    {Math.round(((currentQuestionIdx) / currentLesson.quiz.length) * 100)}% {language === "fr" ? "complété" : "completed"}
                  </span>
                </div>

                <div className="w-full h-1 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${((currentQuestionIdx + 1) / currentLesson.quiz.length) * 100}%` }}
                  />
                </div>

                <h4 className="font-heading font-semibold text-xs md:text-sm text-foreground leading-relaxed">
                  {language === "en" && currentLesson.quiz[currentQuestionIdx].questionEn 
                    ? currentLesson.quiz[currentQuestionIdx].questionEn 
                    : currentLesson.quiz[currentQuestionIdx].question}
                </h4>

                <div className="space-y-2 pt-2">
                  {(language === "en" && currentLesson.quiz[currentQuestionIdx].optionsEn 
                    ? currentLesson.quiz[currentQuestionIdx].optionsEn 
                    : currentLesson.quiz[currentQuestionIdx].options).map((opt: string, optIdx: number) => {
                    const isSelected = selectedAnswers[currentQuestionIdx] === optIdx;
                    return (
                      <button
                        key={optIdx}
                        onClick={() => setSelectedAnswers({ ...selectedAnswers, [currentQuestionIdx]: optIdx })}
                        className={`w-full text-left p-3.5 rounded-xl text-xs transition-all border ${
                          isSelected
                            ? "bg-primary/10 border-primary text-primary font-bold"
                            : "bg-secondary/40 border-border/60 hover:bg-secondary text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>

                {/* Navigation Buttons */}
                <div className="flex justify-between items-center pt-4">
                  <button
                    disabled={currentQuestionIdx === 0}
                    onClick={() => setCurrentQuestionIdx(currentQuestionIdx - 1)}
                    className="text-xs font-semibold px-4 py-2 rounded-lg bg-secondary border border-border text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {language === "fr" ? "Précédent" : "Previous"}
                  </button>

                  {currentQuestionIdx + 1 === currentLesson.quiz.length ? (
                    <button
                      disabled={selectedAnswers[currentQuestionIdx] === undefined}
                      onClick={handleQuizSubmit}
                      className="text-xs font-bold px-6 py-2.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {language === "fr" ? "Terminer & Soumettre" : "Finish & Submit"}
                    </button>
                  ) : (
                    <button
                      disabled={selectedAnswers[currentQuestionIdx] === undefined}
                      onClick={() => setCurrentQuestionIdx(currentQuestionIdx + 1)}
                      className="text-xs font-semibold px-6 py-2.5 rounded-lg bg-secondary border border-border text-foreground hover:bg-secondary/80 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {language === "fr" ? "Suivant" : "Next"}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              // Quiz Results View
              <div className="text-center space-y-6 py-4">
                <div className="space-y-2">
                  <span className="text-5xl font-heading font-extrabold text-foreground">
                    {quizScore} / 10
                  </span>
                  <p className="text-sm font-semibold mt-2">
                    {quizScore >= 7 ? (
                      <span className="text-green-400 font-bold">
                        {language === "fr" ? "Félicitations ! Exercice réussi." : "Congratulations! Exercise completed successfully."}
                      </span>
                    ) : (
                      <span className="text-red-400 font-bold">
                        {language === "fr" ? `Score insuffisant (${quizScore}/10).` : `Insufficient score (${quizScore}/10).`}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {quizScore >= 7 
                      ? (language === "fr" 
                          ? "La leçon suivante a été débloquée dans votre programme d'études." 
                          : "The next lesson has been unlocked in your study syllabus.")
                      : (language === "fr" 
                          ? "Vous devez obtenir au moins 7/10 de bonnes réponses pour continuer." 
                          : "You must obtain at least 7/10 correct answers to continue.")}
                  </p>
                </div>

                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => {
                      setQuizSubmitted(false);
                      setCurrentQuestionIdx(0);
                      setSelectedAnswers({});
                    }}
                    className="text-xs font-bold px-6 py-3 rounded-lg border border-border bg-secondary text-foreground hover:bg-secondary/80"
                  >
                    {language === "fr" ? "Recommencer" : "Restart"}
                  </button>
                  {quizScore >= 7 && (
                    <button
                      onClick={() => setShowQuizModal(false)}
                      className="text-xs font-bold px-6 py-3 rounded-lg bg-primary text-primary-foreground hover:opacity-90"
                    >
                      {language === "fr" ? "Continuer le cours" : "Continue course"}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardEleve;
