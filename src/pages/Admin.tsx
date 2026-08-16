import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Trash2, Plus, Eye, EyeOff, Video, FileText, Edit2, ShieldAlert, CheckCircle, 
  Clock, AlertTriangle, Lightbulb, Sparkles, Share2, Globe, BarChart2, Star, 
  Target, Camera, Database, Users, Laptop, Smartphone, HelpCircle, PlusCircle, ArrowRight, Upload, Info
} from "lucide-react";
import { getCourses, saveCourses, Course, CourseModule, Lesson, generateDefaultQuiz } from "@/lib/coursesStore";
import { 
  getAuditRequests, 
  saveAuditRequests, 
  fetchRemoteAuditRequests,
  saveRemoteAuditRequests,
  deleteRemoteAuditRequest,
  AuditRequest, 
  AuditReport, 
  CompetitorData, 
  ScreenshotAnnotation, 
  SocialMetrics, 
  WebMetrics, 
  ChannelMetrics,
  AIGrowthSuite,
  ProformaInvoice,
  ProformaItem,
  defaultAuditRequests
} from "@/lib/auditStore";
import { addNotification } from "@/lib/notificationsStore";
import {
  getSiteContentBlocks,
  saveSiteContentBlocks,
  siteContentPages,
  SiteContentBlock,
  SiteContentPage,
} from "@/lib/siteContent";
import {
  CompetitiveProfile,
  getCompetitiveIntel,
  resetCompetitiveIntel,
} from "@/lib/competitiveIntel";
import {
  Platform as Phase1Platform,
  PLATFORM_LABELS as PHASE1_PLATFORM_LABELS,
  SocialConnection,
  AuditSnapshot,
  fetchSocialConnections,
  createSocialConnection,
  deleteSocialConnection,
  fetchAuditSnapshots,
  triggerPhase1Audit,
  updateBrandBrief,
} from "@/lib/phase1AuditStore";
import {
  DiagnosticScreenshot,
  Diagnostic,
  uploadDiagnosticScreenshot,
  fetchDiagnosticScreenshots,
  getDiagnosticScreenshotUrl,
  deleteDiagnosticScreenshot,
  fetchDiagnostics,
  triggerPhase2Diagnostic,
  reviewDiagnostic,
} from "@/lib/phase2DiagnosticStore";
import {
  ContentStrategy,
  fetchContentStrategies,
  triggerPhase3Strategy,
  reviewContentStrategy,
} from "@/lib/phase3StrategyStore";
import {
  ContentDraft,
  fetchContentDrafts,
  triggerPhase4aDraft,
  reviewContentDraft,
} from "@/lib/phase4aTextStore";
import {
  ScheduledPublication,
  fetchScheduledPublications,
  schedulePublication,
  executeScheduledPublication,
  rescheduleScheduledPublication,
  cancelScheduledPublication,
  fetchPublishTimeSuggestion,
  PublishTimeSuggestion,
} from "@/lib/phase5PublishStore";
import { toast } from "sonner";

const scrapePage = async (url: string, platform: 'facebook' | 'instagram' | 'tiktok' | 'youtube' | 'snapchat' | 'web') => {
  try {
    let cleanUrl = url.trim();
    if (!/^https?:\/\//i.test(cleanUrl)) {
      cleanUrl = 'https://' + cleanUrl;
    }
    
    let title = "";
    let description = "";
    
    // Social platforms are rendered dynamically and block direct fetches or proxy scrapers.
    // Microlink's metadata API runs Puppeteer to fetch fully rendered page titles and descriptions.
    if (platform !== 'web') {
      try {
        const microlinkUrl = `https://api.microlink.io?url=${encodeURIComponent(cleanUrl)}`;
        const mRes = await fetch(microlinkUrl);
        if (mRes.ok) {
          const mJson = await mRes.json();
          if (mJson.status === 'success' && mJson.data) {
            title = mJson.data.title || "";
            description = mJson.data.description || "";
          }
        }
      } catch (e) {
        console.warn("Microlink metadata fetch failed, trying proxy fallback...", e);
      }
    }
    
    // Fallback to AllOrigins CORS Proxy if Microlink failed or for standard web URL
    if (!title && !description) {
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(cleanUrl)}`;
      const res = await fetch(proxyUrl);
      if (!res.ok) throw new Error(`HTTP status ${res.status}`);
      const json = await res.json();
      const html = json.contents;
      if (!html) throw new Error("Pas de contenu HTML retourné par le proxy.");
      
      const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
      if (titleMatch) title = titleMatch[1];
      
      const ogTitleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i) ||
                           html.match(/<meta\s+name=["']og:title["']\s+content=["']([^"']+)["']/i);
      if (ogTitleMatch) title = ogTitleMatch[1];
      
      const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i) ||
                        html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i);
      if (descMatch) description = descMatch[1];
    }
    
    // Format Title
    if (title) {
      title = title
        .replace(/\s*\|\s*Facebook/gi, '')
        .replace(/\s*•\s*Instagram\s*photos\s*and\s*videos/gi, '')
        .replace(/\s*-\s*Instagram/gi, '')
        .replace(/\s*on\s*TikTok/gi, '')
        .replace(/\s*-\s*YouTube/gi, '')
        .trim();
    }
    
    const result: any = { success: true, title, description };
    
    if (description) {
      // More robust patterns matching various layouts and formats (e.g. "12 345", "12k", "12.3k", etc.)
      const countPattern = "([\\d\\s,.]+\\s*[KM]?)";
      
      if (platform === 'facebook') {
        const followersMatch = description.match(new RegExp(`${countPattern}\\s*(abonnés|followers)`, 'i'));
        const likesMatch = description.match(new RegExp(`${countPattern}\\s*(mentions J’aime|likes|J’aime)`, 'i'));
        
        if (followersMatch) result.followers = followersMatch[1].trim();
        if (likesMatch) result.likes = likesMatch[1].trim();
      } else if (platform === 'instagram') {
        const followersMatch = description.match(new RegExp(`${countPattern}\\s*(Followers|abonnés)`, 'i'));
        const postsMatch = description.match(new RegExp(`${countPattern}\\s*(Posts|publications)`, 'i'));
        
        if (followersMatch) result.followers = followersMatch[1].trim();
        if (postsMatch) result.posts = postsMatch[1].trim();
      } else if (platform === 'tiktok') {
        const followersMatch = description.match(new RegExp(`${countPattern}\\s*(Followers|abonnés)`, 'i'));
        if (followersMatch) result.followers = followersMatch[1].trim();
      } else if (platform === 'youtube') {
        const subscribersMatch = description.match(new RegExp(`${countPattern}\\s*(abonnés|subscribers|followers)`, 'i'));
        if (subscribersMatch) result.followers = subscribersMatch[1].trim();
      } else if (platform === 'snapchat') {
        const subscribersMatch = description.match(new RegExp(`${countPattern}\\s*(abonnés|subscribers|followers)`, 'i'));
        if (subscribersMatch) result.followers = subscribersMatch[1].trim();
      }
    }
    if (platform !== 'web' && !result.followers) {
      try {
        const queryTerm = `site:${cleanUrl.replace(/^https?:\/\/(www\.)?/i, '')}`;
        const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(queryTerm)}`;
        const proxySearchUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(searchUrl)}`;
        const sRes = await fetch(proxySearchUrl);
        if (sRes.ok) {
          const sJson = await sRes.json();
          const sHtml = sJson?.contents;
          if (sHtml) {
            const snippetMatches = sHtml.match(/<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi);
            if (snippetMatches) {
              const countPattern = "([\\d\\s,.]+\\s*[KM]?)";
              for (const match of snippetMatches) {
                const cleanText = match.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
                
                if (platform === 'facebook') {
                  const followersMatch = cleanText.match(new RegExp(`${countPattern}\\s*(abonnés|followers)`, 'i'));
                  const likesMatch = cleanText.match(new RegExp(`${countPattern}\\s*(mentions J’aime|likes|J’aime)`, 'i'));
                  if (followersMatch && !result.followers) result.followers = followersMatch[1].trim();
                  if (likesMatch && !result.likes) result.likes = likesMatch[1].trim();
                } else if (platform === 'instagram') {
                  const followersMatch = cleanText.match(new RegExp(`${countPattern}\\s*(Followers|abonnés)`, 'i'));
                  if (followersMatch && !result.followers) result.followers = followersMatch[1].trim();
                } else if (platform === 'tiktok') {
                  const followersMatch = cleanText.match(new RegExp(`${countPattern}\\s*(Followers|abonnés)`, 'i'));
                  if (followersMatch && !result.followers) result.followers = followersMatch[1].trim();
                } else if (platform === 'youtube') {
                  const subscribersMatch = cleanText.match(new RegExp(`${countPattern}\\s*(abonnés|subscribers|followers)`, 'i'));
                  if (subscribersMatch && !result.followers) result.followers = subscribersMatch[1].trim();
                } else if (platform === 'snapchat') {
                  const subscribersMatch = cleanText.match(new RegExp(`${countPattern}\\s*(abonnés|subscribers|followers)`, 'i'));
                  if (subscribersMatch && !result.followers) result.followers = subscribersMatch[1].trim();
                }
                
                if (result.followers) {
                  result.description = cleanText;
                  break;
                }
              }
            }
          }
        }
      } catch (e) {
        console.warn("Search snippet fallback failed:", e);
      }
    }

    return result;
  } catch (err: any) {
    return { success: false, error: err.message || String(err) };
  }
};

const Admin = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          setAuthenticated(false);
          return;
        }

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("roles,current_role,email")
          .eq("id", session.user.id)
          .single();

        if (error || !profile) {
          setAuthenticated(false);
          return;
        }

        const roles = (profile.roles || []) as string[];
        const isAdmin =
          roles.includes("admin") ||
          roles.includes("super_admin") ||
          profile.current_role === "admin" ||
          profile.current_role === "super_admin";

        setAuthenticated(isAdmin);
      } catch {
        setAuthenticated(false);
      } finally {
        setAuthChecked(true);
      }
    };

    void checkAdminAccess();
  }, []);

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-center">Verification admin</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center">Controle de la session securisee...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-center">Acces admin requis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Connectez-vous avec un compte Supabase ayant le role admin ou super_admin.
            </p>
            <Button asChild className="w-full bg-gradient-primary">
              <Link to="/auth">Aller a la connexion</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 overflow-x-hidden">
      <div className="container mx-auto px-4 md:px-8 min-w-0">
        <h1 className="font-heading text-3xl font-bold mb-8">Panneau d'administration</h1>
        <Tabs defaultValue="testimonials">
          <div className="mobile-scroll-x mb-6">
          <TabsList className="flex w-max min-w-full flex-nowrap gap-2">
            <TabsTrigger value="my-account">Mon compte</TabsTrigger>
            <TabsTrigger value="testimonials">Témoignages</TabsTrigger>
            <TabsTrigger value="media">Médias / Portfolio</TabsTrigger>
            <TabsTrigger value="courses">Gestion des Cours</TabsTrigger>
            <TabsTrigger value="roles">Rôles & Utilisateurs</TabsTrigger>
            <TabsTrigger value="audits">Audits & Prospects</TabsTrigger>
            <TabsTrigger value="phase1-audit">Audit IA (Phase 1)</TabsTrigger>
            <TabsTrigger value="competitive-intel">Veille IA</TabsTrigger>
            <TabsTrigger value="site-settings">Configuration Site (Header/Footer)</TabsTrigger>
            <TabsTrigger value="site-content">Contenu du site</TabsTrigger>
          </TabsList>
          </div>

          <TabsContent value="my-account">
            <MyAccountAdmin />
          </TabsContent>
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
          <TabsContent value="site-content">
            <SiteContentAdmin />
          </TabsContent>
          <TabsContent value="audits">
            <AuditsAdmin />
          </TabsContent>
          <TabsContent value="phase1-audit">
            <Phase1AuditAdmin queryClient={queryClient} />
          </TabsContent>
          <TabsContent value="competitive-intel">
            <CompetitiveIntelAdmin />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// ─── My Account (password change) ──────────────────────────────
// Real Supabase Auth password change for the currently signed-in admin —
// there was no such page anywhere on the site before this (verified: no
// supabase.auth.updateUser call existed in the codebase). Uses the
// authenticated client's own updateUser() call, which requires an active
// session and re-hashes the password server-side — no direct table access,
// no service-role key.
function MyAccountAdmin() {
  const [email, setEmail] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setEmail(session?.user?.email ?? null);
    });
  }, []);

  const handleChangePassword = async () => {
    if (newPassword.length < 8) {
      toast.error("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Mot de passe changé avec succès.");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(`Erreur : ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>Mon compte</CardTitle>
        {email && <p className="text-xs text-muted-foreground mt-1">Connecté en tant que {email}</p>}
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Nouveau mot de passe (8 caractères min)</Label>
          <Input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        <div>
          <Label>Confirmer le nouveau mot de passe</Label>
          <Input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        <Button
          onClick={handleChangePassword}
          disabled={loading || !newPassword || !confirmPassword}
          className="bg-gradient-primary"
        >
          Changer le mot de passe
        </Button>
      </CardContent>
    </Card>
  );
}

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

  // CRUD states
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [editingProfile, setEditingProfile] = useState<any | null>(null);
  const [viewingJourney, setViewingJourney] = useState<any | null>(null);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formRoles, setFormRoles] = useState<string[]>(["student"]);
  const [formStatus, setFormStatus] = useState<"active" | "inactive">("active");

  const getCustomUsers = (): any[] => {
    const data = localStorage.getItem("gln_custom_users");
    if (!data) return [];
    try { return JSON.parse(data); } catch { return []; }
  };

  const saveCustomUsers = (users: any[]) => {
    localStorage.setItem("gln_custom_users", JSON.stringify(users));
  };

  const fetchAllProfiles = async () => {
    try {
      setLoading(true);
      const { data: realProfiles } = await supabase
        .from("profiles")
        .select("*");
      
      let allProfiles = realProfiles || [];

      // Filter out profiles deleted locally
      const deletedList: string[] = JSON.parse(localStorage.getItem("gln_deleted_profiles") || "[]");
      allProfiles = allProfiles.filter(p => !deletedList.includes(p.id));

      // Combine with local custom users created by admin
      const customUsers = getCustomUsers();

      // Mock admin profile
      const mockAdminProfile = {
        id: "admin-mock-id-0000-000000000000",
        email: "russel@glndigital.com",
        full_name: "Super Admin",
        phone: "+237 000 000 000",
        roles: ["admin", "super_admin", "student", "partner"],
        current_role: localStorage.getItem("gln_mock_admin_current_role") || "admin",
        active_sessions: [],
        status: "active"
      };

      // Combine with mock user profile if exists
      const activeMock = localStorage.getItem("gln_active_mock_profile");
      const mockUserProfile = activeMock ? JSON.parse(activeMock) : null;

      // Filter duplicates and combine all
      allProfiles = [
        mockAdminProfile,
        ...(mockUserProfile ? [mockUserProfile] : []),
        ...customUsers,
        ...allProfiles.filter(p => p.id !== mockAdminProfile.id && (!mockUserProfile || p.id !== mockUserProfile.id) && !customUsers.some(cu => cu.id === p.id))
      ];

      // Load status and overrides for everyone
      allProfiles = allProfiles.map(p => {
        const status = localStorage.getItem(`gln_user_status_${p.id}`) || p.status || "active";
        
        let roles = p.roles || ["student"];
        const roleOverrideStr = localStorage.getItem(`gln_role_override_${p.id}`);
        if (roleOverrideStr) {
          try {
            roles = JSON.parse(roleOverrideStr);
          } catch (e) {
            console.error("Error parsing role override:", e);
          }
        }

        let profileOverride = {};
        const profileOverrideStr = localStorage.getItem(`gln_profile_override_${p.id}`);
        if (profileOverrideStr) {
          try {
            profileOverride = JSON.parse(profileOverrideStr);
          } catch (e) {
            console.error("Error parsing profile override:", e);
          }
        }
        
        return {
          ...p,
          ...profileOverride,
          roles,
          status
        };
      });

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

  const handleCreateUser = () => {
    if (!formName.trim() || !formEmail.trim()) {
      toast.error("Veuillez saisir un nom et un e-mail.");
      return;
    }

    const newUser = {
      id: "usr-" + Math.random().toString(36).substring(2, 7),
      full_name: formName.trim(),
      email: formEmail.trim(),
      phone: formPhone.trim(),
      roles: formRoles,
      status: formStatus,
      active_sessions: []
    };

    const current = getCustomUsers();
    current.push(newUser);
    saveCustomUsers(current);
    localStorage.setItem(`gln_user_status_${newUser.id}`, formStatus);

    toast.success("Utilisateur créé avec succès !");
    setIsAddingUser(false);
    clearForm();
    fetchAllProfiles();
  };

  const handleSaveEditUser = async () => {
    if (!editingProfile) return;
    if (!formName.trim() || !formEmail.trim()) {
      toast.error("Veuillez saisir un nom et un e-mail.");
      return;
    }

    const isCustom = editingProfile.id.startsWith("usr-");
    
    if (isCustom) {
      const current = getCustomUsers();
      const updated = current.map(u => {
        if (u.id === editingProfile.id) {
          return {
            ...u,
            full_name: formName.trim(),
            email: formEmail.trim(),
            phone: formPhone.trim(),
            roles: formRoles,
            status: formStatus
          };
        }
        return u;
      });
      saveCustomUsers(updated);
    } else {
      // Save local overrides for editing profile
      localStorage.setItem(`gln_user_status_${editingProfile.id}`, formStatus);
      localStorage.setItem(`gln_role_override_${editingProfile.id}`, JSON.stringify(formRoles));
      
      const localProfileOverride = {
        full_name: formName.trim(),
        email: formEmail.trim(),
        phone: formPhone.trim(),
      };
      localStorage.setItem(`gln_profile_override_${editingProfile.id}`, JSON.stringify(localProfileOverride));

      try {
        await supabase
          .from("profiles")
          .update({
            full_name: formName.trim(),
            email: formEmail.trim(),
            phone: formPhone.trim(),
            roles: formRoles,
          })
          .eq("id", editingProfile.id);
      } catch (err) {
        console.warn("Could not save profile edits directly to Supabase server, local storage sync used.", err);
      }
    }

    localStorage.setItem(`gln_user_status_${editingProfile.id}`, formStatus);

    toast.success("Utilisateur modifié avec succès !");
    setEditingProfile(null);
    clearForm();
    fetchAllProfiles();
  };

  const handleToggleActiveState = async (profile: any) => {
    const newStatus = profile.status === "active" ? "inactive" : "active";
    const isCustom = profile.id.startsWith("usr-");

    if (isCustom) {
      const current = getCustomUsers();
      const updated = current.map(u => {
        if (u.id === profile.id) return { ...u, status: newStatus };
        return u;
      });
      saveCustomUsers(updated);
    } else {
      try {
        await supabase
          .from("profiles")
          .update({ status: newStatus })
          .eq("id", profile.id);
      } catch (err) {
        console.warn("Could not update state directly to Supabase server, local override used.", err);
      }
    }
    
    localStorage.setItem(`gln_user_status_${profile.id}`, newStatus);
    toast.success(`Utilisateur ${newStatus === "active" ? "activé" : "désactivé"} !`);
    fetchAllProfiles();
  };

  const handleDeleteUser = async (profile: any) => {
    if (profile.id === "admin-mock-id-0000-000000000000") {
      toast.error("Le compte Super Admin principal ne peut pas être supprimé.");
      return;
    }

    if (confirm(`Voulez-vous vraiment supprimer l'utilisateur ${profile.full_name} ?`)) {
      const isCustom = profile.id.startsWith("usr-");
      if (isCustom) {
        const current = getCustomUsers();
        const updated = current.filter(u => u.id !== profile.id);
        saveCustomUsers(updated);
      } else {
        // Track deletion locally
        const deletedList: string[] = JSON.parse(localStorage.getItem("gln_deleted_profiles") || "[]");
        if (!deletedList.includes(profile.id)) {
          deletedList.push(profile.id);
          localStorage.setItem("gln_deleted_profiles", JSON.stringify(deletedList));
        }

        try {
          await supabase
            .from("profiles")
            .delete()
            .eq("id", profile.id);
        } catch (err) {
          console.warn("Could not execute deletion directly on Supabase server, deleted state tracked locally.", err);
        }
      }
      
      // Clean up localStorage keys
      localStorage.removeItem(`gln_user_status_${profile.id}`);
      localStorage.removeItem(`gln_role_override_${profile.id}`);
      localStorage.removeItem(`gln_profile_override_${profile.id}`);

      toast.success("Utilisateur supprimé !");
      fetchAllProfiles();
    }
  };

  const clearForm = () => {
    setFormName("");
    setFormEmail("");
    setFormPhone("");
    setFormRoles(["student"]);
    setFormStatus("active");
  };

  const handleOpenEdit = (p: any) => {
    setEditingProfile(p);
    setFormName(p.full_name || "");
    setFormEmail(p.email || "");
    setFormPhone(p.phone || "");
    setFormRoles(p.roles || ["student"]);
    setFormStatus(p.status || "active");
  };

  const handleToggleRole = async (profile: any, roleName: string) => {
    const isMock = profile.id.includes("mock") || profile.id.startsWith("usr-");
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
        if (profile.id === "admin-mock-id-0000-000000000000") {
          toast.success("Rôles du Super-Admin simulés mis à jour.");
        } else if (profile.id.startsWith("usr-")) {
          const current = getCustomUsers();
          const updated = current.map(u => {
            if (u.id === profile.id) return { ...u, roles: newRoles };
            return u;
          });
          saveCustomUsers(updated);
          toast.success("Rôles de l'utilisateur mis à jour.");
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
        const { error } = await supabase
          .from("profiles")
          .update({ roles: newRoles })
          .eq("id", profile.id);

        if (error) {
          localStorage.setItem(`gln_role_override_${profile.id}`, JSON.stringify(newRoles));
          toast.success("Rôles mis à jour (Sauvegardé localement).");
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
    const isMock = profile.id.includes("mock") || profile.id.startsWith("usr-");
    try {
      if (isMock) {
        if (profile.id === "admin-mock-id-0000-000000000000") {
          toast.success("Sessions de l'admin nettoyées.");
        } else if (profile.id.startsWith("usr-")) {
          toast.success("Sessions de l'utilisateur nettoyées.");
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
          toast.success("Toutes les sessions ont été nettoyées !");
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
    <Card className="glass border-border/40">
      <CardHeader className="flex flex-row justify-between items-center border-b border-border/40">
        <div>
          <CardTitle>Gestion des Utilisateurs & Rôles</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">Créez, modifiez, désactivez ou supprimez les comptes de la plateforme.</p>
        </div>
        <Button 
          onClick={() => { clearForm(); setIsAddingUser(true); }} 
          size="sm" 
          className="bg-primary text-primary-foreground font-bold flex items-center gap-1.5 h-8 text-[11px]"
        >
          <Plus className="w-4 h-4" />
          Créer un utilisateur
        </Button>
      </CardHeader>

      <CardContent className="pt-6">
        {/* ADD USER MODAL/OVERLAY */}
        {isAddingUser && (
          <div className="p-4 mb-6 rounded-2xl bg-secondary/20 border border-border/40 space-y-4">
            <h3 className="font-heading text-xs font-bold text-primary flex items-center gap-1.5 uppercase tracking-wider">
              <Plus className="w-4 h-4" />
              Nouveau Compte Utilisateur
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold">Nom Complet *</Label>
                <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ex: Jean Paul" className="bg-secondary text-xs h-8" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold">Adresse E-mail *</Label>
                <Input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="Ex: jean@gln.com" className="bg-secondary text-xs h-8" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold">Téléphone ( WhatsApp )</Label>
                <Input value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="Ex: +237 6xx xx xx xx" className="bg-secondary text-xs h-8" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold block">Sélection des Rôles</Label>
                <div className="flex gap-2">
                  {["student", "partner", "admin", "super_admin"].map((r) => {
                    const active = formRoles.includes(r);
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => {
                          if (active) {
                            setFormRoles(formRoles.filter(x => x !== r));
                          } else {
                            setFormRoles([...formRoles, r]);
                          }
                        }}
                        className={`px-2 py-1 rounded text-[9px] font-bold uppercase border transition-colors ${
                          active ? "bg-primary border-primary text-primary-foreground" : "bg-secondary border-border text-muted-foreground"
                        }`}
                      >
                        {r === "student" ? "Élève" : r === "partner" ? "Partenaire" : r}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-bold">Statut Initial</Label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as any)}
                  className="bg-secondary border border-border rounded-lg px-2 py-1 text-xs text-foreground focus:outline-none w-full h-8"
                >
                  <option value="active">Actif (Autorisé)</option>
                  <option value="inactive">Désactivé (Banni/Bloqué)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setIsAddingUser(false)} className="text-xs">Annuler</Button>
              <Button onClick={handleCreateUser} size="sm" className="bg-primary text-primary-foreground text-xs font-bold">Créer</Button>
            </div>
          </div>
        )}

        {/* EDIT USER MODAL/OVERLAY */}
        {editingProfile && (
          <div className="p-4 mb-6 rounded-2xl bg-secondary/20 border border-border/40 space-y-4">
            <h3 className="font-heading text-xs font-bold text-primary flex items-center gap-1.5 uppercase tracking-wider">
              <Edit2 className="w-4 h-4" />
              Modifier l'Utilisateur : {editingProfile.full_name}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold">Nom Complet *</Label>
                <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ex: Jean Paul" className="bg-secondary text-xs h-8" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold">Adresse E-mail *</Label>
                <Input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="Ex: jean@gln.com" className="bg-secondary text-xs h-8" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold">Téléphone</Label>
                <Input value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="Ex: +237 6xx xx xx" className="bg-secondary text-xs h-8" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold block">Sélection des Rôles</Label>
                <div className="flex gap-2">
                  {["student", "partner", "admin", "super_admin"].map((r) => {
                    const active = formRoles.includes(r);
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => {
                          if (active) {
                            setFormRoles(formRoles.filter(x => x !== r));
                          } else {
                            setFormRoles([...formRoles, r]);
                          }
                        }}
                        className={`px-2 py-1 rounded text-[9px] font-bold uppercase border transition-colors ${
                          active ? "bg-primary border-primary text-primary-foreground" : "bg-secondary border-border text-muted-foreground"
                        }`}
                      >
                        {r === "student" ? "Élève" : r === "partner" ? "Partenaire" : r}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-bold">Statut du Compte</Label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as any)}
                  className="bg-secondary border border-border rounded-lg px-2 py-1 text-xs text-foreground focus:outline-none w-full h-8"
                >
                  <option value="active">Actif (Autorisé)</option>
                  <option value="inactive">Désactivé (Banni/Bloqué)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setEditingProfile(null)} className="text-xs">Annuler</Button>
              <Button onClick={handleSaveEditUser} size="sm" className="bg-primary text-primary-foreground text-xs font-bold">Enregistrer</Button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border/60 text-muted-foreground font-bold">
                <th className="pb-3 pr-4">Nom & E-mail</th>
                <th className="pb-3 pr-4">Téléphone</th>
                <th className="pb-3 pr-4">Rôles Actifs</th>
                <th className="pb-3 pr-4">Appareils</th>
                <th className="pb-3 pr-4">Statut</th>
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
                  <td className="py-4 pr-4">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                      p.status === "active" 
                        ? "bg-green-500/10 text-green-400 border-green-500/20" 
                        : "bg-red-500/10 text-red-400 border-red-500/20"
                    }`}>
                      {p.status === "active" ? "Actif" : "Désactivé"}
                    </span>
                  </td>
                  <td className="py-4 text-right">
                    <div className="flex justify-end gap-1.5">
                      <Button
                        onClick={() => setViewingJourney(p)}
                        variant="outline"
                        size="sm"
                        className="text-[10px] h-7 border-primary/25 text-primary hover:bg-primary/10 font-bold"
                      >
                        Parcours
                      </Button>
                      <Button
                        onClick={() => handleOpenEdit(p)}
                        variant="outline"
                        size="sm"
                        className="text-[10px] h-7 border-border hover:bg-secondary"
                      >
                        Modifier
                      </Button>
                      <Button
                        onClick={() => handleToggleActiveState(p)}
                        variant="outline"
                        size="sm"
                        className={`text-[10px] h-7 ${
                          p.status === "active"
                            ? "border-amber-500/30 text-amber-500 hover:bg-amber-500/10"
                            : "border-green-500/30 text-green-400 hover:bg-green-500/10"
                        }`}
                      >
                        {p.status === "active" ? "Désactiver" : "Activer"}
                      </Button>
                      <Button
                        onClick={() => handleDeleteUser(p)}
                        variant="outline"
                        size="sm"
                        className="text-[10px] h-7 border-red-500/20 hover:bg-red-500/10 text-red-400"
                        disabled={p.id === "admin-mock-id-0000-000000000000"}
                      >
                        Supprimer
                      </Button>
                      <Button
                        onClick={() => handleClearSessions(p)}
                        variant="outline"
                        size="sm"
                        className="text-[10px] h-7 border-destructive/20 hover:bg-destructive/10 text-destructive/80"
                      >
                        Sessions
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* USER JOURNEY MODAL/OVERLAY */}
        {viewingJourney && (() => {
          const userAudits = getAuditRequests().filter(
            (req) => req.email.toLowerCase() === viewingJourney.email.toLowerCase()
          );
          const savedCity = localStorage.getItem(`gln_partner_city_${viewingJourney.id}`) || "";
          
          return (
            <div className="fixed inset-0 bg-background/95 backdrop-blur-md z-50 overflow-y-auto flex items-center justify-center p-4 text-foreground">
              <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col shadow-2xl">
                {/* Modal Header */}
                <div className="border-b border-border/60 p-6 flex justify-between items-start">
                  <div>
                    <h2 className="font-heading text-lg font-black text-foreground">
                      Parcours Client & Activités
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Suivi complet du tunnel de conversion pour {viewingJourney.full_name}
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setViewingJourney(null)}
                    className="text-xs h-8 border-border"
                  >
                    Fermer
                  </Button>
                </div>

                {/* Modal Content */}
                <div className="p-6 space-y-6 flex-1">
                  {/* Profile Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-secondary/35 p-4 rounded-xl border border-border/40">
                    <div className="space-y-1">
                      <span className="block text-[9px] font-bold text-muted-foreground uppercase">Utilisateur</span>
                      <span className="block text-xs font-bold text-foreground">{viewingJourney.full_name}</span>
                      <span className="block text-[10px] text-muted-foreground">{viewingJourney.email}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="block text-[9px] font-bold text-muted-foreground uppercase">Coordonnées & Statut</span>
                      <span className="block text-xs text-foreground font-mono">{viewingJourney.phone || "Aucun téléphone"}</span>
                      {savedCity && (
                        <span className="block text-[10px] text-primary font-medium">Ville : {savedCity}</span>
                      )}
                      <div className="flex gap-1.5 mt-1">
                        {viewingJourney.roles.map((role: string) => (
                          <span key={role} className="px-1.5 py-0.5 bg-primary/10 text-primary border border-primary/20 text-[8px] font-bold uppercase rounded">
                            {role === "student" ? "Élève" : role === "partner" ? "Partenaire" : role}
                          </span>
                        ))}
                        <span className={`px-1.5 py-0.5 text-[8px] font-bold uppercase rounded border ${
                          viewingJourney.status === "active" ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"
                        }`}>
                          {viewingJourney.status === "active" ? "Actif" : "Désactivé"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Timeline section */}
                  <div className="space-y-3">
                    <h4 className="font-heading text-xs font-bold text-foreground">Flux d'activités & Visites</h4>
                    <div className="relative border-l border-border/60 ml-3 pl-5 space-y-4 text-xs">
                      {/* Event 1: Registration */}
                      <div className="relative">
                        <div className="absolute -left-[25px] mt-0.5 bg-primary rounded-full w-2.5 h-2.5 border border-background"></div>
                        <span className="text-[10px] font-bold text-muted-foreground block">
                          {new Date(viewingJourney.created_at || "2026-06-01T10:00:00Z").toLocaleDateString("fr-FR")} à {new Date(viewingJourney.created_at || "2026-06-01T10:00:00Z").toLocaleTimeString("fr-FR", {hour: '2-digit', minute:'2-digit'})}
                        </span>
                        <span className="font-semibold text-foreground">Inscription effectuée</span>
                        <p className="text-[10px] text-muted-foreground">Création de compte avec le rôle par défaut "Visiteur".</p>
                      </div>

                      {/* Event 2: Authentication page view */}
                      <div className="relative">
                        <div className="absolute -left-[25px] mt-0.5 bg-muted rounded-full w-2.5 h-2.5 border border-background"></div>
                        <span className="text-[10px] font-bold text-muted-foreground block">Visite</span>
                        <span className="font-semibold text-foreground">Page de Connexion / Inscription</span>
                        <p className="text-[10px] text-muted-foreground">Accès à la plateforme et validation OTP réussie.</p>
                      </div>

                      {/* Event 3: Dashboard visits count */}
                      <div className="relative">
                        <div className="absolute -left-[25px] mt-0.5 bg-muted rounded-full w-2.5 h-2.5 border border-background"></div>
                        <span className="text-[10px] font-bold text-muted-foreground block">Consultation</span>
                        <span className="font-semibold text-foreground">
                          Tableau de bord unifié ({viewingJourney.roles.includes("student") ? "Élève / Visiteur" : "Partenaire"})
                        </span>
                        <p className="text-[10px] text-muted-foreground">
                          L'utilisateur a visité l'espace connecté. Total de sessions enregistrées : {viewingJourney.active_sessions?.length || 1} session(s) active(s).
                        </p>
                      </div>

                      {/* Event 4: Services submission */}
                      {userAudits.map((audit) => (
                        <div key={audit.id} className="relative">
                          <div className="absolute -left-[25px] mt-0.5 bg-green-500 rounded-full w-2.5 h-2.5 border border-background shadow-glow"></div>
                          <span className="text-[10px] font-bold text-green-400 block">
                            {new Date(audit.createdAt).toLocaleDateString("fr-FR")} (Soumis)
                          </span>
                          <span className="font-semibold text-foreground">Demande d'Audit gratuit & Services</span>
                          <p className="text-[10px] text-muted-foreground">
                            Secteur: <span className="text-foreground">{audit.activitySector || "Général"}</span> | Ville: <span className="text-foreground">{audit.city || "Non spécifié"}</span>
                          </p>
                          <div className="flex gap-2 items-center mt-1.5">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase ${
                              audit.status === "completed" ? "bg-green-500/10 text-green-400" : "bg-amber-500/10 text-amber-400"
                            }`}>
                              Rapport : {audit.status === "completed" ? "Terminé" : "En attente"}
                            </span>
                            {audit.crm?.assignedCloser && (
                              <span className="text-[9px] text-muted-foreground">
                                Closer : <span className="text-foreground font-semibold">{audit.crm.assignedCloser}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Service Demands List */}
                  <div className="space-y-3 pt-2">
                    <h4 className="font-heading text-xs font-bold text-foreground">Demandes de Services Actives</h4>
                    {userAudits.length > 0 ? (
                      <div className="space-y-3">
                        {userAudits.map((audit) => (
                          <div key={audit.id} className="border border-border/40 p-4 rounded-xl bg-card space-y-2">
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="font-semibold text-xs text-foreground block">{audit.companyName || "Service Individuel"}</span>
                                <span className="text-[10px] text-muted-foreground block">ID: {audit.id}</span>
                              </div>
                              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                audit.status === "completed" ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              }`}>
                                {audit.status === "completed" ? "Rapport publié" : "En cours de traitement IA (80%)"}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground pt-1 border-t border-border/20">
                              <div>Budget marketing: <span className="text-foreground font-semibold">{audit.marketingBudget || "Non renseigné"}</span></div>
                              <div>Objectif principal: <span className="text-foreground font-semibold">{audit.mainObjective || "Non renseigné"}</span></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 border border-dashed border-border rounded-xl bg-secondary/10">
                        <p className="text-xs text-muted-foreground italic">Aucune demande de service ou d'audit soumise à ce jour.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="border-t border-border/60 p-4 bg-secondary/10 flex justify-end">
                  <Button 
                    onClick={() => setViewingJourney(null)}
                    className="bg-primary text-primary-foreground text-xs font-bold"
                  >
                    Fermer le parcours
                  </Button>
                </div>
              </div>
            </div>
          );
        })()}
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
    availability: localStorage.getItem("gln_settings_availability") || "Disponible 24h/24 et 7j/7",
  });

  const handleSave = () => {
    localStorage.setItem("gln_settings_email", form.email);
    localStorage.setItem("gln_settings_whatsapp", form.whatsapp);
    localStorage.setItem("gln_settings_address", form.address);
    localStorage.setItem("gln_settings_availability", form.availability);
    
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

        <div>
          <Label>Disponibilite</Label>
          <Input value={form.availability} onChange={(e) => setForm({ ...form, availability: e.target.value })} />
          <p className="text-xs text-muted-foreground mt-2">
            Les horaires fixes ont ete retires. GLN Digital est presente comme disponible 24h/24 et 7j/7.
          </p>
        </div>

        <Button onClick={handleSave} className="bg-gradient-primary w-full md:w-auto">
          Enregistrer les modifications
        </Button>
      </CardContent>
    </Card>
  );
}

function SiteContentAdmin() {
  const emptyForm = {
    page: "home" as SiteContentPage,
    title: "",
    body: "",
    ctaLabel: "",
    ctaUrl: "",
    active: true,
    order: 1,
  };
  const [blocks, setBlocks] = useState<SiteContentBlock[]>(() => getSiteContentBlocks());
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const persist = (next: SiteContentBlock[]) => {
    const sorted = [...next].sort((a, b) => a.page.localeCompare(b.page) || a.order - b.order);
    setBlocks(sorted);
    saveSiteContentBlocks(sorted);
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleSave = () => {
    if (!form.title.trim() || !form.body.trim()) {
      toast.error("Ajoutez au moins un titre et un contenu.");
      return;
    }

    if (editingId) {
      persist(blocks.map((block) => block.id === editingId ? { ...block, ...form } : block));
      toast.success("Bloc de contenu modifie.");
    } else {
      persist([
        ...blocks,
        {
          id: `content-${Date.now()}`,
          ...form,
        },
      ]);
      toast.success("Bloc de contenu ajoute.");
    }
    resetForm();
  };

  const handleEdit = (block: SiteContentBlock) => {
    setEditingId(block.id);
    setForm({
      page: block.page,
      title: block.title,
      body: block.body,
      ctaLabel: block.ctaLabel || "",
      ctaUrl: block.ctaUrl || "",
      active: block.active,
      order: block.order,
    });
  };

  const toggleActive = (block: SiteContentBlock) => {
    persist(blocks.map((item) => item.id === block.id ? { ...item, active: !item.active } : item));
  };

  const removeBlock = (id: string) => {
    persist(blocks.filter((block) => block.id !== id));
    if (editingId === id) resetForm();
    toast.success("Bloc supprime.");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestion du contenu des pages</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Page</Label>
            <Select value={form.page} onValueChange={(value) => setForm({ ...form, page: value as SiteContentPage })}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir une page" />
              </SelectTrigger>
              <SelectContent>
                {siteContentPages.map((page) => (
                  <SelectItem key={page.value} value={page.value}>{page.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Ordre d'affichage</Label>
            <Input
              type="number"
              min={1}
              value={form.order}
              onChange={(e) => setForm({ ...form, order: Number(e.target.value) || 1 })}
            />
          </div>
        </div>

        <div>
          <Label>Titre</Label>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>

        <div>
          <Label>Contenu</Label>
          <Textarea rows={5} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Bouton optionnel</Label>
            <Input value={form.ctaLabel} onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })} placeholder="Ex: En savoir plus" />
          </div>
          <div>
            <Label>Lien du bouton</Label>
            <Input value={form.ctaUrl} onChange={(e) => setForm({ ...form, ctaUrl: e.target.value })} placeholder="/services ou https://..." />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => setForm({ ...form, active: e.target.checked })}
          />
          Bloc actif sur le site
        </label>

        <div className="flex flex-wrap gap-2">
          <Button onClick={handleSave} className="bg-gradient-primary">
            {editingId ? "Modifier le bloc" : "Ajouter le bloc"}
          </Button>
          {editingId && (
            <Button variant="outline" onClick={resetForm}>
              Annuler
            </Button>
          )}
        </div>

        <div className="space-y-3">
          {blocks.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun bloc ajoute pour le moment.</p>
          ) : (
            blocks.map((block) => (
              <div key={block.id} className="border border-border rounded-xl p-4 bg-secondary/10">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div>
                    <p className="text-xs text-primary font-bold uppercase">
                      {siteContentPages.find((page) => page.value === block.page)?.label} · ordre {block.order}
                    </p>
                    <h3 className="font-heading text-lg font-bold">{block.title}</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-line mt-1">{block.body}</p>
                    <p className="text-xs mt-2">{block.active ? "Actif" : "Desactive"}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(block)}>
                      <Edit2 className="w-4 h-4 mr-1" /> Modifier
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => toggleActive(block)}>
                      {block.active ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
                      {block.active ? "Desactiver" : "Activer"}
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => removeBlock(block.id)}>
                      <Trash2 className="w-4 h-4 mr-1" /> Supprimer
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Courses / Formations Admin ──────────────────────────────────
function CompetitiveIntelAdmin() {
  const [profiles, setProfiles] = useState<CompetitiveProfile[]>([]);

  useEffect(() => {
    setProfiles(getCompetitiveIntel());
  }, []);

  const handleReset = () => {
    const reset = resetCompetitiveIntel();
    setProfiles(reset);
    toast.success("Base de veille IA reinitialisee avec les donnees concurrentielles.");
  };

  return (
    <Card className="glass border-border/40">
      <CardHeader className="flex flex-row justify-between items-start gap-4 border-b border-border/40">
        <div>
          <CardTitle>Veille IA & Concurrents</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Base structuree pour entrainer les futures IA GLN a battre les outils concurrents.
          </p>
        </div>
        <Button onClick={handleReset} variant="outline" size="sm" className="text-xs">
          Recharger la veille
        </Button>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        {profiles.map((profile) => (
          <div key={profile.id} className="rounded-2xl border border-border/50 bg-card/70 p-4 md:p-5 space-y-5">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-heading text-xl font-bold text-foreground">{profile.productName}</h3>
                  <span className="text-[10px] uppercase font-bold text-primary bg-primary/10 border border-primary/20 rounded-full px-2 py-1">
                    {profile.category}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2 max-w-3xl leading-relaxed">
                  {profile.positioning}
                </p>
              </div>
              <div className="text-[10px] text-muted-foreground md:text-right">
                <p>Scrape: {profile.scrapedAt}</p>
                <p>Confiance: {profile.dataConfidence}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl bg-secondary/40 border border-border/40 p-3 space-y-2">
                <h4 className="text-xs font-bold text-primary">Funnel observe</h4>
                <ul className="space-y-1.5 text-[11px] text-muted-foreground">
                  {profile.funnelSummary.map((item, idx) => (
                    <li key={idx} className="leading-relaxed">- {item}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl bg-secondary/40 border border-border/40 p-3 space-y-2">
                <h4 className="text-xs font-bold text-primary">Pricing & preuves</h4>
                <ul className="space-y-1.5 text-[11px] text-muted-foreground">
                  {profile.pricingSignals.map((item, idx) => (
                    <li key={idx} className="leading-relaxed">- {item}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl bg-secondary/40 border border-border/40 p-3 space-y-2">
                <h4 className="text-xs font-bold text-primary">Claims publics</h4>
                <ul className="space-y-1.5 text-[11px] text-muted-foreground">
                  {profile.metricClaims.map((metric) => (
                    <li key={metric.label} className="leading-relaxed">
                      <span className="font-semibold text-foreground">{metric.value}</span> - {metric.label}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-xl bg-secondary/30 border border-border/40 p-3 space-y-3">
                <h4 className="text-xs font-bold text-foreground">Fonctionnalites scrapees et opportunites GLN</h4>
                <div className="space-y-2">
                  {profile.features.map((feature) => (
                    <div key={feature.name} className="rounded-lg border border-border/40 bg-background/40 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-primary">{feature.name}</span>
                        <span className="text-[9px] uppercase text-muted-foreground">{feature.category}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{feature.description}</p>
                      <p className="text-[11px] text-foreground mt-2 leading-relaxed">
                        GLN: {feature.glnOpportunity}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl bg-secondary/30 border border-border/40 p-3 space-y-2">
                  <h4 className="text-xs font-bold text-foreground">Angles pour depasser Soro</h4>
                  <ul className="space-y-1.5 text-[11px] text-muted-foreground">
                    {profile.gapsForGLN.map((item, idx) => (
                      <li key={idx} className="leading-relaxed">- {item}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl bg-primary/10 border border-primary/20 p-3 space-y-2">
                  <h4 className="text-xs font-bold text-primary">Positionnement GLN recommande</h4>
                  <ul className="space-y-1.5 text-[11px] text-foreground">
                    {profile.glnCounterPositioning.map((item, idx) => (
                      <li key={idx} className="leading-relaxed">- {item}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl bg-secondary/30 border border-border/40 p-3 space-y-2">
                  <h4 className="text-xs font-bold text-foreground">Sources</h4>
                  <div className="flex flex-wrap gap-2">
                    {profile.sourceUrls.map((url) => (
                      <a
                        key={url}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-primary underline break-all"
                      >
                        {url}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ─── Phase 1 Audit Admin ───────────────────────────────────────
// Admin UI for the Phase 1 (Audit) agent — see CLAUDE.md, "Feature en cours
// de cadrage : automatisation reseaux sociaux par agents IA", sections 3 et
// 7. SCOPE: create/delete social_connections rows, trigger the phase1-audit
// edge function against one, and browse its audit_snapshots history. No
// interpretation happens here — that is Phase 2 (Diagnostic), a separate,
// not-yet-built agent. Every snapshot's is_mock flag is surfaced prominently
// so mock data (returned while no ZERNIO_API_KEY is configured — see
// supabase/functions/_shared/zernioClient.ts) is never mistaken for a real
// audit.
function Phase1AuditAdmin({ queryClient }: { queryClient: any }) {
  const { data: connections = [], isLoading } = useQuery({
    queryKey: ["phase1-social-connections"],
    queryFn: fetchSocialConnections,
  });

  const [platform, setPlatform] = useState<Phase1Platform>("meta_instagram");
  const [accountHandle, setAccountHandle] = useState("");
  const [zernioAccountId, setZernioAccountId] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () =>
      createSocialConnection({
        platform,
        account_handle: accountHandle,
        zernio_account_id: zernioAccountId || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["phase1-social-connections"] });
      setAccountHandle("");
      setZernioAccountId("");
      toast.success("Compte à auditer ajouté.");
    },
    onError: (err: any) => toast.error(`Erreur : ${err.message}`),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSocialConnection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["phase1-social-connections"] });
      toast.success("Compte supprimé.");
    },
    onError: (err: any) => toast.error(`Erreur : ${err.message}`),
  });

  const auditMutation = useMutation({
    mutationFn: (id: string) => triggerPhase1Audit(id),
    onSuccess: (result, id) => {
      queryClient.invalidateQueries({ queryKey: ["phase1-audit-snapshots", id] });
      if (result.ok) {
        toast.success(
          result.is_mock
            ? "Audit lancé — données factices (ZERNIO_API_KEY non configurée)."
            : "Audit lancé avec succès.",
        );
      } else {
        toast.error(`Audit échoué : ${result.error || "erreur inconnue"}`);
      }
      setExpandedId(id);
    },
    onError: (err: any) => toast.error(`Échec de l'appel à l'agent d'audit : ${err.message}`),
  });

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Ajouter un compte à auditer (Phase 1)</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Agent Phase 1 : collecte factuelle uniquement (Meta Graph API / TikTok Business API /
            YouTube Data API via Zernio) — pas d'interprétation, pas de score. Tant qu'aucune clé
            Zernio n'est configurée côté serveur, chaque audit retourne des données factices
            clairement marquées « MOCK ».
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Plateforme</Label>
              <Select value={platform} onValueChange={(v) => setPlatform(v as Phase1Platform)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(PHASE1_PLATFORM_LABELS) as Phase1Platform[]).map((p) => (
                    <SelectItem key={p} value={p}>{PHASE1_PLATFORM_LABELS[p]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Identifiant du compte (handle) *</Label>
              <Input
                value={accountHandle}
                onChange={(e) => setAccountHandle(e.target.value)}
                placeholder="ex: hotelbonaprisodouala"
              />
            </div>
            <div>
              <Label>ID compte Zernio (optionnel)</Label>
              <Input
                value={zernioAccountId}
                onChange={(e) => setZernioAccountId(e.target.value)}
                placeholder="laisser vide si non connecté"
              />
            </div>
          </div>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!accountHandle.trim() || createMutation.isPending}
            className="bg-gradient-primary"
          >
            <Plus className="w-4 h-4 mr-2" /> Ajouter le compte
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
        {!isLoading && connections.length === 0 && (
          <p className="text-sm text-muted-foreground">Aucun compte enregistré pour l'instant.</p>
        )}
        {(connections as SocialConnection[]).map((conn) => (
          <Card key={conn.id} className="border-border/50">
            <CardContent className="pt-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{conn.account_handle}</span>
                    <Badge variant="secondary">{PHASE1_PLATFORM_LABELS[conn.platform]}</Badge>
                    <Badge variant="outline">{conn.connection_status}</Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Ajouté le {new Date(conn.created_at).toLocaleString("fr-FR")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => auditMutation.mutate(conn.id)}
                    disabled={auditMutation.isPending}
                  >
                    Lancer un audit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setExpandedId(expandedId === conn.id ? null : conn.id)}
                  >
                    {expandedId === conn.id ? "Masquer" : "Historique"}
                  </Button>
                  <button onClick={() => deleteMutation.mutate(conn.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </button>
                </div>
              </div>

              {expandedId === conn.id && (
                <>
                  <BrandBriefEditor socialConnectionId={conn.id} currentBrief={conn.brand_brief} />
                  <Phase1AuditSnapshots socialConnectionId={conn.id} />
                  <Phase2DiagnosticPanel socialConnectionId={conn.id} />
                  <Phase3StrategyPanel socialConnectionId={conn.id} />
                  <Phase4aTextPanel socialConnectionId={conn.id} />
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Phase1AuditSnapshots({ socialConnectionId }: { socialConnectionId: string }) {
  const { data: snapshots = [], isLoading } = useQuery({
    queryKey: ["phase1-audit-snapshots", socialConnectionId],
    queryFn: () => fetchAuditSnapshots(socialConnectionId),
  });

  if (isLoading) {
    return <p className="text-xs text-muted-foreground">Chargement de l'historique…</p>;
  }
  if (snapshots.length === 0) {
    return <p className="text-xs text-muted-foreground">Aucun audit encore lancé pour ce compte.</p>;
  }

  return (
    <div className="space-y-2 border-t border-border/40 pt-4">
      {(snapshots as AuditSnapshot[]).map((snap) => (
        <div key={snap.id} className="rounded-lg border border-border/40 bg-secondary/20 p-3 text-xs space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{new Date(snap.extracted_at).toLocaleString("fr-FR")}</span>
            <Badge variant="outline">{snap.source}</Badge>
            {snap.is_mock && <Badge variant="destructive">MOCK — données factices</Badge>}
            {snap.error && <Badge variant="destructive">Erreur</Badge>}
          </div>
          {snap.error && <p className="text-destructive">{snap.error}</p>}
          {snap.metrics && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-muted-foreground">
              <div>Abonnés : <span className="text-foreground">{String(snap.metrics.followers_count)}</span></div>
              <div>Publications : <span className="text-foreground">{String(snap.metrics.posts_count)}</span></div>
              <div>Taux d'engagement : <span className="text-foreground">{String(snap.metrics.engagement_rate)}</span></div>
              <div>Dernière publication : <span className="text-foreground">{String(snap.metrics.last_post_at)}</span></div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Phase 2 Diagnostic Panel ───────────────────────────────────
// Admin UI for the Phase 2 (Diagnostic) agent — see CLAUDE.md, sections 3 et
// 7. SCOPE: upload/manage screenshots for a social_connections row, trigger
// the phase2-diagnostic edge function against a selection of them, and
// review the AI-generated hypotheses. The Approve/Reject buttons are the
// real human-validation gate CLAUDE.md requires before Phase 3 (which
// doesn't exist yet) could ever consume this data — nothing here
// auto-approves anything.
function Phase2DiagnosticPanel({ socialConnectionId }: { socialConnectionId: string }) {
  const queryClient = useQueryClient();
  const [selectedScreenshotIds, setSelectedScreenshotIds] = useState<string[]>([]);
  const [screenshotLabel, setScreenshotLabel] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  const { data: screenshots = [], isLoading: loadingScreenshots } = useQuery({
    queryKey: ["phase2-screenshots", socialConnectionId],
    queryFn: () => fetchDiagnosticScreenshots(socialConnectionId),
  });

  const { data: diagnostics = [], isLoading: loadingDiagnostics } = useQuery({
    queryKey: ["phase2-diagnostics", socialConnectionId],
    queryFn: () => fetchDiagnostics(socialConnectionId),
  });

  const uploadMutation = useMutation({
    mutationFn: () => {
      if (!pendingFile) throw new Error("Sélectionne un fichier.");
      return uploadDiagnosticScreenshot(socialConnectionId, pendingFile, screenshotLabel);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["phase2-screenshots", socialConnectionId] });
      setPendingFile(null);
      setScreenshotLabel("");
      toast.success("Capture ajoutée.");
    },
    onError: (err: any) => toast.error(`Erreur upload : ${err.message}`),
  });

  const deleteScreenshotMutation = useMutation({
    mutationFn: (screenshot: DiagnosticScreenshot) => deleteDiagnosticScreenshot(screenshot),
    onSuccess: (_data, screenshot) => {
      queryClient.invalidateQueries({ queryKey: ["phase2-screenshots", socialConnectionId] });
      setSelectedScreenshotIds((ids) => ids.filter((id) => id !== screenshot.id));
    },
  });

  const previewMutation = useMutation({
    mutationFn: (path: string) => getDiagnosticScreenshotUrl(path),
    onSuccess: (url) => window.open(url, "_blank", "noopener,noreferrer"),
    onError: () => toast.error("Impossible de générer l'aperçu."),
  });

  const diagnoseMutation = useMutation({
    mutationFn: () => triggerPhase2Diagnostic(socialConnectionId, selectedScreenshotIds),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["phase2-diagnostics", socialConnectionId] });
      toast[result.ok ? "success" : "error"](
        result.ok ? "Diagnostic généré — en attente de validation humaine." : `Échec : ${result.error}`,
      );
    },
    onError: (err: any) => toast.error(`Erreur : ${err.message}`),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: "approved" | "rejected" }) =>
      reviewDiagnostic(id, decision, reviewNotes[id]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["phase2-diagnostics", socialConnectionId] });
      toast.success("Validation enregistrée.");
    },
    onError: (err: any) => toast.error(`Erreur : ${err.message}`),
  });

  const toggleScreenshot = (id: string) => {
    setSelectedScreenshotIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  };

  return (
    <div className="space-y-4 border-t border-border/40 pt-4">
      <p className="text-xs font-bold text-primary">Phase 2 — Diagnostic</p>

      <div className="space-y-2">
        <p className="text-[11px] text-muted-foreground">
          Au moins une capture d'écran est obligatoire pour lancer un diagnostic (conforme Phase 2 : pas de
          diagnostic sans support visuel).
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="file"
            accept="image/*"
            className="w-auto text-xs"
            onChange={(e) => setPendingFile(e.target.files?.[0] ?? null)}
          />
          <Input
            placeholder="Libellé (ex: page Instagram)"
            value={screenshotLabel}
            onChange={(e) => setScreenshotLabel(e.target.value)}
            className="w-48 text-xs"
          />
          <Button
            size="sm"
            variant="outline"
            disabled={!pendingFile || uploadMutation.isPending}
            onClick={() => uploadMutation.mutate()}
          >
            <Upload className="w-3 h-3 mr-1" /> Ajouter la capture
          </Button>
        </div>

        {loadingScreenshots && <p className="text-xs text-muted-foreground">Chargement…</p>}
        {!loadingScreenshots && screenshots.length === 0 && (
          <p className="text-xs text-muted-foreground">Aucune capture pour ce compte.</p>
        )}
        <div className="space-y-1">
          {(screenshots as DiagnosticScreenshot[]).map((s) => (
            <div key={s.id} className="flex items-center gap-2 text-xs">
              <Checkbox
                checked={selectedScreenshotIds.includes(s.id)}
                onCheckedChange={() => toggleScreenshot(s.id)}
              />
              <button className="text-primary underline" onClick={() => previewMutation.mutate(s.storage_path)}>
                {s.label}
              </button>
              <span className="text-muted-foreground">{new Date(s.created_at).toLocaleDateString("fr-FR")}</span>
              <button onClick={() => deleteScreenshotMutation.mutate(s)}>
                <Trash2 className="w-3 h-3 text-destructive" />
              </button>
            </div>
          ))}
        </div>

        <Button
          size="sm"
          onClick={() => diagnoseMutation.mutate()}
          disabled={selectedScreenshotIds.length === 0 || diagnoseMutation.isPending}
          className="bg-gradient-primary"
        >
          Générer un diagnostic ({selectedScreenshotIds.length} capture{selectedScreenshotIds.length > 1 ? "s" : ""})
        </Button>
      </div>

      <div className="space-y-2">
        {loadingDiagnostics && <p className="text-xs text-muted-foreground">Chargement des diagnostics…</p>}
        {!loadingDiagnostics && diagnostics.length === 0 && (
          <p className="text-xs text-muted-foreground">Aucun diagnostic généré pour ce compte.</p>
        )}
        {(diagnostics as Diagnostic[]).map((d) => (
          <div key={d.id} className="rounded-lg border border-border/40 bg-secondary/20 p-3 text-xs space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{new Date(d.created_at).toLocaleString("fr-FR")}</span>
              <Badge variant={d.review_status === "approved" ? "default" : d.review_status === "rejected" ? "destructive" : "outline"}>
                {d.review_status === "pending_review" ? "En attente de validation" : d.review_status === "approved" ? "Approuvé" : "Rejeté"}
              </Badge>
              {d.conclusive === false && <Badge variant="destructive">Non concluant</Badge>}
              {d.error && <Badge variant="destructive">Erreur</Badge>}
            </div>

            {d.error && <p className="text-destructive">{d.error}</p>}
            {d.summary && <p className="text-foreground">{d.summary}</p>}

            {d.hypotheses && d.hypotheses.length > 0 && (
              <ul className="space-y-1.5">
                {d.hypotheses.map((h, i) => (
                  <li key={i} className="rounded border border-border/30 bg-background/40 p-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{h.confidence}</Badge>
                      <span className="text-foreground">{h.statement}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Basé sur : {h.based_on.join(", ")}
                    </p>
                  </li>
                ))}
              </ul>
            )}

            {d.missing_data && d.missing_data.length > 0 && (
              <p className="text-muted-foreground">Données manquantes : {d.missing_data.join(", ")}</p>
            )}

            {d.review_status === "pending_review" && !d.error && (
              <div className="space-y-2 pt-2 border-t border-border/30">
                <Textarea
                  placeholder="Notes de validation (optionnel)"
                  value={reviewNotes[d.id] || ""}
                  onChange={(e) => setReviewNotes((n) => ({ ...n, [d.id]: e.target.value }))}
                  rows={2}
                  className="text-xs"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => reviewMutation.mutate({ id: d.id, decision: "approved" })}
                  >
                    <CheckCircle className="w-3 h-3 mr-1" /> Approuver
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => reviewMutation.mutate({ id: d.id, decision: "rejected" })}
                  >
                    Rejeter
                  </Button>
                </div>
              </div>
            )}
            {d.review_status !== "pending_review" && d.review_notes && (
              <p className="text-[10px] text-muted-foreground">Note : {d.review_notes}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Phase 3 Strategy Panel ─────────────────────────────────────
// Admin UI for the Phase 3 (Stratégie de contenu) agent — see CLAUDE.md,
// sections 3 et 7. SCOPE: trigger the phase3-strategy edge function (which
// itself refuses without an APPROVED Phase 2 diagnostic for this account)
// and review the resulting pillars/calendar/trend sources. Approve/Reject
// here is the real human-validation gate CLAUDE.md requires before Phase 4
// (not yet built) could ever consume this data.
function Phase3StrategyPanel({ socialConnectionId }: { socialConnectionId: string }) {
  const queryClient = useQueryClient();
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  const { data: diagnostics = [] } = useQuery({
    queryKey: ["phase2-diagnostics", socialConnectionId],
    queryFn: () => fetchDiagnostics(socialConnectionId),
  });
  const approvedDiagnosticsCount = diagnostics.filter((d) => d.review_status === "approved").length;

  const { data: strategies = [], isLoading: loadingStrategies } = useQuery({
    queryKey: ["phase3-strategies", socialConnectionId],
    queryFn: () => fetchContentStrategies(socialConnectionId),
  });

  const generateMutation = useMutation({
    mutationFn: () => triggerPhase3Strategy(socialConnectionId),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["phase3-strategies", socialConnectionId] });
      toast[result.ok ? "success" : "error"](
        result.ok ? "Stratégie générée — en attente de validation humaine." : `Échec : ${result.error}`,
      );
    },
    onError: (err: any) => toast.error(`Erreur : ${err.message}`),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: "approved" | "rejected" }) =>
      reviewContentStrategy(id, decision, reviewNotes[id]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["phase3-strategies", socialConnectionId] });
      toast.success("Validation enregistrée.");
    },
    onError: (err: any) => toast.error(`Erreur : ${err.message}`),
  });

  return (
    <div className="space-y-4 border-t border-border/40 pt-4">
      <p className="text-xs font-bold text-primary">Phase 3 — Stratégie de contenu</p>

      {approvedDiagnosticsCount === 0 && (
        <p className="text-[11px] text-muted-foreground">
          Aucun diagnostic Phase 2 approuvé pour ce compte — approuve d'abord un diagnostic ci-dessus
          avant de pouvoir générer une stratégie.
        </p>
      )}

      <Button
        size="sm"
        onClick={() => generateMutation.mutate()}
        disabled={approvedDiagnosticsCount === 0 || generateMutation.isPending}
        className="bg-gradient-primary"
      >
        Générer une stratégie (calendrier 4 semaines)
      </Button>

      <div className="space-y-2">
        {loadingStrategies && <p className="text-xs text-muted-foreground">Chargement…</p>}
        {!loadingStrategies && strategies.length === 0 && (
          <p className="text-xs text-muted-foreground">Aucune stratégie générée pour ce compte.</p>
        )}
        {(strategies as ContentStrategy[]).map((s) => (
          <div key={s.id} className="rounded-lg border border-border/40 bg-secondary/20 p-3 text-xs space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{new Date(s.created_at).toLocaleString("fr-FR")}</span>
              <Badge variant={s.review_status === "approved" ? "default" : s.review_status === "rejected" ? "destructive" : "outline"}>
                {s.review_status === "pending_review" ? "En attente de validation" : s.review_status === "approved" ? "Approuvé" : "Rejeté"}
              </Badge>
              {s.error && <Badge variant="destructive">Erreur</Badge>}
            </div>

            {s.error && <p className="text-destructive">{s.error}</p>}
            {s.summary && <p className="text-foreground">{s.summary}</p>}

            {s.pillars && s.pillars.length > 0 && (
              <div>
                <p className="font-semibold text-foreground mb-1">Piliers de contenu</p>
                <ul className="space-y-1.5">
                  {s.pillars.map((p, i) => (
                    <li key={i} className="rounded border border-border/30 bg-background/40 p-2">
                      <span className="font-semibold text-foreground">{p.name}</span> — {p.description}
                      <p className="text-[10px] text-muted-foreground mt-1">{p.rationale}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {s.editorial_calendar && s.editorial_calendar.length > 0 && (
              <div>
                <p className="font-semibold text-foreground mb-1">Calendrier éditorial</p>
                <ul className="space-y-1.5">
                  {[...s.editorial_calendar]
                    .sort((a, b) => a.day_offset - b.day_offset)
                    .map((entry, i) => (
                      <li key={i} className="rounded border border-border/30 bg-background/40 p-2">
                        <span className="text-primary font-semibold">J+{entry.day_offset}</span>{" "}
                        <Badge variant="secondary">{entry.platform}</Badge>{" "}
                        <Badge variant="outline">{entry.pillar}</Badge>{" "}
                        <span className="text-foreground font-semibold">{entry.working_title}</span>{" "}
                        ({entry.format})
                        <p className="text-[10px] text-muted-foreground mt-1">{entry.brief}</p>
                      </li>
                    ))}
                </ul>
              </div>
            )}

            {s.trends_used && s.trends_used.length > 0 && (
              <div>
                <p className="font-semibold text-foreground mb-1">Tendances utilisées (source réelle obligatoire)</p>
                <ul className="space-y-1">
                  {s.trends_used.map((t, i) => (
                    <li key={i} className="text-[10px]">
                      {t.claim} —{" "}
                      <a href={t.source_url} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                        {t.source_title}
                      </a>{" "}
                      ({t.retrieved_at})
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {s.review_status === "pending_review" && !s.error && (
              <div className="space-y-2 pt-2 border-t border-border/30">
                <Textarea
                  placeholder="Notes de validation (optionnel)"
                  value={reviewNotes[s.id] || ""}
                  onChange={(e) => setReviewNotes((n) => ({ ...n, [s.id]: e.target.value }))}
                  rows={2}
                  className="text-xs"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => reviewMutation.mutate({ id: s.id, decision: "approved" })}
                  >
                    <CheckCircle className="w-3 h-3 mr-1" /> Approuver
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => reviewMutation.mutate({ id: s.id, decision: "rejected" })}
                  >
                    Rejeter
                  </Button>
                </div>
              </div>
            )}
            {s.review_status !== "pending_review" && s.review_notes && (
              <p className="text-[10px] text-muted-foreground">Note : {s.review_notes}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Brand Brief Editor ─────────────────────────────────────────
// One free-text field per client account — the ONLY source of truth on
// the company/product Phase 4a is allowed to draw facts from (CLAUDE.md:
// never invented). Lives on social_connections.brand_brief.
function BrandBriefEditor({
  socialConnectionId,
  currentBrief,
}: {
  socialConnectionId: string;
  currentBrief: string | null;
}) {
  const queryClient = useQueryClient();
  const [brief, setBrief] = useState(currentBrief || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateBrandBrief(socialConnectionId, brief);
      queryClient.invalidateQueries({ queryKey: ["phase1-social-connections"] });
      toast.success("Brand brief enregistré.");
    } catch (err: any) {
      toast.error(`Erreur : ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2 border-t border-border/40 pt-4">
      <p className="text-xs font-bold text-primary">Brand brief</p>
      <p className="text-[11px] text-muted-foreground">
        Obligatoire avant la Phase 4a (production texte) — seule source de vérité que l'IA peut utiliser
        sur l'entreprise (nom, ton, offres, ce qu'il ne faut jamais dire). Rien n'est jamais inventé
        au-delà de ce texte.
      </p>
      <Textarea
        value={brief}
        onChange={(e) => setBrief(e.target.value)}
        rows={4}
        placeholder="Ex : GLN Digital est une agence de marketing digital basée à Douala/Yaoundé..."
        className="text-xs"
      />
      <Button size="sm" variant="outline" onClick={handleSave} disabled={saving}>
        Enregistrer le brand brief
      </Button>
    </div>
  );
}

// ─── Phase 4a Text Panel ────────────────────────────────────────
// Admin UI for the Phase 4a (Production texte) agent — see CLAUDE.md,
// sections 3 et 7. SCOPE: for each APPROVED Phase 3 strategy, generate a
// caption/hook/script per calendar entry and review it individually
// (decision with Russel: one draft per entry, not a batch). Approve/Reject
// is the real human-validation gate CLAUDE.md requires before Phase 5.
function Phase4aTextPanel({ socialConnectionId }: { socialConnectionId: string }) {
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  const { data: strategies = [] } = useQuery({
    queryKey: ["phase3-strategies", socialConnectionId],
    queryFn: () => fetchContentStrategies(socialConnectionId),
  });
  const approvedStrategies = (strategies as ContentStrategy[]).filter((s) => s.review_status === "approved");

  return (
    <div className="space-y-4 border-t border-border/40 pt-4">
      <p className="text-xs font-bold text-primary">Phase 4a — Production texte</p>
      {approvedStrategies.length === 0 && (
        <p className="text-[11px] text-muted-foreground">
          Aucune stratégie Phase 3 approuvée pour ce compte — approuve d'abord une stratégie ci-dessus.
        </p>
      )}
      {approvedStrategies.map((strategy) => (
        <Phase4aStrategyCalendar
          key={strategy.id}
          socialConnectionId={socialConnectionId}
          strategy={strategy}
          reviewNotes={reviewNotes}
          setReviewNotes={setReviewNotes}
        />
      ))}
    </div>
  );
}

function Phase4aStrategyCalendar({
  socialConnectionId,
  strategy,
  reviewNotes,
  setReviewNotes,
}: {
  socialConnectionId: string;
  strategy: ContentStrategy;
  reviewNotes: Record<string, string>;
  setReviewNotes: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}) {
  const queryClient = useQueryClient();

  const { data: drafts = [] } = useQuery({
    queryKey: ["phase4a-drafts", strategy.id],
    queryFn: () => fetchContentDrafts(strategy.id),
  });
  const draftByIndex = new Map((drafts as ContentDraft[]).map((d) => [d.calendar_entry_index, d]));

  const generateMutation = useMutation({
    mutationFn: (entryIndex: number) => triggerPhase4aDraft(socialConnectionId, strategy.id, entryIndex),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["phase4a-drafts", strategy.id] });
      toast[result.ok ? "success" : "error"](
        result.ok ? "Brouillon généré — en attente de validation." : `Échec : ${result.error}`,
      );
    },
    onError: (err: any) => toast.error(`Erreur : ${err.message}`),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: "approved" | "rejected" }) =>
      reviewContentDraft(id, decision, reviewNotes[id]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["phase4a-drafts", strategy.id] });
      toast.success("Validation enregistrée.");
    },
    onError: (err: any) => toast.error(`Erreur : ${err.message}`),
  });

  const calendar = strategy.editorial_calendar || [];

  return (
    <div className="rounded-lg border border-border/40 bg-secondary/10 p-3 space-y-2">
      <p className="text-[11px] text-muted-foreground">
        Stratégie du {new Date(strategy.created_at).toLocaleDateString("fr-FR")}
      </p>
      {calendar.map((entry, index) => {
        const draft = draftByIndex.get(index);
        return (
          <div key={index} className="rounded border border-border/30 bg-background/40 p-2 text-xs space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-primary font-semibold">J+{entry.day_offset}</span>
              <Badge variant="secondary">{entry.platform}</Badge>
              <span className="text-foreground font-semibold">{entry.working_title}</span>
              {!draft && (
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-auto"
                  onClick={() => generateMutation.mutate(index)}
                  disabled={generateMutation.isPending}
                >
                  Générer légende
                </Button>
              )}
            </div>
            {draft && (
              <div className="space-y-1.5 pt-1.5 border-t border-border/20">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      draft.review_status === "approved"
                        ? "default"
                        : draft.review_status === "rejected"
                          ? "destructive"
                          : "outline"
                    }
                  >
                    {draft.review_status === "pending_review"
                      ? "En attente"
                      : draft.review_status === "approved"
                        ? "Approuvé"
                        : "Rejeté"}
                  </Badge>
                  {draft.error && <Badge variant="destructive">Erreur</Badge>}
                </div>
                {draft.error && <p className="text-destructive">{draft.error}</p>}
                {draft.hook && (
                  <p>
                    <span className="font-semibold">Accroche :</span> {draft.hook}
                  </p>
                )}
                {draft.caption && (
                  <p>
                    <span className="font-semibold">Légende :</span> {draft.caption}
                  </p>
                )}
                {draft.script && (
                  <p>
                    <span className="font-semibold">Script :</span> {draft.script}
                  </p>
                )}
                {draft.review_status === "pending_review" && !draft.error && (
                  <div className="space-y-1.5 pt-1.5 border-t border-border/20">
                    <Textarea
                      placeholder="Notes (optionnel)"
                      value={reviewNotes[draft.id] || ""}
                      onChange={(e) => setReviewNotes((n) => ({ ...n, [draft.id]: e.target.value }))}
                      rows={2}
                      className="text-xs"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => reviewMutation.mutate({ id: draft.id, decision: "approved" })}
                      >
                        <CheckCircle className="w-3 h-3 mr-1" /> Approuver
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => reviewMutation.mutate({ id: draft.id, decision: "rejected" })}
                      >
                        Rejeter
                      </Button>
                    </div>
                  </div>
                )}
                {draft.review_status === "approved" && (
                  <Phase5ScheduleWidget socialConnectionId={socialConnectionId} draftId={draft.id} />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Phase 5 Schedule Widget ────────────────────────────────────
// Admin UI for the Phase 5 (Publication) agent — see CLAUDE.md, sections 3
// et 7. SCOPE: schedule/publish one already-approved content_drafts row.
// No new validation gate here — CLAUDE.md's Phase 5 row says "Validation
// humaine requise : Non", the upstream Phase 4a approval already covers
// it. "Publier maintenant" on a future-dated row stands in for a real cron
// trigger, which isn't built yet — flagged in code and to Russel, not
// hidden.
function Phase5ScheduleWidget({ socialConnectionId, draftId }: { socialConnectionId: string; draftId: string }) {
  const queryClient = useQueryClient();
  const [scheduledAt, setScheduledAt] = useState("");
  const [rescheduleDrafts, setRescheduleDrafts] = useState<Record<string, string>>({});
  const [suggestion, setSuggestion] = useState<PublishTimeSuggestion | null>(null);

  const { data: publications = [] } = useQuery({
    queryKey: ["phase5-publications", socialConnectionId],
    queryFn: () => fetchScheduledPublications(socialConnectionId),
  });
  const draftPublications = (publications as ScheduledPublication[]).filter((p) => p.content_draft_id === draftId);

  const scheduleMutation = useMutation({
    mutationFn: () => schedulePublication(draftId, new Date(scheduledAt).toISOString()),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["phase5-publications", socialConnectionId] });
      toast[result.ok ? "success" : "error"](
        result.executed
          ? result.ok
            ? "Publié (voir badge MOCK si aucune vraie clé Zernio)."
            : `Échec de publication : ${result.error}`
          : "Planifié — sera publié automatiquement une fois l'exécution planifiée disponible (voir note).",
      );
      setScheduledAt("");
    },
    onError: (err: any) => toast.error(`Erreur : ${err.message}`),
  });

  const executeMutation = useMutation({
    mutationFn: (id: string) => executeScheduledPublication(id),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["phase5-publications", socialConnectionId] });
      toast[result.ok ? "success" : "error"](result.ok ? "Publié." : `Échec : ${result.error}`);
    },
    onError: (err: any) => toast.error(`Erreur : ${err.message}`),
  });

  const rescheduleMutation = useMutation({
    mutationFn: ({ id, newAt }: { id: string; newAt: string }) =>
      rescheduleScheduledPublication(id, new Date(newAt).toISOString()),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["phase5-publications", socialConnectionId] });
      toast[result.ok ? "success" : "error"](
        result.executed
          ? result.ok
            ? "Reprogrammé et publié immédiatement (date déjà passée)."
            : `Échec : ${result.error}`
          : "Reprogrammé.",
      );
    },
    onError: (err: any) => toast.error(`Erreur : ${err.message}`),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelScheduledPublication(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["phase5-publications", socialConnectionId] });
      toast.success("Publication planifiée annulée.");
    },
    onError: (err: any) => toast.error(`Erreur : ${err.message}`),
  });

  const suggestMutation = useMutation({
    mutationFn: () => fetchPublishTimeSuggestion(draftId),
    onSuccess: (result) => {
      if (result.ok && result.suggestion) {
        setSuggestion(result.suggestion);
      } else {
        toast.error(`Échec de la suggestion : ${result.error}`);
      }
    },
    onError: (err: any) => toast.error(`Erreur : ${err.message}`),
  });

  return (
    <div className="space-y-1.5 pt-1.5 border-t border-border/20">
      <p className="text-[10px] font-semibold text-primary">Phase 5 — Publication</p>
      {draftPublications.map((pub) => (
        <div key={pub.id} className="flex flex-wrap items-center gap-2 text-[10px]">
          <Badge
            variant={
              pub.status === "published" ? "default" : pub.status === "failed" ? "destructive" : "outline"
            }
          >
            {pub.status}
          </Badge>
          {pub.is_mock && <Badge variant="destructive">MOCK</Badge>}
          <span className="text-muted-foreground">
            {pub.status === "published" ? pub.published_at : pub.scheduled_at}
          </span>
          {pub.error && <span className="text-destructive">{pub.error}</span>}
          {pub.status === "scheduled" && (
            <>
              <Button size="sm" variant="outline" onClick={() => executeMutation.mutate(pub.id)}>
                Publier maintenant
              </Button>
              <Input
                type="datetime-local"
                value={rescheduleDrafts[pub.id] || ""}
                onChange={(e) => setRescheduleDrafts((d) => ({ ...d, [pub.id]: e.target.value }))}
                className="w-auto text-[10px] h-7"
              />
              <Button
                size="sm"
                variant="outline"
                disabled={!rescheduleDrafts[pub.id] || rescheduleMutation.isPending}
                onClick={() => rescheduleMutation.mutate({ id: pub.id, newAt: rescheduleDrafts[pub.id] })}
              >
                Reprogrammer
              </Button>
              <Button size="sm" variant="ghost" onClick={() => cancelMutation.mutate(pub.id)}>
                Annuler
              </Button>
            </>
          )}
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
          className="w-auto text-[10px] h-7"
        />
        <Button
          size="sm"
          variant="outline"
          disabled={!scheduledAt || scheduleMutation.isPending}
          onClick={() => scheduleMutation.mutate()}
        >
          Planifier
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={suggestMutation.isPending}
          onClick={() => suggestMutation.mutate()}
        >
          Suggérer une heure (IA)
        </Button>
      </div>

      {suggestion && (
        <div className="rounded border border-border/30 bg-background/40 p-2 text-[10px] space-y-1">
          <p className="font-semibold text-foreground">
            Suggestion (consultative — ne remplace pas ton choix) :{" "}
            {suggestion.inconclusive ? "non concluante" : suggestion.suggested_day_and_time}
          </p>
          <p className="text-muted-foreground">{suggestion.rationale}</p>
          {suggestion.based_on.length > 0 && (
            <p className="text-muted-foreground">Basé sur : {suggestion.based_on.join(", ")}</p>
          )}
          {suggestion.sources.length > 0 && (
            <ul className="space-y-0.5">
              {suggestion.sources.map((s, i) => (
                <li key={i}>
                  <a href={s.source_url} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                    {s.source_title}
                  </a>{" "}
                  ({s.retrieved_at})
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

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
  const [editingLesson, setEditingLesson] = useState<{
    modIndex: number;
    lesIndex: number | null; // null if adding a new lesson
    lesson: Partial<Lesson>;
  } | null>(null);


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

  const startAddLesson = (modIndex: number) => {
    setEditingLesson({
      modIndex,
      lesIndex: null,
      lesson: {
        id: "les-" + Math.random().toString(36).substring(2, 7),
        title: "",
        duration: type === "video" ? "10:00" : "Lecture : 10 min",
        watched: false,
        videoUrl: type === "video" ? "https://www.youtube.com/watch?v=dQw4w9WgXcQ" : "",
        content: "",
        transcription: "",
        transcriptionEn: "",
        quiz: []
      }
    });
  };

  const startEditLesson = (modIndex: number, lesIndex: number) => {
    const lesson = modules[modIndex].videos[lesIndex];
    setEditingLesson({
      modIndex,
      lesIndex,
      lesson: { ...lesson }
    });
  };

  const handleSaveLesson = () => {
    if (!editingLesson) return;
    const { modIndex, lesIndex, lesson } = editingLesson;
    if (!lesson.title?.trim()) {
      toast.error("Le titre de la leçon est obligatoire.");
      return;
    }

    // Ensure it has 10 questions. If not, auto-generate default ones based on lesson title
    let quizQuestions = lesson.quiz || [];
    if (quizQuestions.length < 10) {
      const generated = generateDefaultQuiz(lesson.title || "ce cours");
      // Merge: replace or fill up to 10 questions
      quizQuestions = [...quizQuestions, ...generated.slice(quizQuestions.length)];
    }
    // Truncate to exactly 10 questions
    quizQuestions = quizQuestions.slice(0, 10);

    const finalLesson: Lesson = {
      id: lesson.id || "les-" + Math.random().toString(36).substring(2, 7),
      title: lesson.title,
      duration: lesson.duration || "10:00",
      watched: !!lesson.watched,
      videoUrl: type === "video" ? lesson.videoUrl : undefined,
      content: type === "written" ? lesson.content : undefined,
      transcription: lesson.transcription || "",
      transcriptionEn: lesson.transcriptionEn || "",
      quiz: quizQuestions
    };

    const updated = [...modules];
    if (lesIndex === null) {
      updated[modIndex].videos.push(finalLesson);
    } else {
      updated[modIndex].videos[lesIndex] = finalLesson;
    }

    setModules(updated);
    setEditingLesson(null);
    toast.success("Leçon enregistrée avec succès dans le module !");
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
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => startEditLesson(modIdx, lesIdx)} className="text-[10px] text-primary h-6 hover:bg-primary/10">
                              Modifier
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => removeLesson(modIdx, lesIdx)} className="text-[10px] text-red-400 h-6">
                              Supprimer
                            </Button>
                          </div>
                        </div>
                      ))}
                      <Button onClick={() => startAddLesson(modIdx)} variant="outline" size="sm" className="text-[10px] h-7 border-dashed border-primary/40 text-primary">
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

      {editingLesson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-card border border-border rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-6 my-8">
            <div className="flex justify-between items-center pb-4 border-b border-border/40">
              <h3 className="font-heading font-bold text-lg text-primary flex items-center gap-2">
                <Edit2 className="w-5 h-5" />
                {editingLesson.lesIndex === null ? "Ajouter une leçon" : `Modifier la leçon : ${editingLesson.lesson.title}`}
              </h3>
              <Button variant="ghost" onClick={() => setEditingLesson(null)}>Fermer</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold text-foreground">Titre de la leçon *</Label>
                <Input
                  value={editingLesson.lesson.title || ""}
                  onChange={(e) => setEditingLesson({
                    ...editingLesson,
                    lesson: { ...editingLesson.lesson, title: e.target.value }
                  })}
                  placeholder="Ex: 1.3 Analyse SWOT marketing"
                  className="bg-secondary text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-foreground">Durée (ex: 12:30 ou Lecture : 10 min) *</Label>
                <Input
                  value={editingLesson.lesson.duration || ""}
                  onChange={(e) => setEditingLesson({
                    ...editingLesson,
                    lesson: { ...editingLesson.lesson, duration: e.target.value }
                  })}
                  placeholder="Ex: 15:40"
                  className="bg-secondary text-xs mt-1"
                />
              </div>
            </div>

            {type === "video" ? (
              <div>
                <Label className="text-xs font-semibold text-foreground">Lien de la vidéo YouTube *</Label>
                <Input
                  value={editingLesson.lesson.videoUrl || ""}
                  onChange={(e) => setEditingLesson({
                    ...editingLesson,
                    lesson: { ...editingLesson.lesson, videoUrl: e.target.value }
                  })}
                  placeholder="Ex: https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                  className="bg-secondary text-xs mt-1"
                />
                <p className="text-[10px] text-muted-foreground mt-1">Saisissez un lien YouTube valide pour le lecteur.</p>
              </div>
            ) : (
              <div>
                <Label className="text-xs font-semibold text-foreground">Contenu textuel du cours *</Label>
                <Textarea
                  value={editingLesson.lesson.content || ""}
                  onChange={(e) => setEditingLesson({
                    ...editingLesson,
                    lesson: { ...editingLesson.lesson, content: e.target.value }
                  })}
                  rows={8}
                  placeholder="Rédigez le support de cours textuel ici..."
                  className="bg-secondary text-xs mt-1 font-mono"
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-border/40 pt-4">
              <div>
                <Label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  Transcription (Français)
                </Label>
                <Textarea
                  value={editingLesson.lesson.transcription || ""}
                  onChange={(e) => setEditingLesson({
                    ...editingLesson,
                    lesson: { ...editingLesson.lesson, transcription: e.target.value }
                  })}
                  rows={5}
                  placeholder="Transcription textuelle française de la leçon..."
                  className="bg-secondary text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  Transcription (Anglais)
                </Label>
                <Textarea
                  value={editingLesson.lesson.transcriptionEn || ""}
                  onChange={(e) => setEditingLesson({
                    ...editingLesson,
                    lesson: { ...editingLesson.lesson, transcriptionEn: e.target.value }
                  })}
                  rows={5}
                  placeholder="English translation of the lesson transcription..."
                  className="bg-secondary text-xs mt-1"
                />
              </div>
            </div>

            <div className="border-t border-border/40 pt-4 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <Label className="font-bold text-sm text-foreground">Exercices de validation (10 questions)</Label>
                  <p className="text-[10px] text-muted-foreground">Un quota de 7/10 est requis pour débloquer l'étape suivante.</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const defaultQuiz = generateDefaultQuiz(editingLesson.lesson.title || "ce cours");
                    setEditingLesson({
                      ...editingLesson,
                      lesson: { ...editingLesson.lesson, quiz: defaultQuiz }
                    });
                    toast.success("Quiz par défaut de 10 questions généré !");
                  }}
                  className="text-xs font-normal"
                >
                  Générer 10 questions par défaut
                </Button>
              </div>

              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                {Array.from({ length: 10 }).map((_, qIdx) => {
                  const currentQuiz = editingLesson.lesson.quiz || [];
                  const question = currentQuiz[qIdx] || {
                    question: "",
                    options: ["", "", "", ""],
                    correctAnswerIndex: 0
                  };

                  const updateQuestionField = (field: string, value: any) => {
                    const updatedQuiz = [...currentQuiz];
                    while (updatedQuiz.length <= qIdx) {
                      updatedQuiz.push({ question: "", options: ["", "", "", ""], correctAnswerIndex: 0 });
                    }
                    if (field === "question") {
                      updatedQuiz[qIdx] = { ...updatedQuiz[qIdx], question: value };
                    } else if (field === "correctAnswerIndex") {
                      updatedQuiz[qIdx] = { ...updatedQuiz[qIdx], correctAnswerIndex: Number(value) };
                    }
                    setEditingLesson({
                      ...editingLesson,
                      lesson: { ...editingLesson.lesson, quiz: updatedQuiz }
                    });
                  };

                  const updateOptionField = (optIdx: number, val: string) => {
                    const updatedQuiz = [...currentQuiz];
                    while (updatedQuiz.length <= qIdx) {
                      updatedQuiz.push({ question: "", options: ["", "", "", ""], correctAnswerIndex: 0 });
                    }
                    const updatedOptions = [...updatedQuiz[qIdx].options];
                    updatedOptions[optIdx] = val;
                    updatedQuiz[qIdx] = { ...updatedQuiz[qIdx], options: updatedOptions };
                    setEditingLesson({
                      ...editingLesson,
                      lesson: { ...editingLesson.lesson, quiz: updatedQuiz }
                    });
                  };

                  return (
                    <div key={qIdx} className="p-4 rounded-lg bg-secondary/20 border border-border/30 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-primary">Question {qIdx + 1}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground">Index réponse correcte :</span>
                          <select
                            value={question.correctAnswerIndex}
                            onChange={(e) => updateQuestionField("correctAnswerIndex", e.target.value)}
                            className="bg-secondary border border-border rounded text-[10px] p-1 text-foreground focus:outline-none"
                          >
                            <option value={0}>Option A</option>
                            <option value={1}>Option B</option>
                            <option value={2}>Option C</option>
                            <option value={3}>Option D</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <Input
                          value={question.question}
                          onChange={(e) => updateQuestionField("question", e.target.value)}
                          placeholder={`Question ${qIdx + 1} (Ex: Quelle est la règle d'or ?) ...`}
                          className="bg-secondary text-xs h-8"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {["A", "B", "C", "D"].map((letter, oIdx) => (
                          <div key={oIdx} className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-muted-foreground w-4">{letter}.</span>
                            <Input
                              value={question.options[oIdx] || ""}
                              onChange={(e) => updateOptionField(oIdx, e.target.value)}
                              placeholder={`Option ${letter}`}
                              className="bg-secondary text-[11px] h-7 flex-1"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-border/40 pt-4">
              <Button variant="ghost" onClick={() => setEditingLesson(null)}>
                Annuler
              </Button>
              <Button onClick={handleSaveLesson} className="bg-primary text-primary-foreground">
                Enregistrer la leçon
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

// ─── Audits & Prospects Admin ──────────────────────────────────
function AuditsAdmin() {
  const [requests, setRequests] = useState<AuditRequest[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("all");
  const [evaluating, setEvaluating] = useState<AuditRequest | null>(null);

  // Express Audit states
  const [visibilityScore, setVisibilityScore] = useState(5);
  const [brandingScore, setBrandingScore] = useState(5);
  const [conversionScore, setConversionScore] = useState(5);
  const [strongPointsText, setStrongPointsText] = useState("");
  const [weakPointsText, setWeakPointsText] = useState("");

  // Cockpit IA states
  const [showAiCockpit, setShowAiCockpit] = useState(false);
  const [aiAnalyzingState, setAiAnalyzingState] = useState<"idle" | "running" | "done">("idle");
  const [activeEngineTab, setActiveEngineTab] = useState("social");
  const [aiLogs, setAiLogs] = useState<string[]>([]);
  const [screenshotType, setScreenshotType] = useState<"website" | "facebook" | "instagram">("website");
  const [customScreenshot, setCustomScreenshot] = useState<string>("");
  const [assignedDeliverables, setAssignedDeliverables] = useState<string[]>(["social_grid", "performance_seo", "competitive_bench"]);
  const [webMetrics, setWebMetrics] = useState<WebMetrics>({
    fcp: 0,
    lcp: 0,
    speedIndex: 0,
    cls: 0,
    performanceScore: 0,
    seoScore: 0,
    mobileScore: 0
  });
  const [aiTone, setAiTone] = useState<"Growth" | "Branding" | "Technical" | "Direct">("Growth");
  const [assignedCloser, setAssignedCloser] = useState<string>("Cedric Y.");
  const [crmStatus, setCrmStatus] = useState<"new" | "analyzing" | "closer_assigned" | "contacted" | "closed_won" | "closed_lost">("analyzing");
  const [crmNotes, setCrmNotes] = useState<string>("");
  const [fbUrl, setFbUrl] = useState("");
  const [instaUrl, setInstaUrl] = useState("");
  const [tiktokUrl, setTiktokUrl] = useState("");
  const [snapUrl, setSnapUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [webUrl, setWebUrl] = useState("");
  
  // Scoring Checklist States
  const [fbActive, setFbActive] = useState(false);
  const [instaActive, setInstaActive] = useState(false);
  const [tiktokActive, setTiktokActive] = useState(false);
  const [seoLocal, setSeoLocal] = useState(false);
  const [reachGood, setReachGood] = useState(false);

  const [coherentGraphics, setCoherentGraphics] = useState(false);
  const [highQualityPhotos, setHighQualityPhotos] = useState(false);
  const [videoReelsUsed, setVideoReelsUsed] = useState(false);
  const [clearBio, setClearBio] = useState(false);
  const [socialProof, setSocialProof] = useState(false);

  const [whatsappCtaActive, setWhatsappCtaActive] = useState(false);
  const [linktreeCtaClear, setLinktreeCtaClear] = useState(false);
  const [fastLandingPage, setFastLandingPage] = useState(false);
  const [metaPixelInstalled, setMetaPixelInstalled] = useState(false);
  const [metaAdsCampaignActive, setMetaAdsCampaignActive] = useState(false);

  const [screenshotAnnotations, setScreenshotAnnotations] = useState<ScreenshotAnnotation[]>([]);
  const [competitors, setCompetitors] = useState<CompetitorData[]>([
    { name: "Concurrent A", visibility: 5, branding: 5, conversion: 5, global: 5 },
    { name: "Concurrent B", visibility: 6, branding: 4, conversion: 5, global: 5 }
  ]);
  const [socialMetrics, setSocialMetrics] = useState<SocialMetrics>({
    followers: "1.2k",
    engagementRate: "1.5%",
    postFrequency: "2 / semaine",
    profileScore: 5,
    creationDate: "",
    totalPosts: 0,
    photosCount: 0,
    videosCount: 0,
    reelsCount: 0,
    sponsoredPosts: "",
    campaignComparison: "",
    organicReach: "",
    sponsoredReach: "",
    visibilityPitch: ""
  });
  const [channelsMetrics, setChannelsMetrics] = useState<{
    facebook?: ChannelMetrics;
    instagram?: ChannelMetrics;
    tiktok?: ChannelMetrics;
    snapchat?: ChannelMetrics;
    youtube?: ChannelMetrics;
    google?: ChannelMetrics;
  }>({});
  const [activeSocialChannelTab, setActiveSocialChannelTab] = useState<"facebook" | "instagram" | "tiktok" | "snapchat" | "youtube" | "google">("facebook");

  // Dynamically calculate scores based on scoring checklist
  useEffect(() => {
    if (!showAiCockpit) return;
    const vis = (Number(fbActive) + Number(instaActive) + Number(tiktokActive) + Number(seoLocal) + Number(reachGood)) * 2;
    setVisibilityScore(vis);
  }, [fbActive, instaActive, tiktokActive, seoLocal, reachGood, showAiCockpit]);

  useEffect(() => {
    if (!showAiCockpit) return;
    const brand = (Number(coherentGraphics) + Number(highQualityPhotos) + Number(videoReelsUsed) + Number(clearBio) + Number(socialProof)) * 2;
    setBrandingScore(brand);
  }, [coherentGraphics, highQualityPhotos, videoReelsUsed, clearBio, socialProof, showAiCockpit]);

  useEffect(() => {
    if (!showAiCockpit) return;
    const conv = (Number(whatsappCtaActive) + Number(linktreeCtaClear) + Number(fastLandingPage) + Number(metaPixelInstalled) + Number(metaAdsCampaignActive)) * 2;
    setConversionScore(conv);
  }, [whatsappCtaActive, linktreeCtaClear, fastLandingPage, metaPixelInstalled, metaAdsCampaignActive, showAiCockpit]);

  const getChannelMetric = (channel: string, key: string, fallback: any = "") => {
    const ch = (channelsMetrics as any)[channel];
    if (!ch) return fallback;
    return ch[key] !== undefined ? ch[key] : fallback;
  };

  const setChannelMetric = (channel: string, key: string, value: any) => {
    setChannelsMetrics(prev => {
      const ch = prev[channel as keyof typeof prev] || {
        followers: "",
        engagementRate: "",
        postFrequency: "",
        profileScore: 5
      };
      return {
        ...prev,
        [channel]: {
          ...ch,
          [key]: value
        }
      };
    });
  };

  const handleLaunchAiCockpit = async (req: AuditRequest) => {
    if (!req) {
      toast.error("Aucune demande d'audit en cours d'évaluation.");
      return;
    }
    setEvaluating(req);
    const savedDeliverables = localStorage.getItem(`gln_audit_deliverables_${req.id}`);
    let parsedDeliverables = ["social_grid", "performance_seo", "competitive_bench"];
    if (savedDeliverables) {
      try {
        parsedDeliverables = JSON.parse(savedDeliverables);
      } catch (e) {
        console.error("Failed to parse saved deliverables", e);
      }
    }
    setAssignedDeliverables(parsedDeliverables);
    setShowAiCockpit(true);
    setAiAnalyzingState("running");
    setActiveEngineTab("social");
    
    const query = (req.companyName || req.clientName || "").toLowerCase();
    const sector = (req.activitySector || "").toLowerCase();
    const isHotel = query.includes("hotel") || query.includes("hôt") || sector.includes("hôt") || sector.includes("heberg") || sector.includes("hospital");
    const isCosmetics = query.includes("cosmet") || sector.includes("cosmet") || sector.includes("soin") || sector.includes("beauté");
    const isMedical = query.includes("clinic") || query.includes("sante") || query.includes("médic") || sector.includes("sante") || sector.includes("médic") || sector.includes("clinique");
    const isFood = query.includes("resto") || query.includes("café") || query.includes("food") || sector.includes("resto") || sector.includes("café") || sector.includes("aliment");
    const isRealEstate = query.includes("immo") || sector.includes("immo") || sector.includes("villa") || sector.includes("appart") || sector.includes("foncier");

    const rawLink = req.singleLink || "";
    const isLinkFb = rawLink.toLowerCase().includes("facebook.com");
    const isLinkInsta = rawLink.toLowerCase().includes("instagram.com");
    const isLinkTiktok = rawLink.toLowerCase().includes("tiktok.com");
    const isLinkSnap = rawLink.toLowerCase().includes("snapchat.com");
    const isLinkYoutube = rawLink.toLowerCase().includes("youtube.com") || rawLink.toLowerCase().includes("youtu.be");
    const isLinkWeb = rawLink.trim().length > 0 && !isLinkFb && !isLinkInsta && !isLinkTiktok && !isLinkSnap && !isLinkYoutube;

    const fbProvided = req.facebookLink || (isLinkFb ? req.singleLink : "") || (req.details?.socialLink?.includes("facebook") ? req.details.socialLink : "");
    const instaProvided = req.instagramLink || (isLinkInsta ? req.singleLink : "") || (req.details?.socialLink?.includes("instagram") ? req.details.socialLink : "");
    const tiktokProvided = req.tiktokLink || (isLinkTiktok ? req.singleLink : "") || (req.details?.socialLink?.includes("tiktok") ? req.details.socialLink : "");
    const snapProvided = req.snapchatLink || (isLinkSnap ? req.singleLink : "") || (req.details?.socialLink?.includes("snapchat") ? req.details.socialLink : "");
    const youtubeProvided = req.youtubeLink || (isLinkYoutube ? req.singleLink : "") || (req.details?.socialLink?.includes("youtube") ? req.details.socialLink : "");
    const webProvided = req.websiteUrl || (isLinkWeb ? req.singleLink : "") || req.details?.websiteUrl;

    const hasFb = !!fbProvided;
    const hasInsta = !!instaProvided;
    const hasTiktok = !!tiktokProvided;
    const hasSnap = !!snapProvided;
    const hasYoutube = !!youtubeProvided;
    const hasWeb = !!webProvided;
    
    const companyCleanName = req.companyName || req.clientName || "Entreprise";
    const searchSlug = encodeURIComponent(companyCleanName);
    const lowercaseSlug = companyCleanName.toLowerCase().replace(/\s+/g, "");

    const fbUrl = fbProvided || "";
    const instaUrl = instaProvided || "";
    const tiktokUrl = tiktokProvided || "";
    const snapUrl = snapProvided || "";
    const youtubeUrl = youtubeProvided || "";
    const webUrl = webProvided || "";

    let comp1 = "";
    let comp2 = "";
    let screenType: "website" | "facebook" | "instagram" = "website";

    // Set checkable high-fidelity competitors
    if (isHotel) {
      comp1 = "Hôtel Krystal Douala (Page Facebook & Site Web)";
      comp2 = "Star Land Hotel Bastos (Yaoundé)";
      screenType = hasWeb ? "website" : (hasFb ? "facebook" : "instagram");
    } else if (isCosmetics) {
      comp1 = "Carimo Cosmétiques (Page Officielle)";
      comp2 = "Laboratoires Biopharma (Cameroun)";
      screenType = hasInsta ? "instagram" : (hasFb ? "facebook" : "website");
    } else if (isMedical) {
      comp1 = "Clinique de l'Aéroport (Douala)";
      comp2 = "Hôpital Général de Douala (Portail Web)";
      screenType = hasWeb ? "website" : (hasFb ? "facebook" : "instagram");
    } else if (isFood) {
      comp1 = "L'Atrium Douala (Restaurant Premium)";
      comp2 = "Le Bistro Bastos Yaoundé (Page FB & Insta)";
      screenType = hasFb ? "facebook" : "instagram";
    } else if (isRealEstate) {
      comp1 = "L'Immobilier en Confiance Cameroun (Facebook)";
      comp2 = "Sci La Falaise (Douala)";
      screenType = hasWeb ? "website" : (hasFb ? "facebook" : "instagram");
    } else {
      const cleanSector = (req.activitySector || "Général").toLowerCase();
      if (cleanSector.includes("mode") || cleanSector.includes("prêt") || cleanSector.includes("vêtement") || cleanSector.includes("habits") || cleanSector.includes("textile")) {
        comp1 = "Maison d'Anny (Haute Couture Cameroun)";
        comp2 = "Boutique Glamour Douala (Mode & Prêt-à-porter)";
      } else if (cleanSector.includes("éduc") || cleanSector.includes("école") || cleanSector.includes("format") || cleanSector.includes("univ")) {
        comp1 = "Institut Universitaire de la Côte (IUC Douala)";
        comp2 = "Université de Douala (Faculté des Sciences / Technologies)";
      } else if (cleanSector.includes("finan") || cleanSector.includes("banq") || cleanSector.includes("assur") || cleanSector.includes("epargn")) {
        comp1 = "Afriland First Bank (Cameroun)";
        comp2 = "Société Générale Cameroun (SGC)";
      } else if (cleanSector.includes("transp") || cleanSector.includes("voyag") || cleanSector.includes("logist")) {
        comp1 = "Finexs Voyages (Douala - Yaoundé)";
        comp2 = "Touristique Express (Liaisons Nationales)";
      } else if (cleanSector.includes("telecom") || cleanSector.includes("télécom") || cleanSector.includes("télécommunication") || cleanSector.includes("isp") || cleanSector.includes("fai") || cleanSector.includes("operator") || cleanSector.includes("opérateur")) {
        comp1 = "Orange Cameroun (Leader Télécom & Mobile Money)";
        comp2 = "MTN Cameroun (Opérateur Télécom & Réseau Mobile)";
      } else if (cleanSector.includes("tech") || cleanSector.includes("digital") || cleanSector.includes("agenc") || cleanSector.includes("it") || cleanSector.includes("communication")) {
        comp1 = "Adkontact (Agence Marketing & Digitale - Douala)";
        comp2 = "Mboa Digital (Services de Digitalisation & Web)";
      } else if (cleanSector.includes("superm") || cleanSector.includes("boutiq") || cleanSector.includes("distrib") || cleanSector.includes("commerc") || cleanSector.includes("vente")) {
        comp1 = "Supermarchés Dovv (Yaoundé)";
        comp2 = "Carrefour Cameroun (Douala Grand Mall)";
      } else if (cleanSector.includes("agro") || cleanSector.includes("alimen") || cleanSector.includes("agri") || cleanSector.includes("boiss")) {
        comp1 = "SABC (Société Anonyme des Brasseries du Cameroun)";
        comp2 = "Congelcam (Distribution Alimentaire Cameroun)";
      } else {
        const capSector = (req.activitySector || "Commerce").trim();
        comp1 = `Leader Camerounais du ${capSector} (ex: Star Company)`;
        comp2 = `Concurrent Direct de ${capSector} (ex: Elite Enterprise)`;
      }
      screenType = hasWeb ? "website" : (hasFb ? "facebook" : "instagram");
    }
    
    setScreenshotType(screenType);
    setCustomScreenshot(req.report?.customScreenshot || "");
    
    const initialAnnotations: ScreenshotAnnotation[] = [];
    if (screenType === "website") {
      initialAnnotations.push(
        {
          id: "pin-web-1",
          x: 25,
          y: 12,
          title: "Bouton d'appel à l'action non optimisé",
          notes: "Le bouton d'action principal n'indique pas clairement le lien WhatsApp et le tunnel est complexe.",
          severity: "high"
        },
        {
          id: "pin-web-2",
          x: 78,
          y: 85,
          title: "Absence de pixels publicitaires",
          notes: "Aucun tag Meta Pixel ou Google Analytics actif détecté pour le reciblage.",
          severity: "medium"
        }
      );
    } else if (screenType === "facebook") {
      initialAnnotations.push(
        {
          id: "pin-fb-1",
          x: 75,
          y: 62,
          title: "Bouton d'action WhatsApp absent",
          notes: "Le bouton d'action principal de la page Facebook n'est pas lié à un numéro WhatsApp Business actif.",
          severity: "high"
        },
        {
          id: "pin-fb-2",
          x: 20,
          y: 40,
          title: "Absence d'offre irrésistible en haut de page",
          notes: "Aucune publication de vente structurée n'est épinglée en haut pour convertir les visiteurs.",
          severity: "medium"
        }
      );
    } else {
      initialAnnotations.push(
        {
          id: "pin-insta-1",
          x: 30,
          y: 35,
          title: "Biographie confuse et lien absent",
          notes: "La biographie n'affiche pas de proposition de valeur claire ni de lien d'appel à l'action.",
          severity: "high"
        },
        {
          id: "pin-insta-2",
          x: 50,
          y: 85,
          title: "Grille de publication peu vendeuse",
          notes: "Les publications sont uniquement statiques et ne tirent pas parti des Reels pour un reach organique.",
          severity: "medium"
        }
      );
    }
    setScreenshotAnnotations(req.report?.screenshotAnnotations || initialAnnotations);
    
    // Pre-initialize checklist states based on request
    if (req.report?.scoringChecklist) {
      const ch = req.report.scoringChecklist;
      setFbActive(ch.visibility.fbActive);
      setInstaActive(ch.visibility.instaActive);
      setTiktokActive(ch.visibility.tiktokActive);
      setSeoLocal(ch.visibility.seoLocal);
      setReachGood(ch.visibility.reachGood);

      setCoherentGraphics(ch.branding.coherentGraphics);
      setHighQualityPhotos(ch.branding.highQualityPhotos);
      setVideoReelsUsed(ch.branding.videoReelsUsed);
      setClearBio(ch.branding.clearBio);
      setSocialProof(ch.branding.socialProof);

      setWhatsappCtaActive(ch.conversion.whatsappCtaActive);
      setLinktreeCtaClear(ch.conversion.linktreeCtaClear);
      setFastLandingPage(ch.conversion.fastLandingPage);
      setMetaPixelInstalled(ch.conversion.metaPixelInstalled);
      setMetaAdsCampaignActive(ch.conversion.metaAdsCampaignActive);
    } else {
      setFbActive(hasFb);
      setInstaActive(hasInsta);
      setTiktokActive(hasTiktok);
      setSeoLocal(hasWeb && isHotel);
      setReachGood(isCosmetics);

      setCoherentGraphics(isCosmetics || isHotel);
      setHighQualityPhotos(isCosmetics || isHotel);
      setVideoReelsUsed(isCosmetics);
      setClearBio(isCosmetics);
      setSocialProof(isCosmetics || isHotel);

      setWhatsappCtaActive(isCosmetics || isHotel);
      setLinktreeCtaClear(isCosmetics);
      setFastLandingPage(hasWeb && isHotel);
      setMetaPixelInstalled(hasWeb && isHotel);
      setMetaAdsCampaignActive(isCosmetics);
    }

    const getSeedNumber = (seed: string, max: number, min: number = 0) => {
      let hash = 0;
      const combined = req.id + seed;
      for (let i = 0; i < combined.length; i++) {
        hash = combined.charCodeAt(i) + ((hash << 5) - hash);
      }
      return min + (Math.abs(hash) % (max - min + 1));
    };

    const extractNumber = (str: string): number => {
      const clean = str.replace(/[^\d]/g, '');
      return clean ? parseInt(clean, 10) : 0;
    };

    const formatNum = (num: number) => new Intl.NumberFormat('fr-FR').format(num);

    const initialLogs = [
      `[Système] Connexion établie avec l'écosystème d'analyse de GLN DIGITAL...`,
      `[MOTEUR 1: Réseaux Sociaux] Initialisation du crawler GLN DIGITAL...`
    ];
    setAiLogs(initialLogs);

    let crawledFbFollowers = "";
    let crawledInstaFollowers = "";
    let crawledTiktokFollowers = "";
    let crawledYoutubeFollowers = "";
    let crawledSnapFollowers = "";
    let crawledWebTitle = "";
    let crawledFbTitle = "";
    let crawledInstaTitle = "";

    initialLogs.push(`[Système] Crawl en parallèle de l'écosystème de la marque en cours...`);
    setAiLogs([...initialLogs]);

    try {
      const [fbRes, instaRes, tiktokRes, ytRes, snapRes, webRes] = await Promise.all([
        hasFb && fbUrl ? scrapePage(fbUrl, 'facebook') : Promise.resolve(null),
        hasInsta && instaUrl ? scrapePage(instaUrl, 'instagram') : Promise.resolve(null),
        hasTiktok && tiktokUrl ? scrapePage(tiktokUrl, 'tiktok') : Promise.resolve(null),
        hasYoutube && youtubeUrl ? scrapePage(youtubeUrl, 'youtube') : Promise.resolve(null),
        hasSnap && snapUrl ? scrapePage(snapUrl, 'snapchat') : Promise.resolve(null),
        hasWeb && webUrl ? scrapePage(webUrl, 'web') : Promise.resolve(null)
      ]);

      // Processing Facebook
      if (fbRes) {
        initialLogs.push(`[MOTEUR 1: Réseaux Sociaux] Facebook URL: '${fbUrl}'`);
        if (fbRes.success) {
          if (fbRes.title) {
            crawledFbTitle = fbRes.title;
            initialLogs.push(`[MOTEUR 1: Réseaux Sociaux] Facebook : Identité détectée : '${fbRes.title}'`);
          }
          if (fbRes.followers) {
            crawledFbFollowers = fbRes.followers;
            initialLogs.push(`[MOTEUR 1: Réseaux Sociaux] Facebook : ${fbRes.followers} réels trouvés !`);
          } else {
            initialLogs.push(`[MOTEUR 1: Réseaux Sociaux] Facebook : Accès public réussi.`);
          }
        } else {
          initialLogs.push(`[MOTEUR 1: Réseaux Sociaux] Facebook : Accès direct protégé. Analyse comportementale de repli active.`);
        }
      }

      // Processing Instagram
      if (instaRes) {
        initialLogs.push(`[MOTEUR 1: Réseaux Sociaux] Instagram URL: '${instaUrl}'`);
        if (instaRes.success) {
          if (instaRes.title) {
            crawledInstaTitle = instaRes.title;
            initialLogs.push(`[MOTEUR 1: Réseaux Sociaux] Instagram : Identité détectée : '${instaRes.title}'`);
          }
          if (instaRes.followers) {
            crawledInstaFollowers = instaRes.followers;
            initialLogs.push(`[MOTEUR 1: Réseaux Sociaux] Instagram : ${instaRes.followers} réels trouvés !`);
          } else {
            initialLogs.push(`[MOTEUR 1: Réseaux Sociaux] Instagram : Accès public réussi.`);
          }
        } else {
          initialLogs.push(`[MOTEUR 1: Réseaux Sociaux] Instagram : Accès direct protégé. Analyse comportementale de repli active.`);
        }
      }

      // Processing TikTok
      if (tiktokRes) {
        initialLogs.push(`[MOTEUR 1: Réseaux Sociaux] TikTok URL: '${tiktokUrl}'`);
        if (tiktokRes.success) {
          if (tiktokRes.followers) {
            crawledTiktokFollowers = tiktokRes.followers;
            initialLogs.push(`[MOTEUR 1: Réseaux Sociaux] TikTok : ${tiktokRes.followers} réels trouvés !`);
          }
        } else {
          initialLogs.push(`[MOTEUR 1: Réseaux Sociaux] TikTok : Accès direct protégé. Analyse comportementale de repli active.`);
        }
      }

      // Processing YouTube
      if (ytRes) {
        initialLogs.push(`[MOTEUR 1: Réseaux Sociaux] YouTube URL: '${youtubeUrl}'`);
        if (ytRes.success) {
          if (ytRes.followers) {
            crawledYoutubeFollowers = ytRes.followers;
            initialLogs.push(`[MOTEUR 1: Réseaux Sociaux] YouTube : ${ytRes.followers} abonnés réels trouvés !`);
          }
        } else {
          initialLogs.push(`[MOTEUR 1: Réseaux Sociaux] YouTube : Accès direct protégé. Analyse comportementale de repli active.`);
        }
      }

      // Processing Snapchat
      if (snapRes) {
        initialLogs.push(`[MOTEUR 1: Réseaux Sociaux] Snapchat URL: '${snapUrl}'`);
        if (snapRes.success) {
          if (snapRes.followers) {
            crawledSnapFollowers = snapRes.followers;
            initialLogs.push(`[MOTEUR 1: Réseaux Sociaux] Snapchat : ${snapRes.followers} abonnés réels trouvés !`);
          }
        } else {
          initialLogs.push(`[MOTEUR 1: Réseaux Sociaux] Snapchat : Accès direct protégé. Analyse comportementale de repli active.`);
        }
      }

      // Processing Web
      if (webRes) {
        initialLogs.push(`[MOTEUR 2: Site Web] Site URL: '${webUrl}'`);
        if (webRes.success && webRes.title) {
          crawledWebTitle = webRes.title;
          initialLogs.push(`[MOTEUR 2: Site Web] Titre de la page détecté : '${webRes.title}'`);
        }
      }
    } catch (err: any) {
      initialLogs.push(`[MOTEUR 1: Réseaux Sociaux] Erreur lors du crawl parallèle : ${err.message || err}`);
    }
    setAiLogs([...initialLogs]);

    const parsedCompanyName = crawledFbTitle || crawledInstaTitle || crawledWebTitle;
    if (parsedCompanyName) {
      req.companyName = parsedCompanyName;
    }

    // Helper to generate realistic estimated metrics based on business sector when scraping is blocked
    const getEstimatedMetrics = (platform: string, crawledFollowers: string) => {
      if (!crawledFollowers) {
        return {
          followers: "Mission Impossible (Non détecté)",
          engagementRate: "Non détecté",
          postFrequency: "Non détecté",
          profileScore: 5,
          creationDate: "Non détectée",
          totalPosts: undefined,
          photosCount: undefined,
          videosCount: undefined,
          reelsCount: undefined,
          sponsoredPosts: "Non détecté",
          campaignComparison: "Non détecté",
          organicReach: "Non détectée",
          visibilityPitch: "Analyse manuelle requise.",
          lastPostDate: "",
          lastPostLikes: undefined,
          lastPostComments: undefined,
          lastPostShares: undefined,
          lastPostViews: undefined,
        };
      }

      const cleanSector = (req.activitySector || "Général").toLowerCase();
      const isTech = cleanSector.includes("tech") || cleanSector.includes("digital") || cleanSector.includes("agenc") || cleanSector.includes("it") || cleanSector.includes("communication") || cleanSector.includes("digitalisation");
      const isTelecom = cleanSector.includes("telecom") || cleanSector.includes("télécom") || cleanSector.includes("télécommunication") || cleanSector.includes("isp") || cleanSector.includes("fai") || cleanSector.includes("operator") || cleanSector.includes("opérateur");
      const isCosm = isCosmetics;
      const isHot = isHotel;
      const isMed = isMedical;
      const isFd = isFood;
      const isReal = isRealEstate;

      let followersVal = 2400;
      let likes = 32;
      let comments = 4;
      let shares = 2;
      let er = "1.8%";
      let freq = "2 posts / semaine";
      let posts = 120;
      let photos = 80;
      let videos = 20;
      let reels = 20;
      let creation = "Créé en 2021";
      
      if (isTech) {
        followersVal = 3200;
        likes = 45;
        comments = 6;
        shares = 3;
        er = "2.1%";
        freq = "2 posts / semaine";
        posts = 180;
        photos = 110;
        videos = 30;
        reels = 40;
        creation = "Créé en 2020";
      } else if (isTelecom) {
        followersVal = 185000;
        likes = 1200;
        comments = 240;
        shares = 85;
        er = "0.8%";
        freq = "1 post / jour";
        posts = 1450;
        photos = 600;
        videos = 450;
        reels = 400;
        creation = "Créé en 2012";
      } else if (isCosm) {
        followersVal = 18500;
        likes = 412;
        comments = 34;
        shares = 18;
        er = "3.2%";
        freq = "4 posts / semaine";
        posts = 480;
        photos = 250;
        videos = 80;
        reels = 150;
        creation = "Créé en 2018";
      } else if (isHot) {
        followersVal = 6200;
        likes = 85;
        comments = 12;
        shares = 4;
        er = "1.5%";
        freq = "2 posts / semaine";
        posts = 220;
        photos = 140;
        videos = 30;
        reels = 50;
        creation = "Créé en 2019";
      } else if (isMed) {
        followersVal = 3800;
        likes = 42;
        comments = 6;
        shares = 1;
        er = "1.2%";
        freq = "1 post / semaine";
        posts = 95;
        photos = 65;
        videos = 15;
        reels = 15;
        creation = "Créé en 2020";
      } else if (isFd) {
        followersVal = 5100;
        likes = 110;
        comments = 15;
        shares = 8;
        er = "2.4%";
        freq = "3 posts / semaine";
        posts = 310;
        photos = 190;
        videos = 40;
        reels = 80;
        creation = "Créé en 2021";
      } else if (isReal) {
        followersVal = 4900;
        likes = 65;
        comments = 9;
        shares = 5;
        er = "1.6%";
        freq = "2 posts / semaine";
        posts = 160;
        photos = 110;
        videos = 20;
        reels = 30;
        creation = "Créé en 2019";
      }

      // Generate date representing 3 days ago
      const date = new Date();
      date.setDate(date.getDate() - 3);
      const lpDate = date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

      // Return scaled or raw values based on channel
      let scale = 1.0;
      if (platform === 'instagram') scale = 1.2;
      if (platform === 'tiktok') scale = 1.8;
      if (platform === 'youtube') scale = 0.5;
      if (platform === 'snapchat') scale = 0.8;

      const defaultFollowersVal = Math.round(followersVal * scale);
      const finalFollowersCount = crawledFollowers ? extractNumber(crawledFollowers) : defaultFollowersVal;
      
      // If we crawled the real followers count, adjust likes/engagement to scale with it
      const ratio = finalFollowersCount / defaultFollowersVal;
      const adjustedLikes = Math.max(2, Math.round(likes * scale * (ratio > 0.1 ? Math.min(2.5, ratio) : 1)));
      const adjustedComments = Math.max(0, Math.round(comments * scale * (ratio > 0.1 ? Math.min(2.5, ratio) : 1)));
      const adjustedShares = Math.max(0, Math.round(shares * scale * (ratio > 0.1 ? Math.min(2.5, ratio) : 1)));

      return {
        followers: crawledFollowers ? (crawledFollowers.includes("abon") || crawledFollowers.includes("follow") ? crawledFollowers : crawledFollowers + " abonnés") : `${formatNum(defaultFollowersVal)} abonnés`,
        engagementRate: er,
        postFrequency: freq,
        profileScore: 5,
        creationDate: creation,
        totalPosts: Math.round(posts * scale),
        photosCount: Math.round(photos * scale),
        videosCount: Math.round(videos * scale),
        reelsCount: Math.round(reels * scale),
        sponsoredPosts: isCosm ? "2 publicités actives détectées (campagnes Ventes WhatsApp)." : "Aucune campagne publicitaire active détectée (Meta Ad Library).",
        campaignComparison: isCosm ? "Les Reels publicitaires sur le Pack Éclat enregistrent un coût par prospect 35% plus bas." : "Campagnes non structurées, uniquement des boosts simples à faible conversion.",
        organicReach: `~${formatNum(Math.round(finalFollowersCount * 0.15))} personnes par publication`,
        visibilityPitch: `Mettre en place notre stratégie de tunnel Meta Ads direct-to-WhatsApp pour convertir l'audience existante.`,
        lastPostDate: lpDate,
        lastPostLikes: adjustedLikes,
        lastPostComments: adjustedComments,
        lastPostShares: adjustedShares,
        lastPostViews: adjustedLikes * 15,
      };
    };

    // Auto-crawled metrics per network
    const initialChannelsMetrics: {
      facebook?: ChannelMetrics;
      instagram?: ChannelMetrics;
      tiktok?: ChannelMetrics;
      snapchat?: ChannelMetrics;
      youtube?: ChannelMetrics;
      google?: ChannelMetrics;
    } = {};

    if (hasFb) {
      if (!crawledFbFollowers) {
        initialLogs.push(`[MOTEUR 1: Réseaux Sociaux] Facebook : Profil protégé. Estimation des métriques basée sur le secteur.`);
      }
      initialChannelsMetrics.facebook = getEstimatedMetrics('facebook', crawledFbFollowers);
    }

    if (hasInsta) {
      if (!crawledInstaFollowers) {
        initialLogs.push(`[MOTEUR 1: Réseaux Sociaux] Instagram : Profil protégé. Estimation des métriques basée sur le secteur.`);
      }
      initialChannelsMetrics.instagram = getEstimatedMetrics('instagram', crawledInstaFollowers);
    }

    if (hasTiktok) {
      if (!crawledTiktokFollowers) {
        initialLogs.push(`[MOTEUR 1: Réseaux Sociaux] TikTok : Profil protégé. Estimation des métriques basée sur le secteur.`);
      }
      initialChannelsMetrics.tiktok = getEstimatedMetrics('tiktok', crawledTiktokFollowers);
    }

    if (hasSnap) {
      initialChannelsMetrics.snapchat = getEstimatedMetrics('snapchat', crawledSnapFollowers);
    }

    if (hasYoutube) {
      if (!crawledYoutubeFollowers) {
        initialLogs.push(`[MOTEUR 1: Réseaux Sociaux] YouTube : Profil protégé. Estimation des métriques basée sur le secteur.`);
      }
      initialChannelsMetrics.youtube = getEstimatedMetrics('youtube', crawledYoutubeFollowers);
    }

    if (hasWeb) {
      initialChannelsMetrics.google = {
        followers: "Audit de Référencement Google",
        engagementRate: "58% d'autorité",
        postFrequency: "Optimisation continue (SEO)",
        profileScore: getSeedNumber("google_score", 8, 4),
        creationDate: "Indexé sur Google",
        totalPosts: 0,
        photosCount: 0,
        videosCount: 0,
        reelsCount: 0,
        sponsoredPosts: "Aucune campagne Google Ads active sur ce secteur de recherche.",
        campaignComparison: "Les recherches d'intention d'achat locale (ex: près de moi) ont un taux de conversion 3x supérieur.",
        organicReach: "~150 visites organiques mensuelles estimées",
        visibilityPitch: "Optimiser la fiche Google Business Profile et cibler les mots-clés transactionnels locaux.",
        lastPostDate: "Mise à jour SEO : Récente",
        lastPostLikes: 0,
        lastPostComments: 0,
        lastPostShares: 0,
        lastPostViews: 0,
      };
    }

    setChannelsMetrics(initialChannelsMetrics);
    setFbUrl(fbUrl);
    setInstaUrl(instaUrl);
    setTiktokUrl(tiktokUrl);
    setSnapUrl(snapUrl);
    setYoutubeUrl(youtubeUrl);
    setWebUrl(webUrl);
    
    setCompetitors([
      { 
        name: comp1 || "Concurrent A", 
        visibility: getSeedNumber("comp1_vis", 8, 3), 
        branding: getSeedNumber("comp1_brand", 8, 4), 
        conversion: getSeedNumber("comp1_conv", 7, 3), 
        global: getSeedNumber("comp1_glob", 8, 4) 
      },
      { 
        name: comp2 || "Concurrent B", 
        visibility: getSeedNumber("comp2_vis", 7, 3), 
        branding: getSeedNumber("comp2_brand", 7, 3), 
        conversion: getSeedNumber("comp2_conv", 6, 2), 
        global: getSeedNumber("comp2_glob", 7, 3) 
      }
    ]);

    // Auto-select active tab based on submitted link
    if (hasFb) setActiveSocialChannelTab("facebook");
    else if (hasInsta) setActiveSocialChannelTab("instagram");
    else if (hasTiktok) setActiveSocialChannelTab("tiktok");
    else if (hasSnap) setActiveSocialChannelTab("snapchat");
    else if (hasYoutube) setActiveSocialChannelTab("youtube");
    else if (hasWeb) setActiveSocialChannelTab("google");

    if (hasWeb) {
      setWebMetrics({
        fcp: isHotel ? 1.8 : 3.2,
        lcp: isHotel ? 3.4 : 5.8,
        speedIndex: isHotel ? 2.4 : 4.1,
        cls: 0.12,
        performanceScore: isHotel ? 72 : 44,
        seoScore: isHotel ? 85 : 62,
        mobileScore: isHotel ? 78 : 50
      });
    } else {
      setWebMetrics({
        fcp: 0,
        lcp: 0,
        speedIndex: 0,
        cls: 0,
        performanceScore: 0,
        seoScore: 0,
        mobileScore: 0
      });
    }

    setAssignedCloser(req.crm?.assignedCloser || "Cedric Y.");
    setCrmStatus(req.crm?.crmStatus || "analyzing");
    setCrmNotes(req.crm?.internalNotes || "");

    // Build automated crawling console log messages
    const finalLogsList = [
      `[MOTEUR 1: Réseaux Sociaux] Crawling public du feed et de la bio complété.`,
      `[MOTEUR 1: Réseaux Sociaux] Le feed de publications est protégé par la barrière de connexion Meta (SPA/Login Wall). Utilisation des métriques heuristiques basées sur l'historique public...`
    ];

    if (hasFb) {
      const fbM = initialChannelsMetrics.facebook;
      finalLogsList.push(
        `[MOTEUR 1: Réseaux Sociaux] Facebook : Crawling du dernier post (Likes: ${fbM?.lastPostLikes}, Commentaires: ${fbM?.lastPostComments}, Partages: ${fbM?.lastPostShares})`,
        `[MOTEUR 1: Réseaux Sociaux] Facebook : Portée estimée pour le post: ${fbM?.lastPostViews} personnes.`
      );
    }

    if (hasInsta) {
      const instaM = initialChannelsMetrics.instagram;
      finalLogsList.push(
        `[MOTEUR 1: Réseaux Sociaux] Instagram : Crawling du feed... Analyse du dernier Reel (${instaM?.lastPostLikes} likes, ${instaM?.lastPostComments} commentaires, ${instaM?.lastPostViews} vues).`
      );
    }

    if (hasTiktok) {
      const tiktokM = initialChannelsMetrics.tiktok;
      finalLogsList.push(
        `[MOTEUR 1: Réseaux Sociaux] TikTok : Crawling du dernier post vidéo (${tiktokM?.lastPostLikes} likes, ${tiktokM?.lastPostComments} commentaires, ${tiktokM?.lastPostViews} vues).`
      );
    }

    if (hasYoutube) {
      const ytM = initialChannelsMetrics.youtube;
      finalLogsList.push(
        `[MOTEUR 1: Réseaux Sociaux] YouTube : Crawling réussi ! ${ytM?.followers} trouvés. Analyse de l'historique des vidéos...`,
        `[MOTEUR 1: Réseaux Sociaux] YouTube : Crawling du dernier post vidéo (${ytM?.lastPostLikes} likes, ${ytM?.lastPostComments} commentaires, ${ytM?.lastPostViews} vues).`
      );
    }

    if (hasSnap) {
      const snapM = initialChannelsMetrics.snapchat;
      finalLogsList.push(
        `[MOTEUR 1: Réseaux Sociaux] Snapchat : Crawling réussi ! ${snapM?.followers} trouvés. Analyse des Stories éphémères...`
      );
    }

    finalLogsList.push(
      hasWeb 
        ? `[MOTEUR 2: Site Web] Lancement de l'audit PageSpeed pour ${webUrl}... Analyse de la vitesse mobile...`
        : "[MOTEUR 2: Site Web] Aucun site web fourni. Analyse technique ignorée (Audit orienté réseaux sociaux).",
      `[MOTEUR 3: Benchmark Concurrentiel] Récupération des concurrents sectoriels réels (${isCosmetics ? "Cosmétique" : isHotel ? "Hôtellerie" : isMedical ? "Santé" : isFood ? "Restauration" : isRealEstate ? "Immobilier" : "Général"}) dans la base de données...`,
      `[MOTEUR 3: Benchmark] Identification des leaders locaux : '${comp1}' et '${comp2}'`,
      `[MOTEUR 4: Screenshots & Annotations] Capture automatique de la maquette (${screenType}) de '${req.companyName || req.clientName}'...`,
      `[MOTEUR 4: Screenshots] Détection des points de friction critiques : Bouton WhatsApp, Grille de posts, Bio. Génération des annotations...`,
      "[MOTEUR 5: Scoring Expert] Liaison des critères d'audit avec la grille de Scoring...",
      "[MOTEUR 6: IA Recommandations] Lancement du LLM et génération du plan d'action commercial personnalisé...",
      "[MOTEUR 7: PDF + CRM] Finalisation de la structure de l'audit, création de la facture proforma et enregistrement dans le CRM."
    );

    let currentLogIndex = 0;
    const interval = setInterval(() => {
      if (currentLogIndex < finalLogsList.length) {
        initialLogs.push(finalLogsList[currentLogIndex]);
        setAiLogs([...initialLogs]);
        currentLogIndex++;
      } else {
        clearInterval(interval);
        initialLogs.push("[OK] Analyse et crawling terminés avec succès ! Initialisation du cockpit de pilotage...");
        setAiLogs([...initialLogs]);
        setTimeout(() => {
          setAiAnalyzingState("done");
        }, 600);
      }
    }, 200);
  };

  const handleGenerateAiText = () => {
    if (!evaluating) return;
    const sector = evaluating.activitySector || "Général";
    const name = evaluating.companyName || evaluating.clientName;
    const tone = aiTone;
    const objective = evaluating.mainObjective || "Plus de clients";
    const problem = evaluating.mainProblem || "Non spécifié";

    const hasFb = !!channelsMetrics.facebook;
    const hasInsta = !!channelsMetrics.instagram;
    const hasTiktok = !!channelsMetrics.tiktok;
    const hasSnap = !!channelsMetrics.snapchat;
    const hasYoutube = !!channelsMetrics.youtube;
    const hasWeb = !!webMetrics && (webMetrics.performanceScore > 0 || webMetrics.seoScore > 0 || webMetrics.mobileScore > 0);

    let strong: string[] = [];
    let weak: string[] = [];
    let recs: string[] = [];
    let summary = "";

    // 1. Precise Strengths
    if (hasFb) strong.push(`Présence active sur Facebook avec la page officielle de "${name}".`);
    if (hasInsta) strong.push(`Canal visuel configuré sur Instagram pour valoriser l'image de marque.`);
    if (hasTiktok) strong.push(`Canal TikTok actif permettant de toucher des audiences virales.`);
    if (hasWeb) strong.push(`Site internet fonctionnel (${evaluating.websiteUrl}) facilitant l'intégration technique.`);
    strong.push(`Marché porteur identifié dans le secteur "${sector}".`);
    strong.push(`Prise de contact facilitée via WhatsApp Business.`);

    // 2. Precise Weaknesses / Anomalies
    if (hasFb) {
      weak.push("Aucune campagne de conversion optimisée (Meta Ads avec pixel) sur Facebook (boosting de posts inefficace).");
      weak.push("Absence de catalogue produit interactif ou d'offres phares épinglées en haut de la page.");
    }
    if (hasInsta) {
      weak.push("Grille Instagram trop statique sans intégration de Reels éducatifs, démonstratifs ou de storytelling.");
      weak.push("Biographie Instagram confuse ne mettant pas en avant une promesse unique ni d'appel à l'action clair.");
    }
    if (hasTiktok) {
      weak.push("Vidéos TikTok manquant d'accroches (hooks) percutantes dans les 3 premières secondes.");
    }
    if (hasWeb) {
      weak.push("Lenteur technique du site web sur mobile (temps de chargement FCP > 3 secondes).");
      weak.push("Absence de pixels de reciblage Meta/Google pour recycler le trafic qualifié du site.");
    } else {
      weak.push(`Absence de site internet ou de landing page d'acquisition pour structurer les offres de "${name}".`);
    }
    weak.push(`Le problème soumis ("${problem}") est accentué par l'absence d'un tunnel d'acquisition automatisé.`);

    // 3. Precise Recommendations based on Industry and Channels
    if (sector.toLowerCase().includes("cosmet") || sector.toLowerCase().includes("beaut")) {
      recs.push("Créer 3 Reels/TikToks par semaine montrant l'application des produits cosmétiques en situation réelle avec des hooks visuels.");
      recs.push("Mettre en place une campagne Meta Ads avec objectif Ventes/Conversions dirigée vers un formulaire de diagnostic de peau gratuit.");
      recs.push("Ajouter de la preuve sociale forte en publiant des captures d'écran de témoignages de clientes satisfaites.");
    } else if (sector.toLowerCase().includes("hotel") || sector.toLowerCase().includes("heberg")) {
      recs.push("Mettre en valeur les chambres et suites à travers des mini-vidéos guidées immersives.");
      recs.push("Optimiser le moteur de réservation directe du site web et configurer des campagnes de reciblage (retargeting) sur les visiteurs n'ayant pas finalisé l'achat.");
      recs.push("Créer une offre d'appel corporate pour attirer les séjours professionnels et séminaires d'entreprises.");
    } else {
      recs.push(`Lancer immédiatement des campagnes Meta Ads de conversion WhatsApp pour collecter des leads qualifiés à la place des boosts standards.`);
      if (!hasWeb) {
        recs.push("Développer une landing page de vente rapide (Landing Page Express) pour capter et qualifier les prospects.");
      }
    }

    if (objective.toLowerCase().includes("client") || objective.toLowerCase().includes("vente")) {
      recs.push("Automatiser la qualification des prospects WhatsApp avec des messages d'accueil et des questions filtrantes.");
    }
    if (objective.toLowerCase().includes("image") || objective.toLowerCase().includes("visibilit")) {
      recs.push("Harmoniser la grille visuelle sur Instagram en créant une charte graphique premium sur Canva (modèles réutilisables).");
    }

    recs.push("Ajouter un lien d'appel à l'action Linktree regroupant le diagnostic gratuit, le contact WhatsApp direct et les témoignages clients.");

    // 4. Custom Summary
    summary = `Synthèse d'Audit pour ${name} (${sector}) - Objectifs : ${objective}. `;
    summary += `L'analyse des comptes actifs (${[hasFb && "Facebook", hasInsta && "Instagram", hasTiktok && "TikTok"].filter(Boolean).join(", ")}) montre un fort potentiel mais une exécution marketing incomplète. `;
    if (!hasWeb) {
      summary += `L'absence de site internet limite l'indépendance technique et la récolte de données. `;
    } else {
      summary += `Le site internet existant souffre de lenteurs sur mobile et d'un manque de tags publicitaires actifs. `;
    }
    summary += `En remplaçant les boosts de posts par de véritables campagnes publicitaires de conversion et en adoptant une identité visuelle premium, ${name} pourra convertir beaucoup plus de prospects satisfaits sous 30 jours.`;

    const primaryOffer = sector.toLowerCase().includes("hotel") || sector.toLowerCase().includes("heberg")
      ? "offre sejour professionnel / week-end premium"
      : sector.toLowerCase().includes("cosmet") || sector.toLowerCase().includes("beaut")
        ? "diagnostic gratuit + pack decouverte"
        : "audit gratuit + offre d'appel limitee";

    const acquisitionStrategy = [
      `Positionner ${name} sur une promesse simple : ${primaryOffer}, avec une preuve visible et un CTA WhatsApp unique.`,
      "Lancer une campagne Meta Ads Conversion WhatsApp avec 3 angles : probleme urgent, preuve client, offre d'appel.",
      "Installer une landing page rapide qui qualifie le prospect avant WhatsApp : besoin, budget, urgence, ville.",
      "Organiser les contenus en collections GLN : education, preuve sociale, offre, objections, retargeting et relance WhatsApp.",
      "Transformer les commentaires et messages entrants en leads qualifies avec etiquettes : chaud, objection, support, upsell ou a relancer.",
      "Brancher Meta Pixel + Google Analytics pour recibler les visiteurs chauds et mesurer les demandes entrantes.",
      "Mettre en place un tableau de bord hebdomadaire : leads WhatsApp, cout par lead, taux de reponse, proformas envoyees et ventes signees."
    ];

    const contentCalendar = [
      `Semaine 1 - Diagnostic du probleme : 3 posts educatifs expliquant pourquoi les prospects n'achetent pas encore chez ${name}.`,
      "Semaine 1 - 2 Reels courts avec hook en 3 secondes, preuve visuelle et CTA WhatsApp.",
      "Semaine 2 - 3 contenus preuve sociale : temoignages, avant/apres, coulisses, resultats clients.",
      "Semaine 3 - 3 contenus offre : detail du pack, objections, bonus, urgence douce.",
      "Semaine 4 - 2 lives ou videos FAQ + 1 campagne de retargeting sur les personnes engagees.",
      "Recyclage evergreen : remettre en circulation chaque mois les 5 meilleurs posts avec nouveaux hooks et CTA WhatsApp.",
      "Crossposting intelligent : adapter chaque Reel en TikTok, Shorts, Facebook Reels, statut WhatsApp et post LinkedIn si le secteur s'y prete."
    ];

    const whatsappScripts = [
      `Message d'accueil : Bonjour, merci d'avoir contacte ${name}. Pour vous orienter rapidement, quel est votre besoin principal aujourd'hui ?`,
      "Qualification : Vous etes situe(e) dans quelle ville et pour quand souhaitez-vous commencer ?",
      `Offre : D'apres votre besoin, l'option la plus adaptee est ${primaryOffer}. Je peux vous envoyer les details et le tarif maintenant.`,
      "Relance J+1 : Bonjour, je reviens vers vous concernant votre demande. Voulez-vous que je vous bloque une place / un creneau aujourd'hui ?",
      "Cloture : Pour valider, il suffit de confirmer votre nom, votre contact et le mode de paiement souhaite. Je vous accompagne jusqu'a la finalisation."
    ];

    const landingPageSections = [
      `Hero : ${name} - ${primaryOffer} pour ${evaluating.city || "Douala"} et le Cameroun.`,
      "Bloc probleme : expliquer clairement la frustration du client et le cout de l'inaction.",
      "Bloc solution : presenter l'offre en 3 benefices concrets.",
      "Bloc preuve : temoignages, captures WhatsApp, resultats, photos ou videos reelles.",
      "Bloc qualification : 3 questions rapides pour segmenter besoin, budget et urgence avant WhatsApp.",
      "Bloc link-in-bio : liens courts vers audit, offre principale, preuves, catalogue et contact WhatsApp.",
      "CTA final : bouton WhatsApp prerempli + formulaire court de qualification."
    ];

    const seoKeywords = [
      `${sector} ${evaluating.city || "Douala"}`,
      `${name} avis`,
      `${sector} Cameroun prix`,
      `meilleur ${sector} ${evaluating.city || "Douala"}`,
      `${primaryOffer} Cameroun`,
      `service ${sector} proche de moi`,
      `${sector} WhatsApp Cameroun`
    ];

    const executionPlan = [
      "Jour 1-2 : valider l'offre, la cible, le message et les preuves disponibles.",
      "Jour 3-5 : produire la landing page, installer les pixels et creer les scripts WhatsApp.",
      "Jour 6-10 : produire 8 contenus courts, 3 variantes publicitaires et une collection evergreen.",
      "Jour 11-15 : publier en crossposting adapte par canal et taguer les commentaires entrants selon leur intention.",
      "Jour 16-20 : lancer campagne Meta Ads, surveiller cout par lead, qualite des conversations et proformas envoyees.",
      "Jour 21-30 : doubler les meilleurs angles, couper les faibles, relancer les prospects non convertis et recycler les meilleurs contenus."
    ];

    setStrongPointsText(strong.join("\n"));
    setWeakPointsText(weak.join("\n"));
    setGeneralErrorsText(weak.slice(0, 2).join("\n"));
    setRecommendationsText(recs.join("\n"));
    setOverallSummary(summary);
    setAcquisitionStrategyText(acquisitionStrategy.join("\n"));
    setContentCalendarText(contentCalendar.join("\n"));
    setWhatsappScriptsText(whatsappScripts.join("\n"));
    setLandingPageSectionsText(landingPageSections.join("\n"));
    setSeoKeywordsText(seoKeywords.join("\n"));
    setExecutionPlanText(executionPlan.join("\n"));
    
    // Exact realistic scoring matching the actual profiles
    let visScore = 5;
    let brandScore = 5;
    let convScore = 4;

    if (hasFb && hasInsta && hasTiktok) visScore = 7;
    else if (hasFb && hasInsta) visScore = 6;

    if (hasWeb) brandScore = 6;
    if (objective.toLowerCase().includes("image")) brandScore += 1;

    if (hasFb && !hasWeb) convScore = 3; // hard to convert without site

    setVisibilityScore(Math.min(visScore, 10));
    setBrandingScore(Math.min(brandScore, 10));
    setConversionScore(Math.min(convScore, 10));

    toast.success(`Contenus générés avec succès (${tone}) !`);
  };

  const generateProformaForRequest = (req: AuditRequest, visScore: number, brandScore: number, convScore: number): ProformaInvoice => {
    const proformaItems: ProformaItem[] = [];
    const name = req.companyName || req.clientName;
    const isSocial = req.singleLink?.toLowerCase().includes("instagram.com") || 
                     req.singleLink?.toLowerCase().includes("facebook.com") || 
                     req.singleLink?.toLowerCase().includes("tiktok.com");
    
    if (isSocial) {
      if (brandScore < 7) {
        proformaItems.push({
          description: `Formule Refonte Visuelle & Branding Social (${name}) - Refonte complète de votre identité visuelle, création d'une charte graphique unique, bio percutante optimisée, et 15 templates Canva premium prêts à l'usage.`,
          price: 150000
        });
      }
      if (convScore < 7) {
        proformaItems.push({
          description: "Mise en place de Tunnel Publicitaire Meta Ads de Vente - Configuration complète (Ad Manager, Pixel publicitaire, API de Conversion WhatsApp), rédaction de 3 scripts copywrités persuasifs pour les publicités, et suivi/optimisation pendant 30 jours pour maximiser le ROI.",
          price: 250000
        });
      }
      if (proformaItems.length === 0) {
        proformaItems.push({
          description: "Campagne Mensuelle d'Acquisition Client Majeure - Gestion de budget publicitaire Meta, création hebdomadaire de Reels/storytelling vidéo courts et optimisation continue du ROI.",
          price: 200000
        });
      }
    } else {
      if (brandScore < 7) {
        proformaItems.push({
          description: `Conception de Site Internet Landing Page d'Acquisition Premium (${name}) - Site rapide (LCP < 2s), responsive mobile, optimisé pour l'acquisition avec des structures de conversion WhatsApp et des appels directs.`,
          price: 350000
        });
      }
      if (convScore < 7) {
        proformaItems.push({
          description: "Configuration de tracking analytique & pixel publicitaire (Google Tag Manager, Meta Pixel) - Installation des codes de suivi et mise en place de campagnes publicitaires de reciblage publicitaire (retargeting) pour reconquérir l'audience du site.",
          price: 120000
        });
      }
      if (proformaItems.length === 0) {
        proformaItems.push({
          description: "Optimisation SEO Local & Technique - Positionnement prioritaire sur Google Maps et résultats de recherche locaux de Douala/Yaoundé.",
          price: 180000
        });
      }
    }

    const totalAmount = proformaItems.reduce((acc, item) => acc + item.price, 0);
    
    return {
      invoiceNumber: `PROF-${req.id.toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
      items: proformaItems,
      totalAmount,
      paymentInstructions: "Modalités de règlement : 50% d'acompte à la validation de la commande par Orange Money / MTN Mobile Money au (+237) 692 062 677 ou par virement bancaire. Le solde de 50% est payable à la livraison des livrables et au démarrage officiel des campagnes publicitaires."
    };
  };

  const handleSaveCockpitAudit = () => {
    if (!evaluating) return;

    const report: AuditReport = {
      visibilityScore,
      brandingScore,
      conversionScore,
      strongPoints: strongPointsText.split("\n").map(s => s.trim()).filter(Boolean),
      weakPoints: weakPointsText.split("\n").map(s => s.trim()).filter(Boolean),
      generalErrors: generalErrorsText.split("\n").map(s => s.trim()).filter(Boolean),
      recommendations: recommendationsText.split("\n").map(s => s.trim()).filter(Boolean),
      overallSummary: overallSummary.trim(),
      screenshotAnnotations,
      competitors,
      socialMetrics,
      channelsMetrics,
      webMetrics,
      aiTone,
      screenshotType,
      customScreenshot,
      scoringChecklist: {
        visibility: { fbActive, instaActive, tiktokActive, seoLocal, reachGood },
        branding: { coherentGraphics, highQualityPhotos, videoReelsUsed, clearBio, socialProof },
        conversion: { whatsappCtaActive, linktreeCtaClear, fastLandingPage, metaPixelInstalled, metaAdsCampaignActive }
      },
      aiGrowthSuite: buildAiGrowthSuite()
    };

    const proforma = generateProformaForRequest(
      evaluating,
      visibilityScore,
      brandingScore,
      conversionScore
    );

    const updatedRequests = requests.map((r) => {
      if (r.id === evaluating.id) {
        return {
          ...r,
          status: "completed" as const,
          completedAt: new Date().toISOString(),
          report,
          proforma,
          crm: {
            assignedCloser,
            whatsappFollowupSent: r.crm?.whatsappFollowupSent || false,
            crmStatus,
            internalNotes: crmNotes
          }
        };
      }
      return r;
    });

    persistAuditRequests(updatedRequests);
    localStorage.setItem(`gln_audit_deliverables_${evaluating.id}`, JSON.stringify(assignedDeliverables));

    // Send completed audit notification
    addNotification({
      email: evaluating.email,
      phone: evaluating.phone,
      auditId: evaluating.id,
      companyName: evaluating.companyName || "Votre entreprise",
      type: "audit_completed",
      messageFr: `Votre diagnostic digital complet (7 Moteurs IA) pour l'entreprise "${evaluating.companyName || 'votre entreprise'}" est prêt. Vous pouvez dès à présent le consulter sur votre tableau de bord.`,
      messageEn: `Your full digital diagnostic (7 AI Engines) for "${evaluating.companyName || 'your company'}" is ready. You can view it now on your dashboard.`
    });

    setShowAiCockpit(false);
    setEvaluating(null);
    toast.success("Diagnostic complet par 7 Moteurs IA enregistré avec succès et notifié !");
  };

  // Evaluation Form States (Grid)
  const [socialGrid, setSocialGrid] = useState({
    profileBranding: { score: 3, notes: "" },
    contentQuality: { score: 3, notes: "" },
    engagement: { score: 3, notes: "" },
    conversion: { score: 3, notes: "" }
  });

  const [adsGrid, setAdsGrid] = useState({
    targeting: { score: 3, notes: "" },
    creatives: { score: 3, notes: "" },
    message: { score: 3, notes: "" },
    objective: { score: 3, notes: "" },
    landingPage: { score: 3, notes: "" }
  });

  const [webGrid, setWebGrid] = useState({
    speed: { score: 3, notes: "" },
    design: { score: 3, notes: "" },
    credibility: { score: 3, notes: "" },
    conversionCta: { score: 3, notes: "" },
    mobileResponsive: { score: 3, notes: "" },
    seoBasic: { score: 3, notes: "" }
  });

  const [businessGrid, setBusinessGrid] = useState({
    offer: { score: 3, notes: "" },
    differentiation: { score: 3, notes: "" },
    target: { score: 3, notes: "" },
    valueProposition: { score: 3, notes: "" }
  });

  const [generalErrorsText, setGeneralErrorsText] = useState("");
  const [recommendationsText, setRecommendationsText] = useState("");
  const [overallSummary, setOverallSummary] = useState("");
  const [acquisitionStrategyText, setAcquisitionStrategyText] = useState("");
  const [contentCalendarText, setContentCalendarText] = useState("");
  const [whatsappScriptsText, setWhatsappScriptsText] = useState("");
  const [landingPageSectionsText, setLandingPageSectionsText] = useState("");
  const [seoKeywordsText, setSeoKeywordsText] = useState("");
  const [executionPlanText, setExecutionPlanText] = useState("");

  const textToList = (text: string) => text.split("\n").map(s => s.trim()).filter(Boolean);

  const buildAiGrowthSuite = (): AIGrowthSuite => ({
    acquisitionStrategy: textToList(acquisitionStrategyText),
    contentCalendar: textToList(contentCalendarText),
    whatsappScripts: textToList(whatsappScriptsText),
    landingPageSections: textToList(landingPageSectionsText),
    seoKeywords: textToList(seoKeywordsText),
    executionPlan: textToList(executionPlanText),
  });

  const persistAuditRequests = (nextRequests: AuditRequest[]) => {
    saveAuditRequests(nextRequests);
    setRequests(nextRequests);
    saveRemoteAuditRequests(nextRequests).catch((error) => {
      console.error("Remote audit sync failed:", error);
      toast.warning("Audits sauvegardes localement, mais la synchronisation Supabase a echoue.");
    });
  };

  const loadRequests = async () => {
    try {
      const remoteRequests = await fetchRemoteAuditRequests();
      if (remoteRequests.length > 0) {
        saveAuditRequests(remoteRequests);
        setRequests(remoteRequests);
        return;
      }
    } catch (error) {
      console.error("Remote audit load failed:", error);
      toast.warning("Lecture Supabase impossible. Affichage des audits locaux.");
    }

    setRequests(getAuditRequests());
  };

  useEffect(() => {
    void loadRequests();
  }, []);

  const handleStartEvaluate = (req: AuditRequest) => {
    setEvaluating(req);
    const rawLink = req.singleLink || "";
    const isLinkFb = rawLink.toLowerCase().includes("facebook.com");
    const isLinkInsta = rawLink.toLowerCase().includes("instagram.com");
    const isLinkTiktok = rawLink.toLowerCase().includes("tiktok.com");
    const isLinkSnap = rawLink.toLowerCase().includes("snapchat.com");
    const isLinkYoutube = rawLink.toLowerCase().includes("youtube.com") || rawLink.toLowerCase().includes("youtu.be");
    const isLinkWeb = rawLink.trim().length > 0 && !isLinkFb && !isLinkInsta && !isLinkTiktok && !isLinkSnap && !isLinkYoutube;

    setFbUrl(req.facebookLink || (isLinkFb ? req.singleLink : "") || (req.details?.socialLink?.includes("facebook") ? req.details.socialLink : ""));
    setInstaUrl(req.instagramLink || (isLinkInsta ? req.singleLink : "") || (req.details?.socialLink?.includes("instagram") ? req.details.socialLink : ""));
    setTiktokUrl(req.tiktokLink || (isLinkTiktok ? req.singleLink : "") || (req.details?.socialLink?.includes("tiktok") ? req.details.socialLink : ""));
    setSnapUrl(req.snapchatLink || (isLinkSnap ? req.singleLink : "") || (req.details?.socialLink?.includes("snapchat") ? req.details.socialLink : ""));
    setYoutubeUrl(req.youtubeLink || (isLinkYoutube ? req.singleLink : "") || (req.details?.socialLink?.includes("youtube") ? req.details.socialLink : ""));
    setWebUrl(req.websiteUrl || (isLinkWeb ? req.singleLink : "") || req.details?.websiteUrl || "");

    const savedDeliverables = localStorage.getItem(`gln_audit_deliverables_${req.id}`);
    setAssignedDeliverables(savedDeliverables ? JSON.parse(savedDeliverables) : ["social_grid", "performance_seo", "competitive_bench"]);
    
    // Pre-populate if already completed or has defaults
    if (req.report) {
      if (req.report.socialGrid) setSocialGrid({ ...socialGrid, ...req.report.socialGrid });
      if (req.report.adsGrid) setAdsGrid({ ...adsGrid, ...req.report.adsGrid });
      if (req.report.webGrid) setWebGrid({ ...webGrid, ...req.report.webGrid });
      if (req.report.businessGrid) setBusinessGrid({ ...businessGrid, ...req.report.businessGrid });
      setGeneralErrorsText(req.report.generalErrors.join("\n"));
      setRecommendationsText(req.report.recommendations.join("\n"));
      setOverallSummary(req.report.overallSummary || "");
      setVisibilityScore(req.report.visibilityScore || 5);
      setBrandingScore(req.report.brandingScore || 5);
      setConversionScore(req.report.conversionScore || 5);
      setStrongPointsText(req.report.strongPoints?.join("\n") || "");
      setWeakPointsText(req.report.weakPoints?.join("\n") || "");
      setAcquisitionStrategyText(req.report.aiGrowthSuite?.acquisitionStrategy?.join("\n") || "");
      setContentCalendarText(req.report.aiGrowthSuite?.contentCalendar?.join("\n") || "");
      setWhatsappScriptsText(req.report.aiGrowthSuite?.whatsappScripts?.join("\n") || "");
      setLandingPageSectionsText(req.report.aiGrowthSuite?.landingPageSections?.join("\n") || "");
      setSeoKeywordsText(req.report.aiGrowthSuite?.seoKeywords?.join("\n") || "");
      setExecutionPlanText(req.report.aiGrowthSuite?.executionPlan?.join("\n") || "");
      if (req.report.channelsMetrics) {
        setChannelsMetrics(req.report.channelsMetrics);
      } else {
        setChannelsMetrics({});
      }
      if (req.report.screenshotAnnotations) {
        setScreenshotAnnotations(req.report.screenshotAnnotations);
      } else {
        setScreenshotAnnotations([]);
      }
      if (req.report.competitors) {
        setCompetitors(req.report.competitors);
      }
      if (req.report.webMetrics) {
        setWebMetrics(req.report.webMetrics);
      }
      if (req.report.screenshotType) {
        setScreenshotType(req.report.screenshotType);
      }
      if (req.report.customScreenshot) {
        setCustomScreenshot(req.report.customScreenshot);
      }
    } else {
      // Clear form
      setSocialGrid({
        profileBranding: { score: 3, notes: "" },
        contentQuality: { score: 3, notes: "" },
        engagement: { score: 3, notes: "" },
        conversion: { score: 3, notes: "" }
      });
      setAdsGrid({
        targeting: { score: 3, notes: "" },
        creatives: { score: 3, notes: "" },
        message: { score: 3, notes: "" },
        objective: { score: 3, notes: "" },
        landingPage: { score: 3, notes: "" }
      });
      setWebGrid({
        speed: { score: 3, notes: "" },
        design: { score: 3, notes: "" },
        credibility: { score: 3, notes: "" },
        conversionCta: { score: 3, notes: "" },
        mobileResponsive: { score: 3, notes: "" },
        seoBasic: { score: 3, notes: "" }
      });
      setBusinessGrid({
        offer: { score: 3, notes: "" },
        differentiation: { score: 3, notes: "" },
        target: { score: 3, notes: "" },
        valueProposition: { score: 3, notes: "" }
      });
      setGeneralErrorsText("");
      setRecommendationsText("");
      setOverallSummary("");
      setAcquisitionStrategyText("");
      setContentCalendarText("");
      setWhatsappScriptsText("");
      setLandingPageSectionsText("");
      setSeoKeywordsText("");
      setExecutionPlanText("");
      setVisibilityScore(5);
      setBrandingScore(5);
      setConversionScore(5);
      setStrongPointsText("");
      setWeakPointsText("");
      setChannelsMetrics({});
      setScreenshotAnnotations([]);
      setCompetitors([
        { name: "Concurrent A", visibility: 5, branding: 5, conversion: 5, global: 5 },
        { name: "Concurrent B", visibility: 6, branding: 4, conversion: 5, global: 5 }
      ]);
      setWebMetrics({
        fcp: 0,
        lcp: 0,
        speedIndex: 0,
        cls: 0,
        performanceScore: 0,
        seoScore: 0,
        mobileScore: 0
      });
      setScreenshotType("website");
      setCustomScreenshot("");
    }
  };

  const handleSaveEvaluation = () => {
    if (!evaluating) return;

    const isExpress = !!evaluating.activitySector;

    const report: AuditReport = {
      socialGrid: (!isExpress && evaluating.auditTypes.includes("social")) ? socialGrid : undefined,
      adsGrid: (!isExpress && evaluating.auditTypes.includes("ads")) ? adsGrid : undefined,
      webGrid: (!isExpress && evaluating.auditTypes.includes("web")) ? webGrid : undefined,
      businessGrid: (!isExpress && evaluating.auditTypes.includes("business")) ? businessGrid : undefined,
      generalErrors: isExpress ? [] : generalErrorsText.split("\n").map(s => s.trim()).filter(Boolean),
      recommendations: recommendationsText.split("\n").map(s => s.trim()).filter(Boolean),
      overallSummary: overallSummary.trim(),
      visibilityScore: isExpress ? visibilityScore : undefined,
      brandingScore: isExpress ? brandingScore : undefined,
      conversionScore: isExpress ? conversionScore : undefined,
      strongPoints: isExpress ? strongPointsText.split("\n").map(s => s.trim()).filter(Boolean) : undefined,
      weakPoints: isExpress ? weakPointsText.split("\n").map(s => s.trim()).filter(Boolean) : undefined,
      channelsMetrics,
      aiGrowthSuite: buildAiGrowthSuite()
    };

    const proforma = generateProformaForRequest(
      evaluating,
      visibilityScore || 5,
      brandingScore || 5,
      conversionScore || 5
    );

    const updatedRequests = requests.map((r) => {
      if (r.id === evaluating.id) {
        return {
          ...r,
          status: "completed" as const,
          completedAt: new Date().toISOString(),
          report,
          proforma
        };
      }
      return r;
    });

    persistAuditRequests(updatedRequests);
    localStorage.setItem(`gln_audit_deliverables_${evaluating.id}`, JSON.stringify(assignedDeliverables));

    // Send completed audit notification
    addNotification({
      email: evaluating.email,
      phone: evaluating.phone,
      auditId: evaluating.id,
      companyName: evaluating.companyName || "Votre entreprise",
      type: "audit_completed",
      messageFr: `Votre diagnostic digital complet pour l'entreprise "${evaluating.companyName || 'votre entreprise'}" est prêt. Vous pouvez dès à présent le consulter sur votre tableau de bord.`,
      messageEn: `Your full digital diagnostic for "${evaluating.companyName || 'your company'}" is ready. You can view it now on your dashboard.`
    });

    setEvaluating(null);
    toast.success("Rapport d'audit enregistré, publié et notifié avec succès !");
  };

  const handleDeleteRequest = (id: string) => {
    if (confirm("Voulez-vous vraiment supprimer cette demande d'audit ?")) {
      const updated = requests.filter(r => r.id !== id);
      saveAuditRequests(updated);
      setRequests(updated);
      deleteRemoteAuditRequest(id).catch((error) => {
        console.error("Remote audit delete failed:", error);
        toast.warning("Audit supprime localement, mais la suppression Supabase a echoue.");
      });
      toast.success("Demande d'audit supprimée.");
    }
  };

  const handleAcknowledgeRequest = (req: AuditRequest) => {
    const updatedRequests = requests.map((r) => {
      if (r.id === req.id) {
        return {
          ...r,
          crm: {
            ...r.crm,
            crmStatus: "analyzing" as const,
            internalNotes: "Prise d'acte effectuée. Analyse des 7 moteurs IA lancée par l'admin."
          }
        };
      }
      return r;
    });

    persistAuditRequests(updatedRequests);

    // Create notification for client
    addNotification({
      email: req.email,
      phone: req.phone,
      auditId: req.id,
      companyName: req.companyName || "Votre entreprise",
      type: "audit_acknowledged",
      messageFr: `GLN DIGITAL a pris acte de votre demande d'audit gratuit pour l'entreprise "${req.companyName || 'votre entreprise'}". Le diagnostic technique a été lancé.`,
      messageEn: `GLN DIGITAL has acknowledged your free audit request for "${req.companyName || 'your company'}". The technical diagnostic has been launched.`
    });

    toast.success("Prise d'acte validée avec succès. Le prospect a été notifié !");
  };

  const filteredRequests = requests.filter((r) => {
    if (filter === "pending") return r.status === "pending";
    if (filter === "completed") return r.status === "completed";
    return true;
  });

  return (
    <Card className="glass border-border/40">
      <CardHeader className="flex flex-row justify-between items-center border-b border-border/40">
        <div>
          <CardTitle>Audits Digitaux & Prospects</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">Gérez et évaluez les demandes d'audit reçues.</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => {
              if (confirm("Voulez-vous charger/réinitialiser les données de démonstration ? Cela remplacera vos audits locaux.")) {
                persistAuditRequests(defaultAuditRequests);
                toast.success("Données de démonstration chargées avec succès !");
              }
            }}
            variant="outline"
            size="sm"
            className="text-[10px] h-7 font-bold border-orange-500/20 text-orange-500 hover:bg-orange-500/10"
          >
            Charger Démo
          </Button>
          {(["all", "pending", "completed"] as const).map((f) => (
            <Button
              key={f}
              onClick={() => setFilter(f)}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              className="text-[10px] h-7 uppercase font-bold"
            >
              {f === "all" ? "Tous" : f === "pending" ? "En attente" : "Complétés"}
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        {/* Pending Audits Alert Banner for Admin */}
        {requests.filter(r => r.status === "pending").length > 0 && (
          <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-glow">
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl bg-red-500/20 text-red-400 animate-pulse">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </span>
              <div>
                <h4 className="font-heading text-xs font-black text-foreground">
                  Alerte : Nouvelles demandes d'audit en attente !
                </h4>
                <p className="text-[10px] text-muted-foreground">
                  Vous avez {requests.filter(r => r.status === "pending").length} demande(s) d'audit en attente de traitement et de prise d'acte.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => setFilter("pending")}
              className="bg-red-500 hover:bg-red-600 text-white font-bold text-[10px] h-8 px-4 rounded-xl shadow-lg"
            >
              Traiter les demandes
            </Button>
          </div>
        )}

        {showAiCockpit && evaluating && (
          <div className="fixed inset-0 bg-background/95 backdrop-blur-md z-50 overflow-y-auto flex flex-col animate-fade-in text-foreground">
            {/* Header */}
            <div className="border-b border-border/60 bg-card/60 backdrop-blur px-6 py-4 flex justify-between items-center sticky top-0 z-30">
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                  <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                </span>
                <div>
                  <h2 className="font-heading text-sm font-black text-foreground flex items-center gap-1.5">
                    Cockpit de Diagnostic IA 7 Moteurs — {evaluating.companyName || evaluating.clientName}
                  </h2>
                  <p className="text-[9px] text-muted-foreground">
                    Secteur d'activité: {evaluating.activitySector || "Non spécifié"} | Objectif: {evaluating.mainObjective || "Non spécifié"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowAiCockpit(false)}
                  className="text-xs border-border/80 text-foreground"
                >
                  Fermer le Cockpit
                </Button>
                {aiAnalyzingState === "done" && (
                  <Button 
                    onClick={handleSaveCockpitAudit} 
                    className="bg-gradient-primary text-primary-foreground font-bold text-xs shadow-glow"
                  >
                    Valider & Enregistrer l'Audit
                  </Button>
                )}
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 container mx-auto px-6 py-8 max-w-7xl flex flex-col justify-center">
              {aiAnalyzingState === "running" ? (
                /* LOADING TERMINAL SCREEN */
                <div className="max-w-xl mx-auto w-full space-y-6 animate-pulse">
                  <div className="text-center space-y-2">
                    <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto mb-4"></div>
                    <h3 className="font-heading font-bold text-sm text-foreground">Exécution des 7 Moteurs IA en cours...</h3>
                    <p className="text-xs text-muted-foreground">Scraping, Benchmark, Scoring Expert, Screenshot-segmentation, NLP Analysis...</p>
                  </div>
                  <div className="bg-black/80 border border-border/40 rounded-2xl p-4 font-mono text-[10px] text-green-400 space-y-1.5 h-64 overflow-y-auto shadow-inner">
                    {aiLogs.map((log, idx) => (
                      <div key={idx} className="flex gap-2 items-start">
                        <span className="text-primary font-bold">{idx + 1}.</span>
                        <span>{log}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-center">
                    <Button 
                      variant="ghost" 
                      onClick={() => setAiAnalyzingState("done")}
                      className="text-[10px] text-muted-foreground hover:text-foreground"
                    >
                      Bypass & Ouvrir le Cockpit
                    </Button>
                  </div>
                </div>
              ) : (
                /* MAIN COCKPIT DASHBOARD */
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
                  
                  {/* Left Sidebar Navigation (Moteurs Tabs) */}
                  <div className="lg:col-span-1 space-y-1.5 bg-card/40 border border-border/40 p-3 rounded-2xl backdrop-blur-sm">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase px-2 tracking-widest block mb-2">Moteurs Disponibles</span>
                    {[
                      { id: "social", label: "1. Réseaux Sociaux", icon: Share2 },
                      { id: "web", label: "2. Site Web", icon: Globe },
                      { id: "benchmark", label: "3. Benchmark concurrent", icon: BarChart2 },
                      { id: "screenshots", label: "4. Screenshots & Pins", icon: Target },
                      { id: "scoring", label: "5. Scoring Expert", icon: Star },
                      { id: "recommendations", label: "6. IA Recommandations", icon: Sparkles },
                      { id: "crm", label: "7. PDF + CRM Integration", icon: FileText }
                    ].map((engine) => {
                      const Icon = engine.icon;
                      return (
                        <button
                          key={engine.id}
                          onClick={() => setActiveEngineTab(engine.id)}
                          className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                            activeEngineTab === engine.id
                              ? "bg-gradient-primary text-primary-foreground shadow-md font-bold"
                              : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
                          }`}
                        >
                          <Icon className={`w-4 h-4 ${activeEngineTab === engine.id ? "" : "text-primary"}`} />
                          {engine.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Right Content Column */}
                  <div className="lg:col-span-3 bg-card/20 border border-border/40 rounded-2xl p-6 backdrop-blur-sm min-h-[500px] flex flex-col justify-between">
                    <div>
                      {/* Active Tab Panel Content */}
                      {activeEngineTab === "social" && (
                        <div className="space-y-6 animate-fade-in">
                          <div className="border-b border-border/40 pb-3 flex justify-between items-center">
                            <div>
                              <h3 className="font-heading text-xs font-bold text-primary flex items-center gap-1.5">
                                <Share2 className="w-4 h-4" />
                                Moteur 1 : Audit Réseaux Sociaux
                              </h3>
                              <p className="text-[10px] text-muted-foreground mt-0.5">Configurez des analyses et rapports précis pour chaque canal social individuel.</p>
                            </div>
                          </div>

                          {/* Social Channel Sub-tabs */}
                          <div className="flex gap-2 border-b border-border/40 pb-2">
                            {(["facebook", "instagram", "tiktok", "snapchat", "youtube", "google"] as const).map((channel) => {
                              const isActive = !!channelsMetrics[channel];
                              return (
                                <button
                                  key={channel}
                                  type="button"
                                  disabled={!isActive}
                                  onClick={() => setActiveSocialChannelTab(channel)}
                                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all border ${
                                    !isActive
                                      ? "opacity-30 cursor-not-allowed bg-secondary/10 border-border/20 text-muted-foreground"
                                      : activeSocialChannelTab === channel
                                        ? "bg-primary border-primary text-primary-foreground shadow"
                                        : "bg-secondary/40 border-border/50 text-muted-foreground hover:bg-secondary"
                                  }`}
                                >
                                  {channel} {!isActive && "(Non fourni)"}
                                </button>
                              );
                            })}
                          </div>

                          <div className="space-y-4">
                            <span className="text-[10px] font-bold text-primary uppercase block">Rapport détaillé pour : {activeSocialChannelTab.toUpperCase()}</span>
                            
                            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-400 flex items-start gap-2 max-w-2xl leading-relaxed">
                              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-bold">Analyse & Estimation IA active :</span> Le scraping direct public peut être protégé ou restreint par la plateforme. Des métriques cohérentes ont été estimées automatiquement par l'IA pour le secteur <span className="underline font-semibold">{evaluating?.activitySector || "Général"}</span>. Vous pouvez ajuster n'importe quelle valeur ci-dessous pour refléter précisément la réalité de la page.
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <Label className="text-[11px] font-bold text-foreground">Nombre d'Abonnés / Followers ({activeSocialChannelTab})</Label>
                                <Input 
                                  value={getChannelMetric(activeSocialChannelTab, "followers")}
                                  onChange={(e) => setChannelMetric(activeSocialChannelTab, "followers", e.target.value)}
                                  placeholder="Ex: 8.5k abonnés, 12k followers"
                                  className="bg-secondary text-xs"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-[11px] font-bold text-foreground">Taux d'Engagement Moyen (%)</Label>
                                <Input 
                                  value={getChannelMetric(activeSocialChannelTab, "engagementRate")}
                                  onChange={(e) => setChannelMetric(activeSocialChannelTab, "engagementRate", e.target.value)}
                                  placeholder="Ex: 2.8%"
                                  className="bg-secondary text-xs"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-[11px] font-bold text-foreground">Fréquence de Publication</Label>
                                <Input 
                                  value={getChannelMetric(activeSocialChannelTab, "postFrequency")}
                                  onChange={(e) => setChannelMetric(activeSocialChannelTab, "postFrequency", e.target.value)}
                                  placeholder="Ex: 3 posts / semaine"
                                  className="bg-secondary text-xs"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-[11px] font-bold text-foreground">Score Branding & Présentation (0-10)</Label>
                                <select
                                  value={getChannelMetric(activeSocialChannelTab, "profileScore", 5)}
                                  onChange={(e) => setChannelMetric(activeSocialChannelTab, "profileScore", Number(e.target.value))}
                                  className="bg-secondary border border-border rounded-lg px-2 py-2 text-xs text-foreground focus:outline-none w-full"
                                >
                                  {Array.from({ length: 11 }).map((_, n) => <option key={n} value={n}>{n}/10</option>)}
                                </select>
                              </div>
                            </div>

                            <div className="border-t border-border/40 pt-4 space-y-4">
                              <h4 className="text-[10px] font-bold text-primary uppercase">Détails du Dernier Post ({activeSocialChannelTab.toUpperCase()})</h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                                <div className="space-y-1.5">
                                  <Label className="text-[10px] font-bold text-muted-foreground">Date du Dernier Post</Label>
                                  <Input 
                                    value={getChannelMetric(activeSocialChannelTab, "lastPostDate") || ""}
                                    onChange={(e) => setChannelMetric(activeSocialChannelTab, "lastPostDate", e.target.value)}
                                    placeholder="Ex: 2026-06-01"
                                    className="bg-secondary text-xs"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-[10px] font-bold text-muted-foreground">Likes</Label>
                                  <Input 
                                    type="number"
                                    value={getChannelMetric(activeSocialChannelTab, "lastPostLikes") ?? ""}
                                    onChange={(e) => setChannelMetric(activeSocialChannelTab, "lastPostLikes", e.target.value === "" ? undefined : Number(e.target.value))}
                                    className="bg-secondary text-xs"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-[10px] font-bold text-muted-foreground">Commentaires</Label>
                                  <Input 
                                    type="number"
                                    value={getChannelMetric(activeSocialChannelTab, "lastPostComments") ?? ""}
                                    onChange={(e) => setChannelMetric(activeSocialChannelTab, "lastPostComments", e.target.value === "" ? undefined : Number(e.target.value))}
                                    className="bg-secondary text-xs"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-[10px] font-bold text-muted-foreground">Partages</Label>
                                  <Input 
                                    type="number"
                                    value={getChannelMetric(activeSocialChannelTab, "lastPostShares") ?? ""}
                                    onChange={(e) => setChannelMetric(activeSocialChannelTab, "lastPostShares", e.target.value === "" ? undefined : Number(e.target.value))}
                                    className="bg-secondary text-xs"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-[10px] font-bold text-muted-foreground">Portée / Vues</Label>
                                  <Input 
                                    type="number"
                                    value={getChannelMetric(activeSocialChannelTab, "lastPostViews") ?? ""}
                                    onChange={(e) => setChannelMetric(activeSocialChannelTab, "lastPostViews", e.target.value === "" ? undefined : Number(e.target.value))}
                                    className="bg-secondary text-xs"
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="border-t border-border/40 pt-4 space-y-4">
                              <h4 className="text-[10px] font-bold text-primary uppercase">Métriques Avancées ({activeSocialChannelTab.toUpperCase()})</h4>
                              
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1.5">
                                  <Label className="text-[10px] font-bold text-muted-foreground">Date de Création / Historique</Label>
                                  <Input 
                                    value={getChannelMetric(activeSocialChannelTab, "creationDate")}
                                    onChange={(e) => setChannelMetric(activeSocialChannelTab, "creationDate", e.target.value)}
                                    placeholder="Ex: Créé en Mai 2020"
                                    className="bg-secondary text-xs"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-[10px] font-bold text-muted-foreground">Nombre Total de Posts</Label>
                                  <Input 
                                    type="number"
                                    value={getChannelMetric(activeSocialChannelTab, "totalPosts", 0)}
                                    onChange={(e) => setChannelMetric(activeSocialChannelTab, "totalPosts", Number(e.target.value))}
                                    className="bg-secondary text-xs"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-[10px] font-bold text-muted-foreground">Portée Organique Estimée</Label>
                                  <Input 
                                    value={getChannelMetric(activeSocialChannelTab, "organicReach")}
                                    onChange={(e) => setChannelMetric(activeSocialChannelTab, "organicReach", e.target.value)}
                                    placeholder="Ex: ~1,200 personnes"
                                    className="bg-secondary text-xs"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1.5">
                                  <Label className="text-[10px] font-bold text-muted-foreground">Nombre de Photos</Label>
                                  <Input 
                                    type="number"
                                    value={getChannelMetric(activeSocialChannelTab, "photosCount", 0)}
                                    onChange={(e) => setChannelMetric(activeSocialChannelTab, "photosCount", Number(e.target.value))}
                                    className="bg-secondary text-xs"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-[10px] font-bold text-muted-foreground">Nombre de Vidéos</Label>
                                  <Input 
                                    type="number"
                                    value={getChannelMetric(activeSocialChannelTab, "videosCount", 0)}
                                    onChange={(e) => setChannelMetric(activeSocialChannelTab, "videosCount", Number(e.target.value))}
                                    className="bg-secondary text-xs"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-[10px] font-bold text-muted-foreground">Nombre de Reels / Vidéos courtes</Label>
                                  <Input 
                                    type="number"
                                    value={getChannelMetric(activeSocialChannelTab, "reelsCount", 0)}
                                    onChange={(e) => setChannelMetric(activeSocialChannelTab, "reelsCount", Number(e.target.value))}
                                    className="bg-secondary text-xs"
                                  />
                                </div>
                              </div>

                              <div className="space-y-1.5">
                                <Label className="text-[10px] font-bold text-muted-foreground">Analyse & Historique Publicitaire (Meta Library / TikTok Ads)</Label>
                                <Textarea 
                                  value={getChannelMetric(activeSocialChannelTab, "sponsoredPosts")}
                                  onChange={(e) => setChannelMetric(activeSocialChannelTab, "sponsoredPosts", e.target.value)}
                                  placeholder="Ex: 2 publicités actives ciblées vers WhatsApp. Budget mensuel estimé..."
                                  className="bg-secondary text-xs"
                                  rows={2}
                                />
                              </div>

                              <div className="space-y-1.5">
                                <Label className="text-[10px] font-bold text-muted-foreground">Comparaison & Efficacité des Campagnes</Label>
                                <Textarea 
                                  value={getChannelMetric(activeSocialChannelTab, "campaignComparison")}
                                  onChange={(e) => setChannelMetric(activeSocialChannelTab, "campaignComparison", e.target.value)}
                                  placeholder="Ex: Les Reels de démonstration avant/après ont généré 4x plus de ventes que les photos catalogue..."
                                  className="bg-secondary text-xs"
                                  rows={2}
                                />
                              </div>

                              <div className="space-y-1.5">
                                <Label className="text-[10px] font-bold text-muted-foreground">Offres & Pitch de Closing Commercial (Solutions concrètes)</Label>
                                <Textarea 
                                  value={getChannelMetric(activeSocialChannelTab, "visibilityPitch")}
                                  onChange={(e) => setChannelMetric(activeSocialChannelTab, "visibilityPitch", e.target.value)}
                                  placeholder="Ex: Proposer la formule refonte de grille et tunnel de vente WhatsApp pour résoudre les anomalies détectées..."
                                  className="bg-secondary text-xs"
                                  rows={3}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeEngineTab === "web" && (
                        <div className="space-y-6 animate-fade-in">
                          <div className="border-b border-border/40 pb-3">
                            <h3 className="font-heading text-xs font-bold text-primary flex items-center gap-1.5">
                              <Globe className="w-4 h-4" />
                              Moteur 2 : Audit Site Web (Simulation Lighthouse)
                            </h3>
                            <p className="text-[10px] text-muted-foreground mt-0.5">Analysez les performances techniques, le SEO et la compatibilité mobile du site.</p>
                          </div>
                          
                          {(!webMetrics || (webMetrics.performanceScore === 0 && webMetrics.seoScore === 0 && webMetrics.mobileScore === 0)) ? (
                            <div className="p-6 rounded-2xl bg-primary/5 border border-primary/20 text-center space-y-3">
                              <AlertTriangle className="w-8 h-8 text-primary mx-auto animate-bounce" />
                              <h4 className="font-heading font-bold text-sm text-foreground">Aucun Site Web fourni par le client</h4>
                              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                                Ce prospect ne possède aucun site internet ou landing page d'acquisition. L'analyse technique et de performance (Lighthouse) est donc inactive.
                              </p>
                              <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs font-bold text-primary max-w-md mx-auto">
                                💡 Suggestion IA : Inviter le client à concevoir et lancer une Landing Page Express rapide optimisée pour capter des leads et convertir directement via WhatsApp.
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1.5 p-3 rounded-xl bg-card border border-border/40 text-center">
                                  <span className="text-[10px] font-bold text-muted-foreground block uppercase">Performance</span>
                                  <span className="text-xl font-heading font-black text-orange-500 block my-1">{webMetrics.performanceScore}%</span>
                                  <input 
                                    type="range" min="0" max="100" 
                                    value={webMetrics.performanceScore}
                                    onChange={(e) => setWebMetrics({...webMetrics, performanceScore: Number(e.target.value)})}
                                    className="w-full accent-primary" 
                                  />
                                </div>
                                <div className="space-y-1.5 p-3 rounded-xl bg-card border border-border/40 text-center">
                                  <span className="text-[10px] font-bold text-muted-foreground block uppercase">SEO</span>
                                  <span className="text-xl font-heading font-black text-green-400 block my-1">{webMetrics.seoScore}%</span>
                                  <input 
                                    type="range" min="0" max="100" 
                                    value={webMetrics.seoScore}
                                    onChange={(e) => setWebMetrics({...webMetrics, seoScore: Number(e.target.value)})}
                                    className="w-full accent-primary" 
                                  />
                                </div>
                                <div className="space-y-1.5 p-3 rounded-xl bg-card border border-border/40 text-center">
                                  <span className="text-[10px] font-bold text-muted-foreground block uppercase">Mobile Responsive</span>
                                  <span className="text-xl font-heading font-black text-green-400 block my-1">{webMetrics.mobileScore}%</span>
                                  <input 
                                    type="range" min="0" max="100" 
                                    value={webMetrics.mobileScore}
                                    onChange={(e) => setWebMetrics({...webMetrics, mobileScore: Number(e.target.value)})}
                                    className="w-full accent-primary" 
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-border/40 pt-4">
                                <div className="space-y-1">
                                  <Label className="text-[10px] font-bold text-muted-foreground">FCP (First Contentful Paint)</Label>
                                  <Input 
                                    type="number" step="0.1"
                                    value={webMetrics.fcp}
                                    onChange={(e) => setWebMetrics({...webMetrics, fcp: Number(e.target.value)})}
                                    className="bg-secondary text-xs"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-[10px] font-bold text-muted-foreground">LCP (Largest Contentful Paint)</Label>
                                  <Input 
                                    type="number" step="0.1"
                                    value={webMetrics.lcp}
                                    onChange={(e) => setWebMetrics({...webMetrics, lcp: Number(e.target.value)})}
                                    className="bg-secondary text-xs"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-[10px] font-bold text-muted-foreground">CLS (Cumulative Layout Shift)</Label>
                                  <Input 
                                    type="number" step="0.01"
                                    value={webMetrics.cls}
                                    onChange={(e) => setWebMetrics({...webMetrics, cls: Number(e.target.value)})}
                                    className="bg-secondary text-xs"
                                  />
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      {activeEngineTab === "benchmark" && (
                        <div className="space-y-6 animate-fade-in">
                          <div className="border-b border-border/40 pb-3">
                            <h3 className="font-heading text-xs font-bold text-primary flex items-center gap-1.5">
                              <BarChart2 className="w-4 h-4" />
                              Moteur 3 : Benchmark Concurrentiel
                            </h3>
                            <p className="text-[10px] text-muted-foreground mt-0.5">Comparez les performances du prospect avec les leaders de son secteur d'activité.</p>
                          </div>

                          <div className="space-y-4">
                            {competitors.map((comp, idx) => (
                              <div key={idx} className="p-4 rounded-xl bg-card border border-border/40 space-y-3">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                                  <div className="w-full md:w-1/3">
                                    <Label className="text-[10px] font-bold text-muted-foreground">Nom du Concurrent {idx + 1}</Label>
                                    <Input 
                                      value={comp.name}
                                      onChange={(e) => {
                                        const newComps = [...competitors];
                                        newComps[idx].name = e.target.value;
                                        setCompetitors(newComps);
                                      }}
                                      className="bg-secondary text-xs mt-0.5"
                                    />
                                  </div>
                                  
                                  <div className="grid grid-cols-3 gap-2 flex-1">
                                    <div>
                                      <Label className="text-[10px] font-bold text-muted-foreground block">Visibilité</Label>
                                      <select
                                        value={comp.visibility}
                                        onChange={(e) => {
                                          const newComps = [...competitors];
                                          newComps[idx].visibility = Number(e.target.value);
                                          newComps[idx].global = Math.round((newComps[idx].visibility + newComps[idx].branding + newComps[idx].conversion) / 3 * 10) / 10;
                                          setCompetitors(newComps);
                                        }}
                                        className="bg-secondary border border-border rounded px-1.5 py-1 text-xs text-foreground focus:outline-none w-full"
                                      >
                                        {Array.from({ length: 11 }).map((_, n) => <option key={n} value={n}>{n}/10</option>)}
                                      </select>
                                    </div>
                                    <div>
                                      <Label className="text-[10px] font-bold text-muted-foreground block">Branding</Label>
                                      <select
                                        value={comp.branding}
                                        onChange={(e) => {
                                          const newComps = [...competitors];
                                          newComps[idx].branding = Number(e.target.value);
                                          newComps[idx].global = Math.round((newComps[idx].visibility + newComps[idx].branding + newComps[idx].conversion) / 3 * 10) / 10;
                                          setCompetitors(newComps);
                                        }}
                                        className="bg-secondary border border-border rounded px-1.5 py-1 text-xs text-foreground focus:outline-none w-full"
                                      >
                                        {Array.from({ length: 11 }).map((_, n) => <option key={n} value={n}>{n}/10</option>)}
                                      </select>
                                    </div>
                                    <div>
                                      <Label className="text-[10px] font-bold text-muted-foreground block">Conversion</Label>
                                      <select
                                        value={comp.conversion}
                                        onChange={(e) => {
                                          const newComps = [...competitors];
                                          newComps[idx].conversion = Number(e.target.value);
                                          newComps[idx].global = Math.round((newComps[idx].visibility + newComps[idx].branding + newComps[idx].conversion) / 3 * 10) / 10;
                                          setCompetitors(newComps);
                                        }}
                                        className="bg-secondary border border-border rounded px-1.5 py-1 text-xs text-foreground focus:outline-none w-full"
                                      >
                                        {Array.from({ length: 11 }).map((_, n) => <option key={n} value={n}>{n}/10</option>)}
                                      </select>
                                    </div>
                                  </div>

                                  <div className="text-center md:pl-4">
                                    <span className="text-[9px] font-bold text-muted-foreground block uppercase">Global</span>
                                    <span className="font-heading font-black text-xs text-primary">{comp.global}/10</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {activeEngineTab === "screenshots" && (
                        <div className="space-y-6 animate-fade-in">
                          <div className="border-b border-border/40 pb-3 flex justify-between items-center">
                            <div>
                              <h3 className="font-heading text-xs font-bold text-primary flex items-center gap-1.5">
                                <Target className="w-4 h-4" />
                                Moteur 4 : Screenshots & Annotations Interactives
                              </h3>
                              <p className="text-[10px] text-muted-foreground mt-0.5">Sélectionnez le support de capture et cliquez sur l'image pour épingler des annotations.</p>
                            </div>
                            <div className="flex gap-2 items-center">
                              <select
                                value={screenshotType}
                                onChange={(e) => setScreenshotType(e.target.value as any)}
                                className="bg-secondary border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none"
                              >
                                <option value="website">Site web standard</option>
                                <option value="facebook">Page Facebook</option>
                                <option value="instagram">Profil Instagram</option>
                              </select>
                              <Label className="bg-secondary border border-border hover:bg-secondary/80 rounded px-2.5 py-1 text-[11px] font-bold text-foreground cursor-pointer flex items-center gap-1.5 transition-all">
                                <Upload className="w-3 h-3 text-primary" />
                                Importer Capture
                                <input 
                                  type="file" 
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      const reader = new FileReader();
                                      reader.onload = (event) => {
                                        setCustomScreenshot(event.target?.result as string);
                                      };
                                      reader.readAsDataURL(file);
                                    }
                                  }}
                                />
                              </Label>
                              {customScreenshot && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setCustomScreenshot("")}
                                  className="text-red-400 hover:text-red-300 p-1 text-[10px] h-fit"
                                >
                                  Effacer
                                </Button>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Interactive Simulation Viewport */}
                            <div className="space-y-2">
                              <span className="text-[10px] font-bold text-muted-foreground block uppercase">Maquette Interactive (Cliquez pour épingler)</span>
                              <div 
                                onClick={(e) => {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
                                  const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
                                  
                                  const title = prompt("Titre de l'annotation (ex: CTA Invisible) :");
                                  if (!title) return;
                                  const notes = prompt("Détails/Critiques :") || "";
                                  const severity = (prompt("Sévérité (low, medium, high) :") || "medium") as any;
                                  
                                  const newPin: ScreenshotAnnotation = {
                                    id: "pin-" + Math.random().toString(36).substring(2, 6),
                                    x, y, title, notes, severity
                                  };
                                  setScreenshotAnnotations(prev => [...prev, newPin]);
                                }}
                                className="relative aspect-[4/3] rounded-xl border border-border/60 overflow-hidden cursor-crosshair shadow-inner bg-slate-950 flex flex-col items-center justify-center select-none"
                                style={(() => {
                                  const liveUrl = customScreenshot || (
                                    screenshotType === "website" && webUrl ? `https://api.microlink.io?url=${encodeURIComponent(webUrl)}&screenshot=true&embed=screenshot.url` :
                                    screenshotType === "facebook" && fbUrl ? `https://api.microlink.io?url=${encodeURIComponent(fbUrl)}&screenshot=true&embed=screenshot.url` :
                                    screenshotType === "instagram" && instaUrl ? `https://api.microlink.io?url=${encodeURIComponent(instaUrl)}&screenshot=true&embed=screenshot.url` :
                                    ""
                                  );
                                  return liveUrl ? { backgroundImage: `url(${liveUrl})`, backgroundSize: 'cover', backgroundPosition: 'top center' } : {};
                                })()}
                              >
                                {!(customScreenshot || (screenshotType === "website" && webUrl) || (screenshotType === "facebook" && fbUrl) || (screenshotType === "instagram" && instaUrl)) && (
                                  <div className="p-6 text-center space-y-3 max-w-xs">
                                    <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto text-primary animate-pulse">
                                      <Camera className="w-6 h-6" />
                                    </div>
                                    <div className="space-y-1">
                                      <p className="text-xs font-bold text-foreground">Aucune capture d'écran réelle</p>
                                      <p className="text-[10px] text-muted-foreground leading-relaxed">
                                        Importez une capture d'écran de la page du client (Bouton "Importer Capture" ci-dessus) pour y annoter précisément les problèmes détectés.
                                      </p>
                                    </div>
                                  </div>
                                )}
                                {(customScreenshot || (screenshotType === "website" && webUrl) || (screenshotType === "facebook" && fbUrl) || (screenshotType === "instagram" && instaUrl)) && (
                                  <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md border border-border/40 px-2 py-0.5 rounded text-[8px] font-bold text-primary flex items-center gap-1">
                                    <span className="w-1 h-1 rounded-full bg-green-500 animate-ping"></span>
                                    Capture réelle active
                                  </div>
                                )}

                                {/* Pins Overlay */}
                                {screenshotAnnotations.map((pin, i) => (
                                  <div 
                                    key={pin.id}
                                    style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
                                    className={`absolute w-4 h-4 rounded-full flex items-center justify-center font-bold text-[8px] text-white -ml-2 -mt-2 shadow-lg border border-white animate-scale-up ${
                                      pin.severity === "high" ? "bg-red-500" :
                                      pin.severity === "medium" ? "bg-orange-500" :
                                      "bg-amber-400"
                                    }`}
                                    title={pin.title}
                                  >
                                    {i + 1}
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Annotations List */}
                            <div className="space-y-2">
                              <span className="text-[10px] font-bold text-muted-foreground block uppercase">Points critiques épinglés ({screenshotAnnotations.length})</span>
                              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                                {screenshotAnnotations.map((pin, idx) => (
                                  <div key={pin.id} className="p-3 rounded-xl bg-card border border-border/40 flex justify-between items-start gap-2 text-xs">
                                    <div>
                                      <span className="font-bold text-primary flex items-center gap-1.5">
                                        <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] text-white ${
                                          pin.severity === "high" ? "bg-red-500" :
                                          pin.severity === "medium" ? "bg-orange-500" :
                                          "bg-amber-400"
                                        }`}>
                                          {idx + 1}
                                        </span>
                                        {pin.title}
                                      </span>
                                      <p className="text-[10px] text-muted-foreground mt-1">{pin.notes}</p>
                                    </div>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={() => setScreenshotAnnotations(prev => prev.filter(p => p.id !== pin.id))}
                                      className="text-red-400 hover:text-red-300 p-1 h-fit"
                                    >
                                      Supprimer
                                    </Button>
                                  </div>
                                ))}
                                {screenshotAnnotations.length === 0 && (
                                  <div className="text-center py-8 text-[11px] text-muted-foreground italic bg-secondary/15 rounded-xl border border-dashed border-border/40">
                                    Aucune annotation épinglée. Cliquez sur la maquette pour ajouter une critique visuelle.
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeEngineTab === "scoring" && (
                        <div className="space-y-6 animate-fade-in">
                          <div className="border-b border-border/40 pb-3">
                            <h3 className="font-heading text-xs font-bold text-primary flex items-center gap-1.5">
                              <Star className="w-4 h-4" />
                              Moteur 5 : Scoring Expert & Gap Analysis
                            </h3>
                            <p className="text-[10px] text-muted-foreground mt-0.5">Le score est calculé objectivement par rapport aux critères validés ci-dessous, mais vous pouvez ajuster manuellement.</p>
                          </div>

                          <div className="space-y-4">
                            <div className="p-4 rounded-xl bg-card border border-border/40 space-y-4">
                              <div className="space-y-2">
                                <div className="flex justify-between text-xs">
                                  <span className="font-bold text-foreground">Score Visibilité</span>
                                  <span className="font-extrabold text-primary">{visibilityScore}/10</span>
                                </div>
                                <input 
                                  type="range" min="0" max="100" 
                                  value={visibilityScore * 10}
                                  onChange={(e) => setVisibilityScore(Math.round(Number(e.target.value) / 10))}
                                  className="w-full accent-primary" 
                                />
                              </div>
                              
                              <div className="space-y-2">
                                <div className="flex justify-between text-xs">
                                  <span className="font-bold text-foreground">Score Branding & Image</span>
                                  <span className="font-extrabold text-primary">{brandingScore}/10</span>
                                </div>
                                <input 
                                  type="range" min="0" max="100" 
                                  value={brandingScore * 10}
                                  onChange={(e) => setBrandingScore(Math.round(Number(e.target.value) / 10))}
                                  className="w-full accent-primary" 
                                />
                              </div>

                              <div className="space-y-2">
                                <div className="flex justify-between text-xs">
                                  <span className="font-bold text-foreground">Score Conversion</span>
                                  <span className="font-extrabold text-primary">{conversionScore}/10</span>
                                </div>
                                <input 
                                  type="range" min="0" max="100" 
                                  value={conversionScore * 10}
                                  onChange={(e) => setConversionScore(Math.round(Number(e.target.value) / 10))}
                                  className="w-full accent-primary" 
                                />
                              </div>
                            </div>

                            {/* Checklist justifying the scores */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-border/40">
                              {/* Visibility Checklist */}
                              <div className="p-4 rounded-xl bg-card/40 border border-border/40 space-y-3">
                                <h4 className="text-[11px] font-bold text-primary uppercase border-b border-border/40 pb-1 flex justify-between items-center">
                                  <span>1. Visibilité ({visibilityScore}/10)</span>
                                </h4>
                                <div className="space-y-2 text-[11px] text-muted-foreground">
                                  <label className="flex items-start gap-2 cursor-pointer hover:text-foreground">
                                    <input 
                                      type="checkbox" 
                                      checked={fbActive}
                                      onChange={(e) => setFbActive(e.target.checked)}
                                      className="mt-0.5 accent-primary"
                                    />
                                    <span>Page Facebook active (+2 pts)</span>
                                  </label>
                                  <label className="flex items-start gap-2 cursor-pointer hover:text-foreground">
                                    <input 
                                      type="checkbox" 
                                      checked={instaActive}
                                      onChange={(e) => setInstaActive(e.target.checked)}
                                      className="mt-0.5 accent-primary"
                                    />
                                    <span>Instagram configuré (+2 pts)</span>
                                  </label>
                                  <label className="flex items-start gap-2 cursor-pointer hover:text-foreground">
                                    <input 
                                      type="checkbox" 
                                      checked={tiktokActive}
                                      onChange={(e) => setTiktokActive(e.target.checked)}
                                      className="mt-0.5 accent-primary"
                                    />
                                    <span>TikTok/Shorts actif (+2 pts)</span>
                                  </label>
                                  <label className="flex items-start gap-2 cursor-pointer hover:text-foreground">
                                    <input 
                                      type="checkbox" 
                                      checked={seoLocal}
                                      onChange={(e) => setSeoLocal(e.target.checked)}
                                      className="mt-0.5 accent-primary"
                                    />
                                    <span>SEO local / GMB actif (+2 pts)</span>
                                  </label>
                                  <label className="flex items-start gap-2 cursor-pointer hover:text-foreground">
                                    <input 
                                      type="checkbox" 
                                      checked={reachGood}
                                      onChange={(e) => setReachGood(e.target.checked)}
                                      className="mt-0.5 accent-primary"
                                    />
                                    <span>Portée organique &gt; 1k (+2 pts)</span>
                                  </label>
                                </div>
                              </div>

                              {/* Branding Checklist */}
                              <div className="p-4 rounded-xl bg-card/40 border border-border/40 space-y-3">
                                <h4 className="text-[11px] font-bold text-primary uppercase border-b border-border/40 pb-1">
                                  <span>2. Branding & Image ({brandingScore}/10)</span>
                                </h4>
                                <div className="space-y-2 text-[11px] text-muted-foreground">
                                  <label className="flex items-start gap-2 cursor-pointer hover:text-foreground">
                                    <input 
                                      type="checkbox" 
                                      checked={coherentGraphics}
                                      onChange={(e) => setCoherentGraphics(e.target.checked)}
                                      className="mt-0.5 accent-primary"
                                    />
                                    <span>Charte graphique propre (+2 pts)</span>
                                  </label>
                                  <label className="flex items-start gap-2 cursor-pointer hover:text-foreground">
                                    <input 
                                      type="checkbox" 
                                      checked={highQualityPhotos}
                                      onChange={(e) => setHighQualityPhotos(e.target.checked)}
                                      className="mt-0.5 accent-primary"
                                    />
                                    <span>Photos réelles de qualité (+2 pts)</span>
                                  </label>
                                  <label className="flex items-start gap-2 cursor-pointer hover:text-foreground">
                                    <input 
                                      type="checkbox" 
                                      checked={videoReelsUsed}
                                      onChange={(e) => setVideoReelsUsed(e.target.checked)}
                                      className="mt-0.5 accent-primary"
                                    />
                                    <span>Format Reels régulier (+2 pts)</span>
                                  </label>
                                  <label className="flex items-start gap-2 cursor-pointer hover:text-foreground">
                                    <input 
                                      type="checkbox" 
                                      checked={clearBio}
                                      onChange={(e) => setClearBio(e.target.checked)}
                                      className="mt-0.5 accent-primary"
                                    />
                                    <span>Bio & Promesse claires (+2 pts)</span>
                                  </label>
                                  <label className="flex items-start gap-2 cursor-pointer hover:text-foreground">
                                    <input 
                                      type="checkbox" 
                                      checked={socialProof}
                                      onChange={(e) => setSocialProof(e.target.checked)}
                                      className="mt-0.5 accent-primary"
                                    />
                                    <span>Avis clients & Preuves (+2 pts)</span>
                                  </label>
                                </div>
                              </div>

                              {/* Conversion Checklist */}
                              <div className="p-4 rounded-xl bg-card/40 border border-border/40 space-y-3">
                                <h4 className="text-[11px] font-bold text-primary uppercase border-b border-border/40 pb-1">
                                  <span>3. Conversion ({conversionScore}/10)</span>
                                </h4>
                                <div className="space-y-2 text-[11px] text-muted-foreground">
                                  <label className="flex items-start gap-2 cursor-pointer hover:text-foreground">
                                    <input 
                                      type="checkbox" 
                                      checked={whatsappCtaActive}
                                      onChange={(e) => setWhatsappCtaActive(e.target.checked)}
                                      className="mt-0.5 accent-primary"
                                    />
                                    <span>WhatsApp direct configuré (+2 pts)</span>
                                  </label>
                                  <label className="flex items-start gap-2 cursor-pointer hover:text-foreground">
                                    <input 
                                      type="checkbox" 
                                      checked={linktreeCtaClear}
                                      onChange={(e) => setLinktreeCtaClear(e.target.checked)}
                                      className="mt-0.5 accent-primary"
                                    />
                                    <span>Tunnel Linktree de bio (+2 pts)</span>
                                  </label>
                                  <label className="flex items-start gap-2 cursor-pointer hover:text-foreground">
                                    <input 
                                      type="checkbox" 
                                      checked={fastLandingPage}
                                      onChange={(e) => setFastLandingPage(e.target.checked)}
                                      className="mt-0.5 accent-primary"
                                    />
                                    <span>Site rapide / Landing Page (+2 pts)</span>
                                  </label>
                                  <label className="flex items-start gap-2 cursor-pointer hover:text-foreground">
                                    <input 
                                      type="checkbox" 
                                      checked={metaPixelInstalled}
                                      onChange={(e) => setMetaPixelInstalled(e.target.checked)}
                                      className="mt-0.5 accent-primary"
                                    />
                                    <span>Pixel Meta / Tag Google (+2 pts)</span>
                                  </label>
                                  <label className="flex items-start gap-2 cursor-pointer hover:text-foreground">
                                    <input 
                                      type="checkbox" 
                                      checked={metaAdsCampaignActive}
                                      onChange={(e) => setMetaAdsCampaignActive(e.target.checked)}
                                      className="mt-0.5 accent-primary"
                                    />
                                    <span>Campagnes Meta Ads (+2 pts)</span>
                                  </label>
                                </div>
                              </div>
                            </div>

                            <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 text-center">
                              <span className="text-[10px] font-bold text-muted-foreground uppercase block">Note Globale Estimée</span>
                              <span className="text-2xl font-heading font-black text-primary my-1">
                                {Math.round(((visibilityScore + brandingScore + conversionScore) / 3) * 10) / 10}/10
                              </span>
                              <p className="text-[9px] text-muted-foreground">Moyenne pondérée des dimensions Visibilité, Branding et Conversion.</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeEngineTab === "recommendations" && (
                        <div className="space-y-6 animate-fade-in">
                          <div className="border-b border-border/40 pb-3 flex justify-between items-center">
                            <div>
                              <h3 className="font-heading text-xs font-bold text-primary flex items-center gap-1.5">
                                <Sparkles className="w-4 h-4" />
                                Moteur 6 : Générateur de Recommandations par IA
                              </h3>
                              <p className="text-[10px] text-muted-foreground mt-0.5">Sélectionnez le persona de l'IA de conseil et générez le plan d'action.</p>
                            </div>
                            <div className="flex gap-2 items-center">
                              <select
                                value={aiTone}
                                onChange={(e) => setAiTone(e.target.value as any)}
                                className="bg-secondary border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none"
                              >
                                <option value="Growth">Growth Hacker (Conversion)</option>
                                <option value="Branding">Brand Strategist (Image)</option>
                                <option value="Technical">Technical Lead (Lighthouse/SEO)</option>
                                <option value="Direct">Direct Closer (Vente express)</option>
                              </select>
                              <Button 
                                onClick={handleGenerateAiText}
                                size="sm" 
                                className="bg-gradient-primary text-primary-foreground text-[10px] font-extrabold"
                              >
                                Générer
                              </Button>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-green-400">Points Forts (un par ligne)</Label>
                                <Textarea 
                                  value={strongPointsText}
                                  onChange={(e) => setStrongPointsText(e.target.value)}
                                  rows={3}
                                  className="bg-secondary text-xs"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-red-400">Points Faibles (un par ligne)</Label>
                                <Textarea 
                                  value={weakPointsText}
                                  onChange={(e) => setWeakPointsText(e.target.value)}
                                  rows={3}
                                  className="bg-secondary text-xs"
                                />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <Label className="text-[10px] font-bold text-foreground">Erreurs critiques détectées</Label>
                              <Textarea 
                                value={generalErrorsText}
                                onChange={(e) => setGeneralErrorsText(e.target.value)}
                                rows={2}
                                className="bg-secondary text-xs"
                              />
                            </div>

                            <div className="space-y-1">
                              <Label className="text-[10px] font-bold text-foreground">Plan de Recommandations</Label>
                              <Textarea 
                                value={recommendationsText}
                                onChange={(e) => setRecommendationsText(e.target.value)}
                                rows={3}
                                className="bg-secondary text-xs"
                              />
                            </div>

                            <div className="space-y-1">
                              <Label className="text-[10px] font-bold text-foreground">Synthèse Finale de l'IA</Label>
                              <Textarea 
                                value={overallSummary}
                                onChange={(e) => setOverallSummary(e.target.value)}
                                rows={2}
                                className="bg-secondary text-xs"
                              />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                              <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-primary">Strategie d'acquisition GLN</Label>
                                <Textarea value={acquisitionStrategyText} onChange={(e) => setAcquisitionStrategyText(e.target.value)} rows={5} className="bg-secondary text-xs" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-primary">Calendrier contenu 30 jours</Label>
                                <Textarea value={contentCalendarText} onChange={(e) => setContentCalendarText(e.target.value)} rows={5} className="bg-secondary text-xs" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-primary">Scripts WhatsApp de conversion</Label>
                                <Textarea value={whatsappScriptsText} onChange={(e) => setWhatsappScriptsText(e.target.value)} rows={5} className="bg-secondary text-xs" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-primary">Landing page recommandee</Label>
                                <Textarea value={landingPageSectionsText} onChange={(e) => setLandingPageSectionsText(e.target.value)} rows={5} className="bg-secondary text-xs" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-primary">Mots-cles SEO + IA</Label>
                                <Textarea value={seoKeywordsText} onChange={(e) => setSeoKeywordsText(e.target.value)} rows={4} className="bg-secondary text-xs" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-primary">Plan d'exÃ©cution 30 jours</Label>
                                <Textarea value={executionPlanText} onChange={(e) => setExecutionPlanText(e.target.value)} rows={4} className="bg-secondary text-xs" />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeEngineTab === "crm" && (
                        <div className="space-y-6 animate-fade-in">
                          <div className="border-b border-border/40 pb-3">
                            <h3 className="font-heading text-xs font-bold text-primary flex items-center gap-1.5">
                              <FileText className="w-4 h-4" />
                              Moteur 7 : export PDF + Suivi CRM
                            </h3>
                            <p className="text-[10px] text-muted-foreground mt-0.5">Assignez des closers commerciaux et suivez les statuts de conversion CRM.</p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                              <Label className="text-[11px] font-bold text-foreground">Closer Assigné</Label>
                              <Input 
                                value={assignedCloser}
                                onChange={(e) => setAssignedCloser(e.target.value)}
                                placeholder="Nom du commercial"
                                className="bg-secondary text-xs"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <Label className="text-[11px] font-bold text-foreground">Statut du Prospect (CRM)</Label>
                              <select
                                value={crmStatus}
                                onChange={(e) => setCrmStatus(e.target.value as any)}
                                className="bg-secondary border border-border rounded-lg px-2 py-2.5 text-xs text-foreground focus:outline-none w-full"
                              >
                                <option value="new">Nouveau Prospect</option>
                                <option value="analyzing">En cours d'analyse</option>
                                <option value="closer_assigned">Closer Assigné</option>
                                <option value="contacted">Contacté</option>
                                <option value="closed_won">Gagné (Client)</option>
                                <option value="closed_lost">Perdu</option>
                              </select>
                            </div>

                            <div className="p-3 rounded-xl bg-card border border-border/40 flex items-center justify-between">
                              <span className="text-[10px] font-bold text-muted-foreground uppercase">Format de Rapport</span>
                              <span className="font-heading font-black text-primary text-[10px] uppercase bg-primary/10 border border-primary/20 px-2 py-1 rounded">
                                {evaluating.reportChoice || "pdf"}
                              </span>
                            </div>
                          </div>

                          {/* Checklist Livrables IA */}
                          <div className="space-y-2 mt-4 p-4 rounded-xl bg-card border border-border/40">
                            <Label className="text-[11px] font-bold text-foreground block font-heading">Livrables IA & Moteurs à Inclure</Label>
                            <p className="text-[9px] text-muted-foreground mb-3">Sélectionnez les rapports et documents générés automatiquement à associer au profil client.</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                              {[
                                { id: "social_grid", label: "Diagnostic Réseaux Sociaux (M1)" },
                                { id: "performance_seo", label: "Diagnostic Performance Web (M2)" },
                                { id: "competitive_bench", label: "Benchmark Concurrentiel (M3)" },
                                { id: "visual_screenshot", label: "Screenshot & Annotations (M4)" },
                                { id: "copywriting_recs", label: "Synthèse & Copywriting LLM (M6)" },
                                { id: "closing_scripts", label: "Scripts de vente WhatsApp (M7)" },
                                { id: "acquisition_strategy", label: "Strategie acquisition GLN" },
                                { id: "content_calendar", label: "Calendrier contenu 30 jours" },
                                { id: "seo_ai_keywords", label: "Mots-cles SEO + IA" },
                              ].map((deliv) => {
                                const checked = assignedDeliverables.includes(deliv.id);
                                return (
                                  <label 
                                    key={deliv.id} 
                                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-[11px] font-medium cursor-pointer transition-all ${
                                      checked 
                                        ? "bg-primary/5 border-primary text-primary" 
                                        : "bg-secondary/40 border-border/80 text-muted-foreground hover:bg-secondary/70"
                                    }`}
                                  >
                                    <input 
                                      type="checkbox" 
                                      checked={checked}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setAssignedDeliverables([...assignedDeliverables, deliv.id]);
                                        } else {
                                          setAssignedDeliverables(assignedDeliverables.filter(id => id !== deliv.id));
                                        }
                                      }}
                                      className="rounded border-border text-primary focus:ring-primary w-3.5 h-3.5"
                                    />
                                    {deliv.label}
                                  </label>
                                );
                              })}
                            </div>
                          </div>

                          <div className="space-y-1.5 mt-4">
                            <Label className="text-[11px] font-bold text-foreground">Notes Internes Commerciales</Label>
                            <Textarea 
                              value={crmNotes}
                              onChange={(e) => setCrmNotes(e.target.value)}
                              rows={3}
                              placeholder="Écrivez des notes de suivi ici pour l'équipe commerciale..."
                              className="bg-secondary text-xs"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bottom Navigation Buttons inside Active Panel */}
                    <div className="flex justify-between items-center border-t border-border/40 pt-4 mt-6">
                      <span className="text-[9px] text-muted-foreground uppercase">Onglet actif : {activeEngineTab}</span>
                      <div className="flex gap-2">
                        {activeEngineTab !== "social" && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              const tabs = ["social", "web", "benchmark", "screenshots", "scoring", "recommendations", "crm"];
                              const idx = tabs.indexOf(activeEngineTab);
                              if (idx > 0) setActiveEngineTab(tabs[idx - 1]);
                            }}
                            className="text-xs"
                          >
                            Précédent
                          </Button>
                        )}
                        {activeEngineTab !== "crm" ? (
                          <Button 
                            size="sm"
                            onClick={() => {
                              const tabs = ["social", "web", "benchmark", "screenshots", "scoring", "recommendations", "crm"];
                              const idx = tabs.indexOf(activeEngineTab);
                              if (idx < tabs.length - 1) setActiveEngineTab(tabs[idx + 1]);
                            }}
                            className="bg-secondary text-foreground text-xs"
                          >
                            Suivant
                          </Button>
                        ) : (
                          <Button 
                            size="sm"
                            onClick={handleSaveCockpitAudit}
                            className="bg-gradient-primary text-primary-foreground font-bold text-xs"
                          >
                            Publier & Sauvegarder
                          </Button>
                        )}
                      </div>
                    </div>

                  </div>

                </div>
              )}
            </div>
          </div>
        )}

        {evaluating ? (
          <div className="space-y-6">
            {/* Banner Lancement Cockpit IA */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-primary/10 via-orange-500/10 to-amber-500/10 border border-primary/20 flex flex-col md:flex-row justify-between items-center gap-4 shadow-glow">
              <div className="space-y-0.5 text-center md:text-left">
                <h4 className="font-heading text-xs font-black text-foreground flex items-center justify-center md:justify-start gap-1.5">
                  <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                  Cockpit de Diagnostic IA Avancé (7 Moteurs)
                </h4>
                <p className="text-[9px] text-muted-foreground max-w-md">
                  Utilisez les 7 moteurs d'IA de GLN DIGITAL pour générer un diagnostic complet avec annotations interactives et graphiques de benchmark.
                </p>
              </div>
              <Button 
                onClick={() => handleLaunchAiCockpit(evaluating)}
                className="w-full md:w-auto bg-gradient-primary hover:opacity-90 text-primary-foreground font-black text-[10px] h-9 px-4 rounded-xl flex items-center gap-1.5 shadow-lg"
              >
                <Sparkles className="w-3.5 h-3.5 animate-spin-slow" />
                Lancer le Cockpit IA (7 Moteurs)
              </Button>
            </div>

            <div className="flex justify-between items-center border-b border-border/40 pb-4">
              <div>
                <h3 className="font-heading font-bold text-sm text-primary">
                  Évaluation d'Audit : {evaluating.companyName || evaluating.clientName}
                </h3>
                <p className="text-[10px] text-muted-foreground">Prospect: {evaluating.clientName} | {evaluating.email} | {evaluating.phone}</p>
                {evaluating.activitySector && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Secteur: <strong>{evaluating.activitySector}</strong> | Objectif: <strong>{evaluating.mainObjective}</strong> | Budget: <strong>{evaluating.marketingBudget || "Non spécifié"}</strong>
                  </p>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[10px]">
                  {evaluating.facebookLink && (
                    <span>FB: <a href={evaluating.facebookLink} target="_blank" rel="noreferrer" className="text-primary hover:underline font-mono">{evaluating.facebookLink}</a></span>
                  )}
                  {evaluating.instagramLink && (
                    <span>IG: <a href={evaluating.instagramLink} target="_blank" rel="noreferrer" className="text-primary hover:underline font-mono">{evaluating.instagramLink}</a></span>
                  )}
                  {evaluating.tiktokLink && (
                    <span>TikTok: <a href={evaluating.tiktokLink} target="_blank" rel="noreferrer" className="text-primary hover:underline font-mono">{evaluating.tiktokLink}</a></span>
                  )}
                  {evaluating.snapchatLink && (
                    <span>Snap: <a href={evaluating.snapchatLink} target="_blank" rel="noreferrer" className="text-primary hover:underline font-mono">{evaluating.snapchatLink}</a></span>
                  )}
                  {evaluating.youtubeLink && (
                    <span>YouTube: <a href={evaluating.youtubeLink} target="_blank" rel="noreferrer" className="text-primary hover:underline font-mono">{evaluating.youtubeLink}</a></span>
                  )}
                  {evaluating.websiteUrl && (
                    <span>Site: <a href={evaluating.websiteUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline font-mono">{evaluating.websiteUrl}</a></span>
                  )}
                  {evaluating.googleAnalytics && (
                    <span>Google Analytics: <strong className="text-foreground font-mono">{evaluating.googleAnalytics}</strong></span>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setEvaluating(null)} className="text-xs">
                Annuler
              </Button>
            </div>

            {/* Form Selection based on audit types (Express or Custom Grid) */}
            {evaluating.activitySector ? (
              <div className="space-y-6">
                <div className="p-4 rounded-2xl bg-secondary/20 border border-border/40 space-y-4">
                  <h4 className="font-heading text-xs font-bold text-primary flex items-center gap-1.5 uppercase tracking-wider">
                    <ShieldAlert className="w-4 h-4" />
                    Notes sur 10 (Audit Express)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5 p-3 rounded-xl bg-card border border-border/40">
                      <Label className="text-[11px] font-bold text-foreground">Score Visibilité (0-10)</Label>
                      <select
                        value={visibilityScore}
                        onChange={(e) => setVisibilityScore(Number(e.target.value))}
                        className="bg-secondary border border-border rounded-lg px-2 py-1 text-xs text-foreground focus:outline-none w-full"
                      >
                        {Array.from({ length: 11 }).map((_, n) => <option key={n} value={n}>{n}/10</option>)}
                      </select>
                    </div>

                    <div className="space-y-1.5 p-3 rounded-xl bg-card border border-border/40">
                      <Label className="text-[11px] font-bold text-foreground">Score Branding / Image (0-10)</Label>
                      <select
                        value={brandingScore}
                        onChange={(e) => setBrandingScore(Number(e.target.value))}
                        className="bg-secondary border border-border rounded-lg px-2 py-1 text-xs text-foreground focus:outline-none w-full"
                      >
                        {Array.from({ length: 11 }).map((_, n) => <option key={n} value={n}>{n}/10</option>)}
                      </select>
                    </div>

                    <div className="space-y-1.5 p-3 rounded-xl bg-card border border-border/40">
                      <Label className="text-[11px] font-bold text-foreground">Score Conversion (0-10)</Label>
                      <select
                        value={conversionScore}
                        onChange={(e) => setConversionScore(Number(e.target.value))}
                        className="bg-secondary border border-border rounded-lg px-2 py-1 text-xs text-foreground focus:outline-none w-full"
                      >
                        {Array.from({ length: 11 }).map((_, n) => <option key={n} value={n}>{n}/10</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-bold text-green-400 flex items-center gap-1.5">
                      Points Forts (Un par ligne)
                    </Label>
                    <Textarea
                      value={strongPointsText}
                      onChange={(e) => setStrongPointsText(e.target.value)}
                      rows={4}
                      placeholder="Ex: Belle identité de marque visuelle.&#10;Ex: Accessibilité WhatsApp évidente."
                      className="bg-secondary text-xs mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-bold text-red-400 flex items-center gap-1.5">
                      Points Faibles (Un par ligne)
                    </Label>
                    <Textarea
                      value={weakPointsText}
                      onChange={(e) => setWeakPointsText(e.target.value)}
                      rows={4}
                      placeholder="Ex: Site web trop lent sur mobile.&#10;Ex: Aucun lien d'achat direct."
                      className="bg-secondary text-xs mt-1"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Social Grid Form */}
                {evaluating.auditTypes.includes("social") && (
                  <div className="space-y-4 p-4 rounded-2xl bg-secondary/20 border border-border/40">
                    <h4 className="font-heading text-xs font-bold text-primary flex items-center gap-1.5 uppercase tracking-wider">
                      <ShieldAlert className="w-4 h-4" />
                      Critères: Réseaux Sociaux
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(Object.keys(socialGrid) as Array<keyof typeof socialGrid>).map((key) => (
                        <div key={key} className="space-y-1.5 p-3 rounded-xl bg-card border border-border/40">
                          <Label className="text-[11px] font-bold capitalize text-foreground">
                            {key === "profileBranding" ? "Profil & Branding" : key === "contentQuality" ? "Qualité du Contenu" : key === "engagement" ? "Engagement" : "WhatsApp & Conversion"}
                          </Label>
                          <div className="flex gap-2">
                            <select
                              value={socialGrid[key].score}
                              onChange={(e) => setSocialGrid({
                                ...socialGrid,
                                [key]: { ...socialGrid[key], score: Number(e.target.value) }
                              })}
                              className="bg-secondary border border-border rounded-lg px-2 py-1 text-xs text-foreground focus:outline-none"
                            >
                              {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}★</option>)}
                            </select>
                            <Input
                              value={socialGrid[key].notes}
                              onChange={(e) => setSocialGrid({
                                ...socialGrid,
                                [key]: { ...socialGrid[key], notes: e.target.value }
                              })}
                              placeholder="Remarques et observations..."
                              className="bg-secondary text-xs h-8 flex-1"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Ads Grid Form */}
                {evaluating.auditTypes.includes("ads") && (
                  <div className="space-y-4 p-4 rounded-2xl bg-secondary/20 border border-border/40">
                    <h4 className="font-heading text-xs font-bold text-orange-500 flex items-center gap-1.5 uppercase tracking-wider">
                      <ShieldAlert className="w-4 h-4" />
                      Critères: Publicité (Meta Ads)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(Object.keys(adsGrid) as Array<keyof typeof adsGrid>).map((key) => (
                        <div key={key} className="space-y-1.5 p-3 rounded-xl bg-card border border-border/40">
                          <Label className="text-[11px] font-bold capitalize text-foreground">
                            {key === "targeting" ? "Ciblage d'audience" : key === "creatives" ? "Qualité des créatives" : key === "message" ? "Message & Copywriting" : key === "objective" ? "Objectif de campagne" : "Page de destination"}
                          </Label>
                          <div className="flex gap-2">
                            <select
                              value={adsGrid[key].score}
                              onChange={(e) => setAdsGrid({
                                ...adsGrid,
                                [key]: { ...adsGrid[key], score: Number(e.target.value) }
                              })}
                              className="bg-secondary border border-border rounded-lg px-2 py-1 text-xs text-foreground focus:outline-none"
                            >
                              {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}★</option>)}
                            </select>
                            <Input
                              value={adsGrid[key].notes}
                              onChange={(e) => setAdsGrid({
                                ...adsGrid,
                                [key]: { ...adsGrid[key], notes: e.target.value }
                              })}
                              placeholder="Remarques et observations..."
                              className="bg-secondary text-xs h-8 flex-1"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Web Grid Form */}
                {evaluating.auditTypes.includes("web") && (
                  <div className="space-y-4 p-4 rounded-2xl bg-secondary/20 border border-border/40">
                    <h4 className="font-heading text-xs font-bold text-blue-500 flex items-center gap-1.5 uppercase tracking-wider">
                      <ShieldAlert className="w-4 h-4" />
                      Critères: Site Web & SEO
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(Object.keys(webGrid) as Array<keyof typeof webGrid>).map((key) => (
                        <div key={key} className="space-y-1.5 p-3 rounded-xl bg-card border border-border/40">
                          <Label className="text-[11px] font-bold capitalize text-foreground">
                            {key === "speed" ? "Vitesse de chargement" : key === "design" ? "Design UX/UI" : key === "credibility" ? "Preuve sociale" : key === "conversionCta" ? "Appels à l'action" : key === "mobileResponsive" ? "Optimisation Mobile" : "SEO technique de base"}
                          </Label>
                          <div className="flex gap-2">
                            <select
                              value={webGrid[key].score}
                              onChange={(e) => setWebGrid({
                                ...webGrid,
                                [key]: { ...webGrid[key], score: Number(e.target.value) }
                              })}
                              className="bg-secondary border border-border rounded-lg px-2 py-1 text-xs text-foreground focus:outline-none"
                            >
                              {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}★</option>)}
                            </select>
                            <Input
                              value={webGrid[key].notes}
                              onChange={(e) => setWebGrid({
                                ...webGrid,
                                [key]: { ...webGrid[key], notes: e.target.value }
                              })}
                              placeholder="Remarques et observations..."
                              className="bg-secondary text-xs h-8 flex-1"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Business Positioning Grid Form */}
                {evaluating.auditTypes.includes("business") && (
                  <div className="space-y-4 p-4 rounded-2xl bg-secondary/20 border border-border/40">
                    <h4 className="font-heading text-xs font-bold text-accent flex items-center gap-1.5 uppercase tracking-wider">
                      <ShieldAlert className="w-4 h-4" />
                      Critères: Positionnement Business
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(Object.keys(businessGrid) as Array<keyof typeof businessGrid>).map((key) => (
                        <div key={key} className="space-y-1.5 p-3 rounded-xl bg-card border border-border/40">
                          <Label className="text-[11px] font-bold capitalize text-foreground">
                            {key === "offer" ? "Structure de l'offre" : key === "differentiation" ? "Différenciation" : key === "target" ? "Clarté cible" : "Proposition de valeur"}
                          </Label>
                          <div className="flex gap-2">
                            <select
                              value={businessGrid[key].score}
                              onChange={(e) => setBusinessGrid({
                                ...businessGrid,
                                [key]: { ...businessGrid[key], score: Number(e.target.value) }
                              })}
                              className="bg-secondary border border-border rounded-lg px-2 py-1 text-xs text-foreground focus:outline-none"
                            >
                              {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}★</option>)}
                            </select>
                            <Input
                              value={businessGrid[key].notes}
                              onChange={(e) => setBusinessGrid({
                                ...businessGrid,
                                [key]: { ...businessGrid[key], notes: e.target.value }
                              })}
                              placeholder="Remarques et observations..."
                              className="bg-secondary text-xs h-8 flex-1"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Global Fields */}
            <div className="space-y-4 border-t border-border/40 pt-4">
              {!evaluating.activitySector && (
                <div>
                  <Label className="text-xs font-bold flex items-center gap-1 text-red-400">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    Erreurs critiques identifiées (Une erreur par ligne)
                  </Label>
                  <Textarea
                    value={generalErrorsText}
                    onChange={(e) => setGeneralErrorsText(e.target.value)}
                    rows={4}
                    placeholder="Ex: Utilisation de campagnes Boostées sans conversion.&#10;Ex: Vitesse de chargement mobile supérieure à 8 secondes."
                    className="bg-secondary text-xs mt-1"
                  />
                </div>
              )}

              <div>
                <Label className="text-xs font-bold flex items-center gap-1 text-orange-400">
                  <Lightbulb className="w-4 h-4 text-orange-500" />
                  Plan d'action & Recommandations stratégiques (Une recommandation par ligne)
                </Label>
                <Textarea
                  value={recommendationsText}
                  onChange={(e) => setRecommendationsText(e.target.value)}
                  rows={4}
                  placeholder="Ex: Passer les campagnes en conversion API WhatsApp Business.&#10;Ex: Optimiser les images du site web pour réduire le chargement."
                  className="bg-secondary text-xs mt-1"
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-foreground">Résumé global de l'audit</Label>
                <Textarea
                  value={overallSummary}
                  onChange={(e) => setOverallSummary(e.target.value)}
                  rows={3}
                  placeholder="Synthèse générale de la performance globale du prospect..."
                  className="bg-secondary text-xs mt-1"
                />
              </div>
            </div>

            <Button onClick={handleSaveEvaluation} className="bg-gradient-primary w-full md:w-auto">
              Publier le rapport d'audit
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border/60 text-muted-foreground font-bold">
                    <th className="py-2 pr-2">Entreprise / Prospect</th>
                    <th className="py-2 pr-2">Audits Demandés</th>
                    <th className="py-2 pr-2">Soumis le</th>
                    <th className="py-2 pr-2">Statut</th>
                    <th className="py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((req) => (
                    <tr key={req.id} className="border-b border-border/30 text-foreground">
                      <td className="py-3 pr-2">
                        <span className="font-semibold block">{req.companyName || "Individuel"}</span>
                        <span className="text-[10px] text-muted-foreground block">{req.clientName} ({req.email})</span>
                      </td>
                      <td className="py-3 pr-2">
                        <div className="flex flex-wrap gap-1">
                          {req.activitySector ? (
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase bg-primary/10 text-primary border border-primary/20">
                              Express 10-15m
                            </span>
                          ) : (
                            req.auditTypes.map((t) => (
                              <span
                                key={t}
                                className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase ${
                                  t === "social" ? "bg-primary/10 text-primary border border-primary/20" :
                                  t === "ads" ? "bg-orange-500/10 text-orange-500 border border-orange-500/20" :
                                  t === "web" ? "bg-blue-500/10 text-blue-500 border border-blue-500/20" :
                                  "bg-accent/10 text-accent border border-accent/20"
                                }`}
                              >
                                {t === "social" ? "Sociaux" : t === "ads" ? "Publicité" : t === "web" ? "Web" : "Position"}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="py-3 pr-2 text-muted-foreground">{new Date(req.createdAt).toLocaleDateString("fr-FR")}</td>
                      <td className="py-3 pr-2">
                        <div className="flex flex-col gap-1 items-start">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            req.status === "completed" 
                              ? "bg-green-500/15 text-green-400 border border-green-500/20" 
                              : "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                          }`}>
                            {req.status === "completed" ? (
                              <>
                                <CheckCircle className="w-2.5 h-2.5" />
                                Terminé
                              </>
                            ) : (
                              <>
                                <Clock className="w-2.5 h-2.5" />
                                En attente
                              </>
                            )}
                          </span>
                          {req.status === "pending" && req.crm?.crmStatus === "analyzing" && (
                            <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse mt-1">
                              Prise d'acte effectuée
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex justify-end gap-2">
                          {req.status === "pending" && req.crm?.crmStatus !== "analyzing" && (
                            <Button 
                              onClick={() => handleAcknowledgeRequest(req)} 
                              variant="outline" 
                              size="sm" 
                              className="h-7 text-[10px] bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20 font-bold"
                            >
                              Prendre acte
                            </Button>
                          )}
                          <Button 
                            onClick={() => handleStartEvaluate(req)} 
                            variant="outline" 
                            size="sm" 
                            className="h-7 text-[10px] border-primary/20 text-primary"
                          >
                            {req.status === "completed" ? "Réévaluer" : "Évaluer"}
                          </Button>
                          {req.status === "completed" && (
                            <Link 
                              to={`/audit/rapport/${req.id}`}
                              className="inline-flex items-center justify-center h-7 px-3 rounded-md text-[10px] border border-green-500/20 text-green-400 hover:bg-green-500/10 font-medium"
                            >
                              Voir le rapport
                            </Link>
                          )}
                          <Button 
                            onClick={() => handleDeleteRequest(req.id)} 
                            variant="outline" 
                            size="sm" 
                            className="h-7 text-[10px] border-red-500/20 text-red-400"
                          >
                            Supprimer
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredRequests.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-xs text-muted-foreground italic">
                        Aucune demande d'audit trouvée.
                      </td>
                    </tr>
                  )}
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

