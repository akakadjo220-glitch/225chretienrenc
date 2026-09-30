import React, { useState, useEffect, useRef, useCallback } from 'react';
import { UserRole, SessionTimeoutConfig, DEFAULT_SESSION_TIMEOUT } from '../types';
import { supabase } from '../supabaseClient';
import { ShieldAlert, Clock, RefreshCw, LogOut, Shield, Crown, Sparkles } from 'lucide-react';

interface SessionTimeoutManagerProps {
  userRole: UserRole;
  isPremium?: boolean;
  onSessionExpired: (reasonMessage?: string) => void;
}

export const SessionTimeoutManager: React.FC<SessionTimeoutManagerProps> = ({
  userRole,
  isPremium = false,
  onSessionExpired
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [showWarningModal, setShowWarningModal] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Configuration dynamique par défaut avec mise en cache locale
  const [sessionConfig, setSessionConfig] = useState<SessionTimeoutConfig>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('225_session_timeout_config');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.admin_minutes && parsed.standard_minutes) {
            return { ...DEFAULT_SESSION_TIMEOUT, ...parsed };
          }
        }
      } catch (e) {}
    }
    return DEFAULT_SESSION_TIMEOUT;
  });

  const lastActivityRef = useRef<number>(Date.now());
  const intervalRef = useRef<number | null>(null);
  const isExpiredRef = useRef<boolean>(false);

  // Charger la configuration dynamique depuis system_settings au montage
  useEffect(() => {
    let isMounted = true;
    const loadConfig = async () => {
      try {
        const { data } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'session_timeout_config')
          .maybeSingle();

        if (data?.value && isMounted) {
          const loaded = { ...DEFAULT_SESSION_TIMEOUT, ...data.value };
          setSessionConfig(loaded);
          if (typeof window !== 'undefined') {
            localStorage.setItem('225_session_timeout_config', JSON.stringify(loaded));
          }
        }
      } catch (e) {
        // En cas d'absence de réseau, utilise la config par défaut
      }
    };

    loadConfig();

    // Écoute des mises à jour en direct depuis le panneau Admin
    const handleConfigUpdated = (e: any) => {
      if (e.detail && isMounted) {
        setSessionConfig(prev => ({ ...prev, ...e.detail }));
      }
    };
    window.addEventListener('225_session_config_updated', handleConfigUpdated);

    return () => {
      isMounted = false;
      window.removeEventListener('225_session_config_updated', handleConfigUpdated);
    };
  }, []);

  // Calcul de la durée totale d'inactivité en secondes selon le rôle et le statut
  let totalDuration = 0;
  let durationFormatted = '';

  if (userRole === UserRole.ADMIN) {
    totalDuration = (sessionConfig.admin_minutes || 30) * 60;
    durationFormatted = `${sessionConfig.admin_minutes} minutes`;
  } else if (isPremium) {
    totalDuration = (sessionConfig.premium_minutes || 1440) * 60;
    const hrs = Math.round((sessionConfig.premium_minutes || 1440) / 60);
    durationFormatted = hrs >= 24 ? `${Math.round(hrs / 24)} jour(s)` : `${hrs} heures`;
  } else if (userRole === UserRole.USER) {
    totalDuration = (sessionConfig.standard_minutes || 120) * 60;
    const hrs = Math.round((sessionConfig.standard_minutes || 120) / 60);
    durationFormatted = hrs >= 1 ? `${hrs} heure(s)` : `${sessionConfig.standard_minutes} minutes`;
  }

  const warningDuration = (sessionConfig.warning_minutes || 2) * 60;

  // Réinitialisation du minuteur lors d'une action utilisateur
  const handleUserActivity = useCallback(() => {
    if (userRole === UserRole.GUEST || isExpiredRef.current) return;

    const now = Date.now();
    // Throttle : ne mettre à jour que toutes les 5 secondes au maximum pour les performances
    if (now - lastActivityRef.current > 5000) {
      lastActivityRef.current = now;
      if (showWarningModal) {
        setShowWarningModal(false);
      }
    }
  }, [userRole, showWarningModal]);

  // Écouteurs d'évènements d'activité
  useEffect(() => {
    if (userRole === UserRole.GUEST) return;

    isExpiredRef.current = false;
    lastActivityRef.current = Date.now();

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach((event) => {
      window.addEventListener(event, handleUserActivity, { passive: true });
    });

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleUserActivity);
      });
    };
  }, [userRole, handleUserActivity]);

  // Boucle de suivi de l'inactivité (toutes les secondes)
  useEffect(() => {
    if (userRole === UserRole.GUEST || totalDuration <= 0) {
      setShowWarningModal(false);
      return;
    }

    intervalRef.current = window.setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - lastActivityRef.current) / 1000);
      const remaining = totalDuration - elapsedSeconds;

      if (remaining <= 0 && !isExpiredRef.current) {
        isExpiredRef.current = true;
        setShowWarningModal(false);
        if (intervalRef.current) clearInterval(intervalRef.current);

        let reasonMsg = "Session expirée après une période d'inactivité prolongée.";
        if (userRole === UserRole.ADMIN) {
          reasonMsg = `Session Administrateur expirée après ${durationFormatted} d'inactivité (protection des données).`;
        } else if (isPremium) {
          reasonMsg = `Session Premium expirée après ${durationFormatted} d'inactivité.`;
        } else if (userRole === UserRole.USER) {
          reasonMsg = `Session expirée après ${durationFormatted} d'inactivité.`;
        }

        onSessionExpired(reasonMsg);
      } else {
        setSecondsRemaining(Math.max(0, remaining));
        if (remaining <= warningDuration && !showWarningModal) {
          setShowWarningModal(true);
        } else if (remaining > warningDuration && showWarningModal) {
          setShowWarningModal(false);
        }
      }
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [userRole, isPremium, totalDuration, warningDuration, durationFormatted, onSessionExpired, showWarningModal]);

  // Action du bouton "Rester connecté"
  const handleExtendSession = async () => {
    setIsRefreshing(true);
    try {
      // Rafraîchir le jeton de session Supabase Auth
      await supabase.auth.getSession();
      lastActivityRef.current = Date.now();
      setShowWarningModal(false);
    } catch (e) {
      console.error("Erreur rafraîchissement session:", e);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Action du bouton "Se déconnecter"
  const handleImmediateLogout = () => {
    setShowWarningModal(false);
    onSessionExpired("Déconnexion volontaire.");
  };

  if (userRole === UserRole.GUEST || !showWarningModal || secondsRemaining === null) {
    return null;
  }

  // Formatage des secondes en MM:SS
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const isAdmin = userRole === UserRole.ADMIN;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in zoom-in duration-300">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full text-center shadow-2xl border border-slate-200/80 relative overflow-hidden">
        {/* Glow de fond */}
        <div className={`absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl pointer-events-none ${
          isAdmin ? 'bg-red-500/20' : isPremium ? 'bg-amber-400/25' : 'bg-emerald-500/20'
        }`} />

        {/* Badge de Type de Compte */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-4 shadow-2xs border">
          {isAdmin ? (
            <span className="bg-red-50 text-red-700 border-red-200 flex items-center gap-1">
              <Shield size={13} className="text-red-600" />
              <span>Session Administrateur Sécurisée</span>
            </span>
          ) : isPremium ? (
            <span className="bg-amber-50 text-amber-800 border-amber-300 flex items-center gap-1">
              <Crown size={13} className="text-amber-600 fill-amber-400" />
              <span>Membre Premium VIP (24h de session)</span>
            </span>
          ) : (
            <span className="bg-emerald-50 text-emerald-800 border-emerald-200 flex items-center gap-1">
              <Clock size={13} className="text-emerald-600" />
              <span>Membre Standard (2h de session)</span>
            </span>
          )}
        </div>

        {/* Icône principale */}
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg ${
          isAdmin 
            ? 'bg-red-100 text-red-600 shadow-red-500/20' 
            : isPremium 
              ? 'bg-amber-100 text-amber-700 shadow-amber-500/25 border-2 border-amber-300' 
              : 'bg-emerald-100 text-emerald-700 shadow-emerald-500/20'
        }`}>
          {isAdmin ? <ShieldAlert size={32} /> : isPremium ? <Crown size={32} className="fill-amber-500" /> : <Clock size={32} />}
        </div>

        {/* Titre et description adaptés au rôle */}
        <h3 className="text-xl sm:text-2xl font-extrabold text-slate-800 mb-2 font-display">
          {isAdmin ? "Sécurité Administrateur" : isPremium ? "Session Inactive (Premium)" : "Session Bientôt Expirée"}
        </h3>
        
        <p className="text-slate-600 text-xs sm:text-sm mb-5 leading-relaxed">
          {isAdmin
            ? `Pour la protection des données sensibles (pièces d'identité, modération et paiements), votre session administrateur expire après ${durationFormatted} d'inactivité.`
            : isPremium
              ? `Votre session continue de ${durationFormatted} arrive à son terme pour inactivité prolongée. Cliquez sur Prolonger pour rester connecté.`
              : `Vous êtes inactif depuis près de ${durationFormatted}. Afin de protéger votre compte 225 Chrétien, vous allez être déconnecté.`}
        </p>

        {/* Callout valorisant pour compte Standard */}
        {!isAdmin && !isPremium && (
          <div className="bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 border border-amber-200 rounded-xl p-2.5 mb-5 text-[11px] text-amber-900 font-medium flex items-center justify-center gap-1.5 shadow-2xs">
            <Sparkles size={13} className="text-amber-600 shrink-0" />
            <span>Passez <strong>Premium</strong> pour bénéficier de <strong>24h de session continue</strong> sans interruption !</span>
          </div>
        )}

        {/* Minuteur visuel avec décompte */}
        <div className={`py-3 px-6 rounded-2xl mb-6 font-mono text-3xl sm:text-4xl font-extrabold tracking-wider border flex items-center justify-center gap-2 ${
          isAdmin
            ? 'bg-red-50 text-red-700 border-red-200'
            : isPremium
              ? 'bg-amber-50 text-amber-800 border-amber-300'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
        }`}>
          <Clock className="animate-pulse h-7 w-7" />
          <span>{formattedTime}</span>
        </div>

        {/* Boutons d'action */}
        <div className="space-y-3">
          <button
            onClick={handleExtendSession}
            disabled={isRefreshing}
            className={`w-full text-white font-bold py-3.5 px-4 rounded-xl shadow-lg transition flex items-center justify-center gap-2 text-xs sm:text-sm active:scale-95 cursor-pointer ${
              isAdmin
                ? 'bg-red-600 hover:bg-red-700 shadow-red-600/30'
                : isPremium
                  ? 'bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 hover:from-amber-700 hover:to-amber-900 shadow-amber-600/30'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
            }`}
          >
            {isRefreshing ? (
              <RefreshCw className="animate-spin h-4 w-4" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span>Prolonger ma session</span>
          </button>

          <button
            onClick={handleImmediateLogout}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-2.5 px-4 rounded-xl text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <LogOut size={14} />
            <span>Se déconnecter maintenant</span>
          </button>
        </div>
      </div>
    </div>
  );
};
