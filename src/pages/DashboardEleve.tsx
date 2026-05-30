import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BookOpen, Award, PlayCircle, Lock, Download, AlertTriangle, EyeOff, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

import { useNavigate } from "react-router-dom";
import { getCourses, saveCourses, getYoutubeId } from "@/lib/coursesStore";

const DashboardEleve = () => {
  const navigate = useNavigate();
  const courses = getCourses();
  const [activeCourse, setActiveCourse] = useState<any>(courses[0] || student.courses[0]);
  const [selectedVideo, setSelectedVideo] = useState<string>(activeCourse?.modules[0]?.videos[0]?.id || "v1");
  const [isSecure, setIsSecure] = useState<boolean>(true);
  const [profile, setProfile] = useState<any>(null);

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

        if (userProfile.current_role !== "student") {
          toast.error("Accès réservé. Rôle actuel non autorisé pour cet espace.");
          if (userProfile.current_role === "partner") {
            navigate("/partenaires-dashboard");
          } else {
            navigate("/auth");
          }
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
            <h1 className="font-heading text-2xl md:text-3xl font-extrabold text-foreground">Espace Élève</h1>
            <p className="text-muted-foreground text-sm">
              Bonjour, <span className="text-primary font-semibold">{profile?.full_name || student.name}</span> • Compte membre actif
            </p>
          </div>
          <div className="flex items-center gap-2 bg-secondary px-4 py-2 rounded-xl border border-border">
            <Award className="w-5 h-5 text-accent" />
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">Badge: {student.level}</span>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Area (Video Player & Info) */}
          <div className="lg:col-span-2 space-y-6">
            {isProfileIncomplete ? (
              <div className="bg-card border border-border/60 rounded-3xl p-6 md:p-8 space-y-6 shadow-glow">
                <div className="text-center space-y-2 mb-4">
                  <span className="bg-primary/20 text-primary text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    Fiche d'Information Officielle
                  </span>
                  <h3 className="font-heading text-lg font-bold text-foreground">Finalisez votre inscription à l'Académie</h3>
                  <p className="text-[11px] text-muted-foreground">
                    Ces détails officiels conformes à votre carte nationale d'identité (CNI) ou acte de naissance sont indispensables pour le suivi et la délivrance de votre certificat de réussite officiel sécurisé par QR Code.
                  </p>
                </div>

                <form onSubmit={handleSaveOfficialInfo} className="space-y-4 max-w-xl mx-auto">
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 block">Nom complet officiel (Nom & Prénoms CNI) *</label>
                    <input
                      type="text"
                      required
                      value={formOfficialName}
                      onChange={(e) => setFormOfficialName(e.target.value)}
                      className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                      placeholder="Ex: Jean-Pierre Yamegni"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 block">Date de naissance *</label>
                      <input
                        type="date"
                        required
                        value={formBirthDate}
                        onChange={(e) => setFormBirthDate(e.target.value)}
                        className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 block">Lieu de naissance *</label>
                      <input
                        type="text"
                        required
                        value={formBirthPlace}
                        onChange={(e) => setFormBirthPlace(e.target.value)}
                        className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                        placeholder="Ex: Yaoundé"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 block">N° de CNI ou d'acte de naissance *</label>
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
                      <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 block">Numéro de Téléphone *</label>
                      <div className="flex gap-2">
                        <select
                          value={formCountryCode}
                          onChange={(e) => setFormCountryCode(e.target.value)}
                          className="bg-secondary border border-border rounded-xl px-2 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary w-24"
                        >
                          <option value="+237">+237 (CM)</option>
                          <option value="+33">+33 (FR)</option>
                          <option value="+225">+225 (CI)</option>
                          <option value="+221">+221 (SN)</option>
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
                    Enregistrer et Débloquer la Formation
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
                      <h3 className="font-heading text-lg font-bold text-foreground">Lecteur Sécurisé GLN DIGITAL</h3>
                      <p className="text-[10px] text-muted-foreground mt-1 max-w-xs">
                        Veuillez revenir sur l'onglet actif pour reprendre la lecture de votre vidéo.
                      </p>
                    </div>
                  )}

                  {/* Dynamic Watermark to deter recording */}
                  <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-6 select-none opacity-[0.03] text-foreground font-semibold text-sm">
                    <div className="flex justify-between">
                      <span>GLN DIGITAL - {profile?.full_name || student.name}</span>
                      <span>{profile?.email || student.email}</span>
                    </div>
                    <div className="flex justify-center text-3xl font-extrabold">
                      GLN ACADÉMIE - COMPTE SÉCURISÉ
                    </div>
                    <div className="flex justify-between">
                      <span>PROTÉGÉ CONTRE LA COPIE</span>
                      <span>IP: Cam-Net-Client</span>
                    </div>
                  </div>

                  {/* Secure Video Player / Written Lesson Content */}
                  {activeCourse.type === "written" || currentLesson?.content ? (
                    <div className="w-full h-full bg-zinc-900/60 p-6 md:p-8 overflow-y-auto select-none">
                      <div className="max-w-2xl mx-auto space-y-4 text-left">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] bg-primary/20 text-primary font-extrabold px-2 py-0.5 rounded uppercase">Leçon Écrite</span>
                          <span className="text-[10px] text-muted-foreground">{currentLesson?.duration || "Lecture"}</span>
                        </div>
                        <h2 className="font-heading text-base md:text-lg font-bold text-foreground">{currentLesson?.title}</h2>
                        <div className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                          {currentLesson?.content || "Aucun contenu écrit rédigé pour cette leçon."}
                        </div>
                      </div>
                    </div>
                  ) : currentLesson?.videoUrl && getYoutubeId(currentLesson.videoUrl) ? (
                    <div className="w-full h-full bg-black relative">
                      <iframe
                        width="100%"
                        height="100%"
                        src={`https://www.youtube.com/embed/${getYoutubeId(currentLesson.videoUrl)}?autoplay=1&rel=0&modestbranding=1`}
                        title={currentLesson.title}
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
                        <p className="text-xs text-muted-foreground uppercase tracking-widest">Lecture sécurisée active</p>
                        <span className="text-xs bg-black/60 px-3 py-1 rounded text-red-400 font-bold flex items-center gap-1.5 justify-center border border-red-500/20">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Enregistrement d'écran interdit
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
                        <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded uppercase">Exercice & Validation</span>
                        <h3 className="font-heading font-bold text-base mt-2 text-foreground">Évaluez vos connaissances</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          Validez cette leçon en répondant à 10 questions. Un quota de 7/10 (70%) est exigé pour débloquer la suite.
                        </p>
                      </div>
                      <button
                        onClick={startQuiz}
                        className="bg-primary text-primary-foreground font-bold text-xs py-3 rounded-xl w-full flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                      >
                        Débuter le Quiz (10 Questions)
                      </button>
                    </div>
                  )}

                  {/* Transcription & Translation Card */}
                  <div className="p-6 rounded-2xl bg-card border border-border/40 flex flex-col justify-between space-y-4 shadow-glow">
                    <div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] bg-accent/10 text-accent font-bold px-2 py-0.5 rounded uppercase">Transcription IA</span>
                        <button
                          onClick={() => setTransLang(transLang === "fr" ? "en" : "fr")}
                          className="text-[10px] border border-border bg-secondary hover:bg-secondary/80 font-bold px-2.5 py-1 rounded-lg text-foreground flex items-center gap-1 transition-all"
                        >
                          Traduire en {transLang === "fr" ? "English" : "Français"}
                        </button>
                      </div>
                      <h3 className="font-heading font-bold text-base mt-2 text-foreground">Transcription & Traduction</h3>
                      <div className="text-[11px] text-muted-foreground mt-2 max-h-[90px] overflow-y-auto bg-secondary/30 p-3 rounded-lg border border-border/20 italic leading-relaxed">
                        {transLang === "fr" 
                          ? (currentLesson?.transcription || "Aucune transcription disponible pour cette leçon.") 
                          : (currentLesson?.transcriptionEn || "No translation available for this lesson.")}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Resources Downloads & Security Note */}
                <div className="p-6 rounded-2xl bg-card border border-border/40 shadow-glow">
                  <h3 className="font-heading font-bold text-lg mb-4">Ressources & Supports du cours</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <a
                      href="#"
                      onClick={(e) => e.preventDefault()}
                      className="p-4 rounded-xl bg-secondary/30 border border-border hover:border-primary/30 transition-colors flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-primary" />
                        <span className="text-xs font-semibold">Calendrier éditorial template (Notion)</span>
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
                        <span className="text-xs font-semibold">Guide d'objections publicitaires (PDF)</span>
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
                <span className="text-xs text-muted-foreground uppercase block mb-1">Votre formation</span>
                <h3 className="font-heading font-bold text-base text-foreground leading-tight">{activeCourse.title}</h3>
              </div>

              {/* Progress bar */}
              <div className="space-y-2 mb-6">
                <div className="flex justify-between text-xs font-bold text-muted-foreground">
                  <span>Progression globale</span>
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
                      <span className="truncate max-w-[90%]">{mod.title}</span>
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
                          <span className="truncate">{vid.title}</span>
                          <span className="text-[10px] opacity-70 font-semibold">{vid.duration}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quiz Modal */}
      {showQuizModal && currentLesson?.quiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-card border border-border/60 rounded-3xl p-6 md:p-8 space-y-6 shadow-glow relative select-none">
            {/* Header */}
            <div className="flex justify-between items-center pb-4 border-b border-border/40">
              <div>
                <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded uppercase">Quiz validation</span>
                <h3 className="font-heading font-bold text-base text-foreground mt-1">{currentLesson.title}</h3>
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
                  <span>Question {currentQuestionIdx + 1} sur {currentLesson.quiz.length}</span>
                  <span className="text-primary font-bold">{Math.round(((currentQuestionIdx) / currentLesson.quiz.length) * 100)}% complété</span>
                </div>

                <div className="w-full h-1 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${((currentQuestionIdx + 1) / currentLesson.quiz.length) * 100}%` }}
                  />
                </div>

                <h4 className="font-heading font-semibold text-xs md:text-sm text-foreground leading-relaxed">
                  {currentLesson.quiz[currentQuestionIdx].question}
                </h4>

                <div className="space-y-2 pt-2">
                  {currentLesson.quiz[currentQuestionIdx].options.map((opt: string, optIdx: number) => {
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
                    Précédent
                  </button>

                  {currentQuestionIdx + 1 === currentLesson.quiz.length ? (
                    <button
                      disabled={selectedAnswers[currentQuestionIdx] === undefined}
                      onClick={handleQuizSubmit}
                      className="text-xs font-bold px-6 py-2.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Terminer & Soumettre
                    </button>
                  ) : (
                    <button
                      disabled={selectedAnswers[currentQuestionIdx] === undefined}
                      onClick={() => setCurrentQuestionIdx(currentQuestionIdx + 1)}
                      className="text-xs font-semibold px-6 py-2.5 rounded-lg bg-secondary border border-border text-foreground hover:bg-secondary/80 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Suivant
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
                      <span className="text-green-400 font-bold">Félicitations ! Exercice réussi.</span>
                    ) : (
                      <span className="text-red-400 font-bold">Score insuffisant ({quizScore}/10).</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {quizScore >= 7 
                      ? "La leçon suivante a été débloquée dans votre programme d'études."
                      : "Vous devez obtenir au moins 7/10 de bonnes réponses pour continuer."}
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
                    Recommencer
                  </button>
                  {quizScore >= 7 && (
                    <button
                      onClick={() => setShowQuizModal(false)}
                      className="text-xs font-bold px-6 py-3 rounded-lg bg-primary text-primary-foreground hover:opacity-90"
                    >
                      Continuer le cours
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
