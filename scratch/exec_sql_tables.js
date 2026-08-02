const SUPABASE_URL = 'https://supabasekong-w6omo63vt2wnlhsuajxbzdm0.193.29.187.66.sslip.io';
const SERVICE_ROLE_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc4NTM0NjgwMCwiZXhwIjo0OTQxMDIwNDAwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.TL_OxgOS5gT7aXnsQHrVWDWa6oiQtyu_Vc1WPm7CA8Y';

async function executeSql() {
  console.log("Executing SQL to create event_attendees table in Supabase...");
  const sqlCommands = `
    CREATE TABLE IF NOT EXISTS public.event_attendees (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      event_id TEXT NOT NULL,
      user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(event_id, user_id)
    );
    ALTER TABLE public.event_attendees ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow all event_attendees" ON public.event_attendees;
    CREATE POLICY "Allow all event_attendees" ON public.event_attendees FOR ALL USING (true) WITH CHECK (true);
  `;

  // Endpoint SQL Supabase Kong / PgMeta
  const endpoints = [
    `${SUPABASE_URL}/pg/query`,
    `${SUPABASE_URL}/rest/v1/query`,
    `${SUPABASE_URL}/sql`
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(ep, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'apikey': SERVICE_ROLE_KEY
        },
        body: JSON.stringify({ query: sqlCommands })
      });
      console.log(`Endpoint ${ep} status:`, res.status);
      console.log(`Endpoint ${ep} body:`, await res.text());
    } catch (e) {
      console.log(`Endpoint ${ep} error:`, e.message);
    }
  }
}

executeSql();
