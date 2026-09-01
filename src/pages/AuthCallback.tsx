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
  const [countryCode, setCountryCode] = useState("+237");
  const [phoneLocal, setPhoneLocal] = useState("");
  const [companyName, setCompanyName] = useState("");
  // Bug fixed 2026-08-31 (same class as Auth.tsx's signup form): this
  // defaulted to "visiteur" with no UI ever calling setRole — every Google
  // OAuth signup silently got current_role "visiteur", which
  // redirectUser()-equivalent logic above never checks for, so it fell
  // through to the student dashboard by accident rather than by choice.
  // Now a real selector (below) drives this, defaulting to "student".
  const [role, setRole] = useState<"student" | "partner" | "client">("student");
  const [needsCompletion, setNeedsCompletion] = useState(false);
  const authMode = new URLSearchParams(window.location.search).get("mode") === "signup" ? "signup" : "login";

  useEffect(() => {
    const handleSession = async (session: any) => {
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
          if (authMode !== "signup") {
            await supabase.auth.signOut();
            toast.error("Compte introuvable. Veuillez d'abord vous inscrire.");
            navigate("/auth");
            return;
          }

          setFullName(session.user.user_metadata?.full_name || "");

          const rawPhone = session.user.user_metadata?.phone || "";
          if (rawPhone.startsWith("+")) {
            const match = rawPhone.match(/^(\+[0-9]{1,4})\s*(.*)$/);
            if (match) {
              setCountryCode(match[1]);
              setPhoneLocal(match[2]);
            } else {
              setPhoneLocal(rawPhone);
            }
          } else {
            setPhoneLocal(rawPhone);
          }

          setCompanyName(session.user.user_metadata?.company_name || "");
          setNeedsCompletion(true);
          setLoading(false);
        } else {
          // Check status (active/inactive)
          const userStatus = localStorage.getItem(`gln_user_status_${profile.id}`) || profile.status || "active";
          if (userStatus === "inactive") {
            toast.error("Votre compte a été désactivé. Veuillez contacter l'administrateur.");
            await supabase.auth.signOut();
            navigate("/auth");
            return;
          }

          // Check session limit per role
          const currentRoles: string[] = profile.roles || ['student'];
          const activeSessions: string[] = profile.active_sessions || [];

          const isAdmin = currentRoles.includes("admin") || currentRoles.includes("super_admin");
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
          } else if (profile.current_role === "client") {
            navigate("/client-dashboard");
          } else {
            navigate("/eleve-dashboard");
          }
        }
      } else {
        setLoading(false);
        navigate("/auth");
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      void handleSession(session);
    });

    void supabase.auth.getSession().then(({ data: { session } }) => {
      void handleSession(session);
    }).catch((error) => {
      toast.error(error.message || "Impossible de verifier la session.");
      setLoading(false);
      navigate("/auth");
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    const fullPhone = `${countryCode} ${phoneLocal.trim()}`;
    if (!/^[0-9\s-]{6,15}$/.test(phoneLocal.trim())) {
      toast.error("Veuillez saisir un numéro de téléphone local valide.");
      return;
    }

    try {
      setLoading(true);
      const deviceToken = getDeviceToken();

      const profilePayload = {
        id: sessionUser.id,
        email: sessionUser.email,
        full_name: fullName,
        phone: fullPhone,
        company_name: companyName,
        roles: [role],
        current_role: role,
        active_sessions: [deviceToken]
      };

      const { error } = await supabase.from("profiles").upsert(profilePayload);
      if (error) throw error;

      toast.success("Profil complete !");
      await supabase.auth.signOut();
      toast.success("Inscription terminee. Connectez-vous maintenant.");
      navigate("/auth");
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
    <div className="min-h-screen pt-24 pb-16 px-4 flex items-center justify-center bg-background">
      {needsCompletion && (
        <motion.div
          className="stable-surface w-full max-w-md p-5 sm:p-8 rounded-2xl sm:rounded-3xl bg-card border border-border/60 shadow-glow"
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
              <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 block">Je m'inscris en tant que</label>
              <div className="grid grid-cols-3 gap-2">
                {(["student", "partner", "client"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`px-2 py-2 rounded-xl text-[11px] font-bold uppercase border transition-colors ${
                      role === r
                        ? "bg-primary border-primary text-primary-foreground"
                        : "bg-secondary border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {r === "student" ? "Élève" : r === "partner" ? "Partenaire" : "Client"}
                  </button>
                ))}
              </div>
            </div>

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
                  placeholder="Ex: Jean Dupont"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 block">Téléphone</label>
              <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-2">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="bg-secondary border border-border rounded-xl px-2 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
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
                <div className="relative flex-1">
                  <Phone className="absolute left-3.5 top-3 w-4 h-4 text-muted-foreground" />
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
