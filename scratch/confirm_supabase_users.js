import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://supabasekong-w6omo63vt2wnlhsuajxbzdm0.193.29.187.66.sslip.io';
const SERVICE_ROLE_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc4NTM0NjgwMCwiZXhwIjo0OTQxMDIwNDAwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.TL_OxgOS5gT7aXnsQHrVWDWa6oiQtyu_Vc1WPm7CA8Y';

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function confirmUsers() {
  console.log("Fetching all auth users...");
  const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error) return console.error("Error listing users:", error);

  console.log(`Found ${users.length} users in Supabase Auth.`);
  for (const user of users) {
    console.log(`User: ${user.email} | Confirmed: ${user.email_confirmed_at}`);
    if (!user.email_confirmed_at) {
      console.log(`Confirming email for ${user.email} (${user.id})...`);
      const { data, error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
        email_confirm: true
      });
      if (updateErr) console.error(`Error confirming ${user.email}:`, updateErr.message);
      else console.log(`✅ Successfully confirmed ${user.email}!`);
    }
  }
}

confirmUsers();
