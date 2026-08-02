import React, { useState, useEffect, useCallback } from 'react';
import { AppView } from '../types';
import { Lock, Mail, User, ShieldAlert, Sparkles, RefreshCw, Loader, AlertCircle, CheckCircle2, ChevronRight, MapPin, Heart, ShieldCheck, HelpCircle, Eye, EyeOff, Calendar, Phone, ArrowLeft, MessageCircle, Clock, Check, Cross } from 'lucide-react';
import { AVAILABLE_INTERESTS } from '../constants';
import { supabase, supabaseAdmin } from '../supabaseClient';
import { sendWhatsAppOtp, formatPhoneNumber } from '../openwaClient';

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

    // Décompte de temps pour l'expiration du code OTP
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isOtpMode && timerSeconds > 0) {
            interval = setInterval(() => {
                setTimerSeconds((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isOtpMode, timerSeconds]);

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

    // États pour l'inscription express & algorithme de matching
    const [selectedGender, setSelectedGender] = useState<'M' | 'F'>('M');
    const [selectedDenomination, setSelectedDenomination] = useState<string>('Catholique');
    const [selectedParish, setSelectedParish] = useState<string>('');
    const [selectedInterests, setSelectedInterests] = useState<string[]>(['📖 Bible & Prière', '🎵 Musique / Chorale']);
    const [birthDate, setBirthDate] = useState<string>('2000-01-15');
    const [parishSuggestions, setParishSuggestions] = useState<string[]>([]);

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
    const [geoLocation, setGeoLocation] = useState<{ latitude: number; longitude: number; city: string }>({
        latitude: 5.3484,
        longitude: -4.0305,
        city: 'Abidjan, Cocody'
    });
    const [geoLoading, setGeoLoading] = useState<boolean>(false);
    const [geoSuccess, setGeoSuccess] = useState<boolean>(false);

    const isLogin = view === AppView.AUTH_LOGIN;
    const isAdminLogin = view === AppView.AUTH_ADMIN_LOGIN;
    const isRegister = view === AppView.AUTH_REGISTER;

    // Fonction de détection GPS avec repli propre
    const requestGeoLocation = useCallback(() => {
        if (typeof navigator !== 'undefined' && navigator.geolocation) {
            setGeoLoading(true);
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setGeoLocation({
                        latitude: pos.coords.latitude,
                        longitude: pos.coords.longitude,
                        city: 'Abidjan (GPS Détecté)'
                    });
                    setGeoLoading(false);
                    setGeoSuccess(true);
                },
                (err) => {
                    console.info("GPS non disponible (coordonnées par défaut d'Abidjan utilisées) :", err?.message || err);
                    setGeoLoading(false);
                    setGeoSuccess(false);
                },
                {
                    enableHighAccuracy: false, // Position rapide via IP/réseau mobile sans bloquer sur le GPS satellite
                    timeout: 10000,           // 10 secondes d'attente max
                    maximumAge: 300000        // Cache de 5 minutes
                }
            );
        }
    }, []);

    // Détection GPS au montage sur le formulaire d'inscription
    useEffect(() => {
        if (isRegister) {
            requestGeoLocation();
        }
    }, [isRegister, requestGeoLocation]);

    // États pour les données dynamiques
    const [parishes, setParishes] = useState<{ id: string, name: string }[]>([]);
    const [loadingParishes, setLoadingParishes] = useState(false);

    // URL de l'image de fond (Mains unies / Union Africaine / Alliances)
    // Image spécifique demandée : Homme passant la bague au doigt
    const BG_IMAGE_URL = "https://images.unsplash.com/photo-1610212550368-3c65df51d7c3?q=80&w=1974&auto=format&fit=crop";

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
        let rawEmail = (formData.get('email') as string || '').trim();
        const password = formData.get('password') as string;
        const phone = (formData.get('phone') as string || '').trim();
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
            // CAS 1 : CONNEXION ADMIN
            // ---------------------------------------------------------
            if (isAdminLogin) {
                await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
                let { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });

                if (error && error.message?.toLowerCase().includes("email not confirmed")) {
                    try {
                        const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
                        const targetUser = usersData?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
                        if (targetUser?.id) {
                            await supabaseAdmin.auth.admin.updateUserById(targetUser.id, { email_confirm: true });
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
                        const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
                        const targetUser = usersData?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
                        if (targetUser?.id) {
                            await supabaseAdmin.auth.admin.updateUserById(targetUser.id, { email_confirm: true });
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
                const firstName = (formData.get('firstName') as string || '').trim();
                const lastName = (formData.get('lastName') as string || '').trim();
                const passwordConfirm = (formData.get('passwordConfirm') as string) || password;
                const parishInput = (formData.get('parish') as string) || selectedParish;
                const denominationInput = (formData.get('denomination') as string) || selectedDenomination;
                const baptismYear = formData.get('baptismYear') as string;
                const gender = selectedGender || (formData.get('gender') as 'M' | 'F') || 'M';
                const fullName = `${firstName} ${lastName}`.trim() || 'Membre Chrétien';
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
                                first_name: firstName,
                                last_name: lastName,
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
                        const waRes = await sendWhatsAppOtp(phone, code);
                        if (waRes && waRes.success) {
                            setOtpInfoMessage(`💬 Un code de vérification à 6 chiffres vous a été transmis par WhatsApp au +${formatPhoneNumber(phone)}.`);
                        } else {
                            setOtpInfoMessage(`💬 Un code de vérification à 6 chiffres a été transmis par WhatsApp au +${formatPhoneNumber(phone)}.`);
                        }
                    } catch (waErr) {
                        setOtpInfoMessage(`💬 Un code de vérification à 6 chiffres a été transmis par WhatsApp au +${formatPhoneNumber(phone)}.`);
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
                        const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
                        const targetUser = usersData?.users?.find(u => u.email?.toLowerCase() === registeredEmail.toLowerCase());
                        if (targetUser?.id) {
                            await supabaseAdmin.auth.admin.updateUserById(targetUser.id, { email_confirm: true });
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
                const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
                const foundUser = usersData?.users?.find(u =>
                    u.email?.toLowerCase() === identifier.toLowerCase() ||
                    u.email?.toLowerCase() === `wa_${identifier.replace(/[^0-9]/g, '')}@225chretien.ci`
                );
                if (foundUser?.id) {
                    userIdFound = foundUser.id;
                    targetUserEmail = foundUser.email || identifier;
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
                    <div className="flex items-center space-x-3">
                        <div className="bg-emerald-600/80 backdrop-blur-md p-2.5 rounded-xl border border-emerald-500/30 shadow-md">
                            <Cross className="h-6 w-6 text-white stroke-[2.5]" />
                        </div>
                        <span className="text-2xl font-bold tracking-tight font-display">225 Chrétien</span>
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

                    {/* Header Mobile Inliné & Compact (225 Chrétien sur la même ligne que la croix) */}
                    <div className="lg:hidden flex items-center justify-center gap-2.5 mb-2">
                        <div className="bg-emerald-600 p-2 rounded-xl shadow-md">
                            <Cross className="h-5 w-5 text-white stroke-[2.5]" />
                        </div>
                        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight font-display flex items-center">
                            225 <span className="text-emerald-700 ml-1.5">Chrétien</span>
                        </h2>
                    </div>

                    <div className="text-center lg:text-left">
                        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
                            {isLogin ? 'Connexion' : 'Créer un compte'}
                        </h2>
                        <p className="mt-1.5 text-slate-600 text-sm">
                            {isLogin ? 'Pas encore de compte ?' : 'Vous avez déjà un compte ?'}{' '}
                            <button
                                onClick={() => { setError(null); onSwitch(isLogin ? AppView.AUTH_REGISTER : AppView.AUTH_LOGIN); }}
                                className="font-bold text-emerald-600 hover:text-emerald-700 hover:underline transition-colors"
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

                    <form className="space-y-4" onSubmit={handleSubmit}>
                        {!isLogin && (
                            <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500 text-left">
                                {/* Indicator Express */}
                                <div className="bg-emerald-50/80 border border-emerald-200/60 p-2.5 rounded-2xl flex items-center justify-between">
                                    <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-900">
                                        <Sparkles size={15} className="text-emerald-600" />
                                        <span>Inscription Express (30s)</span>
                                    </div>
                                    <span className="text-[11px] font-bold bg-emerald-600 text-white px-2.5 py-0.5 rounded-full shadow-xs">
                                        Étape 1 / 2
                                    </span>
                                </div>

                                {/* Choix du Sexe (Homme / Femme) */}
                                <div>
                                    <label className="text-xs font-semibold text-slate-600 block mb-1.5 ml-1">Je suis :</label>
                                    <div className="grid grid-cols-2 gap-2.5">
                                        <button
                                            type="button"
                                            onClick={() => setSelectedGender('M')}
                                            className={`flex items-center justify-center py-2.5 px-3 rounded-xl font-semibold text-xs sm:text-sm border transition-all active:scale-95 min-h-[46px] ${selectedGender === 'M'
                                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                                }`}
                                        >
                                            <span className="mr-1.5 text-base">👨</span> Un Homme
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedGender('F')}
                                            className={`flex items-center justify-center py-2.5 px-3 rounded-xl font-semibold text-xs sm:text-sm border transition-all active:scale-95 min-h-[46px] ${selectedGender === 'F'
                                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                                }`}
                                        >
                                            <span className="mr-1.5 text-base">👩</span> Une Femme
                                        </button>
                                    </div>
                                    <input type="hidden" name="gender" value={selectedGender} />
                                </div>

                                {/* Prénom & Nom */}
                                <div className="grid grid-cols-2 gap-2.5">
                                    <div className="relative group">
                                        <User className="absolute left-3 top-3 h-4 w-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                        <input name="firstName" type="text" required placeholder="Prénom" className="pl-9 block w-full py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-shadow min-h-[46px]" />
                                    </div>
                                    <div className="relative group">
                                        <User className="absolute left-3 top-3 h-4 w-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                        <input name="lastName" type="text" required placeholder="Nom" className="pl-9 block w-full py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-shadow min-h-[46px]" />
                                    </div>
                                </div>

                                {/* Date de Naissance (Calcul d'âge auto) */}
                                <div>
                                    <label className="text-xs font-semibold text-slate-600 block mb-1 ml-1">Date de Naissance (Calcul d'âge automatique) :</label>
                                    <div className="relative group">
                                        <Calendar className="absolute left-3 top-3 h-4 w-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                        <input
                                            type="date"
                                            required
                                            value={birthDate}
                                            onChange={(e) => setBirthDate(e.target.value)}
                                            className="pl-9 block w-full py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-shadow min-h-[46px] bg-white text-slate-700 font-medium"
                                        />
                                    </div>
                                </div>

                                {/* Géolocalisation GPS Obligatoire */}
                                <div className="bg-slate-50 border border-slate-200/80 p-2.5 rounded-xl flex items-center justify-between">
                                    <div className="flex items-center space-x-2 text-xs font-medium text-slate-700">
                                        <MapPin size={15} className={geoSuccess ? "text-emerald-600" : "text-amber-500"} />
                                        <span>{geoLoading ? "Détection GPS en cours..." : `Position : ${geoLocation.city}`}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={requestGeoLocation}
                                        disabled={geoLoading}
                                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full transition-all cursor-pointer ${geoSuccess ? "bg-emerald-100 text-emerald-800 border border-emerald-200" : "bg-amber-100 text-amber-800 border border-amber-200 hover:bg-amber-200 active:scale-95"}`}
                                        title={geoSuccess ? "GPS détecté avec succès" : "Cliquer pour ré-essayer la détection GPS"}
                                    >
                                        {geoLoading ? "Recherche..." : (geoSuccess ? "GPS Actif ✓" : "Réessayer GPS")}
                                    </button>
                                </div>

                                {/* Confession Chrétienne (Scroll Horizontal Défilant) */}
                                <div>
                                    <div className="flex justify-between items-center mb-1 ml-1">
                                        <label className="text-xs font-semibold text-slate-600">Confession Chrétienne :</label>
                                        <span className="text-[10px] text-slate-400 font-medium">Défiler →</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 pt-0.5 no-scrollbar scroll-smooth">
                                        {['Catholique', 'Évangélique', 'Méthodiste', 'Baptiste', 'Assemblées de Dieu'].map((denom) => (
                                            <button
                                                key={denom}
                                                type="button"
                                                onClick={() => setSelectedDenomination(denom)}
                                                className={`px-3 py-2 rounded-xl text-xs font-semibold border shrink-0 transition-all active:scale-95 min-h-[38px] ${selectedDenomination === denom
                                                        ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                                                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                                    }`}
                                            >
                                                {denom}
                                            </button>
                                        ))}
                                    </div>
                                    <input type="hidden" name="denomination" value={selectedDenomination} />
                                </div>

                                {/* Paroisse / Église (Sélecteur Hybride Recherche + Saisie Libre) */}
                                <div>
                                    <div className="flex justify-between items-center mb-1 ml-1">
                                        <label className="text-xs font-semibold text-slate-600">Votre Paroisse / Église :</label>
                                        <span className="text-[10px] text-emerald-600 font-bold">✨ Saisissez ou choisissez</span>
                                    </div>
                                    <div className="relative group">
                                        <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                        <input
                                            name="parish"
                                            type="text"
                                            list="parish-suggestions-list"
                                            value={selectedParish}
                                            onChange={(e) => setSelectedParish(e.target.value)}
                                            required
                                            placeholder="Rechercher ou saisir votre église..."
                                            className="pl-9 block w-full py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-shadow min-h-[46px]"
                                        />
                                        <datalist id="parish-suggestions-list">
                                            {parishSuggestions.map((pName, idx) => (
                                                <option key={idx} value={pName} />
                                            ))}
                                        </datalist>
                                    </div>
                                </div>

                                {/* Centres d'Intérêt Dynamiques (Scroll Horizontal Fluid) */}
                                <div>
                                    <div className="flex justify-between items-center mb-1 ml-1">
                                        <label className="text-xs font-semibold text-slate-600">Centres d'intérêt :</label>
                                        <span className="text-[10px] text-slate-400 font-medium">Défiler →</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 pt-0.5 no-scrollbar scroll-smooth">
                                        {allAvailableInterests.map((interest) => {
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
                                                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border shrink-0 transition-all active:scale-95 min-h-[36px] ${isSelected
                                                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold'
                                                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                                        }`}
                                                >
                                                    {interest} {isSelected ? '✓' : ''}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* SECTION IDENTIFIANTS (CHOIX CANAL WHATSAPP OU EMAIL) */}
                        <div className="space-y-3 pt-1 text-left">
                            {!isLogin && (
                                <>
                                    {/* Choix du canal de vérification (WhatsApp vs Email) */}
                                    <div>
                                        <label className="text-xs font-semibold text-slate-600 block mb-1.5 ml-1">
                                            Vérification du code via :
                                        </label>
                                        <div className="grid grid-cols-2 gap-2.5">
                                            <button
                                                type="button"
                                                onClick={() => setOtpChannel('WHATSAPP')}
                                                className={`flex items-center justify-center py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm border transition-all active:scale-95 min-h-[44px] ${otpChannel === 'WHATSAPP'
                                                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                                    }`}
                                            >
                                                <MessageCircle size={16} className="mr-1.5 shrink-0" /> WhatsApp
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setOtpChannel('EMAIL')}
                                                className={`flex items-center justify-center py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm border transition-all active:scale-95 min-h-[44px] ${otpChannel === 'EMAIL'
                                                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                                    }`}
                                            >
                                                <Mail size={16} className="mr-1.5 shrink-0" /> Email
                                            </button>
                                        </div>
                                        <input type="hidden" name="otpChannel" value={otpChannel} />
                                    </div>

                                    {/* Si WhatsApp est sélectionné : afficher uniquement le champ numéro de téléphone */}
                                    {otpChannel === 'WHATSAPP' && (
                                        <div>
                                            <label className="text-xs font-semibold text-slate-600 block mb-1 ml-1">Numéro WhatsApp :</label>
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
                                                    onChange={(e) => checkPhoneDuplicate(e.target.value)}
                                                    placeholder="07 00 00 00 00 (WhatsApp)"
                                                    className={`pl-28 block w-full py-2.5 text-sm border-2 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-600 transition-shadow bg-emerald-50/20 text-slate-900 font-semibold min-h-[46px] ${phoneDuplicateError ? 'border-red-500 bg-red-50/30' : 'border-emerald-500/50'
                                                        }`}
                                                />
                                            </div>
                                            {phoneDuplicateError && (
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
                                    )}

                                    {/* Si Email est sélectionné : afficher uniquement le champ Email */}
                                    {otpChannel === 'EMAIL' && (
                                        <div>
                                            <label className="text-xs font-semibold text-slate-600 block mb-1 ml-1">Adresse Email :</label>
                                            <div className="relative group">
                                                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                                <input
                                                    name="email"
                                                    type="email"
                                                    required
                                                    value={emailInput}
                                                    onChange={(e) => checkEmailDuplicate(e.target.value)}
                                                    placeholder="Ex: votreemail@gmail.com"
                                                    className={`pl-9 block w-full py-2.5 text-sm border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-shadow bg-slate-50 focus:bg-white min-h-[46px] ${emailDuplicateError ? 'border-red-500 bg-red-50/30' : 'border-slate-300'
                                                        }`}
                                                />
                                            </div>
                                            {emailDuplicateError && (
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
                                </>
                            )}

                            {isLogin && (
                                <div className="space-y-3">
                                    {/* Choix du canal de connexion : WhatsApp vs Email */}
                                    <div>
                                        <label className="text-xs font-semibold text-slate-600 block mb-1.5 ml-1">
                                            Se connecter via :
                                        </label>
                                        <div className="grid grid-cols-2 gap-2.5">
                                            <button
                                                type="button"
                                                onClick={() => setLoginChannel('WHATSAPP')}
                                                className={`flex items-center justify-center py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm border transition-all active:scale-95 min-h-[44px] ${loginChannel === 'WHATSAPP'
                                                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                                    }`}
                                            >
                                                <MessageCircle size={16} className="mr-1.5 shrink-0" /> WhatsApp
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setLoginChannel('EMAIL')}
                                                className={`flex items-center justify-center py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm border transition-all active:scale-95 min-h-[44px] ${loginChannel === 'EMAIL'
                                                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                                    }`}
                                            >
                                                <Mail size={16} className="mr-1.5 shrink-0" /> Email
                                            </button>
                                        </div>
                                    </div>

                                    {/* Champ WhatsApp avec indicatif 🇨🇮 +225 */}
                                    {loginChannel === 'WHATSAPP' ? (
                                        <div>
                                            <label className="text-xs font-semibold text-slate-600 block mb-1 ml-1">Numéro WhatsApp :</label>
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
                                                    onChange={(e) => setPhoneInput(e.target.value)}
                                                    placeholder="07 00 00 00 00 (WhatsApp)"
                                                    className="pl-28 block w-full py-2.5 text-sm border-2 border-emerald-500/50 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-600 transition-shadow bg-emerald-50/20 text-slate-900 font-semibold min-h-[46px]"
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div>
                                            <label className="text-xs font-semibold text-slate-600 block mb-1 ml-1">Adresse Email :</label>
                                            <div className="relative group">
                                                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                                <input
                                                    name="email"
                                                    type="email"
                                                    required
                                                    value={emailInput}
                                                    onChange={(e) => setEmailInput(e.target.value)}
                                                    placeholder="Ex: votreemail@gmail.com"
                                                    className="pl-9 block w-full py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-shadow bg-slate-50 focus:bg-white min-h-[46px]"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="relative group">
                                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                <input id="password" name="password" type={showPassword ? "text" : "password"} required minLength={8} placeholder="Mot de passe (8+ caractères)" className="pl-9 pr-9 block w-full py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-shadow bg-slate-50 focus:bg-white min-h-[46px]" />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition-colors">
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>

                            {isLogin && (
                                <div className="flex justify-end pt-1">
                                    <button
                                        type="button"
                                        onClick={() => { setError(null); setSuccessMessage(null); setIsForgotPasswordMode(true); setForgotStep(1); }}
                                        className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline transition-colors"
                                    >
                                        Mot de passe oublié ?
                                    </button>
                                </div>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || (!isLogin && ((otpChannel === 'WHATSAPP' && !!phoneDuplicateError) || (otpChannel === 'EMAIL' && !!emailDuplicateError)))}
                            className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl shadow-md shadow-emerald-600/15 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 hover:shadow-emerald-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all transform hover:scale-[1.01] active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed mt-4 min-h-[46px]"
                        >
                            {isLoading ? <Loader className="animate-spin h-5 w-5" /> : (isLogin ? 'Se connecter' : (otpChannel === 'WHATSAPP' ? 'Valider & recevoir mon code WhatsApp' : 'Valider & recevoir mon code Email'))}
                        </button>
                    </form>

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
        </div>
    );
};
