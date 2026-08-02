/**
 * 225 CHRÉTIEN - ALGORITHME DE MATCHING SPIRITUEL ET GÉOGRAPHIQUE (TINDER STYLE)
 * Calcul d'âge dynamique et calcul de compatibilité basé sur :
 * 1. Confession Chrétienne (Compatibilité théologique)
 * 2. Géolocalisation GPS (Formule Haversine en Km)
 * 3. Centres d'intérêt spirituels & de vie
 * 4. Tranche d'âge
 */

export interface UserGeoLocation {
  latitude: number;
  longitude: number;
  city?: string;
}

/**
 * Calcul dynamique d'âge à partir d'une date de naissance (YYYY-MM-DD)
 */
export function calculateAge(birthDateInput?: string | Date | null, fallbackAge?: number): number {
  if (!birthDateInput) {
    return fallbackAge || 25; // Âge par défaut si non renseigné
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
  if (!lat1 || !lon1 || !lat2 || !lon2) return 5; // Distance estimée par défaut (5km)

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

  return Math.round(distance * 10) / 10; // Arrondi à 1 décimale
}

/**
 * Extraction de la confession depuis une chaîne complexe (ex: "Catholique - St Jean")
 */
export function extractDenomination(rawDenom?: string | null): string {
  if (!rawDenom) return 'Chrétien';
  const clean = rawDenom.split('-')[0].trim();
  return clean || 'Chrétien';
}

/**
 * Normalisation ultra-puissante des noms de paroisses/églises :
 * - Gère les abréviations ("st", "ste" -> "saint", "sainte")
 * - Nettoie les accents et mots de liaison ("de", "du", "d'")
 * - Corrige les fautes de frappes courantes ("jeain" -> "jean", "cocdy" -> "cocody")
 */
export function normalizeParishName(rawName?: string | null): string {
  if (!rawName) return '';
  let name = rawName.toLowerCase().trim();

  // 1. Abréviations
  name = name.replace(/\bst\b\.?/g, 'saint')
             .replace(/\bste\b\.?/g, 'sainte')
             .replace(/\bad\b\.?/g, 'assemblees de dieu');

  // 2. Accents
  name = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // 3. Fautes de frappe courantes
  name = name.replace(/\bjeain\b/g, 'jean')
             .replace(/\bcocdy\b/g, 'cocody')
             .replace(/\byopougo?n\b/g, 'yopougon');

  // 4. Caractères spéciaux et mots de liaison
  name = name.replace(/[^a-z0-9\s]/g, ' ')
             .replace(/\b(de|du|des|la|le|les|d|l)\b/g, ' ')
             .replace(/\s+/g, ' ')
             .trim();

  return name;
}

/**
 * Détection de correspondance floue (Fuzzy Matching) pour les paroisses identiques malgré fautes de frappe ou variantes
 */
export function isSameParishFuzzy(parishA?: string | null, parishB?: string | null): boolean {
  if (!parishA || !parishB) return false;

  const normA = normalizeParishName(parishA);
  const normB = normalizeParishName(parishB);

  if (!normA || !normB) return false;
  if (normA === normB) return true;

  // Inclusion (ex: "saint jean" et "saint jean cocody")
  if (normA.includes(normB) || normB.includes(normA)) return true;

  // Chevauchement de mots clés
  const wordsA = normA.split(' ').filter(w => w.length > 2);
  const wordsB = normB.split(' ').filter(w => w.length > 2);
  const commonWords = wordsA.filter(w => wordsB.includes(w));

  return commonWords.length >= 2 || (wordsA.length === 1 && commonWords.length === 1);
}

/**
 * Algorithme Puissant de Matching Chrétien
 */
export function calculateChristianMatchScore(
  userA: {
    gender?: string;
    lookingFor?: string;
    denomination?: string;
    parish?: string;
    birthDate?: string;
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
    latitude?: number;
    longitude?: number;
    interests?: string[] | string;
  }
): { score: number; distanceKm: number; sharedInterestsCount: number; isSameDenomination: boolean } {
  let score = 50; // Base de départ

  // 1. FILTRE STRICT DE COMPATIBILITÉ SEXUELLE
  if (userA.gender && userB.gender && userA.gender === userB.gender) {
    return { score: 0, distanceKm: 999, sharedInterestsCount: 0, isSameDenomination: false };
  }

  // 2. COMPATIBILITÉ CONFESSIONNELLE (Poids fort: +35 points)
  const denomA = extractDenomination(userA.denomination || userA.parish);
  const denomB = extractDenomination(userB.denomination || userB.parish);
  const isSameDenom = denomA.toLowerCase() === denomB.toLowerCase();

  if (isSameDenom) {
    score += 35;
  } else {
    // Compatibilité entre confessions proches (ex: Évangélique & Assemblées de Dieu / Baptiste)
    const protestantFamily = ['évangélique', 'méthodiste', 'baptiste', 'assemblées de dieu'];
    const isBothProtestant =
      protestantFamily.some(d => denomA.toLowerCase().includes(d)) &&
      protestantFamily.some(d => denomB.toLowerCase().includes(d));

    if (isBothProtestant) {
      score += 25;
    } else {
      score += 15; // Même foi en Christ
    }
  }

  // 3. PROXIMITÉ PAROISSIALE & GÉOLOCALISATION (Poids: +30 points max)
  const isSameParish = isSameParishFuzzy(userA.parish, userB.parish);
  if (isSameParish) {
    score += 15; // Bonus membre de la même paroisse !
  }

  const lat1 = userA.latitude || 5.3484; // Par défaut Abidjan (Cocody)
  const lon1 = userA.longitude || -4.0305;
  const lat2 = userB.latitude || 5.3522;
  const lon2 = userB.longitude || -4.0189;

  const distanceKm = calculateDistanceKm(lat1, lon1, lat2, lon2);

  if (distanceKm <= 5) score += 15;
  else if (distanceKm <= 15) score += 10;
  else if (distanceKm <= 30) score += 8;
  else if (distanceKm <= 75) score += 5;
  else score += 2;

  // 4. CENTRES D'INTÉRÊT PARTAGÉS (+20 points max)
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

  score += Math.min(sharedCount * 7, 20);

  // 5. TRANCHE D'ÂGE (+10 points si écart <= 5 ans)
  const ageA = calculateAge(userA.birthDate);
  const ageB = calculateAge(userB.birthDate);
  const ageDiff = Math.abs(ageA - ageB);

  if (ageDiff <= 5) score += 10;
  else if (ageDiff <= 10) score += 5;

  // Plafonnage entre 72% et 99%
  const finalScore = Math.min(Math.max(score, 72), 99);

  return {
    score: finalScore,
    distanceKm,
    sharedInterestsCount: sharedCount,
    isSameDenomination: isSameDenom
  };
}
