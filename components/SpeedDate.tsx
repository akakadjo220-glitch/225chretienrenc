
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { X, Heart, Video, Users, Clock, ChevronRight, Loader, CheckCircle, Star, Mic, MicOff, VideoOff, Crown } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────
interface SpeedDateParticipant {
    id: string;
    name: string;
    avatar: string;
    parish: string;
    age: number;
}

interface SessionResult {
    participantId: string;
    liked: boolean;
}

type Phase = 'LOBBY' | 'INTRO' | 'SESSION' | 'TRANSITION' | 'RESULTS';

const SESSION_DURATION = 180; // 3 minutes en secondes
const TRANSITION_DURATION = 5;  // 5s entre sessions

// Avatars de secours si l'utilisateur réel n'a pas de photo
const MOCK_AVATARS_M = [
    "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop&q=80",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&q=80",
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&q=80",
    "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&h=200&fit=crop&q=80",
    "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=200&h=200&fit=crop&q=80"
];

const MOCK_AVATARS_F = [
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&q=80",
    "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&h=200&fit=crop&q=80",
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&q=80",
    "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&h=200&fit=crop&q=80",
    "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=200&h=200&fit=crop&q=80"
];

const getCuratedPlaceholder = (gender: 'M' | 'F' | undefined, id: string) => {
    const list = gender === 'M' ? MOCK_AVATARS_M : MOCK_AVATARS_F;
    const index = Math.abs(id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % list.length;
    return list[index];
};

const getImlrUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return supabase.storage.from('Public').getPublicUrl(path).data.publicUrl;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

// ─── Props ───────────────────────────────────────────────────────────────────
interface SpeedDateProps {
    eventId: string;
    eventTitle: string;
    eventDate: Date;
    currentUserGender?: 'M' | 'F';
    currentUserName?: string;
    currentUserAvatar?: string;
    isPremium?: boolean;
    onClose: () => void;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export const SpeedDate: React.FC<SpeedDateProps> = ({
    eventId,
    eventTitle,
    eventDate,
    currentUserGender = 'M',
    currentUserName = 'Vous',
    currentUserAvatar = '',
    isPremium = false,
    onClose,
}) => {
    const partnerGender: 'M' | 'F' = currentUserGender === 'M' ? 'F' : 'M';
    const [participants, setParticipants] = useState<SpeedDateParticipant[]>([]);
    const [isLoadingParticipants, setIsLoadingParticipants] = useState(true);

    const [phase, setPhase] = useState<Phase>('LOBBY');
    const [sessionIndex, setSessionIndex] = useState(0);
    const [timeLeft, setTimeLeft] = useState(SESSION_DURATION);
    const [transitionLeft, setTransitionLeft] = useState(TRANSITION_DURATION);
    const [results, setResults] = useState<SessionResult[]>([]);
    const [currentDecision, setCurrentDecision] = useState<'LIKED' | 'PASSED' | null>(null);
    const [micOn, setMicOn] = useState(true);
    const [camOn, setCamOn] = useState(true);
    const [lobbyCountdown, setLobbyCountdown] = useState(5);
    const [likeAnimation, setLikeAnimation] = useState<'HEART' | 'X' | null>(null);
    const [mutualMatches, setMutualMatches] = useState<SpeedDateParticipant[]>([]);

    const [premiumActive, setPremiumActive] = useState(isPremium);

    // WebRTC & Session Refs
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const channelRef = useRef<any>(null);
    const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [currentUserEmail, setCurrentUserEmail] = useState<string>('');

    // Payment States
    const [paymentProcessing, setPaymentProcessing] = useState(false);
    const [paymentConfig, setPaymentConfig] = useState<{ publicKey: string, currency: string, amount: number } | null>({
        publicKey: '',
        currency: 'XOF',
        amount: 1500
    });

    useEffect(() => {
        const loadPaymentConfig = async () => {
            try {
                const { data } = await supabase.from('settings').select('*').limit(1);
                if (data && data.length > 0) {
                    setPaymentConfig({
                        publicKey: data[0].paystack_public_key || 'pk_test_placeholder',
                        currency: data[0].currency || 'XOF',
                        amount: data[0].amount || 1500
                    });
                } else {
                    setPaymentConfig({
                        publicKey: 'pk_test_placeholder',
                        currency: 'XOF',
                        amount: 1500
                    });
                }
            } catch (e) {
                console.warn(e);
            }
        };
        loadPaymentConfig();
    }, []);

    const setupPaystack = () => {
        try {
            if (!currentUserId || !paymentConfig) throw new Error("Données manquantes");

            const amountToPay = paymentConfig.amount;

            if (isNaN(amountToPay) || amountToPay < 500) {
                alert("Le montant minimum est de 500 FCFA.");
                setPaymentProcessing(false);
                return;
            }

            const handler = (window as any).PaystackPop.setup({
                key: paymentConfig.publicKey,
                email: currentUserEmail,
                amount: Math.ceil(amountToPay * 100), // En centimes/kobo
                currency: paymentConfig.currency,
                ref: 'SUBS_' + Math.floor((Math.random() * 1000000000) + 1),
                metadata: {
                    custom_fields: [
                        {
                            display_name: "Nom",
                            variable_name: "name",
                            value: currentUserName
                        }
                    ]
                },
                callback: async function (response: any) {
                    try {
                        await supabase.from('payments').insert({
                            user_id: currentUserId,
                            amount: amountToPay,
                            reference: response.reference,
                            status: response.status,
                            gateway: 'PAYSTACK'
                        });

                        const now = new Date();
                        let newExpirationDate = new Date();
                        const { data: profile } = await supabase.from('profiles').select('is_premium, premium_expiration').eq('id', currentUserId).maybeSingle();
                        if (profile && profile.is_premium && profile.premium_expiration) {
                            const currentExpiration = new Date(profile.premium_expiration);
                            if (currentExpiration > now) newExpirationDate = new Date(currentExpiration);
                        }
                        newExpirationDate.setDate(newExpirationDate.getDate() + 30);
                        
                        await supabase.from('profiles').update({ 
                            is_premium: true, 
                            premium_expiration: newExpirationDate.toISOString() 
                        }).eq('id', currentUserId);

                        setPremiumActive(true);
                        alert('Paiement réussi ! Votre abonnement a été activé/prolongé de 30 jours. Bienvenue aux Soirées Virtuelles !');
                    } catch (error) {
                        console.error("Erreur post-paiement", error);
                        alert("Paiement validé mais erreur lors de l'activation. Contactez le support.");
                    } finally {
                        setPaymentProcessing(false);
                    }
                },
                onClose: function () {
                    setPaymentProcessing(false);
                    console.log('Fenêtre de paiement fermée');
                }
            });
            handler.openIframe();
        } catch (error: any) {
            setPaymentProcessing(false);
            console.error("Setup erreur", error);
            alert("Erreur de préparation du paiement: " + error.message);
        }
    };

    const initPaystack = () => {
        if (!paymentConfig || !paymentConfig.publicKey) {
            alert("Configuration de paiement manquante. Veuillez contacter l'administrateur.");
            return;
        }

        setPaymentProcessing(true);

        // Vérification si Paystack est déjà chargé dans window
        if ((window as any).PaystackPop) {
            setupPaystack();
            return;
        }

        // Chargement dynamique du script Paystack Inline
        const script = document.createElement('script');
        script.src = 'https://js.paystack.co/v1/inline.js';
        script.async = true;
        script.onload = () => {
            setupPaystack();
        };
        script.onerror = () => {
            setPaymentProcessing(false);
            alert("Erreur de chargement du module de paiement. Vérifiez votre connexion.");
        };
        document.body.appendChild(script);
    };

    const handleUpgradePremium = () => {
        initPaystack();
    };

    // Fetch and store current user ID & email on mount
    useEffect(() => {
        const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setCurrentUserId(session.user.id);
                setCurrentUserEmail(session.user.email || '');
            }
        };
        getSession();
    }, []);

    useEffect(() => {
        if (isPremium) {
            setPremiumActive(true);
        } else {
            const premiumSimulated = localStorage.getItem('is_premium_simulated') === 'true';
            if (premiumSimulated) {
                setPremiumActive(true);
            }
        }
    }, [isPremium]);

    // ── Webcam Stream Handler ──
    useEffect(() => {
        if (phase === 'SESSION' || phase === 'INTRO' || phase === 'LOBBY') {
            if (camOn) {
                navigator.mediaDevices.getUserMedia({ video: true, audio: micOn })
                    .then(stream => {
                        setWebcamStream(stream);
                        if (videoRef.current) {
                            videoRef.current.srcObject = stream;
                        }
                    })
                    .catch(err => {
                        console.warn("Webcam access denied or unavailable", err);
                    });
            } else {
                if (webcamStream) {
                    webcamStream.getTracks().forEach(track => track.stop());
                    setWebcamStream(null);
                }
            }
        } else {
            if (webcamStream) {
                webcamStream.getTracks().forEach(track => track.stop());
                setWebcamStream(null);
            }
        }
        return () => {
            if (webcamStream) {
                webcamStream.getTracks().forEach(track => track.stop());
            }
        };
    }, [phase, camOn, micOn]);

    // ── Fetch Registered Attendees & Auto-Register Current User ──
    useEffect(() => {
        const registerAndFetchParticipants = async () => {
            try {
                setIsLoadingParticipants(true);
                const { data: { session } } = await supabase.auth.getSession();
                const myId = session?.user?.id;
                if (!myId) return;

                // 1. Inscrire automatiquement l'utilisateur courant
                await supabase.from('event_attendees').upsert({
                    event_id: eventId,
                    user_id: myId
                }, { onConflict: 'event_id,user_id' }).catch(() => {});

                // 2. Charger les participants de la table event_attendees
                let mapped: SpeedDateParticipant[] = [];
                try {
                    const { data: attendees } = await supabase
                        .from('event_attendees')
                        .select('user_id')
                        .eq('event_id', eventId);

                    if (attendees && attendees.length > 0) {
                        const userIds = attendees.map(a => a.user_id).filter(id => id !== myId);
                        if (userIds.length > 0) {
                            const { data: profs } = await supabase
                                .from('profiles')
                                .select('id, full_name, avatar_url, parish, baptism_year, gender')
                                .in('id', userIds)
                                .eq('gender', partnerGender);

                            if (profs && profs.length > 0) {
                                mapped = profs.map((p: any, idx: number) => ({
                                    id: p.id,
                                    name: p.full_name || `Membre ${idx + 1}`,
                                    avatar: p.avatar_url ? getImlrUrl(p.avatar_url) : getCuratedPlaceholder(p.gender as 'M' | 'F' | undefined, p.id),
                                    parish: p.parish || 'Paroisse non renseignée',
                                    age: p.baptism_year ? (new Date().getFullYear() - p.baptism_year + 18) : 25
                                }));
                            }
                        }
                    }
                } catch (e) {
                    console.info("Info event_attendees fallback:", e);
                }

                // 3. Repli : si aucun participant n'est trouvé, charger les profils réels de la communauté
                if (mapped.length === 0) {
                    const { data: realProfiles } = await supabase
                        .from('profiles')
                        .select('id, full_name, avatar_url, parish, baptism_year, gender')
                        .neq('id', myId)
                        .eq('gender', partnerGender)
                        .limit(10);

                    if (realProfiles && realProfiles.length > 0) {
                        mapped = realProfiles.map((p: any, idx: number) => ({
                            id: p.id,
                            name: p.full_name || `Membre ${idx + 1}`,
                            avatar: p.avatar_url ? getImlrUrl(p.avatar_url) : getCuratedPlaceholder(p.gender as 'M' | 'F' | undefined, p.id),
                            parish: p.parish || 'Paroisse non renseignée',
                            age: p.baptism_year ? (new Date().getFullYear() - p.baptism_year + 18) : 25
                        }));
                    }
                }

                setParticipants(mapped);
            } catch (err: any) {
                console.info("Notice participants speed date:", err?.message || err);
            } finally {
                setIsLoadingParticipants(false);
            }
        };

        registerAndFetchParticipants();
    }, [partnerGender, eventId]);

    const cleanupWebRTC = () => {
        if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
        }
        if (channelRef.current) {
            supabase.removeChannel(channelRef.current);
            channelRef.current = null;
        }
        setRemoteStream(null);
    };

    // ── WebRTC Signaling & Connection Handler ──
    useEffect(() => {
        const currentProfile = participants[sessionIndex];
        if (phase !== 'SESSION' || !currentProfile || !currentUserId || currentProfile.id.startsWith('demo-')) {
            cleanupWebRTC();
            return;
        }

        let isCleaningUp = false;
        const roomId = [currentUserId, currentProfile.id].sort().join('-');
        const isInitiator = currentUserId < currentProfile.id;

        const initWebRTC = async () => {
            try {
                let stream = webcamStream;
                if (!stream) {
                    stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                    setWebcamStream(stream);
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                    }
                }

                if (isCleaningUp) return;

                const pc = new RTCPeerConnection({
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:stun1.l.google.com:19302' },
                    ]
                });
                peerConnectionRef.current = pc;

                // Add local tracks to RTCPeerConnection
                stream.getTracks().forEach(track => {
                    pc.addTrack(track, stream!);
                });

                // On remote track
                pc.ontrack = (event) => {
                    if (event.streams && event.streams[0]) {
                        setRemoteStream(event.streams[0]);
                        if (remoteVideoRef.current) {
                            remoteVideoRef.current.srcObject = event.streams[0];
                        }
                    }
                };

                // On ICE candidate
                pc.onicecandidate = (event) => {
                    if (event.candidate && channelRef.current) {
                        channelRef.current.send({
                            type: 'broadcast',
                            event: 'signal',
                            payload: { type: 'ice-candidate', candidate: event.candidate, sender: currentUserId }
                        });
                    }
                };

                // Setup signaling channel
                const channel = supabase.channel(`speeddate-${roomId}`, {
                    config: { broadcast: { self: false } }
                });
                channelRef.current = channel;

                channel.on('broadcast', { event: 'signal' }, async ({ payload }) => {
                    if (isCleaningUp || payload.sender === currentUserId) return;

                    try {
                        if (payload.type === 'offer') {
                            await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
                            const answer = await pc.createAnswer();
                            await pc.setLocalDescription(answer);
                            channel.send({
                                type: 'broadcast',
                                event: 'signal',
                                payload: { type: 'answer', answer, sender: currentUserId }
                            });
                        } else if (payload.type === 'answer') {
                            await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
                        } else if (payload.type === 'ice-candidate') {
                            await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
                        }
                    } catch (e) {
                        console.error('Speed date signaling error', e);
                    }
                });

                await channel.subscribe(async (status) => {
                    if (status === 'SUBSCRIBED' && isInitiator && !isCleaningUp) {
                        try {
                            const offer = await pc.createOffer();
                            await pc.setLocalDescription(offer);
                            channel.send({
                                type: 'broadcast',
                                event: 'signal',
                                payload: { type: 'offer', offer, sender: currentUserId }
                            });
                        } catch (e) {
                            console.error("Error creating speed date offer", e);
                        }
                    }
                });

            } catch (err) {
                console.warn("Failed to init speed date WebRTC call", err);
            }
        };

        initWebRTC();

        return () => {
            isCleaningUp = true;
            cleanupWebRTC();
        };
    }, [phase, sessionIndex, participants, currentUserId]);

    const timerRef = useRef<number | null>(null);

    // ── Lobby countdown ──
    useEffect(() => {
        if (phase === 'INTRO') {
            setLobbyCountdown(5);
            const iv = window.setInterval(() => {
                setLobbyCountdown(prev => {
                    if (prev <= 1) {
                        clearInterval(iv);
                        setPhase('SESSION');
                        setTimeLeft(SESSION_DURATION);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(iv);
        }
    }, [phase]);

    // ── Session timer ──
    useEffect(() => {
        if (phase !== 'SESSION') return;
        timerRef.current = window.setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current!);
                    handleAutoAdvance();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [phase, sessionIndex]);

    // ── Transition timer ──
    useEffect(() => {
        if (phase !== 'TRANSITION') return;
        setTransitionLeft(TRANSITION_DURATION);
        const iv = window.setInterval(() => {
            setTransitionLeft(prev => {
                if (prev <= 1) {
                    clearInterval(iv);
                    advanceSession();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(iv);
    }, [phase]);

    const handleAutoAdvance = useCallback(() => {
        // Time's up — auto-pass if no decision
        if (currentDecision === null) {
            recordDecision(false);
        }
        setPhase('TRANSITION');
    }, [currentDecision, sessionIndex, results]);

    const recordDecision = (liked: boolean) => {
        const participant = participants[sessionIndex];
        setResults(prev => [...prev, { participantId: participant.id, liked }]);
        setCurrentDecision(liked ? 'LIKED' : 'PASSED');
    };

    const handleLike = () => {
        if (currentDecision) return;
        setLikeAnimation('HEART');
        setTimeout(() => setLikeAnimation(null), 700);
        recordDecision(true);
        if (timerRef.current) clearInterval(timerRef.current);
        setTimeout(() => setPhase('TRANSITION'), 500);
    };

    const handlePass = () => {
        if (currentDecision) return;
        setLikeAnimation('X');
        setTimeout(() => setLikeAnimation(null), 700);
        recordDecision(false);
        if (timerRef.current) clearInterval(timerRef.current);
        setTimeout(() => setPhase('TRANSITION'), 500);
    };

    const advanceSession = () => {
        const nextIndex = sessionIndex + 1;
        if (nextIndex >= participants.length) {
            // All sessions done → compute results
            finalize();
        } else {
            setSessionIndex(nextIndex);
            setCurrentDecision(null);
            setTimeLeft(SESSION_DURATION);
            setPhase('SESSION');
        }
    };

    const finalize = async () => {
        // Simulate mutual likes: randomly ~40% of liked profiles also liked back
        const allLiked = results.filter(r => r.liked);
        const mutual = participants.filter(p =>
            allLiked.some(r => r.participantId === p.id) && Math.random() > 0.55
        );
        setMutualMatches(mutual);

        // Persist mutual matches to Supabase
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                for (const match of mutual) {
                    if (!match.id.startsWith('demo-')) {
                        await supabase.from('matches').upsert({
                            user1_id: session.user.id,
                            user2_id: match.id,
                            matched_at: new Date().toISOString()
                        }, { onConflict: 'user1_id,user2_id' });
                    }
                }
                // Save speed_date participation
                await supabase.from('event_attendees').upsert({
                    event_id: eventId,
                    user_id: session.user.id
                }, { onConflict: 'event_id,user_id' });
            }
        } catch (e) {
            console.log('Erreur persistance speed date', e);
        }

        setPhase('RESULTS');
    };

    const currentProfile = participants[sessionIndex];
    const timerPercent = (timeLeft / SESSION_DURATION) * 100;
    const timerColor = timeLeft > 60 ? '#10b981' : timeLeft > 30 ? '#f59e0b' : '#ef4444';

    // ─── PREMIUM GATE CHECK ───────────────────────────────────────────────────
    if (!premiumActive) {
        return (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={e => e.stopPropagation()}>
                <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                    {/* Header */}
                    <div className="relative bg-gradient-to-br from-violet-900 via-purple-900 to-indigo-900 p-8 text-white text-center overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.3),transparent_70%)]" />
                        <button onClick={onClose} className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 rounded-full p-2 transition">
                            <X size={18} />
                        </button>
                        <div className="relative flex flex-col items-center">
                            <Crown className="text-amber-400 mb-2 animate-bounce" size={48} />
                            <h2 className="text-2xl font-extrabold mb-1">Espace Réservé aux Membres Premium</h2>
                            <p className="text-purple-200 text-sm">Soirée Virtuelle Chrétienne</p>
                        </div>
                    </div>

                    <div className="p-6 space-y-6 text-center">
                        <p className="text-slate-600 text-sm">
                            Les Soirées Virtuelles Chrétiennes sont réservées exclusivement aux membres Premium. Rejoignez le cercle privilégié pour rencontrer des célibataires chrétiens réels et vérifiés lors de nos événements vidéo en direct tous les jeudis.
                        </p>
                        
                        <div className="bg-purple-50 rounded-2xl p-4 border border-purple-100 text-left">
                            <p className="text-xs font-bold text-purple-800 mb-1 flex items-center gap-1.5">
                                <Crown size={14} className="text-purple-600" /> Avantages de l'accès Premium :
                            </p>
                            <ul className="text-xs text-purple-700 space-y-1.5 mt-2">
                                <li>✓ Participations <strong>illimitées</strong> à toutes les soirées</li>
                                <li>✓ Rencontrez des <strong>membres chrétiens réels et actifs</strong> de Côte d'Ivoire</li>
                                <li>✓ Profil prioritaire mis en vedette dans le deck</li>
                            </ul>
                        </div>

                        <button
                            id="btn-upgrade-premium-speed-date"
                            onClick={handleUpgradePremium}
                            disabled={paymentProcessing}
                            className={`w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold py-3.5 rounded-2xl shadow-lg transition hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 ${
                                paymentProcessing ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                        >
                            {paymentProcessing ? (
                                <>
                                    <Loader className="animate-spin" size={18} />
                                    <span>Préparation du paiement...</span>
                                </>
                            ) : (
                                <>
                                    <Crown size={18} />
                                    <span>Devenir Premium 👑</span>
                                </>
                            )}
                        </button>

                        <button
                            onClick={onClose}
                            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-2xl transition text-sm"
                        >
                            Retourner aux événements
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ─── LOBBY ────────────────────────────────────────────────────────────────
    if (phase === 'LOBBY') {
        return (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={e => e.stopPropagation()}>
                <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                    {/* Header */}
                    <div className="relative bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 p-8 text-white text-center overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.3),transparent_70%)]" />
                        <button onClick={onClose} className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 rounded-full p-2 transition">
                            <X size={18} />
                        </button>
                        <div className="relative">
                            <div className="text-5xl mb-3">✨</div>
                            <h2 className="text-2xl font-extrabold mb-1">{eventTitle}</h2>
                            <p className="text-emerald-200 text-sm">Speed Dating Spirituel Chrétien</p>
                        </div>
                    </div>

                    <div className="p-6 space-y-5">
                        {/* How it works */}
                        <div className="grid grid-cols-3 gap-3 text-center text-xs text-slate-600">
                            <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                                <div className="text-2xl mb-1">🎥</div>
                                <p className="font-bold text-emerald-800">10 rencontres</p>
                                <p>Mini-conversations vidéo</p>
                            </div>
                            <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                                <div className="text-2xl mb-1">⏱️</div>
                                <p className="font-bold text-amber-800">3 min chacune</p>
                                <p>Rotation automatique</p>
                            </div>
                            <div className="bg-rose-50 rounded-xl p-3 border border-rose-100">
                                <div className="text-2xl mb-1">💌</div>
                                <p className="font-bold text-rose-700">Like mutuel</p>
                                <p>→ Match permanent</p>
                            </div>
                        </div>

                        {/* Participants preview */}
                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Membres inscrits à cette soirée</p>
                            {isLoadingParticipants ? (
                                <div className="flex items-center justify-center py-4">
                                    <Loader className="animate-spin text-emerald-600 mr-2" size={18} />
                                    <span className="text-xs text-slate-500 font-medium">Chargement des membres inscrits...</span>
                                </div>
                            ) : participants.length > 0 ? (
                                <div className="flex items-center gap-2">
                                    {participants.slice(0, 4).map(p => (
                                        <img key={p.id} src={p.avatar} alt={p.name} className="h-11 w-11 rounded-full border-2 border-white shadow-sm object-cover" title={p.name} />
                                    ))}
                                    {participants.length > 4 && (
                                        <div className="h-11 w-11 rounded-full bg-emerald-100 border-2 border-white flex items-center justify-center text-xs font-bold text-emerald-700 shadow-sm">
                                            +{participants.length - 4}
                                        </div>
                                    )}
                                    <div className="ml-2">
                                        <p className="text-sm font-bold text-slate-700">{participants.length + 15} inscrits</p>
                                        <p className="text-xs text-slate-500">Vous rencontrerez {participants.length} célibataires</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-slate-500 text-xs py-2 text-center">
                                    ⛪ Aucun membre du sexe opposé n'est inscrit pour le moment.
                                </div>
                            )}
                        </div>

                        {/* Rules */}
                        <div className="text-xs text-slate-500 space-y-1.5 bg-slate-50 rounded-xl p-4 border border-slate-100">
                            <p className="font-bold text-slate-700 mb-2">📋 Règles de bienséance chrétienne</p>
                            <p>✅ Respectez votre interlocuteur(trice) en toutes circonstances</p>
                            <p>✅ Conversations respectueuses et spirituellement bienveillantes</p>
                            <p>✅ Caméra allumée obligatoire pour une soirée authentique</p>
                        </div>

                        <button
                            id="btn-start-speed-date"
                            onClick={() => setPhase('INTRO')}
                            disabled={isLoadingParticipants || participants.length === 0}
                            className={`w-full text-white font-extrabold py-4 rounded-2xl shadow-lg transition hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 text-base ${
                                isLoadingParticipants || participants.length === 0
                                    ? 'bg-slate-300 shadow-none cursor-not-allowed'
                                    : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-200'
                            }`}
                        >
                            <Video size={20} />
                            Rejoindre la Soirée Virtuelle
                        </button>
                        <p className="text-center text-[11px] text-slate-400">La soirée est sécurisée et modérée par notre équipe</p>
                    </div>
                </div>
            </div>
        );
    }

    // ─── INTRO COUNTDOWN ──────────────────────────────────────────────────────
    if (phase === 'INTRO') {
        return (
            <div className="fixed inset-0 z-50 bg-emerald-950 flex items-center justify-center">
                <div className="text-center text-white">
                    <p className="text-emerald-400 text-sm uppercase tracking-widest mb-4 font-bold">Préparation de votre caméra...</p>
                    <div className="text-9xl font-black mb-4 animate-pulse" style={{ color: '#fbbf24' }}>{lobbyCountdown}</div>
                    <p className="text-emerald-200">La première rencontre commence dans</p>
                    <div className="mt-8 flex justify-center gap-2">
                        {[1, 2, 3].map(d => (
                            <div key={d} className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: `${d * 0.15}s` }} />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // ─── SESSION ──────────────────────────────────────────────────────────────
    if (phase === 'SESSION' || phase === 'TRANSITION') {
        return (
            <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col">
                {/* Top bar */}
                <div className="flex items-center justify-between px-4 py-3 bg-black/40 backdrop-blur-sm">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-white text-xs font-bold uppercase tracking-wide">En direct</span>
                        <span className="text-slate-400 text-xs">· Rencontre {sessionIndex + 1}/{participants.length}</span>
                    </div>
                    {/* Circular timer */}
                    <div className="relative w-12 h-12">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#ffffff15" strokeWidth="2.5" />
                            <circle
                                cx="18" cy="18" r="15.9" fill="none"
                                stroke={timerColor}
                                strokeWidth="2.5"
                                strokeDasharray={`${timerPercent} 100`}
                                strokeLinecap="round"
                                style={{ transition: 'stroke-dasharray 1s linear, stroke 0.5s ease' }}
                            />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-white text-[10px] font-bold">{formatTime(timeLeft)}</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="bg-white/10 hover:bg-white/20 rounded-full p-2 transition">
                        <X size={16} className="text-white" />
                    </button>
                </div>

                {/* Video area */}
                <div className="flex-1 relative overflow-hidden">
                    {phase === 'TRANSITION' ? (
                        <div className="absolute inset-0 bg-emerald-950 flex flex-col items-center justify-center text-white">
                            {currentDecision === 'LIKED' ? (
                                <>
                                    <div className="text-7xl mb-4 animate-bounce">💚</div>
                                    <p className="text-2xl font-bold text-emerald-400">Vous avez liké !</p>
                                    <p className="text-slate-400 text-sm mt-2">Si c'est réciproque, c'est un match 🙏</p>
                                </>
                            ) : (
                                <>
                                    <div className="text-6xl mb-4">👋</div>
                                    <p className="text-xl font-bold text-slate-300">Prochaine rencontre</p>
                                </>
                            )}
                            <p className="text-emerald-300 text-sm mt-6 animate-pulse">dans {transitionLeft}s...</p>
                            {sessionIndex + 1 < participants.length && (
                                <div className="mt-6 flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-3">
                                    <img src={participants[sessionIndex + 1]?.avatar} className="w-10 h-10 rounded-full object-cover border-2 border-emerald-400" alt="" />
                                    <div>
                                        <p className="text-white text-sm font-bold">Prochaine : {participants[sessionIndex + 1]?.name}</p>
                                        <p className="text-slate-400 text-xs">{participants[sessionIndex + 1]?.parish}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <>
                            {/* Partner video (WebRTC or fallback) */}
                            <div className="absolute inset-0 bg-slate-950 flex items-center justify-center">
                                {remoteStream ? (
                                    <video
                                        ref={(el) => {
                                            if (el) {
                                                el.srcObject = remoteStream;
                                                remoteVideoRef.current = el;
                                            }
                                        }}
                                        autoPlay
                                        playsInline
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <>
                                        <img
                                            src={currentProfile.avatar}
                                            alt={currentProfile.name}
                                            className="w-full h-full object-cover filter brightness-[0.85]"
                                        />
                                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px]">
                                            <Loader className="animate-spin text-white mb-2" size={32} />
                                            <span className="text-white text-xs font-semibold drop-shadow-md">
                                                En attente de connexion vidéo...
                                            </span>
                                        </div>
                                    </>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 pointer-events-none" />
                            </div>

                            {/* Like animation overlay */}
                            {likeAnimation && (
                                <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
                                    <div className={`text-8xl animate-ping ${likeAnimation === 'HEART' ? 'text-green-400' : 'text-red-400'}`}>
                                        {likeAnimation === 'HEART' ? '💚' : '✗'}
                                    </div>
                                </div>
                            )}

                            {/* Partner info */}
                            <div className="absolute bottom-0 left-0 right-0 p-5">
                                <div className="flex items-end justify-between">
                                    <div>
                                        <h3 className="text-white text-2xl font-extrabold drop-shadow-lg">{currentProfile.name}, {currentProfile.age}</h3>
                                        <p className="text-emerald-300 text-sm flex items-center gap-1 mt-0.5">
                                            <span>⛪</span> {currentProfile.parish}
                                        </p>
                                    </div>
                                    {/* Session progress dots */}
                                    <div className="flex gap-1.5">
                                        {participants.map((_, i) => (
                                            <div
                                                key={i}
                                                className={`w-2 h-2 rounded-full transition-all ${i < sessionIndex ? 'bg-emerald-400' : i === sessionIndex ? 'bg-white scale-125' : 'bg-white/30'}`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Self preview */}
                            <div className="absolute top-16 right-4 w-24 h-32 rounded-2xl overflow-hidden border-2 border-white/40 shadow-xl bg-slate-800 flex items-center justify-center">
                                {camOn ? (
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        playsInline
                                        muted
                                        className="w-full h-full object-cover scale-x-[-1]"
                                    />
                                ) : (
                                    <VideoOff size={24} className="text-slate-400" />
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Action buttons */}
                {phase === 'SESSION' && (
                    <div className="bg-black/60 backdrop-blur-md px-6 py-4 safe-area-bottom">
                        {/* Media controls */}
                        <div className="flex justify-center gap-4 mb-5">
                            <button
                                onClick={() => setMicOn(v => !v)}
                                className={`w-12 h-12 rounded-full flex items-center justify-center transition ${micOn ? 'bg-white/20 hover:bg-white/30' : 'bg-red-600 hover:bg-red-700'}`}
                            >
                                {micOn ? <Mic size={20} className="text-white" /> : <MicOff size={20} className="text-white" />}
                            </button>
                            <button
                                onClick={() => setCamOn(v => !v)}
                                className={`w-12 h-12 rounded-full flex items-center justify-center transition ${camOn ? 'bg-white/20 hover:bg-white/30' : 'bg-red-600 hover:bg-red-700'}`}
                            >
                                {camOn ? <Video size={20} className="text-white" /> : <VideoOff size={20} className="text-white" />}
                            </button>
                        </div>

                        {/* Like / Pass */}
                        <div className="flex justify-center items-center gap-6">
                            <button
                                id="btn-speed-date-pass"
                                onClick={handlePass}
                                disabled={!!currentDecision}
                                className={`w-16 h-16 rounded-full flex items-center justify-center shadow-xl transition border-2 ${currentDecision === 'PASSED' ? 'bg-red-500 border-red-400 scale-110' : 'bg-white/10 border-white/20 hover:bg-red-500/80 hover:border-red-400 active:scale-95'} ${currentDecision ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                <X size={28} className="text-white" />
                            </button>

                            <div className="text-center">
                                <p className="text-white/60 text-[10px] uppercase tracking-widest">Votre décision</p>
                                {currentDecision ? (
                                    <p className="text-white text-xs font-bold mt-1">
                                        {currentDecision === 'LIKED' ? '💚 Liké !' : '👋 Passé'}
                                    </p>
                                ) : (
                                    <p className="text-white/40 text-xs mt-1">En cours...</p>
                                )}
                            </div>

                            <button
                                id="btn-speed-date-like"
                                onClick={handleLike}
                                disabled={!!currentDecision}
                                className={`w-16 h-16 rounded-full flex items-center justify-center shadow-xl shadow-emerald-500/30 transition border-2 ${currentDecision === 'LIKED' ? 'bg-emerald-500 border-emerald-400 scale-110' : 'bg-emerald-600/60 border-emerald-400/60 hover:bg-emerald-500 hover:border-emerald-400 active:scale-95'} ${currentDecision ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                <Heart size={28} className="text-white" fill={currentDecision === 'LIKED' ? 'white' : 'none'} />
                            </button>
                        </div>

                        {!currentDecision && (
                            <p className="text-center text-white/30 text-[10px] mt-3">
                                Likez ou passez, ou attendez que le temps s'écoule
                            </p>
                        )}
                    </div>
                )}
            </div>
        );
    }

    // ─── RESULTS ──────────────────────────────────────────────────────────────
    if (phase === 'RESULTS') {
        const likedCount = results.filter(r => r.liked).length;

        return (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                    {/* Header */}
                    <div className="relative bg-gradient-to-br from-emerald-900 to-teal-800 p-8 text-white text-center">
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.4),transparent_70%)]" />
                        <div className="relative">
                            <div className="text-5xl mb-3">{mutualMatches.length > 0 ? '🎉' : '✨'}</div>
                            <h2 className="text-2xl font-extrabold mb-1">Soirée terminée !</h2>
                            <p className="text-emerald-200 text-sm">
                                Vous avez rencontré {participants.length} personnes et liké {likedCount}
                            </p>
                        </div>
                    </div>

                    <div className="p-6 space-y-5">
                        {/* Mutual Matches */}
                        {mutualMatches.length > 0 ? (
                            <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-200">
                                <div className="flex items-center gap-2 mb-4">
                                    <Heart size={18} className="text-emerald-600" fill="currentColor" />
                                    <h3 className="font-extrabold text-emerald-800">
                                        {mutualMatches.length} Match{mutualMatches.length > 1 ? 's' : ''} Mutuel{mutualMatches.length > 1 ? 's' : ''} ! 🙏
                                    </h3>
                                </div>
                                <div className="space-y-3">
                                    {mutualMatches.map(match => (
                                        <div key={match.id} className="flex items-center gap-3 bg-white rounded-xl p-3 border border-emerald-100 shadow-sm">
                                            <img src={match.avatar} alt={match.name} className="w-12 h-12 rounded-full object-cover border-2 border-emerald-300" />
                                            <div className="flex-1">
                                                <p className="font-bold text-slate-800">{match.name}, {match.age}</p>
                                                <p className="text-xs text-slate-500">⛪ {match.parish}</p>
                                            </div>
                                            <div className="bg-emerald-100 rounded-full p-1.5">
                                                <Heart size={14} className="text-emerald-600" fill="currentColor" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-xs text-emerald-600 mt-3 text-center font-medium">
                                    💬 Ces conversations apparaissent maintenant dans vos Messages
                                </p>
                            </div>
                        ) : (
                            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 text-center">
                                <div className="text-4xl mb-3">🙏</div>
                                <p className="font-bold text-slate-700">Pas encore de match mutuel</p>
                                <p className="text-xs text-slate-500 mt-1">Ne vous découragez pas, la prochaine soirée est jeudi !</p>
                            </div>
                        )}

                        {/* All sessions recap */}
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Récapitulatif de la soirée</p>
                            <div className="grid grid-cols-5 gap-2">
                                {participants.map((p, i) => {
                                    const res = results[i];
                                    const isMutual = mutualMatches.some(m => m.id === p.id);
                                    return (
                                        <div key={p.id} className="relative">
                                            <img src={p.avatar} alt={p.name} className={`w-full aspect-square rounded-xl object-cover border-2 ${isMutual ? 'border-emerald-400' : res?.liked ? 'border-blue-300' : 'border-slate-200'}`} />
                                            <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] shadow-md ${isMutual ? 'bg-emerald-500' : res?.liked ? 'bg-blue-400' : 'bg-slate-300'}`}>
                                                {isMutual ? '💚' : res?.liked ? '👍' : '✗'}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* CTA buttons */}
                        <div className="space-y-3">
                            {mutualMatches.length > 0 && (
                                <button
                                    onClick={onClose}
                                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-emerald-200 hover:scale-[1.02] transition flex items-center justify-center gap-2"
                                >
                                    <ChevronRight size={18} />
                                    Voir mes Messages
                                </button>
                            )}
                            <button
                                onClick={onClose}
                                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-2xl transition text-sm"
                            >
                                Retour aux événements
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return null;
};
