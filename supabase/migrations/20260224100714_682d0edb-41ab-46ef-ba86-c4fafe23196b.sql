
-- Admin settings table for password
CREATE TABLE public.admin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_password TEXT NOT NULL DEFAULT 'glndigital2024'
);
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read admin settings" ON public.admin_settings FOR SELECT USING (true);

INSERT INTO public.admin_settings (admin_password) VALUES ('glndigital2024');

-- Testimonials table
CREATE TABLE public.testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name TEXT NOT NULL,
  client_role TEXT,
  client_company TEXT,
  content TEXT NOT NULL,
  rating INTEGER DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  avatar_url TEXT,
  is_visible BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read visible testimonials" ON public.testimonials FOR SELECT USING (is_visible = true);
CREATE POLICY "Anyone can insert testimonials" ON public.testimonials FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update testimonials" ON public.testimonials FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete testimonials" ON public.testimonials FOR DELETE USING (true);

-- Portfolio media table
CREATE TABLE public.portfolio_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video', 'embed')),
  media_url TEXT,
  embed_url TEXT,
  platform TEXT CHECK (platform IN ('meta', 'tiktok', 'google_ads', 'youtube', 'facebook', 'other')),
  thumbnail_url TEXT,
  is_visible BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.portfolio_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read visible media" ON public.portfolio_media FOR SELECT USING (is_visible = true);
CREATE POLICY "Anyone can insert media" ON public.portfolio_media FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update media" ON public.portfolio_media FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete media" ON public.portfolio_media FOR DELETE USING (true);

-- Storage bucket for media files
INSERT INTO storage.buckets (id, name, public) VALUES ('portfolio', 'portfolio', true);

CREATE POLICY "Public can view portfolio files" ON storage.objects FOR SELECT USING (bucket_id = 'portfolio');
CREATE POLICY "Anyone can upload portfolio files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'portfolio');
CREATE POLICY "Anyone can update portfolio files" ON storage.objects FOR UPDATE USING (bucket_id = 'portfolio');
CREATE POLICY "Anyone can delete portfolio files" ON storage.objects FOR DELETE USING (bucket_id = 'portfolio');
