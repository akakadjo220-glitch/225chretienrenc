/**
 * Service Géographique & GPS Haute Précision pour 225 Chrétien
 * Reverse geocoding automatique, catalogue complet des communes d'Abidjan,
 * villes de Côte d'Ivoire et Diaspora chrétienne.
 */

export interface GeoLocationItem {
  id: string;
  name: string;
  category: 'ABIDJAN' | 'INTERIEUR_CI' | 'DIASPORA';
  region: string;
  latitude: number;
  longitude: number;
  popular?: boolean;
}

export interface PreciseLocationResult {
  latitude: number;
  longitude: number;
  city: string;
  isGps: boolean;
  accuracyMeters?: number;
}

/**
 * Catalogue de référence pré-calibré avec coordonnées GPS précises
 */
export const REFERENCE_LOCATIONS: GeoLocationItem[] = [
  // --- ABIDJAN (COMMUNES & QUARTIERS) ---
  { id: 'abj-cocody', name: 'Abidjan, Cocody', category: 'ABIDJAN', region: 'Abidjan', latitude: 5.3484, longitude: -4.0305, popular: true },
  { id: 'abj-angre', name: 'Abidjan, Cocody (Angré)', category: 'ABIDJAN', region: 'Abidjan', latitude: 5.3980, longitude: -3.9850, popular: true },
  { id: 'abj-riviera', name: 'Abidjan, Cocody (Riviera / Palmeraie)', category: 'ABIDJAN', region: 'Abidjan', latitude: 5.3650, longitude: -3.9600, popular: true },
  { id: 'abj-2plateaux', name: 'Abidjan, Cocody (Deux Plateaux)', category: 'ABIDJAN', region: 'Abidjan', latitude: 5.3700, longitude: -4.0050, popular: true },
  { id: 'abj-yopougon', name: 'Abidjan, Yopougon', category: 'ABIDJAN', region: 'Abidjan', latitude: 5.3400, longitude: -4.0800, popular: true },
  { id: 'abj-yop-niangon', name: 'Abidjan, Yopougon (Niangon / Maroc)', category: 'ABIDJAN', region: 'Abidjan', latitude: 5.3550, longitude: -4.1050 },
  { id: 'abj-marcory', name: 'Abidjan, Marcory', category: 'ABIDJAN', region: 'Abidjan', latitude: 5.3050, longitude: -3.9850, popular: true },
  { id: 'abj-zone4', name: 'Abidjan, Marcory (Zone 4 / Biétry)', category: 'ABIDJAN', region: 'Abidjan', latitude: 5.2850, longitude: -3.9750 },
  { id: 'abj-plateau', name: 'Abidjan, Plateau', category: 'ABIDJAN', region: 'Abidjan', latitude: 5.3250, longitude: -4.0200, popular: true },
  { id: 'abj-koumassi', name: 'Abidjan, Koumassi', category: 'ABIDJAN', region: 'Abidjan', latitude: 5.2950, longitude: -3.9450, popular: true },
  { id: 'abj-treichville', name: 'Abidjan, Treichville', category: 'ABIDJAN', region: 'Abidjan', latitude: 5.3000, longitude: -4.0100 },
  { id: 'abj-portbouet', name: 'Abidjan, Port-Bouët', category: 'ABIDJAN', region: 'Abidjan', latitude: 5.2600, longitude: -3.9250 },
  { id: 'abj-abobo', name: 'Abidjan, Abobo', category: 'ABIDJAN', region: 'Abidjan', latitude: 5.4200, longitude: -4.0200 },
  { id: 'abj-adjame', name: 'Abidjan, Adjamé', category: 'ABIDJAN', region: 'Abidjan', latitude: 5.3550, longitude: -4.0250 },
  { id: 'abj-attecoube', name: 'Abidjan, Attécoubé', category: 'ABIDJAN', region: 'Abidjan', latitude: 5.3350, longitude: -4.0450 },
  { id: 'abj-bingerville', name: 'Bingerville', category: 'ABIDJAN', region: 'Grand Abidjan', latitude: 5.3550, longitude: -3.8900, popular: true },
  { id: 'abj-bassam', name: 'Grand-Bassam', category: 'ABIDJAN', region: 'Grand Abidjan', latitude: 5.2100, longitude: -3.7400, popular: true },
  { id: 'abj-songon', name: 'Songon', category: 'ABIDJAN', region: 'Grand Abidjan', latitude: 5.3150, longitude: -4.2500 },
  { id: 'abj-anyama', name: 'Anyama', category: 'ABIDJAN', region: 'Grand Abidjan', latitude: 5.4950, longitude: -4.0500 },

  // --- CÔTE D'IVOIRE (VILLES DE L'INTÉRIEUR) ---
  { id: 'ci-yamoussoukro', name: 'Yamoussoukro', category: 'INTERIEUR_CI', region: 'Bélier', latitude: 6.8276, longitude: -5.2893, popular: true },
  { id: 'ci-bouake', name: 'Bouaké', category: 'INTERIEUR_CI', region: 'Gbêkê', latitude: 7.6900, longitude: -5.0300, popular: true },
  { id: 'ci-sanpedro', name: 'San Pédro', category: 'INTERIEUR_CI', region: 'San-Pédro', latitude: 4.7500, longitude: -6.6400, popular: true },
  { id: 'ci-korhogo', name: 'Korhogo', category: 'INTERIEUR_CI', region: 'Poro', latitude: 9.4580, longitude: -5.6296, popular: true },
  { id: 'ci-daloa', name: 'Daloa', category: 'INTERIEUR_CI', region: 'Haut-Sassandra', latitude: 6.8774, longitude: -6.4502 },
  { id: 'ci-man', name: 'Man', category: 'INTERIEUR_CI', region: 'Tonkpi', latitude: 7.4125, longitude: -7.5538 },
  { id: 'ci-gagnoa', name: 'Gagnoa', category: 'INTERIEUR_CI', region: 'Gôh', latitude: 6.1319, longitude: -5.9506 },
  { id: 'ci-soubre', name: 'Soubré', category: 'INTERIEUR_CI', region: 'Nawa', latitude: 5.7856, longitude: -6.5939 },
  { id: 'ci-divo', name: 'Divo', category: 'INTERIEUR_CI', region: 'Lôh-Djiboua', latitude: 5.8372, longitude: -5.3572 },
  { id: 'ci-abengourou', name: 'Abengourou', category: 'INTERIEUR_CI', region: 'Indénié-Djuablin', latitude: 6.7297, longitude: -3.4964 },
  { id: 'ci-agboville', name: 'Agboville', category: 'INTERIEUR_CI', region: 'Agnéby-Tiassa', latitude: 5.9280, longitude: -4.2132 },
  { id: 'ci-dabou', name: 'Dabou', category: 'INTERIEUR_CI', region: 'Grands-Ponts', latitude: 5.3256, longitude: -4.3767 },
  { id: 'ci-assinie', name: 'Assinie-Mafia', category: 'INTERIEUR_CI', region: 'Sud-Comoé', latitude: 5.1436, longitude: -3.2840 },
  { id: 'ci-grandlahou', name: 'Grand-Lahou', category: 'INTERIEUR_CI', region: 'Grands-Ponts', latitude: 5.1362, longitude: -5.0242 },
  { id: 'ci-odienne', name: 'Odienné', category: 'INTERIEUR_CI', region: 'Kabadougou', latitude: 9.5052, longitude: -7.5643 },
  { id: 'ci-bondoukou', name: 'Bondoukou', category: 'INTERIEUR_CI', region: 'Gontougo', latitude: 8.0402, longitude: -2.8000 },
  { id: 'ci-daoukro', name: 'Daoukro', category: 'INTERIEUR_CI', region: 'Iffou', latitude: 7.0591, longitude: -3.9631 },

  // --- DIASPORA CHRÉTIENNE ---
  { id: 'diasp-paris', name: 'France, Paris & Île-de-France', category: 'DIASPORA', region: 'France', latitude: 48.8566, longitude: 2.3522, popular: true },
  { id: 'diasp-lyon', name: 'France, Lyon & Rhône-Alpes', category: 'DIASPORA', region: 'France', latitude: 45.7640, longitude: 4.8357 },
  { id: 'diasp-marseille', name: 'France, Marseille & Sud', category: 'DIASPORA', region: 'France', latitude: 43.2965, longitude: 5.3698 },
  { id: 'diasp-toulouse', name: 'France, Toulouse / Bordeaux', category: 'DIASPORA', region: 'France', latitude: 43.6047, longitude: 1.4442 },
  { id: 'diasp-lille', name: 'France, Lille / Nord', category: 'DIASPORA', region: 'France', latitude: 50.6292, longitude: 3.0573 },
  { id: 'diasp-bruxelles', name: 'Belgique, Bruxelles', category: 'DIASPORA', region: 'Belgique', latitude: 50.8503, longitude: 4.3517 },
  { id: 'diasp-geneve', name: 'Suisse, Genève / Lausanne', category: 'DIASPORA', region: 'Suisse', latitude: 46.2044, longitude: 6.1432 },
  { id: 'diasp-montreal', name: 'Canada, Montréal (Québec)', category: 'DIASPORA', region: 'Canada', latitude: 45.5017, longitude: -73.5673, popular: true },
  { id: 'diasp-ottawa', name: 'Canada, Ottawa / Toronto', category: 'DIASPORA', region: 'Canada', latitude: 45.4215, longitude: -75.6972 },
  { id: 'diasp-newyork', name: 'USA, New York / New Jersey', category: 'DIASPORA', region: 'USA', latitude: 40.7128, longitude: -74.0060 },
  { id: 'diasp-atlanta', name: 'USA, Atlanta / Washington DC', category: 'DIASPORA', region: 'USA', latitude: 33.7490, longitude: -84.3880 },
  { id: 'diasp-londres', name: 'Royaume-Uni, Londres', category: 'DIASPORA', region: 'UK', latitude: 51.5074, longitude: -0.1278 },
  { id: 'diasp-dakar', name: 'Sénégal, Dakar', category: 'DIASPORA', region: 'Afrique de l\'Ouest', latitude: 14.7167, longitude: -17.4677 },
  { id: 'diasp-accra', name: 'Ghana, Accra', category: 'DIASPORA', region: 'Afrique de l\'Ouest', latitude: 5.6037, longitude: -0.1870 },
  { id: 'diasp-autre', name: 'Autre pays (Diaspora)', category: 'DIASPORA', region: 'International', latitude: 5.3484, longitude: -4.0305 }
];

/**
 * Calcul de la distance réelle en kilomètres (Formule Haversine)
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
 * Trouve l'élément de référence le plus proche pour des coordonnées données
 */
export function findClosestReferenceLocation(lat: number, lon: number): GeoLocationItem {
  let closest = REFERENCE_LOCATIONS[0];
  let minDistance = calculateDistanceKm(lat, lon, closest.latitude, closest.longitude);

  for (let i = 1; i < REFERENCE_LOCATIONS.length; i++) {
    const loc = REFERENCE_LOCATIONS[i];
    const dist = calculateDistanceKm(lat, lon, loc.latitude, loc.longitude);
    if (dist < minDistance) {
      minDistance = dist;
      closest = loc;
    }
  }

  return closest;
}

/**
 * Reverse Geocoding avec OpenStreetMap Nominatim + repli intelligent
 */
export async function reverseGeocode(lat: number, lon: number): Promise<string> {
  const closestRef = findClosestReferenceLocation(lat, lon);
  const distanceToClosestRef = calculateDistanceKm(lat, lon, closestRef.latitude, closestRef.longitude);

  // Si on est à moins de 2.5 km d'un quartier pré-référencé d'Abidjan ou d'une ville, privilégier le libellé local clair
  if (distanceToClosestRef <= 2.5) {
    return closestRef.name;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=14&addressdetails=1`,
      {
        signal: controller.signal,
        headers: {
          'Accept-Language': 'fr',
          'User-Agent': '225Chretien-App/1.0'
        }
      }
    );
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data && data.address) {
        const addr = data.address;
        const suburb = addr.suburb || addr.neighbourhood || addr.quarter || addr.city_district;
        const city = addr.city || addr.town || addr.municipality || addr.village || addr.county || addr.state;
        const country = addr.country || '';

        if (country.toLowerCase().includes("ivoire") || country.toLowerCase().includes("ivory")) {
          if (city && city.toLowerCase().includes("abidjan")) {
            if (suburb) {
              return `Abidjan, ${suburb}`;
            }
            return closestRef.name;
          }
          if (city) {
            return suburb ? `${city} (${suburb})` : city;
          }
        } else if (country) {
          // Diaspora
          if (city) {
            return `${country}, ${city}`;
          }
          return country;
        }
      }
    }
  } catch (err) {
    console.info("Reverse geocoding distant non disponible, utilisation de la référence de proximité");
  }

  // Repli sur le quartier/commune le plus proche
  return closestRef.name;
}

/**
 * Détecte la position GPS exacte du navigateur de manière sécurisée et rapide
 */
export function detectPreciseGPS(): Promise<PreciseLocationResult> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return reject(new Error("La géolocalisation n'est pas supportée sur cet appareil."));
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const accuracy = pos.coords.accuracy;

        try {
          const cityName = await reverseGeocode(lat, lon);
          resolve({
            latitude: lat,
            longitude: lon,
            city: cityName,
            isGps: true,
            accuracyMeters: Math.round(accuracy)
          });
        } catch (e) {
          const fallbackName = findClosestReferenceLocation(lat, lon).name;
          resolve({
            latitude: lat,
            longitude: lon,
            city: fallbackName,
            isGps: true,
            accuracyMeters: Math.round(accuracy)
          });
        }
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 120000
      }
    );
  });
}

/**
 * Formate un affichage textuel de distance
 */
export function formatDistanceLabel(distanceKm?: number): string {
  if (distanceKm === undefined || distanceKm === null) return '';
  if (distanceKm < 1) return "À moins d'un km";
  if (distanceKm < 10) return `À ${distanceKm} km`;
  return `À ${Math.round(distanceKm)} km`;
}
