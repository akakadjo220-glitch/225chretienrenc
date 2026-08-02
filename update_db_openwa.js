import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://supabasekong-w6omo63vt2wnlhsuajxbzdm0.193.29.187.66.sslip.io';
const SERVICE_ROLE_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc4NTM0NjgwMCwiZXhwIjo0OTQxMDIwNDAwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.TL_OxgOS5gT7aXnsQHrVWDWa6oiQtyu_Vc1WPm7CA8Y';

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function updateDb() {
  const workingConfig = {
    apiUrl: 'https://193-29-187-66.sslip.io',
    apiKey: 'owa_k1_3c9a06ce512ba8e1d878921454986d388d24f88f334012c1434e1bb479583566',
    sessionName: '0ee5c162-cda6-4b59-a867-62c01be1240f',
    enabled: true,
    defaultChannel: 'WHATSAPP',
    otpMessageTemplate: 'Votre code de vérification 225 Chrétien est : {{code}}. Valable 10 minutes. Ne le partagez pas.'
  };

  console.log("🚀 Updating openwa_config in Supabase system_settings with exact user credentials...");

  const { error } = await supabaseAdmin
    .from('system_settings')
    .upsert({
      key: 'openwa_config',
      value: workingConfig,
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' });

  if (error) {
    console.error("❌ Error updating DB:", error);
  } else {
    console.log("🎉 CONFIGURATION EXACTE UTILISATEUR SAUVEGARDÉE EN BDD SUPABASE !");
  }
}

updateDb();
