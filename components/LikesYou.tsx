import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Heart, Lock, Loader, Zap, CheckCircle, Sparkles, MessageCircle, ArrowRight, ShieldCheck, X } from 'lucide-react';
import { MatchProfile } from '../types';

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

interface LikesYouProps {
    onLikeProcessed?: () => void;
    onGoToMessages?: (contactId: string) => void;
}

const parseInterests = (interests: any): string[] => {
    if (Array.isArray(interests)) return interests;
    if (typeof interests === 'string') {
        if (interests.startsWith('[')) {
            try { return JSON.parse(interests); } catch (e) { return []; }
        }
        return interests.split(',').map(s => s.trim()).filter(Boolean);
    }
    return [];
};

export const LikesYou: React.FC<LikesYouProps> = ({ onLikeProcessed, onGoToMessages }) => {
    const [likers, setLikers] = useState<MatchProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showPremiumModal, setShowPremiumModal] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [newLikeNotification, setNewLikeNotification] = useState<string | null>(null);

    // Modal Célébration Match Instantané
    const [matchedProfile, setMatchedProfile] = useState<MatchProfile | null>(null);

    const [currentUser, setCurrentUser] = useState<any>(null);


    useEffect(() => {
        const initUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
                setCurrentUser({ ...session.user, ...profile });
            }
        };
        initUser();
    }, []);

    const isPremium = currentUser?.is_premium || false;

    // ── Temps réel : Écoute instantanée des nouveaux Likes reçus ──
    useEffect(() => {
        if (!currentUser?.id) return;
        fetchLikers();

        const channel = supabase.channel(`likes_realtime:${currentUser.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'likes',
                filter: `to_user_id=eq.${currentUser.id}`
            }, async (payload: any) => {
                const fromId = payload.new?.from_user_id;
                if (fromId) {
                    const { data: sender } = await supabase.from('profiles').select('*').eq('id', fromId).maybeSingle();
                    const senderName = sender?.full_name || 'Un membre chrétien';
                    setNewLikeNotification(`✨ ${senderName} vient d'aimer votre profil !`);
                    fetchLikers();
                    setTimeout(() => setNewLikeNotification(null), 5000);
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentUser?.id]);

    const fetchLikers = async () => {
        if (!currentUser) return;
        setIsLoading(true);
        try {
            const { data: likesReceived } = await supabase
                .from('likes')
                .select('*, from_user:profiles!from_user_id(*)')
                .eq('to_user_id', currentUser.id)
                .eq('type', 'like')
                .order('created_at', { ascending: false });

            const { data: existingMatches } = await supabase
                .from('matches')
                .select('user1_id, user2_id')
                .or(`user1_id.eq.${currentUser.id},user2_id.eq.${currentUser.id}`);

            const matchedUserIds = new Set<string>();
            (existingMatches || []).forEach((m: any) => {
                if (m.user1_id === currentUser.id) matchedUserIds.add(m.user2_id);
                if (m.user2_id === currentUser.id) matchedUserIds.add(m.user1_id);
            });

            const profiles: MatchProfile[] = (likesReceived || [])
                .map((like: any) => {
                    const profile = like.from_user;
                    if (!profile || matchedUserIds.has(profile.id)) return null;

                    const rName = profile.full_name || profile.name || 'Membre Chrétien';
                    const interests = parseInterests(profile.interests);
                    const isCertif = profile.verification_status === 'VERIFIED';
                    const avatar = profile.avatar_url ? getImlrUrl(profile.avatar_url) : getCuratedPlaceholder(profile.gender as 'M' | 'F' | undefined, profile.id);

                    return {
                        id: profile.id,
                        name: rName,
                        age: profile.baptism_year ? (new Date().getFullYear() - profile.baptism_year + 18) : 26,
                        location: profile.location || 'Abidjan',
                        parish: profile.parish || 'Paroisse Chrétienne',
                        denomination: profile.denomination || 'Catholique',
                        bio: profile.bio || 'Recherche une relation sérieuse fondée sur la foi.',
                        imageUrl: avatar,
                        photos: profile.photos && profile.photos.length > 0 ? profile.photos.map(getImlrUrl) : [avatar],
                        percentage: 95,
                        interests: interests,
                        badges: isCertif ? ['Certifié'] : []
                    };
                })
                .filter((p: any) => p !== null);

            setLikers(profiles);
        } catch (e) {
            console.error("Erreur chargement likes", e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleMatchBack = async (profile: MatchProfile) => {
        if (!isPremium) {
            setShowPremiumModal(true);
            return;
        }

        setIsProcessing(true);
        try {
            await supabase.from('matches').insert({
                user1_id: currentUser!.id,
                user2_id: profile.id
            });

            try {
                await supabase.from('likes').insert({
                    from_user_id: currentUser!.id,
                    to_user_id: profile.id,
                    type: 'like'
                });
            } catch (e) { }

            setLikers(prev => prev.filter(p => p.id !== profile.id));

            if (onLikeProcessed) onLikeProcessed();

            // Célébration instantanée de Match !
            setMatchedProfile(profile);

        } catch (e) {
            alert("Une erreur est survenue lors du match.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDismiss = async (profileId: string) => {
        if (!isPremium) return;
        if (!confirm("Supprimer ce like ?")) return;

        try {
            await supabase.from('likes').delete().match({ to_user_id: currentUser!.id, from_user_id: profileId });
            setLikers(prev => prev.filter(p => p.id !== profileId));
            if (onLikeProcessed) onLikeProcessed();
        } catch (e) {
            console.error(e);
        }
    };

    if (isLoading) return <div className="flex justify-center items-center h-64"><Loader className="animate-spin text-emerald-600 h-8 w-8" /></div>;

    return (
        <div className="h-full flex flex-col animate-in fade-in pb-20 relative">

            {/* Notification de Like Temps Réel */}
            {newLikeNotification && (
                <div className="fixed top-20 right-4 z-50 bg-gradient-to-r from-emerald-600 to-teal-700 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce border border-white/20">
                    <Sparkles className="h-5 w-5 text-amber-300 animate-spin" />
                    <span className="font-bold text-xs sm:text-sm">{newLikeNotification}</span>
                </div>
            )}

            {/* Header */}
            <div className="mb-6 flex justify-between items-center px-2">
                <div>
                    <h2 className="text-2xl font-extrabold text-slate-800 flex items-center">
                        Ils vous aiment <span className="bg-emerald-100 text-emerald-700 text-sm px-3 py-1 rounded-full ml-3 font-bold">{likers.length}</span>
                    </h2>
                    <p className="text-slate-500 text-xs sm:text-sm mt-1">Découvrez instantanément qui souhaite vous rencontrer.</p>
                </div>
                {!isPremium && (
                    <div className="bg-amber-100 text-amber-800 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center shadow-xs">
                        <Lock size={14} className="mr-1.5 text-amber-600" /> Premium
                    </div>
                )}
            </div>

            {/* Liste des Likers */}
            {likers.length === 0 ? (
                <div className="bg-white rounded-3xl p-10 text-center border border-slate-200/80 shadow-xs my-auto max-w-md mx-auto">
                    <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                        <Heart size={32} />
                    </div>
                    <h3 className="font-extrabold text-lg text-slate-800 mb-1">Aucun nouveau coup de cœur</h3>
                    <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
                        Soyez patient(e) et gardez la foi ! Votre profil est visible par des célibataires chrétiens engagés.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {likers.map((profile) => (
                        <div key={profile.id} className="bg-white rounded-2xl overflow-hidden border border-slate-200/80 shadow-sm hover:shadow-md transition duration-300 flex flex-col group relative">
                            <div className="relative aspect-[4/5] overflow-hidden bg-slate-100">
                                <img
                                    src={profile.imageUrl}
                                    alt={profile.name}
                                    className={`w-full h-full object-cover transition duration-500 group-hover:scale-105 ${!isPremium ? 'blur-md scale-110' : ''}`}
                                />

                                {!isPremium && (
                                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center text-white">
                                        <div className="p-3 bg-white/20 rounded-full mb-2">
                                            <Lock size={20} />
                                        </div>
                                        <p className="text-xs font-bold">Activer Premium pour révéler</p>
                                    </div>
                                )}

                                {isPremium && profile.badges?.includes('Certifié') && (
                                    <span className="absolute top-2 left-2 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center shadow-md">
                                        <ShieldCheck size={11} className="mr-0.5" /> Certifié
                                    </span>
                                )}
                            </div>

                            <div className="p-3 flex-1 flex flex-col justify-between">
                                <div>
                                    <h4 className="font-bold text-slate-800 text-sm truncate">
                                        {isPremium ? profile.name : 'Membre Anonyme'}
                                    </h4>
                                    <p className="text-slate-500 text-[11px] truncate">{profile.parish}</p>
                                </div>

                                {isPremium ? (
                                    <button
                                        onClick={() => handleMatchBack(profile)}
                                        disabled={isProcessing}
                                        className="mt-3 w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 rounded-xl transition shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 active:scale-95"
                                    >
                                        <Heart size={14} fill="currentColor" /> Matcher en retour
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => setShowPremiumModal(true)}
                                        className="mt-3 w-full bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold py-2 rounded-xl transition shadow-md shadow-amber-500/20 flex items-center justify-center gap-1"
                                    >
                                        <Zap size={14} /> Débloquer
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* --- MODAL CELEBRATION MATCH INSTANTANÉ --- */}
            {matchedProfile && (
                <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in zoom-in duration-300">
                    <div className="bg-gradient-to-b from-emerald-900 to-slate-900 rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center text-white border border-emerald-500/30 shadow-2xl relative">
                        <button
                            onClick={() => setMatchedProfile(null)}
                            className="absolute top-4 right-4 text-emerald-200 hover:text-white p-1 rounded-full bg-white/10"
                        >
                            <X size={20} />
                        </button>

                        <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/30 animate-pulse">
                            <Heart size={32} className="text-white" fill="currentColor" />
                        </div>

                        <h3 className="text-2xl font-extrabold text-white mb-1">C'est un Match !</h3>
                        <p className="text-emerald-200 text-xs sm:text-sm mb-6">
                            Vous et <strong>{matchedProfile.name}</strong> vous êtes appréciés mutuellement dans la foi !
                        </p>

                        <div className="flex items-center justify-center space-x-4 mb-8">
                            <img
                                src={currentUser?.avatar_url ? getImlrUrl(currentUser.avatar_url) : `https://ui-avatars.com/api/?name=${currentUser?.full_name || 'M'}&background=10b981&color=fff`}
                                alt="Vous"
                                className="w-20 h-20 rounded-full object-cover border-4 border-emerald-500 shadow-xl"
                            />
                            <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center font-bold text-white text-xs shadow-md">
                                ❤️
                            </div>
                            <img
                                src={matchedProfile.imageUrl}
                                alt={matchedProfile.name}
                                className="w-20 h-20 rounded-full object-cover border-4 border-amber-500 shadow-xl"
                            />
                        </div>

                        <div className="space-y-3">
                            {onGoToMessages && (
                                <button
                                    onClick={() => {
                                        const contactId = matchedProfile.id;
                                        setMatchedProfile(null);
                                        onGoToMessages(contactId);
                                    }}
                                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 text-sm transition active:scale-95"
                                >
                                    <MessageCircle size={18} /> Envoyer un message instantané
                                </button>
                            )}

                            <button
                                onClick={() => setMatchedProfile(null)}
                                className="w-full bg-white/10 hover:bg-white/20 text-slate-200 font-semibold py-2.5 px-4 rounded-xl text-xs transition"
                            >
                                Continuer d'explorer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Premium */}
            {showPremiumModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95">
                        <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Zap size={28} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">Débloquez les Coups de Cœur</h3>
                        <p className="text-slate-500 text-xs mb-6">
                            Découvrez qui s'intéresse à vous et matchez instantanément sans attendre !
                        </p>
                        <button
                            onClick={() => {
                                alert("Rendez-vous sur l'onglet 'Mon Profil' pour souscrire au Pass Premium.");
                                setShowPremiumModal(false);
                            }}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-lg transition text-xs mb-2"
                        >
                            En savoir plus sur le Pass Premium
                        </button>
                        <button
                            onClick={() => setShowPremiumModal(false)}
                            className="text-slate-400 text-xs hover:text-slate-600"
                        >
                            Plus tard
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
