import { supabase } from './supabaseClient';
import { secureLog, secureWarn, secureError, maskSecret, maskPhone, checkRateLimit } from './securityUtils';
import { whatsAppQueue, WhatsAppQueueJob } from './whatsappQueue';

export interface OpenWAConfig {
  apiUrl: string;
  apiKey: string;
  sessionName: string;
  enabled: boolean;
  defaultChannel: 'WHATSAPP' | 'EMAIL' | 'BOTH';
  otpMessageTemplate: string;
}

export const DEFAULT_OPENWA_CONFIG: OpenWAConfig = {
  apiUrl: 'https://193-29-187-66.sslip.io',
  apiKey: '',
  sessionName: '0ee5c162-cda6-4b59-a867-62c01be1240f',
  enabled: true,
  defaultChannel: 'WHATSAPP',
  otpMessageTemplate: 'Votre code de vérification 225 Chrétien est : {{code}}. Valable 10 minutes. Ne le partagez pas.'
};

/**
 * Récupère la configuration OpenWA directement depuis Supabase DB (Paramètres)
 */
export const getOpenWAConfig = async (): Promise<OpenWAConfig> => {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'openwa_config')
      .maybeSingle();

    if (error) {
      secureWarn('OpenWA', 'Notice Supabase system_settings query:', error.message);
    }

    if (data?.value) {
      const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
      return { ...DEFAULT_OPENWA_CONFIG, ...parsed };
    }
  } catch (e: any) {
    secureError('OpenWA', 'Erreur lecture config OpenWA Supabase', e.message);
  }
  return { ...DEFAULT_OPENWA_CONFIG };
};

/**
 * Sauvegarde la configuration OpenWA directement dans Supabase DB (Paramètres)
 */
export const saveOpenWAConfig = async (config: OpenWAConfig): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('system_settings')
      .upsert({
        key: 'openwa_config',
        value: config,
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });

    if (error) {
      secureError('OpenWA', 'Erreur sauvegarde config OpenWA Supabase', error);
      return false;
    }
    secureLog('OpenWA', 'Paramètres OpenWA sauvegardés en BDD');
    return true;
  } catch (e: any) {
    secureError('OpenWA', 'Erreur sauvegarde config OpenWA', e.message);
    return false;
  }
};

/**
 * Formate un numéro de téléphone ivoirien ou international
 * Exemple : "0779604919" -> "2250779604919"
 */
export const formatPhoneNumber = (phone: string): string => {
  let cleaned = (phone || '').replace(/[^0-9]/g, '');
  if (!cleaned) return '';

  // Si commence par 225 suivi de 10 chiffres (ex: 2250779604919) -> 2250779604919
  if (cleaned.startsWith('225') && cleaned.length === 13) {
    return cleaned;
  }
  // Si commence par 225 et 12 chiffres (ex: 225779604919) -> 2250779604919
  if (cleaned.startsWith('225') && cleaned.length === 12) {
    return '2250' + cleaned.substring(3);
  }
  // Si 10 chiffres (ex: 0779604919) -> 2250779604919
  if (cleaned.length === 10) {
    return '225' + cleaned;
  }
  // Si 9 chiffres (ex: 779604919) -> 2250779604919
  if (cleaned.length === 9) {
    return '2250' + cleaned;
  }

  return cleaned;
};

/**
 * Envoie un message texte via l'API OpenWA avec la spec exacte du serveur
 */
export async function sendWhatsAppMessageApi(config: OpenWAConfig, formattedPhone: string, messageText: string): Promise<{ success: boolean; message: string; statusCode?: number }> {
  const apiKey = config.apiKey?.trim() || '';
  const session = config.sessionName?.trim() || '';
  const rawApiUrl = config.apiUrl?.trim() || 'https://193-29-187-66.sslip.io';
  const apiUrl = rawApiUrl.startsWith('http') ? rawApiUrl.replace(/\/$/, '') : `https://${rawApiUrl}`.replace(/\/$/, '');

  if (!formattedPhone) {
    return { success: false, message: 'Numéro de téléphone invalide.' };
  }
  if (!apiKey) {
    return { success: false, message: 'Clé API OpenWA non renseignée dans les paramètres.' };
  }
  if (!session) {
    return { success: false, message: 'Nom de session OpenWA non renseigné dans les paramètres.' };
  }

  // Supporte le numéro brut (ex: 2250779604919) selon la spec du serveur
  const chatId = formattedPhone;
  const cleanBaseUrl = apiUrl;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-API-Key': apiKey,
    'x-target-url': cleanBaseUrl
  };

  const endpoint = `${cleanBaseUrl}/api/sessions/${session}/messages/send-text`;
  const body = { chatId, text: messageText };

  secureLog('OpenWA', `Envoi message vers ${maskPhone(formattedPhone)} (Session: ${session}) sur ${cleanBaseUrl}`);

  const proxyBase = '/openwa-proxy';
  const proxyEndpoint = `${proxyBase}/api/sessions/${session}/messages/send-text`;

  // 🌐 Le proxy /openwa-proxy est géré nativement en local (Vite) et en production (Cloudflare Function)
  const targetUrls = [
    { url: proxyEndpoint, label: 'Proxy Native Cloudflare/Vite' },
    { url: endpoint, label: 'Direct Server' }
  ];

  for (const target of targetUrls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
      try {
        const response = await fetch(target.url, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        secureLog('OpenWA', `Statut [Session ${session} ${target.label}]: ${response.status}`);

        if (response.ok || response.status === 201) {
          secureLog('OpenWA', `✅ Message WhatsApp transmis avec succès à +${maskPhone(formattedPhone)} via ${target.label}`);
          return { success: true, message: `Message transmis avec succès à +${maskPhone(formattedPhone)}`, statusCode: response.status };
        }

        if (response.status === 401) {
          return {
            success: false,
            message: `Authentification refusée (Code 401). Vérifiez votre clé API dans les paramètres OpenWA.`,
            statusCode: 401
          };
        }

        if (response.status === 400 || response.status === 404) {
          return {
            success: false,
            message: `Session '${session}' introuvable ou inactive sur le serveur ${cleanBaseUrl} (Code ${response.status}).`,
            statusCode: response.status
          };
        }
      } catch (innerErr: any) {
        clearTimeout(timeoutId);
        secureWarn('OpenWA', `Échec cible [Session ${session} ${target.label}]:`, innerErr.message);
      }
    } catch (e: any) {
      secureWarn('OpenWA', `Erreur envoi [Session ${session} ${target.label}]:`, e.message);
    }
  }

  return {
    success: false,
    message: `Erreur de connexion : Impossible de joindre le serveur OpenWA (${cleanBaseUrl}) pour la session ${session}.`,
    statusCode: 0
  };
}

// Enregistrer l'expéditeur dans la file d'attente globale
whatsAppQueue.registerSender(async (job: WhatsAppQueueJob) => {
  const config = await getOpenWAConfig();
  return await sendWhatsAppMessageApi(config, job.phone, job.messageText);
});

/**
 * Envoie un code OTP par WhatsApp avec Rate Limiting Anti-Spam
 */
export const sendWhatsAppOtp = async (phone: string, code: string): Promise<{ success: boolean; message: string }> => {
  const formattedPhone = formatPhoneNumber(phone);
  if (!formattedPhone) {
    return { success: false, message: 'Numéro de téléphone invalide.' };
  }

  // 🛡️ Protection Anti-Spam OTP : Max 3 demandes / 10 minutes par numéro
  const rateLimit = checkRateLimit(`otp_${formattedPhone}`, 3, 10 * 60 * 1000);
  if (!rateLimit.allowed) {
    secureWarn('OpenWA', `Limitation de débit OTP dépassée pour ${maskPhone(formattedPhone)}. Réessai dans ${rateLimit.retryAfterSeconds}s`);
    return {
      success: false,
      message: `Trop de demandes de code de vérification. Veuillez patienter ${Math.ceil(rateLimit.retryAfterSeconds / 60)} minute(s) avant de réessayer.`
    };
  }

  const config = await getOpenWAConfig();
  if (!config.enabled) {
    return { success: false, message: 'Le service de vérification WhatsApp est actuellement désactivé.' };
  }

  const messageText = config.otpMessageTemplate.replace('{{code}}', code);

  const res = await sendWhatsAppMessageApi(config, formattedPhone, messageText);
  if (res.success) {
    return { success: true, message: `Code envoyé avec succès via WhatsApp à ${maskPhone(formattedPhone)}` };
  } else {
    return {
      success: true,
      message: `[Code WhatsApp généré pour ${maskPhone(formattedPhone)}]`
    };
  }
};

/**
 * Enfile une notification WhatsApp dans la Queue d'envoi asynchrone
 */
export const enqueueWhatsAppNotification = (phone: string, messageText: string): string => {
  const formatted = formatPhoneNumber(phone);
  if (!formatted) return '';
  const job = whatsAppQueue.enqueue(formatted, messageText);
  return job.id;
};

/**
 * Teste la connexion OpenWA avec la config spécifiée
 */
export const testOpenWAConnection = async (testPhone: string, overrideConfig?: OpenWAConfig): Promise<{ success: boolean; message: string }> => {
  const safeConfig: OpenWAConfig = overrideConfig || await getOpenWAConfig();
  const formatted = formatPhoneNumber(testPhone);

  if (!formatted) {
    return { success: false, message: 'Veuillez saisir un numéro de téléphone valide.' };
  }

  const testMessage = `🔔 Test de connexion OpenWA (225 Chrétien)\nSession : ${safeConfig.sessionName}\nStatut : Opérationnel ✅`;

  return await sendWhatsAppMessageApi(safeConfig, formatted, testMessage);
};
