-- ==============================================================================
-- 225 CHRÉTIEN : SCRIPT MASTER DE CRÉATION DE LA BASE DE DONNÉES ENTIÈRE
-- À exécuter dans le SQL Editor de Supabase (ou pgAdmin / psql localement)
-- ==============================================================================

-- Active l'extension UUID pour la génération des IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Fonction pour mettre à jour la date 'updated_at' automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. Table Profiles (liée à auth.users de Supabase)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    name TEXT,
    email TEXT,
    role TEXT DEFAULT 'USER',
    gender TEXT,
    looking_for TEXT,
    parish TEXT,
    phone TEXT,
    baptism_year INTEGER,
    is_premium BOOLEAN DEFAULT FALSE,
    premium_expiration TIMESTAMP WITH TIME ZONE,
    avatar_url TEXT,
    photos_urls TEXT[],
    verification_status TEXT DEFAULT 'UNVERIFIED',
    interests TEXT,
    document_id_url TEXT,
    document_baptism_url TEXT,
    video_proof_url TEXT,
    status TEXT DEFAULT 'ACTIVE',
    credits INTEGER DEFAULT 5,
    boost_expires_at TIMESTAMP WITH TIME ZONE,
    is_invisible BOOLEAN DEFAULT FALSE,
    liveness_video_url TEXT,
    liveness_verified BOOLEAN DEFAULT FALSE,
    bio TEXT,
    location TEXT,
    birth_date DATE,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    last_active TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Migration progressive pour bases existantes
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Fonction pour insérer automatiquement un profil à l'inscription d'un utilisateur auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', 'USER')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql security definer;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
  END IF;
END $$;

-- 2. Table Parishes (Paroisses)
CREATE TABLE IF NOT EXISTS public.parishes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    city TEXT,
    member_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Table Forum Posts
CREATE TABLE IF NOT EXISTS public.forum_posts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    tags TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Table Forum Comments
CREATE TABLE IF NOT EXISTS public.forum_comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    post_id UUID REFERENCES public.forum_posts(id) ON DELETE CASCADE,
    author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.forum_comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Table Forum Likes
CREATE TABLE IF NOT EXISTS public.forum_likes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    post_id UUID REFERENCES public.forum_posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(post_id, user_id)
);

-- 6. Table Forum Comment Likes
CREATE TABLE IF NOT EXISTS public.forum_comment_likes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    comment_id UUID REFERENCES public.forum_comments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(comment_id, user_id)
);

-- 7. Table Events
CREATE TABLE IF NOT EXISTS public.events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    location TEXT,
    description TEXT,
    link TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Table Event Participants
CREATE TABLE IF NOT EXISTS public.event_participants (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

-- 9. Table Priest Contacts
CREATE TABLE IF NOT EXISTS public.priest_contacts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    parish TEXT,
    phone TEXT,
    availability TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Table Payments
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    reference TEXT NOT NULL,
    status TEXT NOT NULL,
    gateway TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. Table Messages
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT,
    type TEXT DEFAULT 'TEXT',
    attachment_url TEXT,
    read BOOLEAN DEFAULT FALSE,
    is_nsfw BOOLEAN DEFAULT FALSE,
    is_flagged BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. Table Matches
CREATE TABLE IF NOT EXISTS public.matches (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user1_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    user2_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'PENDING',
    ai_score INTEGER,
    ai_icebreakers TEXT[],
    ai_analysis TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user1_id, user2_id)
);

-- 13. Table Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 14. Table Likes (Match System)
CREATE TABLE IF NOT EXISTS public.likes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    from_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    to_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT,
    is_super_like BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(from_user_id, to_user_id)
);

-- 15. Table Reports
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    reporter_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    reported_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    content_snippet TEXT,
    status TEXT DEFAULT 'OPEN',
    type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 16. Table Settings
CREATE TABLE IF NOT EXISTS public.settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    paystack_public_key TEXT,
    paystack_secret_key TEXT,
    currency TEXT DEFAULT 'XOF',
    amount NUMERIC DEFAULT 1500,
    openrouter_api_key TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================================
-- 17. POLITIQUES RLS (Row Level Security)
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parishes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.priest_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Activer tout pour profiles" ON public.profiles;
    CREATE POLICY "Activer tout pour profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Activer tout pour forum_posts" ON public.forum_posts;
    CREATE POLICY "Activer tout pour forum_posts" ON public.forum_posts FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Activer tout pour forum_comments" ON public.forum_comments;
    CREATE POLICY "Activer tout pour forum_comments" ON public.forum_comments FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Activer tout pour forum_likes" ON public.forum_likes;
    CREATE POLICY "Activer tout pour forum_likes" ON public.forum_likes FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Activer tout pour forum_comment_likes" ON public.forum_comment_likes;
    CREATE POLICY "Activer tout pour forum_comment_likes" ON public.forum_comment_likes FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Activer tout pour messages" ON public.messages;
    CREATE POLICY "Activer tout pour messages" ON public.messages FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Activer tout pour parishes" ON public.parishes;
    CREATE POLICY "Activer tout pour parishes" ON public.parishes FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Activer tout pour events" ON public.events;
    CREATE POLICY "Activer tout pour events" ON public.events FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Activer tout pour payments" ON public.payments;
    CREATE POLICY "Activer tout pour payments" ON public.payments FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Activer tout pour matches" ON public.matches;
    CREATE POLICY "Activer tout pour matches" ON public.matches FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Activer tout pour priest_contacts" ON public.priest_contacts;
    CREATE POLICY "Activer tout pour priest_contacts" ON public.priest_contacts FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Activer tout pour notifications" ON public.notifications;
    CREATE POLICY "Activer tout pour notifications" ON public.notifications FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Activer tout pour likes" ON public.likes;
    CREATE POLICY "Activer tout pour likes" ON public.likes FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Activer tout pour reports" ON public.reports;
    CREATE POLICY "Activer tout pour reports" ON public.reports FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Activer tout pour settings" ON public.settings;
    CREATE POLICY "Activer tout pour settings" ON public.settings FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- ==============================================================================
-- 18. BUCKETS STORAGE
-- ==============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
    INSERT INTO storage.buckets (id, name, public) VALUES ('Public', 'Public', true) ON CONFLICT DO NOTHING;
    INSERT INTO storage.buckets (id, name, public) VALUES ('Private', 'Private', false) ON CONFLICT DO NOTHING;

    DROP POLICY IF EXISTS "Accès aux fichiers Private" ON storage.objects;
    CREATE POLICY "Accès aux fichiers Private" ON storage.objects FOR ALL USING (bucket_id = 'Private') WITH CHECK (bucket_id = 'Private');
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- ==============================================================================
-- 19. TABLE SYSTEM SETTINGS (Configuration OpenWA & Paramètres Système)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Activer tout pour system_settings" ON public.system_settings;
    CREATE POLICY "Activer tout pour system_settings" ON public.system_settings FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

