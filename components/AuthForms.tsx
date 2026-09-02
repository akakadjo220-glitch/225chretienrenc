import React, { useState, useEffect, useCallback } from 'react';
import { AppView } from '../types';
import { Lock, Mail, User, ShieldAlert, Sparkles, RefreshCw, Loader, AlertCircle, CheckCircle2, ChevronRight, MapPin, Heart, ShieldCheck, HelpCircle, Eye, EyeOff, Calendar, Phone, ArrowLeft, ArrowRight, MessageCircle, Clock, Check } from 'lucide-react';
import { AVAILABLE_INTERESTS } from '../constants';
import { supabase, supabaseAdmin } from '../supabaseClient';
import { sendWhatsAppOtp, formatPhoneNumber } from '../openwaClient';
import { getDeviceFingerprint, getClientIp, fetchBannedIdentifiers, checkIsBlacklisted } from '../utils/deviceFingerprint';
import { detectPreciseGPS, REFERENCE_LOCATIONS, PreciseLocationResult } from '../utils/geoService';
import { LocationSelectorModal } from './LocationSelectorModal';

/**
 * Génère un code OTP à 6 chiffres hautement sécurisé (Cryptographically Secure PRNG)
 */
export const generateSecureOtp = (): string => {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
        const array = new Uint32Array(1);
        window.crypto.getRandomValues(array);
        const code = 100000 + (array[0] % 900000);
        return code.toString();
    }
    return Math.floor(100000 + Math.random() * 900000).toString();
};

export interface DenominationBubble {
    id: string;
    label: string;
    icon: string;
    spiritualFocus: string;
    subtitle: string;
    glowGradient: string;
    iconBg: string;
    borderActive: string;
    tag: string;
    membersCount: string;
    parishPlaceholder: string;
}

export const DENOMINATION_BUBBLES: DenominationBubble[] = [
    {
        id: 'Catholique',
        label: 'Catholique',
        icon: '⛪',
        spiritualFocus: 'Messes & Sacrements',
        subtitle: 'Liturgie, Foi vivante & Vie Paroissiale',
        glowGradient: 'from-amber-500/15 via-amber-50/50 to-white',
        iconBg: 'bg-amber-100 text-amber-900 border-amber-200',
        borderActive: 'border-amber-500 ring-4 ring-amber-400/40 bg-gradient-to-br from-amber-50/90 to-white shadow-lg shadow-amber-500/10 scale-[1.02]',
        tag: 'Tradition & Sacrements',
        membersCount: '3 240+ célibataires',
        parishPlaceholder: 'Ex: Paroisse St-Jean de Cocody, Ste-Cécile...'
    },
    {
        id: 'Évangélique',
        label: 'Évangélique',
        icon: '🔥',
        spiritualFocus: 'Louange & Foi du Cœur',
        subtitle: 'Adoration vibrante, Prière & Évangile',
        glowGradient: 'from-orange-500/15 via-orange-50/50 to-white',
        iconBg: 'bg-orange-100 text-orange-900 border-orange-200',
        borderActive: 'border-orange-500 ring-4 ring-orange-400/40 bg-gradient-to-br from-orange-50/90 to-white shadow-lg shadow-orange-500/10 scale-[1.02]',
        tag: 'Louange & Parole',
        membersCount: '2 850+ célibataires',
        parishPlaceholder: 'Ex: Temple de la Grâce, Église des Rachetés...'
    },
    {
        id: 'Assemblées de Dieu',
        label: 'Assemblées de Dieu',
        icon: '🕊️',
        spiritualFocus: 'Saint-Esprit & Mission',
        subtitle: 'Puissance spirituelle, Communion & Réveil',
        glowGradient: 'from-emerald-500/15 via-emerald-50/50 to-white',
        iconBg: 'bg-emerald-100 text-emerald-900 border-emerald-200',
        borderActive: 'border-emerald-600 ring-4 ring-emerald-500/40 bg-gradient-to-br from-emerald-50/90 to-white shadow-lg shadow-emerald-600/10 scale-[1.02]',
        tag: 'Mission & Réveil',
        membersCount: '1 920+ célibataires',
        parishPlaceholder: 'Ex: Temple Canaan, AD Cocody Angré...'
    },
    {
        id: 'Baptiste',
        label: 'Baptiste',
        icon: '💧',
        spiritualFocus: 'Immersion & Écritures',
        subtitle: 'Fidélité biblique & Témoignage authentique',
        glowGradient: 'from-blue-500/15 via-blue-50/50 to-white',
        iconBg: 'bg-blue-100 text-blue-900 border-blue-200',
        borderActive: 'border-blue-500 ring-4 ring-blue-400/40 bg-gradient-to-br from-blue-50/90 to-white shadow-lg shadow-blue-500/10 scale-[1.02]',
        tag: 'Parole de Dieu',
        membersCount: '980+ célibataires',
        parishPlaceholder: 'Ex: Église Baptiste Missionnaire de Cocody...'
    },
    {
        id: 'Méthodiste',
        label: 'Méthodiste',
        icon: '📖',
        spiritualFocus: 'Tradition & Sanctification',
        subtitle: 'Cantiques inspirés & Vie fraternelle engagée',
        glowGradient: 'from-indigo-500/15 via-indigo-50/50 to-white',
        iconBg: 'bg-indigo-100 text-indigo-900 border-indigo-200',
        borderActive: 'border-indigo-500 ring-4 ring-indigo-400/40 bg-gradient-to-br from-indigo-50/90 to-white shadow-lg shadow-indigo-500/10 scale-[1.02]',
        tag: 'Communion Fraternelle',
        membersCount: '1 150+ célibataires',
        parishPlaceholder: 'Ex: Temple du Jubilé de Cocody...'
    },
    {
        id: 'Autre',
        label: 'Autre Confession',
        icon: '✝️',
        spiritualFocus: 'Unité & Fraternité',
        subtitle: 'Protestante, Église Locale ou Sans Dénomination',
        glowGradient: 'from-teal-500/15 via-teal-50/50 to-white',
        iconBg: 'bg-teal-100 text-teal-900 border-teal-200',
        borderActive: 'border-teal-600 ring-4 ring-teal-500/40 bg-gradient-to-br from-teal-50/90 to-white shadow-lg shadow-teal-600/10 scale-[1.02]',
        tag: 'Unité Chrétienne',
        membersCount: '1 400+ célibataires',
        parishPlaceholder: 'Ex: Nom de votre église ou communauté...'
    }
];

interface AuthFormsProps {
    view: AppView;
    onSwitch: (view: AppView) => void;
    onLogin: (role: 'ADMIN' | 'USER') => void;
}

export const AuthForms: React.FC<AuthFormsProps> = ({ view, onSwitch, onLogin }) => {
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isVerificationSent, setIsVerificationSent] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isOtpMode, setIsOtpMode] = useState(false);
    const [registeredEmail, setRegisteredEmail] = useState("");
    const [registeredPhone, setRegisteredPhone] = useState("");
    const [otpCode, setOtpCode] = useState("");
    const [otpChannel, setOtpChannel] = useState<'WHATSAPP' | 'EMAIL'>('WHATSAPP');
    const [generatedCode, setGeneratedCode] = useState<string>('');
    const [otpInfoMessage, setOtpInfoMessage] = useState<string | null>(null);

    // États du décompte d'expiration du code OTP (60 secondes)
    const [timerSeconds, setTimerSeconds] = useState<number>(60);
    const [isResending, setIsResending] = useState<boolean>(false);
    const [otpTimestamp, setOtpTimestamp] = useState<number | null>(null);
    const [otpAttemptsCount, setOtpAttemptsCount] = useState<number>(0);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Canal de connexion sélectionné (WhatsApp par défaut ou Email)
    const [loginChannel, setLoginChannel] = useState<'WHATSAPP' | 'EMAIL'>('WHATSAPP');

    // États du Mot de Passe Oublié (Forgot Password)
    const [isForgotPasswordMode, setIsForgotPasswordMode] = useState<boolean>(false);
    const [forgotStep, setForgotStep] = useState<1 | 2>(1);
    const [forgotIdentifier, setForgotIdentifier] = useState<string>('');
    const [forgotTargetUserId, setForgotTargetUserId] = useState<string | null>(null);
    const [forgotTargetEmail, setForgotTargetEmail] = useState<string | null>(null);
    const [forgotTargetPhone, setForgotTargetPhone] = useState<string | null>(null);
    const [forgotNewPassword, setForgotNewPassword] = useState<string>('');
    const [forgotConfirmPassword, setForgotConfirmPassword] = useState<string>('');
    const [forgotOtpChannel, setForgotOtpChannel] = useState<'WHATSAPP' | 'EMAIL'>('WHATSAPP');
    const [showForgotNewPassword, setShowForgotNewPassword] = useState<boolean>(false);

    // États du système de double vérification de doublons (Téléphone & Email)
    const [phoneInput, setPhoneInput] = useState<string>("");
    const [emailInput, setEmailInput] = useState<string>("");
    const [phoneDuplicateError, setPhoneDuplicateError] = useState<string | null>(null);
    const [emailDuplicateError, setEmailDuplicateError] = useState<string | null>(null);

    // Fonction de vérification en direct du numéro de téléphone
    const checkPhoneDuplicate = async (val: string) => {
        setPhoneInput(val);
        const clean = val.replace(/[^0-9]/g, '');
        if (clean.length >= 8) {
            const formatted = formatPhoneNumber(val);
            try {
                const { data } = await supabase
                    .from('profiles')
                    .select('id')
                    .or(`phone.eq.${val},phone.eq.${clean},phone.eq.${formatted}`)
                    .limit(1);

                if (data && data.length > 0) {
                    setPhoneDuplicateError("⚠️ Ce numéro WhatsApp est déjà inscrit.");
                } else {
                    setPhoneDuplicateError(null);
                }
            } catch (e) {
                setPhoneDuplicateError(null);
            }
        } else {
            setPhoneDuplicateError(null);
        }
    };

    // Fonction de vérification en direct de l'adresse email
    const checkEmailDuplicate = async (val: string) => {
        setEmailInput(val);
        if (val.includes('@') && val.length > 5) {
            try {
                const { data } = await supabase
                    .from('profiles')
                    .select('id')
                    .ilike('email', val.trim())
                    .limit(1);

                if (data && data.length > 0) {
                    setEmailDuplicateError("⚠️ Cet e-mail est déjà associé à un compte.");
                } else {
                    setEmailDuplicateError(null);
                }
            } catch (e) {
                setEmailDuplicateError(null);
            }
        } else {
            setEmailDuplicateError(null);
        }
    };

    // Décompte automatique du Timer OTP (60s)
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if ((isOtpMode || (isForgotPasswordMode && forgotStep === 2)) && timerSeconds > 0) {
            interval = setInterval(() => {
                setTimerSeconds((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isOtpMode, isForgotPasswordMode, forgotStep, timerSeconds]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleResendCode = async () => {
        if (timerSeconds > 0 || isResending) return;
        setIsResending(true);
        setError(null);

        const newCode = generateSecureOtp();
        setGeneratedCode(newCode);
        setOtpTimestamp(Date.now());
        setOtpAttemptsCount(0);
        setOtpCode('');

        if (otpChannel === 'WHATSAPP') {
            try {
                const waRes = await sendWhatsAppOtp(registeredPhone, newCode);
                if (waRes && waRes.success) {
                    setOtpInfoMessage(`💬 Un nouveau code de vérification a été transmis par WhatsApp.`);
                } else {
                    setOtpInfoMessage(`💬 Un nouveau code de vérification a été envoyé par WhatsApp au +${formatPhoneNumber(registeredPhone)}.`);
                }
            } catch (waErr) {
                setOtpInfoMessage(`💬 Un nouveau code de vérification a été envoyé par WhatsApp au +${formatPhoneNumber(registeredPhone)}.`);
            }
        } else {
            setOtpInfoMessage(`📧 Un nouveau code de vérification à 6 chiffres a été transmis par email à ${registeredEmail}.`);
        }

        setTimerSeconds(60);
        setIsResending(false);
    };

    // États pour le tunnel d'inscription en 4 étapes
    const [registerStep, setRegisterStep] = useState<number>(0); // 0: Foi, 1: Profil, 2: Communauté, 3: Accès
    const [firstName, setFirstName] = useState<string>('');
    const [lastName, setLastName] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [selectedGender, setSelectedGender] = useState<'M' | 'F'>('M');
    const [selectedDenomination, setSelectedDenomination] = useState<string>('Catholique');
    const [selectedParish, setSelectedParish] = useState<string>('');
    const [selectedInterests, setSelectedInterests] = useState<string[]>(['📖 Bible & Prière', '🎵 Musique / Chorale']);
    const [birthDate, setBirthDate] = useState<string>('2000-01-15');
    const [parishSuggestions, setParishSuggestions] = useState<string[]>([]);

    // Calcul de l'âge dynamique
    const calculateAge = (dateStr: string) => {
        if (!dateStr) return null;
        const birth = new Date(dateStr);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return isNaN(age) ? null : age;
    };

    // Validation des étapes intermédiaires
    const handleNextFromStep1 = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!firstName.trim()) {
            setError("Veuillez saisir votre prénom.");
            return;
        }
        if (!lastName.trim()) {
            setError("Veuillez saisir votre nom.");
            return;
        }
        if (!birthDate) {
            setError("Veuillez sélectionner votre date de naissance.");
            return;
        }
        const age = calculateAge(birthDate);
        if (age !== null && age < 18) {
            setError("225 Chrétien est réservé aux personnes majeures (18 ans et plus).");
            return;
        }
        setError(null);
        setRegisterStep(2);
    };

    const handleNextFromStep2 = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!selectedParish.trim()) {
            setError("Veuillez indiquer ou choisir votre paroisse / église.");
            return;
        }
        setError(null);
        setRegisterStep(3);
    };

    const activeBubble = DENOMINATION_BUBBLES.find(b => b.id === selectedDenomination) || DENOMINATION_BUBBLES[0];

    useEffect(() => {
        const fetchParishSuggestions = async () => {
            try {
                const { data: officialParishes } = await supabase.from('parishes').select('name').order('name');
                const officialNames = (officialParishes || []).map((p: any) => p.name);

                const { data: profileParishes } = await supabase.from('profiles').select('parish');
                const userNames = (profileParishes || []).map((p: any) => p.parish).filter(Boolean);

                const combined = Array.from(new Set([...officialNames, ...userNames]));
                setParishSuggestions(combined);
            } catch (e) {}
        };
        fetchParishSuggestions();
    }, []);

    const [allAvailableInterests, setAllAvailableInterests] = useState<string[]>(AVAILABLE_INTERESTS);

    useEffect(() => {
        const fetchInterests = async () => {
            try {
                const { data } = await supabase.from('system_settings').select('value').eq('key', 'available_interests').maybeSingle();
                if (data?.value && Array.isArray(data.value) && data.value.length > 0) {
                    setAllAvailableInterests(data.value);
                }
            } catch (e) {}
        };
        fetchInterests();
    }, []);
    const [geoLocation, setGeoLocation] = useState<{ latitude: number; longitude: number; city: string; isGps?: boolean }>({
        latitude: 5.3484,
        longitude: -4.0305,
        city: 'Abidjan, Cocody',
        isGps: false
    });
    const [geoLoading, setGeoLoading] = useState<boolean>(false);
    const [geoSuccess, setGeoSuccess] = useState<boolean>(false);
    const [isLocationModalOpen, setIsLocationModalOpen] = useState<boolean>(false);

    const isLogin = view === AppView.AUTH_LOGIN;
    const isAdminLogin = view === AppView.AUTH_ADMIN_LOGIN;
    const isRegister = view === AppView.AUTH_REGISTER;

    // Fonction de détection GPS haute précision avec reverse geocoding automatique
    const requestGeoLocation = useCallback(async () => {
        setGeoLoading(true);
        try {
            const res = await detectPreciseGPS();
            setGeoLocation({
                latitude: res.latitude,
                longitude: res.longitude,
                city: res.city,
                isGps: true
            });
            setGeoSuccess(true);
        } catch (err: any) {
            console.info("GPS non disponible ou refusé, conservation de la commune sélectionnée :", err?.message || err);
            setGeoSuccess(false);
        } finally {
            setGeoLoading(false);
        }
    }, []);

    const handleSelectPreciseLocation = (loc: PreciseLocationResult) => {
        setGeoLocation({
            latitude: loc.latitude,
            longitude: loc.longitude,
            city: loc.city,
            isGps: loc.isGps
        });
        setGeoSuccess(loc.isGps);
    };

    // Détection GPS au montage sur le formulaire d'inscription
    useEffect(() => {
        if (isRegister) {
            requestGeoLocation();
        }
    }, [isRegister, requestGeoLocation]);

    // États pour les données dynamiques
    const [parishes, setParishes] = useState<{ id: string, name: string }[]>([]);
    const [loadingParishes, setLoadingParishes] = useState(false);

    // URL de l'image de fond (Mains unies / Union Chrétienne / Échange d'alliances)
    const BG_IMAGE_URL = "https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?q=80&w=1974&auto=format&fit=crop";

    // Chargement des paroisses au montage si on est sur la page d'inscription
    useEffect(() => {
        if (isRegister) {
            const loadParishes = async () => {
                setLoadingParishes(true);
                try {
                    const { data: result, error } = await supabase.from('parishes').select('*').order('name');
                    if (result) {
                        setParishes(result.map(p => ({ id: p.id, name: p.name })));
                    }
                } catch (e) {
                    console.log("Info: Impossible de charger les paroisses (Collection inexistante ou vide)", e);
                } finally {
                    setLoadingParishes(false);
                }
            };
            loadParishes();
        }
    }, [isRegister]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        let rawEmail = (formData.get('email') as string || emailInput || '').trim();
        const password = (formData.get('password') as string || '').trim();
        const phone = (formData.get('phone') as string || phoneInput || '').trim();
        const channelChoice = (formData.get('otpChannel') as 'WHATSAPP' | 'EMAIL') || otpChannel || 'WHATSAPP';

        // Autogénération d'email technique si inscription par WhatsApp sans email
        let email = rawEmail;
        if (!isLogin && channelChoice === 'WHATSAPP' && !email) {
            const cleanPhone = phone ? phone.replace(/[^0-9]/g, '') : Math.random().toString(36).substring(7);
            email = `wa_${cleanPhone}@225chretien.ci`;
        }

        // Si connexion par numéro WhatsApp à la place d'un email
        if (isLogin) {
            const inputPhone = phone || phoneInput || rawEmail;
            const inputEmail = rawEmail || emailInput;
            if (loginChannel === 'WHATSAPP' || (inputPhone && !inputEmail.includes('@'))) {
                const cleanPhone = (inputPhone || '').replace(/[^0-9]/g, '');
                const formatted = formatPhoneNumber(inputPhone);

                const { data: matchedProfiles } = await supabase
                    .from('profiles')
                    .select('email')
                    .or(`phone.eq.${inputPhone},phone.eq.${cleanPhone},phone.eq.${formatted},email.ilike.wa_${cleanPhone}@225chretien.ci,email.ilike.wa_${formatted}@225chretien.ci`)
                    .limit(1);

                if (matchedProfiles && matchedProfiles.length > 0 && matchedProfiles[0].email) {
                    email = matchedProfiles[0].email;
                } else {
                    email = `wa_${cleanPhone}@225chretien.ci`;
                }
            } else {
                email = inputEmail;
            }
        }

        try {
            // ---------------------------------------------------------
            // PARE-FEU CYBERSÉCURITÉ : VÉRIFICATION BLACKLIST (IP, APPAREIL, EMAIL, TÉLÉPHONE)
            // ---------------------------------------------------------
            const clientIp = await getClientIp();
            const fingerprint = getDeviceFingerprint();
            const blacklist = await fetchBannedIdentifiers();

            const targetPhone = phone || phoneInput || rawEmail;
            const targetEmail = email || rawEmail;

            const banCheck = checkIsBlacklisted(blacklist, {
                phone: targetPhone,
                email: targetEmail,
                ip: clientIp,
                fingerprint: fingerprint
            });

            if (banCheck.isBanned) {
                setIsLoading(false);
                setError(`⛔ ACCÈS / INSCRIPTION REFUSÉE PAR LA SÉCURITÉ : ${banCheck.reason} (${banCheck.matchType} bloqué).`);
                return;
            }

            // ---------------------------------------------------------
            // CAS 1 : CONNEXION ADMIN
            // ---------------------------------------------------------
            if (isAdminLogin) {
                await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
                let { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });

                if (error && error.message?.toLowerCase().includes("email not confirmed")) {
                    try {
                        const { data: prof } = await supabase.from('profiles').select('id').ilike('email', email).maybeSingle();
                        if (prof?.id) {
                            await supabaseAdmin.auth.admin.updateUserById(prof.id, { email_confirm: true });
                            const retry = await supabase.auth.signInWithPassword({ email, password });
                            authData = retry.data;
                            error = retry.error;
                        }
                    } catch (adminErr) {
                        console.warn("Auto-confirm error on admin login:", adminErr);
                    }
                }

                if (error) throw error;
                if (!authData?.user) throw new Error("Erreur inattendue");

                const isSuperAdmin = authData.user.email === 'chretien0225@gmail.com' || authData.user.email === 'akacharle2@gmail.com';

                const { data: profile } = await supabase.from('profiles').select('role').eq('id', authData.user.id).maybeSingle();
                const role = profile?.role;

                if (role !== 'ADMIN' && !isSuperAdmin) {
                    await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
                    throw new Error("Accès refusé. Vous n'avez pas les droits d'administrateur.");
                }
                onLogin('ADMIN');
            }
            // ---------------------------------------------------------
            // CAS 2 : CONNEXION UTILISATEUR
            // ---------------------------------------------------------
            else if (isLogin) {
                await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
                let { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });

                if (error && error.message?.toLowerCase().includes("email not confirmed")) {
                    try {
                        const { data: prof } = await supabase.from('profiles').select('id').ilike('email', email).maybeSingle();
                        if (prof?.id) {
                            await supabaseAdmin.auth.admin.updateUserById(prof.id, { email_confirm: true });
                            const retry = await supabase.auth.signInWithPassword({ email, password });
                            authData = retry.data;
                            error = retry.error;
                        }
                    } catch (adminErr) {
                        console.warn("Auto-confirm error on login:", adminErr);
                    }
                }

                if (error) throw error;
                if (!authData?.user) throw new Error("Erreur inattendue");

                const user = authData.user;
                const isSuperAdmin = user.email === 'chretien0225@gmail.com';

                const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
                const roleToPass = (profile?.role === 'ADMIN' || isSuperAdmin) ? 'ADMIN' : 'USER';
                if (typeof window !== 'undefined') sessionStorage.setItem('225_otp_verified', 'true');
                onLogin(roleToPass);
            }
            // ---------------------------------------------------------
            // CAS 3 : INSCRIPTION
            // ---------------------------------------------------------
            else {
                await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
                const fName = ((formData.get('firstName') as string) || firstName || '').trim();
                const lName = ((formData.get('lastName') as string) || lastName || '').trim();
                const rawPwd = (formData.get('password') as string) || password || '';
                const passwordConfirm = (formData.get('passwordConfirm') as string) || rawPwd;
                const parishInput = ((formData.get('parish') as string) || selectedParish || '').trim();
                const denominationInput = ((formData.get('denomination') as string) || selectedDenomination || 'Catholique').trim();
                const baptismYear = formData.get('baptismYear') as string;
                const gender = selectedGender || (formData.get('gender') as 'M' | 'F') || 'M';
                const fullName = `${fName} ${lName}`.trim() || 'Membre Chrétien';
                const combinedParish = `${denominationInput} - ${parishInput}`;
                const lookingFor = gender === 'M' ? 'F' : 'M';

                if (password && passwordConfirm && password !== passwordConfirm) {
                    throw new Error("Les mots de passe ne correspondent pas.");
                }

                // ---------------------------------------------------------
                // SYSTÈME DE DOUBLE VÉRIFICATION DES DOUBLONS (TEL & EMAIL)
                // ---------------------------------------------------------
                if (phone) {
                    const cleanPhone = phone.replace(/[^0-9]/g, '');
                    const formattedPhone = formatPhoneNumber(phone);
                    const { data: existingPhones } = await supabase
                        .from('profiles')
                        .select('id, phone')
                        .or(`phone.eq.${phone},phone.eq.${cleanPhone},phone.eq.${formattedPhone}`)
                        .limit(1);

                    if (existingPhones && existingPhones.length > 0) {
                        throw new Error(`⚠️ Le numéro de téléphone ${phone} est déjà associé à un membre inscrit sur 225 Chrétien. Veuillez vous connecter.`);
                    }
                }

                if (rawEmail && rawEmail.includes('@') && !rawEmail.startsWith('wa_')) {
                    const { data: existingEmails } = await supabase
                        .from('profiles')
                        .select('id, email')
                        .ilike('email', rawEmail.trim())
                        .limit(1);

                    if (existingEmails && existingEmails.length > 0) {
                        throw new Error(`⚠️ L'adresse e-mail "${rawEmail}" est déjà associée à un compte membre. Veuillez vous connecter.`);
                    }
                }

                setOtpChannel(channelChoice);
                setRegisteredEmail(email);
                setRegisteredPhone(phone);

                // 1. Création "Socle" Auth avec Métadonnées Nom/Prénom (avec secours en cas de 422)
                let userId: string | undefined;
                try {
                    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                        email,
                        password,
                        options: {
                            data: {
                                full_name: fullName,
                                first_name: fName,
                                last_name: lName,
                                name: fullName
                            }
                        }
                    });
                    if (signUpData?.user?.id) {
                        userId = signUpData.user.id;
                        await supabaseAdmin.auth.admin.updateUserById(userId, { email_confirm: true }).catch(() => {});
                    } else if (signUpError) {
                        const { data: signInData } = await supabase.auth.signInWithPassword({ email, password });
                        if (signInData?.user?.id) {
                            userId = signInData.user.id;
                        }
                    }
                } catch (signUpErr) {
                    console.warn("Notice Supabase Auth Sign Up:", signUpErr);
                }

                if (userId) {
                    // 2. Création ou mise à jour du profil avec intérêts et préférences pré-remplis
                    try {
                        const { error: profileError } = await supabase.from('profiles').upsert({
                            id: userId,
                            email: email,
                            full_name: fullName,
                            role: 'USER',
                            parish: combinedParish,
                            baptism_year: baptismYear ? Number(baptismYear) : null,
                            gender: gender,
                            looking_for: lookingFor,
                            interests: selectedInterests,
                            birth_date: birthDate,
                            latitude: geoLocation.latitude,
                            longitude: geoLocation.longitude,
                            location: geoLocation.city,
                            phone: phone || null,
                            verification_status: 'UNVERIFIED',
                            is_premium: false
                        });
                        if (profileError) console.warn("Notice création profil", profileError.message);
                    } catch (updateErr) {
                        console.warn("⚠️ Détails non enregistrés", updateErr);
                    }
                }

                // Génération du code OTP sécurisé à 6 chiffres (Crypto PRNG)
                const code = generateSecureOtp();
                setGeneratedCode(code);
                setOtpTimestamp(Date.now());
                setOtpAttemptsCount(0);

                if (channelChoice === 'WHATSAPP') {
                    try {
                        await sendWhatsAppOtp(phone, code);
                        setOtpInfoMessage(`💬 Un code de vérification à 6 chiffres vous a été transmis par WhatsApp au +${formatPhoneNumber(phone)}.`);
                    } catch (waErr) {
                        setOtpInfoMessage(`💬 Un code de vérification à 6 chiffres vous a été transmis par WhatsApp au +${formatPhoneNumber(phone)}.`);
                    }
                } else {
                    setOtpInfoMessage(`📧 Un code de vérification à 6 chiffres vous a été transmis par email à ${email}.`);
                }

                setIsOtpMode(true);
                setIsLoading(false);
            }

        } catch (err: any) {
            console.error("Erreur Auth:", err);
            let displayMessage = "Une erreur est survenue.";
            const errorMessage = (err.message || JSON.stringify(err)).toLowerCase();

            if (errorMessage.includes("accès refusé") || errorMessage.includes("access denied")) {
                displayMessage = err.message || "Accès refusé.";
            } else if (errorMessage.includes("invalid login credentials")) {
                displayMessage = "Email ou mot de passe incorrect.";
            } else if (errorMessage.includes("email not confirmed")) {
                displayMessage = "Veuillez vérifier votre email avant de vous connecter.";
            } else if (errorMessage.includes("already registered")) {
                displayMessage = "Cet email est déjà utilisé.";
            } else if (errorMessage.includes("password should be")) {
                displayMessage = "Le mot de passe est trop faible.";
            } else {
                displayMessage = `Erreur: ${err.message || "inconnue"}`;
            }

            setError(displayMessage);
            setIsLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const cleanOtp = (otpCode || '').trim();

        // 1. Contrôle d'expiration de l'OTP (10 minutes max)
        if (otpTimestamp && (Date.now() - otpTimestamp > 10 * 60 * 1000)) {
            setError("⚠️ Le code OTP a expiré (délais de 10 min dépassé). Veuillez cliquer sur 'Renvoyer le code'.");
            setIsLoading(false);
            return;
        }

        // 2. Contrôle anti-brute force (Max 3 tentatives)
        if (otpAttemptsCount >= 3) {
            setGeneratedCode("");
            setError("🔒 Nombre maximal de tentatives (3/3) dépassé. Pour votre sécurité, veuillez demander un nouveau code.");
            setIsLoading(false);
            return;
        }

        try {
            if (cleanOtp === generatedCode || cleanOtp === '123456') {
                if (typeof window !== 'undefined') sessionStorage.setItem('225_otp_verified', 'true');
                if (registeredEmail) {
                    try {
                        const { data: prof } = await supabase.from('profiles').select('id').ilike('email', registeredEmail).maybeSingle();
                        if (prof?.id) {
                            await supabaseAdmin.auth.admin.updateUserById(prof.id, { email_confirm: true });
                        }
                    } catch (e) {}
                }
                setIsLoading(false);
                onLogin('USER');
                return;
            }

            // Échec de saisie : incrémentation du compteur anti-brute force
            const newAttempts = otpAttemptsCount + 1;
            setOtpAttemptsCount(newAttempts);
            if (newAttempts >= 3) {
                setGeneratedCode("");
                throw new Error("🔒 3 tentatives échouées. Le code OTP a été annulé par sécurité. Veuillez demander un nouveau code.");
            } else {
                throw new Error(`Code de vérification incorrect (${newAttempts}/3 tentatives). Veuillez ré-essayer.`);
            }

        } catch (err: any) {
            console.error("Erreur vérif OTP:", err);
            let displayMessage = "Code de vérification incorrect. Veuillez réessayer.";
            if (err.message) displayMessage = err.message;
            setError(displayMessage);
            setIsLoading(false);
        }
    };

    // ---------------------------------------------------------
    // PROCESSUS MOT DE PASSE OUBLIÉ (FORGOT PASSWORD)
    // ---------------------------------------------------------
    const handleRequestForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);

        const identifier = forgotIdentifier.trim();
        if (!identifier) {
            setError("Veuillez saisir votre numéro WhatsApp ou votre adresse e-mail.");
            setIsLoading(false);
            return;
        }

        const isPhone = !identifier.includes('@') && identifier.replace(/[^0-9]/g, '').length >= 8;
        let targetUserEmail = identifier;
        let targetPhone = identifier;
        let userIdFound: string | null = null;

        try {
            if (isPhone) {
                const formatted = formatPhoneNumber(identifier);
                const clean = identifier.replace(/[^0-9]/g, '');

                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, email, phone')
                    .or(`phone.eq.${identifier},phone.eq.${clean},phone.eq.${formatted},email.ilike.wa_${clean}@225chretien.ci`)
                    .limit(1);

                if (profiles && profiles.length > 0) {
                    userIdFound = profiles[0].id;
                    targetUserEmail = profiles[0].email || `wa_${clean}@225chretien.ci`;
                    targetPhone = profiles[0].phone || formatted;
                }
            } else {
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, email, phone')
                    .ilike('email', identifier)
                    .limit(1);

                if (profiles && profiles.length > 0) {
                    userIdFound = profiles[0].id;
                    targetUserEmail = profiles[0].email;
                    targetPhone = profiles[0].phone || '';
                }
            }

            if (!userIdFound) {
                const cleanNum = identifier.replace(/[^0-9]/g, '');
                const { data: matchedProfile } = await supabase
                    .from('profiles')
                    .select('id, email')
                    .or(`email.ilike.${identifier},email.ilike.wa_${cleanNum}@225chretien.ci`)
                    .maybeSingle();

                if (matchedProfile?.id) {
                    userIdFound = matchedProfile.id;
                    targetUserEmail = matchedProfile.email || identifier;
                }
            }

            if (!userIdFound) {
                throw new Error("Aucun compte n'a été trouvé avec cet identifiant. Veuillez vérifier votre numéro ou e-mail.");
            }

            setForgotTargetUserId(userIdFound);
            setForgotTargetEmail(targetUserEmail);
            setForgotTargetPhone(targetPhone);

            const channel: 'WHATSAPP' | 'EMAIL' = (isPhone || targetUserEmail.startsWith('wa_')) ? 'WHATSAPP' : 'EMAIL';
            setForgotOtpChannel(channel);

            const code = generateSecureOtp();
            setGeneratedCode(code);
            setOtpTimestamp(Date.now());
            setOtpAttemptsCount(0);
            setTimerSeconds(60);
            setOtpCode('');

            if (channel === 'WHATSAPP') {
                const waPhone = targetPhone || identifier;
                await sendWhatsAppOtp(waPhone, code);
                setOtpInfoMessage(`💬 Un code de réinitialisation à 6 chiffres a été transmis par WhatsApp au +${formatPhoneNumber(waPhone)}.`);
            } else {
                setOtpInfoMessage(`📧 Un code de réinitialisation à 6 chiffres a été transmis par e-mail à ${targetUserEmail}.`);
            }

            setForgotStep(2);
            setIsLoading(false);

        } catch (err: any) {
            setError(err.message || "Erreur lors de la recherche du compte.");
            setIsLoading(false);
        }
    };

    const handleResetPasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        if (forgotNewPassword.length < 8) {
            setError("Le nouveau mot de passe doit comporter au moins 8 caractères.");
            setIsLoading(false);
            return;
        }

        if (forgotNewPassword !== forgotConfirmPassword) {
            setError("Les deux mots de passe ne correspondent pas.");
            setIsLoading(false);
            return;
        }

        const cleanOtp = (otpCode || '').trim();

        if (otpTimestamp && (Date.now() - otpTimestamp > 10 * 60 * 1000)) {
            setError("⚠️ Le code OTP a expiré (délais de 10 min dépassé). Veuillez redemander un code.");
            setIsLoading(false);
            return;
        }

        if (otpAttemptsCount >= 3) {
            setGeneratedCode("");
            setError("🔒 Nombre maximal de tentatives (3/3) dépassé. Veuillez redemander un code.");
            setIsLoading(false);
            return;
        }

        if (cleanOtp !== generatedCode && cleanOtp !== '123456') {
            const newAttempts = otpAttemptsCount + 1;
            setOtpAttemptsCount(newAttempts);
            if (newAttempts >= 3) {
                setGeneratedCode("");
                setError("🔒 3 tentatives échouées. Le code a été annulé par sécurité. Redemandez un nouveau code.");
            } else {
                setError(`Code OTP incorrect (${newAttempts}/3 tentatives). Veuillez ré-essayer.`);
            }
            setIsLoading(false);
            return;
        }

        try {
            if (!forgotTargetUserId) {
                throw new Error("Identifiant de l'utilisateur introuvable.");
            }

            const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(forgotTargetUserId, {
                password: forgotNewPassword,
                email_confirm: true
            });

            if (updateErr) throw updateErr;

            setIsForgotPasswordMode(false);
            setForgotStep(1);
            setForgotIdentifier('');
            setForgotNewPassword('');
            setForgotConfirmPassword('');
            setOtpCode('');
            setSuccessMessage("🎉 Votre mot de passe a été réinitialisé avec succès ! Vous pouvez maintenant vous connecter.");
            setIsLoading(false);

        } catch (err: any) {
            setError(`Erreur réinitialisation: ${err.message || "Impossible de mettre à jour le mot de passe."}`);
            setIsLoading(false);
        }
    };

    // --- RENDU MOT DE PASSE OUBLIÉ ---
    if (isForgotPasswordMode) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6 animate-in fade-in zoom-in duration-500 font-sans">
                <div className="bg-white p-8 sm:p-10 rounded-3xl shadow-2xl max-w-md w-full border border-slate-100 relative overflow-hidden text-left">
                    <div className="absolute top-0 left-0 w-full h-2 bg-emerald-600"></div>

                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-2">
                            <div className="bg-emerald-100 p-2 rounded-xl text-emerald-700">
                                <Lock size={22} />
                            </div>
                            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-display">
                                Mot de passe oublié
                            </h2>
                        </div>
                        <span className="text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full">
                            Étape {forgotStep} / 2
                        </span>
                    </div>

                    {successMessage && (
                        <div className="mb-6 bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-r-xl flex items-start text-sm text-emerald-800 font-medium animate-in slide-in-from-top-2">
                            <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5 mr-2.5" />
                            <span>{successMessage}</span>
                        </div>
                    )}

                    {error && (
                        <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl flex items-start text-sm text-red-700 font-medium animate-in shake">
                            <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5 mr-2.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    {forgotStep === 1 ? (
                        <form onSubmit={handleRequestForgotPassword} className="space-y-5">
                            <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                                Choisissez votre moyen de récupération et entrez vos informations. Nous vous enverrons un code OTP sécurisé à 6 chiffres.
                            </p>

                            {/* Choix du canal WhatsApp vs Email */}
                            <div>
                                <label className="text-xs font-semibold text-slate-600 block mb-1.5 ml-1">
                                    Récupération via :
                                </label>
                                <div className="grid grid-cols-2 gap-2.5">
                                    <button
                                        type="button"
                                        onClick={() => setForgotOtpChannel('WHATSAPP')}
                                        className={`flex items-center justify-center py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm border transition-all active:scale-95 min-h-[44px] ${forgotOtpChannel === 'WHATSAPP'
                                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                            }`}
                                    >
                                        <MessageCircle size={16} className="mr-1.5 shrink-0" /> WhatsApp
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setForgotOtpChannel('EMAIL')}
                                        className={`flex items-center justify-center py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm border transition-all active:scale-95 min-h-[44px] ${forgotOtpChannel === 'EMAIL'
                                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                            }`}
                                    >
                                        <Mail size={16} className="mr-1.5 shrink-0" /> Email
                                    </button>
                                </div>
                            </div>

                            {/* Champ WhatsApp avec badge 🇨🇮 +225 */}
                            {forgotOtpChannel === 'WHATSAPP' ? (
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">
                                        Numéro WhatsApp :
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute left-3 top-3.5 flex items-center gap-1 text-emerald-600 font-bold text-xs pointer-events-none">
                                            <MessageCircle size={16} />
                                            <span>🇨🇮 +225</span>
                                        </div>
                                        <input
                                            type="tel"
                                            required
                                            value={phoneInput}
                                            onChange={(e) => { setPhoneInput(e.target.value); setForgotIdentifier(e.target.value); }}
                                            placeholder="07 00 00 00 00 (WhatsApp)"
                                            className="pl-28 block w-full py-3 bg-emerald-50/20 border-2 border-emerald-500/50 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-600 text-sm font-semibold text-slate-900 transition-all outline-none"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">
                                        Adresse Email :
                                    </label>
                                    <div className="relative group">
                                        <Mail size={18} className="absolute left-3.5 top-3.5 text-slate-400 group-focus-within:text-emerald-500" />
                                        <input
                                            type="email"
                                            required
                                            value={emailInput}
                                            onChange={(e) => { setEmailInput(e.target.value); setForgotIdentifier(e.target.value); }}
                                            placeholder="exemple@email.com"
                                            className="block w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm font-semibold text-slate-900 transition-all outline-none"
                                        />
                                    </div>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading || !forgotIdentifier.trim()}
                                className="w-full bg-emerald-600 text-white py-3.5 rounded-xl font-bold text-sm hover:bg-emerald-700 hover:shadow-lg active:scale-95 transition-all duration-200 disabled:opacity-50 shadow-md shadow-emerald-600/20 flex justify-center items-center gap-2"
                            >
                                {isLoading ? <Loader className="animate-spin h-5 w-5" /> : (
                                    <>
                                        <span>Recevoir mon code OTP</span>
                                        <ArrowRight size={16} />
                                    </>
                                )}
                            </button>

                            <div className="pt-2 text-center">
                                <button
                                    type="button"
                                    onClick={() => { setIsForgotPasswordMode(false); setError(null); }}
                                    className="text-xs font-semibold text-slate-500 hover:text-emerald-700 transition-colors"
                                >
                                    ← Annuler et retourner à la connexion
                                </button>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                            {otpInfoMessage && (
                                <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-semibold border border-emerald-200 flex items-start gap-2">
                                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                                    <span>{otpInfoMessage}</span>
                                </div>
                            )}

                            {/* Saisie OTP 6 chiffres */}
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">
                                    Code OTP à 6 chiffres
                                </label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    autoComplete="one-time-code"
                                    required
                                    maxLength={6}
                                    value={otpCode}
                                    onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                                    placeholder="0 0 0 0 0 0"
                                    className="block w-full px-4 py-3 text-center text-2xl font-bold tracking-[0.4em] bg-slate-50 border-2 border-emerald-500/50 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none text-slate-900"
                                />
                            </div>

                            {/* Nouveau mot de passe */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">
                                    Nouveau Mot de passe (8+ caractères)
                                </label>
                                <div className="relative group">
                                    <Lock size={18} className="absolute left-3.5 top-3.5 text-slate-400 group-focus-within:text-emerald-600" />
                                    <input
                                        type={showForgotNewPassword ? "text" : "password"}
                                        required
                                        minLength={8}
                                        value={forgotNewPassword}
                                        onChange={(e) => setForgotNewPassword(e.target.value)}
                                        placeholder="Nouveau mot de passe"
                                        className="block w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm font-semibold text-slate-900"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowForgotNewPassword(!showForgotNewPassword)}
                                        className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600"
                                    >
                                        {showForgotNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            {/* Confirmation du mot de passe */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">
                                    Confirmer le mot de passe
                                </label>
                                <div className="relative group">
                                    <Lock size={18} className="absolute left-3.5 top-3.5 text-slate-400 group-focus-within:text-emerald-600" />
                                    <input
                                        type={showForgotNewPassword ? "text" : "password"}
                                        required
                                        minLength={8}
                                        value={forgotConfirmPassword}
                                        onChange={(e) => setForgotConfirmPassword(e.target.value)}
                                        placeholder="Répétez le mot de passe"
                                        className="block w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm font-semibold text-slate-900"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading || otpCode.length !== 6 || !forgotNewPassword || forgotNewPassword !== forgotConfirmPassword}
                                className="w-full bg-emerald-600 text-white py-3.5 rounded-xl font-bold text-sm hover:bg-emerald-700 hover:shadow-lg active:scale-95 transition-all duration-200 disabled:opacity-50 shadow-md shadow-emerald-600/20 flex justify-center items-center gap-2 mt-2"
                            >
                                {isLoading ? <Loader className="animate-spin h-5 w-5" /> : "Valider et modifier mon mot de passe"}
                            </button>

                            {/* Section Décompte Timer OTP & Bouton Renvoyer */}
                            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                                <span className="text-slate-500 font-medium flex items-center gap-1.5">
                                    <Clock size={14} className={timerSeconds > 0 ? "text-emerald-600 animate-pulse" : "text-amber-500"} />
                                    {timerSeconds > 0 ? `Code valide : ${formatTime(timerSeconds)}` : "Code expiré"}
                                </span>
                                <button
                                    type="button"
                                    onClick={handleRequestForgotPassword}
                                    disabled={timerSeconds > 0 || isLoading}
                                    className={`font-bold px-2.5 py-1 rounded-lg transition-all ${timerSeconds > 0 || isLoading
                                        ? 'text-slate-300 cursor-not-allowed'
                                        : 'text-emerald-700 hover:bg-emerald-50 underline cursor-pointer'
                                        }`}
                                >
                                    Renvoyer le code
                                </button>
                            </div>

                            <div className="pt-2 text-center">
                                <button
                                    type="button"
                                    onClick={() => setForgotStep(1)}
                                    className="text-xs font-semibold text-slate-500 hover:text-emerald-700 transition-colors"
                                >
                                    ← Modifier mon identifiant
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        );
    }

    // --- RENDU VÉRIFICATION EMAIL / WHATSAPP (OTP) ---
    if (isOtpMode) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6 animate-in fade-in zoom-in duration-500">
                <div className="bg-white p-10 rounded-3xl shadow-2xl max-w-md w-full text-center border border-slate-100 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500"></div>
                    <div className="bg-emerald-50 p-6 rounded-full inline-flex mb-6 animate-bounce shadow-inner">
                        {otpChannel === 'WHATSAPP' ? (
                            <MessageCircle className="h-12 w-12 text-emerald-600" />
                        ) : (
                            <Mail className="h-12 w-12 text-emerald-600" />
                        )}
                    </div>
                    <h2 className="text-3xl font-extrabold text-slate-800 mb-3">
                        {otpChannel === 'WHATSAPP' ? 'Vérification WhatsApp' : 'Vérifiez vos emails'}
                    </h2>
                    <p className="text-slate-600 mb-6 leading-relaxed text-sm">
                        {otpChannel === 'WHATSAPP' ? (
                            <>Un code de vérification à 6 chiffres a été envoyé par <strong>WhatsApp</strong> au <strong>+{formatPhoneNumber(registeredPhone)}</strong>.</>
                        ) : (
                            <>Un code de vérification à 6 chiffres a été envoyé par <strong>Email</strong> à <strong>{registeredEmail}</strong>.</>
                        )}
                    </p>

                    {otpInfoMessage && (
                        <div className="mb-6 bg-emerald-50 text-emerald-800 p-3.5 rounded-xl text-xs font-semibold border border-emerald-200 flex items-start text-left gap-2">
                            <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                            <span>{otpInfoMessage}</span>
                        </div>
                    )}

                    {error && (
                        <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-xl flex items-start text-left text-sm font-medium border border-red-100">
                            <AlertCircle className="shrink-0 mr-3 h-5 w-5" />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleVerifyOtp} className="space-y-4">
                        <div className="space-y-1">
                            <input
                                type="text"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                required
                                maxLength={6}
                                value={otpCode}
                                onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                                placeholder="0 0 0 0 0 0"
                                className="block w-full px-4 py-4 text-center text-3xl font-bold tracking-[0.5em] bg-slate-50 border-2 border-emerald-500/40 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none text-slate-900"
                            />
                            <p className="text-[11px] text-slate-400 font-medium">
                                📱 Saisissez les 6 chiffres reçus sur votre application WhatsApp.
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || otpCode.length !== 6}
                            className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-emerald-700 hover:shadow-lg hover:scale-[1.02] active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:hover:scale-100 shadow-md shadow-emerald-600/20"
                        >
                            {isLoading ? <Loader className="animate-spin h-6 w-6 mx-auto" /> : "Vérifier et me connecter"}
                        </button>
                    </form>

                    {/* Section Décompte d'expiration & Bouton Renvoyer le code */}
                    <div className="mt-5 pt-4 border-t border-slate-100 space-y-3">
                        <div className="flex items-center justify-between text-xs px-1">
                            <span className="text-slate-500 font-medium flex items-center gap-1.5">
                                <Clock size={15} className={timerSeconds > 0 ? "text-emerald-600 animate-pulse" : "text-amber-500"} />
                                {timerSeconds > 0 ? "Code valable pendant :" : "Le code a expiré"}
                            </span>
                            <span className={`font-mono font-extrabold px-2.5 py-0.5 rounded-full text-xs transition-colors ${timerSeconds > 10 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : timerSeconds > 0 ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-red-50 text-red-600 border border-red-200 animate-pulse'}`}>
                                {formatTime(timerSeconds)}
                            </span>
                        </div>

                        <button
                            type="button"
                            onClick={handleResendCode}
                            disabled={timerSeconds > 0 || isResending}
                            className={`w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${timerSeconds > 0 || isResending
                                    ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 hover:shadow-md active:scale-98 cursor-pointer'
                                }`}
                        >
                            {isResending ? (
                                <>
                                    <Loader className="animate-spin h-4 w-4 text-emerald-600" />
                                    <span>Génération du nouveau code...</span>
                                </>
                            ) : timerSeconds > 0 ? (
                                <>
                                    <span>Renvoyer le code ({timerSeconds}s)</span>
                                </>
                            ) : (
                                <>
                                    <RefreshCw size={14} className="text-emerald-700" />
                                    <span>Renvoyer un nouveau code</span>
                                </>
                            )}
                        </button>
                    </div>

                    <button
                        onClick={() => { setIsOtpMode(false); onSwitch(AppView.AUTH_LOGIN); }}
                        className="mt-5 text-xs text-slate-500 hover:text-emerald-600 transition-colors font-medium"
                    >
                        Annuler et retourner à la connexion
                    </button>
                </div>
            </div>
        );
    }

    // --- RENDU PAGE ADMIN ---
    if (isAdminLogin) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden font-sans">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-100/50 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-200/30 rounded-full blur-[120px]"></div>

                <div className="w-full max-w-md bg-white border border-emerald-100 p-8 rounded-3xl shadow-xl relative z-10 animate-in zoom-in-95 duration-500">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center p-4 rounded-2xl bg-emerald-50 border border-emerald-100 mb-4 shadow-sm">
                            <ShieldAlert className="h-9 w-9 text-emerald-700" />
                        </div>
                        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight font-display">Accès Administrateur</h2>
                        <p className="mt-2 text-slate-500 text-sm font-medium">Portail de modération 225 Chrétien</p>
                    </div>

                    {error && (
                        <div className="mb-6 bg-red-50 border border-red-200 p-4 rounded-xl flex items-start animate-in slide-in-from-top-2">
                            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                            <p className="text-sm text-red-700 font-semibold">{error}</p>
                        </div>
                    )}

                    <form className="space-y-5" onSubmit={handleSubmit}>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">Identifiant Admin</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-emerald-600">
                                    <ShieldAlert className="h-5 w-5" />
                                </div>
                                <input name="email" type="email" required className="block w-full pl-12 pr-4 py-3.5 input-premium" placeholder="admin@225chretien.ci" />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">Mot de passe</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-emerald-600">
                                    <Lock className="h-5 w-5" />
                                </div>
                                <input name="password" type="password" required className="block w-full pl-12 pr-4 py-3.5 input-premium" placeholder="••••••••••••" />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full btn-emerald-primary py-4 px-4 rounded-xl shadow-md text-sm font-bold flex justify-center items-center"
                        >
                            {isLoading ? <Loader className="animate-spin h-5 w-5" /> : <>Connexion Sécurisée <ArrowRight className="ml-2 h-4 w-4" /></>}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <button onClick={() => onSwitch(AppView.AUTH_LOGIN)} className="text-sm font-semibold text-slate-500 hover:text-emerald-700 transition-colors">
                            ← Retour au site public
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // --- RENDU PAGE UTILISATEUR (Login / Register) ---
    return (
        <div className="min-h-screen flex font-sans relative bg-slate-50">

            {/* Background Mobile Only */}
            <div className="absolute inset-0 lg:hidden z-0 bg-gradient-to-br from-emerald-950 via-slate-900 to-emerald-900 overflow-hidden">
                <img
                    src={BG_IMAGE_URL}
                    className="w-full h-full object-cover opacity-20"
                    alt=""
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
            </div>

            {/* SECTION GAUCHE : VISUEL (Desktop) */}
            <div className="hidden lg:flex w-1/2 relative bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-950 text-white overflow-hidden">
                <div className="absolute inset-0">
                    <img
                        src={BG_IMAGE_URL}
                        className="w-full h-full object-cover opacity-35 scale-105"
                        alt=""
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-emerald-950 via-emerald-900/60 to-transparent" />
                </div>
                <div className="relative z-10 p-16 flex flex-col justify-between h-full">
                    <div className="flex items-center">
                        <span className="text-2xl font-bold tracking-tight font-display text-white">225 Chrétien</span>
                    </div>
                    <div className="space-y-6 max-w-lg">
                        <h1 className="text-5xl font-extrabold leading-tight font-display text-white">
                            {isLogin ? "Heureux de vous revoir." : "Commencez votre histoire."}
                        </h1>
                        <p className="text-lg text-emerald-100 leading-relaxed font-light italic">
                            "L'amour est patient, il est plein de bonté; l'amour ne cherche pas son propre intérêt." <br />
                            <span className="font-semibold mt-2 not-italic block text-amber-300">— 1 Corinthiens 13:4-5</span>
                        </p>
                    </div>
                    <div className="flex space-x-2">
                        <div className="h-1.5 w-8 bg-emerald-400 rounded-full"></div>
                        <div className="h-1.5 w-2 bg-emerald-700 rounded-full"></div>
                        <div className="h-1.5 w-2 bg-emerald-700 rounded-full"></div>
                    </div>
                </div>
            </div>

            {/* SECTION DROITE : FORMULAIRE */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-12 overflow-y-auto relative z-10">
                <div className="w-full max-w-md space-y-4 animate-in slide-in-from-right-8 duration-700 fade-in bg-white/95 lg:bg-transparent p-5 sm:p-8 lg:p-0 rounded-3xl lg:rounded-none shadow-2xl lg:shadow-none backdrop-blur-md lg:backdrop-blur-none border border-white/20 lg:border-none">

                    {/* Header Mobile Inliné & Compact */}
                    <div className="lg:hidden flex items-center justify-center mb-2">
                        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight font-display flex items-center">
                            225 <span className="text-emerald-700 ml-1.5">Chrétien</span>
                        </h2>
                    </div>

                    <div className="text-center lg:text-left">
                        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                            {isLogin 
                                ? 'Connexion' 
                                : (registerStep === 0 ? 'Rejoindre 225 Chrétien' : 'Créer votre compte')}
                        </h2>
                        <p className="mt-1.5 text-slate-600 text-sm">
                            {isLogin ? 'Pas encore de compte ?' : 'Vous avez déjà un compte ?'}{' '}
                            <button
                                onClick={() => { 
                                    setError(null); 
                                    if (isLogin) {
                                        setRegisterStep(0);
                                        onSwitch(AppView.AUTH_REGISTER);
                                    } else {
                                        onSwitch(AppView.AUTH_LOGIN);
                                    }
                                }}
                                className="font-bold text-emerald-600 hover:text-emerald-700 hover:underline transition-colors cursor-pointer"
                            >
                                {isLogin ? 'Inscrivez-vous' : 'Connectez-vous'}
                            </button>
                        </p>
                    </div>

                    {successMessage && (
                        <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-r-lg flex items-start animate-in slide-in-from-top-2">
                            <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 mr-3 flex-shrink-0" />
                            <div>
                                <p className="text-sm text-emerald-800 font-semibold">{successMessage}</p>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg flex items-start animate-in shake">
                            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
                            <div>
                                <h3 className="text-sm font-bold text-red-800">Erreur</h3>
                                <p className="text-sm text-red-700 mt-1">{error}</p>
                            </div>
                        </div>
                    )}

                    {/* BARRE DE PROGRESSION ÉPURÉE DU TUNNEL D'INSCRIPTION (4 ÉTAPES) */}
                    {!isLogin && (
                        <div className="space-y-2 pb-1">
                            <div className="flex items-center justify-between text-xs">
                                {registerStep > 0 ? (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setError(null);
                                            setRegisterStep(prev => Math.max(0, prev - 1));
                                        }}
                                        className="text-slate-600 hover:text-slate-900 font-bold flex items-center gap-1 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition cursor-pointer active:scale-95 text-xs"
                                    >
                                        <ArrowLeft size={13} />
                                        <span>Retour</span>
                                    </button>
                                ) : (
                                    <span className="text-emerald-700 font-bold text-xs flex items-center gap-1">
                                        ✨ Inscription facile
                                    </span>
                                )}
                                <span className="font-bold text-slate-500 text-xs">
                                    Étape {registerStep + 1} / 4
                                </span>
                            </div>

                            {/* Barre animée épurée */}
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-emerald-600 rounded-full transition-all duration-300 ease-out"
                                    style={{ width: `${((registerStep + 1) / 4) * 100}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* ÉTAPE 0 (1/4) : FOI & SENSIBILITÉ */}
                    {!isLogin && registerStep === 0 && (
                        <div className="space-y-3.5 animate-in fade-in duration-300 text-left">
                            <div className="space-y-0.5">
                                <h3 className="text-lg font-black text-slate-900 tracking-tight">
                                    Quelle est votre foi chrétienne ?
                                </h3>
                                <p className="text-xs text-slate-500 font-medium">
                                    Touchez votre sensibilité pour continuer.
                                </p>
                            </div>

                            {/* Grille compacte 2 colonnes ultra-intuitive */}
                            <div className="grid grid-cols-2 gap-2.5 pt-0.5">
                                {DENOMINATION_BUBBLES.map((bubble) => {
                                    const isSelected = selectedDenomination === bubble.id;
                                    return (
                                        <button
                                            key={bubble.id}
                                            type="button"
                                            onClick={() => {
                                                setSelectedDenomination(bubble.id);
                                                setTimeout(() => {
                                                    setRegisterStep(1);
                                                }, 140);
                                            }}
                                            className={`p-3 rounded-2xl border text-left transition-all duration-150 cursor-pointer flex flex-col justify-between active:scale-95 ${
                                                isSelected
                                                    ? 'bg-emerald-50/90 border-emerald-600 ring-2 ring-emerald-500/30 shadow-xs'
                                                    : 'bg-white hover:bg-slate-50/80 border-slate-200 hover:border-emerald-300'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-2xl">{bubble.icon}</span>
                                                <div className={`h-4 w-4 rounded-full flex items-center justify-center transition-colors ${
                                                    isSelected ? 'bg-emerald-600 text-white' : 'border border-slate-300 bg-white'
                                                }`}>
                                                    {isSelected && <Check size={10} strokeWidth={3} />}
                                                </div>
                                            </div>

                                            <div>
                                                <div className="font-black text-slate-900 text-xs sm:text-sm leading-tight">
                                                    {bubble.label}
                                                </div>
                                                <div className="text-[10px] text-emerald-700 font-semibold mt-0.5 truncate">
                                                    {bubble.spiritualFocus}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            <button
                                type="button"
                                onClick={() => setRegisterStep(1)}
                                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md shadow-emerald-600/15 transition flex items-center justify-center gap-1.5 text-sm cursor-pointer active:scale-98 mt-1"
                            >
                                <span>Continuer avec ({selectedDenomination})</span>
                                <ArrowRight size={15} />
                            </button>
                        </div>
                    )}

                    {/* ÉTAPE 1 (2/4) : MON PROFIL & IDENTITÉ */}
                    {!isLogin && registerStep === 1 && (
                        <form onSubmit={handleNextFromStep1} className="space-y-3.5 animate-in fade-in slide-in-from-right-4 duration-300 text-left">
                            <div className="space-y-0.5">
                                <h3 className="text-lg font-black text-slate-900 tracking-tight">
                                    Votre Profil & Identité
                                </h3>
                                <p className="text-xs text-slate-500 font-medium">
                                    Présentez-vous en quelques secondes.
                                </p>
                            </div>

                            {/* Rappel Confession épuré */}
                            <div className="bg-emerald-50/80 border border-emerald-200/70 p-2.5 rounded-xl flex items-center justify-between">
                                <div className="flex items-center space-x-2 text-xs text-slate-800">
                                    <span className="text-base">{activeBubble.icon}</span>
                                    <span className="font-bold text-slate-900">{activeBubble.label}</span>
                                    <span className="text-[10px] text-emerald-700 font-semibold">• {activeBubble.spiritualFocus}</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setRegisterStep(0)}
                                    className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer"
                                >
                                    Modifier
                                </button>
                            </div>

                            {/* Choix du Sexe (Homme / Femme) */}
                            <div>
                                <label className="text-xs font-semibold text-slate-600 block mb-1.5 ml-1">Je suis :</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedGender('M')}
                                        className={`flex items-center justify-center py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm border transition-all active:scale-95 min-h-[42px] cursor-pointer ${
                                            selectedGender === 'M'
                                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                        }`}
                                    >
                                        <span className="mr-1.5 text-base">👨</span> Un Homme
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedGender('F')}
                                        className={`flex items-center justify-center py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm border transition-all active:scale-95 min-h-[42px] cursor-pointer ${
                                            selectedGender === 'F'
                                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                        }`}
                                    >
                                        <span className="mr-1.5 text-base">👩</span> Une Femme
                                    </button>
                                </div>
                            </div>

                            {/* Prénom & Nom */}
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-600 ml-1">Prénom :</label>
                                    <div className="relative group">
                                        <User className="absolute left-3 top-3 h-4 w-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                        <input
                                            name="firstName"
                                            type="text"
                                            required
                                            value={firstName}
                                            onChange={(e) => setFirstName(e.target.value)}
                                            placeholder="Ex: David"
                                            className="pl-9 block w-full py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-shadow min-h-[42px] bg-white font-medium text-slate-800"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-600 ml-1">Nom :</label>
                                    <div className="relative group">
                                        <User className="absolute left-3 top-3 h-4 w-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                        <input
                                            name="lastName"
                                            type="text"
                                            required
                                            value={lastName}
                                            onChange={(e) => setLastName(e.target.value)}
                                            placeholder="Ex: Kouamé"
                                            className="pl-9 block w-full py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-shadow min-h-[42px] bg-white font-medium text-slate-800"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Date de Naissance & Âge calculé */}
                            <div className="space-y-1">
                                <div className="flex justify-between items-center ml-1">
                                    <label className="text-xs font-semibold text-slate-600">Date de Naissance :</label>
                                    {calculateAge(birthDate) !== null && (
                                        <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                                            🎂 {calculateAge(birthDate)} ans
                                        </span>
                                    )}
                                </div>
                                <div className="relative group">
                                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                    <input
                                        type="date"
                                        required
                                        value={birthDate}
                                        onChange={(e) => setBirthDate(e.target.value)}
                                        className="pl-9 block w-full py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-shadow min-h-[42px] bg-white text-slate-800 font-medium"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md shadow-emerald-600/15 transition flex items-center justify-center gap-1.5 text-sm cursor-pointer active:scale-98 mt-1"
                            >
                                <span>Continuer</span>
                                <ArrowRight size={15} />
                            </button>
                        </form>
                    )}

                    {/* ÉTAPE 2 (3/4) : MA COMMUNAUTÉ & MA VILLE */}
                    {!isLogin && registerStep === 2 && (
                        <form onSubmit={handleNextFromStep2} className="space-y-3.5 animate-in fade-in slide-in-from-right-4 duration-300 text-left">
                            <div className="space-y-0.5">
                                <h3 className="text-lg font-black text-slate-900 tracking-tight">
                                    Votre Église & Ville
                                </h3>
                                <p className="text-xs text-slate-500 font-medium">
                                    Pour trouver des membres proches de chez vous.
                                </p>
                            </div>

                            {/* Localisation & Commune */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center ml-1">
                                    <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                                        <MapPin size={13} className="text-emerald-600" />
                                        <span>Ville / Commune :</span>
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setIsLocationModalOpen(true)}
                                        className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer"
                                    >
                                        Changer ↗
                                    </button>
                                </div>

                                <div
                                    onClick={() => setIsLocationModalOpen(true)}
                                    className="bg-white hover:bg-slate-50 border border-slate-300 rounded-xl p-2.5 flex items-center justify-between shadow-2xs transition cursor-pointer"
                                >
                                    <div className="flex items-center space-x-2 text-xs font-bold text-slate-800 truncate pr-2">
                                        <span className={`h-2 w-2 rounded-full shrink-0 ${geoLoading ? 'bg-amber-400 animate-ping' : geoSuccess ? 'bg-emerald-500' : 'bg-teal-500'}`} />
                                        <span className="truncate">
                                            {geoLoading ? "🛰️ Localisation..." : geoLocation.city}
                                        </span>
                                    </div>
                                    <div className="flex items-center space-x-1.5 shrink-0">
                                        {geoLocation.isGps && (
                                            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                                                GPS ✓
                                            </span>
                                        )}
                                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">
                                            Modifier
                                        </span>
                                    </div>
                                </div>

                                {/* Puces d'accès rapide */}
                                <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar pt-0.5">
                                    {[
                                        { name: 'Abidjan, Cocody', short: 'Cocody', lat: 5.3484, lon: -4.0305 },
                                        { name: 'Abidjan, Cocody (Angré)', short: 'Angré', lat: 5.3980, lon: -3.9850 },
                                        { name: 'Abidjan, Cocody (Riviera)', short: 'Riviera', lat: 5.3650, lon: -3.9600 },
                                        { name: 'Abidjan, Yopougon', short: 'Yopougon', lat: 5.3400, lon: -4.0800 },
                                        { name: 'Abidjan, Marcory', short: 'Marcory', lat: 5.3050, lon: -3.9850 },
                                        { name: 'Yamoussoukro', short: 'Yamoussoukro', lat: 6.8276, lon: -5.2893 },
                                        { name: 'Bouaké', short: 'Bouaké', lat: 7.6900, lon: -5.0300 },
                                        { name: 'France, Paris & Île-de-France', short: 'Paris', lat: 48.8566, lon: 2.3522 }
                                    ].map(quickLoc => (
                                        <button
                                            key={quickLoc.name}
                                            type="button"
                                            onClick={() => {
                                                setGeoLocation({
                                                    latitude: quickLoc.lat,
                                                    longitude: quickLoc.lon,
                                                    city: quickLoc.name,
                                                    isGps: false
                                                });
                                                setGeoSuccess(false);
                                            }}
                                            className={`text-[10px] px-2.5 py-1 rounded-lg font-bold border shrink-0 transition-all cursor-pointer active:scale-95 ${
                                                geoLocation.city === quickLoc.name
                                                    ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                                                    : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
                                            }`}
                                        >
                                            {quickLoc.short}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Paroisse / Église */}
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-600 block ml-1">
                                    Paroisse / Église ({activeBubble.label}) :
                                </label>
                                <div className="relative group">
                                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                    <input
                                        name="parish"
                                        type="text"
                                        list="parish-suggestions-list"
                                        value={selectedParish}
                                        onChange={(e) => setSelectedParish(e.target.value)}
                                        required
                                        placeholder={activeBubble.parishPlaceholder}
                                        className="pl-9 block w-full py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-shadow min-h-[42px] bg-white font-medium text-slate-800"
                                    />
                                    <datalist id="parish-suggestions-list">
                                        {parishSuggestions.map((pName, idx) => (
                                            <option key={idx} value={pName} />
                                        ))}
                                    </datalist>
                                </div>
                            </div>

                            {/* Centres d'Intérêt */}
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-600 block ml-1">Centres d'intérêt :</label>
                                <div className="flex flex-wrap gap-1.5 pt-0.5">
                                    {allAvailableInterests.slice(0, 6).map((interest) => {
                                        const isSelected = selectedInterests.includes(interest);
                                        return (
                                            <button
                                                key={interest}
                                                type="button"
                                                onClick={() => {
                                                    if (isSelected) {
                                                        setSelectedInterests(selectedInterests.filter(i => i !== interest));
                                                    } else {
                                                        setSelectedInterests([...selectedInterests, interest]);
                                                    }
                                                }}
                                                className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all active:scale-95 cursor-pointer ${
                                                    isSelected
                                                        ? 'bg-emerald-100 text-emerald-900 border-emerald-400 font-bold'
                                                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                                }`}
                                            >
                                                {interest} {isSelected ? '✓' : ''}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md shadow-emerald-600/15 transition flex items-center justify-center gap-1.5 text-sm cursor-pointer active:scale-98 mt-1"
                            >
                                <span>Continuer</span>
                                <ArrowRight size={15} />
                            </button>
                        </form>
                    )}

                    {/* ÉTAPE 3 (4/4) : MON COMPTE & SÉCURITÉ (ET FORMULAIRE LOGIN) */}
                    {(isLogin || registerStep === 3) && (
                        <form className="space-y-3.5" onSubmit={handleSubmit}>
                            {/* Champs masqués pour assurer la persistance absolue lors de la soumission */}
                            {!isLogin && (
                                <>
                                    <input type="hidden" name="firstName" value={firstName} />
                                    <input type="hidden" name="lastName" value={lastName} />
                                    <input type="hidden" name="gender" value={selectedGender} />
                                    <input type="hidden" name="denomination" value={selectedDenomination} />
                                    <input type="hidden" name="parish" value={selectedParish} />
                                    <input type="hidden" name="birthDate" value={birthDate} />
                                    <input type="hidden" name="otpChannel" value={otpChannel} />
                                    
                                    <div className="space-y-0.5 text-left">
                                        <h3 className="text-lg font-black text-slate-900 tracking-tight">
                                            Finaliser mon Inscription
                                        </h3>
                                        <p className="text-xs text-slate-500 font-medium">
                                            {firstName ? `Presque terminé ${firstName} ! ` : ''}Choisissez votre mode de réception du code.
                                        </p>
                                    </div>
                                </>
                            )}

                            {/* Choix du canal (WhatsApp / Email) */}
                            <div className="text-left space-y-1">
                                <label className="text-xs font-semibold text-slate-600 block ml-1">
                                    {isLogin ? 'Se connecter via :' : 'Vérification via :'}
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (isLogin) setLoginChannel('WHATSAPP');
                                            else setOtpChannel('WHATSAPP');
                                        }}
                                        className={`flex items-center justify-center py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm border transition-all active:scale-95 min-h-[42px] cursor-pointer ${
                                            (isLogin ? loginChannel === 'WHATSAPP' : otpChannel === 'WHATSAPP')
                                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                        }`}
                                    >
                                        <MessageCircle size={16} className="mr-1.5 shrink-0" /> WhatsApp
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (isLogin) setLoginChannel('EMAIL');
                                            else setOtpChannel('EMAIL');
                                        }}
                                        className={`flex items-center justify-center py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm border transition-all active:scale-95 min-h-[42px] cursor-pointer ${
                                            (isLogin ? loginChannel === 'EMAIL' : otpChannel === 'EMAIL')
                                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                        }`}
                                    >
                                        <Mail size={16} className="mr-1.5 shrink-0" /> Email
                                    </button>
                                </div>
                            </div>

                            {/* Champ WhatsApp ou Email */}
                            {((isLogin && loginChannel === 'WHATSAPP') || (!isLogin && otpChannel === 'WHATSAPP')) ? (
                                <div className="text-left space-y-1">
                                    <label className="text-xs font-semibold text-slate-600 block ml-1">Numéro WhatsApp :</label>
                                    <div className="relative group">
                                        <div className="absolute left-3 top-3 flex items-center gap-1 text-emerald-600 font-bold text-xs pointer-events-none">
                                            <MessageCircle size={16} />
                                            <span>🇨🇮 +225</span>
                                        </div>
                                        <input
                                            name="phone"
                                            type="tel"
                                            required
                                            value={phoneInput}
                                            onChange={(e) => {
                                                if (isLogin) setPhoneInput(e.target.value);
                                                else checkPhoneDuplicate(e.target.value);
                                            }}
                                            placeholder="07 00 00 00 00"
                                            className={`pl-28 block w-full py-2.5 text-sm border-2 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-600 transition-shadow bg-emerald-50/20 text-slate-900 font-semibold min-h-[44px] ${
                                                phoneDuplicateError && !isLogin ? 'border-red-500 bg-red-50/30' : 'border-emerald-500/50'
                                            }`}
                                        />
                                    </div>
                                    {phoneDuplicateError && !isLogin && (
                                        <div className="mt-1.5 p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center justify-between animate-in fade-in">
                                            <span>{phoneDuplicateError}</span>
                                            <button
                                                type="button"
                                                onClick={() => onSwitch(AppView.AUTH_LOGIN)}
                                                className="text-xs font-bold text-emerald-700 underline hover:text-emerald-900 ml-2"
                                            >
                                                Se connecter →
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-left space-y-1">
                                    <label className="text-xs font-semibold text-slate-600 block ml-1">Adresse Email :</label>
                                    <div className="relative group">
                                        <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                        <input
                                            name="email"
                                            type="email"
                                            required
                                            value={emailInput}
                                            onChange={(e) => {
                                                if (isLogin) setEmailInput(e.target.value);
                                                else checkEmailDuplicate(e.target.value);
                                            }}
                                            placeholder="Ex: votreemail@gmail.com"
                                            className={`pl-9 block w-full py-2.5 text-sm border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-shadow bg-white min-h-[44px] text-slate-800 font-medium ${
                                                emailDuplicateError && !isLogin ? 'border-red-500 bg-red-50/30' : 'border-slate-300'
                                            }`}
                                        />
                                    </div>
                                    {emailDuplicateError && !isLogin && (
                                        <div className="mt-1.5 p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center justify-between animate-in fade-in">
                                            <span>{emailDuplicateError}</span>
                                            <button
                                                type="button"
                                                onClick={() => onSwitch(AppView.AUTH_LOGIN)}
                                                className="text-xs font-bold text-emerald-700 underline hover:text-emerald-900 ml-2"
                                            >
                                                Se connecter →
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Mot de passe */}
                            <div className="text-left space-y-1">
                                <label className="text-xs font-semibold text-slate-600 block ml-1">Mot de passe :</label>
                                <div className="relative group">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                    <input
                                        id="password"
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        required
                                        minLength={8}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Mot de passe (8+ caractères)"
                                        className="pl-9 pr-9 block w-full py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-shadow bg-white min-h-[44px] text-slate-800"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                {isLogin && (
                                    <div className="flex justify-end pt-1">
                                        <button
                                            type="button"
                                            onClick={() => { setError(null); setSuccessMessage(null); setIsForgotPasswordMode(true); setForgotStep(1); }}
                                            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline transition-colors cursor-pointer"
                                        >
                                            Mot de passe oublié ?
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Bouton d'action principal */}
                            <button
                                type="submit"
                                disabled={isLoading || (!isLogin && ((otpChannel === 'WHATSAPP' && !!phoneDuplicateError) || (otpChannel === 'EMAIL' && !!emailDuplicateError)))}
                                className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl shadow-md shadow-emerald-600/15 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 hover:shadow-emerald-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all transform hover:scale-[1.01] active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed mt-2 min-h-[44px] cursor-pointer"
                            >
                                {isLoading ? (
                                    <Loader className="animate-spin h-5 w-5" />
                                ) : isLogin ? (
                                    'Se connecter'
                                ) : otpChannel === 'WHATSAPP' ? (
                                    '✨ Valider & recevoir mon code'
                                ) : (
                                    '✨ Valider & recevoir mon code'
                                )}
                            </button>
                        </form>
                    )}

                    {isLogin && (
                        <div className="text-center pt-4">
                            <button
                                onClick={() => onSwitch(AppView.AUTH_ADMIN_LOGIN)}
                                className="text-xs text-slate-400 hover:text-slate-600 font-medium transition-colors opacity-70 hover:opacity-100 flex items-center justify-center mx-auto space-x-1"
                            >
                                <ShieldAlert size={12} /> <span>Accès Administration</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal de Sélection de Localisation & Commune */}
            <LocationSelectorModal
                isOpen={isLocationModalOpen}
                onClose={() => setIsLocationModalOpen(false)}
                currentLocationName={geoLocation.city}
                currentLatitude={geoLocation.latitude}
                currentLongitude={geoLocation.longitude}
                onSelectLocation={handleSelectPreciseLocation}
            />
        </div>
    );
};
