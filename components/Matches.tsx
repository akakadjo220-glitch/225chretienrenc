
import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const getImlrUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http') || path.startsWith('/')) return path;
    return supabase.storage.from('Public').getPublicUrl(path).data.publicUrl;
};
const getDefaultAvatar = (name?: string) => {
    const cleanName = encodeURIComponent(name?.trim() || 'Chrétien');
    return `https://ui-avatars.com/api/?name=${cleanName}&background=0D5C3A&color=ffffff&size=512&bold=true`;
};

import { Check, X, MapPin, ShieldCheck, Shield, Search, Star, MessageCircle, Loader, CreditCard, CheckCircle, RefreshCw, SlidersHorizontal, ChevronDown, HeartHandshake, Mic, Lock, Plus, Heart, Play, Pause, Volume2, Bell, Sparkles } from 'lucide-react';
import { MatchProfile, VerificationStatus } from '../types';
import { generateDeepMatchScore, DeepMatchResult } from '../aiClient';
import { calculateAge, calculateChristianMatchScore, isSameParishFuzzy, detectProfileFraud, recordInteractionAndTrainMl, extractDenomination } from '../matchingEngine';

const SWIPE_THRESHOLD = 100;
const TAP_THRESHOLD = 5;

interface MatchesProps {
    onGoToMessages: (contactId?: string) => void;
    onGoToProfile?: () => void;
}

export const Matches: React.FC<MatchesProps> = ({ onGoToMessages, onGoToProfile }) => {
    const [matches, setMatches] = useState<MatchProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Filter States
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedParish, setSelectedParish] = useState('');
    const [maxDistanceKm, setMaxDistanceKm] = useState<number | null>(null);
    const [parishesList, setParishesList] = useState<{ id: string, name: string }[]>([]);

    // Deck Logic States
    const [currentIndex, setCurrentIndex] = useState(0);
    const [activeImageIndex, setActiveImageIndex] = useState(0);

    const [swipeResult, setSwipeResult] = useState<'LIKE' | 'NOPE' | 'SUPER' | null>(null);

    // Refs pour le drag haute-performance (évite les re-renders intempestifs en cours de glissement)
    const dragStartRef = useRef<{ x: number; y: number } | null>(null);
    const isDraggingRef = useRef(false);
    const isSwipingRef = useRef(false);

    // Sécurité Frontend : Nettoyage contre les injections XSS
    const sanitizeText = (text: any, fallback = '') => {
        if (!text) return fallback;
        return String(text).replace(/[<>&"']/g, '').trim() || fallback;
    };

    const [matchedProfile, setMatchedProfile] = useState<MatchProfile | null>(null);
    const [showPremiumModal, setShowPremiumModal] = useState(false);
    const [premiumFeatureType, setPremiumFeatureType] = useState<'MESSAGE' | 'SUPERLIKE'>('MESSAGE');

    // Protection Match
    // knownMatchIds = Gens avec qui ça a déjà "Matché" (Conversation active). On ne doit JAMAIS les revoir dans le deck.
    const [knownMatchIds, setKnownMatchIds] = useState<Set<string>>(new Set());

    // Payment State
    const [paymentConfig, setPaymentConfig] = useState<{ publicKey: string, currency: string, amount: number } | null>(null);
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);

    // Admirateurs state
    const [showAdmirateurs, setShowAdmirateurs] = useState(false);
    const [admirateursList, setAdmirateursList] = useState<any[]>([]);
    const [isLoadingAdmirateurs, setIsLoadingAdmirateurs] = useState(false);

    const cardRef = useRef<HTMLDivElement>(null);

    const [currentUser, setCurrentUser] = useState<any>(null);

    const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

    // Navigation & Config
    useEffect(() => {
        setActiveImageIndex(0);
        setPlayingAudioId(null);
    }, [currentIndex]);

    // AI States
    const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);
    const [aiAnalysisResult, setAiAnalysisResult] = useState<DeepMatchResult | null>(null);

    useEffect(() => {
        const initUser = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                    const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
                    let parsedPhotos: string[] = [];
                    if (profile?.photos_urls) {
                        if (Array.isArray(profile.photos_urls)) {
                            parsedPhotos = profile.photos_urls;
                        } else if (typeof profile.photos_urls === 'string') {
                            try {
                                parsedPhotos = JSON.parse(profile.photos_urls);
                            } catch {
                                parsedPhotos = [profile.photos_urls];
                            }
                        }
                    }
                    setCurrentUser({ 
                        ...session.user, 
                        ...(profile || {}), 
                        photos_urls: parsedPhotos, 
                        lookingFor: profile?.looking_for 
                    });
                } else {
                    setIsLoading(false);
                }
            } catch (err) {
                console.error("Erreur initUser Matches:", err);
                setIsLoading(false);
            }
        };
        initUser();

        // Sécurité anti-blocage: la page ne doit jamais rester bloquée sur le loader
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 1500);

        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        setActiveImageIndex(0);
    }, [currentIndex]);

    // Charger la config de paiement (Sandbox vs Production)
    useEffect(() => {
        const loadPaymentConfig = async () => {
            try {
                const { data: settings } = await supabase.from('settings').select('*').limit(1);
                if (settings && settings.length > 0) {
                    const isProd = settings[0].paystack_mode === 'PRODUCTION';
                    const activeKey = isProd
                        ? (settings[0].paystack_live_public_key || settings[0].paystack_public_key)
                        : settings[0].paystack_public_key;

                    setPaymentConfig({
                        publicKey: activeKey,
                        currency: settings[0].currency || 'XOF',
                        amount: settings[0].amount || 1500
                    });
                }
            } catch (e) {
                console.log("Config paiement non trouvée");
            }
        };
        loadPaymentConfig();
    }, []);

    const parseInterests = (interests: any): string[] => {
        if (!interests) return [];
        let items: string[] = [];
        if (Array.isArray(interests)) {
            items = interests.map(i => String(i));
        } else if (typeof interests === 'string') {
            const trimmed = interests.trim();
            if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
                try {
                    const parsed = JSON.parse(trimmed);
                    if (Array.isArray(parsed)) {
                        items = parsed.map(i => String(i));
                    }
                } catch (e) {
                    items = trimmed.split(',');
                }
            } else {
                items = trimmed.split(',');
            }
        }
        return items
            .map(s => s.replace(/^["'[\]\s]+|["'[\]\s]+$/g, '').trim())
            .filter(Boolean);
    };

    const calculateCompatibilityScore = (me: any, them: any): number => {
        let score = 50;

        // 1. RÈGLE ABSOLUE : ALIGNEMENT DES CONFESSIONS CHRÉTIENNES
        const myDenom = (me.denomination || '').trim().toLowerCase();
        const theirDenom = (them.denomination || '').trim().toLowerCase();
        if (myDenom && theirDenom && myDenom === theirDenom) {
            score += 25; // Compatibilité spirituelle maximale
        } else if (myDenom && theirDenom && myDenom !== theirDenom) {
            return 0; // Isolation stricte : 0% si confessions différentes
        }

        // 2. Interêts communs
        const myInterests = parseInterests(me.interests);
        const theirInterests = parseInterests(them.interests);
        const commonInterests = myInterests.filter((i: string) => theirInterests.includes(i));
        score += Math.min(commonInterests.length * 5, 15);

        // 3. Proximité de paroisse
        if (me.parish && them.parish && me.parish.trim().toLowerCase() === them.parish.trim().toLowerCase()) {
            score += 10;
        }

        if (them.verification_status === 'VERIFIED') score += 5;
        if (them.photos && them.photos.length > 0) score += 5;

        return Math.min(Math.max(score, 50), 99);
    };

    /**
     * CŒUR DU SYSTÈME DE RECUPERATION DES PROFILS
     */
    const fetchMatches = async (includeSeenProfiles = false, searchStr = '', parishStr = '', maxDist: number | null = maxDistanceKm) => {
        setIsLoading(true);
        try {
            const currentUserId = currentUser?.id;
            const currentUserModel = currentUser;

            if (!currentUserId || !currentUserModel) {
                setIsLoading(false);
                return;
            }

            // --- ETAPE 1 : IDENTIFIER LES GENS À EXCLURE ---
            const alwaysExcludeIds = new Set<string>(); // IDs à ne JAMAIS montrer (Soi-même + Matchs confirmés)
            const historyIds = new Set<string>();       // IDs déjà vus (Likes/Dislikes passés)

            alwaysExcludeIds.add(currentUserId);

            // 1.a Récupérer les Matchs Confirmés (Conversation ouverte)
            try {
                const { data: myMatches } = await supabase.from('matches').select('*').or(`user1_id.eq.${currentUserId},user2_id.eq.${currentUserId}`);
                (myMatches || []).forEach((m: any) => {
                    const partnerId = m.user1_id === currentUserId ? m.user2_id : m.user1_id;
                    alwaysExcludeIds.add(partnerId);
                });
                setKnownMatchIds(new Set(Array.from(alwaysExcludeIds))); // Mise à jour du state pour protection UI
            } catch (e) { console.log("Info: Pas de matchs chargés"); }

            // 1.b Récupérer l'historique des Likes/Dislikes (si on ne veut pas les revoir)
            if (!includeSeenProfiles) {
                try {
                    const { data: myLikes } = await supabase.from('likes').select('to_user_id').eq('from_user_id', currentUserId);
                    (myLikes || []).forEach((l: any) => historyIds.add(l.to_user_id));
                } catch (e) { console.log("Info: Pas de likes chargés"); }
            }

            // 1.c Récupérer l'ID des gens qui m'ont liké (Pour contourner le mode invisible)
            const admirersIds = new Set<string>();
            try {
                const { data: theirLikes } = await supabase.from('likes').select('from_user_id').eq('to_user_id', currentUserId).in('type', ['like', 'superlike']);
                (theirLikes || []).forEach((l: any) => admirersIds.add(l.from_user_id));
            } catch (e) { console.log("Info: Pas d'admirateurs chargés"); }

            // --- ETAPE 2 : REQUÊTE BASE DE DONNÉES EN TEMPS RÉEL ---
            let query = supabase.from('profiles').select('*').neq('id', currentUserId);

            if (currentUserModel.lookingFor) {
                query = query.eq('gender', currentUserModel.lookingFor);
            }

            if (parishStr) {
                query = query.eq('parish', parishStr);
            }

            const { data: resultList } = await query.limit(200);

            // --- ETAPE 3 : FILTRAGE CLIENT ET SÉCURITÉ ---
            let candidates = (resultList || []).filter((u: any) => {
                if (alwaysExcludeIds.has(u.id)) return false;
                if (!includeSeenProfiles && historyIds.has(u.id)) return false;
                if (u.is_invisible && !admirersIds.has(u.id)) return false;
                return true;
            });

            // Application de la recherche par mots-clés
            if (searchStr.trim()) {
                const lowerSearch = searchStr.toLowerCase().trim();
                candidates = candidates.filter((u: any) => {
                    const name = (u.full_name || u.name || '').toLowerCase();
                    const bio = (u.bio || '').toLowerCase();
                    let interestsStr = '';
                    if (Array.isArray(u.interests)) {
                        interestsStr = u.interests.join(' ').toLowerCase();
                    } else if (typeof u.interests === 'string') {
                        interestsStr = u.interests.toLowerCase();
                    }
                    return name.includes(lowerSearch) || bio.includes(lowerSearch) || interestsStr.includes(lowerSearch);
                });
            }

            // --- ETAPE 3.5 : PARE-FEU DE CYBERSÉCURITÉ (FILTRAGE DE SÉCURITÉ ANTI-FRAUDE) ---
            candidates = candidates.filter((u: any) => {
                const fraudCheck = detectProfileFraud(u);
                return !fraudCheck.isBlocked;
            });

            // --- ETAPE 3.6 : FILTRAGE GÉOLOCALISÉ PAR DISTANCE MAXIMALE ---
            if (maxDist !== null && maxDist > 0) {
                candidates = candidates.filter((u: any) => {
                    const matchAnalysis = calculateChristianMatchScore(currentUserModel, u);
                    return matchAnalysis.distanceKm <= maxDist;
                });
            }

            // Tri par compatibilité spirituelle et boost
            const now = new Date();
            candidates.sort((a: any, b: any) => {
                const isBoostedA = a.boost_expires_at && new Date(a.boost_expires_at) > now ? 1 : 0;
                const isBoostedB = b.boost_expires_at && new Date(b.boost_expires_at) > now ? 1 : 0;
                if (isBoostedA !== isBoostedB) return isBoostedB - isBoostedA;
                const scoreA = calculateChristianMatchScore(currentUserModel, a).score;
                const scoreB = calculateChristianMatchScore(currentUserModel, b).score;
                return scoreB - scoreA;
            });

            // --- ETAPE 4 : MAPPING 100% BASE DE DONNÉES RÉELLE ---
            const realMatches: MatchProfile[] = candidates.map((record: any) => {
                const matchAnalysis = calculateChristianMatchScore(currentUserModel, record);
                const realAge = calculateAge(record.birth_date, record.age);
                const rName = record.full_name || record.name || 'Membre Chrétien';

                // Badges gamification réels
                const calculatedBadges: string[] = [];
                if (record.document_baptism_url) calculatedBadges.push('BAPTISM_CERTIFIED');
                if (record.verification_status === 'VERIFIED') calculatedBadges.push('COMMUNITY_CERTIFIED');

                const isBoosted = record.boost_expires_at && new Date(record.boost_expires_at) > new Date();
                if (isBoosted) calculatedBadges.push('PARISH_BOOSTED');

                if (matchAnalysis.isSameDenomination) calculatedBadges.push('MÊME_CONFESSION');
                const sameParish = isSameParishFuzzy(currentUserModel.parish, record.parish);
                if (sameParish) calculatedBadges.push('SAME_PARISH');

                if (record.is_premium) calculatedBadges.push('⭐ Premium');
                if (record.verification_status === 'VERIFIED') calculatedBadges.push('🛡️ Vérifié');
                const hasFullProfile = (record.bio && record.bio.length > 30) && (record.photos_urls && record.photos_urls.length >= 2);
                if (hasFullProfile) calculatedBadges.push('⭐ Complet');

                const locationStr = record.location || record.parish || 'Abidjan';
                const dist = matchAnalysis.distanceKm;
                const distanceBadge = dist !== undefined ? (dist < 1 ? ' • < 1 km' : ` • ${dist} km`) : '';
                const locationWithDistance = `${locationStr}${distanceBadge}`;

                const userDenom = record.denomination || extractDenomination(record.parish);
                const userInvolvement = record.church_involvement || (record.gender === 'F' ? 'Engagée en paroisse' : 'Engagé en paroisse');
                const userSpiritual = record.spiritual_status || (record.gender === 'F' ? 'Croyante' : 'Croyant');
                const audioUrl = record.testimonial_audio_url ? getImlrUrl(record.testimonial_audio_url) : undefined;

                return {
                    id: record.id,
                    name: rName,
                    gender: record.gender,
                    age: realAge,
                    location: locationWithDistance,
                    latitude: record.latitude,
                    longitude: record.longitude,
                    distanceKm: dist,
                    parish: record.parish || 'Non renseignée',
                    denomination: userDenom,
                    church_involvement: userInvolvement,
                    spiritual_status: userSpiritual,
                    bio: record.bio || "Membre engagé(e) de la communauté chrétienne.",
                    imageUrl: record.avatar_url ? getImlrUrl(record.avatar_url) : getDefaultAvatar(rName),
                    photos: (record.photos_urls || record.photos || []).map((p: string) => getImlrUrl(p)),
                    percentage: matchAnalysis.score,
                    interests: parseInterests(record.interests),
                    testimonial_audio_url: audioUrl,
                    badges: calculatedBadges,
                    isInvisible: record.is_invisible,
                    isBoosted: !!isBoosted
                };
            });

            setMatches(realMatches);
            setCurrentIndex(0);

        } catch (err) {
            console.error("Erreur critique fetchMatches", err);
            setMatches([]);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchParishes = async () => {
        try {
            const { data: result } = await supabase.from('parishes').select('*').order('name');
            setParishesList((result || []).map((p: any) => ({ id: p.id, name: p.name })));
        } catch (e) { }
    };

    useEffect(() => {
        if (currentUser) {
            fetchMatches(false, '', '');
            fetchParishes();
        }
    }, [currentUser]);

    const handleManualRefresh = () => {
        fetchMatches(false, searchQuery, selectedParish, maxDistanceKm);
    };

    const handleResetHistory = () => {
        fetchMatches(true, searchQuery, selectedParish, maxDistanceKm);
    };

    const handleApplyFilters = () => {
        fetchMatches(false, searchQuery, selectedParish, maxDistanceKm);
        setIsFilterModalOpen(false);
    };

    const handleResetFilters = () => {
        setSearchQuery('');
        setSelectedParish('');
        setMaxDistanceKm(null);
        setCurrentIndex(0);
        fetchMatches(false, '', '', null);
        setIsFilterModalOpen(false);
    };

    const filteredMatches = matches;

    const handleSwipeAction = async (direction: 'left' | 'right', isDragAction = false) => {
        if (isSwipingRef.current) return;
        const currentProfile = filteredMatches[currentIndex];
        if (!currentProfile) return;

        if (knownMatchIds.has(currentProfile.id)) {
            setCurrentIndex(prev => prev + 1);
            return;
        }

        isSwipingRef.current = true;

        // Si ce n'est pas initié par drag (clic sur les boutons), on anime le départ
        if (!isDragAction && cardRef.current) {
            cardRef.current.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1), opacity 0.4s';
            cardRef.current.style.transform = direction === 'right'
                ? 'translateX(150%) rotate(20deg)'
                : 'translateX(-150%) rotate(-20deg)';
            cardRef.current.style.opacity = '0';

            const badge = cardRef.current.querySelector(direction === 'right' ? '.swipe-badge-like' : '.swipe-badge-nope') as HTMLElement;
            if (badge) badge.style.opacity = '1';
        }

        if (direction === 'right' && currentUser) {
            try {
                try {
                    await supabase.from('likes').delete().match({ from_user_id: currentUser.id, to_user_id: currentProfile.id });
                } catch (e) { }

                let isMutual = false;
                try {
                    const { count } = await supabase.from('likes').select('*', { count: 'exact', head: true }).match({ from_user_id: currentProfile.id, to_user_id: currentUser.id, type: 'like' });
                    isMutual = (count && count > 0) || false;
                } catch (e) { }

                if (isMutual) {
                    await supabase.from('matches').insert({
                        user1_id: currentUser.id,
                        user2_id: currentProfile.id
                    });
                    setKnownMatchIds(prev => new Set(prev).add(currentProfile.id));
                    setMatchedProfile(currentProfile);

                    // 🧠 AUTO-AMÉLIORATION DU MACHINE LEARNING
                    recordInteractionAndTrainMl({
                        userAId: currentUser.id,
                        userBId: currentProfile.id,
                        action: 'MUTUAL_MATCH',
                        featureMatches: {
                            sameParish: isSameParishFuzzy(currentUser.parish, currentProfile.parish),
                            sameDenomination: extractDenomination(currentUser.denomination) === extractDenomination(currentProfile.denomination),
                            distanceKm: 10,
                            sharedInterestsCount: currentProfile.interests ? currentProfile.interests.length : 0,
                            ageDiff: Math.abs((currentUser.age || 25) - (currentProfile.age || 25))
                        }
                    }).catch(() => {});
                } else {
                    await supabase.from('likes').insert({
                        from_user_id: currentUser.id,
                        to_user_id: currentProfile.id,
                        type: 'like'
                    });
                }
            } catch (err) {
                console.error("Erreur action swipe", err);
            }
        } else if (direction === 'left' && currentUser) {
            try {
                await supabase.from('likes').delete().match({ from_user_id: currentUser.id, to_user_id: currentProfile.id });
                await supabase.from('likes').insert({
                    from_user_id: currentUser.id,
                    to_user_id: currentProfile.id,
                    type: 'dislike'
                });
            } catch (e) { }
        }

        setTimeout(() => {
            if (cardRef.current) {
                cardRef.current.style.transition = 'none';
                cardRef.current.style.transform = 'none';
                cardRef.current.style.opacity = '1';
                const likeBadge = cardRef.current.querySelector('.swipe-badge-like') as HTMLElement;
                const nopeBadge = cardRef.current.querySelector('.swipe-badge-nope') as HTMLElement;
                if (likeBadge) likeBadge.style.opacity = '0';
                if (nopeBadge) nopeBadge.style.opacity = '0';
            }
            setCurrentIndex(prev => prev + 1);
            isSwipingRef.current = false;
        }, isDragAction ? 200 : 350);
    };

    const toggleAudioPlayback = (e: React.MouseEvent, profileId: string) => {
        e.stopPropagation();
        const audioEl = document.getElementById(`audio-${profileId}`) as HTMLAudioElement;
        if (!audioEl) return;
        if (playingAudioId === profileId) {
            audioEl.pause();
            setPlayingAudioId(null);
        } else {
            document.querySelectorAll('audio').forEach(a => {
                if (a !== audioEl) {
                    a.pause();
                    a.currentTime = 0;
                }
            });
            audioEl.play().then(() => {
                setPlayingAudioId(profileId);
            }).catch((err) => {
                console.warn("Audio playback issue:", err);
                setPlayingAudioId(null);
            });
            audioEl.onended = () => setPlayingAudioId(null);
            audioEl.onerror = () => setPlayingAudioId(null);
        }
    };

    const handlePremiumAction = async (type: 'MESSAGE' | 'SUPERLIKE') => {
        const currentProfile = filteredMatches[currentIndex];
        if (!currentProfile || !currentUser) return;

        if (knownMatchIds.has(currentProfile.id)) return;

        if (!currentUser.is_premium) {
            setPremiumFeatureType(type);
            setShowPremiumModal(true);
            return;
        }

        if (type === 'MESSAGE') {
            try {
                await supabase.from('matches').insert({
                    user1_id: currentUser.id,
                    user2_id: currentProfile.id
                });
                setKnownMatchIds(prev => new Set(prev).add(currentProfile.id));
                onGoToMessages(currentProfile.id);
            } catch (e) {
                onGoToMessages(currentProfile.id);
            }
        } else if (type === 'SUPERLIKE') {
            if (cardRef.current) {
                cardRef.current.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1), opacity 0.4s';
                cardRef.current.style.transform = 'translateY(-150%) scale(0.5)';
                cardRef.current.style.opacity = '0';
                const superBadge = cardRef.current.querySelector('.swipe-badge-super') as HTMLElement;
                if (superBadge) superBadge.style.opacity = '1';
            }
            try {
                await supabase.from('likes').delete().match({ from_user_id: currentUser.id, to_user_id: currentProfile.id });
                await supabase.from('likes').insert({
                    from_user_id: currentUser.id,
                    to_user_id: currentProfile.id,
                    type: 'like',
                    is_super_like: true
                });
                const { count } = await supabase.from('likes').select('*', { count: 'exact', head: true }).match({ from_user_id: currentProfile.id, to_user_id: currentUser.id, type: 'like' });
                if (count && count > 0) {
                    await supabase.from('matches').insert({ user1_id: currentUser.id, user2_id: currentProfile.id });
                    setKnownMatchIds(prev => new Set(prev).add(currentProfile.id));
                    setMatchedProfile(currentProfile);
                }
            } catch (e) { console.error('Erreur Super-Like', e); }
            setTimeout(() => {
                if (cardRef.current) {
                    cardRef.current.style.transition = 'none';
                    cardRef.current.style.transform = 'none';
                    cardRef.current.style.opacity = '1';
                    const superBadge = cardRef.current.querySelector('.swipe-badge-super') as HTMLElement;
                    if (superBadge) superBadge.style.opacity = '0';
                }
                setCurrentIndex(prev => prev + 1);
            }, 350);
        }
    };

    const initPaystack = () => {
        if (!paymentConfig || !paymentConfig.publicKey) {
            alert("Configuration de paiement manquante.");
            return;
        }
        setIsProcessingPayment(true);
        if ((window as any).PaystackPop) { setupPaystack(); return; }
        const script = document.createElement('script');
        script.src = 'https://js.paystack.co/v1/inline.js';
        script.async = true;
        script.onload = () => { setupPaystack(); };
        script.onerror = () => { setIsProcessingPayment(false); alert("Erreur chargement paiement."); };
        document.body.appendChild(script);
    };

    const setupPaystack = () => {
        try {
            if (!currentUser || !paymentConfig) throw new Error("Données manquantes");
            const handler = (window as any).PaystackPop.setup({
                key: paymentConfig.publicKey,
                email: currentUser.email,
                amount: Math.ceil(paymentConfig.amount * 100),
                currency: paymentConfig.currency,
                ref: 'SUBS_' + Math.floor((Math.random() * 1000000000) + 1),
                metadata: { custom_fields: [{ display_name: "Nom", variable_name: "name", value: currentUser.name }] },
                callback: function (response: any) {
                    const processPayment = async () => {
                        try {
                            await supabase.from('payments').insert({ user_id: currentUser.id, amount: paymentConfig.amount, reference: response.reference, status: response.status, gateway: 'PAYSTACK' });

                            const newExpirationDate = new Date();
                            newExpirationDate.setDate(newExpirationDate.getDate() + 30);

                            await supabase.from('profiles').update({
                                is_premium: true,
                                premium_expiration: newExpirationDate.toISOString()
                            }).eq('id', currentUser.id);

                            alert('Paiement réussi ! Abonnement activé pour 1 mois.');
                            setShowPremiumModal(false);
                            window.location.reload();
                        } catch (error) { alert("Erreur activation."); } finally { setIsProcessingPayment(false); }
                    };
                    processPayment();
                },
                onClose: function () { setIsProcessingPayment(false); }
            });
            handler.openIframe();
        } catch (err) { setIsProcessingPayment(false); }
    };

    const handleUpgradePremium = () => { initPaystack(); };
    const handleCloseMatchPopup = () => { setMatchedProfile(null); };
    const handleStartChat = () => { if (matchedProfile) { onGoToMessages(matchedProfile.id); setMatchedProfile(null); } else { onGoToMessages(); } };

    // --- DRAG GESTURES ---
    // --- DRAG GESTURES OPTIMISÉS EN DOM DIRECT (60 FPS FLUIDE) ---
    const onPointerDown = (e: React.MouseEvent | React.TouchEvent) => {
        const profile = filteredMatches[currentIndex];
        if (!profile || knownMatchIds.has(profile.id)) return;

        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

        dragStartRef.current = { x: clientX, y: clientY };
        isDraggingRef.current = true;

        if (cardRef.current) {
            cardRef.current.style.transition = 'none';
            cardRef.current.style.cursor = 'grabbing';
        }
    };

    const onPointerMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDraggingRef.current || !dragStartRef.current || !cardRef.current) return;

        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

        const deltaX = clientX - dragStartRef.current.x;
        const deltaY = clientY - dragStartRef.current.y;
        const rotation = deltaX * 0.08; // rotation douce

        // Mise à jour directe du DOM pour la fluidité à 60 FPS
        cardRef.current.style.transform = `translate(${deltaX}px, ${deltaY}px) rotate(${rotation}deg)`;

        // Gestion des badges en opacité directe
        const likeBadge = cardRef.current.querySelector('.swipe-badge-like') as HTMLElement;
        const nopeBadge = cardRef.current.querySelector('.swipe-badge-nope') as HTMLElement;

        if (deltaX > 20) {
            const likeOpacity = Math.min((deltaX - 20) / 80, 0.9);
            if (likeBadge) likeBadge.style.opacity = likeOpacity.toString();
            if (nopeBadge) nopeBadge.style.opacity = '0';
        } else if (deltaX < -20) {
            const nopeOpacity = Math.min((-deltaX - 20) / 80, 0.9);
            if (nopeBadge) nopeBadge.style.opacity = nopeOpacity.toString();
            if (likeBadge) likeBadge.style.opacity = '0';
        } else {
            if (likeBadge) likeBadge.style.opacity = '0';
            if (nopeBadge) nopeBadge.style.opacity = '0';
        }
    };

    const onPointerUp = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDraggingRef.current || !dragStartRef.current || !cardRef.current) return;

        const clientX = 'changedTouches' in e ? e.changedTouches[0].clientX :
            'touches' in e && e.touches[0] ? e.touches[0].clientX :
                (e as React.MouseEvent).clientX;
        const clientY = 'changedTouches' in e ? e.changedTouches[0].clientY :
            'touches' in e && e.touches[0] ? e.touches[0].clientY :
                (e as React.MouseEvent).clientY;

        const deltaX = clientX - dragStartRef.current.x;
        const deltaY = clientY - dragStartRef.current.y;
        const totalDelta = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        isDraggingRef.current = false;
        dragStartRef.current = null;

        if (cardRef.current) {
            cardRef.current.style.cursor = 'grab';
        }

        if (totalDelta < TAP_THRESHOLD) {
            // Clic simple pour changer de photo
            handleTapNavigation(clientX);
            if (cardRef.current) {
                cardRef.current.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)';
                cardRef.current.style.transform = 'translate(0px, 0px) rotate(0deg)';
            }
        } else if (deltaX > SWIPE_THRESHOLD) {
            // Swipe Droite (LIKE)
            if (cardRef.current) {
                cardRef.current.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1), opacity 0.4s';
                cardRef.current.style.transform = 'translate(150%, 20px) rotate(20deg)';
                cardRef.current.style.opacity = '0';
            }
            handleSwipeAction('right', true);
        } else if (deltaX < -SWIPE_THRESHOLD) {
            // Swipe Gauche (NOPE)
            if (cardRef.current) {
                cardRef.current.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1), opacity 0.4s';
                cardRef.current.style.transform = 'translate(-150%, 20px) rotate(-20deg)';
                cardRef.current.style.opacity = '0';
            }
            handleSwipeAction('left', true);
        } else {
            // Retour au centre si insuffisant
            if (cardRef.current) {
                cardRef.current.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)';
                cardRef.current.style.transform = 'translate(0px, 0px) rotate(0deg)';
                const likeBadge = cardRef.current.querySelector('.swipe-badge-like') as HTMLElement;
                const nopeBadge = cardRef.current.querySelector('.swipe-badge-nope') as HTMLElement;
                if (likeBadge) likeBadge.style.opacity = '0';
                if (nopeBadge) nopeBadge.style.opacity = '0';
            }
        }
    };

    const handleTapNavigation = (clientX: number) => {
        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        const clickX = clientX - rect.left;
        const width = rect.width;
        const currentProfile = filteredMatches[currentIndex];
        const allImages = [currentProfile.imageUrl, ...(currentProfile.photos || [])];

        if (clickX < width / 2) {
            setActiveImageIndex(prev => prev > 0 ? prev - 1 : 0);
        } else {
            setActiveImageIndex(prev => prev < allImages.length - 1 ? prev + 1 : prev);
        }
    };

    const getCardStyle = () => {
        return { touchAction: 'none', cursor: 'grab' };
    };

    const renderStars = (percentage: number) => { const score = Math.round(percentage / 20); return (<div className="flex items-center space-x-0.5 bg-black/30 px-2 py-1 rounded-full backdrop-blur-sm border border-white/10" title={`Compatibilité : ${percentage}%`}>{[...Array(5)].map((_, i) => (<Star key={i} size={14} className={`${i < score ? "fill-amber-400 text-amber-400" : "text-slate-400"}`} />))}</div>); };
    const getCommonInterests = (profile: MatchProfile) => { const myInterests = parseInterests(currentUser?.interests); const theirInterests = parseInterests(profile.interests); return myInterests.filter((i: string) => theirInterests.includes(i)); };

    const handleAnalyzeAI = async () => {
        if (!currentProfile || !currentUser) return;
        setIsAnalyzingAI(true);
        try {
            const result = await generateDeepMatchScore(currentUser, currentProfile);
            if (result) {
                setAiAnalysisResult(result);
            } else {
                alert("Impossible de générer le rapport IA pour le moment.");
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsAnalyzingAI(false);
        }
    };

    const fetchAdmirateurs = async () => {
        if (!currentUser?.id) return;
        setIsLoadingAdmirateurs(true);
        setShowAdmirateurs(true);
        try {
            const { data: likeRows } = await supabase
                .from('likes')
                .select('from_user_id, type')
                .eq('to_user_id', currentUser.id)
                .in('type', ['like', 'superlike']);
            if (!likeRows || likeRows.length === 0) { setAdmirateursList([]); return; }
            const ids = likeRows.map((r: any) => r.from_user_id);
            const superLikeSet = new Set(likeRows.filter((r: any) => r.type === 'superlike').map((r: any) => r.from_user_id));
            const { data: profiles } = await supabase.from('profiles').select('id, full_name, avatar_url, parish').in('id', ids);
            setAdmirateursList((profiles || []).map((p: any) => ({
                id: p.id,
                name: p.full_name || p.name || 'Anonyme',
                avatarUrl: p.avatar_url ? getImlrUrl(p.avatar_url) : `https://ui-avatars.com/api/?name=?&background=random`,
                parish: p.parish,
                isSuperLike: superLikeSet.has(p.id)
            })));
        } catch (e) {
            console.error('Erreur fetchAdmirateurs', e);
        } finally {
            setIsLoadingAdmirateurs(false);
        }
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><Loader className="animate-spin text-emerald-600" /></div>;
    }

    const hasRealAvatar = Boolean((currentUser?.avatar_url || currentUser?.avatarUrl) && 
        !(currentUser?.avatar_url || currentUser?.avatarUrl)?.includes('ui-avatars') && 
        !(currentUser?.avatar_url || currentUser?.avatarUrl)?.includes('picsum'));
    const galleryCount = Array.isArray(currentUser?.photos_urls) ? currentUser.photos_urls.length : (currentUser?.photos?.length || 0);
    const totalRealPhotos = (hasRealAvatar ? 1 : 0) + galleryCount;
    const hasEnoughPhotos = totalRealPhotos >= 3;

    const isVerifiedOrBypassed = currentUser?.role === 'ADMIN' || (
        (currentUser?.verification_status === 'VERIFIED' || 
         currentUser?.verificationStatus === 'VERIFIED' || 
         currentUser?.verificationStatus === VerificationStatus?.VERIFIED || 
         currentUser?.liveness_verified === true) && hasEnoughPhotos
    );

    if (!isVerifiedOrBypassed) {
        return (
            <div className="flex flex-col items-center justify-center text-center px-4 pt-6 pb-12 sm:pt-10 sm:pb-12 sm:px-8 my-auto animate-in fade-in zoom-in duration-300 relative bg-white/95 rounded-3xl border border-slate-200/80 shadow-xl max-w-xl mx-auto w-full">
                <div className="bg-gradient-to-br from-amber-400 to-amber-600 p-4 sm:p-5 rounded-full mb-4 relative shadow-lg shadow-amber-500/25 shrink-0 mt-2">
                    <Shield className="h-10 w-10 sm:h-12 sm:w-12 text-white" />
                    <div className="absolute -bottom-1 -right-1 bg-white p-1.5 rounded-full border-2 border-amber-500 shadow-md">
                        <Lock className="h-4 w-4 text-emerald-700" />
                    </div>
                </div>

                <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 mb-2 tracking-tight">Porte du Discernement</h3>
                <p className="text-slate-600 max-w-md mb-6 text-xs sm:text-sm leading-relaxed px-2">
                    Afin de préserver la pureté et le sérieux des démarches au sein de la communauté <strong>225 Chrétien</strong>, l'accès à l'espace Rencontres requiert la validation de votre profil.
                </p>

                {/* État d'Onboarding Checkpoints (Étapes pour terminer la vérification) */}
                <div className="w-full bg-slate-50/90 rounded-2xl p-4 border border-slate-200 mb-6 space-y-2.5 text-left">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1 px-1">
                        Étapes pour terminer la vérification
                    </p>

                    {/* Étape 1 : Profil & Identité de base */}
                    <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200/60 shadow-2xs">
                        <div className="flex items-center space-x-3">
                            <span className="w-6 h-6 bg-emerald-100 text-emerald-700 font-bold rounded-full flex items-center justify-center text-xs">✓</span>
                            <span className="text-xs sm:text-sm font-semibold text-slate-800">1. Profil & Engagement chrétien</span>
                        </div>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold uppercase">Validé</span>
                    </div>

                    {/* Étape 2 : Pièce d'identité */}
                    <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200/60 shadow-2xs">
                        <div className="flex items-center space-x-3">
                            <span className={`w-6 h-6 font-bold rounded-full flex items-center justify-center text-xs ${
                                currentUser?.verification_status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-700' :
                                currentUser?.verification_status === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                            }`}>
                                {currentUser?.verification_status === 'VERIFIED' ? '✓' : '2'}
                            </span>
                            <span className="text-xs sm:text-sm font-semibold text-slate-800">2. Pièce d'identité (CNI / Passeport)</span>
                        </div>
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                            currentUser?.verification_status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800' :
                            currentUser?.verification_status === 'PENDING' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                            {currentUser?.verification_status === 'VERIFIED' ? 'Validé' :
                             currentUser?.verification_status === 'PENDING' ? 'En cours' : 'À fournir'}
                        </span>
                    </div>

                    {/* Étape 3 : Preuve de vie vidéo */}
                    <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200/60 shadow-2xs">
                        <div className="flex items-center space-x-3">
                            <span className={`w-6 h-6 font-bold rounded-full flex items-center justify-center text-xs ${
                                currentUser?.liveness_verified ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                            }`}>
                                {currentUser?.liveness_verified ? '✓' : '3'}
                            </span>
                            <span className="text-xs sm:text-sm font-semibold text-slate-800">3. Preuve de vie vidéo (5 sec)</span>
                        </div>
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                            currentUser?.liveness_verified ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                            {currentUser?.liveness_verified ? 'Validé' : 'À fournir'}
                        </span>
                    </div>

                    {/* Étape 4 : Galerie photo (3 photos obligatoires) */}
                    <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200/60 shadow-2xs">
                        <div className="flex items-center space-x-3">
                            <span className={`w-6 h-6 font-bold rounded-full flex items-center justify-center text-xs ${
                                hasEnoughPhotos ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                            }`}>
                                {hasEnoughPhotos ? '✓' : '4'}
                            </span>
                            <span className="text-xs sm:text-sm font-semibold text-slate-800">4. Galerie photo (3 photos obligatoires)</span>
                        </div>
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                            hasEnoughPhotos ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                            {hasEnoughPhotos ? 'Validé' : `${totalRealPhotos}/3 photos`}
                        </span>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => {
                        const isVerified = currentUser?.verification_status === 'VERIFIED' || currentUser?.verificationStatus === 'VERIFIED';
                        const targetSubTab = !isVerified ? 'VERIFICATION' : 'PROFIL';
                        if (typeof window !== 'undefined') {
                            sessionStorage.setItem('225_active_tab', 'PROFILE');
                            sessionStorage.setItem('225_profile_subtab', targetSubTab);
                        }
                        if (onGoToProfile) onGoToProfile();
                    }}
                    className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white py-3.5 px-6 rounded-xl font-bold shadow-lg shadow-emerald-700/20 active:scale-95 transition flex items-center justify-center gap-2 text-sm cursor-pointer"
                >
                    <ShieldCheck size={18} />
                    <span>
                        {!hasEnoughPhotos && (currentUser?.verification_status === 'VERIFIED' || currentUser?.verificationStatus === 'VERIFIED')
                            ? "Ajouter mes photos dans mon profil"
                            : "Compléter ma vérification maintenant"}
                    </span>
                </button>
            </div>
        );
    }

    // Récupération dynamique des profils réels vérifiés depuis la base de données
    const currentProfile = matches[currentIndex];
    const isAlreadyMatched = currentProfile ? knownMatchIds.has(currentProfile.id) : false;
    const isDeckEmpty = !currentProfile || matches.length === 0;
    const hasActiveFilters = Boolean(searchQuery || selectedParish || maxDistanceKm !== null);

    return (
        <div className="flex flex-col h-full w-full relative overflow-hidden">

            {/* ADMIRATEURS MODAL */}
            {showAdmirateurs && (
                <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4">
                    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm animate-in fade-in" onClick={() => setShowAdmirateurs(false)} />
                    <div className="bg-white w-full sm:w-[440px] sm:rounded-3xl rounded-t-3xl relative z-10 overflow-hidden max-h-[85dvh] flex flex-col shadow-2xl border border-slate-100 animate-in slide-in-from-bottom duration-200">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-rose-500 to-pink-600 p-5 text-white flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="text-xl font-bold">❤️ Mes Admirateurs</h3>
                                <p className="text-xs text-rose-100 mt-0.5">Personnes ayant aimé votre profil chrétien</p>
                            </div>
                            <button onClick={() => setShowAdmirateurs(false)} className="bg-white/20 p-2 rounded-full hover:bg-white/30 text-white transition cursor-pointer">
                                <X size={18} />
                            </button>
                        </div>
                        {/* Body */}
                        <div className="overflow-y-auto p-4 flex-1 pb-8 sm:pb-4 custom-scrollbar">
                            {isLoadingAdmirateurs ? (
                                <div className="flex justify-center py-10"><Loader className="animate-spin text-rose-400" /></div>
                            ) : admirateursList.length === 0 ? (
                                <div className="text-center py-10 text-slate-400">
                                    <p className="text-4xl mb-2">💤</p>
                                    <p className="font-medium">Personne pour l'instant...</p>
                                    <p className="text-sm">Continuez à swiper pour vous faire remarquer !</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-3">
                                    {admirateursList.map((admirer) => (
                                        <div key={admirer.id} className="relative bg-slate-50 rounded-xl overflow-hidden border border-slate-100 shadow-sm">
                                            <div className="relative aspect-square">
                                                <img
                                                    src={admirer.avatarUrl}
                                                    alt={currentUser?.is_premium ? admirer.name : '?'}
                                                    className={`w-full h-full object-cover ${!currentUser?.is_premium ? 'blur-xl scale-110' : ''}`}
                                                />
                                                {admirer.isSuperLike && (
                                                    <span className="absolute top-2 right-2 bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">⭐ Super</span>
                                                )}
                                                {!currentUser?.is_premium && (
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center p-2">
                                                        <Lock size={20} className="mb-1" />
                                                        <span className="text-xs font-bold">Premium</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="p-2">
                                                <p className="text-sm font-semibold text-slate-800 truncate">
                                                    {currentUser?.is_premium ? admirer.name : '???'}
                                                </p>
                                                <p className="text-xs text-slate-500 truncate">{currentUser?.is_premium ? admirer.parish || '—' : 'Débloquez Premium'}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {!currentUser?.is_premium && admirateursList.length > 0 && (
                                <div className="mt-4 bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-200 rounded-xl p-4 text-center">
                                    <p className="text-sm font-bold text-rose-700 mb-2">🔓 Devenez Premium pour voir qui vous aime !</p>
                                    <p className="text-xs text-rose-500">{admirateursList.length} profil{admirateursList.length > 1 ? 's' : ''} vous attend{admirateursList.length > 1 ? 'ent' : ''}.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* FILTER MODAL */}
            {isFilterModalOpen && (
                <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4">
                    <div 
                        className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200" 
                        onClick={() => setIsFilterModalOpen(false)} 
                    />
                    <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl relative z-10 flex flex-col max-h-[88dvh] sm:max-h-[85dvh] overflow-hidden border border-slate-100 animate-in slide-in-from-bottom duration-200 text-left">
                        {/* Poignée tactile mobile */}
                        <div className="pt-3 pb-1 sm:hidden flex justify-center shrink-0">
                            <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
                        </div>

                        {/* Header */}
                        <div className="px-5 sm:px-6 py-3.5 border-b border-slate-100 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100 shadow-2xs">
                                    <SlidersHorizontal size={19} />
                                </div>
                                <div>
                                    <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight font-display">
                                        Filtres de Découverte
                                    </h3>
                                    <p className="text-[11px] text-slate-500 font-medium">
                                        Trouvez les profils selon vos critères
                                    </p>
                                </div>
                            </div>
                            <button 
                                type="button"
                                onClick={() => setIsFilterModalOpen(false)} 
                                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
                                aria-label="Fermer les filtres"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Corps défilable */}
                        <div className="overflow-y-auto px-5 sm:px-6 py-5 space-y-5 flex-1 custom-scrollbar">
                            {/* Mots-clés */}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
                                    <span>Mots-clés</span>
                                    <span className="text-[10px] text-slate-400 font-normal lowercase">(nom, bio, centres d'intérêt)</span>
                                </label>
                                <div className="relative">
                                    <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                                    <input 
                                        type="text" 
                                        className="w-full pl-10 pr-9 py-2.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm font-medium text-slate-900 transition outline-none" 
                                        placeholder="Ex: Chorale, Abidjan, Musique, Foi..." 
                                        value={searchQuery} 
                                        onChange={(e) => setSearchQuery(e.target.value)} 
                                    />
                                    {searchQuery && (
                                        <button
                                            type="button"
                                            onClick={() => setSearchQuery('')}
                                            className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 p-0.5"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Paroisse / Église */}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
                                    <span>Paroisse / Église</span>
                                    <span className="text-[10px] text-slate-400 font-normal lowercase">(communauté locale)</span>
                                </label>
                                <div className="relative">
                                    <MapPin className="absolute left-3.5 top-3.5 h-4 w-4 text-emerald-600" />
                                    <select 
                                        value={selectedParish} 
                                        onChange={(e) => setSelectedParish(e.target.value)} 
                                        className="w-full pl-10 pr-9 py-2.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm font-semibold text-slate-800 transition appearance-none outline-none cursor-pointer"
                                    >
                                        <option value="">Toutes les paroisses & assemblées</option>
                                        {parishesList.map(parish => (
                                            <option key={parish.id} value={parish.name}>{parish.name}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3.5 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                                </div>
                            </div>

                            {/* Rayon GPS de Proximité */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                                        Rayon GPS de Proximité
                                    </label>
                                    <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                                        {maxDistanceKm === null ? 'Tous (Sans limite)' : `≤ ${maxDistanceKm} km`}
                                    </span>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { label: 'Tous', value: null },
                                        { label: '≤ 5 km', value: 5 },
                                        { label: '≤ 15 km', value: 15 },
                                        { label: '≤ 30 km', value: 30 },
                                        { label: '≤ 75 km', value: 75 },
                                        { label: '≤ 150 km', value: 150 }
                                    ].map(dist => {
                                        const isSelected = maxDistanceKm === dist.value;
                                        return (
                                            <button
                                                key={dist.label}
                                                type="button"
                                                onClick={() => setMaxDistanceKm(dist.value)}
                                                className={`py-2.5 px-2 text-xs font-extrabold rounded-xl border transition-all cursor-pointer active:scale-95 ${
                                                    isSelected
                                                        ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm shadow-emerald-900/20'
                                                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                                                }`}
                                            >
                                                {dist.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Footer fixe avec boutons d'action et marge de sécurité mobile */}
                        <div className="p-4 sm:p-5 bg-slate-50/95 border-t border-slate-100 flex items-center gap-3 shrink-0 pb-7 sm:pb-5">
                            <button 
                                type="button"
                                onClick={handleResetFilters} 
                                className="flex-1 py-3 px-3 text-slate-700 font-bold bg-white hover:bg-slate-100 rounded-xl transition text-xs sm:text-sm cursor-pointer border border-slate-200 shadow-2xs active:scale-95"
                            >
                                Réinitialiser
                            </button>
                            <button 
                                type="button"
                                onClick={handleApplyFilters} 
                                className="flex-[1.6] py-3 px-4 bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-800 hover:to-teal-800 text-white font-extrabold rounded-xl shadow-md shadow-emerald-950/20 transition text-xs sm:text-sm cursor-pointer active:scale-95 flex items-center justify-center gap-2"
                            >
                                <span>Appliquer les filtres</span>
                                {hasActiveFilters && (
                                    <span className="w-2 h-2 rounded-full bg-amber-300 animate-pulse" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* HEADER HARMONISÉ & COMPACT (UX PRO) */}
            <div className="mb-2 px-1 flex-shrink-0 flex items-center justify-between">
                <div>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-[#0D4A2D] font-display tracking-tight leading-tight flex items-center gap-1.5">
                        Bonjour {sanitizeText(currentUser?.full_name?.split(' ')[0] || currentUser?.name?.split(' ')[0], 'Frédi')}
                    </h2>
                    <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
                        Trouvez votre âme sœur chrétienne
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {/* Pastille Filtres */}
                    <button
                        type="button"
                        onClick={() => setIsFilterModalOpen(true)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition cursor-pointer shadow-2xs ${
                            hasActiveFilters
                                ? 'bg-[#0D4A2D] text-amber-200 border-[#0D4A2D]'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                        title="Filtres de recherche"
                    >
                        <SlidersHorizontal size={13} className={hasActiveFilters ? 'text-amber-200' : 'text-[#0D5C3A]'} />
                        <span>Filtres</span>
                    </button>

                    {/* Cloche Notification de la maquette */}
                    <button
                        type="button"
                        onClick={fetchAdmirateurs}
                        className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[#1E3A2B] hover:bg-emerald-50 shadow-2xs transition cursor-pointer relative"
                        title="Mes admirateurs & notifications"
                    >
                        <Bell size={16} className="text-[#0D5C3A]" />
                        {admirateursList.length > 0 && (
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#D4A359] rounded-full animate-ping" />
                        )}
                        {admirateursList.length > 0 && (
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#D4A359] rounded-full" />
                        )}
                    </button>
                </div>
            </div>

            {/* --- SWIPE DECK AVEC EFFET DE CARTES EMPILÉES CONFORME À LA MAQUETTE --- */}
            {isDeckEmpty || !currentProfile ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-[360px] mx-auto">
                    <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center text-2xl shadow-sm mb-4">
                        ✨
                    </div>
                    <h3 className="text-xl font-bold text-[#0D4A2D] mb-2 font-display">
                        Vous avez vu tous les profils !
                    </h3>
                    <p className="text-xs text-slate-600 mb-6 leading-relaxed">
                        Revenez bientôt pour découvrir de nouveaux profils ou réinitialisez pour les revoir dès maintenant.
                    </p>
                    <button
                        type="button"
                        onClick={handleResetHistory}
                        className="px-6 py-2.5 rounded-full bg-gradient-to-r from-[#0D4A2D] to-[#0A3620] text-[#F5CD6D] font-bold text-sm shadow-md hover:scale-105 transition active:scale-95 cursor-pointer flex items-center gap-2"
                    >
                        <RefreshCw size={15} />
                        <span>Revoir les profils</span>
                    </button>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-start h-full w-full max-w-[400px] md:max-w-[420px] mx-auto min-h-0 relative">
                    {/* Cartes empilées discrètes en arrière-plan */}
                    <div className="absolute inset-x-3 -top-1.5 h-6 bg-white/70 rounded-t-[24px] border-t border-x border-slate-200/50 pointer-events-none shadow-2xs" />
                    <div className="absolute -left-1 sm:-left-2 top-8 bottom-8 w-3 bg-white/80 rounded-l-2xl border-l border-y border-slate-200/50 opacity-80 pointer-events-none shadow-xs" />
                    <div className="absolute -right-1 sm:-right-2 top-8 bottom-8 w-3 bg-white/80 rounded-r-2xl border-r border-y border-slate-200/50 opacity-80 pointer-events-none shadow-xs" />

                    {/* CARTE PRINCIPALE BI-TON ÉPURÉE FOND BLANC */}
                    <div
                        ref={cardRef}
                        className="relative w-full h-full bg-white rounded-[26px] sm:rounded-[30px] overflow-hidden z-10 touch-none select-none border border-slate-100 shadow-[0_14px_35px_-8px_rgba(13,92,58,0.12),0_4px_14px_rgba(0,0,0,0.03)] flex flex-col justify-between"
                        style={getCardStyle()}
                        onMouseDown={onPointerDown}
                        onMouseMove={onPointerMove}
                        onMouseUp={onPointerUp}
                        onMouseLeave={onPointerUp}
                        onTouchStart={onPointerDown}
                        onTouchMove={onPointerMove}
                        onTouchEnd={onPointerUp}
                    >
                        {/* Swipe Indicators */}
                        <div className="swipe-badge-like absolute top-6 left-6 border-4 border-[#0D4A2D] text-[#0D4A2D] font-bold text-2xl px-3 py-1 rounded-xl transform -rotate-12 z-30 bg-white/90 backdrop-blur-sm opacity-0 transition-opacity duration-150 pointer-events-none">SE CONNECTER</div>
                        <div className="swipe-badge-nope absolute top-6 right-6 border-4 border-amber-600 text-amber-600 font-bold text-2xl px-3 py-1 rounded-xl transform rotate-12 z-30 bg-white/90 backdrop-blur-sm opacity-0 transition-opacity duration-150 pointer-events-none">PASSER</div>

                        {/* 1. SECTION PHOTO DU PROFIL */}
                        <div className="relative w-full flex-1 min-h-[220px] overflow-hidden rounded-t-[26px] sm:rounded-t-[30px] bg-slate-100">
                            {(() => {
                                const allImages = [currentProfile.imageUrl, ...(currentProfile.photos || [])].filter(Boolean);
                                const safeImageUrl = allImages[activeImageIndex] || currentProfile.imageUrl || getDefaultAvatar(currentProfile.name);
                                return (
                                    <>
                                        <img
                                            src={safeImageUrl}
                                            alt={sanitizeText(currentProfile.name, 'Membre chrétien')}
                                            className="w-full h-full object-cover pointer-events-none"
                                            draggable={false}
                                            loading="eager"
                                            onError={(e) => {
                                                (e.currentTarget as HTMLImageElement).src = getDefaultAvatar(currentProfile.name);
                                            }}
                                        />
                                        {/* Barres d'indicateurs photos en haut */}
                                        {allImages.length > 1 && (
                                            <div className="absolute top-2.5 left-3 right-3 flex space-x-1.5 z-20">
                                                {allImages.map((_, idx) => (
                                                    <div
                                                        key={idx}
                                                        className={`h-1 flex-1 rounded-full shadow-xs transition-colors ${
                                                            idx === activeImageIndex ? 'bg-[#D4A359]' : 'bg-white/60'
                                                        }`}
                                                    />
                                                ))}
                                            </div>
                                        )}

                                        {/* Badge de confiance Chrétien Vérifié */}
                                        <div className="absolute top-6 left-3 z-20">
                                            <span className="inline-flex items-center gap-1 bg-white/90 backdrop-blur-md text-[#0D5C3A] text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-200/60 shadow-xs">
                                                <span>🛡️</span> Profil Vérifié
                                            </span>
                                        </div>

                                        {/* Fondu doux vers le fond blanc */}
                                        <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-white via-white/20 to-transparent pointer-events-none" />
                                    </>
                                );
                            })()}
                        </div>

                        {/* 2. SECTION CONTENU ÉPURÉ FOND BLANC */}
                        <div className="p-3 sm:p-4 bg-white flex flex-col gap-2 shrink-0">

                            {/* A. Nom, Âge & Ville */}
                            <div className="flex justify-between items-center">
                                <h3 className="text-xl sm:text-2xl font-extrabold text-[#0D4A2D] font-display tracking-tight">
                                    {sanitizeText(currentProfile.name, 'Membre chrétien')}, {currentProfile.age || 25}
                                </h3>
                                <div className="flex items-center text-xs font-semibold text-slate-600 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200/80">
                                    <MapPin size={12} className="mr-1 text-[#0D5C3A] shrink-0" />
                                    <span>{sanitizeText(currentProfile.location ? currentProfile.location.split(',')[0] : 'Abidjan')}</span>
                                </div>
                            </div>

                            {/* B. Les 3 Badges de Foi en Français */}
                            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                                <span className="bg-[#EAF3EE] text-[#0D4A2D] text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-[#C2D6CA] flex items-center gap-1 shrink-0">
                                    <span>✝</span>
                                    <span>{sanitizeText(currentProfile.denomination || 'Chrétien')}</span>
                                </span>
                                <span className="bg-[#EAF3EE] text-[#0D4A2D] text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-[#C2D6CA] flex items-center gap-1 shrink-0">
                                    <span>⛪</span>
                                    <span>{sanitizeText(currentProfile.church_involvement || (currentProfile.gender === 'F' ? 'Engagée en paroisse' : 'Engagé en paroisse'))}</span>
                                </span>
                                <span className="bg-[#EAF3EE] text-[#0D4A2D] text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-[#C2D6CA] flex items-center gap-1 shrink-0">
                                    <span>🕊️</span>
                                    <span>{sanitizeText(currentProfile.spiritual_status || (currentProfile.gender === 'F' ? 'Croyante' : 'Croyant'))}</span>
                                </span>
                            </div>

                            {/* C. Bannière Compatibilité Spirituelle (Vert Forêt Impérial & Lueur Dorée) */}
                            <div className="bg-gradient-to-r from-[#0C4328] via-[#093520] to-[#082C1A] text-white rounded-2xl py-2 px-3 border border-[#D4A359]/50 flex items-center justify-between shadow-[0_4px_16px_rgba(13,92,58,0.2)] relative overflow-hidden">
                                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-[#D4A359]/20 via-transparent to-transparent pointer-events-none" />

                                <div className="flex items-center gap-2 relative z-10">
                                    {/* Médaillon Doré Boussole / Croix Lumineuse */}
                                    <div className="w-6 h-6 rounded-full border border-[#E5C178] bg-[#0A3620] flex items-center justify-center shadow-inner shrink-0">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                            <circle cx="12" cy="12" r="9" stroke="#E5C178" strokeWidth="1.6" />
                                            <path d="M12 4 L12 20 M4 12 L20 12" stroke="#E5C178" strokeWidth="1.6" />
                                            <circle cx="12" cy="12" r="2.2" fill="#E5C178" />
                                        </svg>
                                    </div>
                                    <span className="text-xs font-semibold tracking-tight text-[#F7F3EB] font-sans">
                                        Compatibilité Spirituelle
                                    </span>
                                </div>
                                <span className="text-lg font-black text-[#F5CD6D] tracking-tight relative z-10">
                                    {currentProfile.percentage}%
                                </span>
                            </div>

                            {/* D. Lecteur Audio du Témoignage */}
                            <div className="bg-emerald-50/50 text-slate-800 rounded-2xl py-1.5 px-3 border border-emerald-100/90 flex items-center justify-between shadow-2xs">
                                <button
                                    type="button"
                                    onClick={(e) => toggleAudioPlayback(e, currentProfile.id)}
                                    disabled={!currentProfile.testimonial_audio_url}
                                    className={`w-7 h-7 rounded-full text-white flex items-center justify-center transition shadow-xs shrink-0 ${
                                        currentProfile.testimonial_audio_url
                                            ? 'bg-[#0D5C3A] hover:bg-[#09442B] active:scale-95 cursor-pointer'
                                            : 'bg-slate-300 cursor-not-allowed opacity-60'
                                    }`}
                                    title={currentProfile.testimonial_audio_url ? "Écouter le témoignage audio" : "Aucun témoignage vocal disponible"}
                                >
                                    {playingAudioId === currentProfile.id ? (
                                        <Pause size={12} fill="currentColor" />
                                    ) : (
                                        <Play size={12} className="ml-0.5" fill="currentColor" />
                                    )}
                                </button>

                                {/* Onde sonore dorée */}
                                <div className="flex items-center gap-0.5 mx-2.5 flex-1 h-4 justify-center overflow-hidden">
                                    {[25, 45, 65, 35, 80, 55, 95, 70, 85, 45, 90, 65, 35, 75, 50, 65, 40, 25].map((h, i) => (
                                        <span
                                            key={i}
                                            className={`w-0.5 sm:w-1 bg-[#D4A359] rounded-full transition-all ${
                                                playingAudioId === currentProfile.id ? `wave-animate-${(i % 6) + 1}` : ''
                                            }`}
                                            style={{ height: `${h}%` }}
                                        />
                                    ))}
                                </div>

                                <span className="text-[11px] font-bold text-[#0D5C3A] shrink-0">
                                    {playingAudioId === currentProfile.id
                                        ? 'En écoute'
                                        : currentProfile.testimonial_audio_url
                                        ? 'Écouter'
                                        : 'Non renseigné'}
                                </span>

                                {currentProfile.testimonial_audio_url && (
                                    <audio
                                        id={`audio-${currentProfile.id}`}
                                        src={currentProfile.testimonial_audio_url}
                                        preload="none"
                                        onEnded={() => setPlayingAudioId(null)}
                                        onError={() => setPlayingAudioId(null)}
                                    />
                                )}
                            </div>

                            {/* E. Les 3 Boutons d'Action Inférieurs (PARFAITEMENT DÉGAGÉS ET ACCESSIBLES) */}
                            <div className="flex items-center justify-between gap-3 pt-0.5">
                                {/* Bouton Gauche : Bénédiction & Passer */}
                                <button
                                    type="button"
                                    onClick={() => handleSwipeAction('left')}
                                    disabled={isAlreadyMatched}
                                    className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white border-2 border-slate-200 text-slate-400 hover:text-amber-700 hover:border-amber-300 hover:bg-amber-50 shadow-md flex items-center justify-center transition hover:scale-105 active:scale-95 cursor-pointer shrink-0"
                                    title="Bénir & Passer"
                                >
                                    <X size={20} className="stroke-[2.5]" />
                                </button>

                                {/* Bouton Central : Se Connecter */}
                                <button
                                    type="button"
                                    onClick={() => handleSwipeAction('right')}
                                    disabled={isAlreadyMatched}
                                    className="flex-1 h-11 sm:h-12 rounded-full bg-gradient-to-r from-[#0D5C3A] via-[#0b4e31] to-[#083D26] border border-[#D4A359]/70 flex items-center justify-center gap-2 font-extrabold text-xs sm:text-sm text-white shadow-md shadow-emerald-950/20 hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer"
                                >
                                    <Heart size={16} className="fill-[#F5CD6D] text-[#F5CD6D] shrink-0 animate-pulse" />
                                    <span className="tracking-wide text-white">Se Connecter</span>
                                </button>

                                {/* Bouton Droit : Prière d'Intercession */}
                                <button
                                    type="button"
                                    onClick={() => handlePremiumAction('SUPERLIKE')}
                                    disabled={isAlreadyMatched}
                                    className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white border-2 border-[#D4A359]/60 text-[#B98A3C] hover:bg-amber-50 shadow-md flex items-center justify-center transition hover:scale-105 active:scale-95 cursor-pointer shrink-0"
                                    title="Intercession & Prière"
                                >
                                    <Sparkles size={18} className="text-[#B98A3C]" />
                                </button>
                            </div>

                        </div>
                    </div>
                </div>
            )}

            {/* MATCH POPUP */}
            {matchedProfile && (
                <div className="fixed inset-0 z-[160] flex flex-col items-center justify-center p-4 bg-gradient-to-b from-emerald-900/95 to-slate-900/95 backdrop-blur-md animate-in fade-in zoom-in duration-300">
                    <div className="text-center mb-6">
                        <h2 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-white italic" style={{ fontFamily: 'cursive' }}>C'est un Match !</h2>
                        <p className="text-emerald-100 mt-2 text-lg">Vous et {matchedProfile.name} vous plaisez.</p>
                    </div>
                    <div className="flex items-center justify-center space-x-4 mb-8 relative">
                        <div className="relative"><div className="h-28 w-28 rounded-full border-4 border-white bg-slate-200 flex items-center justify-center shadow-2xl overflow-hidden">{currentUser?.avatar_url ? (<img src={getImlrUrl(currentUser?.avatar_url)} alt="Moi" className="w-full h-full object-cover" />) : (<span className="text-2xl font-bold text-slate-400">Moi</span>)}</div></div>
                        <div className="h-12 w-12 bg-white rounded-full flex items-center justify-center absolute z-10 text-emerald-600 shadow-lg"><Star fill="currentColor" className="h-6 w-6" /></div>
                        <div className="relative"><img src={matchedProfile.imageUrl} alt="Them" className="h-28 w-28 rounded-full border-4 border-emerald-500 object-cover shadow-2xl" /></div>
                    </div>
                    {getCommonInterests(matchedProfile).length > 0 && (<div className="mb-8 text-center animate-in slide-in-from-bottom-4 delay-300"><p className="text-emerald-200 text-sm font-medium mb-3 uppercase tracking-widest">Points communs</p><div className="flex flex-wrap justify-center gap-2">{getCommonInterests(matchedProfile).map(interest => (<span key={interest} className="bg-white/20 backdrop-blur-md text-white px-3 py-1 rounded-full text-sm border border-white/30 flex items-center"><Star size={12} className="mr-1 text-yellow-300" fill="currentColor" />{interest}</span>))}</div></div>)}
                    <div className="space-y-4 w-full max-w-xs">
                        <button onClick={handleStartChat} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 px-6 rounded-full shadow-lg flex items-center justify-center transition transform hover:scale-105"><MessageCircle className="mr-2" /> Envoyer un message</button>
                        <button onClick={handleCloseMatchPopup} className="w-full bg-white/10 hover:bg-white/20 text-white font-semibold py-3 px-6 rounded-full border border-white/30 transition">Continuer à chercher</button>
                    </div>
                </div>
            )}

            {/* PREMIUM MODAL */}
            {showPremiumModal && (
                <div className="fixed inset-0 z-[170] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowPremiumModal(false)} />
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-gradient-to-br from-yellow-400 to-orange-500 p-8 text-white text-center">
                            <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                                {premiumFeatureType === 'MESSAGE' ? <MessageCircle size={32} /> : <Star size={32} fill="currentColor" />}
                            </div>
                            <h3 className="text-2xl font-bold">Fonctionnalité Premium</h3>
                            <p className="text-yellow-50 mt-2">{premiumFeatureType === 'MESSAGE' ? "Envoyez des messages directs sans attendre le match !" : "Montrez votre grand intérêt avec un Super Like !"}</p>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="space-y-3">
                                <div className="flex items-center text-slate-700"><CheckCircle size={20} className="text-emerald-500 mr-3" /><span>Messages illimités & directs</span></div>
                                <div className="flex items-center text-slate-700"><CheckCircle size={20} className="text-emerald-500 mr-3" /><span>5 Super Likes par jour</span></div>
                                <div className="flex items-center text-slate-700"><CheckCircle size={20} className="text-emerald-500 mr-3" /><span>Voir qui vous a liké</span></div>
                            </div>
                            <button onClick={handleUpgradePremium} disabled={isProcessingPayment} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl shadow-lg transition flex items-center justify-center"><CreditCard size={20} className="mr-2" /> {isProcessingPayment ? 'Initialisation...' : `Passer Premium (${paymentConfig?.amount || 1500} ${paymentConfig?.currency || 'XOF'})`}</button>
                            <button onClick={() => setShowPremiumModal(false)} className="w-full text-slate-400 hover:text-slate-600 text-sm">Non merci, je reste patient</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
