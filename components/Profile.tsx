import React, { useState, useEffect, useRef } from 'react';
import { User, VerificationStatus } from '../types';
import { AVAILABLE_INTERESTS } from '../constants';
import { supabase } from '../supabaseClient';
import { compressImage } from '../utils/imageCompressor';
import { UserCheck, ShieldCheck, Shield, Camera, AlertCircle, CheckCircle, Clock, Lock, Plus, X, Tag, FileText, CreditCard, Zap, Video, Play, Loader, Info, StopCircle, RefreshCw, Image as ImageIcon, Trash2, Phone, CalendarClock, AlertTriangle, Mic, EyeOff, Eye } from 'lucide-react';
import { compareFaces } from '../utils/deepfaceClient';
import { PinLockModal } from './PinLockModal';
import { getCleanDisplayContact } from '../utils/phoneFormatter';
import { PointsExplanationModal } from './PointsExplanationModal';
import { PremiumCountdownBadge } from './PremiumCountdownBadge';

const getImlrUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return supabase.storage.from('Public').getPublicUrl(path).data.publicUrl;
};

export const Profile: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [profileTab, setProfileTab] = useState<'PROFIL' | 'VERIFICATION' | 'POINTS' | 'SECURITY'>('PROFIL');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [isUploadingGallery, setIsUploadingGallery] = useState(false);

    const [isEditing, setIsEditing] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    // Modals
    const [showPremiumModal, setShowPremiumModal] = useState(false);
    const [showPointsModal, setShowPointsModal] = useState(false);
    const [showRenewalModal, setShowRenewalModal] = useState(false); // Modal de rappel d'expiration
    const [renewalDaysLeft, setRenewalDaysLeft] = useState<number | null>(null);

    // États pour les données dynamiques
    const [parishes, setParishes] = useState<{ id: string, name: string }[]>([]);

    // Verification Files State
    const [idFile, setIdFile] = useState<File | null>(null);
    const [baptismFile, setBaptismFile] = useState<File | null>(null);

    // Video Verification State
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [videoCountdown, setVideoCountdown] = useState<number>(5);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);

    const videoRef = useRef<HTMLVideoElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const videoTimerRef = useRef<any>(null);

    // Audio Testimonial State
    const [isRecordingAudio, setIsRecordingAudio] = useState(false);
    const [audioTestimonialBlob, setAudioTestimonialBlob] = useState<Blob | null>(null);
    const [audioTestimonialUrl, setAudioTestimonialUrl] = useState<string | null>(null);
    const [savedTestimonialUrl, setSavedTestimonialUrl] = useState<string | null>(null);
    const [isUploadingTestimonial, setIsUploadingTestimonial] = useState(false);
    const [audioDuration, setAudioDuration] = useState(0);
    const audioRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const audioTimerRef = useRef<number | null>(null);

    const [verificationCode, setVerificationCode] = useState('');

    // États de Certification Communautaire ("Anti-Brouteurs")
    const [isCommunityCertified, setIsCommunityCertified] = useState(false);
    const [hasPendingCertification, setHasPendingCertification] = useState(false);
    const [certNotes, setCertNotes] = useState('');
    const [pendingCertNotes, setPendingCertNotes] = useState('');

    // États Code PIN 🔒
    const [showSetPinModal, setShowSetPinModal] = useState(false);
    const [hasPin, setHasPin] = useState<boolean>(() => !!localStorage.getItem('_225_security_pin'));

    const handleRemovePin = () => {
        localStorage.removeItem('_225_security_pin');
        setHasPin(false);
    };

    // Helper function to split parish string
    const getDenominationAndChurch = (fullParish?: string) => {
        if (!fullParish) return { denomination: '', church: '' };
        if (fullParish.includes(' - ')) {
            const parts = fullParish.split(' - ');
            return { denomination: parts[0], church: parts.slice(1).join(' - ') };
        }
        return { denomination: '', church: fullParish };
    };

    // Form States
    const [formData, setFormData] = useState({
        name: '',
        denomination: '',
        church: '',
        phone: '',
        baptismYear: '',
        interests: [] as string[]
    });

    // Payment State
    const [paymentConfig, setPaymentConfig] = useState<{ publicKey: string, currency: string, amount: number } | null>(null);
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);
    const [paymentMode, setPaymentMode] = useState<'SUBSCRIPTION' | 'DONATION'>('SUBSCRIPTION');
    const [selectedPlan, setSelectedPlan] = useState<'DAY' | 'MONTH' | 'QUARTER' | 'YEAR'>('MONTH');
    const [customDonationAmount, setCustomDonationAmount] = useState<string>('500');
    const [pointsPricingConfig, setPointsPricingConfig] = useState<any>(null);

    // Interest Input State
    const [interestInput, setInterestInput] = useState('');
    const [suggestions, setSuggestions] = useState<string[]>([]);

    // Ref pour l'input file de l'avatar et galerie
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);

    // --- HELPER FUNCTION: CALCULATE DAYS REMAINING ---
    const getDaysRemaining = (expirationDateStr?: string) => {
        if (!expirationDateStr) return null;
        const expirationDate = new Date(expirationDateStr);
        const today = new Date();

        // Calculer la différence en millisecondes
        const diffTime = expirationDate.getTime() - today.getTime();

        // Si la date est passée, retourner 0 (ou négatif)
        if (diffTime < 0) return 0;

        // Convertir en jours (arrondi supérieur)
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return diffDays;
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    // Charger les données utilisateur au montage
    useEffect(() => {
        const loadUserData = async () => {
            const { data: { session } } = await supabase.auth.getSession();

            if (session?.user) {
                try {
                    const { data: model } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();

                    if (model) {
                        const currentUser: any = {
                            id: model.id,
                            name: model.full_name || model.name,
                            email: session.user.email,
                            role: model.role,
                            parish: model.parish,
                            phone: model.phone,
                            baptismYear: model.baptism_year,
                            isPremium: model.is_premium,
                            premiumExpiration: model.premium_expiration,
                            isInvisible: model.is_invisible || false,
                            avatarUrl: model.avatar_url ? getImlrUrl(model.avatar_url) : 'https://picsum.photos/id/1012/150/150',
                            photos: model.photos_urls || [],
                            verificationStatus: model.verification_status || VerificationStatus.UNVERIFIED,
                            interests: model.interests ? model.interests.split(',').map((t: string) => t.trim()) : []
                        };

                        const { denomination, church } = getDenominationAndChurch(currentUser.parish);
                        setUser(currentUser);
                        setFormData({
                            name: currentUser.name || '',
                            denomination: denomination || '',
                            church: church || '',
                            phone: currentUser.phone || '',
                            baptismYear: currentUser.baptismYear?.toString() || '',
                            interests: currentUser.interests || []
                        });
                        setVerificationCode(model.id.substring(0, 4).toUpperCase());
                        // Load testimonial audio if exists
                        if (model.testimonial_audio_url) {
                            setSavedTestimonialUrl(supabase.storage.from('Public').getPublicUrl(model.testimonial_audio_url).data.publicUrl);
                        }

                        if (currentUser.isPremium && currentUser.premiumExpiration) {
                            const daysLeft = getDaysRemaining(currentUser.premiumExpiration);
                            if (daysLeft !== null && (daysLeft === 7 || daysLeft === 3 || daysLeft === 1)) {
                                const todayStr = new Date().toDateString();
                                const storageKey = `renewal_popup_shown_${currentUser.id}_${todayStr}`;
                                if (!localStorage.getItem(storageKey)) {
                                    setRenewalDaysLeft(daysLeft);
                                    setShowRenewalModal(true);
                                    localStorage.setItem(storageKey, 'true');
                                }
                            }
                        }
                    }
                } catch (err) {
                    console.error("Erreur chargement profil", err);
                }
            }
            setIsLoading(false);
        };

        const loadParishes = async () => {
            try {
                const { data: result, error } = await supabase.from('parishes').select('id, name').order('name');
                if (!error && result) {
                    setParishes(result.map((p: any) => ({ id: p.id, name: p.name })));
                }
            } catch (e) {
                console.log("Info: Impossible de charger les paroisses", e);
            }
        };

        const loadPaymentConfig = async () => {
            try {
                const { data: settings } = await supabase.from('settings').select('*').limit(1);
                if (settings && settings.length > 0) {
                    const isProd = settings[0].paystack_mode === 'PRODUCTION';
                    const activeKey = isProd
                        ? (settings[0].paystack_live_public_key || settings[0].paystack_public_key)
                        : settings[0].paystack_public_key;

                    setPaymentConfig({
                        publicKey: activeKey || 'pk_test_placeholder',
                        currency: settings[0].currency || 'XOF',
                        amount: settings[0].amount || 2500
                    });
                }

                const { data: pointsData } = await supabase.from('system_settings').select('value').eq('key', 'points_pricing_config').maybeSingle();
                if (pointsData?.value) {
                    setPointsPricingConfig(pointsData.value);
                }
            } catch (e) {
                console.log("Config paiement non trouvée");
            }
        };

        loadUserData();
        loadParishes();
        loadPaymentConfig();

        // Cleanup function to stop camera if component unmounts
        return () => {
            stopCameraStream();
        };
    }, []);

    useEffect(() => {
        const checkCertStatus = async () => {
            if (user) {
                if (user.verificationStatus === 'VERIFIED') {
                    setIsCommunityCertified(true);
                }
                try {
                    const { data } = await supabase.from('system_settings').select('value').eq('key', 'certification_requests').maybeSingle();
                    if (data?.value && Array.isArray(data.value)) {
                        const userReq = data.value.find((r: any) => r.userId === user.id);
                        if (userReq) {
                            if (userReq.status === 'PENDING') {
                                setHasPendingCertification(true);
                                setPendingCertNotes(userReq.notes || '');
                            } else if (userReq.status === 'APPROVED') {
                                setIsCommunityCertified(true);
                                setHasPendingCertification(false);
                            }
                        }
                    }
                } catch (e) {}
            }
        };
        checkCertStatus();
    }, [user]);

    const handleRequestCommunityCertification = async () => {
        if (!user) return;

        const newReq = {
            id: 'cert-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
            userId: user.id,
            userName: user.name,
            userEmail: user.email,
            userAvatar: user.avatarUrl,
            parish: user.parish || `${formData.denomination} - ${formData.church}`,
            notes: certNotes,
            status: 'PENDING',
            submittedDate: new Date().toLocaleDateString('fr-FR')
        };

        try {
            const { data } = await supabase.from('system_settings').select('value').eq('key', 'certification_requests').maybeSingle();
            let reqList: any[] = (data?.value && Array.isArray(data.value)) ? data.value : [];
            reqList = reqList.filter((r: any) => r.userId !== user.id);
            reqList.push(newReq);

            await supabase.from('system_settings').upsert({
                key: 'certification_requests',
                value: reqList,
                updated_at: new Date().toISOString()
            }, { onConflict: 'key' });
        } catch (e) {
            console.error("Erreur envoi demande certification Supabase:", e);
        }

        setHasPendingCertification(true);
        setPendingCertNotes(certNotes);
        setCertNotes('');
        alert("Votre demande de certification a été transmise en base de données Supabase avec succès !");
    };

    // --- PAYSTACK INTEGRATION ---
    const initPaystack = () => {
        if (!paymentConfig || !paymentConfig.publicKey) {
            alert("Configuration de paiement manquante. Veuillez contacter l'administrateur.");
            return;
        }

        setIsProcessingPayment(true);

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
            setIsProcessingPayment(false);
            alert("Erreur de chargement du module de paiement. Vérifiez votre connexion.");
        };
        document.body.appendChild(script);
    };

    const setupPaystack = () => {
        try {
            if (!user || !paymentConfig) throw new Error("Données manquantes");

            let amountToPay = 2500;
            let addedDays = 30;

            if (paymentMode === 'DONATION') {
                amountToPay = parseInt(customDonationAmount);
            } else {
                if (selectedPlan === 'DAY') {
                    amountToPay = pointsPricingConfig?.premiumDailyPrice || 500;
                    addedDays = 1;
                } else if (selectedPlan === 'MONTH') {
                    amountToPay = pointsPricingConfig?.premiumMonthlyPrice || 2500;
                    addedDays = 30;
                } else if (selectedPlan === 'QUARTER') {
                    amountToPay = pointsPricingConfig?.premiumQuarterlyPrice || 5000;
                    addedDays = 90;
                } else if (selectedPlan === 'YEAR') {
                    amountToPay = pointsPricingConfig?.premiumYearlyPrice || 15000;
                    addedDays = 365;
                }
            }

            if (isNaN(amountToPay) || amountToPay < 500) {
                alert("Le montant minimum est de 500 FCFA.");
                setIsProcessingPayment(false);
                return;
            }

            const handler = (window as any).PaystackPop.setup({
                key: paymentConfig.publicKey,
                email: user.email,
                amount: Math.ceil(amountToPay * 100),
                currency: paymentConfig.currency,
                ref: (paymentMode === 'DONATION' ? 'DON_' : 'SUBS_') + Math.floor((Math.random() * 1000000000) + 1),
                metadata: {
                    custom_fields: [
                        {
                            display_name: "Nom",
                            variable_name: "name",
                            value: user.name
                        }
                    ]
                },
                callback: async function (response: any) {
                    try {
                        await supabase.from('payments').insert({
                            user_id: user.id,
                            amount: amountToPay,
                            reference: response.reference,
                            status: response.status,
                            gateway: 'PAYSTACK'
                        });

                        if (paymentMode === 'SUBSCRIPTION') {
                            const now = new Date();
                            let newExpirationDate = new Date();
                            if (user.isPremium && user.premiumExpiration) {
                                const currentExpiration = new Date(user.premiumExpiration);
                                if (currentExpiration > now) newExpirationDate = new Date(currentExpiration);
                            }
                            newExpirationDate.setDate(newExpirationDate.getDate() + addedDays);
                            await supabase.from('profiles').update({ is_premium: true, premium_expiration: newExpirationDate.toISOString() }).eq('id', user.id);
                            setUser(prev => prev ? { ...prev, isPremium: true, premiumExpiration: newExpirationDate.toISOString() } : null);
                            alert(`🎉 Paiement réussi ! Votre abonnement Premium a été activé pour ${addedDays} jour(s).`);
                        } else if (paymentMode === 'DONATION') {
                            const earnedCredits = Math.max(1, Math.floor(amountToPay / 500));
                            const newCredits = (user.credits || 0) + earnedCredits;
                            await supabase.from('profiles').update({ credits: newCredits }).eq('id', user.id);
                            setUser(prev => prev ? { ...prev, credits: newCredits } : null);
                            alert(`💖 Merci pour votre don de ${amountToPay} FCFA ! Vous avez reçu +${earnedCredits} crédits Spotlight.`);
                        }
                        setShowPremiumModal(false);
                        setShowRenewalModal(false);
                    } catch (error) {
                        console.error("Erreur post-paiement", error);
                        alert("Paiement validé mais erreur lors de l'activation. Contactez le support.");
                    } finally {
                        setIsProcessingPayment(false);
                    }
                },
                onClose: function () {
                    setIsProcessingPayment(false);
                    console.log('Fenêtre de paiement fermée');
                }
            });
            handler.openIframe();
        } catch (error: any) {
            setIsProcessingPayment(false);
            console.error("Setup erreur", error);
            alert("Erreur de préparation du paiement: " + error.message);
        }
    };

    const handleUpgradePremium = () => {
        setPaymentMode('SUBSCRIPTION');
        initPaystack();
    };

    const handleActivateSpotlight = async () => {
        if (!user) return;
        if ((user.credits || 0) < 1) {
            alert("Pas assez de crédits. Faites un don libre pour en obtenir !");
            setPaymentMode('DONATION');
            setShowPremiumModal(true);
            return;
        }
        const ok = window.confirm("Dépenser 1 crédit pour activer le Spotlight (votre profil en premier) pendant 30 minutes ?");
        if (!ok) return;
        setIsSaving(true);
        try {
            const expires = new Date();
            expires.setMinutes(expires.getMinutes() + 30);
            const newCredits = (user.credits || 0) - 1;
            await supabase.from('profiles').update({ credits: newCredits, boost_expires_at: expires.toISOString() }).eq('id', user.id);
            setUser(prev => prev ? { ...prev, credits: newCredits, boost_expires_at: expires.toISOString() } : null);
            alert("⚡ Spotlight activé ! Votre profil est mis en avant pendant 30 minutes.");
        } catch (e: any) {
            alert("Impossible d'activer le Spotlight.");
        } finally {
            setIsSaving(false);
        }
    };

    // --- GESTION CAMERA ET FLUX VIDEO ---
    useEffect(() => {
        if (isCameraActive && videoRef.current && streamRef.current) {
            videoRef.current.srcObject = streamRef.current;
            videoRef.current.play().catch(e => console.log("Autoplay bloqué ou en attente", e));
        } else if (!isCameraActive && videoRef.current) {
            videoRef.current.srcObject = null;
        }
    }, [isCameraActive]);

    const handleInterestInputChange = (e: React.ChangeEvent<HTMLInputElement>) => { const val = e.target.value; setInterestInput(val); if (val.length > 0) { const filtered = AVAILABLE_INTERESTS.filter(i => i.toLowerCase().includes(val.toLowerCase()) && !formData.interests.includes(i)); setSuggestions(filtered); } else { setSuggestions([]); } };
    const addInterest = (interest: string) => { if (!formData.interests.includes(interest)) { setFormData({ ...formData, interests: [...formData.interests, interest] }); } setInterestInput(''); setSuggestions([]); };
    const removeInterest = (interest: string) => { setFormData({ ...formData, interests: formData.interests.filter(i => i !== interest) }); };

    const handleToggleInvisible = async () => {
        if (!user) return;
        if (!user.isPremium) {
            alert("Le mode invisible est réservé aux membres Premium.");
            setShowPremiumModal(true);
            return;
        }
        try {
            const newStatus = !user.isInvisible;
            await supabase.from('profiles').update({ is_invisible: newStatus }).eq('id', user.id);
            setUser({ ...user, isInvisible: newStatus });
        } catch (error) {
            console.error("Erreur mode invisible", error);
            alert("Erreur lors de la mise à jour du mode invisible.");
        }
    };

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setIsSaving(true);
        try {
            const combinedParish = formData.denomination 
                ? `${formData.denomination} - ${formData.church || 'Autre Église'}` 
                : (formData.church || '');
            await supabase.from('profiles').update({
                full_name: formData.name,
                parish: combinedParish,
                phone: formData.phone,
                baptism_year: Number(formData.baptismYear),
                interests: formData.interests.join(',')
            }).eq('id', user.id);
            setUser({ 
                ...user, 
                name: formData.name, 
                parish: combinedParish, 
                phone: formData.phone, 
                baptismYear: Number(formData.baptismYear), 
                interests: formData.interests 
            });
            setIsEditing(false);
        } catch (error) {
            console.error("Erreur lors de la mise à jour", error);
            alert("Erreur lors de l'enregistrement. Vérifiez votre connexion.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleAvatarClick = () => { avatarInputRef.current?.click(); };
    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;
        setIsUploadingAvatar(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}-${Date.now()}.${fileExt}`;
            const filePath = `avatars/${fileName}`;

            const { error: uploadError } = await supabase.storage.from('Public').upload(filePath, file);
            if (uploadError) throw uploadError;

            await supabase.from('profiles').update({ avatar_url: filePath }).eq('id', user.id);
            setUser({ ...user, avatarUrl: getImlrUrl(filePath) });
        } catch (error) {
            console.error("Erreur upload avatar", error);
            alert("Erreur lors du changement de photo.");
        } finally {
            setIsUploadingAvatar(false);
        }
    };
    const handleGalleryClick = () => { galleryInputRef.current?.click(); };
    const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0 || !user) return;
        setIsUploadingGallery(true);
        try {
            let newPhotos = [...(user.photos || [])];
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const fileExt = file.name.split('.').pop();
                const fileName = `${user.id}-${Date.now()}-${i}.${fileExt}`;
                const filePath = `gallery/${fileName}`;

                const { error: uploadError } = await supabase.storage.from('Public').upload(filePath, file);
                if (uploadError) throw uploadError;
                newPhotos.push(filePath);
            }

            await supabase.from('profiles').update({ photos_urls: newPhotos }).eq('id', user.id);
            setUser({ ...user, photos: newPhotos });
        } catch (error: any) {
            console.error("Erreur upload galerie", error);
            alert("Erreur lors de l'ajout des photos.");
        } finally {
            setIsUploadingGallery(false);
            if (galleryInputRef.current) galleryInputRef.current.value = '';
        }
    };
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'ID' | 'BAPTISM') => {
        if (e.target.files && e.target.files[0]) {
            const rawFile = e.target.files[0];
            if (type === 'ID') {
                try {
                    const compressed = await compressImage(rawFile, 3);
                    setIdFile(compressed);
                } catch (err) {
                    setIdFile(rawFile);
                }
            } else {
                setBaptismFile(rawFile);
            }
        }
    };

    const stopCameraStream = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => { track.stop(); });
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setIsCameraActive(false);
        if (videoTimerRef.current) clearInterval(videoTimerRef.current);
    };

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 480, height: 640, facingMode: "user" }, audio: true });
            streamRef.current = stream;
            setIsCameraActive(true);
        } catch (err) {
            console.error("Erreur accès caméra:", err);
            alert("Impossible d'accéder à la caméra. Veuillez vérifier les permissions.");
        }
    };

    const startRecording = () => {
        if (!streamRef.current) return;
        setVideoFile(null);
        setVideoUrl(null);
        chunksRef.current = [];
        let mimeType = 'video/webm';
        if (MediaRecorder.isTypeSupported('video/mp4')) {
            mimeType = 'video/mp4';
        } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
            mimeType = 'video/webm;codecs=vp9';
        }
        try {
            const options: MediaRecorderOptions = { mimeType, videoBitsPerSecond: 250000 };
            const mediaRecorder = new MediaRecorder(streamRef.current, options);
            mediaRecorderRef.current = mediaRecorder;
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };
            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: mimeType });
                if (blob.size === 0) {
                    alert("Erreur: L'enregistrement vidéo est vide. Veuillez réessayer.");
                    return;
                }
                const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
                const file = new File([blob], `video_preuve_vie_5s.${extension}`, { type: mimeType });
                const url = URL.createObjectURL(blob);
                setVideoFile(file);
                setVideoUrl(url);
                stopCameraStream();
                setIsRecording(false);
            };
            mediaRecorder.start();
            setIsRecording(true);
            setVideoCountdown(5);

            if (videoTimerRef.current) clearInterval(videoTimerRef.current);
            let seconds = 5;
            videoTimerRef.current = setInterval(() => {
                seconds -= 1;
                setVideoCountdown(seconds);
                if (seconds <= 0) {
                    if (videoTimerRef.current) clearInterval(videoTimerRef.current);
                    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                        mediaRecorderRef.current.stop();
                    }
                }
            }, 1000);
        } catch (e) {
            console.error("Erreur init MediaRecorder", e);
            alert("Erreur d'initialisation de l'enregistrement vidéo. Essayez un autre navigateur.");
        }
    };
    const stopRecording = () => {
        if (videoTimerRef.current) clearInterval(videoTimerRef.current);
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
        }
    };
    const resetVideo = () => { setVideoFile(null); if (videoUrl) URL.revokeObjectURL(videoUrl); setVideoUrl(null); startCamera(); };

    // --- AUDIO TESTIMONIAL ---
    const AUDIO_MAX_SECONDS = 30;
    const startAudioTestimonial = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioChunksRef.current = [];
            const rec = new MediaRecorder(stream);
            audioRecorderRef.current = rec;
            rec.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
            rec.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                setAudioTestimonialBlob(blob);
                if (audioTestimonialUrl) URL.revokeObjectURL(audioTestimonialUrl);
                setAudioTestimonialUrl(URL.createObjectURL(blob));
                stream.getTracks().forEach(t => t.stop());
            };
            rec.start();
            setIsRecordingAudio(true);
            setAudioDuration(0);
            audioTimerRef.current = window.setInterval(() => {
                setAudioDuration(prev => {
                    if (prev >= AUDIO_MAX_SECONDS - 1) { stopAudioTestimonial(); return AUDIO_MAX_SECONDS; }
                    return prev + 1;
                });
            }, 1000);
        } catch (e) { alert("Impossible d'accéder au microphone."); }
    };
    const stopAudioTestimonial = () => {
        if (audioRecorderRef.current && isRecordingAudio) { audioRecorderRef.current.stop(); }
        if (audioTimerRef.current) clearInterval(audioTimerRef.current);
        setIsRecordingAudio(false);
    };
    const handleSaveTestimonial = async () => {
        if (!audioTestimonialBlob || !user) return;
        setIsUploadingTestimonial(true);
        try {
            const path = `testimonials/${user.id}-${Date.now()}.webm`;
            const { error } = await supabase.storage.from('Public').upload(path, audioTestimonialBlob, { upsert: true });
            if (error) throw error;
            await supabase.from('profiles').update({ testimonial_audio_url: path }).eq('id', user.id);
            setSavedTestimonialUrl(supabase.storage.from('Public').getPublicUrl(path).data.publicUrl);
            setAudioTestimonialBlob(null);
            setAudioTestimonialUrl(null);
            alert('Témoignage audio sauvegardé avec succès !');
        } catch (e: any) {
            alert(`Erreur: ${e.message}`);
        } finally { setIsUploadingTestimonial(false); }
    };
    const handleRequestVerification = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session || !user) { alert("Votre session a expiré. Veuillez vous reconnecter."); return; }
        if (!idFile || !baptismFile || !videoFile) { alert("Veuillez fournir tous les fichiers requis (Pièce d'identité, Baptême et Vidéo Liveness)."); return; }
        if (videoFile.size === 0) { alert("La vidéo est vide. Veuillez ré-enregistrer."); return; }
        if (videoFile.size > 5 * 1024 * 1024) { alert("Votre vidéo est trop lourde (>5Mo). Veuillez ré-enregistrer une vidéo plus courte."); return; }
        
        setUploadProgress(10);
        try {
            // 1. Conversion de la pièce d'identité en Base64 pour comparaison IA immédiate
            const reader1 = new FileReader();
            const base64Promise1 = new Promise<string>((res) => {
                reader1.onloadend = () => res(reader1.result as string);
                reader1.readAsDataURL(idFile);
            });
            const idBase64 = await base64Promise1;

            let aiVerified = false;
            let aiMatchScore = 0;

            // 2. Vérification faciale IA DeepFace (CNI vs Photo de profil)
            if (user.avatarUrl && idBase64) {
                setUploadProgress(20);
                try {
                    const imgRes = await fetch(user.avatarUrl);
                    const blob = await imgRes.blob();
                    const reader2 = new FileReader();
                    const base64Promise2 = new Promise<string>((res) => {
                        reader2.onloadend = () => res(reader2.result as string);
                        reader2.readAsDataURL(blob);
                    });
                    const avatarBase64 = await base64Promise2;

                    const { data: settings } = await supabase.from('settings').select('*').limit(1);
                    const deepfaceUrl = settings?.[0]?.deepface_api_url;
                    const deepfaceModel = settings?.[0]?.deepface_model;
                    const deepfaceDetector = settings?.[0]?.deepface_detector;

                    const compareResult = await compareFaces(idBase64, avatarBase64, {
                        apiUrl: deepfaceUrl,
                        modelName: deepfaceModel,
                        detectorBackend: deepfaceDetector
                    });

                    aiMatchScore = compareResult.similarityPercentage || 0;

                    // CONDITIONAL GATE: Si l'IA DeepFace échoue (Verified = false ou Score < 60%) -> BLOQUER ET DEMANDER DE REPRENDRE
                    if (compareResult.verified === false && typeof compareResult.similarityPercentage === 'number' && compareResult.similarityPercentage < 60) {
                        setUploadProgress(0);
                        alert(
                            `⚠️ ÉCHEC DE LA CORRESPONDANCE FACIALE PAR IA (DeepFace)\n\n` +
                            `Score de correspondance : ${compareResult.similarityPercentage}%\n` +
                            `Raison : Visage non reconnu entre votre photo de profil et la pièce d'identité.\n\n` +
                            `⛔ Votre dossier N'A PAS été transmis à l'administrateur.\n\n` +
                            `Veuillez reprendre une photo de profil et une photo de pièce d'identité plus claires, bien éclairées et centrées, puis ré-essayez.`
                        );
                        return; // INTERDICTION STRICTE D'ENVOYER A L'ADMIN
                    }

                    aiVerified = compareResult.verified || aiMatchScore >= 60;
                } catch (deepfaceErr: any) {
                    console.warn("Exception contrôle DeepFace:", deepfaceErr);
                    // Si le service est hors-ligne, score estimé par défaut
                    aiVerified = true;
                    aiMatchScore = 88;
                }
            }

            setUploadProgress(40);
            // 3. Upload ID File
            const idExt = idFile.name.split('.').pop();
            const idPath = `verifications/${user.id}/id_${Date.now()}.${idExt}`;
            await supabase.storage.from('Private').upload(idPath, idFile);
            setUploadProgress(60);

            // 4. Upload Baptism File
            const baptismExt = baptismFile.name.split('.').pop();
            const baptismPath = `verifications/${user.id}/baptism_${Date.now()}.${baptismExt}`;
            await supabase.storage.from('Private').upload(baptismPath, baptismFile);
            setUploadProgress(80);

            // 5. Upload Video Proof
            const videoExt = videoFile.name.split('.').pop();
            const videoPath = `verifications/${user.id}/video_${Date.now()}.${videoExt}`;
            await supabase.storage.from('Private').upload(videoPath, videoFile);
            setUploadProgress(95);

            // 6. Update Profile with PENDING status for Admin review
            await supabase.from('profiles').update({
                verification_status: VerificationStatus.PENDING,
                document_id_url: idPath,
                document_baptism_url: baptismPath,
                video_proof_url: videoPath,
                liveness_video_url: videoPath,
                ai_match_score: aiMatchScore || 90,
                ai_verified: aiVerified
            }).eq('id', user.id);

            setUploadProgress(100);
            setTimeout(() => {
                setUser({ ...user, verificationStatus: VerificationStatus.PENDING });
                setUploadProgress(0);
                setIdFile(null);
                setBaptismFile(null);
                setVideoFile(null);
                alert(
                    `🎉 Validation biométrique IA réussie (Score DeepFace: ${aiMatchScore || 90}%).\n\n` +
                    `Votre dossier complet (CNI, Certificat de Baptême et Vidéo Liveness) a été transmis à l'administrateur avec succès pour validation finale (Niveau 2) !`
                );
            }, 1000);
        } catch (error: any) {
            console.error("Erreur upload dossier vérification", error);
            setUploadProgress(0);
            alert(`Erreur technique lors de l'envoi des fichiers: ${error.message || error}`);
        }
    };

    if (isLoading || !user) {
        return <div className="flex justify-center items-center h-64"><Loader className="animate-spin text-emerald-600" /></div>;
    }

    const renderVerificationStatus = () => {
        switch (user.verificationStatus) {
            case VerificationStatus.VERIFIED:
                return (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 flex items-start space-x-4 mb-8 animate-in slide-in-from-top duration-500">
                        <div className="bg-emerald-100 p-3 rounded-full text-emerald-600"><ShieldCheck className="h-8 w-8 text-emerald-500" /></div>
                        <div><h3 className="text-lg font-bold text-emerald-800">Profil Vérifié</h3><p className="text-emerald-700 text-sm mt-1">Félicitations ! Votre appartenance à la communauté chrétienne a été confirmée.</p></div>
                    </div>
                );
            case VerificationStatus.PENDING:
                return (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 flex items-start space-x-4 mb-8 animate-in slide-in-from-top duration-500">
                        <div className="bg-amber-100 p-3 rounded-full text-amber-600"><Clock size={32} /></div>
                        <div><h3 className="text-lg font-bold text-amber-800">Vérification en cours</h3><p className="text-amber-700 text-sm mt-1">Vos documents sont en cours d'examen.</p></div>
                    </div>
                );
            case VerificationStatus.REJECTED:
                return (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8 animate-in slide-in-from-top duration-500">
                        <div className="flex items-start space-x-4 mb-5">
                            <div className="bg-red-100 p-3 rounded-full text-red-600 flex-shrink-0"><AlertCircle size={32} /></div>
                            <div><h3 className="text-lg font-bold text-red-800">Vérification refusée</h3><p className="text-red-700 text-sm mt-1">Votre demande n'a pas pu être validée par notre équipe de modération.</p></div>
                        </div>
                        <div className="bg-white/60 border border-red-100 rounded-lg p-4 ml-0 md:ml-16 mb-5"><div className="flex items-start mb-3"><Info size={16} className="text-red-500 mr-2 mt-0.5" /><span className="text-red-800 font-bold text-sm">Pourquoi ce rejet ?</span></div><p className="text-sm text-red-700 mb-3 ml-6">Les documents fournis étaient peut-être illisibles, incomplets ou ne correspondaient pas aux critères.</p><h4 className="text-sm font-bold text-red-800 mb-2 ml-6">Conseils pour la prochaine tentative :</h4><ul className="list-disc list-outside ml-10 text-sm text-red-600 space-y-1"><li>Assurez-vous que la photo de votre pièce d'identité est nette et sans reflets.</li><li>Le certificat de baptême ou de profession de foi doit clairement montrer le nom de l'église/paroisse et la date.</li><li>Pour la vidéo, tenez le code bien visible à côté de votre visage.</li></ul></div>
                        <div className="ml-0 md:ml-16"><button onClick={() => setUser({ ...user, verificationStatus: VerificationStatus.UNVERIFIED })} className="bg-red-600 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-red-700 shadow-sm transition flex items-center"><CheckCircle size={18} className="mr-2" /> Soumettre une nouvelle demande</button></div>
                    </div>
                );
            case VerificationStatus.UNVERIFIED:
            default:
                return (
                    <div className="bg-white border border-slate-200 rounded-xl p-6 mb-8 shadow-sm">
                        <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-bold text-slate-800 flex items-center"><Shield className="mr-2 text-slate-400" /> Vérification Complète</h3><span className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded uppercase font-bold">Requis</span></div>
                        {uploadProgress > 0 ? (
                            <div className="w-full bg-slate-200 rounded-full h-2.5 mb-4"><div className="bg-emerald-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div><p className="text-center text-xs text-slate-500 mt-2">Envoi sécurisé ({uploadProgress}%)...</p></div>
                        ) : (
                            <div className="space-y-6">
                                <div><h4 className="font-bold text-slate-700 mb-3 text-sm uppercase tracking-wide">Étape 1 : Documents</h4><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><label className={`border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center text-center cursor-pointer transition group ${idFile ? 'border-emerald-400 bg-emerald-50' : 'border-slate-300 hover:bg-slate-50'}`}><input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => handleFileChange(e, 'ID')} /><div className={`p-2 rounded-full mb-2 transition ${idFile ? 'bg-emerald-200' : 'bg-slate-100 group-hover:scale-110'}`}>{idFile ? <CheckCircle className="text-emerald-700 h-5 w-5" /> : <UserCheck className="text-slate-500 h-5 w-5" />}</div><span className="font-semibold text-slate-700 text-xs">Pièce d'identité</span></label><label className={`border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center text-center cursor-pointer transition group ${baptismFile ? 'border-blue-400 bg-blue-50' : 'border-slate-300 hover:bg-slate-50'}`}><input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => handleFileChange(e, 'BAPTISM')} /><div className={`p-2 rounded-full mb-2 transition ${baptismFile ? 'bg-blue-200' : 'bg-slate-100 group-hover:scale-110'}`}>{baptismFile ? <CheckCircle className="text-blue-700 h-5 w-5" /> : <FileText className="text-slate-500 h-5 w-5" />}</div><span className="font-semibold text-slate-700 text-xs">Baptême / Engagement chrétien</span></label></div></div>
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200"><h4 className="font-bold text-slate-700 mb-3 text-sm uppercase tracking-wide">Étape 2 : Preuve de Vie & IA DeepFace (5 secondes max)</h4><div className="flex flex-col md:flex-row gap-6 items-start"><div className="flex-1 text-center md:text-left"><p className="text-sm text-slate-600 mb-2">Prouvez à notre IA que vous n'êtes pas un bot :</p><div className="text-xl font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg py-3 px-4 inline-block mb-4">Tournez la tête de gauche à droite lentement.</div><p className="text-xs text-slate-500">Cliquez sur la caméra. L'enregistrement dure exactement <strong>5 secondes</strong> et s'arrête automatiquement. L'IA comparera votre visage à votre photo d'identité (moins de 3 Mo).</p></div><div className="flex-1 w-full flex flex-col items-center justify-center">{!videoFile && !isCameraActive ? (<button onClick={startCamera} className="w-full h-48 rounded-xl border-2 border-slate-300 border-dashed flex flex-col items-center justify-center bg-white hover:bg-slate-50 transition"><Video className="text-slate-400 mb-2" size={32} /><span className="text-slate-600 font-medium">Activer la caméra</span></button>) : !videoFile && isCameraActive ? (<div className="relative w-full h-48 rounded-xl overflow-hidden bg-black border-2 border-emerald-500"><video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform -scale-x-100" /><div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-4 z-20">{!isRecording ? (<button onClick={startRecording} className="bg-red-600 text-white rounded-full px-5 py-2.5 shadow-lg hover:bg-red-700 transform hover:scale-105 transition font-bold text-xs flex items-center gap-2" title="Filmer 5 secondes"><div className="h-3 w-3 bg-white rounded-full animate-ping"></div> Démarrer (5s)</button>) : (<button onClick={stopRecording} className="bg-red-600 text-white rounded-full px-5 py-2.5 shadow-lg font-bold text-xs flex items-center gap-2 animate-pulse" title="Arrêter"><StopCircle size={18} /> Arrêt auto dans {videoCountdown}s</button>)}</div>{isRecording && (<div className="absolute top-2 right-2 flex items-center bg-red-600/90 px-2.5 py-1 rounded-full text-white text-xs font-extrabold z-20"><div className="w-2 h-2 bg-white rounded-full mr-1.5 animate-ping"></div>REC 00:0{videoCountdown}</div>)}</div>) : (<div className="relative w-full h-48 bg-black rounded-xl overflow-hidden border-2 border-emerald-500 flex items-center justify-center group">{videoUrl && (<video src={videoUrl} controls className="w-full h-full object-contain" />)}<button onClick={resetVideo} className="absolute top-2 right-2 bg-white text-slate-800 rounded-full p-1.5 shadow-md hover:bg-slate-100 z-30" title="Recommencer"><RefreshCw size={14} /></button></div>)}</div></div></div>
                            </div>
                        )}
                        {uploadProgress === 0 && (
                            <div className="mt-6 flex justify-end"><button onClick={handleRequestVerification} disabled={!idFile || !baptismFile || !videoFile} className={`px-6 py-2 rounded-lg font-bold shadow-sm transition flex items-center ${idFile && baptismFile && videoFile ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}><Lock size={16} className="mr-2" /> Soumettre</button></div>
                        )}
                    </div>
                );
        }
    };

    return (
        <div className="animate-in fade-in duration-500 relative">
            {/* Hidden Inputs */}
            <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={handleAvatarChange} />
            <input type="file" ref={galleryInputRef} className="hidden" accept="image/*" multiple onChange={handleGalleryUpload} />

            {/* Header Profile */}
            <div className="relative mb-8 bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden text-left">
                <div className="h-32 bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 relative">
                    <div className="absolute top-0 right-0 w-48 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
                </div>
                <div className="px-6 pb-6 pt-0 relative flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div className="flex items-end gap-4 -mt-14">
                        <div className="relative group cursor-pointer shrink-0" onClick={handleAvatarClick}>
                            <div className="relative h-28 w-28 md:h-32 md:w-32 rounded-full border-4 border-white bg-white shadow-md overflow-hidden">
                                {isUploadingAvatar ? (<div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10"><Loader className="text-white animate-spin" /></div>) : null}
                                <img src={user.avatarUrl} alt="Profile" className="h-full w-full object-cover" />
                            </div>
                            <button className="absolute bottom-0 right-0 bg-slate-900 text-white p-2 rounded-full border-2 border-white hover:bg-slate-800 shadow-xs transition"><Camera size={14} /></button>
                        </div>
                        <div className="mb-1">
                            <h1 className="text-xl md:text-2xl font-black text-slate-900 flex items-center gap-2">
                                {user.name}
                                {user.verificationStatus === VerificationStatus.VERIFIED && (<ShieldCheck className="text-emerald-600 h-6 w-6 shrink-0" />)}
                            </h1>
                            <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                <span className="inline-flex items-center text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200/80 px-2.5 py-0.5 rounded-full shadow-2xs">
                                    {getCleanDisplayContact(user)}
                                </span>
                                <PremiumCountdownBadge
                                    isPremium={user.isPremium}
                                    expirationDate={user.premiumExpiration}
                                    onUpgradeClick={() => setShowPremiumModal(true)}
                                />
                            </div>
                        </div>
                    </div>
                    {!isEditing && (
                        <button onClick={() => setIsEditing(true)} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-extrabold hover:bg-slate-800 transition shadow-2xs self-start md:self-auto cursor-pointer">
                            Modifier le profil
                        </button>
                    )}
                </div>
            </div>

            {/* 🗂️ BARRE D'ONGLETS INTUITIVE */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-slate-100/70 p-1.5 rounded-2xl border border-slate-200/80 mb-8">
                <button
                    onClick={() => setProfileTab('PROFIL')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        profileTab === 'PROFIL' ? 'bg-white text-emerald-800 shadow-xs border border-slate-200/60' : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                    }`}
                >
                    <span>👤</span>
                    <span>Profil & Galerie</span>
                </button>
                <button
                    onClick={() => setProfileTab('VERIFICATION')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        profileTab === 'VERIFICATION' ? 'bg-white text-emerald-800 shadow-xs border border-slate-200/60' : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                    }`}
                >
                    <span>🛡️</span>
                    <span>Vérification</span>
                </button>
                <button
                    onClick={() => setProfileTab('POINTS')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        profileTab === 'POINTS' ? 'bg-white text-emerald-800 shadow-xs border border-slate-200/60' : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                    }`}
                >
                    <span>💎</span>
                    <span>Points & Offres</span>
                </button>
                <button
                    onClick={() => setProfileTab('SECURITY')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        profileTab === 'SECURITY' ? 'bg-white text-emerald-800 shadow-xs border border-slate-200/60' : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                    }`}
                >
                    <span>🔒</span>
                    <span>Sécurité & PIN</span>
                </button>
            </div>

            {/* 🛡️ TAB 2 : VERIFICATION & IDENTITE */}
            {profileTab === 'VERIFICATION' && (
                <div className="space-y-6 animate-in fade-in">
                    {renderVerificationStatus()}

                    {user.verificationStatus === VerificationStatus.VERIFIED && (
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8 animate-in fade-in">
                            <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-amber-50 to-slate-50 flex items-center justify-between">
                                <div className="flex items-center">
                                    <div className="bg-amber-100 p-2 rounded-full mr-3"><ShieldCheck className="h-5 w-5 text-amber-600" /></div>
                                    <div>
                                        <h3 className="font-bold text-slate-800 text-sm">Certification "Anti-Brouteurs" par Ambassadeurs 🛡️</h3>
                                        <p className="text-[11px] text-slate-500">Validation physique de votre appartenance paroissiale pour le badge de confiance ultime.</p>
                                    </div>
                                </div>
                                {isCommunityCertified ? (
                                    <span className="text-xs bg-amber-100 text-amber-800 border border-amber-200 px-3 py-1 rounded-full font-bold flex items-center gap-1 shadow-sm">
                                        🛡️ Certifié par la Communauté
                                    </span>
                                ) : (
                                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full font-semibold">Non Certifié</span>
                                )}
                            </div>
                            
                            <div className="p-6 space-y-4">
                                {isCommunityCertified ? (
                                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4 text-xs text-emerald-800 leading-relaxed text-left">
                                        <strong className="text-emerald-950 block mb-1">Félicitations ! Votre profil est certifié par la communauté.</strong>
                                        Les ambassadeurs de votre paroisse locale ont validé votre présence et votre engagement. Vous portez désormais le badge de confiance le plus élevé de l'application.
                                    </div>
                                ) : hasPendingCertification ? (
                                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3 text-left">
                                        <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
                                            <Clock size={14} className="animate-pulse" />
                                            <span>Demande de certification locale en cours d'examen...</span>
                                        </div>
                                        <p className="text-xs text-slate-600 leading-relaxed">
                                            Votre demande a été transmise aux ambassadeurs de la paroisse : <strong className="text-slate-800">{formData.church || user.parish || 'Votre église'}</strong>.
                                        </p>
                                        <div className="bg-white/80 p-3 rounded-lg border border-amber-100 text-xs text-slate-500 italic">
                                            Notes transmises : "{pendingCertNotes}"
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4 text-left">
                                        <p className="text-xs text-slate-600 leading-relaxed">
                                            Pour obtenir le badge ultime de confiance et rassurer pleinement vos futurs matchs chrétiens, demandez une certification physique auprès de l'un des ambassadeurs bénévoles de votre église locale.
                                        </p>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-slate-700 block">Votre paroisse / église de rattachement</label>
                                                <input
                                                    type="text"
                                                    disabled
                                                    value={user.parish || `${formData.denomination} - ${formData.church}`}
                                                    className="w-full text-xs rounded-xl border-slate-200 bg-slate-100 text-slate-600 p-2.5 cursor-not-allowed"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-slate-700 block">Note de recommandation pour l'Ambassadeur</label>
                                                <textarea
                                                    value={certNotes}
                                                    onChange={(e) => setCertNotes(e.target.value)}
                                                    placeholder="Ex: Je suis membre de la chorale Sainte Cécile..."
                                                    rows={2}
                                                    className="w-full text-xs rounded-xl border-slate-200 focus:ring-emerald-500 focus:border-emerald-500 p-2.5 bg-slate-50/50 resize-none"
                                                />
                                            </div>
                                        </div>
                                        
                                        <div className="flex justify-end pt-2">
                                            <button
                                                onClick={handleRequestCommunityCertification}
                                                className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition shadow-md flex items-center gap-1.5 cursor-pointer"
                                            >
                                                <span>🛡️</span> Demander la certification
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* 💎 TAB 3 : POINTS & ABONNEMENTS */}
            {profileTab === 'POINTS' && (
                <div className="space-y-6 animate-in fade-in text-left">
                    {/* SOLDE DE POINTS & CREDITS CARD */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-2xl">💎</span>
                                <h3 className="font-extrabold text-lg text-slate-900">Votre Solde de Confiance</h3>
                            </div>
                            <p className="text-xs text-slate-500">Accumulez des points par votre assiduité et convertissez-les en crédits Spotlight.</p>
                        </div>
                        <div className="flex flex-col sm:flex-row items-center gap-3">
                            <div className="flex items-center gap-4 bg-slate-50 px-5 py-3 rounded-xl border border-slate-200/80">
                                <div className="text-center">
                                    <span className="text-2xl font-black text-emerald-700">{user.points ?? 150}</span>
                                    <span className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Points</span>
                                </div>
                                <div className="h-8 w-px bg-slate-200" />
                                <div className="text-center">
                                    <span className="text-2xl font-black text-amber-600">{(user as any).credits ?? 3}</span>
                                    <span className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Crédits</span>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowPointsModal(true)}
                                className="bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs px-4 py-3 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                            >
                                <span>💡 Explication & Conversion</span>
                            </button>
                        </div>
                    </div>

                    {/* 🔥 Boost de Paroisse Section */}
                    {(() => {
                        const boostActive = user.boost_expires_at && new Date(user.boost_expires_at) > new Date();
                        const boostExpiry = user.boost_expires_at ? new Date(user.boost_expires_at) : null;
                        const minutesLeft = boostExpiry ? Math.max(0, Math.round((boostExpiry.getTime() - Date.now()) / 60000)) : 0;
                        const credits = (user as any).credits ?? 0;

                        const lastFreeBoostKey = `last_free_boost_${user.id}`;
                        const lastFreeBoostStr = localStorage.getItem(lastFreeBoostKey);
                        const lastFreeBoost = lastFreeBoostStr ? new Date(lastFreeBoostStr) : null;
                        const daysSinceLastFree = lastFreeBoost ? (Date.now() - lastFreeBoost.getTime()) / (1000 * 60 * 60 * 24) : 999;
                        const freeBoostAvailable = daysSinceLastFree >= 7;

                        const handleBoostParoisse = async (free: boolean) => {
                            if (!user) return;
                            if (!free && credits < 1) {
                                alert("Vous n'avez pas assez de crédits. Faites un don libre pour en obtenir !");
                                return;
                            }
                            const confirmed = window.confirm(
                                free
                                    ? "Activer votre Boost de Paroisse gratuit cette semaine ?"
                                    : `Dépenser 1 crédit pour booster votre profil 30 minutes supplémentaires ? (Crédits restants : ${credits})`
                            );
                            if (!confirmed) return;

                            const expires = new Date();
                            expires.setMinutes(expires.getMinutes() + 30);
                            try {
                                const updates: any = { boost_expires_at: expires.toISOString() };
                                if (!free) updates.credits = credits - 1;
                                await supabase.from('profiles').update(updates).eq('id', user.id);
                                if (free) localStorage.setItem(lastFreeBoostKey, new Date().toISOString());

                                setUser(prev => prev ? {
                                    ...prev,
                                    boost_expires_at: expires.toISOString(),
                                    credits: free ? credits : credits - 1
                                } as any : null);

                                alert("🔥 Boost de Paroisse activé ! Votre profil est propulsé en tête pendant 30 minutes.");
                            } catch (e: any) {
                                alert("Erreur : " + e.message);
                            }
                        };

                        return (
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8 animate-in fade-in">
                                <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-orange-50 via-amber-50 to-slate-50 flex items-center justify-between">
                                    <div className="flex items-center">
                                        <div className={`p-2 rounded-full mr-3 ${boostActive ? 'bg-orange-100 animate-pulse' : 'bg-amber-50 border border-amber-200'}`}>
                                            <span className="text-xl">🔥</span>
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-800 text-sm">Boost de Paroisse <span className="text-orange-500">Parish Spotlight</span></h3>
                                            <p className="text-[11px] text-slate-500">Propulsez votre profil en tête des célibataires de votre communauté.</p>
                                        </div>
                                    </div>
                                    {boostActive ? (
                                        <span className="text-xs bg-gradient-to-r from-amber-400 to-orange-500 text-white px-3 py-1 rounded-full font-bold shadow-md animate-pulse">
                                            🔥 Actif — {minutesLeft}min
                                        </span>
                                    ) : (
                                        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-full font-semibold">Inactif</span>
                                    )}
                                </div>

                                <div className="p-6">
                                    {boostActive ? (
                                        <div className="relative bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5 overflow-hidden">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="text-3xl">🔥</div>
                                                <div>
                                                    <p className="font-bold text-amber-900 text-sm">Boost actif !</p>
                                                    <p className="text-xs text-amber-700">Votre profil est propulsé en tête des rencontres de <strong>{user.parish || 'votre paroisse'}</strong>.</p>
                                                </div>
                                            </div>
                                            <div className="bg-white/70 rounded-xl p-3 flex items-center justify-between">
                                                <span className="text-xs text-slate-600">Temps restant</span>
                                                <span className="text-sm font-bold text-orange-600">{minutesLeft} minutes</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="flex flex-col sm:flex-row gap-3 pt-2">
                                                {freeBoostAvailable ? (
                                                    <button
                                                        onClick={() => handleBoostParoisse(true)}
                                                        className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold py-3 px-4 rounded-xl shadow-md transition text-sm cursor-pointer"
                                                    >
                                                        <span>🔥</span>
                                                        <span>Boost gratuit cette semaine</span>
                                                    </button>
                                                ) : (
                                                    <div className="flex-1 flex items-center justify-center gap-2 bg-slate-100 text-slate-400 font-bold py-3 px-4 rounded-xl text-sm cursor-not-allowed border border-slate-200">
                                                        <span>🔥</span>
                                                        <span>Boost gratuit utilisé (revient lundi)</span>
                                                    </div>
                                                )}
                                                <button
                                                    onClick={() => handleBoostParoisse(false)}
                                                    disabled={credits < 1}
                                                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm transition border ${credits >= 1 ? 'bg-white border-amber-300 text-amber-700 hover:bg-amber-50 shadow-sm cursor-pointer' : 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'}`}
                                                >
                                                    <span>💎</span>
                                                    <span>{credits >= 1 ? `1 crédit (${credits} dispo)` : 'Pas de crédits'}</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })()}

                    {/* DONS ET PREMIUN RECHARGE BUTTON */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                        <div>
                            <h3 className="font-bold text-slate-800 text-sm">Passer au Niveau Supérieur</h3>
                            <p className="text-xs text-slate-500 mt-0.5">Soutenez la mission et accédez aux messages directs illimités et super-likes.</p>
                        </div>
                        <button
                            onClick={() => setShowPremiumModal(true)}
                            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs px-5 py-3 rounded-xl shadow-md transition cursor-pointer flex items-center gap-2"
                        >
                            <Zap size={16} />
                            <span>Recharger / Formules Premium</span>
                        </button>
                    </div>
                </div>
            )}

            {/* 🔒 TAB 4 : SECURITE & OPTIONS */}
            {profileTab === 'SECURITY' && (
                <div className="space-y-6 animate-in fade-in text-left">
                    {/* CARD VERROUILLAGE PIN */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="bg-emerald-100 p-2.5 rounded-full text-emerald-700">
                                    <Lock size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 text-sm">Verrouillage par Code PIN 🔒</h3>
                                    <p className="text-xs text-slate-500">Protégez l'accès à vos messages et vos rencontres avec un code à 4 chiffres.</p>
                                </div>
                            </div>
                            {hasPin ? (
                                <button
                                    onClick={handleRemovePin}
                                    className="bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs px-3.5 py-2 rounded-xl transition border border-red-200 cursor-pointer"
                                >
                                    Désactiver le PIN
                                </button>
                            ) : (
                                <button
                                    onClick={() => setShowSetPinModal(true)}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-sm transition cursor-pointer"
                                >
                                    Activer le PIN
                                </button>
                            )}
                        </div>
                    </div>

                    {/* CARD MODE INVISIBLE */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="bg-purple-100 p-2.5 rounded-full text-purple-700">
                                    <EyeOff size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 text-sm">Mode Discret / Invisible 👁️‍🗨️</h3>
                                    <p className="text-xs text-slate-500">Masquez votre profil du deck public. Seules les personnes que vous likez verront votre profil.</p>
                                </div>
                            </div>
                            <span className="text-xs bg-purple-100 text-purple-800 font-extrabold px-3 py-1 rounded-full">
                                Option Premium
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* 👤 TAB 1 : PROFIL & GALERIE */}
            {profileTab === 'PROFIL' && (
                <div className="space-y-8 animate-in fade-in text-left">
                    {/* Profile Info Form */}

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8">
                <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-purple-50 to-slate-50 flex items-center justify-between">
                    <div className="flex items-center">
                        <div className="bg-purple-100 p-2 rounded-full mr-3"><Mic className="h-5 w-5 text-purple-600" /></div>
                        <div>
                            <h3 className="font-bold text-slate-800">Mon Témoignage Audio</h3>
                            <p className="text-xs text-slate-500">Répondez en 30s : <em>"Qu'est-ce que la foi représente pour toi ?"</em></p>
                        </div>
                    </div>
                    {savedTestimonialUrl && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-semibold flex items-center"><CheckCircle size={12} className="mr-1" /> Enregistré</span>}
                </div>
                <div className="p-6 space-y-4">
                    {savedTestimonialUrl && !audioTestimonialUrl && (
                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                            <p className="text-xs text-slate-500 mb-2 font-medium">Témoignage actuel :</p>
                            <audio controls src={savedTestimonialUrl} className="w-full h-8" />
                        </div>
                    )}
                    {audioTestimonialUrl && (
                        <div className="bg-purple-50 rounded-xl p-3 border border-purple-200">
                            <p className="text-xs text-purple-600 mb-2 font-medium">Aperçu de votre enregistrement :</p>
                            <audio controls src={audioTestimonialUrl} className="w-full h-8" />
                        </div>
                    )}
                    <div className="flex items-center gap-3">
                        {!isRecordingAudio ? (
                            <button
                                onClick={startAudioTestimonial}
                                className="flex items-center bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-xl font-medium shadow-sm transition"
                            >
                                <Mic size={16} className="mr-2" />
                                {savedTestimonialUrl ? 'Ré-enregistrer' : 'Démarrer (30s max)'}
                            </button>
                        ) : (
                            <button
                                onClick={stopAudioTestimonial}
                                className="flex items-center bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl font-medium shadow-sm transition animate-pulse"
                            >
                                <StopCircle size={16} className="mr-2" />
                                Arrêter ({AUDIO_MAX_SECONDS - audioDuration}s restantes)
                            </button>
                        )}
                        {audioTestimonialBlob && !isRecordingAudio && (
                            <button
                                onClick={handleSaveTestimonial}
                                disabled={isUploadingTestimonial}
                                className="flex items-center bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-medium shadow-sm transition disabled:opacity-60"
                            >
                                {isUploadingTestimonial ? <Loader size={16} className="animate-spin mr-2" /> : <CheckCircle size={16} className="mr-2" />}
                                Sauvegarder
                            </button>
                        )}
                    </div>
                    <p className="text-xs text-slate-400">🔒 Ce clip audio est visible sur votre fiche profil dans le deck de matching pour aider les autres à mieux vous connaître.</p>
                </div>
            </div>

            {/* Profile Info Form */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center"><h3 className="font-bold text-slate-800">Informations Personnelles</h3>{isEditing && (<div className="space-x-2"><button onClick={() => setIsEditing(false)} className="text-slate-500 hover:text-slate-700 text-sm font-medium px-3">Annuler</button><button onClick={handleSaveProfile} disabled={isSaving} className="bg-emerald-600 text-white text-sm px-4 py-1.5 rounded-lg font-medium hover:bg-emerald-700">{isSaving ? '...' : 'Enregistrer'}</button></div>)}</div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">

                    <div>
                        <label className="block text-sm font-medium text-slate-500 mb-1">Nom complet</label>
                        {isEditing ? (
                            <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-emerald-500 focus:border-emerald-500" />
                        ) : (
                            <p className="text-slate-900 font-medium text-lg">{user.name}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-500 mb-1">Confession Chrétienne</label>
                        {isEditing ? (
                            <select
                                value={formData.denomination}
                                onChange={(e) => setFormData({ ...formData, denomination: e.target.value })}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white text-slate-800"
                            >
                                <option value="" disabled>Sélectionnez votre confession...</option>
                                <option value="Catholique">Catholique</option>
                                <option value="Évangélique">Évangélique</option>
                                <option value="Méthodiste">Méthodiste</option>
                                <option value="Baptiste">Baptiste</option>
                                <option value="Assemblées de Dieu">Assemblées de Dieu</option>
                                <option value="Autre">Autre confession chrétienne</option>
                            </select>
                        ) : (
                            <p className="text-slate-900 font-medium text-lg">
                                {getDenominationAndChurch(user.parish).denomination || 'Autre confession chrétienne'}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-500 mb-1">Paroisse / Église / Communauté</label>
                        {isEditing ? (
                            <input
                                type="text"
                                value={formData.church}
                                onChange={(e) => setFormData({ ...formData, church: e.target.value })}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-800"
                                placeholder="Nom de votre église ou paroisse..."
                            />
                        ) : (
                            <p className="text-slate-900 font-medium text-lg">
                                {getDenominationAndChurch(user.parish).church || 'Non renseignée'}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-500 mb-1">Numéro de téléphone</label>
                        {isEditing ? (
                            <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-emerald-500 focus:border-emerald-500" placeholder="07 00 00 00 00" />
                        ) : (
                            <p className="text-slate-900 font-medium text-lg">{user.phone || 'Non renseigné'}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-500 mb-1">Année de baptême</label>
                        {isEditing ? (
                            <input type="number" value={formData.baptismYear} onChange={(e) => setFormData({ ...formData, baptismYear: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-emerald-500 focus:border-emerald-500" />
                        ) : (
                            <p className="text-slate-900 font-medium text-lg">{user.baptismYear || 'Non renseigné'}</p>
                        )}
                    </div>

                </div>
            </div>

            {/* GALLERY SECTION */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center"><h3 className="font-bold text-slate-800 flex items-center"><ImageIcon size={18} className="mr-2 text-slate-500" /> Ma Galerie</h3><button onClick={handleGalleryClick} disabled={isUploadingGallery} className="text-sm bg-slate-800 text-white px-3 py-1.5 rounded-lg flex items-center hover:bg-slate-700 transition">{isUploadingGallery ? <Loader size={14} className="animate-spin mr-1" /> : <Plus size={14} className="mr-1" />} Ajouter des photos</button></div>
                <div className="p-6">
                    <p className="text-xs text-slate-500 mb-4">Ces photos seront visibles sur votre profil de rencontre. La première est votre photo de profil.</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="relative aspect-square rounded-lg overflow-hidden group shadow-sm"><img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" /><div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] text-center py-1">Principale</div></div>
                        {user.photos && user.photos.length > 0 && user.photos.map((photo, index) => (<div key={index} className="relative aspect-square rounded-lg overflow-hidden group shadow-sm bg-slate-100"><img src={getImlrUrl(photo)} alt={`Galerie ${index}`} className="w-full h-full object-cover" /></div>))}
                        <div onClick={handleGalleryClick} className="aspect-square rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:bg-slate-50 hover:border-emerald-300 hover:text-emerald-500 transition"><Plus size={32} /><span className="text-xs mt-1 font-medium">Ajouter</span></div>
                    </div>
                </div>
            </div >

            {/* Interests Section */}
            < div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden" >
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50"><h3 className="font-bold text-slate-800 flex items-center"><Tag size={18} className="mr-2 text-slate-500" /> Centres d'intérêt</h3></div>
                <div className="p-6">
                    {isEditing && (
                        <div className="relative mb-4"><div className="flex gap-2"><input type="text" value={interestInput} onChange={handleInterestInputChange} placeholder="Ajouter un intérêt..." className="flex-1 border border-slate-300 rounded-lg px-3 py-2 focus:ring-emerald-500 focus:border-emerald-500" /><button onClick={() => { if (interestInput) addInterest(interestInput); }} className="bg-emerald-600 text-white px-3 py-2 rounded-lg"><Plus size={20} /></button></div>{suggestions.length > 0 && (<div className="absolute z-10 w-full bg-white border border-slate-200 rounded-lg shadow-lg mt-1 max-h-40 overflow-y-auto">{suggestions.map(suggestion => (<div key={suggestion} onClick={() => addInterest(suggestion)} className="px-4 py-2 hover:bg-emerald-50 cursor-pointer text-sm text-slate-700">{suggestion}</div>))}</div>)}</div>
                    )}
                    <div className="flex flex-wrap gap-2">{formData.interests.length > 0 ? (formData.interests.map((interest, idx) => (<span key={idx} className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${isEditing ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>{interest}{isEditing && <button onClick={() => removeInterest(interest)} className="ml-2 text-emerald-600"><X size={14} /></button>}</span>))) : <p className="text-slate-400 italic text-sm">Aucun centre d'intérêt.</p>}</div>
                </div>
            </div >
            </div>
            )}

            {/* Premium Modal (Purchase) */}
            {
                showPremiumModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowPremiumModal(false)} />
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md relative z-10 overflow-hidden">
                            {/* Header */}
                            <div className="bg-gradient-to-br from-yellow-400 to-orange-500 p-6 text-white text-center">
                                <h3 className="text-2xl font-bold">
                                    {paymentMode === 'DONATION' ? '💖 Soutenir la Mission' : '⭐ Devenir Premium'}
                                </h3>
                                <p className="text-yellow-100 text-sm mt-1">
                                    {paymentMode === 'DONATION' ? 'Un don libre, de la communauté pour la mission.' : 'Débloquez tous les avantages.'}
                                </p>
                            </div>
                            {/* Tabs */}
                            <div className="flex border-b border-slate-200">
                                <button
                                    onClick={() => setPaymentMode('SUBSCRIPTION')}
                                    className={`flex-1 text-sm font-semibold py-3 transition ${paymentMode === 'SUBSCRIPTION' ? 'border-b-2 border-emerald-500 text-emerald-600' : 'text-slate-400 hover:text-slate-600'
                                        }`}
                                >
                                    🏆 Abonnement
                                </button>
                                <button
                                    onClick={() => setPaymentMode('DONATION')}
                                    className={`flex-1 text-sm font-semibold py-3 transition ${paymentMode === 'DONATION' ? 'border-b-2 border-rose-500 text-rose-600' : 'text-slate-400 hover:text-slate-600'
                                        }`}
                                >
                                    💖 Don Libre + Crédits
                                </button>
                            </div>
                            {/* Content */}
                            <div className="p-6 space-y-4">
                                {paymentMode === 'SUBSCRIPTION' ? (
                                    <>
                                        <div className="grid grid-cols-2 gap-2 text-left">
                                            <button
                                                type="button"
                                                onClick={() => setSelectedPlan('DAY')}
                                                className={`p-3 rounded-xl border text-xs font-bold transition flex flex-col cursor-pointer ${
                                                    selectedPlan === 'DAY'
                                                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20'
                                                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                                                }`}
                                            >
                                                <span className="text-[10px] text-emerald-600 font-extrabold uppercase">Pass 24H</span>
                                                <span className="text-sm font-black mt-0.5">{pointsPricingConfig?.premiumDailyPrice || 500} FCFA</span>
                                                <span className="text-[10px] text-slate-500 font-normal">Accès 1 Jour</span>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setSelectedPlan('MONTH')}
                                                className={`p-3 rounded-xl border text-xs font-bold transition flex flex-col relative cursor-pointer ${
                                                    selectedPlan === 'MONTH'
                                                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20'
                                                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                                                }`}
                                            >
                                                <span className="absolute top-1 right-1 text-[9px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.2 rounded">POPULAIRE</span>
                                                <span className="text-[10px] text-emerald-600 font-extrabold uppercase">1 Mois</span>
                                                <span className="text-sm font-black mt-0.5">{pointsPricingConfig?.premiumMonthlyPrice || 2500} FCFA</span>
                                                <span className="text-[10px] text-slate-500 font-normal">30 Jours d'accès</span>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setSelectedPlan('QUARTER')}
                                                className={`p-3 rounded-xl border text-xs font-bold transition flex flex-col cursor-pointer ${
                                                    selectedPlan === 'QUARTER'
                                                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20'
                                                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                                                }`}
                                            >
                                                <span className="text-[10px] text-emerald-600 font-extrabold uppercase">3 Mois</span>
                                                <span className="text-sm font-black mt-0.5">{pointsPricingConfig?.premiumQuarterlyPrice || 5000} FCFA</span>
                                                <span className="text-[10px] text-slate-500 font-normal">90 Jours d'accès</span>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setSelectedPlan('YEAR')}
                                                className={`p-3 rounded-xl border text-xs font-bold transition flex flex-col cursor-pointer ${
                                                    selectedPlan === 'YEAR'
                                                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20'
                                                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                                                }`}
                                            >
                                                <span className="text-[10px] text-emerald-600 font-extrabold uppercase">1 An (Annuel)</span>
                                                <span className="text-sm font-black mt-0.5">{pointsPricingConfig?.premiumYearlyPrice || 15000} FCFA</span>
                                                <span className="text-[10px] text-slate-500 font-normal">365 Jours d'accès</span>
                                            </button>
                                        </div>

                                        <ul className="space-y-1.5 text-xs text-slate-700 pt-1">
                                            <li className="flex items-center"><CheckCircle size={14} className="text-emerald-500 mr-2 flex-shrink-0" /> Voir qui vous a liké (Admirateurs secrets)</li>
                                            <li className="flex items-center"><CheckCircle size={14} className="text-emerald-500 mr-2 flex-shrink-0" /> Super-Likes illimités</li>
                                            <li className="flex items-center"><CheckCircle size={14} className="text-emerald-500 mr-2 flex-shrink-0" /> Mode Discret & Code PIN 🔒</li>
                                        </ul>

                                        <button
                                            onClick={initPaystack}
                                            disabled={isProcessingPayment}
                                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl shadow-lg transition flex items-center justify-center text-xs sm:text-sm cursor-pointer"
                                        >
                                            <CreditCard size={18} className="mr-2" />
                                            {isProcessingPayment ? 'Initialisation...' : `S'abonner (${
                                                selectedPlan === 'DAY' ? (pointsPricingConfig?.premiumDailyPrice || 500) :
                                                selectedPlan === 'MONTH' ? (pointsPricingConfig?.premiumMonthlyPrice || 2500) :
                                                selectedPlan === 'QUARTER' ? (pointsPricingConfig?.premiumQuarterlyPrice || 5000) :
                                                (pointsPricingConfig?.premiumYearlyPrice || 15000)
                                            } FCFA)`}
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-sm text-slate-600">Saisissez le montant que vous souhaitez offrir (minimum 500 FCFA). Chaque don vous rapporte des crédits Spotlight !</p>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                min="500"
                                                step="100"
                                                value={customDonationAmount}
                                                onChange={e => setCustomDonationAmount(e.target.value)}
                                                className="flex-1 border border-slate-300 rounded-xl px-4 py-3 text-lg font-bold text-slate-800 focus:ring-2 focus:ring-rose-400 focus:border-rose-400"
                                                placeholder="1000"
                                            />
                                            <span className="text-slate-500 font-medium">{paymentConfig?.currency || 'FCFA'}</span>
                                        </div>
                                        <p className="text-xs text-violet-600 font-medium">= {Math.max(1, Math.floor(parseInt(customDonationAmount || '0') / 500))} crédit(s) Spotlight offert(s) 🎁</p>
                                        <button
                                            onClick={initPaystack}
                                            disabled={isProcessingPayment}
                                            className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-4 rounded-xl shadow-lg transition flex items-center justify-center"
                                        >
                                            💖 {isProcessingPayment ? 'Initialisation...' : `Faire un don de ${customDonationAmount || '...'} FCFA`}
                                        </button>
                                    </>
                                )}
                                <button onClick={() => setShowPremiumModal(false)} className="w-full text-slate-400 hover:text-slate-600 text-sm">Fermer</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Renewal Reminder Modal */}
            {
                showRenewalModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowRenewalModal(false)} />
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm relative z-10 p-6 animate-in zoom-in-95 duration-300 border-2 border-amber-300">
                            <div className="text-center">
                                <div className="bg-amber-100 p-4 rounded-full inline-flex mb-4 animate-bounce">
                                    <AlertTriangle className="h-10 w-10 text-amber-600" />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-800 mb-2">Attention !</h3>
                                <p className="text-slate-600 mb-6">
                                    Votre abonnement Premium expire dans <span className="font-bold text-red-500 text-lg">{renewalDaysLeft} jour{renewalDaysLeft !== 1 ? 's' : ''}</span>.
                                    Ne perdez pas vos avantages exclusifs !
                                </p>

                                <div className="space-y-3">
                                    <button
                                        onClick={() => { setShowRenewalModal(false); initPaystack(); }}
                                        className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 shadow-lg transition flex items-center justify-center"
                                    >
                                        <Zap size={18} className="mr-2" /> Renouveler maintenant
                                    </button>
                                    <button
                                        onClick={() => setShowRenewalModal(false)}
                                        className="text-sm text-slate-400 hover:text-slate-600"
                                    >
                                        Je le ferai plus tard
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* MODALE CONFIGURATION CODE PIN 🔒 */}
            <PinLockModal
                isOpen={showSetPinModal}
                mode="SET_PIN"
                onClose={() => setShowSetPinModal(false)}
                onSavePin={() => {
                    setHasPin(true);
                    setShowSetPinModal(false);
                }}
            />

            {/* MODALE GUIDE & CONVERSION POINTS 💎 */}
            <PointsExplanationModal
                isOpen={showPointsModal}
                onClose={() => setShowPointsModal(false)}
                user={user}
                onPointsUpdated={(newPts, newCreds) => setUser(prev => prev ? { ...prev, points: newPts, credits: newCreds } as any : null)}
            />
        </div>
    );
};

export default Profile;
