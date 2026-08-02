/**
 * Utilitaire de Cybersécurité & Masquage des Données Sensibles (225 Chrétien)
 * Fournit le masquage des clés APIs, l'anonymisation PII, le logging sécurisé,
 * la protection contre le Prompt Injection et la limitation de débit (Rate Limiting).
 */

// Mot-clés de champs sensibles à censurer automatiquement dans les objets
const SENSITIVE_FIELD_NAMES = new Set([
  'apikey',
  'api_key',
  'secret',
  'password',
  'token',
  'authorization',
  'paystack_secret_key',
  'openrouter_api_key',
  'service_role',
  'bearer'
]);

/**
 * Masque une clé API ou donnée confidentielle pour éviter toute fuite en clair
 * Exemple: "owa_k1_c7f0ddf2bac4594780986cd843f90ed0baae6562399eeeb076b151325e5bef02" 
 *       -> "owa_k1_c7f0****bef02"
 */
export const maskSecret = (secret: string | null | undefined): string => {
  if (!secret || typeof secret !== 'string') return '[NON_DÉFINI]';
  const str = secret.trim();
  if (str.length <= 8) return '****';

  // Si c'est une clé OpenWA
  if (str.startsWith('owa_k1_')) {
    return `${str.substring(0, 10)}****${str.substring(str.length - 5)}`;
  }

  // Si c'est une clé OpenRouter / OpenAI
  if (str.startsWith('sk-or-v1-') || str.startsWith('sk-')) {
    return `${str.substring(0, 11)}****${str.substring(str.length - 4)}`;
  }

  // Si c'est un jeton JWT (Supabase / Auth)
  if (str.startsWith('eyJ')) {
    return `${str.substring(0, 8)}****${str.substring(str.length - 6)}`;
  }

  // Clé Paystack
  if (str.startsWith('pk_') || str.startsWith('sk_')) {
    return `${str.substring(0, 7)}****${str.substring(str.length - 4)}`;
  }

  // Format générique
  return `${str.substring(0, 4)}****${str.substring(str.length - 4)}`;
};

/**
 * Anonymise un numéro de téléphone pour respecter le RGPD & la vie privée
 * Exemple: "0779604919" -> "+225 07****4919"
 */
export const maskPhone = (phone: string | null | undefined): string => {
  if (!phone) return '[NUMÉRO_MASQUÉ]';
  const cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.length < 6) return '****';
  return `+${cleaned.substring(0, 3)} ${cleaned.substring(3, 5)}****${cleaned.substring(cleaned.length - 4)}`;
};

/**
 * Anonymise un e-mail
 * Exemple: "akacharle2@gmail.com" -> "a***2@gmail.com"
 */
export const maskEmail = (email: string | null | undefined): string => {
  if (!email || !email.includes('@')) return '[EMAIL_MASQUÉ]';
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `*@${domain}`;
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
};

/**
 * Assainit récursivement un objet/tableau pour censurer toutes les clés sensibles avant de logger
 */
export const sanitizeObject = (data: any): any => {
  if (data === null || data === undefined) return data;
  
  if (typeof data === 'string') {
    // Si la chaîne contient un mot de passe ou une clé brute
    if (data.startsWith('owa_k1_') || data.startsWith('sk-or-v1-') || data.startsWith('eyJ')) {
      return maskSecret(data);
    }
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeObject(item));
  }

  if (typeof data === 'object') {
    const sanitized: Record<string, any> = {};
    for (const key of Object.keys(data)) {
      const lowerKey = key.toLowerCase();
      if (SENSITIVE_FIELD_NAMES.has(lowerKey) || Array.from(SENSITIVE_FIELD_NAMES).some(s => lowerKey.includes(s))) {
        sanitized[key] = typeof data[key] === 'string' ? maskSecret(data[key]) : '[SECRET_REDACTED]';
      } else {
        sanitized[key] = sanitizeObject(data[key]);
      }
    }
    return sanitized;
  }

  return data;
};

/**
 * Logger sécurisé qui empêche la fuite de secrets ou de clés dans les DevTools
 */
export const secureLog = (topic: string, message: string, data?: any): void => {
  const sanitizedData = data !== undefined ? sanitizeObject(data) : '';
  console.log(`[${topic}] ${message}`, sanitizedData);
};

export const secureWarn = (topic: string, message: string, data?: any): void => {
  const sanitizedData = data !== undefined ? sanitizeObject(data) : '';
  console.warn(`[${topic}] ⚠️ ${message}`, sanitizedData);
};

export const secureError = (topic: string, message: string, data?: any): void => {
  const sanitizedData = data !== undefined ? sanitizeObject(data) : '';
  console.error(`[${topic}] ❌ ${message}`, sanitizedData);
};

/**
 * Assainit un texte d'entrée utilisateur pour bloquer les injections XSS et les injections de prompt IA
 */
export const sanitizeInput = (input: string | null | undefined): string => {
  if (!input) return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Supprimer balises script
    .replace(/javascript:/gi, '') // Supprimer pseudo-protocole JS
    .replace(/on\w+\s*=/gi, '') // Supprimer attributs d'évènements (onload=, onerror=)
    .trim();
};

/**
 * Nettoie le texte envoyé aux modèles d'IA contre les attaques de Prompt Injection
 */
export const sanitizePrompt = (text: string | null | undefined): string => {
  if (!text) return '';
  let cleaned = sanitizeInput(text);
  // Neutraliser les commandes de détournement de consignes système
  cleaned = cleaned
    .replace(/system\s*:/gi, '[filtré]:')
    .replace(/ignore\s+all\s+previous\s+instructions/gi, '[instruction filtrée]')
    .replace(/you\s+are\s+now\s+a/gi, '[instruction filtrée]');
  return cleaned.substring(0, 500); // Limiter à 500 caractères max par champ
};

/**
 * Limitation de débit (Rate Limiting) en mémoire pour prévenir les attaques par déni de service et le spam OTP
 */
interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

export const checkRateLimit = (
  key: string,
  maxAttempts: number = 3,
  windowMs: number = 10 * 60 * 1000 // 10 minutes par défaut
): { allowed: boolean; remainingAttempts: number; retryAfterSeconds: number } => {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remainingAttempts: maxAttempts - 1, retryAfterSeconds: 0 };
  }

  if (record.count >= maxAttempts) {
    const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);
    return { allowed: false, remainingAttempts: 0, retryAfterSeconds };
  }

  record.count += 1;
  rateLimitStore.set(key, record);
  return { allowed: true, remainingAttempts: maxAttempts - record.count, retryAfterSeconds: 0 };
};
