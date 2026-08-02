import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://supabasekong-w6omo63vt2wnlhsuajxbzdm0.193.29.187.66.sslip.io';
const SERVICE_ROLE_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc4NTM0NjgwMCwiZXhwIjo0OTQxMDIwNDAwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.TL_OxgOS5gT7aXnsQHrVWDWa6oiQtyu_Vc1WPm7CA8Y';

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function checkDbSettings() {
  const { data, error } = await supabaseAdmin
    .from('system_settings')
    .select('*')
    .eq('key', 'openwa_config');

  console.log("Supabase openwa_config data:", JSON.stringify(data, null, 2));
  if (error) console.error("Error:", error);
}

checkDbSettings();
