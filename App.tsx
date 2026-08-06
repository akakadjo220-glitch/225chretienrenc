
import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { AuthForms } from './components/AuthForms';
import { UserDashboard } from './components/UserDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { VerifyEmailPage } from './components/VerifyEmailPage';
import { NotificationManager } from './components/NotificationManager';
import { OnboardingInterests } from './components/OnboardingInterests';
import { OnboardingPreferences } from './components/OnboardingPreferences';
import { MobileBottomNav } from './components/MobileBottomNav';
import { SessionTimeoutManager } from './components/SessionTimeoutManager';
import { UserRole, AppView } from './types';
import { supabase } from './supabaseClient';
import { getDeviceFingerprint, getClientIp, fetchBannedIdentifiers, checkIsBlacklisted } from './utils/deviceFingerprint';
import { initPrivacyShield } from './utils/privacyShield';
import { PinLockModal } from './components/PinLockModal';
import { Shield, EyeOff } from 'lucide-react';

const App: React.FC = () => {
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>(UserRole.GUEST);
  const [currentView, setCurrentView] = useState<AppView>(AppView.LANDING);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // 🔒 États de Sécurité (Bouclier Privacy & PIN Lock)
  const [isPrivacyBlurred, setIsPrivacyBlurred] = useState(false);
  const [isPinLocked, setIsPinLocked] = useState(false);
  const [savedPinHash, setSavedPinHash] = useState<string | null>(null);

  // Initialisation du Bouclier Anti-Capture et du Code PIN
  useEffect(() => {
    const pin = localStorage.getItem('_225_security_pin');
    setSavedPinHash(pin);
    if (pin && currentUserRole === UserRole.USER) {
      setIsPinLocked(true);
    }

    const cleanup = initPrivacyShield((blurred) => {
      setIsPrivacyBlurred(blurred);
    });

    return () => {
      cleanup();
    };
  }, [currentUserRole]);

  // Enregistrement du Service Worker pour la PWA
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then(registration => {
            console.log('SW registered: ', registration);
          })
          .catch(registrationError => {
            console.log('SW registration failed: ', registrationError);
          });
      });
    }
  }, []);

  // Heartbeat pour le statut en ligne (Présence réelle)
  useEffect(() => {
    const updateOnlineStatus = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        // Mise à jour silencieuse du champ updated_at
        await supabase
          .from('profiles')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', session.user.id);
      } catch (e) {
        // Echec silencieux (ex: hors ligne)
      }
    };

    // 1. Mise à jour immédiate au montage
    updateOnlineStatus();

    // 2. Mise à jour périodique (toutes les 3 minutes)
    const intervalId = setInterval(updateOnlineStatus, 3 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [currentUserRole]); // Se relance si le rôle/auth change

  // Vérifier la session au démarrage
  useEffect(() => {
    const syncAuthState = async (session: any) => {
      // 1. EST-CE QU'ON EST CONNECTÉ ?
      if (session?.user) {
        const user = session.user;

        // 🛡️ CYBERSÉCURITÉ : VÉRIFICATION DE LA LISTE NOIRE (BAN / SUPPRESSION PAR IP + FINGERPRINT + EMAIL + TEL)
        const clientIp = await getClientIp();
        const fingerprint = getDeviceFingerprint();
        const blacklist = await fetchBannedIdentifiers();

        const userPhone = user.user_metadata?.phone || user.phone || (user.email?.startsWith('wa_') ? user.email.replace('wa_', '').replace('@225chretien.ci', '') : '');

        const banCheck = checkIsBlacklisted(blacklist, {
          userId: user.id,
          email: user.email,
          phone: userPhone,
          ip: clientIp,
          fingerprint: fingerprint
        });

        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        // SI LE PROFIL A ÉTÉ SUPPRIMÉ EN DB OU BANNI OU EN LISTE NOIRE -> EXPULSION IMMÉDIATE & PURGE DES TOKENS
        if (!profile || profile.status === 'BANNED' || banCheck.isBanned) {
          await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem('225_otp_verified');
            localStorage.removeItem('supabase.auth.token');
          }
          setCurrentUserRole(UserRole.GUEST);
          setCurrentView(AppView.AUTH_LOGIN);
          setIsAuthLoading(false);
          const reason = banCheck.reason || (profile?.status === 'BANNED' ? "Ce compte a été banni par l'administration." : "Ce compte a été supprimé par l'administrateur.");
          alert(`⛔ ACCÈS REFUSÉ PAR LA SÉCURITÉ (225 CHRÉTIEN)\n\n${reason}\n\nToute tentative de réinscription ou de connexion depuis ce numéro, email ou appareil est strictement bloquée.`);
          return;
        }

        // DÉTECTION SUPER ADMIN (Email Maître)
        const isSuperAdmin = user.email === 'chretien0225@gmail.com';

        // Calcul du rôle réel (Admin DB ou SuperAdmin Hardcodé)
        const role = (profile.role === 'ADMIN' || isSuperAdmin) ? UserRole.ADMIN : UserRole.USER;

        // VÉRIFICATION OTP EN COURS : L'OTP ne bloque pas les Administrateurs lors du rafraîchissement de la page
        const isOtpVerified = typeof window !== 'undefined' && sessionStorage.getItem('225_otp_verified') === 'true';
        if (!isOtpVerified && !isSuperAdmin && role !== UserRole.ADMIN) {
          setIsAuthLoading(false);
          return; // Conserver l'écran de formulaire AuthForms actif pour la saisie du code OTP
        }

        // Si l'utilisateur est un Admin valide, marquer la session comme vérifiée
        if (role === UserRole.ADMIN) {
          sessionStorage.setItem('225_otp_verified', 'true');
        }

        // 2. PARE-FEU : EST-CE QUE L'EMAIL EST VÉRIFIÉ ?
        const isEmailVerified = !!user.email_confirmed_at;
        if (!isEmailVerified && !isSuperAdmin) {
          setCurrentView(AppView.AUTH_VERIFY_EMAIL);
          setCurrentUserRole(role);
          setIsAuthLoading(false);
          return; // ON ARRÊTE TOUT ICI
        }

        // 3. ONBOARDING : CHAÎNE D'INTÉGRATION
        // CORRECTION : On demande les infos dès que l'email est vérifié, 
        // sans attendre la validation 'VERIFIED' de l'admin (documents).
        if (role === UserRole.USER) {

          // On s'assure que c'est un tableau, car en DB c'est du TEXT
          let userInterests: string[] = [];
          if (Array.isArray(profile.interests)) {
            userInterests = profile.interests;
          } else if (typeof profile.interests === 'string') {
            try {
              // Si ça ressemble à du JSON
              if (profile.interests.startsWith('[')) {
                userInterests = JSON.parse(profile.interests);
              } else {
                userInterests = profile.interests.split(',').map((s: string) => s.trim()).filter(Boolean);
              }
            } catch (e) {
              userInterests = [];
            }
          }

          if (userInterests.length === 0) {
            setCurrentView(AppView.ONBOARDING_INTERESTS);
            setCurrentUserRole(role);
            setIsAuthLoading(false);
            return;
          }

          // B. PRÉFÉRENCES (HOMME/FEMME)
          // On vérifie si le champ 'looking_for' est vide
          const hasNoPreference = !profile.looking_for;
          if (hasNoPreference) {
            setCurrentView(AppView.ONBOARDING_PREFERENCES);
            setCurrentUserRole(role);
            setIsAuthLoading(false);
            return;
          }
        }

        // 4. SI TOUT EST OK : ROUTAGE NORMAL
        setCurrentUserRole(role);

        // Si l'utilisateur est un Administrateur, le maintenir toujours sur l'ADMIN_DASHBOARD lors du rafraîchissement
        if (role === UserRole.ADMIN) {
          setCurrentView(AppView.ADMIN_DASHBOARD);
        } else if (
          currentView === AppView.LANDING ||
          currentView === AppView.AUTH_LOGIN ||
          currentView === AppView.AUTH_REGISTER ||
          currentView === AppView.AUTH_VERIFY_EMAIL ||
          currentView === AppView.ONBOARDING_INTERESTS ||
          currentView === AppView.ONBOARDING_PREFERENCES ||
          currentView === AppView.AUTH_ADMIN_LOGIN
        ) {
          setCurrentView(AppView.USER_DASHBOARD);
        }
        setIsAuthLoading(false);

      } else {
        // DÉCONNECTÉ
        setCurrentUserRole(UserRole.GUEST);
        if (
          currentView === AppView.USER_DASHBOARD ||
          currentView === AppView.ADMIN_DASHBOARD ||
          currentView === AppView.AUTH_VERIFY_EMAIL ||
          currentView === AppView.ONBOARDING_INTERESTS ||
          currentView === AppView.ONBOARDING_PREFERENCES
        ) {
          setCurrentView(AppView.LANDING);
        }
        setIsAuthLoading(false);
      }
    };

    // S'abonner aux changements
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      syncAuthState(session);
    });

    // Exécuter au montage initial (avec session courante)
    supabase.auth.getSession().then(({ data: { session } }) => {
      syncAuthState(session);
    }).catch(() => {
      syncAuthState(null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogin = (role: 'ADMIN' | 'USER') => {
    // Cette fonction est appelée par AuthForms après le succès
    const newRole = role === 'ADMIN' ? UserRole.ADMIN : UserRole.USER;
    sessionStorage.setItem('225_otp_verified', 'true');
    setCurrentUserRole(newRole);
    setCurrentView(newRole === UserRole.ADMIN ? AppView.ADMIN_DASHBOARD : AppView.USER_DASHBOARD);
    setIsSidebarOpen(false);
  };

  const [sessionExpiredMessage, setSessionExpiredMessage] = useState<string | null>(null);

  const handleSessionExpired = (reasonMessage?: string) => {
    supabase.auth.signOut({ scope: 'local' }).catch(() => {});
    setCurrentUserRole(UserRole.GUEST);
    setIsSidebarOpen(false);

    if (currentUserRole === UserRole.ADMIN) {
      setCurrentView(AppView.AUTH_ADMIN_LOGIN);
    } else {
      setCurrentView(AppView.AUTH_LOGIN);
    }

    if (reasonMessage) {
      setSessionExpiredMessage(reasonMessage);
      setTimeout(() => setSessionExpiredMessage(null), 8000);
    }
  };

  const handleNavigate = (view: AppView) => {
    // Protection : on ne peut pas aller au dashboard si invité
    if ((view === AppView.USER_DASHBOARD || view === AppView.ADMIN_DASHBOARD) && currentUserRole === UserRole.GUEST) {
      setCurrentView(AppView.AUTH_LOGIN);
      return;
    }

    // Déconnexion
    if (view === AppView.LANDING && currentUserRole !== UserRole.GUEST) {
      supabase.auth.signOut({ scope: 'local' }).catch(() => {});
      setCurrentUserRole(UserRole.GUEST);
      setIsSidebarOpen(false);
    }

    setCurrentView(view);
  };

  if (isAuthLoading) {
    return (
      <div className="fixed inset-0 bg-slate-50 flex flex-col items-center justify-center z-50 text-slate-900 select-none">
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-emerald-200/40 rounded-full blur-2xl scale-125 animate-pulse" />
          <div className="relative bg-emerald-600 p-5 rounded-2xl shadow-xl shadow-emerald-600/30 animate-float-gentle">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-12 w-12 text-white">
              <path d="M11 2a2 2 0 0 0-2 2v5H4a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h5v5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-5h5a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-5V4a2 2 0 0 0-2-2h-2z" />
            </svg>
          </div>
        </div>

        <h1 className="font-display font-extrabold text-3xl tracking-tight text-slate-900 mb-2">
          225 <span className="text-emerald-700">Chrétien</span>
        </h1>

        <div className="flex items-center space-x-2.5 text-slate-500 text-xs font-semibold bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100">
          <svg className="animate-spin h-4 w-4 text-emerald-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Connexion sécurisée en cours...</span>
        </div>
      </div>
    );
  }

  const isUserDashboard = currentView === AppView.USER_DASHBOARD;

  return (
    <div className={`bg-slate-50 font-sans ${isPrivacyBlurred ? 'privacy-blur-active' : ''} ${isUserDashboard ? 'h-screen h-[100dvh] overflow-hidden flex flex-col' : 'min-h-screen'}`}>
      {/* Gestionnaire de Notifications & Gestionnaire de Session Inactive */}
      <NotificationManager />
      <SessionTimeoutManager
        userRole={currentUserRole}
        onSessionExpired={handleSessionExpired}
      />

      {/* Message Flottant d'expiration de session */}
      {sessionExpiredMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center space-x-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <span className="w-3 h-3 bg-amber-400 rounded-full animate-ping shrink-0" />
          <span className="text-xs sm:text-sm font-semibold">{sessionExpiredMessage}</span>
        </div>
      )}

      {/* Navbar affichée sauf sur admin dashboard, page de vérif et onboarding */}
      {currentView !== AppView.ADMIN_DASHBOARD &&
        currentView !== AppView.AUTH_VERIFY_EMAIL &&
        currentView !== AppView.ONBOARDING_INTERESTS &&
        currentView !== AppView.ONBOARDING_PREFERENCES && (
          <Navbar
            currentUserRole={currentUserRole}
            onChangeView={handleNavigate}
            toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          />
        )}

      {currentView === AppView.LANDING && <LandingPage onNavigate={handleNavigate} />}

      {(currentView === AppView.AUTH_LOGIN || currentView === AppView.AUTH_REGISTER || currentView === AppView.AUTH_ADMIN_LOGIN) && (
        <AuthForms view={currentView} onSwitch={setCurrentView} onLogin={handleLogin} />
      )}

      {/* PAGE DE BLOCAGE VÉRIFICATION EMAIL */}
      {currentView === AppView.AUTH_VERIFY_EMAIL && (
        <VerifyEmailPage onLogout={() => handleNavigate(AppView.LANDING)} />
      )}

      {/* PAGE ONBOARDING INTÉRÊTS */}
      {currentView === AppView.ONBOARDING_INTERESTS && (
        <OnboardingInterests onComplete={() => setCurrentView(AppView.ONBOARDING_PREFERENCES)} />
      )}

      {/* PAGE ONBOARDING PRÉFÉRENCES (NOUVEAU) */}
      {currentView === AppView.ONBOARDING_PREFERENCES && (
        <OnboardingPreferences onComplete={() => setCurrentView(AppView.USER_DASHBOARD)} />
      )}

      {(currentView === AppView.USER_DASHBOARD ||
        currentView === AppView.SPEED_DATE ||
        currentView === AppView.LIKES_YOU ||
        currentView === AppView.MESSAGES ||
        currentView === AppView.FORUM ||
        currentView === AppView.PROFILE) && (
        <UserDashboard
          currentView={currentView}
          onChangeView={handleNavigate}
          isMobileSidebarOpen={isSidebarOpen}
          onCloseMobileSidebar={() => setIsSidebarOpen(false)}
        />
      )}

      {currentView === AppView.ADMIN_DASHBOARD && (
        <>
          <div className="fixed top-4 right-4 z-50 md:hidden">
            <button
              onClick={() => handleNavigate(AppView.LANDING)}
              className="bg-white/10 backdrop-blur text-white px-4 py-2 rounded hover:bg-white/20 transition text-sm"
            >
              Quitter
            </button>
          </div>
          <AdminDashboard onLogout={() => handleNavigate(AppView.LANDING)} />
        </>
      )}

      {/* Barre de navigation inférieure Mobile (Uniquement si utilisateur connecté) */}
      {currentUserRole === UserRole.USER && currentView !== AppView.ADMIN_DASHBOARD && (
        <MobileBottomNav
          currentView={currentView}
          onChangeView={handleNavigate}
        />
      )}

      {/* 🛡️ BOUCLIER ANTI-CAPTURE & MASQUE PRIVACY SUR PERTE DE FOCUS */}
      {isPrivacyBlurred && (
        <div className="fixed inset-0 z-[200] bg-slate-950/95 backdrop-blur-2xl flex flex-col items-center justify-center text-white p-6 text-center animate-in fade-in duration-200 select-none">
          <div className="w-20 h-20 bg-emerald-500/20 border border-emerald-400/40 rounded-full flex items-center justify-center mb-4 animate-pulse">
            <Shield size={40} className="text-emerald-400" />
          </div>
          <h3 className="text-2xl font-black text-white">Espace Chrétien Sécurisé 🛡️</h3>
          <p className="text-xs text-slate-300 mt-2 max-w-sm leading-relaxed">
            Pour protéger la vie privée et les conversations confidentielles des membres, l'écran est temporairement flouté lors d'un changement d'onglet ou d'une capture.
          </p>
          <div className="mt-6 text-[10px] uppercase font-mono tracking-widest text-emerald-400 bg-emerald-950/80 px-4 py-2 rounded-full border border-emerald-800/50">
            225 Chrétien • Données Protégées
          </div>
        </div>
      )}

      {/* 🔒 MODALE DE DÉVERROUILLAGE PIN */}
      {isPinLocked && (
        <PinLockModal
          isOpen={isPinLocked}
          mode="UNLOCK"
          savedPinHash={savedPinHash}
          onSuccess={() => setIsPinLocked(false)}
        />
      )}
    </div>
  );
};

export default App;
