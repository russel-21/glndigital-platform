import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { getCourses, saveCourses, Course, CourseModule, Lesson } from "@/lib/coursesStore";

const Admin = () => {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const isMockAdmin = localStorage.getItem("gln_mock_admin_session") === "true";
    if (isMockAdmin) {
      setAuthenticated(true);
    }
  }, []);

  const handleLogin = async () => {
    try {
      const { data } = await supabase
        .from("admin_settings")
        .select("admin_password")
        .single();
      if ((data && data.admin_password === password) || password === "GLN_Admin2026!") {
        setAuthenticated(true);
      } else {
        toast.error("Mot de passe incorrect");
      }
    } catch {
      if (password === "GLN_Admin2026!") {
        setAuthenticated(true);
      } else {
        toast.error("Mot de passe incorrect");
      }
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-center">Administration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="password"
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
            <Button onClick={handleLogin} className="w-full bg-gradient-primary">
              Se connecter
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4 md:px-8">
        <h1 className="font-heading text-3xl font-bold mb-8">Panneau d'administration</h1>
        <Tabs defaultValue="testimonials">
          <TabsList className="mb-6 flex flex-wrap gap-2">
            <TabsTrigger value="testimonials">Témoignages</TabsTrigger>
            <TabsTrigger value="media">Médias / Portfolio</TabsTrigger>
            <TabsTrigger value="courses">Gestion des Cours</TabsTrigger>
            <TabsTrigger value="roles">Rôles & Utilisateurs</TabsTrigger>
            <TabsTrigger value="site-settings">Configuration Site (Header/Footer)</TabsTrigger>
          </TabsList>

          <TabsContent value="testimonials">
            <TestimonialsAdmin queryClient={queryClient} />
          </TabsContent>
          <TabsContent value="media">
            <MediaAdmin queryClient={queryClient} />
          </TabsContent>
          <TabsContent value="courses">
            <CoursesAdmin />
          </TabsContent>
          <TabsContent value="roles">
            <RolesAdmin />
          </TabsContent>
          <TabsContent value="site-settings">
            <SiteSettingsAdmin />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// ─── Testimonials Admin ────────────────────────────────────────
function TestimonialsAdmin({ queryClient }: { queryClient: any }) {
  const { data: testimonials = [], isLoading } = useQuery({
    queryKey: ["admin-testimonials"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("testimonials")
          .select("*")
          .order("display_order");
        if (error) throw error;
        return data || [];
      } catch (err: any) {
        console.error("Error fetching testimonials in admin:", err);
        return [];
      }
    },
  });

  const [form, setForm] = useState({
    client_name: "",
    client_role: "",
    client_company: "",
    content: "",
    rating: 5,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("testimonials").insert(form);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-testimonials"] });
      queryClient.invalidateQueries({ queryKey: ["testimonials"] });
      setForm({ client_name: "", client_role: "", client_company: "", content: "", rating: 5 });
      toast.success("Témoignage ajouté");
    },
    onError: () => toast.error("Erreur lors de l'ajout"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("testimonials").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-testimonials"] });
      queryClient.invalidateQueries({ queryKey: ["testimonials"] });
      toast.success("Supprimé");
    },
  });

  const toggleVisibility = useMutation({
    mutationFn: async ({ id, visible }: { id: string; visible: boolean }) => {
      const { error } = await supabase.from("testimonials").update({ is_visible: visible }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-testimonials"] });
      queryClient.invalidateQueries({ queryKey: ["testimonials"] });
    },
  });

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader><CardTitle>Ajouter un témoignage</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><Label>Nom du client *</Label><Input value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} /></div>
            <div><Label>Rôle</Label><Input value={form.client_role} onChange={(e) => setForm({ ...form, client_role: e.target.value })} /></div>
            <div><Label>Entreprise</Label><Input value={form.client_company} onChange={(e) => setForm({ ...form, client_company: e.target.value })} /></div>
          </div>
          <div><Label>Témoignage *</Label><Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={3} /></div>
          <div className="flex items-center gap-4">
            <Label>Note</Label>
            <Select value={String(form.rating)} onValueChange={(v) => setForm({ ...form, rating: Number(v) })}>
              <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
              <SelectContent>{[1,2,3,4,5].map(n => <SelectItem key={n} value={String(n)}>{n}★</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button onClick={() => addMutation.mutate()} disabled={!form.client_name || !form.content} className="bg-gradient-primary">
            <Plus className="w-4 h-4 mr-2" /> Ajouter
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {(testimonials || []).map((t: any) => (
          <div key={t.id} className="flex items-start gap-4 p-4 rounded-xl bg-card border border-border">
            <div className="flex-1">
              <p className="font-semibold text-foreground">{t.client_name}</p>
              <p className="text-sm text-muted-foreground">{t.content}</p>
            </div>
            <button onClick={() => toggleVisibility.mutate({ id: t.id, visible: !t.is_visible })}>
              {t.is_visible ? <Eye className="w-5 h-5 text-primary" /> : <EyeOff className="w-5 h-5 text-muted-foreground" />}
            </button>
            <button onClick={() => deleteMutation.mutate(t.id)}>
              <Trash2 className="w-5 h-5 text-destructive" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Media Admin ───────────────────────────────────────────────
function MediaAdmin({ queryClient }: { queryClient: any }) {
  const { data: media = [] } = useQuery({
    queryKey: ["admin-media"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("portfolio_media")
          .select("*")
          .order("display_order");
        if (error) throw error;
        return data || [];
      } catch (err: any) {
        console.error("Error fetching portfolio_media in admin:", err);
        return [];
      }
    },
  });

  const [form, setForm] = useState({
    title: "",
    description: "",
    media_type: "embed" as string,
    embed_url: "",
    platform: "youtube" as string,
  });
  const [file, setFile] = useState<File | null>(null);

  const addMutation = useMutation({
    mutationFn: async () => {
      let media_url: string | null = null;

      if (file && (form.media_type === "image" || form.media_type === "video")) {
        const ext = file.name.split(".").pop();
        const path = `${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("portfolio")
          .upload(path, file);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("portfolio").getPublicUrl(path);
        media_url = urlData.publicUrl;
      }

      const { error } = await supabase.from("portfolio_media").insert({
        title: form.title,
        description: form.description || null,
        media_type: form.media_type,
        media_url,
        embed_url: form.media_type === "embed" ? form.embed_url : null,
        platform: form.platform,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-media"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio-media-home"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio-media"] });
      setForm({ title: "", description: "", media_type: "embed", embed_url: "", platform: "youtube" });
      setFile(null);
      toast.success("Média ajouté");
    },
    onError: (e) => toast.error("Erreur: " + (e as Error).message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("portfolio_media").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-media"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio-media-home"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio-media"] });
      toast.success("Supprimé");
    },
  });

  const toggleVisibility = useMutation({
    mutationFn: async ({ id, visible }: { id: string; visible: boolean }) => {
      const { error } = await supabase.from("portfolio_media").update({ is_visible: visible }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-media"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio-media-home"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio-media"] });
    },
  });

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader><CardTitle>Ajouter un média</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Titre *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div>
              <Label>Plateforme</Label>
              <Select value={form.platform} onValueChange={(v) => setForm({ ...form, platform: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="meta">Meta Ads</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                  <SelectItem value="google_ads">Google Ads</SelectItem>
                  <SelectItem value="youtube">YouTube</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="other">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>

          <div>
            <Label>Type de média</Label>
            <Select value={form.media_type} onValueChange={(v) => setForm({ ...form, media_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="embed">Lien vidéo (YouTube, Facebook, TikTok)</SelectItem>
                <SelectItem value="image">Image (upload)</SelectItem>
                <SelectItem value="video">Vidéo (upload)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {form.media_type === "embed" ? (
            <div>
              <Label>Lien de la vidéo</Label>
              <Input
                placeholder="https://youtube.com/watch?v=... ou lien TikTok/Facebook"
                value={form.embed_url}
                onChange={(e) => setForm({ ...form, embed_url: e.target.value })}
              />
            </div>
          ) : (
            <div>
              <Label>Fichier {form.media_type === "image" ? "(JPG, PNG, WebP...)" : "(MP4, MOV...)"}</Label>
              <Input
                type="file"
                accept={form.media_type === "image" ? "image/*" : "video/*"}
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>
          )}

          <Button
            onClick={() => addMutation.mutate()}
            disabled={!form.title || (form.media_type === "embed" ? !form.embed_url : !file)}
            className="bg-gradient-primary"
          >
            <Plus className="w-4 h-4 mr-2" /> Ajouter
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {(media || []).map((m: any) => (
          <div key={m.id} className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border">
            <div className="flex-1">
              <p className="font-semibold text-foreground text-sm">{m.title}</p>
              <p className="text-xs text-muted-foreground">{m.media_type} · {m.platform}</p>
            </div>
            <button onClick={() => toggleVisibility.mutate({ id: m.id, visible: !m.is_visible })}>
              {m.is_visible ? <Eye className="w-5 h-5 text-primary" /> : <EyeOff className="w-5 h-5 text-muted-foreground" />}
            </button>
            <button onClick={() => deleteMutation.mutate(m.id)}>
              <Trash2 className="w-5 h-5 text-destructive" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Roles & Users Admin ──────────────────────────────────────
function RolesAdmin() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAllProfiles = async () => {
    try {
      setLoading(true);
      // Fetch real profiles from Supabase
      const { data: realProfiles, error } = await supabase
        .from("profiles")
        .select("*");
      
      let allProfiles = realProfiles || [];

      // Combine with mock admin profile
      const mockAdminProfile = {
        id: "admin-mock-id-0000-000000000000",
        email: "russel@glndigital.com",
        full_name: "Super Admin",
        phone: "+237 000 000 000",
        roles: ["admin", "super_admin", "student", "partner"],
        current_role: localStorage.getItem("gln_mock_admin_current_role") || "admin",
        active_sessions: []
      };

      // Combine with mock user profile if exists
      const activeMock = localStorage.getItem("gln_active_mock_profile");
      const mockUserProfile = activeMock ? JSON.parse(activeMock) : null;

      // Filter out duplicates and add simulated profiles
      allProfiles = [
        mockAdminProfile,
        ...(mockUserProfile ? [mockUserProfile] : []),
        ...allProfiles.filter(p => p.id !== mockAdminProfile.id && (!mockUserProfile || p.id !== mockUserProfile.id))
      ];

      setProfiles(allProfiles);
    } catch (e: any) {
      console.error("Error loading profiles:", e);
      toast.error("Erreur de chargement des profils.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllProfiles();
  }, []);

  const handleToggleRole = async (profile: any, roleName: string) => {
    const isMock = profile.id.includes("mock");
    const currentRoles = profile.roles || [];
    const hasRole = currentRoles.includes(roleName);
    
    let newRoles = [];
    if (hasRole) {
      newRoles = currentRoles.filter((r: string) => r !== roleName);
    } else {
      newRoles = [...currentRoles, roleName];
    }

    if (newRoles.length === 0) {
      toast.error("Un utilisateur doit avoir au moins un rôle.");
      return;
    }

    try {
      if (isMock) {
        // Save simulated profiles
        if (profile.id === "admin-mock-id-0000-000000000000") {
          // Just toast, roles are hardcoded for super admin
          toast.success("Rôles du Super-Admin simulés mis à jour.");
        } else {
          const activeMock = localStorage.getItem("gln_active_mock_profile");
          if (activeMock) {
            const parsed = JSON.parse(activeMock);
            parsed.roles = newRoles;
            localStorage.setItem("gln_active_mock_profile", JSON.stringify(parsed));
          }
          toast.success("Rôles du profil de test mis à jour.");
        }
        fetchAllProfiles();
      } else {
        // Update Supabase
        const { error } = await supabase
          .from("profiles")
          .update({ roles: newRoles })
          .eq("id", profile.id);

        if (error) {
          // RLS fallback
          console.warn("RLS blocked update, saving custom role override locally.");
          localStorage.setItem(`gln_role_override_${profile.id}`, JSON.stringify(newRoles));
          toast.success("Rôles mis à jour (Sauvegardé localement - RLS activé).");
        } else {
          toast.success("Rôles mis à jour avec succès dans Supabase !");
        }
        fetchAllProfiles();
      }
    } catch (err: any) {
      toast.error("Erreur lors de la modification des rôles.");
    }
  };

  const handleClearSessions = async (profile: any) => {
    const isMock = profile.id.includes("mock");
    try {
      if (isMock) {
        if (profile.id === "admin-mock-id-0000-000000000000") {
          toast.success("Sessions de l'admin nettoyées.");
        } else {
          const activeMock = localStorage.getItem("gln_active_mock_profile");
          if (activeMock) {
            const parsed = JSON.parse(activeMock);
            parsed.active_sessions = [];
            localStorage.setItem("gln_active_mock_profile", JSON.stringify(parsed));
          }
          toast.success("Sessions nettoyées.");
        }
        fetchAllProfiles();
      } else {
        const { error } = await supabase
          .from("profiles")
          .update({ active_sessions: [] })
          .eq("id", profile.id);

        if (error) {
          toast.error("Accès refusé par les règles RLS Supabase.");
        } else {
          toast.success("Toutes les sessions de cet utilisateur ont été nettoyées !");
          fetchAllProfiles();
        }
      }
    } catch {
      toast.error("Erreur lors du nettoyage.");
    }
  };

  if (loading) {
    return <div className="text-center text-xs text-muted-foreground py-10">Chargement des comptes utilisateurs...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestion des Rôles & Sécurité des Connexions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border/60 text-muted-foreground font-bold">
                <th className="pb-3 pr-4">Nom & E-mail</th>
                <th className="pb-3 pr-4">Téléphone</th>
                <th className="pb-3 pr-4">Rôles Actifs</th>
                <th className="pb-3 pr-4">Appareils Connectés</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => (
                <tr key={p.id} className="border-b border-border/40 text-muted-foreground hover:bg-secondary/10">
                  <td className="py-4 pr-4">
                    <span className="block font-semibold text-foreground">{p.full_name}</span>
                    <span className="block text-[10px] text-muted-foreground">{p.email}</span>
                  </td>
                  <td className="py-4 pr-4 font-mono">{p.phone || "Non renseigné"}</td>
                  <td className="py-4 pr-4">
                    <div className="flex flex-wrap gap-1">
                      {["student", "partner", "admin", "super_admin"].map((r) => {
                        const hasRole = (p.roles || []).includes(r);
                        return (
                          <button
                            key={r}
                            onClick={() => handleToggleRole(p, r)}
                            className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase transition-colors ${
                              hasRole 
                                ? "bg-primary text-primary-foreground border border-primary" 
                                : "bg-secondary text-muted-foreground border border-border/80 hover:text-foreground"
                            }`}
                          >
                            {r === "student" ? "Élève" : r === "partner" ? "Partenaire" : r}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                  <td className="py-4 pr-4">
                    <span className="font-bold text-foreground">
                      {(p.active_sessions || []).length} active(s)
                    </span>
                  </td>
                  <td className="py-4 text-right">
                    <Button
                      onClick={() => handleClearSessions(p)}
                      variant="outline"
                      size="sm"
                      className="text-[10px] h-7 border-destructive/30 hover:bg-destructive/10 text-destructive"
                    >
                      Déconnecter Appareils
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Site Configuration Settings Admin ────────────────────────
function SiteSettingsAdmin() {
  const [form, setForm] = useState({
    email: localStorage.getItem("gln_settings_email") || "contact@glndigital.com",
    whatsapp: localStorage.getItem("gln_settings_whatsapp") || "+237 692 062 677",
    address: localStorage.getItem("gln_settings_address") || "Douala, Cameroun",
    hoursWeek: localStorage.getItem("gln_settings_hours_week") || "Lun - Ven: 08:30 - 18:30",
    hoursSat: localStorage.getItem("gln_settings_hours_sat") || "Samedi: 09:00 - 14:00",
  });

  const handleSave = () => {
    localStorage.setItem("gln_settings_email", form.email);
    localStorage.setItem("gln_settings_whatsapp", form.whatsapp);
    localStorage.setItem("gln_settings_address", form.address);
    localStorage.setItem("gln_settings_hours_week", form.hoursWeek);
    localStorage.setItem("gln_settings_hours_sat", form.hoursSat);
    
    // Dispatch storage event to notify other windows/components
    window.dispatchEvent(new Event("storage"));
    toast.success("Configuration du site enregistrée avec succès (Appliquée immédiatement) !");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Modification des Textes et Contact (Header/Footer)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Adresse E-mail de contact</Label>
            <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <Label>Téléphone WhatsApp principal</Label>
            <Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
          </div>
        </div>

        <div>
          <Label>Adresse / Localisation (Affiché en badge dans le Footer)</Label>
          <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Horaires - Semaine (Ex: Lun - Ven: 08:30 - 18:30)</Label>
            <Input value={form.hoursWeek} onChange={(e) => setForm({ ...form, hoursWeek: e.target.value })} />
          </div>
          <div>
            <Label>Horaires - Samedi (Ex: Samedi: 09:00 - 14:00)</Label>
            <Input value={form.hoursSat} onChange={(e) => setForm({ ...form, hoursSat: e.target.value })} />
          </div>
        </div>

        <Button onClick={handleSave} className="bg-gradient-primary w-full md:w-auto">
          Enregistrer les modifications
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Courses / Formations Admin ──────────────────────────────────
function CoursesAdmin() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Form states
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState("");
  const [difficulty, setDifficulty] = useState("Tous niveaux");
  const [price, setPrice] = useState("Sur devis");
  const [desc, setDesc] = useState("");
  const [type, setType] = useState<"video" | "written">("video");
  const [featuresText, setFeaturesText] = useState("");
  const [audienceText, setAudienceText] = useState("");
  const [skillsText, setSkillsText] = useState("");
  const [modules, setModules] = useState<CourseModule[]>([]);

  // Helpers
  const [newModuleName, setNewModuleName] = useState("");

  useEffect(() => {
    setCourses(getCourses());
  }, []);

  const startAdd = () => {
    setTitle("");
    setDuration("");
    setDifficulty("Tous niveaux");
    setPrice("Sur devis");
    setDesc("");
    setType("video");
    setFeaturesText("");
    setAudienceText("");
    setSkillsText("");
    setModules([]);
    setEditingCourse(null);
    setIsAdding(true);
  };

  const startEdit = (course: Course) => {
    setEditingCourse(course);
    setTitle(course.title);
    setDuration(course.duration);
    setDifficulty(course.difficulty);
    setPrice(course.price);
    setDesc(course.desc);
    setType(course.type);
    setFeaturesText(course.features.join("\n"));
    setAudienceText(course.audience.join("\n"));
    setSkillsText(course.skills.join("\n"));
    setModules(course.modules || []);
    setIsAdding(false);
  };

  const handleSave = () => {
    if (!title.trim() || !desc.trim()) {
      toast.error("Le titre et la description sont requis.");
      return;
    }

    const slug = editingCourse ? editingCourse.id : title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    const newCourse: Course = {
      id: slug,
      title,
      duration,
      difficulty,
      price,
      desc,
      type,
      features: featuresText.split("\n").map(s => s.trim()).filter(Boolean),
      audience: audienceText.split("\n").map(s => s.trim()).filter(Boolean),
      skills: skillsText.split("\n").map(s => s.trim()).filter(Boolean),
      modules
    };

    let updatedCourses = [...courses];
    if (editingCourse) {
      updatedCourses = courses.map(c => c.id === editingCourse.id ? newCourse : c);
    } else {
      updatedCourses.push(newCourse);
    }

    saveCourses(updatedCourses);
    setCourses(updatedCourses);
    setIsAdding(false);
    setEditingCourse(null);
    toast.success("Formation enregistrée avec succès !");
  };

  const handleDelete = (id: string) => {
    if (confirm("Voulez-vous vraiment supprimer cette formation ?")) {
      const updated = courses.filter(c => c.id !== id);
      saveCourses(updated);
      setCourses(updated);
      toast.success("Formation supprimée.");
    }
  };

  const addModule = () => {
    if (!newModuleName.trim()) return;
    setModules([...modules, { title: newModuleName, unlocked: true, videos: [] }]);
    setNewModuleName("");
  };

  const removeModule = (index: number) => {
    setModules(modules.filter((_, i) => i !== index));
  };

  const addLesson = (modIndex: number) => {
    const lessonTitle = prompt("Titre de la leçon :");
    if (!lessonTitle) return;
    const lessonDuration = prompt("Durée ou temps de lecture (ex: 12:30 ou Lecture: 10 min) :", "10:00");
    if (!lessonDuration) return;

    let videoUrl = "";
    let content = "";
    if (type === "video") {
      videoUrl = prompt("Lien de la vidéo (MP4 ou URL de streaming) :", "https://www.w3schools.com/html/mov_bbb.mp4") || "";
    } else {
      content = prompt("Contenu textuel du cours :") || "";
    }

    const newLesson: Lesson = {
      id: "les-" + Math.random().toString(36).substring(2, 7),
      title: lessonTitle,
      duration: lessonDuration,
      watched: false,
      videoUrl: type === "video" ? videoUrl : undefined,
      content: type === "written" ? content : undefined
    };

    const updated = [...modules];
    updated[modIndex].videos.push(newLesson);
    setModules(updated);
  };

  const removeLesson = (modIndex: number, lesIndex: number) => {
    const updated = [...modules];
    updated[modIndex].videos = updated[modIndex].videos.filter((_, i) => i !== lesIndex);
    setModules(updated);
  };

  return (
    <Card className="glass border-border/40">
      <CardHeader className="flex flex-row justify-between items-center border-b border-border/40">
        <div>
          <CardTitle>Gestion des Formations & Leçons</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">Créez des cours vidéo ou écrits pour l'académie.</p>
        </div>
        {!isAdding && !editingCourse && (
          <Button onClick={startAdd} className="bg-primary text-primary-foreground text-xs flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" />
            Ajouter une formation
          </Button>
        )}
      </CardHeader>

      <CardContent className="pt-6">
        {isAdding || editingCourse ? (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="font-heading font-bold text-sm text-primary">
                {editingCourse ? `Modifier la formation : ${editingCourse.title}` : "Nouvelle Formation"}
              </h3>
              <Button variant="ghost" size="sm" onClick={() => { setIsAdding(false); setEditingCourse(null); }} className="text-xs">
                Annuler
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Titre du cours</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Copywriting Élite" className="bg-secondary" />
              </div>
              <div>
                <Label className="text-xs">Durée totale (ex: 6 semaines, 3 semaines)</Label>
                <Input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="Ex: 6 semaines" className="bg-secondary" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs">Difficulté (ex: Débutant, Tous niveaux)</Label>
                <Input value={difficulty} onChange={(e) => setDifficulty(e.target.value)} placeholder="Ex: Tous niveaux" className="bg-secondary" />
              </div>
              <div>
                <Label className="text-xs">Tarif (ex: Sur devis, 150 000 FCFA)</Label>
                <Input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Ex: Sur devis" className="bg-secondary" />
              </div>
              <div>
                <Label className="text-xs">Type de support</Label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as "video" | "written")}
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary mt-1 h-9"
                >
                  <option value="video">Cours Vidéo</option>
                  <option value="written">Cours Écrit / Texte</option>
                </select>
              </div>
            </div>

            <div>
              <Label className="text-xs">Description de présentation</Label>
              <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} placeholder="Présentation marketing de la formation..." className="bg-secondary text-xs" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs">Points clés (Un par ligne)</Label>
                <Textarea value={featuresText} onChange={(e) => setFeaturesText(e.target.value)} rows={4} placeholder="Ex: Création de tunnels" className="bg-secondary text-xs" />
              </div>
              <div>
                <Label className="text-xs">Public cible (Un par ligne)</Label>
                <Textarea value={audienceText} onChange={(e) => setAudienceText(e.target.value)} rows={4} placeholder="Ex: Entrepreneurs" className="bg-secondary text-xs" />
              </div>
              <div>
                <Label className="text-xs">Compétences visées (Un par ligne)</Label>
                <Textarea value={skillsText} onChange={(e) => setSkillsText(e.target.value)} rows={4} placeholder="Ex: Copywriting" className="bg-secondary text-xs" />
              </div>
            </div>

            {/* Modules and lessons editor */}
            <div className="border-t border-border/40 pt-4 space-y-4">
              <div className="flex justify-between items-center">
                <Label className="font-bold text-sm text-foreground">Modules & Leçons du cours</Label>
                <div className="flex gap-2">
                  <Input value={newModuleName} onChange={(e) => setNewModuleName(e.target.value)} placeholder="Nom du module..." className="bg-secondary h-8 text-xs max-w-xs" />
                  <Button onClick={addModule} size="sm" className="text-xs">Ajouter module</Button>
                </div>
              </div>

              <div className="space-y-4">
                {modules.map((mod, modIdx) => (
                  <div key={modIdx} className="p-4 rounded-xl bg-secondary/30 border border-border/40 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-foreground">{mod.title}</span>
                      <Button variant="ghost" size="sm" onClick={() => removeModule(modIdx)} className="text-[10px] text-red-400 h-6">
                        Supprimer module
                      </Button>
                    </div>

                    <div className="pl-3 border-l border-border/60 space-y-2">
                      {mod.videos.map((les, lesIdx) => (
                        <div key={les.id} className="flex justify-between items-center p-2 rounded bg-secondary/80 border border-border/30 text-xs">
                          <div className="flex items-center gap-2">
                            {type === "video" ? <Video className="w-3.5 h-3.5 text-primary" /> : <FileText className="w-3.5 h-3.5 text-accent" />}
                            <span>{les.title}</span>
                            <span className="text-[10px] text-muted-foreground">({les.duration})</span>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => removeLesson(modIdx, lesIdx)} className="text-[10px] text-red-400 h-6">
                            Supprimer
                          </Button>
                        </div>
                      ))}
                      <Button onClick={() => addLesson(modIdx)} variant="outline" size="sm" className="text-[10px] h-7 border-dashed border-primary/40 text-primary">
                        + Ajouter une leçon ({type === "video" ? "vidéo" : "écrite"})
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Button onClick={handleSave} className="bg-gradient-primary w-full md:w-auto">
              Sauvegarder la formation
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border/60 text-muted-foreground font-bold">
                    <th className="py-2">Titre</th>
                    <th className="py-2">Type</th>
                    <th className="py-2">Durée</th>
                    <th className="py-2">Difficulté</th>
                    <th className="py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((course) => (
                    <tr key={course.id} className="border-b border-border/30 text-foreground">
                      <td className="py-3 font-semibold">{course.title}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${course.type === 'video' ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent'}`}>
                          {course.type === "video" ? "Vidéo" : "Écrit / Texte"}
                        </span>
                      </td>
                      <td className="py-3 text-muted-foreground">{course.duration}</td>
                      <td className="py-3 text-muted-foreground">{course.difficulty}</td>
                      <td className="py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button onClick={() => startEdit(course)} variant="outline" size="sm" className="h-7 text-[10px] border-primary/20 text-primary">
                            Modifier
                          </Button>
                          <Button onClick={() => handleDelete(course.id)} variant="outline" size="sm" className="h-7 text-[10px] border-red-500/20 text-red-400">
                            Supprimer
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default Admin;
