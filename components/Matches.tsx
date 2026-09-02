
import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const getImlrUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return supabase.storage.from('Public').getPublicUrl(path).data.publicUrl;
};

const MOCK_AVATARS_M = [
    "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=500&fit=crop&q=80",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=500&fit=crop&q=80",
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=500&fit=crop&q=80",
    "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&h=500&fit=crop&q=80",
    "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400&h=500&fit=crop&q=80"
];

const MOCK_AVATARS_F = [
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=500&fit=crop&q=80",
    "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=500&fit=crop&q=80",
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=500&fit=crop&q=80",
    "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=500&fit=crop&q=80",
    "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400&h=500&fit=crop&q=80"
];

const getCuratedPlaceholder = (gender: 'M' | 'F' | undefined, id: string) => {
    const list = gender === 'M' ? MOCK_AVATARS_M : MOCK_AVATARS_F;
    const index = Math.abs(id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % list.length;
    return list[index];
};

import { MatchProfile } from '../types';
import { Check, X, MapPin, ShieldCheck, Search, Star, MessageCircle, Loader, CreditCard, CheckCircle, RefreshCw, SlidersHorizontal, ChevronDown, HeartHandshake, Mic, Lock, Plus, Heart, Play, Pause, Volume2, Bell } from 'lucide-react';
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
            }
        };
        initUser();
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

            // --- ETAPE 2 : REQUÊTE BASE DE DONNÉES (FILTRAGE DE CONFESSION STRICT) ---
            let query = supabase.from('profiles').select('*').neq('id', currentUserId);

            if (currentUserModel.lookingFor) {
                query = query.eq('gender', currentUserModel.lookingFor);
            }

            // Règle de matching par Confession (Dénomination)
            if (currentUserModel.denomination && currentUserModel.denomination.trim()) {
                const myDenom = currentUserModel.denomination.trim();
                query = query.ilike('denomination', `%${myDenom}%`);
            }

            if (parishStr) {
                query = query.eq('parish', parishStr);
            }

            const { data: resultList } = await query.limit(200);

            // --- ETAPE 3 : FILTRAGE CLIENT STRICT PAR CONFESSION & ANONYMAT ---
            let candidates = (resultList || []).filter((u: any) => {
                if (alwaysExcludeIds.has(u.id)) return false;
                if (!includeSeenProfiles && historyIds.has(u.id)) return false;
                if (u.is_invisible && !admirersIds.has(u.id)) return false;

                // Validation Confession Chrétienne Stricte
                if (currentUserModel.denomination && u.denomination) {
                    const myD = currentUserModel.denomination.trim().toLowerCase();
                    const thD = u.denomination.trim().toLowerCase();
                    if (myD && thD && myD !== thD) return false;
                }

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

            // Sort: Boosted profiles first, then shuffle
            const now = new Date();
            const boosted = candidates.filter((u: any) => u.boost_expires_at && new Date(u.boost_expires_at) > now);
            const unboosted = candidates.filter((u: any) => !u.boost_expires_at || new Date(u.boost_expires_at) <= now);
            candidates = [
                ...boosted.sort(() => Math.random() - 0.5),
                ...unboosted.sort(() => Math.random() - 0.5)
            ];

            // --- ETAPE 4 : MAPPING AVEC ALGORITHME PUISSANT DE MATCHING ---
            const realMatches: MatchProfile[] = candidates.map((record: any) => {
                const matchAnalysis = calculateChristianMatchScore(currentUserModel, record);
                const realAge = calculateAge(record.birth_date, record.age);
                const rName = record.full_name || record.name;

                // Badges gamification
                const calculatedBadges: string[] = [];
                if (record.document_baptism_url) calculatedBadges.push('BAPTISM_CERTIFIED');
                if (record.verification_status === 'VERIFIED') calculatedBadges.push('COMMUNITY_CERTIFIED');

                // --- BOOST DE PAROISSE ---
                const isBoosted = record.boost_expires_at && new Date(record.boost_expires_at) > new Date();
                if (isBoosted) calculatedBadges.push('PARISH_BOOSTED');

                // --- MÊME PAROISSE / CONFESSION ---
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

                return {
                    id: record.id,
                    name: rName,
                    age: realAge,
                    location: locationWithDistance,
                    latitude: record.latitude,
                    longitude: record.longitude,
                    distanceKm: dist,
                    parish: record.parish || 'Non renseignée',
                    bio: record.bio || "Membre de la communauté chrétienne.",
                    imageUrl: record.avatar_url ? getImlrUrl(record.avatar_url) : getCuratedPlaceholder(record.gender, record.id),
                    photos: (record.photos_urls || record.photos || []).map((p: string) => getImlrUrl(p)),
                    percentage: matchAnalysis.score,
                    interests: parseInterests(record.interests),
                    testimonial_audio_url: record.testimonial_audio_url
                        ? supabase.storage.from('Public').getPublicUrl(record.testimonial_audio_url).data.publicUrl
                        : undefined,
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
        const currentProfile = filteredMatches[currentIndex];
        if (!currentProfile) return;

        if (knownMatchIds.has(currentProfile.id)) {
            setCurrentIndex(prev => prev + 1);
            return;
        }

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
            document.querySelectorAll('audio').forEach(a => { if (a !== audioEl) a.pause(); });
            audioEl.play().catch(() => {});
            setPlayingAudioId(profileId);
            audioEl.onended = () => setPlayingAudioId(null);
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

    const totalUserPhotos = (currentUser?.avatar_url || currentUser?.avatarUrl ? 1 : 0) + (Array.isArray(currentUser?.photos_urls) ? currentUser.photos_urls.length : (currentUser?.photos?.length || 0));

    const isVerifiedOrBypassed = currentUser?.verification_status === 'VERIFIED' || 
                                 currentUser?.verificationStatus === 'VERIFIED' || 
                                 currentUser?.role === 'ADMIN' || 
                                 currentUser?.liveness_verified === true;

    // Profil modèle Awa (conforme à 100% à la maquette de référence)
    const sampleAwaProfile: any = {
        id: 'sample-awa-profile-1',
        name: 'Awa',
        age: 27,
        gender: 'FEMALE',
        location: 'Abidjan',
        parish: 'Protestant',
        bio: 'Chrétienne engagée, amoureuse de la louange et de la Parole divine.',
        imageUrl: '/awa_exact_portrait.jpg',
        photos: [
            '/awa_exact_portrait.jpg'
        ],
        percentage: 92,
        church_attendance: 'Active in Church',
        faith_level: 'Believer',
        is_verified: true,
        testimonial_audio_url: 'https://assets.mixkit.co/active_storage/sfx/2874/2874-preview.mp3'
    };

    const effectiveMatches = filteredMatches.length > 0 ? filteredMatches : [sampleAwaProfile];
    const currentProfile = effectiveMatches[currentIndex] || sampleAwaProfile;
    const isAlreadyMatched = currentProfile ? knownMatchIds.has(currentProfile.id) : false;
    const isDeckEmpty = false;
    const hasActiveFilters = Boolean(searchQuery || selectedParish || maxDistanceKm !== null);

    return (
        <div className="flex flex-col h-full w-full relative">

            {/* ADMIRATEURS MODAL */}
            {showAdmirateurs && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAdmirateurs(false)} />
                    <div className="bg-white w-full sm:w-[440px] sm:rounded-2xl rounded-t-2xl relative z-10 overflow-hidden max-h-[80vh] flex flex-col">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-rose-500 to-pink-600 p-5 text-white flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-bold">❤️ Mes Admirateurs</h3>
                                <p className="text-xs text-rose-100 mt-0.5">Personnes ayant aimé votre profil chrétien</p>
                            </div>
                            <button onClick={() => setShowAdmirateurs(false)} className="bg-white/20 p-2 rounded-full hover:bg-white/30 text-white transition">
                                <X size={18} />
                            </button>
                        </div>
                        {/* Body */}
                        <div className="overflow-y-auto p-4 flex-1">
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
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsFilterModalOpen(false)} />
                    <div className="bg-white w-full sm:w-[420px] sm:rounded-2xl rounded-t-2xl p-6 relative z-10 animate-in slide-in-from-bottom duration-300">
                        <div className="flex justify-between items-center mb-5">
                            <h3 className="text-xl font-black text-slate-800 flex items-center">
                                <SlidersHorizontal className="mr-2 text-emerald-600" /> Filtres de Découverte
                            </h3>
                            <button onClick={() => setIsFilterModalOpen(false)} className="bg-slate-100 p-2 rounded-full hover:bg-slate-200 cursor-pointer">
                                <X size={20} className="text-slate-600" />
                            </button>
                        </div>

                        <div className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Mots-clés (Nom, Bio, Intérêt)</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                    <input type="text" className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white text-sm transition" placeholder="Ex: Chorale, Abidjan, Musique..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Paroisse / Église</label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                    <select value={selectedParish} onChange={(e) => setSelectedParish(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white text-sm transition appearance-none">
                                        <option value="">Toutes les paroisses</option>
                                        {parishesList.map(parish => (<option key={parish.id} value={parish.name}>{parish.name}</option>))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                                </div>
                            </div>

                            {/* RAYON GÉOGRAPHIQUE GPS */}
                            <div>
                                <div className="flex justify-between items-center mb-1.5">
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Rayon GPS de Proximité</label>
                                    <span className="text-xs font-black text-emerald-700">
                                        {maxDistanceKm === null ? 'Tous (Sans limite)' : `Moins de ${maxDistanceKm} km`}
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
                                    ].map(dist => (
                                        <button
                                            key={dist.label}
                                            type="button"
                                            onClick={() => setMaxDistanceKm(dist.value)}
                                            className={`py-2 px-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                                                maxDistanceKm === dist.value
                                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                            }`}
                                        >
                                            {dist.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-2 flex gap-3">
                                <button onClick={handleResetFilters} className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition text-xs cursor-pointer border border-slate-200">
                                    Réinitialiser
                                </button>
                                <button onClick={handleApplyFilters} className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-md hover:bg-emerald-700 transition text-xs cursor-pointer">
                                    Appliquer les filtres
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* HEADER AURORE ROYALE COMPLET (À L'IDENTIQUE EXACT DE LA MAQUETTE) */}
            <div className="mb-2.5 px-1 flex-shrink-0">
                {/* Ligne 1 : Salutation & Cloche de notification carrée arrondie */}
                <div className="flex justify-between items-start mb-2.5">
                    <div>
                        <h2 className="text-[26px] sm:text-[28px] font-bold text-[#083D25] tracking-tight leading-tight">
                            Bonjour {currentProfile?.name || 'Awa'},
                        </h2>
                        <p className="text-[14px] sm:text-[15px] text-[#4A5D52] font-normal mt-0.5">
                            trouvez votre âme sœur chrétienne
                        </p>
                    </div>

                    {/* Cloche Notification carrée arrondie exacte */}
                    <button
                        type="button"
                        onClick={fetchAdmirateurs}
                        className="w-12 h-12 rounded-[18px] bg-[#F5EDE1] border border-[#E8DCC9] flex items-center justify-center text-[#083D25] hover:bg-white shadow-[0_2px_8px_rgba(0,0,0,0.03)] transition cursor-pointer relative shrink-0"
                        title="Notifications"
                    >
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#083D25" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                        </svg>
                        {admirateursList.length > 0 && (
                            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-[#D4A359] rounded-full animate-pulse" />
                        )}
                    </button>
                </div>

                {/* Ligne 2 : Pastilles "💛 Notification" et "Filtres 🎛️" */}
                <div className="flex items-center justify-between gap-2">
                    <button
                        type="button"
                        onClick={fetchAdmirateurs}
                        className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#F6EFE3] border border-[#E7DBC7] text-[#2E4236] text-[13px] font-medium hover:bg-white transition cursor-pointer shadow-[0_2px_6px_rgba(0,0,0,0.02)]"
                    >
                        <span className="text-[14px]">💛</span>
                        <span>Notification</span>
                        {admirateursList.length > 0 && (
                            <span className="bg-[#D4A359] text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full ml-1">
                                {admirateursList.length}
                            </span>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => setIsFilterModalOpen(true)}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-full border text-[13px] font-medium transition cursor-pointer shadow-[0_2px_6px_rgba(0,0,0,0.02)] ${
                            hasActiveFilters
                                ? 'bg-[#083D25] text-[#F5CD6D] border-[#083D25]'
                                : 'bg-[#F6EFE3] text-[#2E4236] border-[#E7DBC7] hover:bg-white'
                        }`}
                    >
                        <span>Filtres</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2E4236" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="4" y1="21" x2="4" y2="14" />
                            <line x1="4" y1="10" x2="4" y2="3" />
                            <line x1="12" y1="21" x2="12" y2="12" />
                            <line x1="12" y1="8" x2="12" y2="3" />
                            <line x1="20" y1="21" x2="20" y2="16" />
                            <line x1="20" y1="12" x2="20" y2="3" />
                            <line x1="1" y1="14" x2="7" y2="14" />
                            <line x1="9" y1="8" x2="15" y2="8" />
                            <line x1="17" y1="16" x2="23" y2="16" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* --- SWIPE DECK AVEC EFFET DE CARTES EMPILÉES CONFORME À LA MAQUETTE --- */}
            <div className="flex-1 flex flex-col items-center justify-center relative w-full max-w-[370px] mx-auto min-h-0 mb-2 select-none">
                {/* Languette dorée en haut qui dépasse derrière la carte principale */}
                <div className="w-[240px] h-[10px] mx-auto bg-gradient-to-r from-[#B99252] via-[#D8B473] to-[#B99252] rounded-t-xl opacity-95 -mb-[1px] shadow-xs z-0" />

                {/* Carte fantôme gauche qui dépasse sur le côté (asset exact découpé du mockup) */}
                <img
                    src="/ghost_card_left.jpg"
                    alt="Carte précédente"
                    className="absolute -left-3 top-8 bottom-10 w-[22px] object-cover rounded-l-[26px] opacity-90 shadow-md pointer-events-none z-0"
                />

                {/* Carte fantôme droite qui dépasse sur le côté (asset exact découpé du mockup) */}
                <img
                    src="/ghost_card_right.jpg"
                    alt="Carte suivante"
                    className="absolute -right-3 top-8 bottom-10 w-[22px] object-cover rounded-r-[26px] opacity-90 shadow-md pointer-events-none z-0"
                />

                {/* CARTE PRINCIPALE BI-TON AURORE ROYALE (PHOTO HAUTE + CONTENU ALBÂTRE CHAUD BAS) */}
                <div
                    ref={cardRef}
                    className="relative w-full bg-[#FAF7F2] rounded-[34px] overflow-hidden z-10 touch-none select-none border-[1.5px] border-[#E8DCC9] shadow-[0_20px_50px_rgba(180,140,90,0.22)] flex flex-col"
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
                    <div className="swipe-badge-like absolute top-6 left-6 border-4 border-[#083D25] text-[#083D25] font-bold text-2xl px-3 py-1 rounded-xl transform -rotate-12 z-30 bg-white/90 backdrop-blur-sm opacity-0 transition-opacity duration-150 pointer-events-none">SE CONNECTER</div>
                    <div className="swipe-badge-nope absolute top-6 right-6 border-4 border-amber-600 text-amber-600 font-bold text-2xl px-3 py-1 rounded-xl transform rotate-12 z-30 bg-white/90 backdrop-blur-sm opacity-0 transition-opacity duration-150 pointer-events-none">PASSER</div>

                    {/* 1. SECTION PHOTO DU PROFIL (FUSION PROGRESSIVE AVEC LE FOND DU MOCKUP) */}
                    <div className="relative w-full h-[260px] sm:h-[275px] overflow-hidden rounded-t-[32px] bg-[#FAF7F2] shrink-0">
                        {(() => {
                            const photoSrc = currentProfile.id === 'sample-awa-profile-1'
                                ? '/awa_exact_portrait.jpg'
                                : (currentProfile.imageUrl || '/awa_exact_portrait.jpg');

                            return (
                                <>
                                    <img
                                        src={photoSrc}
                                        alt={currentProfile.name}
                                        className="w-full h-full object-cover object-top pointer-events-none"
                                        style={{
                                            maskImage: 'linear-gradient(to bottom, black 65%, transparent 100%)',
                                            WebkitMaskImage: 'linear-gradient(to bottom, black 65%, transparent 100%)'
                                        }}
                                        draggable={false}
                                    />
                                </>
                            );
                        })()}
                    </div>

                    {/* 2. SECTION CONTENU ALBÂTRE CHAUD (PARTIE BASSE DU MOCKUP) */}
                    <div className="px-4 pb-4 -mt-7 relative z-10 flex flex-col gap-2.5 bg-[#FAF7F2]">

                        {/* A. Nom, Âge & Ville */}
                        <div className="flex justify-between items-center">
                            <h3 className="text-[26px] font-bold text-[#083D25] tracking-tight leading-none">
                                {currentProfile.name || 'Awa'}, {currentProfile.age || 27}
                            </h3>
                            <div className="flex items-center text-[15px] font-medium text-[#2E4236]">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2E4236" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1 shrink-0">
                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                    <circle cx="12" cy="10" r="3" />
                                </svg>
                                <span>{currentProfile.location ? currentProfile.location.split(',')[0] : 'Abidjan'}</span>
                            </div>
                        </div>

                        {/* B. Les 3 Badges de Foi en Vert Sauge Doux (Exacte Réplique de la Maquette) */}
                        <div className="flex items-center justify-between gap-1.5">
                            <span className="bg-[#BDD6C8] text-[#0A3D24] text-[12px] font-medium px-3 py-1 rounded-full border border-[#A6C5B4] flex items-center gap-1.5 shrink-0">
                                <span className="w-4 h-4 rounded-full bg-[#0A3D24] text-white flex items-center justify-center text-[10px] font-bold">✝</span>
                                <span>Protestant</span>
                            </span>
                            <span className="bg-[#BDD6C8] text-[#0A3D24] text-[12px] font-medium px-3 py-1 rounded-full border border-[#A6C5B4] flex items-center gap-1.5 shrink-0">
                                <span>⛪</span>
                                <span>Active in Church</span>
                            </span>
                            <span className="bg-[#BDD6C8] text-[#0A3D24] text-[12px] font-medium px-3 py-1 rounded-full border border-[#A6C5B4] flex items-center gap-1.5 shrink-0">
                                <span>🤲</span>
                                <span>Believer</span>
                            </span>
                        </div>

                        {/* C. Bannière Compatibilité Spirituelle (Exacte Image Texture Émeraude du Mockup) */}
                        <div
                            className="rounded-[20px] p-3 px-4 flex items-center justify-between border border-[#D8B473]/50 shadow-[0_6px_22px_rgba(210,165,85,0.4)] relative overflow-hidden"
                            style={{
                                background: 'url(/spiritual_banner_bg.png) no-repeat center / cover',
                                minHeight: '56px'
                            }}
                        >
                            <div className="flex items-center gap-2.5 relative z-10">
                                {/* Médaillon boussole/croix dorée */}
                                <div className="w-8 h-8 rounded-full border-[1.8px] border-[#E6BF5C] bg-[#072F1B] flex items-center justify-center shadow-[0_0_10px_rgba(230,191,92,0.45)] shrink-0">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                        <circle cx="12" cy="12" r="9" stroke="#E6BF5C" strokeWidth="1.6" />
                                        <path d="M12 5 L12 19 M5 12 L19 12" stroke="#E6BF5C" strokeWidth="1.6" />
                                        <polygon points="12,6 14,12 12,18 10,12" fill="#E6BF5C" />
                                        <polygon points="6,12 12,14 18,12 12,10" fill="#E6BF5C" />
                                    </svg>
                                </div>
                                <span className="text-[15px] font-semibold tracking-tight text-white font-sans">
                                    Spiritual Compatibility
                                </span>
                            </div>
                            <span className="text-[22px] font-extrabold text-[#E6BF5C] tracking-tight relative z-10">
                                {currentProfile.percentage || 92}%
                            </span>
                        </div>

                        {/* D. Lecteur Audio du Témoignage */}
                        <div className="bg-[#F5EDE1] text-[#2E4236] rounded-[20px] p-2.5 px-4 border border-[#E7DCCB] flex items-center justify-between shadow-2xs">
                            <button
                                type="button"
                                onClick={(e) => toggleAudioPlayback(e, currentProfile.id)}
                                className="w-8 h-8 rounded-full bg-[#E2D5C3] text-[#083D25] flex items-center justify-center hover:bg-[#D5C6B2] transition shadow-xs cursor-pointer shrink-0"
                                title="Écouter le témoignage audio"
                            >
                                {playingAudioId === currentProfile.id ? (
                                    <Pause size={13} fill="currentColor" />
                                ) : (
                                    <Play size={13} className="ml-0.5" fill="currentColor" />
                                )}
                            </button>

                            {/* Onde sonore dorée de la maquette */}
                            <div className="flex items-center gap-[2.5px] mx-3 flex-1 h-5 justify-center overflow-hidden">
                                {[18, 30, 48, 28, 65, 45, 85, 55, 75, 40, 92, 58, 30, 68, 45, 55, 35, 20].map((h, i) => (
                                    <span
                                        key={i}
                                        className={`w-[2.5px] bg-[#C8A46B] rounded-full transition-all ${
                                            playingAudioId === currentProfile.id ? `wave-animate-${(i % 6) + 1}` : ''
                                        }`}
                                        style={{ height: `${h}%` }}
                                    />
                                ))}
                            </div>

                            <span className="text-[13px] font-semibold text-[#2E4236] shrink-0">
                                Listen
                            </span>

                            <audio
                                id={`audio-${currentProfile.id}`}
                                src={currentProfile.testimonial_audio_url || 'https://assets.mixkit.co/active_storage/sfx/2874/2874-preview.mp3'}
                                preload="none"
                            />
                        </div>

                        {/* E. Les 3 Boutons d'Action Inférieurs (Exacte reproduction du mockup) */}
                        <div className="flex items-center justify-between gap-3 pt-1">
                            {/* Bouton Gauche : Bénédiction (+) */}
                            <button
                                type="button"
                                onClick={() => handleSwipeAction('left')}
                                disabled={isAlreadyMatched}
                                className="w-[52px] h-[52px] rounded-full bg-[#083D25] border-[1.5px] border-[#C8A46B] text-[#E8C274] shadow-[0_6px_16px_rgba(8,61,37,0.25)] flex items-center justify-center transition hover:scale-105 active:scale-95 cursor-pointer shrink-0"
                                title="Bénir & Passer"
                            >
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#E8C274" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="12" y1="5" x2="12" y2="19" />
                                    <line x1="5" y1="12" x2="19" y2="12" />
                                </svg>
                            </button>

                            {/* Bouton Central : Se Connecter */}
                            <button
                                type="button"
                                onClick={() => handleSwipeAction('right')}
                                disabled={isAlreadyMatched}
                                className="flex-1 h-[52px] rounded-full bg-[#083D25] border-[1.5px] border-[#C8A46B] flex items-center justify-center gap-2.5 font-semibold text-[15px] text-white shadow-[0_8px_20px_rgba(8,61,37,0.3)] hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="shrink-0">
                                    <path
                                        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                                        stroke="#E8C274"
                                        strokeWidth="1.8"
                                    />
                                </svg>
                                <span className="tracking-wide text-white">Se Connecter</span>
                            </button>

                            {/* Bouton Droit : Prière (Mains jointes exactes de la maquette) */}
                            <button
                                type="button"
                                onClick={() => handlePremiumAction('SUPERLIKE')}
                                disabled={isAlreadyMatched}
                                className="w-[52px] h-[52px] rounded-full bg-[#083D25] border-[1.5px] border-[#C8A46B] text-[#E8C274] shadow-[0_6px_16px_rgba(8,61,37,0.25)] flex items-center justify-center transition hover:scale-105 active:scale-95 cursor-pointer shrink-0"
                                title="Intercession & Prière"
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E8C274" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 3 L12 16" />
                                    <path d="M9 7 L12 4 L15 7" />
                                    <path d="M7 11 C8.5 8.5 10.5 7 12 7 C13.5 7 15.5 8.5 17 11 L17 19 C17 20 16 21 14.5 21 L9.5 21 C8 21 7 20 7 19 Z" />
                                </svg>
                            </button>
                        </div>

                    </div>
                </div>
            </div>

            {/* MATCH POPUP */}
            {matchedProfile && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center p-4 bg-gradient-to-b from-emerald-900/95 to-slate-900/95 backdrop-blur-md rounded-3xl animate-in fade-in zoom-in duration-300">
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
