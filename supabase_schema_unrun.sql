-- Liveness Check
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS liveness_video_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS liveness_verified BOOLEAN DEFAULT false;

-- AI Moderation Flags
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_nsfw BOOLEAN DEFAULT false;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT false;
