
import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { AuthForms } from './components/AuthForms';
import { UserDashboard } from './components/UserDashboard';
import { VerifyEmailPage } from './components/VerifyEmailPage';
import { NotificationManager } from './components/NotificationManager';
import { OnboardingInterests } from './components/OnboardingInterests';
import { OnboardingBio } from './components/OnboardingBio';

// 🚀 Code-Splitting pour Vitesse Optimale (Chargement différé de l'Administration)
const AdminDashboard = React.lazy(() => import('./components/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
import { MobileBottomNav } from './components/MobileBottomNav';
import { SessionTimeoutManager } from './components/SessionTimeoutManager';
import { UserRole, AppView, DashboardTab } from './types';
import { supabase } from './supabaseClient';
import { getDeviceFingerprint, getClientIp, fetchBannedIdentifiers, checkIsBlacklisted } from './utils/deviceFingerprint';
import { PinLockModal } from './components/PinLockModal';
import { Heart } from 'lucide-react';

const App: React.FC = () => {
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>(UserRole.GUEST);
  const [currentView, setCurrentView] = useState<AppView>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('225_current_view') as AppView;
      if (saved && Object.values(AppView).includes(saved)) {
        return saved;
      }
    }
    return AppView.LANDING;
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // 🔒 États de Sécurité (PIN Lock)
  const [isPinLocked, setIsPinLocked] = useState(false);
  const [savedPinHash, setSavedPinHash] = useState<string | null>(null);

  // Initialisation du Code PIN
  useEffect(() => {
    const pin = localStorage.getItem('_225_security_pin');
    setSavedPinHash(pin);
    if (pin && currentUserRole === UserRole.USER) {
      setIsPinLocked(true);
    }
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

        // DÉTECTION SUPER ADMIN (Emails Maîtres)
        const isSuperAdmin = user.email === 'chretien0225@gmail.com' || user.email === 'akacharle2@gmail.com';

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

          // B. BIOGRAPHIE / PRÉSENTATION CHRÉTIENNE (ÉTAPE 2 SUR 2)
          const hasNoBio = !profile.bio || profile.bio.trim().length === 0;
          if (hasNoBio) {
            setCurrentView(AppView.ONBOARDING_BIO);
            setCurrentUserRole(role);
            setIsAuthLoading(false);
            return;
          }

          // 🛡️ COMPLÉMENTARITÉ CHRÉTIENNE STRICTE (AUCUN CHOIX MANUEL) :
          // Homme cherche obligatoirement Femme, Femme cherche obligatoirement Homme
          const userGender = profile.gender || 'M';
          const requiredLookingFor = userGender === 'M' ? 'F' : 'M';
          if (!profile.looking_for || profile.looking_for !== requiredLookingFor) {
            await supabase
              .from('profiles')
              .update({ looking_for: requiredLookingFor })
              .eq('id', profile.id);
            profile.looking_for = requiredLookingFor;
          }
        }

        // 4. SI TOUT EST OK : ROUTAGE NORMAL
        setCurrentUserRole(role);

        // Si l'utilisateur est un Administrateur, le maintenir toujours sur l'ADMIN_DASHBOARD lors du rafraîchissement
        if (role === UserRole.ADMIN) {
          setCurrentView(AppView.ADMIN_DASHBOARD);
        } else {
          const savedView = typeof window !== 'undefined' ? (sessionStorage.getItem('225_current_view') as AppView) : null;
          if (savedView && [AppView.USER_DASHBOARD, AppView.PROFILE, AppView.MESSAGES, AppView.FORUM, AppView.LIKES_YOU, AppView.SPEED_DATE].includes(savedView)) {
            setCurrentView(savedView);
          } else if (
            currentView === AppView.LANDING ||
            currentView === AppView.AUTH_LOGIN ||
            currentView === AppView.AUTH_REGISTER ||
            currentView === AppView.AUTH_VERIFY_EMAIL ||
            currentView === AppView.ONBOARDING_INTERESTS ||
            currentView === AppView.ONBOARDING_BIO ||
            currentView === AppView.ONBOARDING_PREFERENCES ||
            currentView === AppView.AUTH_ADMIN_LOGIN
          ) {
            setCurrentView(AppView.USER_DASHBOARD);
          }
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
          currentView === AppView.ONBOARDING_BIO ||
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
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('225_current_view', view);
    }
    // Protection : on ne peut pas aller au dashboard si invité
    if ((view === AppView.USER_DASHBOARD || view === AppView.ADMIN_DASHBOARD) && currentUserRole === UserRole.GUEST) {
      setCurrentView(AppView.AUTH_LOGIN);
      return;
    }

    if (view === AppView.USER_DASHBOARD) {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('225_active_tab', DashboardTab.MATCHES);
        window.dispatchEvent(new CustomEvent('225_navigate_matches'));
      }
    }

    // Déconnexion
    if (view === AppView.LANDING && currentUserRole !== UserRole.GUEST) {
      supabase.auth.signOut({ scope: 'local' }).catch(() => {});
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('225_current_view');
        sessionStorage.removeItem('225_active_tab');
        sessionStorage.removeItem('225_profile_subtab');
      }
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
          <div className="relative bg-emerald-600 p-5 rounded-2xl shadow-xl shadow-emerald-600/30 animate-float-gentle flex items-center justify-center">
            <Heart className="h-10 w-10 text-white fill-white/80" />
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

  const isFixedScreenView = 
    currentView === AppView.USER_DASHBOARD || 
    currentView === AppView.MESSAGES || 
    currentView === AppView.LIKES_YOU ||
    currentView === AppView.FORUM ||
    currentView === AppView.PROFILE ||
    currentView === AppView.SPEED_DATE;

  return (
    <div className={`bg-white font-sans ${isFixedScreenView ? 'h-[100dvh] overflow-hidden' : 'min-h-screen'} flex flex-col`}>
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
        currentView !== AppView.ONBOARDING_BIO &&
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

      {/* PAGE ONBOARDING INTÉRÊTS (ÉTAPE 1 SUR 2) */}
      {currentView === AppView.ONBOARDING_INTERESTS && (
        <OnboardingInterests onComplete={() => setCurrentView(AppView.ONBOARDING_BIO)} />
      )}

      {/* PAGE ONBOARDING PRÉSENTATION / BIO (ÉTAPE 2 SUR 2 - FINALE) */}
      {currentView === AppView.ONBOARDING_BIO && (
        <OnboardingBio onComplete={() => setCurrentView(AppView.USER_DASHBOARD)} />
      )}

      {(currentView === AppView.USER_DASHBOARD ||
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
          <React.Suspense fallback={<div className="min-h-screen bg-slate-950 text-emerald-400 flex items-center justify-center font-bold text-sm">Chargement sécurisé de l'administration...</div>}>
            <AdminDashboard onLogout={() => handleNavigate(AppView.LANDING)} />
          </React.Suspense>
        </>
      )}

      {/* Barre de navigation inférieure Mobile (Uniquement si utilisateur connecté hors onboarding) */}
      {currentUserRole === UserRole.USER && 
        currentView !== AppView.ADMIN_DASHBOARD &&
        currentView !== AppView.ONBOARDING_INTERESTS &&
        currentView !== AppView.ONBOARDING_BIO &&
        currentView !== AppView.ONBOARDING_PREFERENCES && (
        <MobileBottomNav
          currentView={currentView}
          onChangeView={handleNavigate}
          onOpenMenu={() => setIsSidebarOpen(prev => !prev)}
          isMenuOpen={isSidebarOpen}
        />
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
