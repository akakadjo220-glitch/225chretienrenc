/**
 * 🛡️ Module de Cybersécurité : Empreinte Appareil (Device Fingerprint) & IP Client
 * Fournit la génération d'empreinte matérielle/navigateur, la détection d'IP
 * et la gestion de la liste noire (Blacklist) pour le blocage sophistiqué.
 */
import { supabase } from '../supabaseClient';

export interface BannedIdentifier {
    id: string;
    type: 'PHONE' | 'EMAIL' | 'IP' | 'FINGERPRINT' | 'USER_ID';
    value: string;
    reason: string;
    bannedAt: string;
    bannedBy?: string;
}

// Génère une empreinte numérique d'appareil persistante (Device Fingerprint)
export const getDeviceFingerprint = (): string => {
    try {
        let storedFp = localStorage.getItem('_225_device_fp');
        if (storedFp && storedFp.length >= 16) {
            return storedFp;
        }

        const nav = window.navigator;
        const screen = window.screen;
        
        // Composants matériels et navigateur
        const components = [
            nav.userAgent || '',
            nav.language || '',
            screen.colorDepth || '',
            screen.width + 'x' + screen.height,
            new Date().getTimezoneOffset(),
            nav.hardwareConcurrency || '',
            (nav as any).deviceMemory || '',
            nav.platform || ''
        ];

        // Hashage robuste des composants
        const str = components.join('||');
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0; // Convert to 32bit integer
        }

        const fp = 'fp_' + Math.abs(hash).toString(36) + '_' + Date.now().toString(36);
        localStorage.setItem('_225_device_fp', fp);
        return fp;
    } catch {
        return 'fp_unknown_device';
    }
};

let memoryCachedIp: string | null = null;
let memoryBannedCache: { data: BannedIdentifier[]; fetchedAt: number } | null = null;

// Récupère l'adresse IP publique du client (ultra rapide avec cache local & timeout 1s)
export const getClientIp = async (): Promise<string> => {
    if (memoryCachedIp) return memoryCachedIp;
    try {
        if (typeof window !== 'undefined') {
            const stored = sessionStorage.getItem('_225_client_ip');
            if (stored) {
                memoryCachedIp = stored;
                return stored;
            }
        }
        const res = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(1000) });
        if (res.ok) {
            const data = await res.json();
            if (data.ip) {
                memoryCachedIp = data.ip;
                if (typeof window !== 'undefined') sessionStorage.setItem('_225_client_ip', data.ip);
                return data.ip;
            }
        }
    } catch (e) {
        // Fallback silencieux en cas de blocage réseau ou adblocker
    }
    return '127.0.0.1';
};

// Normalise les numéros de téléphone pour comparaison absolue
export const normalizePhone = (phone: string | null | undefined): string => {
    if (!phone) return '';
    return phone.replace(/[^0-9]/g, '');
};

// Charge la liste noire complète depuis system_settings avec cache haute performance 60s
export const fetchBannedIdentifiers = async (forceRefresh = false): Promise<BannedIdentifier[]> => {
    const now = Date.now();
    if (!forceRefresh && memoryBannedCache && (now - memoryBannedCache.fetchedAt < 60000)) {
        return memoryBannedCache.data;
    }
    try {
        const { data } = await supabase
            .from('system_settings')
            .select('value')
            .eq('key', 'banned_identifiers')
            .maybeSingle();

        if (data?.value && Array.isArray(data.value)) {
            const list = data.value as BannedIdentifier[];
            memoryBannedCache = { data: list, fetchedAt: now };
            return list;
        }
    } catch (e) {
        console.warn("Erreur chargement liste noire:", e);
    }
    return memoryBannedCache?.data || [];
};

// Ajoute un ou plusieurs identifiants à la liste noire et sauvegarde dans Supabase
export const banIdentifiers = async (
    newItems: Omit<BannedIdentifier, 'id' | 'bannedAt'>[]
): Promise<BannedIdentifier[]> => {
    try {
        const current = await fetchBannedIdentifiers();
        const now = new Date().toISOString();

        const formattedNew: BannedIdentifier[] = newItems
            .filter(item => item.value && item.value.trim().length > 0)
            .map(item => ({
                id: 'ban_' + Math.random().toString(36).substring(2, 9),
                type: item.type,
                value: item.value.trim(),
                reason: item.reason || 'Banni par la sécurité administration',
                bannedAt: now,
                bannedBy: item.bannedBy || 'Admin'
            }));

        // Éviter les doublons
        const combined = [...current];
        for (const item of formattedNew) {
            const exists = combined.some(c => c.type === item.type && c.value.toLowerCase() === item.value.toLowerCase());
            if (!exists) {
                combined.push(item);
            }
        }

        // Sauvegarder dans system_settings
        const { data: existingRow } = await supabase
            .from('system_settings')
            .select('id')
            .eq('key', 'banned_identifiers')
            .maybeSingle();

        if (existingRow?.id) {
            await supabase
                .from('system_settings')
                .update({ value: combined, updated_at: now })
                .eq('key', 'banned_identifiers');
        } else {
            await supabase
                .from('system_settings')
                .insert({ key: 'banned_identifiers', value: combined });
        }

        return combined;
    } catch (e) {
        console.error("Erreur sauvegarde liste noire:", e);
        return [];
    }
};

/**
 * Vérifie si un ensemble d'identifiants (téléphone, email, IP, empreinte) est présent dans la liste noire
 */
export const checkIsBlacklisted = (
    blacklist: BannedIdentifier[],
    params: {
        phone?: string;
        email?: string;
        ip?: string;
        fingerprint?: string;
        userId?: string;
    }
): { isBanned: boolean; reason?: string; matchType?: string } => {
    if (!blacklist || !Array.isArray(blacklist) || blacklist.length === 0) {
        return { isBanned: false };
    }

    const normPhone = normalizePhone(params.phone);
    const normEmail = (params.email || '').trim().toLowerCase();
    const normIp = (params.ip || '').trim();
    const normFp = (params.fingerprint || '').trim();
    const normUid = (params.userId || '').trim();

    for (const item of blacklist) {
        const itemVal = (item.value || '').trim();
        if (!itemVal) continue;

        // 1. Vérification Téléphone
        if (item.type === 'PHONE' || normPhone) {
            const itemPhoneNorm = normalizePhone(itemVal);
            if (itemPhoneNorm && normPhone && (itemPhoneNorm.includes(normPhone) || normPhone.includes(itemPhoneNorm))) {
                return { isBanned: true, reason: item.reason || 'Numéro de téléphone banni par la sécurité.', matchType: 'TÉLÉPHONE' };
            }
        }

        // 2. Vérification Email
        if (item.type === 'EMAIL' || normEmail) {
            if (normEmail && itemVal.toLowerCase() === normEmail) {
                return { isBanned: true, reason: item.reason || 'Adresse email bannie par la sécurité.', matchType: 'EMAIL' };
            }
        }

        // 3. Vérification IP
        if (item.type === 'IP' && normIp) {
            if (itemVal === normIp && normIp !== '127.0.0.1') {
                return { isBanned: true, reason: item.reason || 'Adresse IP bannie par la sécurité.', matchType: 'ADRESSE IP' };
            }
        }

        // 4. Vérification Empreinte Appareil (Device Fingerprint)
        if (item.type === 'FINGERPRINT' && normFp) {
            if (itemVal === normFp) {
                return { isBanned: true, reason: item.reason || 'Cet appareil a été banni par la sécurité.', matchType: 'APPAREIL (FINGERPRINT)' };
            }
        }

        // 5. Vérification User ID
        if (item.type === 'USER_ID' && normUid) {
            if (itemVal === normUid) {
                return { isBanned: true, reason: item.reason || 'Compte banni par la sécurité.', matchType: 'COMPTE UTILISATEUR' };
            }
        }
    }

    return { isBanned: false };
};
