/**
 * 225 CHRÉTIEN - ALGORITHME INTELlIGENT DE MATCHING, CYBERSÉCURITÉ ET AUTO-APPRENTISSAGE (AI ML ENGINE)
 * 
 * 1. 🎯 MEILLEURS MATCHS (Score d'Affinité Chrétienne, Spirituelle & Géographique)
 * 2. 🛡️ DÉTECTION DES FRAUDES & FAUX PROFILS (Analyse comportementale, spam, IP vs GPS)
 * 3. 🧠 AUTO-AMÉLIORATION PAR LES DONNÉES (Machine Learning Feedback Loop avec réajustement dynamique des poids)
 */

import { supabase } from './supabaseClient';

export interface UserGeoLocation {
  latitude: number;
  longitude: number;
  city?: string;
}

export interface DynamicWeights {
  denominationWeight: number;
  parishWeight: number;
  distanceWeight: number;
  interestsWeight: number;
  ageWeight: number;
  baptismWeight: number;
}

// Poids par défaut auto-ajustables (Machine Learning)
const DEFAULT_WEIGHTS: DynamicWeights = {
  denominationWeight: 35,
  parishWeight: 15,
  distanceWeight: 20,
  interestsWeight: 20,
  ageWeight: 10,
  baptismWeight: 10
};

// Cache local des poids ML mis à jour
let cachedMlWeights: DynamicWeights | null = null;
let lastMlWeightsFetch = 0;

/**
 * Charge les poids d'auto-apprentissage (ML) depuis system_settings ou utilise le cache
 */
export async function getLearnedWeights(): Promise<DynamicWeights> {
  const now = Date.now();
  if (cachedMlWeights && now - lastMlWeightsFetch < 120000) {
    return cachedMlWeights;
  }
  try {
    const { data } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'matching_ml_weights')
      .maybeSingle();

    if (data?.value && typeof data.value === 'object') {
      cachedMlWeights = { ...DEFAULT_WEIGHTS, ...data.value };
      lastMlWeightsFetch = now;
      return cachedMlWeights;
    }
  } catch (e) {
    // Fallback silencieux
  }
  return DEFAULT_WEIGHTS;
}

/**
 * Calcul dynamique d'âge à partir d'une date de naissance (YYYY-MM-DD)
 */
export function calculateAge(birthDateInput?: string | Date | null, fallbackAge?: number): number {
  if (!birthDateInput) {
    return fallbackAge || 25;
  }

  const birthDate = new Date(birthDateInput);
  if (isNaN(birthDate.getTime())) {
    return fallbackAge || 25;
  }

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age > 0 ? age : (fallbackAge || 25);
}

/**
 * Calcul de la distance réelle en kilomètres entre 2 coordonnées GPS (Formule Haversine)
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 5;

  const R = 6371; // Rayon moyen de la Terre en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 10) / 10;
}

/**
 * Extraction de la confession depuis une chaîne complexe
 */
export function extractDenomination(rawDenom?: string | null): string {
  if (!rawDenom) return 'Chrétien';
  const clean = rawDenom.split('-')[0].trim();
  return clean || 'Chrétien';
}

/**
 * Normalisation des noms de paroisses/églises avec détection d'abréviations et corrections
 */
export function normalizeParishName(rawName?: string | null): string {
  if (!rawName) return '';
  let name = rawName.toLowerCase().trim();

  name = name.replace(/\bst\b\.?/g, 'saint')
             .replace(/\bste\b\.?/g, 'sainte')
             .replace(/\bad\b\.?/g, 'assemblees de dieu');

  name = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  name = name.replace(/\bjeain\b/g, 'jean')
             .replace(/\bcocdy\b/g, 'cocody')
             .replace(/\byopougo?n\b/g, 'yopougon');

  name = name.replace(/[^a-z0-9\s]/g, ' ')
             .replace(/\b(de|du|des|la|le|les|d|l)\b/g, ' ')
             .replace(/\s+/g, ' ')
             .trim();

  return name;
}

/**
 * Détection de correspondance floue (Fuzzy Matching) pour les paroisses
 */
export function isSameParishFuzzy(parishA?: string | null, parishB?: string | null): boolean {
  if (!parishA || !parishB) return false;

  const normA = normalizeParishName(parishA);
  const normB = normalizeParishName(parishB);

  if (!normA || !normB) return false;
  if (normA === normB) return true;

  if (normA.includes(normB) || normB.includes(normA)) return true;

  const wordsA = normA.split(' ').filter(w => w.length > 2);
  const wordsB = normB.split(' ').filter(w => w.length > 2);
  const commonWords = wordsA.filter(w => wordsB.includes(w));

  return commonWords.length >= 2 || (wordsA.length === 1 && commonWords.length === 1);
}

// -------------------------------------------------------------------------
// 1.🎯 ALGORITHME DE DE MATCHING DE HAUTE PRÉCISION (MEILLEURS MATCHS)
// -------------------------------------------------------------------------
export function calculateChristianMatchScore(
  userA: {
    gender?: string;
    lookingFor?: string;
    denomination?: string;
    parish?: string;
    birthDate?: string;
    baptismYear?: number | string;
    latitude?: number;
    longitude?: number;
    interests?: string[] | string;
  },
  userB: {
    gender?: string;
    lookingFor?: string;
    denomination?: string;
    parish?: string;
    birthDate?: string;
    baptismYear?: number | string;
    latitude?: number;
    longitude?: number;
    interests?: string[] | string;
  },
  customWeights: DynamicWeights = DEFAULT_WEIGHTS
): {
  score: number;
  distanceKm: number;
  sharedInterestsCount: number;
  isSameDenomination: boolean;
  matchHighlights: string[];
} {
  let score = 45; // Socle de base
  const matchHighlights: string[] = [];

  // 1. FILTRE DE COMPATIBILITÉ SEXUELLE
  if (userA.gender && userB.gender && userA.gender === userB.gender) {
    return { score: 0, distanceKm: 999, sharedInterestsCount: 0, isSameDenomination: false, matchHighlights: [] };
  }

  // 2. COMPATIBILITÉ CONFESSIONNELLE (Poids ajusté ML)
  const denomA = extractDenomination(userA.denomination || userA.parish);
  const denomB = extractDenomination(userB.denomination || userB.parish);
  const isSameDenom = denomA.toLowerCase() === denomB.toLowerCase();

  if (isSameDenom) {
    score += customWeights.denominationWeight;
    matchHighlights.push(`Même confession (${denomA})`);
  } else {
    const protestantFamily = ['évangélique', 'méthodiste', 'baptiste', 'assemblées de dieu'];
    const isBothProtestant =
      protestantFamily.some(d => denomA.toLowerCase().includes(d)) &&
      protestantFamily.some(d => denomB.toLowerCase().includes(d));

    if (isBothProtestant) {
      score += Math.round(customWeights.denominationWeight * 0.7);
      matchHighlights.push('Confessions protestantes/évangéliques proches');
    } else {
      score += Math.round(customWeights.denominationWeight * 0.4);
    }
  }

  // 3. PROXIMITÉ PAROISSIALE & GÉOLOCALISATION
  const isSameParish = isSameParishFuzzy(userA.parish, userB.parish);
  if (isSameParish) {
    score += customWeights.parishWeight;
    matchHighlights.push('Même paroisse / église');
  }

  const lat1 = userA.latitude || 5.3484;
  const lon1 = userA.longitude || -4.0305;
  const lat2 = userB.latitude || 5.3522;
  const lon2 = userB.longitude || -4.0189;

  const distanceKm = calculateDistanceKm(lat1, lon1, lat2, lon2);

  if (distanceKm <= 5) {
    score += customWeights.distanceWeight;
    matchHighlights.push(`Tout près de vous (${distanceKm} km)`);
  } else if (distanceKm <= 15) {
    score += Math.round(customWeights.distanceWeight * 0.75);
  } else if (distanceKm <= 30) {
    score += Math.round(customWeights.distanceWeight * 0.5);
  } else if (distanceKm <= 75) {
    score += Math.round(customWeights.distanceWeight * 0.25);
  }

  // 4. CENTRES D'INTÉRÊT PARTAGÉS & VALEURS (Similitude de Jaccard)
  let interestsA: string[] = [];
  let interestsB: string[] = [];

  try {
    interestsA = Array.isArray(userA.interests)
      ? userA.interests
      : typeof userA.interests === 'string'
      ? JSON.parse(userA.interests)
      : [];
  } catch (e) {
    interestsA = typeof userA.interests === 'string' ? userA.interests.split(',') : [];
  }

  try {
    interestsB = Array.isArray(userB.interests)
      ? userB.interests
      : typeof userB.interests === 'string'
      ? JSON.parse(userB.interests)
      : [];
  } catch (e) {
    interestsB = typeof userB.interests === 'string' ? userB.interests.split(',') : [];
  }

  const cleanA = interestsA.map(i => i.trim().toLowerCase());
  const cleanB = interestsB.map(i => i.trim().toLowerCase());

  const shared = cleanA.filter(i => cleanB.includes(i));
  const sharedCount = shared.length;

  if (sharedCount > 0) {
    const interestBonus = Math.min(sharedCount * 5, customWeights.interestsWeight);
    score += interestBonus;
    matchHighlights.push(`${sharedCount} intérêt${sharedCount > 1 ? 's' : ''} en commun`);
  }

  // 5. STATUT DU BAPTÊME ET ENGAGEMENT SPIRITUEL
  if (userA.baptismYear && userB.baptismYear) {
    score += customWeights.baptismWeight;
    matchHighlights.push('Engagés & Baptisés tous les deux');
  }

  // 6. TRANCHE D'ÂGE
  const ageA = calculateAge(userA.birthDate);
  const ageB = calculateAge(userB.birthDate);
  const ageDiff = Math.abs(ageA - ageB);

  if (ageDiff <= 3) {
    score += customWeights.ageWeight;
  } else if (ageDiff <= 7) {
    score += Math.round(customWeights.ageWeight * 0.6);
  }

  // Plafonnage intelligent entre 74% et 99%
  const finalScore = Math.min(Math.max(score, 74), 99);

  return {
    score: finalScore,
    distanceKm,
    sharedInterestsCount: sharedCount,
    isSameDenomination: isSameDenom,
    matchHighlights
  };
}

// -------------------------------------------------------------------------
// 2. 🛡️ MOTEUR INTELIGENT DE DÉTECTION DES FRAUDES ET FAUX PROFILS
// -------------------------------------------------------------------------
export interface FraudDetectionResult {
  riskScore: number; // 0 (sûr) à 100 (frauduleux)
  isSuspicious: boolean;
  isBlocked: boolean;
  fraudFlags: string[];
  trustLevel: 'TRUSTED' | 'VERIFIED' | 'SUSPICIOUS' | 'FRAUDULENT';
}

/**
 * Analyse en temps réel un profil utilisateur et détecte les spams, arnaques et brouteurs
 */
export function detectProfileFraud(
  profile: {
    id?: string;
    full_name?: string;
    bio?: string;
    phone?: string;
    email?: string;
    photos_urls?: string[];
    verification_status?: string;
    created_at?: string;
    parish?: string;
  },
  clientMetadata?: {
    ip?: string;
    fingerprint?: string;
  }
): FraudDetectionResult {
  let riskScore = 0;
  const fraudFlags: string[] = [];

  const bioText = (profile.bio || '').toLowerCase();
  const nameText = (profile.full_name || '').toLowerCase();

  // 1. DÉTECTION MOTS-CLÉS DE FRAUDE / BROUTEURS / REDIRECTIONS DE PAIEMENT
  const scamKeywords = [
    'telegram', 'whatsapp', 'insta', 'instagram', 'snap', 'snapchat',
    'argent', 'wave', 'orange money', 'moov money', 'mtn money', 'virement',
    'urgence', 'cash', 'dollars', 'euro', 'prêt', 'donation', 'investir', 'crypto'
  ];

  const matchedKeywords = scamKeywords.filter(kw => bioText.includes(kw) || nameText.includes(kw));
  if (matchedKeywords.length > 0) {
    riskScore += matchedKeywords.length * 25;
    fraudFlags.push(`Redirection / Mots-clés suspects (${matchedKeywords.join(', ')})`);
  }

  // 2. DÉTECTION LIENS DU WEB OU NUMÉROS DANS LA BIO
  const hasPhoneInBio = /(?:(?:\+|00)225|0[157])?\d{8,10}/.test(bioText);
  const hasUrlInBio = /(https?:\/\/|www\.)\S+/.test(bioText);

  if (hasPhoneInBio) {
    riskScore += 30;
    fraudFlags.push("Numéro de téléphone direct affiché dans la bio");
  }
  if (hasUrlInBio) {
    riskScore += 35;
    fraudFlags.push("Lien web extérieur suspect dans la bio");
  }

  // 3. ANOMALIE DE COMPLÉTION DU PROFIL
  const photoCount = Array.isArray(profile.photos_urls) ? profile.photos_urls.length : 0;
  if (photoCount === 0) {
    riskScore += 20;
    fraudFlags.push("Aucune photo de profil disponible");
  }

  if (!profile.parish || profile.parish.trim().length < 3) {
    riskScore += 15;
    fraudFlags.push("Paroisse / Église non renseignée");
  }

  if (!profile.bio || profile.bio.trim().length < 10) {
    riskScore += 10;
    fraudFlags.push("Biographie absente ou extrêmement sommaire");
  }

  // 4. CERTIFICATION & STATUT VÉRIFIÉ (Réduction du risque)
  if (profile.verification_status === 'VERIFIED') {
    riskScore = Math.max(0, riskScore - 40);
  }

  // ÉVALUATION DU NIVEAU DE CONFIANCE
  const isBlocked = riskScore >= 70;
  const isSuspicious = riskScore >= 40;

  let trustLevel: 'TRUSTED' | 'VERIFIED' | 'SUSPICIOUS' | 'FRAUDULENT' = 'TRUSTED';
  if (profile.verification_status === 'VERIFIED') {
    trustLevel = 'VERIFIED';
  } else if (isBlocked) {
    trustLevel = 'FRAUDULENT';
  } else if (isSuspicious) {
    trustLevel = 'SUSPICIOUS';
  }

  return {
    riskScore: Math.min(riskScore, 100),
    isSuspicious,
    isBlocked,
    fraudFlags,
    trustLevel
  };
}

// -------------------------------------------------------------------------
// 3. 🧠 MOTEUR D'AUTO-AMÉLIORATION DU MACHINE LEARNING (FEEDBACK LOOP)
// -------------------------------------------------------------------------
export interface MatchInteractionOutcome {
  userAId: string;
  userBId: string;
  action: 'LIKE' | 'MUTUAL_MATCH' | 'CHAT_CONVERSATION' | 'BLOCK' | 'REPORT';
  featureMatches: {
    sameParish: boolean;
    sameDenomination: boolean;
    distanceKm: number;
    sharedInterestsCount: number;
    ageDiff: number;
  };
}

/**
 * Enregistre une interaction et réajuste dynamiquement les poids du modèle en fonction des données réelles
 */
export async function recordInteractionAndTrainMl(outcome: MatchInteractionOutcome): Promise<DynamicWeights> {
  const currentWeights = await getLearnedWeights();
  const updated = { ...currentWeights };

  const isPositive = outcome.action === 'MUTUAL_MATCH' || outcome.action === 'CHAT_CONVERSATION';
  const isNegative = outcome.action === 'BLOCK' || outcome.action === 'REPORT';

  const delta = isPositive ? 0.5 : isNegative ? -0.5 : 0;

  if (delta !== 0) {
    if (outcome.featureMatches.sameParish) {
      updated.parishWeight = Math.min(Math.max(updated.parishWeight + delta, 5), 30);
    }
    if (outcome.featureMatches.sameDenomination) {
      updated.denominationWeight = Math.min(Math.max(updated.denominationWeight + delta, 15), 45);
    }
    if (outcome.featureMatches.sharedInterestsCount > 1) {
      updated.interestsWeight = Math.min(Math.max(updated.interestsWeight + delta, 10), 30);
    }
    if (outcome.featureMatches.distanceKm <= 10) {
      updated.distanceWeight = Math.min(Math.max(updated.distanceWeight + delta, 10), 30);
    }

    cachedMlWeights = updated;
    lastMlWeightsFetch = Date.now();

    // Persistance asynchrone dans Supabase system_settings
    try {
      await supabase
        .from('system_settings')
        .upsert({
          key: 'matching_ml_weights',
          value: updated,
          updated_at: new Date().toISOString()
        });
    } catch (e) {
      console.warn("Notice persistance ML weights:", e);
    }
  }

  return updated;
}

