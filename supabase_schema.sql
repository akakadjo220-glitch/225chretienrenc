-- Active l'extension UUID pour la génération des IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Table Profiles (liée à auth.users de Supabase)
CREATE TABLE profiles (
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger pour mettre à jour la date 'updated_at' des profils
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Fonction pour insérer automatiquement un profil à l'inscription (lorsqu'un user auth est créé)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', 'USER');
  RETURN new;
END;
$$ LANGUAGE plpgsql security definer;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 2. Table Parishes (Paroisses)
CREATE TABLE parishes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    city TEXT,
    member_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Table Forum Posts
CREATE TABLE forum_posts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    author_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
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
CREATE TABLE forum_comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    post_id UUID REFERENCES forum_posts(id) ON DELETE CASCADE,
    author_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES forum_comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Table Forum Likes
CREATE TABLE forum_likes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    post_id UUID REFERENCES forum_posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(post_id, user_id)
);

-- 6. Table Forum Comment Likes
CREATE TABLE forum_comment_likes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    comment_id UUID REFERENCES forum_comments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(comment_id, user_id)
);

-- 7. Table Events
CREATE TABLE events (
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
CREATE TABLE event_participants (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

-- 9. Table Priest Contacts
CREATE TABLE priest_contacts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    parish TEXT,
    phone TEXT,
    availability TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Table Payments
CREATE TABLE payments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    reference TEXT NOT NULL,
    status TEXT NOT NULL,
    gateway TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. Table Messages
CREATE TABLE messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT,
    type TEXT DEFAULT 'TEXT',
    attachment_url TEXT,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. Table Matches
CREATE TABLE matches (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user1_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    user2_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'PENDING',
    ai_score INTEGER,
    ai_icebreakers TEXT[],
    ai_analysis TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user1_id, user2_id)
);

-- 13. Table Notifications
CREATE TABLE notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================================
-- 14. POLITIQUES RLS (Row Level Security)
-- ==============================================================================
-- Note: Pour le développement actif, on donne tous les accès. 
-- Lors du passage en production, vous devrez resserrer ces règles.

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE parishes ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE priest_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Activer tout pour profiles" ON profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Activer tout pour forum_posts" ON forum_posts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Activer tout pour forum_comments" ON forum_comments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Activer tout pour forum_likes" ON forum_likes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Activer tout pour forum_comment_likes" ON forum_comment_likes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Activer tout pour messages" ON messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Activer tout pour parishes" ON parishes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Activer tout pour events" ON events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Activer tout pour payments" ON payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Activer tout pour matches" ON matches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Activer tout pour priest_contacts" ON priest_contacts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Activer tout pour notifications" ON notifications FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- 15. BUCKETS STORAGE
-- ==============================================================================
-- Création des Buckets (Note: Si vous le lancez via SQL editor, il se peut que 
-- vous ayez besoin de les créer à la main via l'interface UI Supabase > Storage)

INSERT INTO storage.buckets (id, name, public) VALUES ('Public', 'Public', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('Private', 'Private', false) ON CONFLICT DO NOTHING;

-- Politiques de stockage
CREATE POLICY "Accès public aux fichiers Public" ON storage.objects FOR ALL USING (bucket_id = 'Public') WITH CHECK (bucket_id = 'Public');
CREATE POLICY "Accès aux fichiers Private" ON storage.objects FOR ALL USING (bucket_id = 'Private') WITH CHECK (bucket_id = 'Private');

-- ==============================================================================
-- 16. Table Likes (Match System)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS likes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    from_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    to_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT, -- e.g., 'like', 'pass'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(from_user_id, to_user_id)
);

ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Activer tout pour likes" ON likes FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- 17. Table Reports
-- ==============================================================================
CREATE TABLE IF NOT EXISTS reports (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    reporter_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    reported_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    content_snippet TEXT,
    status TEXT DEFAULT 'OPEN',
    type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Activer tout pour reports" ON reports FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- 18. Table Settings
-- ==============================================================================
CREATE TABLE IF NOT EXISTS settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    paystack_public_key TEXT,
    paystack_secret_key TEXT,
    currency TEXT DEFAULT 'XOF',
    amount NUMERIC DEFAULT 1500,
    openrouter_api_key TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Activer tout pour settings" ON settings FOR ALL USING (true) WITH CHECK (true);


