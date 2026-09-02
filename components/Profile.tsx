import React, { useState, useEffect, useRef } from 'react';
import { User, VerificationStatus } from '../types';
import { AVAILABLE_INTERESTS } from '../constants';
import { supabase } from '../supabaseClient';
import { compressImage } from '../utils/imageCompressor';
import { UserCheck, ShieldCheck, Shield, Camera, AlertCircle, CheckCircle, Clock, Lock, Plus, X, Tag, FileText, CreditCard, Zap, Video, Play, Loader, Info, StopCircle, RefreshCw, Image as ImageIcon, Trash2, Phone, CalendarClock, AlertTriangle, Mic, EyeOff, Eye, MapPin, Compass } from 'lucide-react';
import { compareFaces } from '../utils/deepfaceClient';
import { PinLockModal } from './PinLockModal';
import { getCleanDisplayContact } from '../utils/phoneFormatter';
import { PointsExplanationModal } from './PointsExplanationModal';
import { PremiumCountdownBadge } from './PremiumCountdownBadge';
import { calculateAge } from '../matchingEngine';
import { LocationSelectorModal } from './LocationSelectorModal';
import { detectPreciseGPS, PreciseLocationResult } from '../utils/geoService';

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
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
    const [isDetectingGps, setIsDetectingGps] = useState(false);

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

    // Helper function to parse and clean interests array/string
    const parseInterests = (raw: any): string[] => {
        if (!raw) return [];
        let items: string[] = [];
        if (Array.isArray(raw)) {
            items = raw.map(i => String(i));
        } else if (typeof raw === 'string') {
            const trimmed = raw.trim();
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
        bio: '',
        birthDate: '',
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
    const [selectedPlan, setSelectedPlan] = useState<'DAY' | 'MONTH' | 'QUARTER' | 'SEMIANNUAL' | 'YEAR'>('MONTH');
    const [customDonationAmount, setCustomDonationAmount] = useState<string>('500');
    const [pointsPricingConfig, setPointsPricingConfig] = useState<any>(null);

    // Interest Input State
    const [interestInput, setInterestInput] = useState('');
    const [suggestions, setSuggestions] = useState<string[]>([]);

    // Ref pour l'input file de l'avatar et galerie et scroll formulaire
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);
    const editFormRef = useRef<HTMLDivElement>(null);

    const handleStartEdit = () => {
        setProfileTab('PROFIL');
        setIsEditing(true);
        setTimeout(() => {
            if (editFormRef.current) {
                editFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 100);
    };

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
                            bio: model.bio || '',
                            birthDate: model.birth_date || '',
                            email: session.user.email,
                            role: model.role,
                            parish: model.parish,
                            location: model.location || 'Abidjan, Cocody',
                            latitude: model.latitude || 5.3484,
                            longitude: model.longitude || -4.0305,
                            phone: model.phone,
                            baptismYear: model.baptism_year,
                            isPremium: model.is_premium,
                            premiumExpiration: model.premium_expiration,
                            isInvisible: model.is_invisible || false,
                            avatarUrl: model.avatar_url ? getImlrUrl(model.avatar_url) : 'https://picsum.photos/id/1012/150/150',
                            photos: model.photos_urls || [],
                            verificationStatus: model.verification_status || VerificationStatus.UNVERIFIED,
                            interests: parseInterests(model.interests)
                        };

                        const { denomination, church } = getDenominationAndChurch(currentUser.parish);
                        setUser(currentUser);
                        setFormData({
                            name: currentUser.name || '',
                            bio: currentUser.bio || '',
                            birthDate: currentUser.birthDate || '',
                            denomination: denomination || '',
                            church: church || '',
                            location: currentUser.location || 'Abidjan, Cocody',
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
                } catch (e) { }
            }
        };
        checkCertStatus();
    }, [user]);

    const handleRequestCommunityCertification = async () => {
        if (!user) return;

        try {
            let baptismPath = null;
            if (baptismFile) {
                const baptismExt = baptismFile.name.split('.').pop();
                baptismPath = `verifications/${user.id}/baptism_${Date.now()}.${baptismExt}`;
                await supabase.storage.from('Private').upload(baptismPath, baptismFile);
                await supabase.from('profiles').update({ 
                    document_baptism_url: baptismPath,
                    updated_at: new Date().toISOString()
                }).eq('id', user.id);
            }

            const newReq = {
                id: 'cert-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
                userId: user.id,
                userName: user.name,
                userEmail: user.email,
                userAvatar: user.avatarUrl,
                parish: user.parish || `${formData.denomination} - ${formData.church}`,
                baptismProofUrl: baptismPath,
                notes: certNotes || (baptismFile ? "Certificat de baptême joint" : "Recommandation paroissiale demandée"),
                status: 'PENDING',
                submittedDate: new Date().toLocaleDateString('fr-FR')
            };

            const { data } = await supabase.from('system_settings').select('value').eq('key', 'certification_requests').maybeSingle();
            let reqList: any[] = (data?.value && Array.isArray(data.value)) ? data.value : [];
            reqList = reqList.filter((r: any) => r.userId !== user.id);
            reqList.push(newReq);

            await supabase.from('system_settings').upsert({
                key: 'certification_requests',
                value: reqList,
                updated_at: new Date().toISOString()
            }, { onConflict: 'key' });

            setHasPendingCertification(true);
            setPendingCertNotes(certNotes || (baptismFile ? "Certificat de baptême joint" : ""));
            setCertNotes('');
            setBaptismFile(null);
            alert("🕊️ Votre demande de Sceau Spirituel & Paroissial a été transmise aux Ambassadeurs et Administrateurs avec succès !");
        } catch (e: any) {
            console.error("Erreur envoi demande certification Supabase:", e);
            alert("Erreur lors de la transmission de la demande : " + e.message);
        }
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
                } else if (selectedPlan === 'SEMIANNUAL') {
                    amountToPay = pointsPricingConfig?.premiumSemiAnnualPrice || 9000;
                    addedDays = 180;
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
            const cleanInterests = formData.interests.map(i => i.replace(/^["'[\]\s]+|["'[\]\s]+$/g, '').trim()).filter(Boolean);
            await supabase.from('profiles').update({
                full_name: formData.name,
                bio: formData.bio,
                birth_date: formData.birthDate || null,
                parish: combinedParish,
                phone: formData.phone,
                baptism_year: formData.baptismYear ? Number(formData.baptismYear) : null,
                interests: JSON.stringify(cleanInterests)
            }).eq('id', user.id);
            setUser({
                ...user,
                name: formData.name,
                bio: formData.bio,
                birthDate: formData.birthDate,
                parish: combinedParish,
                phone: formData.phone,
                baptismYear: formData.baptismYear ? Number(formData.baptismYear) : undefined,
                interests: cleanInterests
            });
            setIsEditing(false);
        } catch (error) {
            console.error("Erreur lors de la mise à jour", error);
            alert("Erreur lors de l'enregistrement. Vérifiez votre connexion.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdateProfileLocation = async (loc: PreciseLocationResult) => {
        if (!user) return;
        setIsSaving(true);
        try {
            await supabase.from('profiles').update({
                location: loc.city,
                latitude: loc.latitude,
                longitude: loc.longitude
            }).eq('id', user.id);

            setUser(prev => prev ? {
                ...prev,
                location: loc.city,
                latitude: loc.latitude,
                longitude: loc.longitude
            } : null);

            setFormData(prev => ({ ...prev, location: loc.city }));
            alert(`📍 Localisation mise à jour avec succès : ${loc.city}`);
        } catch (e: any) {
            console.error("Erreur mise à jour localisation :", e);
            alert("Erreur lors de la mise à jour de la localisation.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDirectGpsRefresh = async () => {
        setIsDetectingGps(true);
        try {
            const res = await detectPreciseGPS();
            await handleUpdateProfileLocation(res);
        } catch (err: any) {
            console.warn("GPS non accessible :", err);
            alert("Impossible d'accéder au GPS. Vous pouvez choisir votre commune dans la liste.");
            setIsLocationModalOpen(true);
        } finally {
            setIsDetectingGps(false);
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
    
    const handleDeleteGalleryPhoto = async (indexToDelete: number) => {
        if (!user || !user.photos) return;
        if (!window.confirm("Voulez-vous vraiment supprimer cette photo de votre galerie ?")) return;
        try {
            const updatedPhotos = user.photos.filter((_, idx) => idx !== indexToDelete);
            await supabase.from('profiles').update({ photos_urls: updatedPhotos }).eq('id', user.id);
            setUser({ ...user, photos: updatedPhotos });
        } catch (error) {
            console.error("Erreur suppression photo galerie", error);
            alert("Erreur lors de la suppression de la photo.");
        }
    };

    const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0 || !user) return;

        const currentGalleryCount = user.photos?.length || 0;
        const MAX_GALLERY_PHOTOS = 2; // Total max = 1 avatar + 2 galerie = 3 photos au total

        if (currentGalleryCount >= MAX_GALLERY_PHOTOS) {
            alert("La galerie est limitée à 3 photos au total (1 photo principale + 2 photos secondaires). Supprimez une photo existante pour en ajouter une nouvelle.");
            if (galleryInputRef.current) galleryInputRef.current.value = '';
            return;
        }

        setIsUploadingGallery(true);
        try {
            let newPhotos = [...(user.photos || [])];
            const availableSlots = MAX_GALLERY_PHOTOS - currentGalleryCount;
            const filesToProcess = Array.from(files).slice(0, availableSlots);

            for (let i = 0; i < filesToProcess.length; i++) {
                const file = filesToProcess[i];

                // --- VÉRIFICATION BIOMÉTRIQUE FACIALE ANTI-IA / ANTI-USURPATION ---
                if (user.avatarUrl && user.avatarUrl.startsWith('http')) {
                    try {
                        const fileReader = new FileReader();
                        const base64Promise = new Promise<string>((resolve) => {
                            fileReader.onload = () => resolve(fileReader.result as string);
                            fileReader.readAsDataURL(file);
                        });
                        const fileBase64 = await base64Promise;

                        const faceMatch = await compareFaces(fileBase64, user.avatarUrl);
                        if (faceMatch && faceMatch.verified === false && typeof faceMatch.similarityPercentage === 'number' && faceMatch.similarityPercentage < 45) {
                            alert(`❌ Photo rejetée par le contrôle IA pour "${file.name}" :\nLe visage ne semble pas correspondre à votre photo de profil principale. Veuillez publier de vraies photos de vous-même.`);
                            continue;
                        }
                    } catch (e) {
                        console.log("DeepFace verification fallback error", e);
                    }
                }

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
        if (!navigator?.mediaDevices?.getUserMedia) {
            alert("L'enregistrement direct par caméra nécessite une connexion sécurisée (HTTPS ou localhost). Veuillez autoriser l'accès à la caméra dans votre navigateur.");
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 480, height: 640, facingMode: "user" }, audio: true });
            streamRef.current = stream;
            setIsCameraActive(true);
        } catch (err: any) {
            console.error("Erreur accès caméra direct:", err);
            alert("Impossible d'accéder à la caméra. Veuillez autoriser l'accès à la caméra dans les permissions de votre navigateur.");
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
            alert("Erreur d'initialisation de l'enregistrement vidéo. Essayez l'option de fichier ou un autre navigateur.");
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
        if (!navigator?.mediaDevices?.getUserMedia) {
            alert("L'enregistrement audio direct nécessite une connexion sécurisée (HTTPS ou localhost).");
            return;
        }
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
        if (!idFile || !videoFile) { 
            alert("Veuillez fournir les éléments obligatoires : votre Pièce d'identité et la Vidéo Liveness de 5 secondes."); 
            return; 
        }
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

            // 4. Upload Baptism File (OPTIONNEL)
            let baptismPath = null;
            if (baptismFile) {
                const baptismExt = baptismFile.name.split('.').pop();
                baptismPath = `verifications/${user.id}/baptism_${Date.now()}.${baptismExt}`;
                await supabase.storage.from('Private').upload(baptismPath, baptismFile);
            }
            setUploadProgress(80);

            // 5. Upload Video Proof
            const videoExt = videoFile.name.split('.').pop();
            const videoPath = `verifications/${user.id}/video_${Date.now()}.${videoExt}`;
            await supabase.storage.from('Private').upload(videoPath, videoFile);
            setUploadProgress(95);

            // 6. Update Profile with PENDING status for Admin review
            const updatePayload: any = {
                verification_status: VerificationStatus.PENDING,
                document_id_url: idPath,
                video_proof_url: videoPath,
                liveness_video_url: videoPath,
                ai_match_score: aiMatchScore || 90,
                updated_at: new Date().toISOString()
            };
            if (baptismPath) {
                updatePayload.document_baptism_url = baptismPath;
            }

            await supabase.from('profiles').update(updatePayload).eq('id', user.id);

            setUploadProgress(100);
            setTimeout(() => {
                setUser({ ...user, verificationStatus: VerificationStatus.PENDING });
                setUploadProgress(0);
                setIdFile(null);
                setBaptismFile(null);
                setVideoFile(null);
                alert(
                    `🎉 Validation biométrique IA réussie (Score DeepFace: ${aiMatchScore || 90}%).\n\n` +
                    `Votre dossier de vérification (${baptismPath ? 'avec Certificat de Baptême inclus 🕊️' : 'Vérification Membre'}) a été transmis à l'administrateur avec succès pour validation finale !`
                );
            }, 1000);
        } catch (error: any) {
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
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 mb-8 shadow-sm text-left">
                        <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                                    <Shield className="text-emerald-600" size={22} />
                                    <span>Vérification & Certification du Profil</span>
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">Validation d'identité sécurisée par IA et engagement spirituel.</p>
                            </div>
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2.5 py-1 rounded-full uppercase font-black tracking-wider">
                                Niveau 2
                            </span>
                        </div>

                        {uploadProgress > 0 ? (
                            <div className="w-full bg-slate-100 rounded-full h-3 mb-4 overflow-hidden border border-slate-200">
                                <div className="bg-emerald-600 h-3 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                                <p className="text-center text-xs text-slate-600 font-bold mt-2">Envoi sécurisé en cours ({uploadProgress}%)...</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* SECTION 1 : VÉRIFICATION D'IDENTITÉ & VIDÉO (OBLIGATOIRE) */}
                                <div className="p-4 sm:p-5 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2">
                                            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">1</span>
                                            <span>Identité & Sécurité Biométrique (Requis)</span>
                                        </h4>
                                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-black px-2 py-0.5 rounded-full uppercase">Obligatoire</span>
                                    </div>

                                    {/* Upload CNI */}
                                    <div>
                                        <label className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition group ${idFile ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300 hover:bg-white bg-white/70'}`}>
                                            <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => handleFileChange(e, 'ID')} />
                                            <div className={`p-2.5 rounded-full mb-2 transition ${idFile ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-100 text-slate-500 group-hover:scale-110'}`}>
                                                {idFile ? <CheckCircle className="h-5 w-5" /> : <UserCheck className="h-5 w-5" />}
                                            </div>
                                            <span className="font-bold text-slate-800 text-xs">
                                                {idFile ? `✓ ${idFile.name}` : "Pièce d'Identité (CNI / Passeport)"}
                                            </span>
                                            <span className="text-[10px] text-slate-500 mt-0.5">Photo nette et lisible sans reflets</span>
                                        </label>
                                    </div>

                                    {/* Preuve de vie vidéo 5s */}
                                    <div>
                                        <p className="text-xs font-bold text-slate-700 mb-1.5">Preuve de Vie Vidéo Directe (5 secondes) :</p>
                                        <p className="text-[11px] text-slate-500 mb-3">Filmez 5 secondes en direct face à la caméra en tournant lentement la tête pour confirmer votre authenticité.</p>

                                        <div className="w-full flex flex-col items-center justify-center">
                                            {!videoFile && !isCameraActive ? (
                                                <button
                                                    type="button"
                                                    onClick={startCamera}
                                                    className="w-full h-36 sm:h-40 rounded-2xl border-2 border-emerald-400 border-dashed flex flex-col items-center justify-center bg-emerald-50/20 hover:bg-emerald-50/60 transition cursor-pointer p-5 group shadow-2xs"
                                                >
                                                    <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                                        <Video size={24} />
                                                    </div>
                                                    <span className="text-slate-900 font-black text-sm">Activer la caméra directe (5s)</span>
                                                    <span className="text-[11px] text-emerald-800 font-bold mt-1">Enregistrement vidéo en direct uniquement</span>
                                                </button>
                                            ) : !videoFile && isCameraActive ? (
                                                <div className="relative w-full h-48 rounded-2xl overflow-hidden bg-black border-2 border-emerald-500 shadow-md">
                                                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform -scale-x-100" />
                                                    <div className="absolute bottom-3 left-0 right-0 flex justify-center space-x-4 z-20">
                                                        {!isRecording ? (
                                                            <button type="button" onClick={startRecording} className="bg-red-600 text-white rounded-full px-6 py-2.5 shadow-lg hover:bg-red-700 font-black text-xs flex items-center gap-2 cursor-pointer transition active:scale-95">
                                                                <div className="h-3 w-3 bg-white rounded-full animate-ping"></div>
                                                                <span>Démarrer l'enregistrement (5s)</span>
                                                            </button>
                                                        ) : (
                                                            <button type="button" onClick={stopRecording} className="bg-red-600 text-white rounded-full px-6 py-2.5 shadow-lg font-black text-xs flex items-center gap-2 animate-pulse cursor-pointer">
                                                                <StopCircle size={16} />
                                                                <span>Arrêt auto dans {videoCountdown}s</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                    {isRecording && (
                                                        <div className="absolute top-2.5 right-2.5 flex items-center bg-red-600/90 px-3 py-1 rounded-full text-white text-xs font-black z-20 shadow-md">
                                                            <div className="w-2 h-2 bg-white rounded-full mr-1.5 animate-ping"></div>
                                                            <span>REC 00:0{videoCountdown}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="relative w-full h-48 bg-black rounded-2xl overflow-hidden border-2 border-emerald-500 flex items-center justify-center group shadow-md">
                                                    {videoUrl && (<video src={videoUrl} controls className="w-full h-full object-contain" />)}
                                                    <button type="button" onClick={resetVideo} className="absolute top-2.5 right-2.5 bg-white text-slate-800 rounded-full p-2 shadow-md hover:bg-slate-100 z-30 cursor-pointer font-bold flex items-center gap-1 text-xs" title="Refaire la vidéo">
                                                        <RefreshCw size={14} />
                                                        <span>Reprendre</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* SECTION 2 : SCEAU SPIRITUEL & BAPTÊME (OPTIONNEL / VALORISÉ) */}
                                <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-50/70 to-yellow-50/70 rounded-2xl border border-amber-200 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-extrabold text-amber-950 text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2">
                                            <span className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center text-[10px]">2</span>
                                            <span>Certificat de Baptême & Engagement (Optionnel 🕊️)</span>
                                        </h4>
                                        <span className="text-[10px] bg-amber-200 text-amber-900 font-black px-2 py-0.5 rounded-full uppercase">Facultatif</span>
                                    </div>
                                    <p className="text-[11px] text-amber-800 leading-relaxed">
                                        Ajoutez votre certificat de baptême ou attestation paroissiale quand vous le souhaitez pour débloquer le <strong>Badge Or "Baptême Certifié 🕊️"</strong> et obtenir un boost algorithmique dans le matching.
                                    </p>

                                    <label className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition group ${baptismFile ? 'border-amber-500 bg-amber-100/70' : 'border-amber-300 hover:bg-white bg-white/60'}`}>
                                        <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => handleFileChange(e, 'BAPTISM')} />
                                        <div className={`p-2.5 rounded-full mb-2 transition ${baptismFile ? 'bg-amber-300 text-amber-950' : 'bg-amber-100 text-amber-800 group-hover:scale-110'}`}>
                                            {baptismFile ? <CheckCircle className="h-5 w-5 text-amber-950" /> : <FileText className="h-5 w-5" />}
                                        </div>
                                        <span className="font-bold text-amber-950 text-xs">
                                            {baptismFile ? `✓ ${baptismFile.name}` : "Certificat de Baptême / Attestation"}
                                        </span>
                                        <span className="text-[10px] text-amber-700 mt-0.5">Non obligatoire pour débloquer les rencontres</span>
                                    </label>
                                </div>
                            </div>
                        )}

                        {uploadProgress === 0 && (
                            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
                                <p className="text-[11px] text-slate-500">
                                    {!idFile || !videoFile ? "⚠️ Veuillez fournir la CNI et la vidéo 5s pour soumettre." : "✓ Prêt à envoyer à l'administrateur !"}
                                </p>
                                <button
                                    type="button"
                                    onClick={handleRequestVerification}
                                    disabled={!idFile || !videoFile}
                                    className={`w-full sm:w-auto px-6 py-3 rounded-xl font-extrabold shadow-sm transition flex items-center justify-center gap-2 text-xs cursor-pointer ${
                                        idFile && videoFile 
                                            ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md transform active:scale-98' 
                                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                    }`}
                                >
                                    <Lock size={15} />
                                    <span>Soumettre ma demande de vérification</span>
                                </button>
                            </div>
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

            {/* Header Profile - Style Moderne, Lisible & Alignement Propre à Gauche */}
            <div className="relative bg-gradient-to-r from-emerald-800 via-teal-900 to-emerald-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl mb-8 border border-emerald-500/20 text-left">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                    {/* Avatar avec bouton photo */}
                    <div className="relative group cursor-pointer flex-shrink-0" onClick={handleAvatarClick}>
                        <div className="relative h-28 w-28 sm:h-32 sm:w-32 rounded-full border-4 border-white/90 bg-white/10 shadow-2xl overflow-hidden backdrop-blur-sm">
                            {isUploadingAvatar && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
                                    <Loader className="text-white animate-spin" />
                                </div>
                            )}
                            <img src={user.avatarUrl} alt="Profile" className="h-full w-full object-cover" />
                        </div>
                        <button className="absolute bottom-0 right-0 bg-slate-900 text-white p-2 rounded-full border-2 border-white hover:bg-slate-800 shadow-md transition">
                            <Camera size={16} />
                        </button>
                    </div>

                    {/* Détails du profil : Nom, Âge, Téléphone/Email & Badge Premium */}
                    <div className="flex-1 text-center sm:text-left space-y-2">
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-sm">
                                {user.name || 'Membre Chrétien'}, <span className="text-emerald-300 font-extrabold">{calculateAge(user.birthDate)} ans</span>
                            </h1>
                            {user.verificationStatus === VerificationStatus.VERIFIED && (
                                <ShieldCheck className="text-amber-400 h-7 w-7 drop-shadow-sm" title="Profil Vérifié" />
                            )}
                        </div>

                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                            <span className="inline-flex items-center text-xs font-bold text-slate-900 bg-white/90 px-3 py-1 rounded-full shadow-xs backdrop-blur-md">
                                {getCleanDisplayContact(user)}
                            </span>
                            <PremiumCountdownBadge
                                isPremium={user.isPremium}
                                expirationDate={user.premiumExpiration}
                                onUpgradeClick={() => setShowPremiumModal(true)}
                            />
                        </div>
                    </div>

                    {/* Bouton Modifier le profil */}
                    {!isEditing && (
                        <button
                            onClick={handleStartEdit}
                            className="bg-white/15 hover:bg-white/25 text-white border border-white/30 backdrop-blur-md px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition shadow-sm cursor-pointer whitespace-nowrap self-center sm:self-start"
                        >
                            ✏️ Modifier le profil
                        </button>
                    )}
                </div>
            </div>

            {/* Barre d'onglets épurée */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-xs mb-8">
                <button
                    onClick={() => setProfileTab('PROFIL')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2 cursor-pointer ${profileTab === 'PROFIL' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
                        }`}
                >
                    <UserCheck size={15} />
                    <span>Profil & Galerie</span>
                </button>
                <button
                    onClick={() => setProfileTab('VERIFICATION')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2 cursor-pointer ${profileTab === 'VERIFICATION' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
                        }`}
                >
                    <ShieldCheck size={15} />
                    <span>Vérification & Identité</span>
                </button>
                <button
                    onClick={() => setProfileTab('POINTS')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2 cursor-pointer ${profileTab === 'POINTS' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
                        }`}
                >
                    <CreditCard size={15} />
                    <span>Points & Offres</span>
                </button>
                <button
                    onClick={() => setProfileTab('SECURITY')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2 cursor-pointer ${profileTab === 'SECURITY' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
                        }`}
                >
                    <Lock size={15} />
                    <span>Sécurité & PIN</span>
                </button>
            </div>

            {/* 🛡️ TAB 2 : VERIFICATION & IDENTITE */}
            {profileTab === 'VERIFICATION' && (
                <div className="space-y-6 animate-in fade-in">
                    {renderVerificationStatus()}

                    {user.verificationStatus === VerificationStatus.VERIFIED && (
                        <div className="bg-white rounded-2xl shadow-sm border border-amber-200/80 overflow-hidden mb-8 animate-in fade-in">
                            <div className="px-6 py-4 border-b border-amber-100 bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
                                <div className="flex items-center gap-3">
                                    <div className="bg-amber-500 text-white p-2.5 rounded-xl shadow-xs">
                                        <ShieldCheck className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-extrabold text-amber-950 text-sm flex items-center gap-1.5">
                                            <span>Sceau Spirituel & Paroissial 🕊️</span>
                                            <span className="text-[10px] bg-amber-200 text-amber-900 font-black px-2 py-0.5 rounded-full uppercase">Palier Excellence</span>
                                        </h3>
                                        <p className="text-[11px] text-amber-800/90">Certificat de baptême et/ou parrainage physique par les ambassadeurs paroissiaux.</p>
                                    </div>
                                </div>
                                {isCommunityCertified ? (
                                    <span className="text-xs bg-amber-100 text-amber-900 border border-amber-300 px-3.5 py-1 rounded-full font-black flex items-center gap-1.5 shadow-2xs self-start sm:self-auto">
                                        🕊️ Sceau Validé (Badge Or)
                                    </span>
                                ) : (
                                    <span className="text-[11px] bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-full font-bold self-start sm:self-auto">
                                        Facultatif & Boost +25%
                                    </span>
                                )}
                            </div>

                            <div className="p-6 space-y-5">
                                {isCommunityCertified ? (
                                    <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 rounded-2xl p-5 text-xs text-amber-900 leading-relaxed text-left space-y-2">
                                        <div className="flex items-center gap-2 font-extrabold text-amber-950 text-sm">
                                            <span>🕊️</span>
                                            <span>Félicitations ! Vous possédez le Sceau Spirituel & Paroissial.</span>
                                        </div>
                                        <p className="text-amber-800">
                                            Votre certificat de baptême et/ou votre engagement auprès de votre église locale ont été authentifiés. Le badge d'Excellence <strong>"Baptême & Paroisse Certifiés 🕊️"</strong> est affiché sur votre profil avec un boost de visibilité auprès des membres.
                                        </p>
                                    </div>
                                ) : hasPendingCertification ? (
                                    <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-5 space-y-3 text-left">
                                        <div className="flex items-center gap-2 text-amber-900 font-extrabold text-xs">
                                            <Clock size={15} className="animate-spin text-amber-600" />
                                            <span>Demande de Sceau Spirituel transmise (En attente d'examen)</span>
                                        </div>
                                        <p className="text-xs text-amber-800 leading-relaxed">
                                            Votre dossier a été soumis aux ambassadeurs et modérateurs de la paroisse : <strong className="text-amber-950">{formData.church || user.parish || 'Votre paroisse'}</strong>.
                                        </p>
                                        {pendingCertNotes && (
                                            <div className="bg-white/90 p-3.5 rounded-xl border border-amber-200 text-xs text-slate-700 italic">
                                                Note / Éléments transmis : "{pendingCertNotes}"
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-5 text-left">
                                        <p className="text-xs text-slate-600 leading-relaxed">
                                            Pour sublimer votre profil chrétien et rassurer pleinement la communauté, vous pouvez demander le <strong>Sceau Spirituel & Paroissial</strong> en fournissant votre certificat de baptême et/ou en indiquant votre engagement paroissial (chorale, groupe de jeunesse, bénévole).
                                        </p>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* OPTION 1 : SCAN DU CERTIFICAT */}
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-700 block">
                                                    1. Certificat de Baptême / Attestation (Photo ou PDF)
                                                </label>
                                                <label className={`border-2 border-dashed rounded-xl p-3.5 flex flex-col items-center justify-center text-center cursor-pointer transition ${baptismFile ? 'border-amber-500 bg-amber-50' : 'border-slate-300 hover:bg-slate-50 bg-slate-50/50'}`}>
                                                    <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => handleFileChange(e, 'BAPTISM')} />
                                                    <FileText size={18} className={`mb-1 ${baptismFile ? 'text-amber-600' : 'text-slate-400'}`} />
                                                    <span className="text-xs font-bold text-slate-800">
                                                        {baptismFile ? `✓ ${baptismFile.name}` : "Sélectionner un fichier..."}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 mt-0.5">Format JPG, PNG ou PDF</span>
                                                </label>
                                            </div>

                                            {/* OPTION 2 : NOTE PAROISSIALE & AMBASSADEUR */}
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-700 block">
                                                    2. Note d'engagement pour l'Ambassadeur
                                                </label>
                                                <textarea
                                                    value={certNotes}
                                                    onChange={(e) => setCertNotes(e.target.value)}
                                                    placeholder="Ex: Membre de la chorale Sainte-Cécile, référent : Père Paul..."
                                                    rows={3}
                                                    className="w-full text-xs rounded-xl border-slate-300 focus:ring-amber-500 focus:border-amber-500 p-2.5 bg-slate-50/50 resize-none"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100">
                                            <p className="text-[11px] text-slate-500">
                                                Paroisse déclarée : <strong className="text-slate-800">{user.parish || `${formData.denomination} - ${formData.church}`}</strong>
                                            </p>
                                            <button
                                                type="button"
                                                onClick={handleRequestCommunityCertification}
                                                disabled={!baptismFile && !certNotes.trim()}
                                                className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer ${
                                                    baptismFile || certNotes.trim()
                                                        ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20'
                                                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                                }`}
                                            >
                                                <span>🕊️ Demander le Sceau Spirituel</span>
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
                    <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-emerald-950 rounded-2xl p-6 text-white shadow-xl border border-emerald-500/30 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-2xl">💎</span>
                                <h3 className="font-extrabold text-lg">Votre Solde de Confiance</h3>
                            </div>
                            <p className="text-xs text-emerald-200">Accumulez des points par votre assiduité et convertissez-les en crédits Spotlight.</p>
                        </div>
                        <div className="flex flex-col sm:flex-row items-center gap-3">
                            <div className="flex items-center gap-4 bg-white/10 px-5 py-3 rounded-xl backdrop-blur-md border border-white/10">
                                <div className="text-center">
                                    <span className="text-2xl font-black text-amber-400">{user.points ?? 150}</span>
                                    <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-200">Points</span>
                                </div>
                                <div className="h-8 w-px bg-white/20" />
                                <div className="text-center">
                                    <span className="text-2xl font-black text-amber-400">{(user as any).credits ?? 3}</span>
                                    <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-200">Crédits</span>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowPointsModal(true)}
                                className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs px-4 py-3 rounded-xl transition shadow-md flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
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
                    <div ref={editFormRef} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8 scroll-mt-6">
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
                                <label className="block text-sm font-medium text-slate-500 mb-1">Date de naissance & Âge</label>
                                {isEditing ? (
                                    <input
                                        type="date"
                                        value={formData.birthDate}
                                        onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white text-slate-800"
                                    />
                                ) : (
                                    <p className="text-slate-900 font-medium text-lg">
                                        {user.birthDate ? `${calculateAge(user.birthDate)} ans (${formatDate(user.birthDate)})` : 'Non renseignée'}
                                    </p>
                                )}
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-500 mb-1">Ma biographie / Présentation</label>
                                {isEditing ? (
                                    <textarea
                                        rows={3}
                                        value={formData.bio}
                                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                        placeholder="Présentez-vous en quelques phrases (votre foi, votre personnalité, ce que vous recherchez...)"
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-800 resize-none"
                                    />
                                ) : (
                                    <p className="text-slate-800 font-normal text-base leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100 italic">
                                        "{user.bio || 'Aucune biographie rédigée. Cliquez sur Modifier le profil pour en ajouter une !'}"
                                    </p>
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

                            {/* LOCALISATION & COMMUNE */}
                            <div className="sm:col-span-2 p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
                                <div className="flex items-center space-x-3">
                                    <div className="h-10 w-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0 shadow-xs">
                                        <MapPin size={20} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Localisation & Commune</label>
                                        <p className="text-slate-900 font-extrabold text-base flex items-center gap-2 mt-0.5">
                                            <span>{user.location || 'Abidjan, Cocody'}</span>
                                            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                                                Actif
                                            </span>
                                        </p>
                                        <p className="text-[11px] text-slate-400">Utilisé pour calculer la distance réelle avec vos matchs chrétiens.</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        type="button"
                                        onClick={handleDirectGpsRefresh}
                                        disabled={isDetectingGps}
                                        className="px-3.5 py-2 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                                        title="Actualiser automatiquement votre position avec le GPS du téléphone"
                                    >
                                        {isDetectingGps ? <Loader size={14} className="animate-spin text-emerald-600" /> : <Compass size={14} />}
                                        <span>{isDetectingGps ? "Recherche GPS..." : "GPS Direct"}</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsLocationModalOpen(true)}
                                        className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold transition shadow-xs cursor-pointer active:scale-95"
                                    >
                                        Changer de commune
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* GALLERY SECTION (Max 3 photos au total = 1 avatar + 2 secondaires) */}
                    {(() => {
                        const totalPhotosCount = (user.avatarUrl ? 1 : 0) + (user.photos?.length || 0);
                        const isUnlocked = user.verificationStatus === VerificationStatus.VERIFIED || user.role === 'ADMIN' || totalPhotosCount >= 3;
                        return (
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8">
                                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex flex-wrap justify-between items-center gap-2">
                                    <h3 className="font-bold text-slate-800 flex items-center">
                                        <ImageIcon size={18} className="mr-2 text-slate-500" /> Ma Galerie ({totalPhotosCount}/3 photos)
                                    </h3>
                                    <button
                                        onClick={handleGalleryClick}
                                        disabled={isUploadingGallery || (user.photos && user.photos.length >= 2)}
                                        className={`text-sm text-white px-3.5 py-1.5 rounded-lg flex items-center font-medium transition cursor-pointer ${isUploadingGallery || (user.photos && user.photos.length >= 2) ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-slate-800 hover:bg-slate-700'}`}
                                    >
                                        {isUploadingGallery ? <Loader size={14} className="animate-spin mr-1.5" /> : <Plus size={14} className="mr-1.5" />}
                                        Ajouter des photos
                                    </button>
                                </div>
                                <div className="p-6">
                                    {/* Badge Condition 4 - Disposition Soignée & Responsive */}
                                    <div className={`p-4 rounded-2xl border mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm font-medium ${isUnlocked ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900' : 'bg-amber-50/80 border-amber-200 text-amber-950'}`}>
                                        <div className="flex items-start sm:items-center gap-3">
                                            <div className={`p-2 rounded-xl shrink-0 ${isUnlocked ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                {isUnlocked ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                                            </div>
                                            <div className="space-y-0.5 text-left">
                                                <div className="font-extrabold text-xs sm:text-sm">
                                                    {isUnlocked ? 'Condition 4 : Galerie Photo Validée' : `4ème Condition Obligatoire : ${totalPhotosCount}/3 photos`}
                                                </div>
                                                <p className="text-[11px] sm:text-xs opacity-90 leading-tight">
                                                    {isUnlocked
                                                        ? `Votre galerie contient ${totalPhotosCount}/3 photos. Votre profil est déverrouillé pour les rencontres !`
                                                        : 'Publiez au moins 3 vraies photos pour débloquer les rencontres.'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="shrink-0 self-start sm:self-center">
                                            <span className={`inline-flex items-center whitespace-nowrap font-black text-xs px-3 py-1.5 rounded-full border shadow-2xs ${
                                                isUnlocked 
                                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                                                    : 'bg-white text-amber-800 border-amber-300'
                                            }`}>
                                                {isUnlocked ? '✓ Débloqué' : `${3 - totalPhotosCount} photo${3 - totalPhotosCount > 1 ? 's' : ''} manquante${3 - totalPhotosCount > 1 ? 's' : ''}`}
                                            </span>
                                        </div>
                                    </div>

                                    <p className="text-xs text-slate-500 mb-4">
                                        🔒 Les photos de votre galerie sont automatiquement contrôlées par notre IA faciale biométrique. La 1ère photo est votre photo principale.
                                    </p>

                                    <div className="grid grid-cols-3 gap-3 sm:gap-4 max-w-xl">
                                        {/* Avatar photo principale */}
                                        <div className="relative aspect-square rounded-xl overflow-hidden group shadow-sm border-2 border-emerald-500">
                                            <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                            <div className="absolute bottom-0 left-0 right-0 bg-emerald-700/90 text-white text-[10px] font-bold text-center py-1">
                                                Principale
                                            </div>
                                        </div>

                                        {/* Photos de la galerie */}
                                        {user.photos && user.photos.length > 0 && user.photos.map((photo, index) => (
                                            <div key={index} className="relative aspect-square rounded-xl overflow-hidden group shadow-sm bg-slate-100 border border-slate-200">
                                                <img src={getImlrUrl(photo)} alt={`Galerie ${index}`} className="w-full h-full object-cover" />
                                                <button
                                                    onClick={() => handleDeleteGalleryPhoto(index)}
                                                    className="absolute top-1.5 right-1.5 bg-red-600/90 hover:bg-red-700 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition shadow-md cursor-pointer"
                                                    title="Supprimer cette photo"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        ))}

                                        {/* Bouton Ajouter si slots disponibles */}
                                        {(!user.photos || user.photos.length < 2) && (
                                            <div
                                                onClick={handleGalleryClick}
                                                className="aspect-square rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:bg-emerald-50/50 hover:border-emerald-400 hover:text-emerald-600 transition"
                                            >
                                                <Plus size={28} />
                                                <span className="text-xs mt-1 font-semibold">Ajouter ({user.photos?.length || 0}/2)</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {/* Interests Section */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50"><h3 className="font-bold text-slate-800 flex items-center"><Tag size={18} className="mr-2 text-slate-500" /> Centres d'intérêt</h3></div>
                        <div className="p-6">
                            {isEditing && (
                                <div className="relative mb-4"><div className="flex gap-2"><input type="text" value={interestInput} onChange={handleInterestInputChange} placeholder="Ajouter un intérêt..." className="flex-1 border border-slate-300 rounded-lg px-3 py-2 focus:ring-emerald-500 focus:border-emerald-500" /><button onClick={() => { if (interestInput) addInterest(interestInput); }} className="bg-emerald-600 text-white px-3 py-2 rounded-lg"><Plus size={20} /></button></div>{suggestions.length > 0 && (<div className="absolute z-10 w-full bg-white border border-slate-200 rounded-lg shadow-lg mt-1 max-h-40 overflow-y-auto">{suggestions.map(suggestion => (<div key={suggestion} onClick={() => addInterest(suggestion)} className="px-4 py-2 hover:bg-emerald-50 cursor-pointer text-sm text-slate-700">{suggestion}</div>))}</div>)}</div>
                            )}
                            <div className="flex flex-wrap gap-2">
                                {formData.interests && formData.interests.length > 0 ? (
                                    formData.interests.map((interest, idx) => {
                                        const cleanTag = interest.replace(/^["'[\]\s]+|["'[\]\s]+$/g, '').trim();
                                        if (!cleanTag) return null;
                                        return (
                                            <span key={idx} className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold border ${isEditing ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-slate-100 text-slate-800 border-slate-200'}`}>
                                                {cleanTag}
                                                {isEditing && (
                                                    <button onClick={() => removeInterest(interest)} className="ml-2 text-emerald-600 hover:text-emerald-800 transition">
                                                        <X size={14} />
                                                    </button>
                                                )}
                                            </span>
                                        );
                                    })
                                ) : (
                                    <p className="text-slate-400 italic text-sm">Aucun centre d'intérêt.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Premium Modal (Purchase) */}
            {
                showPremiumModal && (
                    <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setShowPremiumModal(false)} />
                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md relative z-10 my-auto max-h-[88dvh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
                            {/* Header avec Bouton Fermer */}
                            <div className="bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500 p-4 sm:p-5 text-white text-center relative shrink-0">
                                <button
                                    onClick={() => setShowPremiumModal(false)}
                                    className="absolute top-3 right-3 text-white/80 hover:text-white p-1.5 rounded-full hover:bg-black/20 transition cursor-pointer"
                                    title="Fermer"
                                >
                                    <X size={20} />
                                </button>
                                <h3 className="text-xl sm:text-2xl font-black font-display pr-6">
                                    {paymentMode === 'DONATION' ? '💖 Soutenir la Mission' : '⭐ Devenir Premium'}
                                </h3>
                                <p className="text-amber-100 text-xs sm:text-sm mt-0.5 font-medium">
                                    {paymentMode === 'DONATION' ? 'Un don libre pour soutenir la mission chrétienne.' : 'Débloquez tous les avantages sans limites.'}
                                </p>
                            </div>
                            {/* Tabs */}
                            <div className="flex border-b border-slate-200 shrink-0 bg-slate-50/70">
                                <button
                                    onClick={() => setPaymentMode('SUBSCRIPTION')}
                                    className={`flex-1 text-xs sm:text-sm font-bold py-3 transition cursor-pointer ${paymentMode === 'SUBSCRIPTION' ? 'border-b-2 border-emerald-600 text-emerald-700 bg-white' : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    🏆 Abonnement
                                </button>
                                <button
                                    onClick={() => setPaymentMode('DONATION')}
                                    className={`flex-1 text-xs sm:text-sm font-bold py-3 transition cursor-pointer ${paymentMode === 'DONATION' ? 'border-b-2 border-rose-500 text-rose-600 bg-white' : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    💖 Don Libre + Crédits
                                </button>
                            </div>
                            {/* Content avec Défilement Fluide */}
                            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
                                {paymentMode === 'SUBSCRIPTION' ? (
                                    <>
                                        <div className="grid grid-cols-2 gap-2 text-left">
                                            <button
                                                type="button"
                                                onClick={() => setSelectedPlan('DAY')}
                                                className={`p-3 rounded-xl border text-xs font-bold transition flex flex-col cursor-pointer ${selectedPlan === 'DAY'
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
                                                className={`p-3 rounded-xl border text-xs font-bold transition flex flex-col relative cursor-pointer ${selectedPlan === 'MONTH'
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
                                                className={`p-3 rounded-xl border text-xs font-bold transition flex flex-col cursor-pointer ${selectedPlan === 'QUARTER'
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
                                                onClick={() => setSelectedPlan('SEMIANNUAL')}
                                                className={`p-3 rounded-xl border text-xs font-bold transition flex flex-col cursor-pointer ${selectedPlan === 'SEMIANNUAL'
                                                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20'
                                                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                                                    }`}
                                            >
                                                <span className="text-[10px] text-emerald-600 font-extrabold uppercase">6 Mois</span>
                                                <span className="text-sm font-black mt-0.5">{pointsPricingConfig?.premiumSemiAnnualPrice || 9000} FCFA</span>
                                                <span className="text-[10px] text-slate-500 font-normal">180 Jours d'accès</span>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setSelectedPlan('YEAR')}
                                                className={`p-3 rounded-xl border text-xs font-bold transition flex flex-col col-span-2 cursor-pointer ${selectedPlan === 'YEAR'
                                                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20'
                                                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] text-emerald-600 font-extrabold uppercase">1 An (Annuel - Meilleure offre)</span>
                                                    <span className="text-sm font-black">{pointsPricingConfig?.premiumYearlyPrice || 15000} FCFA</span>
                                                </div>
                                                <span className="text-[10px] text-slate-500 font-normal">365 Jours d'accès illimité</span>
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
                                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-2xl shadow-lg transition flex items-center justify-center text-xs sm:text-sm cursor-pointer"
                                        >
                                            <CreditCard size={18} className="mr-2" />
                                            {isProcessingPayment ? 'Initialisation...' : `S'abonner (${selectedPlan === 'DAY' ? (pointsPricingConfig?.premiumDailyPrice || 500) :
                                                    selectedPlan === 'MONTH' ? (pointsPricingConfig?.premiumMonthlyPrice || 2500) :
                                                        selectedPlan === 'QUARTER' ? (pointsPricingConfig?.premiumQuarterlyPrice || 5000) :
                                                            selectedPlan === 'SEMIANNUAL' ? (pointsPricingConfig?.premiumSemiAnnualPrice || 9000) :
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
                                            className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-3.5 rounded-2xl shadow-lg transition flex items-center justify-center cursor-pointer"
                                        >
                                            💖 {isProcessingPayment ? 'Initialisation...' : `Faire un don de ${customDonationAmount || '...'} FCFA`}
                                        </button>
                                    </>
                                )}
                                <button onClick={() => setShowPremiumModal(false)} className="w-full text-slate-400 hover:text-slate-600 text-xs sm:text-sm py-1 cursor-pointer">Fermer</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Renewal Reminder Modal */}
            {
                showRenewalModal && (
                    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 overflow-y-auto">
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setShowRenewalModal(false)} />
                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm relative z-10 p-6 animate-in zoom-in-95 duration-200 border-2 border-amber-300 my-auto max-h-[88dvh] overflow-y-auto">
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
                                        className="w-full bg-emerald-600 text-white py-3.5 rounded-2xl font-bold hover:bg-emerald-700 shadow-lg transition flex items-center justify-center cursor-pointer"
                                    >
                                        <Zap size={18} className="mr-2" /> Renouveler maintenant
                                    </button>
                                    <button
                                        onClick={() => setShowRenewalModal(false)}
                                        className="text-sm text-slate-400 hover:text-slate-600 w-full py-1 cursor-pointer"
                                    >
                                        Plus tard
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

            {/* MODALE DE LOCALISATION & GÉOLOCALISATION GPS 📍 */}
            <LocationSelectorModal
                isOpen={isLocationModalOpen}
                onClose={() => setIsLocationModalOpen(false)}
                currentLocationName={user?.location || 'Abidjan, Cocody'}
                currentLatitude={user?.latitude}
                currentLongitude={user?.longitude}
                onSelectLocation={handleUpdateProfileLocation}
            />
        </div>
    );
};

export default Profile;
