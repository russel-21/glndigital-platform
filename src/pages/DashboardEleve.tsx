import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BookOpen, Award, PlayCircle, Lock, Download, AlertTriangle, EyeOff } from "lucide-react";

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

const DashboardEleve = () => {
  const [selectedVideo, setSelectedVideo] = useState<string>("v1");
  const [activeCourse] = useState(student.courses[0]);
  const [isSecure, setIsSecure] = useState<boolean>(true);

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

  return (
    <div className="min-h-screen pt-24 pb-16 bg-background relative select-none">
      {/* Anti-Capture Overlay when window loses focus */}
      {!isSecure && (
        <div className="fixed inset-0 z-[999] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center text-center p-6">
          <EyeOff className="w-16 h-16 text-primary mb-4 animate-pulse" />
          <h2 className="font-heading text-2xl font-bold text-foreground">Écran protégé par GLN DIGITAL</h2>
          <p className="text-muted-foreground mt-2 max-w-sm">
            L'enregistrement ou la capture d'écran est bloqué. Veuillez revenir sur la page de cours active pour continuer.
          </p>
        </div>
      )}

      <div className="container mx-auto px-4 md:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="font-heading text-2xl md:text-3xl font-extrabold text-foreground">Espace Élève</h1>
            <p className="text-muted-foreground text-sm">
              Bonjour, <span className="text-primary font-semibold">{student.name}</span> • Compte membre actif
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
            <div className="relative aspect-video rounded-3xl overflow-hidden bg-black border border-border/60">
              {/* Dynamic Watermark to deter recording */}
              <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-6 select-none opacity-[0.03] text-foreground font-semibold text-sm">
                <div className="flex justify-between">
                  <span>GLN DIGITAL - {student.name}</span>
                  <span>{student.email}</span>
                </div>
                <div className="flex justify-center text-3xl font-extrabold">
                  GLN ACADÉMIE - COMPTE SÉCURISÉ
                </div>
                <div className="flex justify-between">
                  <span>PROTÉGÉ CONTRE LA COPIE</span>
                  <span>IP: Cam-Net-Client</span>
                </div>
              </div>

              {/* Secure Video Player */}
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
            </div>

            {/* Resources Downloads & Security Note */}
            <div className="p-6 rounded-2xl bg-card border border-border/40">
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
    </div>
  );
};

export default DashboardEleve;
