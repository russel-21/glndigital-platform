import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Phone, Building, User, Save, LogOut } from "lucide-react";
import { toast } from "sonner";

// Unique Token representing the current device
const getDeviceToken = () => {
  let token = localStorage.getItem("gln_device_token");
  if (!token) {
    token = "dev_" + Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem("gln_device_token", token);
  }
  return token;
};

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
    const mockSession = localStorage.getItem("gln_mock_user_session");
    if (mockSession === "true") {
      const email = localStorage.getItem("gln_mock_user_email") || "user@example.com";
      setSessionUser({
        id: "user-mock-id-0000-000000000000",
        email: email,
        user_metadata: {
          full_name: localStorage.getItem("gln_mock_user_name") || email.split('@')[0],
          phone: ""
        }
      });
      setFullName(localStorage.getItem("gln_mock_user_name") || email.split('@')[0]);
      setPhone("");
      setCompanyName("");
      setNeedsCompletion(true);
      setLoading(false);
      return;
    }

    supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        setSessionUser(session.user);
        const deviceToken = getDeviceToken();

        // 1. Get profile
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();

        if (error || !profile || !profile.full_name || !profile.phone) {
          setFullName(session.user.user_metadata?.full_name || "");
          setPhone(session.user.user_metadata?.phone || "");
          setCompanyName(session.user.user_metadata?.company_name || "");
          setNeedsCompletion(true);
          setLoading(false);
        } else {
          // Check session limit per role
          const currentRoles: string[] = profile.roles || ['student'];
          const activeSessions: string[] = profile.active_sessions || [];

          const isAdmin = currentRoles.includes("admin") || currentRoles.includes("super_admin") || profile.role === "admin";
          const maxAllowedDevices = isAdmin ? 3 : 1;

          // Add current device to list if not already inside
          if (!activeSessions.includes(deviceToken)) {
            if (activeSessions.length >= maxAllowedDevices) {
              // Exceeds connection limits, force logout
              toast.error(`Limite d'appareils connectés atteinte (${maxAllowedDevices} maximum).`);
              await supabase.auth.signOut();
              navigate("/auth");
              return;
            }
            
            // Add session token
            const updatedSessions = [...activeSessions, deviceToken];
            await supabase
              .from("profiles")
              .update({ active_sessions: updatedSessions })
              .eq("id", session.user.id);
          }

          // Complete redirection according to current role
          if (profile.current_role === "partner") {
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

    // Verify phone with country code
    if (!/^\+[0-9\s-]{10,18}$/.test(phone)) {
      toast.error("Numéro invalide. Vous devez inclure le code exact du pays (Ex: +237 pour le Cameroun).");
      return;
    }

    try {
      setLoading(true);
      const deviceToken = getDeviceToken();
      
      const mockSession = localStorage.getItem("gln_mock_user_session");
      if (mockSession === "true") {
        localStorage.removeItem("gln_mock_user_session");
        localStorage.setItem("gln_active_mock_profile", JSON.stringify({
          id: "user-mock-id-0000-000000000000",
          email: sessionUser.email,
          full_name: fullName,
          phone: phone,
          company_name: companyName,
          roles: [role],
          current_role: role,
          active_sessions: [deviceToken]
        }));
        localStorage.setItem("gln_mock_user_logged_in", "true");
        toast.success("Profil complété !");
      } else {
        const { error } = await supabase.from("profiles").upsert({
          id: sessionUser.id,
          email: sessionUser.email,
          full_name: fullName,
          phone: phone,
          company_name: companyName,
          roles: [role],
          current_role: role,
          active_sessions: [deviceToken]
        });

        if (error) throw error;
        toast.success("Profil complété !");
      }

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
          <p className="text-xs text-muted-foreground">Vérification de sécurité...</p>
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
              Vos informations réelles sont requises pour vos certificats officiels et factures.
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
                  placeholder="Ex: Russel Yamegni"
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
              <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 block">Nom de l'entreprise (Prestations & Facturation)</label>
              <div className="relative">
                <Building className="absolute left-3.5 top-3 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full bg-secondary border border-border rounded-xl pl-10 pr-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                  placeholder="GLN Digital"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 block">Rôle principal</label>
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
              Valider mon profil
            </button>
          </form>
        </motion.div>
      )}
    </div>
  );
};

export default AuthCallback;
export { getDeviceToken };
