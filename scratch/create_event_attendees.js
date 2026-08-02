import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://supabasekong-w6omo63vt2wnlhsuajxbzdm0.193.29.187.66.sslip.io';
const SERVICE_ROLE_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc4NTM0NjgwMCwiZXhwIjo0OTQxMDIwNDAwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.TL_OxgOS5gT7aXnsQHrVWDWa6oiQtyu_Vc1WPm7CA8Y';

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function setupTables() {
  console.log("Checking and setting up event_attendees table in Supabase...");
  const sql = `
    CREATE TABLE IF NOT EXISTS public.event_attendees (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      event_id TEXT NOT NULL,
      user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(event_id, user_id)
    );
    ALTER TABLE public.event_attendees ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Allow read event_attendees" ON public.event_attendees FOR SELECT USING (true);
    CREATE POLICY "Allow insert event_attendees" ON public.event_attendees FOR INSERT WITH CHECK (true);
    CREATE POLICY "Allow upsert event_attendees" ON public.event_attendees FOR ALL USING (true);
  `;

  // Query SQL via rpc if available or check table insert
  const { error } = await supabaseAdmin.from('event_attendees').select('id').limit(1);
  if (error) {
    console.log("event_attendees table check returned error:", error.message);
  } else {
    console.log("✅ event_attendees table already exists and is queryable!");
  }
}

setupTables();
