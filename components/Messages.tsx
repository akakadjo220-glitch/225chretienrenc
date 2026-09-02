
import React, { useState, useEffect, useRef } from 'react';
import { Message, Conversation } from '../types';
import { Search, Send, ArrowLeft, ShieldCheck, Mail, Image as ImageIcon, Mic, X, Loader, AlertCircle, StopCircle, Trash2, HeartHandshake, Phone, Video as VideoIcon, PhoneOff, ShieldAlert, Award, Star, CheckCircle, BookOpen, Trophy, MessageCircle } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { generateIcebreakers, generateAntiGhostingMessage, moderateMessage, moderateImage, detectFinancialScam } from '../aiClient';
import { VideoCall } from './VideoCall';
import { AudioPlayer } from './AudioPlayer';
import { BibleQuizModal } from './BibleQuizModal';
import { sanitizeInput, validateImageFile } from '../utils/security';

const getImlrUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return supabase.storage.from('Public').getPublicUrl(path).data.publicUrl;
};

interface MessagesProps {
    initialContactId?: string | null;
}

export const Messages: React.FC<MessagesProps> = ({ initialContactId }) => {
    const [currentUser, setCurrentUser] = useState<any>(null);
    const currentUserId = currentUser?.id;

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

    // Navigation & Données
    const [activeContactId, setActiveContactId] = useState<string | null>(initialContactId || null);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);

    // Community Certified IDs (Anti-Brouteurs - Niveau 3)
    const [communityCertifiedIds, setCommunityCertifiedIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        try {
            const ids: string[] = JSON.parse(localStorage.getItem('community_certified_users_v1') || '[]');
            setCommunityCertifiedIds(new Set(ids));
        } catch { setCommunityCertifiedIds(new Set()); }
    }, []);

    // 🛡️ États Bouclier Anti-Arnaque Financière
    const [dismissScamWarning, setDismissScamWarning] = useState(false);

    // ⭐ États Recommandation Communautaire (Niveau 3)
    const [showRecommendationModal, setShowRecommendationModal] = useState(false);
    const [recommendationReason, setRecommendationReason] = useState('FOI_ASSIDUE');
    const [recommendationNote, setRecommendationNote] = useState('');
    const [isSubmittingRecommendation, setIsSubmittingRecommendation] = useState(false);

    // États de chargement
    const [isLoadingList, setIsLoadingList] = useState(true);
    const [isLoadingChat, setIsLoadingChat] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // États Saisie
    const [inputText, setInputText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [attachedFile, setAttachedFile] = useState<{ file: File; type: 'IMAGE' | 'VIDEO' } | null>(null);

    // États Audio
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

    // État Modale Suppression
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // AI States
    const [icebreakers, setIcebreakers] = useState<string[]>([]);
    const [isLoadingIcebreakers, setIsLoadingIcebreakers] = useState(false);
    const [antiGhostingSuggestion, setAntiGhostingSuggestion] = useState<string | null>(null);
    const [isLoadingAntiGhosting, setIsLoadingAntiGhosting] = useState(false);

    // --- APPEL WEBRTC ---
    const [activeCall, setActiveCall] = useState<{ isVideo: boolean, isInitiator: boolean, targetId: string, targetName: string } | null>(null);
    const [incomingCall, setIncomingCall] = useState<{ isVideo: boolean, callerId: string, callerName: string } | null>(null);

    // États Mentorat / Parrainage Spirituel
    const [showMentorshipModal, setShowMentorshipModal] = useState(false);
    const [mentors, setMentors] = useState<any[]>([]);
    const [loadingMentors, setLoadingMentors] = useState(false);
    const [selectedMentorId, setSelectedMentorId] = useState('');
    const [mentorshipNotes, setMentorshipNotes] = useState('');

    // États Quiz Biblique Duo 📖
    const [showQuizModal, setShowQuizModal] = useState(false);
    const [quizOpponentName, setQuizOpponentName] = useState('Votre ami(e)');
    const [isChallengingQuiz, setIsChallengingQuiz] = useState(false);
    const [originalQuizScore, setOriginalQuizScore] = useState<number | undefined>(undefined);
    const [activeQuizMsgId, setActiveQuizMsgId] = useState<string | null>(null);

    const handleStartNewQuiz = () => {
        setIsChallengingQuiz(false);
        setOriginalQuizScore(undefined);
        const activeUser = conversations.find(c => c.contactId === activeContactId);
        setQuizOpponentName(activeUser?.contactName || 'Votre ami(e)');
        setShowQuizModal(true);
    };

    const handleStartQuizChallenge = (msgId: string, name: string, score: number) => {
        setActiveQuizMsgId(msgId);
        setIsChallengingQuiz(true);
        setOriginalQuizScore(score);
        setQuizOpponentName(name);
        setShowQuizModal(true);
    };

    const handleCompleteQuiz = async (score: number, total: number) => {
        if (!currentUserId || !activeContactId) return;

        if (isChallengingQuiz && activeQuizMsgId) {
            try {
                const { data: msgRow } = await supabase.from('messages').select('content').eq('id', activeQuizMsgId).maybeSingle();
                let quizData = { score: originalQuizScore || 0, total: 5, sender_name: quizOpponentName, result_score: score };
                if (msgRow?.content) {
                    try {
                        const parsed = JSON.parse(msgRow.content);
                        quizData = { ...parsed, result_score: score };
                    } catch {}
                }
                await supabase.from('messages').update({ content: JSON.stringify(quizData) }).eq('id', activeQuizMsgId);

                await supabase.from('messages').insert({
                    sender_id: currentUserId,
                    receiver_id: activeContactId,
                    type: 'TEXT',
                    content: `🏆 Défi Quiz Biblique relevé ! Mon score : ${score}/5 🆚 Score de ${quizOpponentName} : ${originalQuizScore || 0}/5. Que la parole du Christ habite en nous en abondance ! 🕊️`
                });
            } catch (e) {
                console.error("Erreur mise à jour quiz result", e);
            }
        } else {
            try {
                const quizPayload = JSON.stringify({
                    score: score,
                    total: total,
                    sender_name: currentUser?.name || currentUser?.full_name || 'Un membre',
                    result_score: null
                });

                await supabase.from('messages').insert({
                    sender_id: currentUserId,
                    receiver_id: activeContactId,
                    type: 'QUIZ_CHALLENGE',
                    content: quizPayload
                });
            } catch (e) {
                console.error("Erreur création quiz challenge", e);
            }
        }
    };

    // Refs
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<number | null>(null);

    // --- FONCTIONS UTILITAIRES ---

    const scrollToBottom = (instant = false) => {
        if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTo({
                top: messagesContainerRef.current.scrollHeight,
                behavior: instant ? 'auto' : 'smooth'
            });
        }
    };

    const formatDuration = (sec: number) => {
        const min = Math.floor(sec / 60);
        const s = sec % 60;
        return `${min}:${s < 10 ? '0' : ''}${s}`;
    };

    // --- LOGIQUE METIER ---

    // 1. Marquer comme lu
    const markAsRead = async (senderId: string) => {
        if (!currentUserId) return;
        try {
            await supabase.from('messages').update({ read: true }).match({ sender_id: senderId, receiver_id: currentUserId, read: false });

            setConversations(prev => prev.map(c =>
                c.contactId === senderId ? { ...c, unreadCount: 0 } : c
            ));
        } catch (e) {
            console.error("Erreur markAsRead", e);
        }
    };

    useEffect(() => {
        if (activeContactId) {
            markAsRead(activeContactId);
        }
    }, [activeContactId]);

    // Écoute des appels entrants globaux
    useEffect(() => {
        if (!currentUserId) return;
        const channel = supabase.channel(`call-alerts-${currentUserId}`);
        channel.on('broadcast', { event: 'incoming-call' }, ({ payload }) => {
            if (payload.type === 'ring') {
                setIncomingCall({ isVideo: payload.isVideo, callerId: payload.callerId, callerName: payload.callerName });
            } else if (payload.type === 'hangup' || payload.type === 'cancel') {
                setIncomingCall(null);
                if (activeCall?.targetId === payload.callerId) setActiveCall(null);
            }
        }).subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [currentUserId, activeCall]);

    // Fonctions d'appel
    const startCall = (isVideo: boolean) => {
        if (!activeUser || !currentUserId) return;
        supabase.channel(`call-alerts-${activeUser.contactId}`).send({
            type: 'broadcast',
            event: 'incoming-call',
            payload: { type: 'ring', isVideo, callerId: currentUserId, callerName: currentUser.name || currentUser.full_name || 'Un membre' }
        });
        setActiveCall({ isVideo, isInitiator: true, targetId: activeUser.contactId, targetName: activeUser.contactName });
    };

    const acceptCall = () => {
        if (incomingCall) {
            setActiveCall({ isVideo: incomingCall.isVideo, isInitiator: false, targetId: incomingCall.callerId, targetName: incomingCall.callerName });
            setIncomingCall(null);
        }
    };

    const rejectCall = () => {
        if (incomingCall && currentUserId) {
            supabase.channel(`call-alerts-${incomingCall.callerId}`).send({
                type: 'broadcast',
                event: 'incoming-call',
                payload: { type: 'cancel', callerId: currentUserId }
            });
            setIncomingCall(null);
        }
    };

    // 2. Suppression définitive (Match + Messages)
    const confirmDeleteConversation = async () => {
        if (!currentUserId || !activeContactId) return;

        setIsDeleting(true);

        try {
            // A. Supprimer le Match
            const { data: matches } = await supabase.from('matches').select('*').or(`and(user1_id.eq.${currentUserId},user2_id.eq.${activeContactId}),and(user1_id.eq.${activeContactId},user2_id.eq.${currentUserId})`);

            if (matches && matches.length > 0) {
                await supabase.from('matches').delete().eq('id', matches[0].id);
            }

            // B. Supprimer les Messages (Nettoyage définitif)
            await supabase.from('messages').delete().or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${activeContactId}),and(sender_id.eq.${activeContactId},receiver_id.eq.${currentUserId})`);

            // C. Mise à jour UI
            setConversations(prev => prev.filter(c => c.contactId !== activeContactId));
            setActiveContactId(null);
            setMessages([]);
            setShowDeleteModal(false);

        } catch (e: any) {
            console.error("Erreur suppression conversation", e);
            alert("Une erreur est survenue lors de la suppression.");
        } finally {
            setIsDeleting(false);
        }
    };

    // --- CHARGEMENT DES DONNÉES ---

    // 1. Liste des conversations
    useEffect(() => {
        let isMounted = true;

        const safetyTimeout = setTimeout(() => {
            if (isMounted && isLoadingList) {
                setIsLoadingList(false);
            }
        }, 4000);

        const fetchConversations = async () => {
            if (!currentUserId) {
                if (isMounted) setIsLoadingList(false);
                return;
            }

            setError(null);
            if (conversations.length === 0) setIsLoadingList(true);

            try {
                const { data: matchesRecords } = await supabase.from('matches')
                    .select('*, user1:profiles!user1_id(*), user2:profiles!user2_id(*)')
                    .or(`user1_id.eq.${currentUserId},user2_id.eq.${currentUserId}`)
                    .order('created_at', { ascending: false });

                let unreadMap: Record<string, number> = {};
                try {
                    const { data: unreadRecords } = await supabase.from('messages').select('sender_id').match({ receiver_id: currentUserId, read: false });
                    (unreadRecords || []).forEach((msg: any) => {
                        unreadMap[msg.sender_id] = (unreadMap[msg.sender_id] || 0) + 1;
                    });
                } catch (e) { }

                if (!isMounted) return;

                const formattedConversations: Conversation[] = (matchesRecords || []).map((match: any) => {
                    const isUserA = match.user1_id === currentUserId;
                    const otherUser = isUserA ? match.user_b : match.user_a;
                    if (!otherUser) return null;

                    // --- LOGIQUE PRÉSENCE RÉELLE ---
                    const lastActiveDate = otherUser.last_active ? new Date(otherUser.last_active) : null;
                    const isOnline = lastActiveDate
                        ? (new Date().getTime() - lastActiveDate.getTime()) < 5 * 60 * 1000 // 5 minutes
                        : false;

                    const rName = otherUser.full_name || otherUser.name;
                    return {
                        id: otherUser.id,
                        contactId: otherUser.id,
                        contactName: rName || 'Utilisateur',
                        contactAvatar: otherUser.avatar_url ? getImlrUrl(otherUser.avatar_url) : `https://ui-avatars.com/api/?name=${rName || 'User'}&background=random`,
                        lastMessage: "Discussion",
                        lastMessageTime: new Date(match.created_at).toLocaleDateString(),
                        unreadCount: unreadMap[otherUser.id] || 0,
                        isOnline: isOnline
                    };
                }).filter(Boolean) as Conversation[];

                formattedConversations.sort((a, b) => (b.unreadCount || 0) - (a.unreadCount || 0));
                setConversations(formattedConversations);

                if (initialContactId) {
                    const exists = formattedConversations.find(c => c.contactId === initialContactId);
                    if (exists) setActiveContactId(initialContactId);
                }

            } catch (err: any) {
                console.error("Erreur chargement conversations:", err);
            } finally {
                clearTimeout(safetyTimeout);
                if (isMounted) setIsLoadingList(false);
            }
        };

        fetchConversations();

        const channel = supabase.channel('public:messages')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${currentUserId}` }, (payload: any) => {
                const record = payload.new;
                if (record.sender_id !== activeContactId) {
                    setConversations(prev => prev.map(c =>
                        c.contactId === record.sender_id
                            ? { ...c, unreadCount: (c.unreadCount || 0) + 1 }
                            : c
                    ));
                } else {
                    markAsRead(record.sender_id);
                }
            })
            .subscribe();

        return () => {
            isMounted = false;
            clearTimeout(safetyTimeout);
            supabase.removeChannel(channel);
        };
    }, [currentUserId, initialContactId, activeContactId]);

    // 2. Historique des messages
    useEffect(() => {
        if (!activeContactId || !currentUserId) {
            setIsLoadingChat(false);
            return;
        }

        let isMounted = true;
        setMessages([]);
        setIsLoadingChat(true);

        const chatTimeout = setTimeout(() => {
            if (isMounted && isLoadingChat) {
                setIsLoadingChat(false);
            }
        }, 4000);

        const loadHistory = async () => {
            try {
                const { data: resultList } = await supabase.from('messages')
                    .select('*')
                    .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${activeContactId}),and(sender_id.eq.${activeContactId},receiver_id.eq.${currentUserId})`)
                    .order('created_at', { ascending: true });

                if (!isMounted) return;

                const formattedMessages: Message[] = (resultList || []).map((record: any) => ({
                    id: record.id,
                    senderId: record.sender_id,
                    text: record.content,
                    type: record.type || 'TEXT',
                    attachmentUrl: record.attachment_url ? getImlrUrl(record.attachment_url) : undefined,
                    timestamp: new Date(record.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    isRead: record.read,
                    isNsfw: record.is_nsfw,
                    isFlagged: record.is_flagged
                }));

                setMessages(formattedMessages);
                requestAnimationFrame(() => scrollToBottom(true));

            } catch (err) {
                console.error("Erreur historique:", err);
            } finally {
                clearTimeout(chatTimeout);
                if (isMounted) setIsLoadingChat(false);
            }
        };

        loadHistory();
        return () => {
            isMounted = false;
            clearTimeout(chatTimeout);
        };
    }, [activeContactId, currentUserId]);

    // 3. Temps réel Chat
    useEffect(() => {
        if (!activeContactId || !currentUserId) return;
        const channel = supabase.channel(`chat:${currentUserId}:${activeContactId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload: any) => {
                const record = payload.new;
                if (
                    (record.sender_id === currentUserId && record.receiver_id === activeContactId) ||
                    (record.sender_id === activeContactId && record.receiver_id === currentUserId)
                ) {
                    const newMsg: Message = {
                        id: record.id,
                        senderId: record.sender_id,
                        text: record.content,
                        type: record.type || 'TEXT',
                        attachmentUrl: record.attachment_url ? getImlrUrl(record.attachment_url) : undefined,
                        timestamp: new Date(record.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        isRead: record.read,
                        isNsfw: record.is_nsfw,
                        isFlagged: record.is_flagged
                    };
                    setMessages(prev => [...prev, newMsg]);
                    requestAnimationFrame(() => scrollToBottom());
                }
            })
            .subscribe();
        return () => {
            supabase.removeChannel(channel);
        };
    }, [activeContactId, currentUserId]);

    // --- GESTION ENVOI ---

    // --- HELPER BASE64 ---
    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    };

    const handleSendMessage = async () => {
        if (!currentUserId || !activeContactId) return;
        if (!inputText.trim() && !attachedFile && !audioBlob) return;

        // 1. Validation de l'image attachée
        if (attachedFile && attachedFile.type === 'IMAGE') {
            const check = validateImageFile(attachedFile.file, 10);
            if (!check.valid) {
                alert(check.error || "Image non valide.");
                return;
            }
        }

        const rawText = inputText.trim();
        const sanitizedContent = sanitizeInput(rawText);
        const tempId = `temp-${Date.now()}`;
        const tempTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        let localMsgType: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' = 'TEXT';
        let localPreviewUrl: string | undefined = undefined;

        if (audioBlob) {
            localMsgType = 'AUDIO';
            localPreviewUrl = URL.createObjectURL(audioBlob);
        } else if (attachedFile) {
            localMsgType = attachedFile.type;
            localPreviewUrl = URL.createObjectURL(attachedFile.file);
        }

        // --- ENVOI INSTANTANÉ (OPTIMISTIC UI 0MS) ---
        const optimisticMsg: Message = {
            id: tempId,
            senderId: currentUserId,
            text: sanitizedContent,
            type: localMsgType,
            attachmentUrl: localPreviewUrl,
            timestamp: tempTimestamp,
            isRead: false
        };

        setMessages(prev => [...prev, optimisticMsg]);
        requestAnimationFrame(() => scrollToBottom(true));

        const pendingText = sanitizedContent;
        const pendingFile = attachedFile;
        const pendingAudio = audioBlob;

        setInputText('');
        setAttachedFile(null);
        setAudioBlob(null);
        setIsSending(true);

        try {
            let attachment_url = null;
            let msgType = localMsgType;
            let is_nsfw = false;
            let is_flagged = false;

            if (pendingText) {
                const textVerdict = await moderateMessage(pendingText);
                if (textVerdict === 'TOXIC') {
                    alert("Message bloqué par notre système de sécurité communautaire : langage offensant ou interdit.");
                    setMessages(prev => prev.filter(m => m.id !== tempId));
                    setIsSending(false);
                    return;
                }
            }

            if (pendingAudio) {
                const fileName = `audio-${Date.now()}.webm`;
                const { data, error } = await supabase.storage.from('Public').upload(`messages/${fileName}`, pendingAudio);
                if (error) throw error;
                if (data) attachment_url = data.path;
            } else if (pendingFile) {
                if (pendingFile.type === 'IMAGE') {
                    try {
                        const base64Str = await fileToBase64(pendingFile.file);
                        const imageVerdict = await moderateImage(base64Str);
                        if (imageVerdict === 'NSFW') {
                            is_nsfw = true;
                            is_flagged = true;
                        }
                    } catch (e) {
                        console.error("Erreur modération image", e);
                    }
                }

                const prefix = pendingFile.type.toLowerCase();
                const fileExt = pendingFile.file.name.split('.').pop()?.toLowerCase() || 'jpg';
                const fileName = `${prefix}-${Date.now()}.${fileExt}`;
                const { data, error } = await supabase.storage.from('Public').upload(`messages/${fileName}`, pendingFile.file);
                if (error) throw error;
                if (data) attachment_url = data.path;
            }

            const { data: insertedRecord, error: insertError } = await supabase.from('messages').insert({
                sender_id: currentUserId,
                receiver_id: activeContactId,
                read: false,
                type: msgType,
                content: pendingText,
                attachment_url: attachment_url,
                is_nsfw: is_nsfw,
                is_flagged: is_flagged
            }).select().single();

            if (insertError) throw insertError;

            // Remplacer le message temporaire par le message réel inséré en DB
            if (insertedRecord) {
                setMessages(prev => prev.map(m => m.id === tempId ? {
                    ...m,
                    id: insertedRecord.id,
                    attachmentUrl: insertedRecord.attachment_url ? getImlrUrl(insertedRecord.attachment_url) : m.attachmentUrl
                } : m));
            }
        } catch (err: any) {
            console.error("Erreur envoi message:", err);
            setMessages(prev => prev.filter(m => m.id !== tempId));
            alert(`Erreur d'envoi: ${err.message || err}`);
        } finally {
            setIsSending(false);
        }
    };

    // --- AUDIO ---
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];
            mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
            mediaRecorder.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                setAudioBlob(blob);
                stream.getTracks().forEach(track => track.stop());
            };
            mediaRecorder.start();
            setIsRecording(true);
            setRecordingDuration(0);
            timerRef.current = window.setInterval(() => setRecordingDuration(p => p + 1), 1000);
        } catch (e) { alert("Impossible d'accéder au microphone."); }
    };
    const stopRecording = () => { if (mediaRecorderRef.current && isRecording) { mediaRecorderRef.current.stop(); setIsRecording(false); if (timerRef.current) clearInterval(timerRef.current); } };
    const cancelRecording = () => { stopRecording(); setAudioBlob(null); };

    const activeUser = conversations.find(c => c.contactId === activeContactId);

    // --- AI FUNCTIONS ---

    const handleLoadIcebreakers = async () => {
        if (!currentUser || !activeContactId) return;
        setIsLoadingIcebreakers(true);
        try {
            // Fetch the other user's profile
            const { data: theirProfile } = await supabase.from('profiles').select('*').eq('id', activeContactId).maybeSingle();
            if (theirProfile) {
                const suggestions = await generateIcebreakers(currentUser, theirProfile);
                setIcebreakers(suggestions);
            }
        } catch (e) {
            console.error('Icebreakers error:', e);
        } finally {
            setIsLoadingIcebreakers(false);
        }
    };

    const handleAntiGhosting = async () => {
        if (!currentUser || !activeContactId) return;
        setIsLoadingAntiGhosting(true);
        try {
            const { data: theirProfile } = await supabase.from('profiles').select('*').eq('id', activeContactId).maybeSingle();
            if (theirProfile) {
                const suggestion = await generateAntiGhostingMessage(currentUser, theirProfile);
                if (suggestion) setAntiGhostingSuggestion(suggestion);
            }
        } catch (e) {
            console.error('Anti-ghosting error:', e);
        } finally {
            setIsLoadingAntiGhosting(false);
        }
    };

    // Load icebreakers when switching to a new empty conversation
    useEffect(() => {
        setIcebreakers([]);
        setAntiGhostingSuggestion(null);
        setDismissScamWarning(false);
    }, [activeContactId]);

    // 🛡️ Signaler Arnaque Financière (Wave / Mobile Money)
    const handleReportScam = async () => {
        if (!activeContactId || !activeUser) return;
        const scamMsg = messages.find(m => m.senderId === activeContactId && m.text && detectFinancialScam(m.text).isScamRisk);
        try {
            await supabase.from('reports').insert({
                reporter_name: currentUser?.name || 'Membre 225 Chrétien',
                reported_user_name: activeUser.contactName,
                reported_user_id: activeContactId,
                reason: `SOLICITATION_FINANCIERE: ${scamMsg?.text || 'Tentative de demande d\'argent / Wave / Mobile Money'}`,
                date: new Date().toISOString(),
                status: 'OPEN',
                type: 'MESSAGE'
            });
        } catch (e) { console.error("Erreur signalement arnaque:", e); }
        alert(`🚨 Signalement transmis ! La tentative d'arnaque financière de ${activeUser.contactName} a été enregistrée par l'équipe de sécurité.`);
        setShowDeleteModal(true);
    };

    // ⭐ Soumettre une Recommandation Communautaire (Niveau 3)
    const handleAddCommunityRecommendation = async () => {
        if (!activeContactId || !currentUser) return;
        setIsSubmittingRecommendation(true);

        const reasonLabels: Record<string, string> = {
            'FOI_ASSIDUE': '✝️ Membre engagé(e) et assidu(e) dans sa foi',
            'VALEURS_CHRETIENNES': '🕊️ Personne respectueuse et de grandes valeurs',
            'PAROISSE_RECOMMANDEE': '⛪ Recommandé(e) par la communauté chrétienne'
        };

        const newRec = {
            id: 'rec-' + Date.now(),
            authorId: currentUserId,
            authorName: currentUser.name || currentUser.full_name || 'Membre Vérifié',
            targetId: activeContactId,
            reason: reasonLabels[recommendationReason] || 'Membre Recommandé',
            note: recommendationNote || 'Je recommande ce membre dans la foi.',
            date: new Date().toLocaleDateString('fr-FR')
        };

        try {
            const { data } = await supabase.from('system_settings').select('value').eq('key', 'community_recommendations').maybeSingle();
            let recList: any[] = (data?.value && Array.isArray(data.value)) ? data.value : [];
            recList.push(newRec);

            await supabase.from('system_settings').upsert({
                key: 'community_recommendations',
                value: recList,
                updated_at: new Date().toISOString()
            }, { onConflict: 'key' });
        } catch (e) { console.error("Erreur recommandation:", e); }

        const updatedSet = new Set(communityCertifiedIds);
        updatedSet.add(activeContactId);
        setCommunityCertifiedIds(updatedSet);
        try {
            localStorage.setItem('community_certified_users_v1', JSON.stringify(Array.from(updatedSet)));
        } catch {}

        setIsSubmittingRecommendation(false);
        setShowRecommendationModal(false);
        setRecommendationNote('');
        alert(`Merci ! Votre recommandation (Niveau 3) pour ${activeUser?.contactName} a été enregistrée avec succès ! 🛡️`);
    };

    // --- MODE PRIÈRE ---
    const DAILY_VERSES = [
        { ref: 'Philippiens 4:6', text: "Ne vous inquiétez de rien ; mais en toute chose, exposez vos besoins à Dieu par des prières et des supplications, avec des actions de grâces." },
        { ref: 'Psaume 23:1', text: "L'Éternel est mon berger : je ne manquerai de rien." },
        { ref: 'Matthieu 6:33', text: "Cherchez premièrement le royaume et la justice de Dieu ; et toutes ces choses vous seront données par-dessus." },
        { ref: 'Romains 8:28', text: "Nous savons, du reste, que toutes choses concourent au bien de ceux qui aiment Dieu." },
        { ref: 'Ésaïe 40:31', text: "Ceux qui se confient en l'Éternel renouvellent leur force. Ils prennent le vol vers les sommets." },
    ];
    const getDailyVerse = () => DAILY_VERSES[new Date().getDay() % DAILY_VERSES.length];

    const sendPrayerInvitation = async () => {
        if (!currentUserId || !activeContactId) return;
        const verse = getDailyVerse();
        const prayerText = JSON.stringify({ verse_ref: verse.ref, verse_text: verse.text, scheduled_in_min: 5 });
        setIsSending(true);
        try {
            const { data: insertedMsg, error } = await supabase.from('messages').insert({
                sender_id: currentUserId,
                receiver_id: activeContactId,
                content: prayerText,
                type: 'PRAYER',
                read: false
            }).select().single();
            if (error) throw error;
            if (insertedMsg) {
                const newMsg: Message = {
                    id: insertedMsg.id,
                    senderId: insertedMsg.sender_id,
                    text: prayerText,
                    type: 'PRAYER',
                    timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                    isRead: false
                };
                setMessages(prev => [...prev, newMsg]);
                scrollToBottom();
            }
        } catch (e: any) {
            alert('Erreur lors de l\'envoi de l\'invitation : ' + e.message);
        } finally { setIsSending(false); }
    };

    useEffect(() => {
        if (showMentorshipModal) {
            const loadMentors = async () => {
                setLoadingMentors(true);
                try {
                    const { data: result, error } = await supabase.from('priest_contacts').select('*').order('name');
                    if (error) throw error;

                    const defaultMentors = result && result.length > 0 ? result : [
                        { id: '1', name: 'Père André', parish: 'Saint Jean de Cocody', availability: 'Samedi après-midi' },
                        { id: '2', name: 'Pasteur Samuel', parish: 'Temple méthodiste de Marcory', availability: 'Dimanche soir' }
                    ];

                    setMentors(defaultMentors);
                    if (defaultMentors.length > 0) {
                        setSelectedMentorId(defaultMentors[0].id);
                    }
                } catch (e) {
                    console.error("Erreur chargement mentors:", e);
                    const fallback = [
                        { id: '1', name: 'Père André', parish: 'Saint Jean de Cocody', availability: 'Samedi après-midi' },
                        { id: '2', name: 'Pasteur Samuel', parish: 'Temple méthodiste de Marcory', availability: 'Dimanche soir' }
                    ];
                    setMentors(fallback);
                    setSelectedMentorId(fallback[0].id);
                } finally {
                    setLoadingMentors(false);
                }
            };
            loadMentors();
        }
    }, [showMentorshipModal]);

    const handleSubmitMentorship = async () => {
        if (!currentUserId || !activeContactId || !selectedMentorId) return;

        const mentor = mentors.find(m => m.id === selectedMentorId);
        if (!mentor) return;

        setIsSending(true);
        try {
            const mentorshipData = {
                id: Math.random().toString(36).substring(2, 9) + Date.now().toString(),
                matchId: activeContactId,
                requesterId: currentUserId,
                mentorId: mentor.id,
                mentorName: mentor.name,
                mentorParish: mentor.parish || 'Paroisse locale',
                notes: mentorshipNotes,
                status: 'PENDING',
                createdAt: new Date().toISOString(),
                meetings: [
                    {
                        id: 'meet-1',
                        date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] + 'T16:00:00.000Z',
                        type: 'Zoom',
                        link: 'https://zoom.us/j/225christien'
                    }
                ]
            };

            localStorage.setItem('mentorship_requests_v1', JSON.stringify(mentorshipData));

            const mentorshipText = JSON.stringify({
                mentor_name: mentor.name,
                notes: mentorshipNotes,
                status: 'PENDING'
            });

            const { data: insertedMsg, error } = await supabase.from('messages').insert({
                sender_id: currentUserId,
                receiver_id: activeContactId,
                content: mentorshipText,
                type: 'MENTORSHIP',
                read: false
            }).select().single();

            if (error) throw error;

            if (insertedMsg) {
                const newMsg: Message = {
                    id: insertedMsg.id,
                    senderId: insertedMsg.sender_id,
                    text: mentorshipText,
                    type: 'MENTORSHIP',
                    timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                    isRead: false
                };
                setMessages(prev => [...prev, newMsg]);
                scrollToBottom();
            }

            setShowMentorshipModal(false);
            setMentorshipNotes('');
            alert('Votre demande de parrainage spirituel a été envoyée avec succès ! Retrouvez le suivi dans l\'onglet "Vocation".');

        } catch (e: any) {
            alert('Erreur lors de l\'envoi de la demande : ' + e.message);
        } finally {
            setIsSending(false);
        }
    };

    return (
        // FIX MOBILE HEIGHT: use dvh to handle mobile address bars
        <div className="h-[calc(100dvh-140px)] md:h-[650px] bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex font-sans relative">

            {/* INCOMING CALL MODAL */}
            {incomingCall && (
                <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl animate-in zoom-in duration-300">
                        <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/30 animate-pulse">
                            {incomingCall.isVideo ? <VideoIcon size={40} className="text-white" /> : <Phone size={40} className="text-white" />}
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">{incomingCall.callerName}</h2>
                        <p className="text-slate-500 mb-8">Appel {incomingCall.isVideo ? 'vidéo' : 'audio'} entrant...</p>
                        <div className="flex justify-center gap-6">
                            <button onClick={rejectCall} className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-200 transition">
                                <PhoneOff size={28} />
                            </button>
                            <button onClick={acceptCall} className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 shadow-lg shadow-emerald-500/40 transition">
                                {incomingCall.isVideo ? <VideoIcon size={28} /> : <Phone size={28} />}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ACTIVE CALL COMPONENT */}
            {activeCall && currentUserId && (
                <VideoCall
                    currentUserId={currentUserId}
                    targetUserId={activeCall.targetId}
                    targetUserName={activeCall.targetName}
                    isVideo={activeCall.isVideo}
                    isInitiator={activeCall.isInitiator}
                    onHangup={() => {
                        setActiveCall(null);
                        supabase.channel(`call-alerts-${activeCall.targetId}`).send({
                            type: 'broadcast',
                            event: 'incoming-call',
                            payload: { type: 'hangup', callerId: currentUserId }
                        });
                    }}
                />
            )}

            {/* --- MODALE DE PARRAINAGE SPIRITUEL / MENTORAT --- */}
            {showMentorshipModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" onClick={() => setShowMentorshipModal(false)} />
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg relative z-10 p-6 md:p-8 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-3">
                                <div className="bg-emerald-100 text-emerald-700 p-2.5 rounded-2xl">
                                    <span className="text-2xl">🤝</span>
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900 leading-tight">Parrainage Spirituel</h3>
                                    <p className="text-xs text-slate-500 mt-0.5">Sollicitez l'accompagnement d'un couple mature ou d'un prêtre/pasteur.</p>
                                </div>
                            </div>
                            <button onClick={() => setShowMentorshipModal(false)} className="text-slate-400 hover:text-slate-600 p-1.5 bg-slate-100 hover:bg-slate-200 rounded-full transition">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-5 pr-2 custom-scrollbar">
                            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl p-4 text-xs text-emerald-800 leading-relaxed">
                                <strong className="text-emerald-950 font-bold block mb-1">Pourquoi le parrainage ?</strong>
                                Dans la culture africaine chrétienne, l'accompagnement des aînés et le conseil spirituel sont précieux pour bâtir des fondations solides avant le mariage. Vos discussions seront guidées par votre parrain à travers des livrets d'accompagnement.
                            </div>

                            {/* Sélection de l'Accompagnateur */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Choisir un guide spirituel</label>
                                {loadingMentors ? (
                                    <div className="flex items-center justify-center p-4 bg-slate-50 rounded-xl">
                                        <Loader className="animate-spin text-emerald-600 h-5 w-5 mr-2" />
                                        <span className="text-xs text-slate-500">Recherche de mentors disponibles...</span>
                                    </div>
                                ) : (
                                    <div className="grid gap-2">
                                        {mentors.map(mentor => (
                                            <button
                                                key={mentor.id}
                                                type="button"
                                                onClick={() => setSelectedMentorId(mentor.id)}
                                                className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all duration-200 ${selectedMentorId === mentor.id ? 'border-emerald-600 bg-emerald-50/50 shadow-sm' : 'border-slate-200 hover:border-slate-300 bg-white'}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${selectedMentorId === mentor.id ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                                        {mentor.name.slice(0, 2)}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-slate-800 text-sm">{mentor.name}</h4>
                                                        <p className="text-xs text-slate-500">{mentor.parish}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
                                                        {mentor.availability || 'Sur rendez-vous'}
                                                    </span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Note / Intention */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Intention ou Notes de discussion</label>
                                <textarea
                                    value={mentorshipNotes}
                                    onChange={(e) => setMentorshipNotes(e.target.value)}
                                    placeholder="Ex : Nous souhaitons être accompagnés pour préparer notre mariage l'année prochaine et discuter de nos différences ecclésiales..."
                                    rows={3}
                                    className="w-full rounded-2xl border-slate-200 text-sm focus:ring-emerald-500 focus:border-emerald-500 p-3 bg-slate-50 hover:bg-slate-50/50 focus:bg-white transition-all resize-none"
                                />
                            </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-slate-100 flex gap-3">
                            <button
                                onClick={() => setShowMentorshipModal(false)}
                                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition active:scale-95 text-sm"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleSubmitMentorship}
                                disabled={isSending || !selectedMentorId}
                                className="flex-1 px-4 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition active:scale-95 text-sm flex items-center justify-center gap-2"
                            >
                                {isSending ? <Loader className="animate-spin h-5 w-5" /> : (
                                    <>
                                        <span>🤝</span>
                                        <span>Envoyer la demande</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODALE DE SUPPRESSION (OUI/NON) --- */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" onClick={() => !isDeleting && setShowDeleteModal(false)} />
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm relative z-10 p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex flex-col items-center text-center">
                            <div className="bg-red-100 p-3 rounded-full mb-4">
                                <AlertCircle className="h-10 w-10 text-red-600" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Supprimer définitivement ?</h3>
                            <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                                Cette action est irréversible. Le match sera annulé et toute la conversation avec <strong>{activeUser?.contactName}</strong> sera effacée.
                            </p>

                            <div className="flex w-full gap-3">
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    disabled={isDeleting}
                                    className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition active:scale-95 disabled:opacity-50"
                                >
                                    Non
                                </button>
                                <button
                                    onClick={confirmDeleteConversation}
                                    disabled={isDeleting}
                                    className="flex-1 px-4 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 shadow-md transition active:scale-95 flex items-center justify-center disabled:bg-red-400"
                                >
                                    {isDeleting ? <Loader className="animate-spin h-5 w-5" /> : 'Oui'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODALE RECOMMANDATION COMMUNAUTAIRE (NIVEAU 3) --- */}
            {showRecommendationModal && activeUser && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" onClick={() => !isSubmittingRecommendation && setShowRecommendationModal(false)} />
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md relative z-10 p-6 md:p-8 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-3">
                                <div className="bg-amber-100 text-amber-700 p-3 rounded-2xl shadow-inner">
                                    <Award size={24} className="text-amber-600" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-extrabold text-slate-900 leading-tight">Recommander {activeUser.contactName}</h3>
                                    <p className="text-xs text-amber-700 font-semibold mt-0.5">⭐ Certification Communautaire (Niveau 3)</p>
                                </div>
                            </div>
                            <button onClick={() => setShowRecommendationModal(false)} className="text-slate-400 hover:text-slate-600 p-1.5 bg-slate-100 rounded-full">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-gradient-to-r from-amber-50 to-emerald-50 border border-amber-200 rounded-2xl p-4 text-xs text-slate-700 leading-relaxed">
                                <strong className="text-amber-900 font-bold block mb-1">Témoignage de Fraternité Chrétienne 🛡️</strong>
                                Vos recommandations aident la communauté à identifier les membres sérieux, sincères et engagés dans leur parcours de foi.
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Motif de recommandation</label>
                                <select
                                    value={recommendationReason}
                                    onChange={(e) => setRecommendationReason(e.target.value)}
                                    className="w-full rounded-2xl border-slate-200 text-sm focus:ring-amber-500 focus:border-amber-500 p-3 bg-slate-50 font-medium"
                                >
                                    <option value="FOI_ASSIDUE">✝️ Membre engagé(e) et assidu(e) dans sa foi</option>
                                    <option value="VALEURS_CHRETIENNES">🕊️ Personne respectueuse et de grandes valeurs</option>
                                    <option value="PAROISSE_RECOMMANDEE">⛪ Recommandé(e) par la communauté chrétienne</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Note personnelle (Optionnelle)</label>
                                <textarea
                                    value={recommendationNote}
                                    onChange={(e) => setRecommendationNote(e.target.value)}
                                    placeholder="Ex : Je confirme le sérieux et la sincérité de la démarche de ce frère / cette sœur..."
                                    rows={3}
                                    className="w-full rounded-2xl border-slate-200 text-sm focus:ring-amber-500 focus:border-amber-500 p-3 bg-slate-50 resize-none"
                                />
                            </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-slate-100 flex gap-3">
                            <button
                                onClick={() => setShowRecommendationModal(false)}
                                disabled={isSubmittingRecommendation}
                                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition text-sm"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleAddCommunityRecommendation}
                                disabled={isSubmittingRecommendation}
                                className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-600 text-white font-bold hover:from-amber-600 hover:to-emerald-700 shadow-lg shadow-amber-500/20 transition active:scale-95 text-sm flex items-center justify-center gap-2"
                            >
                                {isSubmittingRecommendation ? <Loader className="animate-spin h-5 w-5" /> : (
                                    <>
                                        <Award size={18} />
                                        <span>Certifier (Niveau 3)</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- LISTE DES MATCHS (GAUCHE) --- */}
            {/* Mobile Logic: Hidden if chat is active. Desktop: Always visible. */}
            <div className={`w-full md:w-80 border-r border-slate-200 flex flex-col bg-white ${activeContactId ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center">
                        Messages <span className="ml-2 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">{conversations.length}</span>
                    </h2>
                    <div className="mt-3 relative">
                        <input
                            type="text"
                            placeholder="Rechercher..."
                            className="w-full pl-9 pr-4 py-2 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 transition-all"
                        />
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                    {isLoadingList && conversations.length === 0 && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-10 p-4 text-center">
                            <Loader className="animate-spin text-emerald-500 mb-2 h-8 w-8" />
                            <p className="text-xs text-slate-400 mb-4">Chargement...</p>
                        </div>
                    )}

                    {!isLoadingList && conversations.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-400 p-6 text-center">
                            <div className="bg-slate-50 p-4 rounded-full mb-3">
                                <Mail className="h-8 w-8 text-slate-300" />
                            </div>
                            <p className="font-medium text-slate-600">Aucune discussion</p>
                        </div>
                    )}

                    {conversations.length > 0 && (
                        <div className="space-y-1 p-2">
                            {conversations.map(conv => (
                                <button
                                    key={conv.contactId}
                                    onClick={() => setActiveContactId(conv.contactId)}
                                    className={`w-full p-3 flex items-center rounded-xl transition-all duration-200 ${activeContactId === conv.contactId ? 'bg-emerald-50 shadow-sm border border-emerald-100' : 'hover:bg-slate-50 border border-transparent'}`}
                                >
                                    <div className="relative mr-3">
                                        <img src={conv.contactAvatar} alt={conv.contactName} className="h-12 w-12 rounded-full object-cover border border-slate-200" />
                                        {conv.isOnline && <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full ring-2 ring-white"></span>}
                                    </div>
                                    <div className="flex-1 text-left min-w-0">
                                        <div className="flex justify-between items-baseline mb-0.5">
                                            <h4 className={`text-sm truncate pr-2 ${activeContactId === conv.contactId ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>
                                                {conv.contactName}
                                            </h4>
                                            <div className="flex items-center space-x-2">
                                                <span className="text-[10px] text-slate-400 flex-shrink-0">{conv.lastMessageTime}</span>
                                                {conv.unreadCount > 0 && (
                                                    <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center shadow-sm">
                                                        {conv.unreadCount}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <p className={`text-xs truncate ${activeContactId === conv.contactId ? 'text-emerald-600 font-medium' : conv.unreadCount > 0 ? 'text-slate-800 font-semibold' : 'text-slate-500'}`}>
                                            {conv.lastMessage}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* --- ZONE DE CHAT (DROITE) --- */}
            {/* Mobile Logic: Full width if active. Hidden if not active. */}
            {activeContactId && activeUser ? (
                <div className={`flex flex-col bg-slate-50 h-full ${!activeContactId ? 'hidden md:flex' : 'w-full flex-1'}`}>
                    {/* Header */}
                    <div className="px-4 py-3 bg-white border-b border-slate-200 flex justify-between items-center shadow-sm z-10 flex-shrink-0">
                        <div className="flex items-center">
                            <button onClick={() => setActiveContactId(null)} className="mr-3 md:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-full">
                                <ArrowLeft size={20} />
                            </button>
                            <div className="relative mr-3">
                                <img src={activeUser.contactAvatar} alt="Avatar" className="h-10 w-10 rounded-full object-cover border border-slate-200" />
                                {activeUser.isOnline && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></span>}
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                                    {activeUser.contactName}
                                    <ShieldCheck size={14} className="text-emerald-500" />
                                    {communityCertifiedIds.has(activeContactId!) && (
                                        <span className="flex items-center gap-1 bg-amber-500/15 text-amber-800 border border-amber-400/50 text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-sm">
                                            🛡️ Certifié Communauté (Niveau 3)
                                        </span>
                                    )}
                                </h3>
                                <p className="text-xs text-slate-500">{activeUser.isOnline ? 'En ligne' : 'Hors ligne'}</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-1">
                            <button onClick={() => startCall(false)} className="p-2 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 rounded-full transition" title="Appel Audio">
                                <Phone size={18} />
                            </button>
                            <button onClick={() => startCall(true)} className="p-2 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 rounded-full transition mr-1" title="Appel Vidéo">
                                <VideoIcon size={18} />
                            </button>
                            <div className="w-px h-5 bg-slate-200 mx-1"></div>
                            <button
                                onClick={() => setShowRecommendationModal(true)}
                                className="p-2 text-amber-600 hover:bg-amber-50 rounded-full transition"
                                title="Recommander ce membre (Niveau 3 - Certifié Communauté) ⭐"
                            >
                                <Award size={20} />
                            </button>
                            <button
                                onClick={sendPrayerInvitation}
                                disabled={isSending}
                                className="p-2 text-purple-500 hover:bg-purple-50 rounded-full transition"
                                title="Mode Prière Commune 🙏"
                            >
                                <HeartHandshake size={20} />
                            </button>
                            <button
                                onClick={handleStartNewQuiz}
                                className="p-2 text-amber-600 hover:bg-amber-50 rounded-full transition flex items-center gap-1"
                                title="Lancer un Quiz Biblique Duo 📖"
                            >
                                <BookOpen size={20} className="text-amber-600" />
                            </button>
                            <button
                                onClick={() => setShowMentorshipModal(true)}
                                className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-full transition mr-1"
                                title="Demander un parrainage conjugal 🤝"
                            >
                                <span className="text-xl">🤝</span>
                            </button>
                            <button
                                onClick={() => setShowDeleteModal(true)}
                                className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-full transition"
                                title="Supprimer la conversation"
                            >
                                <Trash2 size={20} />
                            </button>
                        </div>
                    </div>

                    {/* 🛡️ BOUCLIER SÉCURITÉ ANTI-ARNAQUE FINANCIÈRE (BANNER DE DÉTECTION EN TEMPS RÉEL) */}
                    {messages.some(m => m.senderId === activeContactId && m.text && detectFinancialScam(m.text).isScamRisk) && !dismissScamWarning && (
                        <div className="bg-gradient-to-r from-red-600 via-amber-600 to-red-700 text-white px-4 py-3 shadow-md flex items-center justify-between border-b border-red-400 z-20 animate-in slide-in-from-top-2">
                            <div className="flex items-center space-x-3">
                                <div className="bg-white/20 p-2 rounded-xl shrink-0">
                                    <ShieldAlert size={22} className="text-amber-200 animate-pulse" />
                                </div>
                                <div className="text-left">
                                    <p className="text-xs font-extrabold uppercase tracking-wider text-amber-200 flex items-center gap-1.5">
                                        <span>🛡️ BOUCLIER SÉCURITÉ ANTI-ARNAQUE FINANCIÈRE ACTIVÉ</span>
                                    </p>
                                    <p className="text-xs text-white/95 font-medium leading-tight">
                                        Ce contact sollicite un transfert d'argent ou Mobile Money (Wave / Orange Money / Urgence). Ne transférez <strong>JAMAIS</strong> de sous ni de code OTP.
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2 shrink-0 ml-2">
                                <button
                                    onClick={handleReportScam}
                                    className="bg-white text-red-700 font-bold px-3 py-1.5 rounded-xl text-xs shadow-md hover:bg-red-50 transition active:scale-95 shrink-0"
                                >
                                    🚨 Signaler & Bloquer
                                </button>
                                <button
                                    onClick={() => setDismissScamWarning(true)}
                                    className="text-white/70 hover:text-white p-1 rounded-full hover:bg-white/10"
                                    title="Masquer l'avertissement"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Messages Container - Flex Grow to take available space */}
                    <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#e5ddd5] bg-opacity-30 custom-scrollbar relative">
                        {isLoadingChat && (
                            <div className="flex justify-center py-4 relative z-10"><Loader className="animate-spin text-emerald-600" /></div>
                        )}
                        {!isLoadingChat && messages.length === 0 && (
                            <div className="text-center py-6 relative z-10 space-y-4">
                                <div className="bg-white/50 inline-block px-4 py-2 rounded-full text-xs text-slate-500 shadow-sm">
                                    Dites bonjour ! 👋
                                </div>
                                {/* AI ICEBREAKER SECTION */}
                                <div className="px-4">
                                    {icebreakers.length > 0 ? (
                                        <div className="space-y-2">
                                            <p className="text-xs text-slate-500 font-medium">Idées de sujets pour engager la conversation</p>
                                            {icebreakers.map((ib, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => setInputText(ib)}
                                                    className="w-full text-left text-sm bg-white/80 backdrop-blur-md rounded-xl p-3 border border-emerald-200 text-slate-700 hover:bg-emerald-50 hover:border-emerald-400 transition shadow-sm"
                                                >
                                                    {ib}
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <button
                                            onClick={handleLoadIcebreakers}
                                            disabled={isLoadingIcebreakers}
                                            className="flex items-center justify-center w-full px-4 py-2.5 bg-white/80 backdrop-blur-md rounded-xl border border-slate-200 text-sm font-medium text-emerald-700 hover:bg-emerald-50 transition shadow-sm disabled:opacity-60"
                                        >
                                            {isLoadingIcebreakers ? <Loader size={15} className="animate-spin mr-2" /> : <MessageCircle size={15} className="mr-2 text-emerald-600" />}
                                            Idées de sujets pour débuter l'échange
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                        {messages.map((msg, idx) => {
                            const isMe = msg.senderId === currentUserId;

                            // PRAYER CARD
                            if (msg.type === 'PRAYER') {
                                let verse = { ref: '', text: '' };
                                try { const p = JSON.parse(msg.text || '{}'); verse = { ref: p.verse_ref, text: p.verse_text }; } catch { }
                                return (
                                    <div key={msg.id} className="flex justify-center my-2">
                                        <div className="w-full max-w-sm bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-2xl p-4 shadow-md">
                                            <div className="flex items-center mb-3">
                                                <HeartHandshake size={18} className="text-purple-500 mr-2" />
                                                <span className="font-bold text-purple-800 text-sm">{isMe ? 'Vous avez' : activeUser?.contactName + ' a'} proposé un temps de prière 🙏</span>
                                            </div>
                                            <p className="italic text-slate-700 text-sm mb-3 leading-relaxed">"{verse.text}"</p>
                                            <p className="text-xs text-purple-600 font-semibold text-right mb-3">— {verse.ref}</p>
                                            <div className="text-[10px] text-slate-400 text-right">{msg.timestamp}</div>
                                        </div>
                                    </div>
                                );
                            }

                            // MENTORSHIP CARD
                            if (msg.type === 'MENTORSHIP') {
                                let data = { mentor_name: '', notes: '', status: 'PENDING' };
                                try { data = JSON.parse(msg.text || '{}'); } catch { }
                                return (
                                    <div key={msg.id} className="flex justify-center my-3 animate-in fade-in zoom-in duration-300">
                                        <div className="w-full max-w-md bg-gradient-to-br from-emerald-50 via-teal-50 to-amber-50/30 border border-emerald-200 rounded-2xl p-5 shadow-lg relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
                                            <div className="flex items-center mb-3">
                                                <div className="bg-emerald-500/10 p-2 rounded-xl mr-3 border border-emerald-200/50">
                                                    <span className="text-xl">🤝</span>
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-emerald-900 text-sm">Demande d'Accompagnement Spirituel</h4>
                                                    <p className="text-[10px] text-emerald-600 font-medium">Mentorat Conjugal</p>
                                                </div>
                                            </div>

                                            <div className="bg-white/80 rounded-xl p-3.5 border border-emerald-100/50 mb-3 space-y-2">
                                                <p className="text-xs text-slate-600">
                                                    <strong className="text-slate-800">Parrain spirituel sollicité :</strong> {data.mentor_name}
                                                </p>
                                                {data.notes && (
                                                    <p className="text-xs text-slate-600 italic leading-relaxed">
                                                        <strong className="text-slate-800 font-semibold not-italic">Intention :</strong> "{data.notes}"
                                                    </p>
                                                )}
                                            </div>

                                            <div className="flex items-center justify-between text-xs pt-1">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                                    ⏳ En attente du parrain
                                                </span>
                                                <span className="text-[10px] text-slate-400">{msg.timestamp}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }

                            const isScamRiskMsg = !isMe && msg.text ? detectFinancialScam(msg.text).isScamRisk : false;

                            return (
                                <div key={msg.id} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'} ${idx > 0 && messages[idx - 1].senderId === msg.senderId ? 'mt-1' : 'mt-3'}`}>
                                    <div className={`relative max-w-[75%] md:max-w-[60%] px-3 py-2 shadow-sm ${
                                        isMe 
                                            ? 'bg-emerald-600 text-white rounded-l-2xl rounded-tr-2xl rounded-br-md' 
                                            : isScamRiskMsg 
                                                ? 'bg-red-50 text-red-900 border-2 border-red-400 rounded-r-2xl rounded-tl-2xl rounded-bl-md' 
                                                : 'bg-white text-slate-800 rounded-r-2xl rounded-tl-2xl rounded-bl-md'
                                        }`}>
                                        {isScamRiskMsg && (
                                            <div className="mb-2 p-2 bg-red-100/80 border border-red-300 rounded-xl text-xs text-red-800 font-medium flex items-start gap-1.5">
                                                <ShieldAlert size={16} className="text-red-600 shrink-0 mt-0.5 animate-pulse" />
                                                <div>
                                                    <strong className="block font-bold">⚠️ Alerte Sécurité Anti-Arnaque :</strong>
                                                    <span>Ce message contient une demande d'argent ou transfert Mobile Money / Wave. Ne versez aucun fonds.</span>
                                                </div>
                                            </div>
                                        )}
                                        {msg.type === 'IMAGE' && msg.attachmentUrl && (
                                            <div className="mb-2 rounded-lg overflow-hidden bg-slate-200 min-h-[150px] relative group">
                                                <img
                                                    src={msg.attachmentUrl}
                                                    alt="Photo"
                                                    className={`w-full h-auto max-h-[300px] object-cover ${msg.isNsfw ? 'blur-2xl brightness-50 contrast-125' : ''}`}
                                                    loading="lazy"
                                                    onLoad={() => scrollToBottom()}
                                                />
                                                {msg.isNsfw && (
                                                    <div className="absolute inset-0 flex items-center justify-center flex-col z-10 text-center p-2 text-white pointer-events-none">
                                                        <AlertCircle className="h-8 w-8 text-red-400 mb-2 drop-shadow-md" />
                                                        <span className="font-bold text-xs bg-black/70 px-3 py-1 rounded-full backdrop-blur-sm">Contenu Sensible Masqué</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {msg.type === 'VIDEO' && msg.attachmentUrl && (
                                            <div className="mb-2 rounded-lg overflow-hidden bg-slate-900 max-w-full aspect-video relative">
                                                <video
                                                    src={msg.attachmentUrl}
                                                    controls
                                                    playsInline
                                                    preload="metadata"
                                                    className="w-full h-full max-h-[300px] object-cover"
                                                    onPlay={() => scrollToBottom()}
                                                />
                                            </div>
                                        )}
                                        {msg.type === 'AUDIO' && msg.attachmentUrl && (
                                            <div className="my-1">
                                                <AudioPlayer src={msg.attachmentUrl} isMe={isMe} />
                                            </div>
                                        )}
                                        {msg.text && msg.type !== 'PRAYER' && msg.type !== 'QUIZ_CHALLENGE' && <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{msg.text}</p>}
                                        <div className={`text-[10px] text-right mt-1 opacity-70 flex justify-end items-center space-x-1 ${isMe ? 'text-emerald-100' : 'text-slate-400'}`}>
                                            <span>{msg.timestamp}</span>
                                            {isMe && <span>{msg.isRead ? '••' : '•'}</span>}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={scrollRef} />
                    </div>

                    {/* AI Anti-Ghosting + Input Area */}
                    <div className="bg-white border-t border-slate-200 flex-shrink-0">
                        {/* Anti-Ghosting Banner */}
                        {antiGhostingSuggestion && (
                            <div className="px-3 pt-2 animate-in slide-in-from-bottom-2">
                                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl p-2.5">
                                    <MessageCircle size={14} className="text-emerald-600 flex-shrink-0" />
                                    <p className="text-xs text-amber-800 flex-1 italic">"{antiGhostingSuggestion}"</p>
                                    <button onClick={() => setInputText(antiGhostingSuggestion)} className="text-xs text-amber-700 font-bold hover:underline flex-shrink-0">Utiliser</button>
                                    <button onClick={() => setAntiGhostingSuggestion(null)} className="text-slate-400 hover:text-slate-500"><X size={14} /></button>
                                </div>
                            </div>
                        )}
                        {/* Anti-Ghosting Trigger: show when last msg is from me and conversation is stale */}
                        {!antiGhostingSuggestion && messages.length > 0 && messages[messages.length - 1]?.senderId === currentUserId && (
                            <div className="px-3 pt-2">
                                <button
                                    onClick={handleAntiGhosting}
                                    disabled={isLoadingAntiGhosting}
                                    className="flex items-center text-xs text-slate-400 hover:text-emerald-600 transition disabled:opacity-50"
                                >
                                    {isLoadingAntiGhosting ? <Loader size={12} className="animate-spin mr-1" /> : <MessageCircle size={12} className="mr-1 text-emerald-600" />}
                                    Idée pour relancer l'échange
                                </button>
                            </div>
                        )}
                        {/* Saisie */}
                        <div className="p-2 md:p-3">
                            {attachedFile && (
                                <div className="flex items-center justify-between bg-slate-100 p-2 rounded-xl mb-2 mx-2 border border-slate-200">
                                    <div className="flex items-center text-xs font-medium text-slate-700">
                                        {attachedFile.type === 'IMAGE' && <ImageIcon size={16} className="mr-2 text-blue-500" />}
                                        {attachedFile.type === 'VIDEO' && <VideoIcon size={16} className="mr-2 text-purple-500" />}
                                        <span className="truncate">{attachedFile.file.name}</span>
                                    </div>
                                    <button onClick={() => setAttachedFile(null)} className="p-1 hover:bg-slate-200 rounded-full"><X size={16} /></button>
                                </div>
                            )}

                            {/* BARRE DE PRÉ-ÉCOUTE DU VOCAL S'IL EST ENREGISTRÉ */}
                            {audioBlob && !isRecording && (
                                <div className="flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50 p-2.5 rounded-2xl mb-2.5 mx-1 border border-emerald-200 shadow-sm animate-in slide-in-from-bottom-2">
                                    <div className="flex-1 mr-2">
                                        <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider mb-1 flex items-center gap-1">
                                            <span>🎙️ Note Vocale Enregistrée (Pré-écoute)</span>
                                        </p>
                                        <AudioPlayer src={URL.createObjectURL(audioBlob)} isMe={true} />
                                    </div>
                                    <button
                                        onClick={() => setAudioBlob(null)}
                                        className="p-2 text-red-500 hover:bg-red-100 rounded-full transition"
                                        title="Supprimer la note vocale"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            )}

                            <div className="flex items-end gap-2">
                                {!isRecording && !audioBlob && (
                                    <button onClick={() => fileInputRef.current?.click()} className="p-3 text-slate-400 hover:bg-slate-100 rounded-full" title="Ajouter une photo ou vidéo">
                                        <ImageIcon size={24} />
                                    </button>
                                )}
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*,video/*"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            const type = file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE';
                                            setAttachedFile({ file, type });
                                        }
                                    }}
                                />

                                <div className="flex-1 bg-slate-100 rounded-2xl px-4 min-h-[48px] flex items-center border border-slate-200">
                                    {isRecording ? (
                                        <div className="flex items-center justify-between w-full">
                                            <div className="flex items-center space-x-2 text-red-600 font-mono font-extrabold text-sm">
                                                <span className="w-3 h-3 rounded-full bg-red-600 animate-ping inline-block" />
                                                <span>🔴 Enregistrement {formatDuration(recordingDuration)}</span>
                                            </div>

                                            {/* Equalizer animation */}
                                            <div className="flex items-center gap-0.5 h-4 mx-2">
                                                <div className="w-1 bg-red-500 h-full animate-pulse" />
                                                <div className="w-1 bg-red-400 h-3 animate-bounce" />
                                                <div className="w-1 bg-red-600 h-full animate-pulse" />
                                            </div>

                                            <button
                                                type="button"
                                                onClick={cancelRecording}
                                                className="text-xs font-extrabold text-slate-500 hover:text-red-600 uppercase bg-slate-200 hover:bg-red-100 px-3 py-1.5 rounded-full transition"
                                            >
                                                Annuler
                                            </button>
                                        </div>
                                    ) : (
                                        <textarea
                                            value={inputText}
                                            onChange={(e) => setInputText(e.target.value)}
                                            placeholder={audioBlob ? "Note vocale prête à être envoyée..." : "Tapez un message..."}
                                            disabled={!!audioBlob}
                                            className="w-full bg-transparent border-none focus:ring-0 text-sm resize-none py-3 disabled:opacity-50"
                                            rows={1}
                                        />
                                    )}
                                </div>

                                <button
                                    onClick={
                                        inputText.trim() || attachedFile || audioBlob 
                                            ? handleSendMessage 
                                            : (isRecording ? stopRecording : startRecording)
                                    }
                                    className={`p-3 rounded-full shadow-lg transition transform active:scale-95 flex items-center justify-center ${
                                        inputText.trim() || attachedFile || audioBlob 
                                            ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
                                            : (isRecording ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse' : 'bg-emerald-600 text-white hover:bg-emerald-700')
                                    }`}
                                    title={isRecording ? "Arrêter l'enregistrement" : (inputText.trim() || attachedFile || audioBlob ? "Envoyer" : "Enregistrer un message vocal")}
                                >
                                    {isSending ? (
                                        <Loader className="animate-spin" size={20} />
                                    ) : (inputText.trim() || attachedFile || audioBlob ? (
                                        <Send size={20} />
                                    ) : (isRecording ? (
                                        <StopCircle size={24} />
                                    ) : (
                                        <Mic size={22} />
                                    )))}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-slate-50 text-slate-400">
                    <Mail size={64} className="text-emerald-200 mb-4" />
                    <h3 className="text-xl font-bold text-slate-800">Vos conversations</h3>
                    <p>Sélectionnez un profil pour discuter.</p>
                </div>
            )}

            {/* MODALE DE QUIZ BIBLIQUE DUO 📖 */}
            <BibleQuizModal
                isOpen={showQuizModal}
                onClose={() => setShowQuizModal(false)}
                onCompleteQuiz={handleCompleteQuiz}
                opponentName={quizOpponentName}
                isChallenging={isChallengingQuiz}
                originalScore={originalQuizScore}
            />
        </div>
    );
};
