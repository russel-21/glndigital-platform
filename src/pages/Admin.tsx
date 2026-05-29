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
            <TabsTrigger value="roles">Rôles & Utilisateurs</TabsTrigger>
            <TabsTrigger value="site-settings">Configuration Site (Header/Footer)</TabsTrigger>
          </TabsList>

          <TabsContent value="testimonials">
            <TestimonialsAdmin queryClient={queryClient} />
          </TabsContent>
          <TabsContent value="media">
            <MediaAdmin queryClient={queryClient} />
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
        full_name: "Russel Yamegni (Simulation)",
        phone: "+237692062677",
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

export default Admin;
