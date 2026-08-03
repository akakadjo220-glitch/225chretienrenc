import { supabase } from './supabaseClient';
import { secureLog, secureError, sanitizePrompt, maskSecret } from './securityUtils';

// Helper to fetch the OpenRouter API key from the database securely
export const getOpenRouterKey = async (): Promise<string | null> => {
    try {
        const { data, error } = await supabase
            .from('settings')
            .select('openrouter_api_key')
            .limit(1)
            .single();

        if (error || !data) return null;
        return data.openrouter_api_key;
    } catch (err) {
        secureError("AIClient", "Erreur récupération clé IA");
        return null;
    }
};

// Helper to fetch the configured AI model
const getOpenRouterModel = async (): Promise<string> => {
    try {
        const { data } = await supabase
            .from('settings')
            .select('openrouter_model')
            .limit(1)
            .single();
        return data?.openrouter_model || 'openai/gpt-4o-mini';
    } catch {
        return 'openai/gpt-4o-mini';
    }
};

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

// Truncate and sanitize text to prevent Prompt Injection and limit tokens
const truncAndSanitize = (text: string | null | undefined, max = 200): string =>
    sanitizePrompt((text || '').substring(0, max));


// Generic request to OpenRouter
async function callOpenRouter(prompt: string, systemPrompt: string = "Tu es un expert en relations humaines et en compatibilité chrétienne.") {
    const [apiKey, model] = await Promise.all([getOpenRouterKey(), getOpenRouterModel()]);
    if (!apiKey) {
        throw new Error("Clé API OpenRouter non configurée.");
    }

    secureLog("AIClient", `Requête IA via modèle ${model} (Clé: ${maskSecret(apiKey)})`);

    const response = await fetch(OPENROUTER_API_URL, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "HTTP-Referer": "https://chrétien225.com",
            "X-Title": "Chrétien 225",
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: model,
            max_tokens: 300,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: prompt }
            ]
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        secureError("AIClient", `OpenRouter Status ${response.status}`);
        throw new Error(`OpenRouter API Error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

export interface DeepMatchResult {
    score: number;
    analysis: string;
}

export const generateDeepMatchScore = async (userA: any, userB: any): Promise<DeepMatchResult | null> => {
    try {
        const contextA = `Nom: ${sanitizePrompt(userA.name || userA.full_name)}, Paroisse: ${sanitizePrompt(userA.parish)}, Bio: ${truncAndSanitize(userA.bio)}, Intérêts: ${Array.isArray(userA.interests) ? userA.interests.slice(0, 5).map(i => sanitizePrompt(i)).join(', ') : truncAndSanitize(userA.interests, 100)}`;
        const contextB = `Nom: ${sanitizePrompt(userB.name || userB.full_name)}, Paroisse: ${sanitizePrompt(userB.parish)}, Bio: ${truncAndSanitize(userB.bio)}, Intérêts: ${Array.isArray(userB.interests) ? userB.interests.slice(0, 5).map(i => sanitizePrompt(i)).join(', ') : truncAndSanitize(userB.interests, 100)}`;

        const systemPrompt = `Tu es un conseiller matrimonial chrétien expert. Ton rôle est d'analyser la compatibilité profonde entre deux profils. Tu dois renvoyer STRICTEMENT un objet JSON valide avec deux clés: "score" (un nombre de 0 à 100) et "analysis" (une analyse spirituelle et humaine en 2 phrases courtes). NE RIEN AFFICHER D'AUTRE.`;
        const prompt = `Profil 1:\n${contextA}\n\nProfil 2:\n${contextB}\n\nEvalue la compatibilité.`;

        const responseText = await callOpenRouter(prompt, systemPrompt);

        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const result = JSON.parse(jsonMatch[0]);
            return {
                score: typeof result.score === 'number' ? result.score : parseInt(result.score || '50'),
                analysis: sanitizePrompt(result.analysis) || "Compatibilité moyenne."
            };
        }
        return null;
    } catch (e: any) {
        secureError("AIClient", "Deep Match Score Error", e.message);
        return null;
    }
};

export const generateIcebreakers = async (userA: any, userB: any): Promise<string[]> => {
    try {
        const contextA = `Nom: ${sanitizePrompt(userA.name || userA.full_name)}, Paroisse: ${sanitizePrompt(userA.parish)}, Bio: ${truncAndSanitize(userA.bio)}, Intérêts: ${Array.isArray(userA.interests) ? userA.interests.slice(0, 5).map(i => sanitizePrompt(i)).join(', ') : truncAndSanitize(userA.interests, 100)}`;
        const contextB = `Nom: ${sanitizePrompt(userB.name || userB.full_name)}, Paroisse: ${sanitizePrompt(userB.parish)}, Bio: ${truncAndSanitize(userB.bio)}, Intérêts: ${Array.isArray(userB.interests) ? userB.interests.slice(0, 5).map(i => sanitizePrompt(i)).join(', ') : truncAndSanitize(userB.interests, 100)}`;

        const systemPrompt = `Tu es un assistant amical. Ton rôle est d'aider le Profil 1 à briser la glace avec le Profil 2 sur une application de rencontre chrétienne. Propose 3 phrases d'accroche (icebreakers) courtes, perspicaces, naturelles, et liées à leurs points communs ou à la foi. Séparées par le caractère "|||". AUCUN AUTRE TEXTE.`;
        const prompt = `Profil 1 (moi):\n${contextA}\n\nProfil 2 (l'autre profil):\n${contextB}\n\nDonne moi 3 icebreakers séparés par |||.`;

        const responseText = await callOpenRouter(prompt, systemPrompt);

        const icebreakers = responseText.split('|||').map(s => sanitizePrompt(s.trim().replace(/^"|"$/g, '').replace(/^- |^\d+\.\s*/, ''))).filter(Boolean);
        return icebreakers.slice(0, 3);
    } catch (e: any) {
        secureError("AIClient", "Icebreakers Error", e.message);
        return [];
    }
};

export const generateAntiGhostingMessage = async (myProfile: any, theirProfile: any): Promise<string | null> => {
    try {
        const contextA = `Nom: ${sanitizePrompt(myProfile.name || myProfile.full_name)}, Intérêts: ${Array.isArray(myProfile.interests) ? myProfile.interests.map(i => sanitizePrompt(i)).join(', ') : sanitizePrompt(myProfile.interests)}`;
        const contextB = `Nom: ${sanitizePrompt(theirProfile.name || theirProfile.full_name)}, Intérêts: ${Array.isArray(theirProfile.interests) ? theirProfile.interests.map(i => sanitizePrompt(i)).join(', ') : sanitizePrompt(theirProfile.interests)}`;

        const systemPrompt = `Tu es un coach relationnel bienveillant. La conversation s'est arrêtée. Suggère 1 SEUL message de relance court, léger, amical et poli (anti-ghosting) pour le Profil 1 à envoyer au Profil 2. Le message doit relancer la discussion sans culpabiliser.`;
        const prompt = `Profil 1 (moi):\n${contextA}\n\nProfil 2:\n${contextB}\n\nLe dernier message remonte à plusieurs jours. Donne moi une phrase de relance parfaite.`;

        const responseText = await callOpenRouter(prompt, systemPrompt);
        return sanitizePrompt(responseText.replace(/^"|"$/g, '').trim());
    } catch (e: any) {
        secureError("AIClient", "Anti Ghosting Error", e.message);
        return null;
    }
};

export const moderateMessage = async (text: string): Promise<'SAFE' | 'TOXIC'> => {
    try {
        const cleanText = sanitizePrompt(text);
        const systemPrompt = `Tu es une intelligence artificielle de modération stricte pour une application de rencontre chrétienne. Ton but est d'analyser le message utilisateur. Si le message contient des insultes, de la haine, du contenu à caractère très sexuel, des spams, des arnaques évidentes ("brouteur") ou des demandes explicites d'argent, tu dois RÉPONDRE UNIQUEMENT par le mot exact "TOXIC". Si le message est normal, amical, ou même légèrement taquin mais respectueux, tu dois RÉPONDRE UNIQUEMENT par le mot exact "SAFE". AUCUN AUTRE MOT N'EST AUTORISÉ.`;
        const prompt = `Message à analyser : "${cleanText}"`;

        const responseText = await callOpenRouter(prompt, systemPrompt);
        const result = responseText.trim().toUpperCase();
        return result.includes('TOXIC') ? 'TOXIC' : 'SAFE';
    } catch (e: any) {
        secureError("AIClient", "Text Moderation Error", e.message);
        return 'SAFE';
    }
};

export const moderateImage = async (base64Image: string): Promise<'SAFE' | 'NSFW'> => {
    try {
        const [apiKey, model] = await Promise.all([getOpenRouterKey(), getOpenRouterModel()]);
        if (!apiKey) return 'SAFE';

        const response = await fetch(OPENROUTER_API_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "HTTP-Referer": "https://chrétien225.com",
                "X-Title": "Chrétien 225 Moderation",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: 'openai/gpt-4o-mini',
                max_tokens: 50,
                messages: [
                    {
                        role: "system",
                        content: "Tu es une IA de modération stricte. Ton but est de déterminer si cette image contient de la nudité explicite (organes génitaux, pornographie). Réponds STRICTEMENT ET UNIQUEMENT 'NSFW' si oui, ou 'SAFE' si l'image est correcte."
                    },
                    {
                        role: "user",
                        content: [
                            { type: "text", text: "Cette image est-elle SAFE ou NSFW ?" },
                            { type: "image_url", image_url: { url: base64Image } }
                        ]
                    }
                ]
            })
        });

        if (!response.ok) return 'SAFE';

        const data = await response.json();
        const content = data.choices[0]?.message?.content?.toUpperCase() || '';
        return content.includes('NSFW') ? 'NSFW' : 'SAFE';
    } catch (e: any) {
        secureError("AIClient", "Image Moderation Error", e.message);
        return 'SAFE';
    }
};

/**
 * 🛡️ Bouclier Anti-Arnaque Financière (Détection IA & Motifs de Fraude)
 * Détecte en temps réel les demandes de transfert Mobile Money / Wave / Urgence
 */
export interface FinancialScamCheckResult {
    isScamRisk: boolean;
    riskScore: number;
    matchedKeywords: string[];
    warningMessage: string;
}

export const detectFinancialScam = (text: string): FinancialScamCheckResult => {
    if (!text || typeof text !== 'string') {
        return { isScamRisk: false, riskScore: 0, matchedKeywords: [], warningMessage: '' };
    }

    const lower = text.toLowerCase();
    
    // Mots-clés de transfert financier
    const transferKeywords = [
        'wave', 'orange money', 'om', 'momo', 'mtn money', 'moov money', 
        'western union', 'moneygram', 'rib', 'virement', 'compte bancaire', 
        'crypto', 'usdt', 'bitcoin', 'depannage', 'dépannage'
    ];

    // Motifs de sollicitation d'argent / urgence
    const requestPhrases = [
        'envoie moi', 'envoie-moi', 'donne moi', 'donne-moi', 'besoin d\'argent', 
        'besoin de sous', 'urgence medicale', 'urgence médicale', 'ordonnance', 
        'malade a l\'hopital', 'malade à l\'hôpital', 'pret moi', 'prête moi', 
        'transfert moi', 'transfert-moi', 'aide financiere', 'aide financière',
        'paye moi', 'paye-moi', 'recharge moi', 'solde', 'portefeuille'
    ];

    const matchedKeywords: string[] = [];

    transferKeywords.forEach(kw => {
        if (lower.includes(kw)) matchedKeywords.push(kw);
    });

    requestPhrases.forEach(phrase => {
        if (lower.includes(phrase)) matchedKeywords.push(phrase);
    });

    let riskScore = 0;
    if (matchedKeywords.length > 0) riskScore += 50;
    if (matchedKeywords.length >= 2) riskScore += 35;

    const isScamRisk = riskScore >= 50;
    const warningMessage = isScamRisk 
        ? "Alerte de sécurité : Ce message contient une sollicitation financière ou de transfert d'argent (Wave / Mobile Money)."
        : '';

    return {
        isScamRisk,
        riskScore: Math.min(100, riskScore),
        matchedKeywords,
        warningMessage
    };
};
